-- =====================================================================
-- Move GOLD out of gold_* and into the SYSTEM (transactions + contacts),
-- seeded to org 8cc1004c (Realty One Group Advantage) and agent contact ids.
-- Build org-level performance + leadership RLS + selector. Drop gold_* after.
-- =====================================================================

-- 0) confirm the two verified fuzzy matches
update gold_agent_crosswalk set needs_review=false, verified=true
 where gold_name in ('Kamal Abdel Suarez','Jennifer White');

-- 1) extend the real transactions table to hold brokerage economics
alter table transactions
  add column if not exists agent_contact_id uuid references contacts(id),
  add column if not exists tax_year     int,
  add column if not exists side         text,
  add column if not exists agent_payout numeric default 0,
  add column if not exists office_fee   numeric default 0,
  add column if not exists referral_amt numeric default 0,
  add column if not exists rog_corp_cost numeric default 0,
  add column if not exists is_closing   boolean default true,
  add column if not exists is_referral  boolean default false,
  add column if not exists is_fee_only  boolean default false,
  add column if not exists source       text,
  add column if not exists gold_txn_id  text;
create unique index if not exists transactions_gold_txn_uidx on transactions(gold_txn_id);
create index if not exists transactions_org_idx     on transactions(org_id);
create index if not exists transactions_agent_idx   on transactions(agent_contact_id);
create index if not exists transactions_year_idx    on transactions(tax_year);
create index if not exists transactions_feeonly_idx on transactions(is_fee_only);

-- 2) migrate the ledger into transactions (idempotent on gold_txn_id)
insert into transactions (
  org_id, address, transaction_type, status, agent_email, agent_contact_id,
  close_price, gross_commission, net_commission, agent_payout, office_fee,
  referral_amt, rog_corp_cost, side, tax_year, is_closing, is_referral, is_fee_only,
  notes, created_by, source, gold_txn_id)
select
  '8cc1004c-c4da-4aab-b79a-f8b507983303'::uuid,
  t.property_address_raw,
  initcap(t.deal_type::text),
  case when t.is_closing then 'Closed' else 'Fee/Adjustment' end,
  c.email, ga.contact_id,
  nullif(t.gross_sale_price,0), t.gross_commission, t.office_fee, t.agent_payout, t.office_fee,
  t.referral_amt, t.rog_corp_cost, t.side::text, t.tax_year,
  t.is_closing, t.is_referral, (not t.is_closing and not t.is_referral),
  t.notes, 'GOLD import', 'GOLD', t.gold_txn_id
from gold_transactions t
join gold_agents ga on ga.gold_agent_id = t.gold_agent_id
left join contacts c on c.id = ga.contact_id
on conflict (gold_txn_id) do nothing;

-- 3) agent notes into the system
create table if not exists agent_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  agent_contact_id uuid references contacts(id),
  gold_txn_id text,
  note_type text,
  tax_year int,
  body text,
  created_at timestamptz default now()
);
insert into agent_notes (org_id, agent_contact_id, gold_txn_id, note_type, tax_year, body)
select '8cc1004c-c4da-4aab-b79a-f8b507983303'::uuid, ga.contact_id, n.gold_txn_id,
       n.note_type, n.tax_year, n.body
from gold_notes n
left join gold_agents ga on ga.gold_agent_id = n.gold_agent_id
where n.body is not null;

-- 4) system performance tables (no gold_ prefix)
create table if not exists agent_performance_yearly (
  org_id uuid, agent_contact_id uuid references contacts(id), full_name text, tax_year int,
  deals int default 0, gci numeric default 0, agent_payout numeric default 0,
  office_income numeric default 0, referral_income numeric default 0,
  volume numeric default 0, avg_deal_size numeric default 0,
  primary key (agent_contact_id, tax_year)
);
create table if not exists agent_performance_lifetime (
  org_id uuid, agent_contact_id uuid primary key references contacts(id), full_name text,
  total_deals int, total_gci numeric, total_volume numeric,
  active_years int[], first_year int, last_year int, yoy_last_pct numeric, trend_flag text
);
create table if not exists brokerage_performance_yearly (
  org_id uuid, tax_year int, gci numeric, net_office numeric, deals int, volume numeric,
  primary key (org_id, tax_year)
);

