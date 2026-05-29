# Prism — Build Session Notes

_Living doc. Pick up here next session. Last updated: May 29, 2026._

## Where things stand (GOLD import — DONE & live)
- Target DB: **Prism Supabase `rtgfnwktybkorqvlirtd`** (repo `presidentsuarez/brokerage`, React CRA, domain in CNAME `app.getreap.ai`).
- GOLD data now lives **in the system**, not in `gold_*` tables (those were dropped):
  - Loaded into the real **`transactions`** table, seeded `org_id = 8cc1004c…` (Realty One Group Advantage) + `agent_contact_id`.
  - Extended `transactions` with: `agent_contact_id, tax_year, side, agent_payout, office_fee, referral_amt, rog_corp_cost, is_closing, is_referral, is_fee_only, source, gold_txn_id`.
  - Agent notes → `agent_notes` table.
  - Rollups → `agent_performance_yearly`, `agent_performance_lifetime`, `brokerage_performance_yearly` (refresh via `select rebuild_performance();`).
  - Views: `v_agent_scorecard`, `v_agent_leaderboard_yearly`, `v_brokerage_summary`, `v_referrals`, `v_fee_ledger`, `v_commission_ledger`.
  - Selector fn: `org_performance(p_year int default null)`.

## Verified numbers (reconcile to the workbook to the dollar)
- 2,166 transactions · 2,111 closings · 78 referrals · 55 fee-only.
- Brokerage GCI/volume/net-office match the GOLD Dashboard for all 7 years.
- Agents: 164 distinct contacts (see Leslie note) · roster 101 → 217 (116 created, tagged `source='GOLD import'`).
- Yearly deals sum = 2,111 (matches closings). 0 reconciliation diffs > $1.

## Things to track / confirm next session
1. **Leslie McCluskie merge** — GOLD `AGT-090` "Leslie McCluskie" and `AGT-091` "Leslie Mccluskie," normalized to the same name and merged into ONE contact. Confirm same person (likely) or split into two.
2. **Deal-count definition** — we EXCLUDE 55 fee-only lines (BK/reimbursement/recurring $175). So 2026 shows 123 deals vs the workbook's 144. Confirm we keep the cleaner count, or flip `is_closing` to include them.
3. **2020 has volume but $0 GCI** — source GOLD has no commission data for 2020 (deals + volume only). Get 2020 commissions if they exist.
4. **Agent emails missing** — the 116 created agent contacts have no email. Agent self-login + agent-scoped RLS (`contacts.email = auth.email()`) won't work for them until emails are collected. Needed before agents can log in and see their own scorecard.
5. **close_date not parsed** — GOLD `Date Paid` was messy free text; only `tax_year` is set. Parse later if date-level reporting is needed.
6. **net_commission = office_fee**, `commission_pct` not populated. Confirm definition is right.
7. **Re-import path** — the one-time `gold_*` staging/pipeline was dropped. For future GOLD uploads, build a small system importer (CSV → transactions with source tag + idempotent `gold_txn_id`).
8. **App wiring TODO** — point the leadership dashboard + agent views at the `v_*` views. Fee-only on its own page (`v_fee_ledger`); referrals page (`v_referrals`).
9. **Verified fuzzy matches** — Kamal Abdel Suarez ✓, Jennifer White ✓ (cleared review).

## Access model wired
- Leadership = `org_members` with role `owner`/`admin` (active). They see ALL org data via RLS + `org_performance()` selector (year toggle).
- Agents see only their own rows (once emails exist).
- `service_role` bypasses RLS (edge functions / admin).

## SECURITY — do now
- Rotate: Supabase **service-role key**, **Management API token (sbp_…)**, **GitHub PAT** — all were pasted into chat.
- Scrub live keys from the PUBLIC repo's `master.txt` (Resend, Quo, Stripe pk_live) and its git history; make repo private.
