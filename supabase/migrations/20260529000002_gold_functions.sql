-- =====================================================================
-- GOLD → Prism : pipeline functions
--   gold_normalize_name()        text normalizer
--   gold_normalize()             staging  -> properties + transactions
--   gold_match_agents()          link gold_agents -> contacts (fuzzy)
--   gold_rebuild_performance()   recompute yearly + lifetime + brokerage
--   gold_reconcile()             compare computed vs workbook rollups
--   gold_run_full_import()       orchestrate normalize -> match -> rebuild -> reconcile
-- =====================================================================

-- ---------- name normalizer ----------
create or replace function gold_normalize_name(p text)
returns text language sql immutable as $$
  select nullif(
    regexp_replace(lower(trim(coalesce(p,''))), '[^a-z0-9 ]', '', 'g'),
  '')
$$;

-- ---------- classify a staging row's deal_type ----------
create or replace function gold__classify_type(p text)
returns gold_deal_type language sql immutable as $$
  select case lower(coalesce(p,''))
           when 'rental'     then 'rental'::gold_deal_type
           when 'lease'      then 'lease'::gold_deal_type
           when 'commercial' then 'commercial'::gold_deal_type
           when 'referral'   then 'referral'::gold_deal_type
           else 'sale'::gold_deal_type
         end
$$;

create or replace function gold__classify_side(p text)
returns gold_side language sql immutable as $$
  select case lower(coalesce(p,''))
           when 'list' then 'list'::gold_side
           when 'buy'  then 'buy'::gold_side
           when 'both' then 'both'::gold_side
           else null
         end
$$;

-- ---------- NORMALIZE: staging -> properties + transactions + notes + gold_agents ----------
create or replace function gold_normalize(p_batch uuid)
returns void language plpgsql as $$
begin
  -- 1. canonical agents (from staging_agents; names are GOLD-internally clean)
  insert into gold_agents (gold_agent_id, full_name, name_norm)
  select sa.gold_agent_id, sa.agent_name, gold_normalize_name(sa.agent_name)
  from gold_staging_agents sa
  where sa.batch_id = p_batch and sa.gold_agent_id is not null
  on conflict (gold_agent_id) do update
    set full_name = excluded.full_name,
        name_norm = excluded.name_norm;

  -- also capture any agent that appears in transactions but not in the agents sheet
  insert into gold_agents (gold_agent_id, full_name, name_norm)
  select distinct st.gold_agent_id, st.agent_name, gold_normalize_name(st.agent_name)
  from gold_staging_transactions st
  where st.batch_id = p_batch and st.gold_agent_id is not null
  on conflict (gold_agent_id) do nothing;

  -- 2. properties (dedup by normalized address)
  insert into gold_properties (address_raw, address_norm, first_seen_year)
  select distinct on (gold_normalize_name(st.property_address))
         st.property_address, gold_normalize_name(st.property_address), st.tax_year
  from gold_staging_transactions st
  where st.batch_id = p_batch
    and gold_normalize_name(st.property_address) is not null
  order by gold_normalize_name(st.property_address), st.tax_year
  on conflict (address_norm) do nothing;

  -- 3. transactions
  insert into gold_transactions (
    gold_txn_id, tax_year, gold_agent_id, property_id, property_address_raw,
    deal_type, side, gross_sale_price, gross_commission, agent_payout,
    office_fee, referral_amt, rog_corp_cost, is_closing, is_referral,
    date_paid_raw, month, lender, notes, batch_id, row_hash)
  select
    st.gold_txn_id, st.tax_year, st.gold_agent_id,
    gp.id, st.property_address,
    gold__classify_type(st.type), gold__classify_side(st.side),
    coalesce(st.gross_sale_price,0), coalesce(st.gross_commission,0), coalesce(st.agent_payout,0),
    coalesce(st.office_fee,0), coalesce(st.referral_amt,0), coalesce(st.rog_corp_cost,0),
    -- is_closing = has real estate economics; fee-only/BK/reimbursement lines excluded
    (coalesce(st.gross_sale_price,0) > 0 or coalesce(st.gross_commission,0) > 0
       or lower(coalesce(st.type,'')) = 'referral'),
    (lower(coalesce(st.type,'')) = 'referral'),
    st.date_paid, st.month, st.lender, st.notes, p_batch, st.row_hash
  from gold_staging_transactions st
  left join gold_properties gp on gp.address_norm = gold_normalize_name(st.property_address)
  where st.batch_id = p_batch and st.gold_txn_id is not null
  on conflict (gold_txn_id) do nothing;

  -- 4. notes
  insert into gold_notes (note_type, tax_year, gold_agent_id, gold_txn_id, property_address, body)
  select lower(coalesce(sn.source,'note')), sn.tax_year, sn.gold_agent_id,
         sn.gold_txn_id, sn.property_address, sn.body
  from gold_staging_notes sn
  where sn.batch_id = p_batch;

  update gold_import_batches set status = 'normalized' where id = p_batch;
end $$;

