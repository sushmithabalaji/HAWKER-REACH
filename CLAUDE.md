# HawkerReach

Databricks notebooks (`01_ingest` → `04_gold_access`) build bronze, silver and gold tables in the `hawkerreach` catalog. The app in `app/` is a Databricks AppKit app: a React (Vite) front end with deck.gl maps on AppKit's Node (Express) server, deployed as a Databricks App. Pages read gold tables through AppKit SQL query files on the SQL warehouse (Analytics, not Lakebase). No Python UI frameworks (no Streamlit, Dash or FastAPI). The current `app/app.py` is a Streamlit placeholder that Spec 1 replaces. Overview: `docs/architecture.md`; reasoning: `docs/adr/0001-react-and-node-on-databricks-apps.md` and `docs/adr/0002-appkit-for-the-app.md`. Screens are in `docs/wireframes/v1/README.md`.

## Spec owners

| Spec | Owner |
|---|---|
| 1 · Seniors & access page (gold `block_access` v2, `subzone_seniors`, app shell, Page 2) | Sushmitha |
| 2 · Closure scenario model (gold `block_options`, `centre_demand`, `closure_scenarios`; notebook `05_gold_closures`; see #6) | Saanvi |
| 3 · Closure scenarios page: ripple and "can these close together?" | Aanya |
| 4 · Demand, waste and scheduling candidates | Aanya |
| 5 · Demo readiness | Everyone |

The spec's owner builds all of its tickets.

## Team rules

- Never commit to `main`. One branch per ticket, named `<issue number>-<short-name>`, e.g. `12-subzone-seniors`.
- One PR per ticket, with `Closes #<issue number>` in the description.
- Run `/code-review` on the branch before opening the PR. Owners merge their own PRs (squash) and delete the branch.
- Changing something another spec depends on (gold table columns, the app shell, assumptions) needs a comment on that spec's issue tagging its owner before merging.
- Each notebook has one owner. Clear notebook outputs before committing.
- Only the owning notebook writes a shared table in `hawkerreach`. Experiments write to a personal schema, `hawkerreach.dev_<name>`. The one exception is `hawkerreach.silver.data_quality_log`: it's append-only, and every notebook writes to it.
- Every number shown in the app carries a MEASURED, MODELLED or ASSUMPTION tag and a line in the Assumptions panel.
- No routing at click time: the app reads precomputed gold tables.
- The browser never queries Databricks directly; every read of a gold table is an AppKit SQL file in `app/config/queries/`, run by the AppKit server (custom server routes only for what SQL can't do; see ADR 0002).

## Decisions

Spec 1's assumptions and decisions are in `ASSUMPTIONS.md`. Values that more than one spec reads (notebooks and app) live in `assumptions.json` at the repo root; change them there. Each entry has a `status`: `sourced` (outside source or data check), `open` (still needs one) or `decided` (a team or design choice).

- Walking paces: 1.4 / 1.2 / 1.0 m/s (brisk / typical / senior), as in `04_gold_access`. Page 2 has no age-group control in the MVP; seniors walk at 1.0 m/s.
- Walking distance cutoff: 2 km, as in `silver.dist_matrix`.
- Diners per centre per day = residents whose nearest centre it is × 0.83 (NEA Perception Survey of Hawker Centre Patrons 2018) × visits per week ÷ 7. Base case 3 visits/week; range 1–5. Tagged ASSUMPTION.
- The AAC column in the meal-support list is Phase 2 (waits on MSF data).
- The anchor centre for the demo is picked after the first MVP.
- App stack: Databricks AppKit (React + Vite + deck.gl on AppKit's Node/Express server), deployed as a Databricks App (ADR 0001, ADR 0002).
- Still open: a kg-per-diner-per-day waste source (blocks Spec 4).
- Still open: whether "avoid Python frameworks" also covers the PySpark notebooks (assumed no).

## Agent skills

### Issue tracker

Issues live in GitHub Issues on sushmithabalaji/HAWKER-REACH, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