-- 5) rebuild function (aggregates the real transactions table)
create or replace function rebuild_performance()
returns void language plpgsql as $$
begin
  truncate agent_performance_yearly;
  insert into agent_performance_yearly
    (org_id, agent_contact_id, full_name, tax_year, deals, gci, agent_payout,
     office_income, referral_income, volume, avg_deal_size)
  select t.org_id, t.agent_contact_id, max(c.full_name),
         coalesce(t.tax_year, extract(year from t.close_date))::int,
         count(*) filter (where t.is_closing),
         sum(coalesce(t.gross_commission,0)), sum(coalesce(t.agent_payout,0)),
         sum(coalesce(t.office_fee,0)), sum(coalesce(t.referral_amt,0)),
         sum(coalesce(t.close_price,0)),
         case when count(*) filter (where t.is_closing) > 0
              then sum(coalesce(t.close_price,0))/count(*) filter (where t.is_closing) else 0 end
  from transactions t
  left join contacts c on c.id = t.agent_contact_id
  where t.agent_contact_id is not null
    and coalesce(t.tax_year, extract(year from t.close_date)) is not null
  group by t.org_id, t.agent_contact_id, coalesce(t.tax_year, extract(year from t.close_date))::int;

  truncate agent_performance_lifetime;
  insert into agent_performance_lifetime
    (org_id, agent_contact_id, full_name, total_deals, total_gci, total_volume,
     active_years, first_year, last_year)
  select max(y.org_id::text)::uuid, y.agent_contact_id, max(y.full_name),
         sum(y.deals), sum(y.gci), sum(y.volume),
         array_agg(distinct y.tax_year order by y.tax_year), min(y.tax_year), max(y.tax_year)
  from agent_performance_yearly y group by y.agent_contact_id;

  update agent_performance_lifetime l
  set yoy_last_pct = s.pct,
      trend_flag = case when s.pct is null then 'dormant'
                        when s.pct >  0.10 then 'growing'
                        when s.pct < -0.10 then 'declining' else 'flat' end
  from (
    select z.agent_contact_id, (z.gci - z.prev_gci)/nullif(z.prev_gci,0) as pct
    from (
      select agent_contact_id, gci,
             lag(gci) over (partition by agent_contact_id order by tax_year) as prev_gci,
             row_number() over (partition by agent_contact_id order by tax_year desc) as rn
      from agent_performance_yearly
    ) z where z.rn = 1
  ) s where s.agent_contact_id = l.agent_contact_id;

  truncate brokerage_performance_yearly;
  insert into brokerage_performance_yearly (org_id, tax_year, gci, net_office, deals, volume)
  select t.org_id, coalesce(t.tax_year, extract(year from t.close_date))::int,
         sum(coalesce(t.gross_commission,0)), sum(coalesce(t.office_fee,0)),
         count(*) filter (where t.is_closing), sum(coalesce(t.close_price,0))
  from transactions t
  where coalesce(t.tax_year, extract(year from t.close_date)) is not null
  group by t.org_id, coalesce(t.tax_year, extract(year from t.close_date))::int;
end $$;
select rebuild_performance();

-- 6) replace views (drop gold-based ones, recreate on system tables)
drop view if exists v_agent_scorecard cascade;
drop view if exists v_agent_leaderboard_yearly cascade;
drop view if exists v_brokerage_summary cascade;
drop view if exists v_referrals cascade;
drop view if exists v_commission_ledger cascade;
drop view if exists v_fee_ledger cascade;

create view v_agent_scorecard as
  select org_id, agent_contact_id, full_name, total_deals, total_gci, total_volume,
         active_years, first_year, last_year, yoy_last_pct, trend_flag
  from agent_performance_lifetime;

create view v_agent_leaderboard_yearly as
  select org_id, tax_year, full_name, agent_contact_id, deals, gci, volume,
         rank() over (partition by org_id, tax_year order by gci desc)  as gci_rank,
         rank() over (partition by org_id, tax_year order by deals desc) as deals_rank
  from agent_performance_yearly;

create view v_brokerage_summary as
  select org_id, tax_year, deals, gci, net_office, volume
  from brokerage_performance_yearly order by tax_year;

create view v_referrals as
  select org_id, gold_txn_id, tax_year, agent_contact_id, address,
         referral_amt, agent_payout, gross_commission, notes
  from transactions where is_referral order by tax_year desc, referral_amt desc;