-- ---------- MATCH: link gold_agents -> contacts ----------
-- Dynamically discovers the name column(s) on `contacts` so it works whether
-- your roster uses full_name, name, or first_name/last_name.
create or replace function gold_match_agents()
returns table(matched int, review int, created int) language plpgsql as $$
declare
  name_expr text;
  has_full  boolean;
  has_name  boolean;
  has_first boolean;
  has_last  boolean;
begin
  select
    bool_or(column_name='full_name'),
    bool_or(column_name='name'),
    bool_or(column_name='first_name'),
    bool_or(column_name='last_name')
  into has_full, has_name, has_first, has_last
  from information_schema.columns
  where table_schema='public' and table_name='contacts';

  name_expr := case
    when has_full  then 'c.full_name'
    when has_name  then 'c.name'
    when has_first and has_last then $nx$trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,''))$nx$
    when has_first then 'c.first_name'
    else 'null'
  end;

  -- temp candidate roster: id + normalized name
  execute format($q$
    create temp table _roster on commit drop as
    select c.id as contact_id, gold_normalize_name(%s) as name_norm
    from contacts c
    where gold_normalize_name(%s) is not null
  $q$, name_expr, name_expr);

  -- reset crosswalk
  insert into gold_agent_crosswalk (gold_agent_id, gold_name)
  select ga.gold_agent_id, ga.full_name from gold_agents ga
  on conflict (gold_agent_id) do update set gold_name = excluded.gold_name;

  -- pass 1: exact normalized match
  update gold_agent_crosswalk x
  set contact_id = r.contact_id, matched_name = r.name_norm,
      match_method='exact', match_confidence=1.0, needs_review=false
  from gold_agents ga
  join _roster r on r.name_norm = ga.name_norm
  where x.gold_agent_id = ga.gold_agent_id and x.contact_id is null;

  -- pass 2: trigram similarity for the still-unmatched
  update gold_agent_crosswalk x
  set contact_id = best.contact_id, matched_name = best.name_norm,
      match_method = case when best.sim >= 0.92 then 'trigram' else 'trigram' end,
      match_confidence = best.sim,
      needs_review = (best.sim < 0.92)
  from gold_agents ga
  join lateral (
    select r.contact_id, r.name_norm, similarity(r.name_norm, ga.name_norm) as sim
    from _roster r
    order by r.name_norm <-> ga.name_norm
    limit 1
  ) best on best.sim >= 0.75
  where x.gold_agent_id = ga.gold_agent_id and x.contact_id is null;

  -- pass 3: no match -> CREATE a contact (contact_type Agent) under the org, then link
  with created as (
    insert into contacts (full_name, contact_type, status, source, org_id)
    select ga.full_name, 'Agent', 'Active', 'GOLD import',
           '8cc1004c-c4da-4aab-b79a-f8b507983303'::uuid
    from gold_agents ga
    join gold_agent_crosswalk x on x.gold_agent_id = ga.gold_agent_id
    where x.contact_id is null
    returning id, full_name
  )
  update gold_agent_crosswalk x
  set contact_id = c.id, matched_name = gold_normalize_name(c.full_name),
      match_method='created', match_confidence=0, needs_review=false
  from gold_agents ga
  join created c on gold_normalize_name(c.full_name) = ga.name_norm
  where x.gold_agent_id = ga.gold_agent_id and x.contact_id is null;

  -- anything still null (shouldn't happen) -> mark unmatched
  update gold_agent_crosswalk set match_method='unmatched', needs_review=true
  where contact_id is null;

  -- propagate the confirmed contact_id back onto gold_agents + transactions
  update gold_agents ga
  set contact_id = x.contact_id
  from gold_agent_crosswalk x
  where x.gold_agent_id = ga.gold_agent_id and x.contact_id is not null;

  update gold_transactions t
  set contact_id = ga.contact_id
  from gold_agents ga
  where t.gold_agent_id = ga.gold_agent_id;

  return query
    select
      count(*) filter (where match_method in ('exact','trigram') and not needs_review)::int,
      count(*) filter (where needs_review and match_method = 'trigram')::int,
      count(*) filter (where match_method='created')::int
    from gold_agent_crosswalk;
end $$;

-- ---------- REBUILD rollups ----------
create or replace function gold_rebuild_performance()
returns void language plpgsql as $$
begin
  truncate gold_agent_performance_yearly;
  insert into gold_agent_performance_yearly
    (gold_agent_id, tax_year, deals, gci, agent_payout, office_income, referral_income, volume, avg_deal_size)
  select t.gold_agent_id, t.tax_year,
         count(*) filter (where t.is_closing),
         sum(t.gross_commission),
         sum(t.agent_payout),
         sum(t.office_fee),
         sum(t.referral_amt),
         sum(t.gross_sale_price),
         case when count(*) filter (where t.is_closing) > 0
              then sum(t.gross_sale_price)/count(*) filter (where t.is_closing) else 0 end
  from gold_transactions t
  group by t.gold_agent_id, t.tax_year;

  update gold_agent_performance_yearly y
    set contact_id = ga.contact_id from gold_agents ga where ga.gold_agent_id = y.gold_agent_id;

  truncate gold_agent_performance_lifetime;
  insert into gold_agent_performance_lifetime
    (gold_agent_id, total_deals, total_gci, total_volume, active_years, first_year, last_year)
  select y.gold_agent_id, sum(y.deals), sum(y.gci), sum(y.volume),
         array_agg(distinct y.tax_year order by y.tax_year),
         min(y.tax_year), max(y.tax_year)
  from gold_agent_performance_yearly y
  group by y.gold_agent_id;

  update gold_agent_performance_lifetime l
    set contact_id = ga.contact_id from gold_agents ga where ga.gold_agent_id = l.gold_agent_id;

  -- trend flag (latest active year vs the immediately preceding active year, by gci)
  update gold_agent_performance_lifetime l
  set yoy_last_pct = s.pct,
      trend_flag = case
        when s.pct is null then 'dormant'
        when s.pct >  0.10 then 'growing'
        when s.pct < -0.10 then 'declining'
        else 'flat' end
  from (
    select z.gold_agent_id, (z.gci - z.prev_gci) / nullif(z.prev_gci,0) as pct
    from (
      select gold_agent_id, tax_year, gci,
             lag(gci) over (partition by gold_agent_id order by tax_year) as prev_gci,
             row_number() over (partition by gold_agent_id order by tax_year desc) as rn
      from gold_agent_performance_yearly
    ) z
    where z.rn = 1
  ) s
  where s.gold_agent_id = l.gold_agent_id;

  truncate gold_brokerage_performance_yearly;
  insert into gold_brokerage_performance_yearly (tax_year, gci, net_office, deals, volume)
  select tax_year, sum(gross_commission), sum(office_fee),
         count(*) filter (where is_closing), sum(gross_sale_price)
  from gold_transactions group by tax_year;
end $$;

-- ---------- RECONCILE computed vs workbook ----------
create or replace function gold_reconcile()
returns void language plpgsql as $$
begin
  delete from gold_reconciliation_log where run_at < now() - interval '0 second';
  -- agent lifetime GCI vs workbook 7-yr GCI
  insert into gold_reconciliation_log (scope, key_ref, metric, computed, workbook, diff)
  select 'agent_lifetime', l.gold_agent_id, 'gci_7yr', l.total_gci, sa.gci_7yr,
         round(coalesce(l.total_gci,0) - coalesce(sa.gci_7yr,0), 2)
  from gold_agent_performance_lifetime l
  join (select distinct on (gold_agent_id) gold_agent_id, gci_7yr
        from gold_staging_agents order by gold_agent_id, id desc) sa
    on sa.gold_agent_id = l.gold_agent_id
  where abs(coalesce(l.total_gci,0) - coalesce(sa.gci_7yr,0)) > 1.0;
end $$;

-- ---------- ORCHESTRATOR ----------
create or replace function gold_run_full_import(p_batch uuid)
returns table(matched int, review int, created int) language plpgsql as $$
begin
  perform gold_normalize(p_batch);
  perform gold_rebuild_performance();  -- first pass (contact links fill after match)
  return query select * from gold_match_agents();
end $$;

-- =====================================================================
-- App-facing views
-- =====================================================================
create or replace view v_agent_scorecard as
  select ga.gold_agent_id, ga.full_name, ga.contact_id,
         l.total_deals, l.total_gci, l.total_volume, l.active_years,
         l.first_year, l.last_year, l.yoy_last_pct, l.trend_flag
  from gold_agents ga
  left join gold_agent_performance_lifetime l on l.gold_agent_id = ga.gold_agent_id;

create or replace view v_agent_leaderboard_yearly as
  select y.tax_year, ga.full_name, y.gold_agent_id, y.contact_id,
         y.deals, y.gci, y.volume,
         rank() over (partition by y.tax_year order by y.gci desc) as gci_rank,
         rank() over (partition by y.tax_year order by y.deals desc) as deals_rank
  from gold_agent_performance_yearly y
  join gold_agents ga on ga.gold_agent_id = y.gold_agent_id;

create or replace view v_brokerage_summary as
  select * from gold_brokerage_performance_yearly order by tax_year;

-- referrals on their own page
create or replace view v_referrals as
  select t.gold_txn_id, t.tax_year, ga.full_name, t.contact_id,
         t.property_address_raw, t.referral_amt, t.agent_payout, t.gross_commission, t.notes
  from gold_transactions t
  join gold_agents ga on ga.gold_agent_id = t.gold_agent_id
  where t.is_referral
  order by t.tax_year desc, t.referral_amt desc;

-- finance ledger
create or replace view v_commission_ledger as
  select t.gold_txn_id, t.tax_year, ga.full_name, t.contact_id, t.deal_type, t.side,
         t.gross_sale_price, t.gross_commission, t.agent_payout, t.office_fee,
         t.referral_amt, t.rog_corp_cost, t.is_closing, t.date_paid, t.notes
  from gold_transactions t
  join gold_agents ga on ga.gold_agent_id = t.gold_agent_id
  order by t.tax_year desc, t.gold_txn_id;
