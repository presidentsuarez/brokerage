-- =====================================================================
-- GOLD → Prism : Performance data schema
-- Target project: rtgfnwktybkorqvlirtd (Prism brokerage Supabase)
-- Applies cleanly on top of the existing schema (contacts, deals, etc.)
-- Everything lives under the gold_* prefix so it is isolated & retirable.
-- =====================================================================

create extension if not exists pg_trgm;      -- fuzzy name matching
create extension if not exists fuzzystrmatch; -- levenshtein
create extension if not exists "uuid-ossp";

-- ---------- enums ----------
do $$ begin
  create type gold_deal_type as enum ('sale','rental','lease','commercial','referral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gold_side as enum ('list','buy','both');
exception when duplicate_object then null; end $$;

-- ---------- provenance ----------
create table if not exists gold_import_batches (
  id            uuid primary key default uuid_generate_v4(),
  filename      text not null,
  sha256        text,
  imported_by   text,
  imported_at   timestamptz not null default now(),
  sheet_row_counts jsonb,
  status        text not null default 'loaded',  -- loaded|normalized|matched|reconciled|failed
  notes         text
);

-- ---------- staging (raw landing zone, append-only) ----------
create table if not exists gold_staging_transactions (
  id            bigserial primary key,
  batch_id      uuid references gold_import_batches(id) on delete cascade,
  source_sheet  text,
  tax_year      int,
  gold_txn_id   text,
  gold_agent_id text,
  agent_name    text,
  date_rcvd     text,
  month         text,
  property_address text,
  type          text,
  side          text,
  gross_sale_price numeric,
  gross_commission numeric,
  agent_payout  numeric,
  office_fee    numeric,
  referral_amt  numeric,
  rog_corp_cost numeric,
  date_paid     text,
  lender        text,
  notes         text,
  row_hash      text,
  processed     boolean not null default false,
  unique (batch_id, row_hash)
);

create table if not exists gold_staging_agents (
  id            bigserial primary key,
  batch_id      uuid references gold_import_batches(id) on delete cascade,
  gold_agent_id text,
  agent_name    text,
  raw           jsonb,           -- full per-year rollup as given in the workbook (validation only)
  total_deals   int,
  gci_7yr       numeric,
  active_years  text
);

create table if not exists gold_staging_notes (
  id            bigserial primary key,
  batch_id      uuid references gold_import_batches(id) on delete cascade,
  tax_year      int,
  source        text,
  note_date     text,
  month         text,
  gold_agent_id text,
  agent_name    text,
  gold_txn_id   text,
  property_address text,
  body          text
);

-- ---------- people / identity ----------
-- gold_agents = canonical producer record (everyone who has ever closed in GOLD)
create table if not exists gold_agents (
  id             uuid primary key default uuid_generate_v4(),
  gold_agent_id  text unique not null,         -- e.g. AGT-124
  full_name      text not null,
  name_norm      text,                          -- normalized for matching
  contact_id     uuid,                        -- FK → contacts.id (linked roster row), null until matched
  created_from   text default 'gold_import',    -- gold_import | roster_match | gold_created
  first_close_year int,
  last_close_year  int,
  created_at     timestamptz default now()
);

-- crosswalk = how each GOLD agent maps to the existing contacts roster
create table if not exists gold_agent_crosswalk (
  gold_agent_id   text primary key references gold_agents(gold_agent_id) on delete cascade,
  contact_id      uuid,                       -- contacts.id (nullable)
  gold_name       text,
  matched_name    text,
  match_method    text,                         -- exact|normalized|trigram|levenshtein|manual|created|unmatched
  match_confidence numeric,
  needs_review    boolean default false,
  verified        boolean default false,
  reviewed_by     text,
  created_at      timestamptz default now()
);

-- ---------- core facts ----------
create table if not exists gold_properties (
  id              uuid primary key default uuid_generate_v4(),
  address_raw     text,
  address_norm    text unique,
  first_seen_year int,
  txn_count       int default 0
);

create table if not exists gold_transactions (
  id               uuid primary key default uuid_generate_v4(),
  gold_txn_id      text unique not null,
  tax_year         int not null,
  gold_agent_id    text references gold_agents(gold_agent_id),
  contact_id       uuid,                        -- denormalized link to roster (filled from crosswalk)
  property_id      uuid references gold_properties(id),
  property_address_raw text,
  deal_type        gold_deal_type default 'sale',
  side             gold_side,
  gross_sale_price numeric default 0,
  gross_commission numeric default 0,
  agent_payout     numeric default 0,
  office_fee       numeric default 0,            -- == "Net Office" per Javier
  referral_amt     numeric default 0,
  rog_corp_cost    numeric default 0,
  is_closing       boolean default true,          -- false for fee-only / reimbursement / BK ledger lines
  is_referral      boolean default false,         -- referrals count as deal+income but surface on their own page
  date_paid_raw    text,
  date_paid        date,
  month            text,
  lender           text,
  notes            text,
  batch_id         uuid references gold_import_batches(id),
  row_hash         text,
  created_at       timestamptz default now()
);

create index if not exists gold_txn_agent_idx   on gold_transactions(gold_agent_id);
create index if not exists gold_txn_contact_idx on gold_transactions(contact_id);
create index if not exists gold_txn_year_idx     on gold_transactions(tax_year);
create index if not exists gold_txn_type_idx     on gold_transactions(deal_type);
create index if not exists gold_txn_closing_idx  on gold_transactions(is_closing);

create table if not exists gold_notes (
  id              uuid primary key default uuid_generate_v4(),
  note_type       text,           -- company | transaction | agent
  tax_year        int,
  gold_agent_id   text,
  contact_id      uuid,
  gold_txn_id     text,
  property_address text,
  note_date       date,
  body            text
);

-- ---------- derived rollups (recomputed; never hand-entered) ----------
create table if not exists gold_agent_performance_yearly (
  gold_agent_id  text references gold_agents(gold_agent_id) on delete cascade,
  contact_id     uuid,
  tax_year       int,
  deals          int default 0,           -- count of is_closing rows (incl. referrals)
  gci            numeric default 0,
  agent_payout   numeric default 0,
  office_income  numeric default 0,
  referral_income numeric default 0,
  volume         numeric default 0,
  avg_deal_size  numeric default 0,
  primary key (gold_agent_id, tax_year)
);

create table if not exists gold_agent_performance_lifetime (
  gold_agent_id  text primary key references gold_agents(gold_agent_id) on delete cascade,
  contact_id     uuid,
  total_deals    int default 0,
  total_gci      numeric default 0,
  total_volume   numeric default 0,
  active_years   int[],
  first_year     int,
  last_year      int,
  yoy_last_pct   numeric,                  -- most recent full year vs prior
  trend_flag     text                      -- growing | flat | declining | dormant
);

create table if not exists gold_brokerage_performance_yearly (
  tax_year       int primary key,
  gci            numeric default 0,
  net_office     numeric default 0,
  deals          int default 0,
  volume         numeric default 0
);

create table if not exists gold_reconciliation_log (
  id            bigserial primary key,
  run_at        timestamptz default now(),
  scope         text,    -- agent_yearly | brokerage_yearly
  key_ref       text,    -- agent id / year
  metric        text,
  computed      numeric,
  workbook      numeric,
  diff          numeric
);

-- =====================================================================
-- RLS  (commission data is sensitive)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'gold_import_batches','gold_staging_transactions','gold_staging_agents','gold_staging_notes',
    'gold_agents','gold_agent_crosswalk','gold_properties','gold_transactions','gold_notes',
    'gold_agent_performance_yearly','gold_agent_performance_lifetime',
    'gold_brokerage_performance_yearly','gold_reconciliation_log'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    -- service role / postgres does everything (edge functions, migrations)
    execute format($f$
      drop policy if exists %1$s_admin_all on %1$s;
      create policy %1$s_admin_all on %1$s
        for all to service_role using (true) with check (true);
    $f$, t);
  end loop;
end $$;

-- Authenticated agents may read ONLY their own performance (linked via contacts.user_email).
-- NOTE: assumes contacts has a primary key column `id` and an owner email column `user_email`
--       (confirmed from migration 20260409_add_contact_assignee.sql). Adjust if your key differs.
drop policy if exists gold_perf_self_read on gold_agent_performance_yearly;
create policy gold_perf_self_read on gold_agent_performance_yearly
  for select to authenticated
  using (
    contact_id in (select id from contacts where email = auth.email() or portal_email = auth.email())
  );

drop policy if exists gold_perf_life_self_read on gold_agent_performance_lifetime;
create policy gold_perf_life_self_read on gold_agent_performance_lifetime
  for select to authenticated
  using (
    contact_id in (select id from contacts where email = auth.email() or portal_email = auth.email())
  );

-- Brokerage rollup is non-sensitive aggregate → readable by any authenticated user.
drop policy if exists gold_brokerage_read on gold_brokerage_performance_yearly;
create policy gold_brokerage_read on gold_brokerage_performance_yearly
  for select to authenticated using (true);