-- fee-only ledger on its OWN page (separated for now; combine later)
create view v_fee_ledger as
  select org_id, gold_txn_id, tax_year, agent_contact_id, address,
         agent_payout, office_fee, notes
  from transactions where is_fee_only order by tax_year desc;

create view v_commission_ledger as
  select org_id, gold_txn_id, tax_year, agent_contact_id, transaction_type, side,
         close_price, gross_commission, agent_payout, office_fee, referral_amt,
         rog_corp_cost, is_closing, is_referral, is_fee_only, notes
  from transactions order by tax_year desc, gold_txn_id;

-- 7) leadership / org RLS + selector
create or replace function is_org_leader(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from org_members m
                 where m.org_id=p_org and m.user_email=auth.email()
                   and m.role in ('owner','admin') and m.status='active');
$$;
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from org_members m
                 where m.org_id=p_org and m.user_email=auth.email() and m.status='active');
$$;

alter table transactions enable row level security;
drop policy if exists txn_service_all on transactions;
create policy txn_service_all on transactions for all to service_role using (true) with check (true);
drop policy if exists txn_select on transactions;
create policy txn_select on transactions for select to authenticated
  using ( is_org_leader(org_id)
          or agent_email = auth.email()
          or agent_contact_id in (select id from contacts where email = auth.email()) );
drop policy if exists txn_leader_write on transactions;
create policy txn_leader_write on transactions for all to authenticated
  using ( is_org_leader(org_id) ) with check ( is_org_leader(org_id) );

do $$ declare t text;
begin
  foreach t in array array['agent_performance_yearly','agent_performance_lifetime',
                           'brokerage_performance_yearly','agent_notes'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %1$s_service on %1$s;', t);
    execute format('create policy %1$s_service on %1$s for all to service_role using (true) with check (true);', t);
  end loop;
end $$;

drop policy if exists perf_y_read on agent_performance_yearly;
create policy perf_y_read on agent_performance_yearly for select to authenticated
  using ( is_org_leader(org_id) or agent_contact_id in (select id from contacts where email=auth.email()) );
drop policy if exists perf_l_read on agent_performance_lifetime;
create policy perf_l_read on agent_performance_lifetime for select to authenticated
  using ( is_org_leader(org_id) or agent_contact_id in (select id from contacts where email=auth.email()) );
drop policy if exists brokerage_read on brokerage_performance_yearly;
create policy brokerage_read on brokerage_performance_yearly for select to authenticated
  using ( is_org_member(org_id) );
drop policy if exists notes_read on agent_notes;
create policy notes_read on agent_notes for select to authenticated
  using ( is_org_leader(org_id) or agent_contact_id in (select id from contacts where email=auth.email()) );

-- selector for the leadership dashboard (year optional; respects access)
create or replace function org_performance(p_year int default null)
returns setof agent_performance_yearly language sql stable security definer set search_path=public as $$
  select * from agent_performance_yearly y
  where (p_year is null or y.tax_year = p_year)
    and ( is_org_leader(y.org_id) or y.agent_contact_id in (select id from contacts where email=auth.email()) );
$$;

-- 8) drop the gold_* scaffolding (data now lives in the system)
drop function if exists gold_run_full_import(uuid) cascade;
drop function if exists gold_normalize(uuid) cascade;
drop function if exists gold_match_agents() cascade;
drop function if exists gold_rebuild_performance() cascade;
drop function if exists gold_reconcile() cascade;
drop function if exists gold__classify_type(text) cascade;
drop function if exists gold__classify_side(text) cascade;
drop table if exists gold_staging_transactions cascade;
drop table if exists gold_staging_agents cascade;
drop table if exists gold_staging_notes cascade;
drop table if exists gold_transactions cascade;
drop table if exists gold_properties cascade;
drop table if exists gold_notes cascade;
drop table if exists gold_agent_performance_yearly cascade;
drop table if exists gold_agent_performance_lifetime cascade;
drop table if exists gold_brokerage_performance_yearly cascade;
drop table if exists gold_reconciliation_log cascade;
drop table if exists gold_agent_crosswalk cascade;
drop table if exists gold_agents cascade;
drop table if exists gold_import_batches cascade;
-- keep helper gold_normalize_name() (harmless, reusable)
