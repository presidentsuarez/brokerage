# Prism · GOLD performance data — build & apply

Target DB: **Prism Supabase `rtgfnwktybkorqvlirtd`** (repo `presidentsuarez/brokerage`).
Everything is namespaced `gold_*` and sits alongside your existing `contacts` / `deals` schema.

## Files
```
supabase/migrations/20260529000001_gold_schema.sql      tables, enums, indexes, RLS
supabase/migrations/20260529000002_gold_functions.sql   normalize / match / rollup / reconcile / views
supabase/seed/gold_seed.sql                              7-yr GOLD data + runs the pipeline
```

## One thing to confirm before applying
The agent-match function reads your **`contacts`** name column. It auto-detects `full_name`,
`name`, or `first_name`+`last_name`. If your roster uses a different name column, tell me and
I'll adjust `gold_match_agents()` (one line). Owner email is assumed to be `contacts.user_email`
(confirmed from your migration `20260409_add_contact_assignee.sql`).

## Apply — option A (Supabase CLI, recommended)
```bash
# from the brokerage repo root, linked to project rtgfnwktybkorqvlirtd
supabase db push                                   # runs both migrations
psql "$SUPABASE_DB_URL" -f supabase/seed/gold_seed.sql   # loads data + runs pipeline
```

## Apply — option B (Supabase Dashboard, no CLI)
1. SQL Editor → paste `20260529000001_gold_schema.sql` → Run
2. Paste `20260529000002_gold_functions.sql` → Run
3. Paste `gold_seed.sql` → Run  (it ends by running normalize → match → rebuild → reconcile)

The seed's final `select * from gold_match_agents();` returns **(matched, review, created)** —
the agent reconciliation report. Then review the queue:
```sql
select * from gold_agent_crosswalk where needs_review order by match_confidence;  -- fuzzy/uncreated
select * from gold_agent_crosswalk where match_method='unmatched';                -- will need a new contact
```

## Expected results (validated against the workbook)
Money columns reconcile to the penny. `select * from v_brokerage_summary;` should return:

| year | deals* | GCI | volume | net office |
|---|---|---|---|---|
| 2020 | 251 | $0 (volume-only year) | $62,708,047 | $0 |
| 2021 | 348 | $2,657,311 | $106,510,859 | $243,452 |
| 2022 | 336 | $2,957,507 | $118,362,428 | $261,421 |
| 2023 | 331 | $3,452,802 | $119,237,059 | $275,123 |
| 2024 | 369 | $3,247,928 | $129,077,059 | $276,437 |
| 2025 | 353 | $3,590,938 | $121,454,669 | $249,410 |
| 2026 | 123 | $1,058,144 | $38,427,394 | $81,396 |

`* deals` excludes 55 fee-only ledger lines (BK / reimbursement / recurring $175 charges) that
the workbook counted as deals. To match the workbook's historical deal count instead, change the
`is_closing` rule in `gold_normalize()` to `true` for all rows — one line. GCI/volume/office are
unaffected either way.

Total distinct transactions loaded: **2,166** · agents: **165** · notes: **678**.
Referrals (78) count as deal + income and also surface on their own page via `v_referrals`.

## App wiring (views to read from)
- `v_agent_scorecard` — per-agent lifetime + trend (recruiting/retention)
- `v_agent_leaderboard_yearly` — ranked by GCI/deals per year
- `v_brokerage_summary` — the dashboard rollup
- `v_commission_ledger` — finance ops
- `v_referrals` — referrals page

## Re-running / new uploads
The load is idempotent (batch id + `row_hash`, `on conflict do nothing`). For a future GOLD
upload, generate a new seed with a fresh batch id and re-run; then `select gold_rebuild_performance();`.

## APPLIED LIVE — May 29, 2026 (via Supabase Management API)
Ran against project `rtgfnwktybkorqvlirtd`. Results, all verified:

- Loaded **2,166** transactions, **165** agents, **678** notes. Closings (deals) **2,111**; referrals **78**.
- Brokerage rollup matches the workbook **to the dollar** for GCI / volume / net office, all 7 years.
- Reconciliation log: **0** agent lifetime-GCI diffs > $1 vs the workbook.
- Agent match → **47 exact**, **2 fuzzy** (1 auto, 1 flagged for review), **116 created** as new `contacts`
  (contact_type `Agent`, `source='GOLD import'`, org = Realty One Group Advantage). Roster 101 → 217.
- **Review this one fuzzy match:** GOLD `Kamal Abdel Suarez` → existing contact `kamal abdelsuarez`
  (confidence 0.76). Looks correct but confirm:
  `select * from gold_agent_crosswalk where needs_review;`
- Untouched: the existing empty app `transactions` table (GOLD lives in isolated `gold_*` tables).

## Security (urgent, separate from this build)
The public `brokerage` repo's `master.txt` contains live API keys in plaintext (Resend, Quo,
Stripe pk_live, Supabase ref). Rotate Resend + Quo, scrub the file from git history, make the repo
private.
