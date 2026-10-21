# HawkerReach

Databricks notebooks (`01_ingest` → `04_gold_access`) build bronze, silver and gold tables in the `hawkerreach` catalog. A Streamlit app in `app/` reads gold tables only. Screens are in `docs/wireframes/v1/README.md`.

Spec plan, owners and decisions: https://claude.ai/artifact/7uk6RK7GPj3vmKCqhwVhpi

## Spec owners

| Spec | Owner |
|---|---|
| 1 · Seniors & access page (gold `block_access` v2, `subzone_seniors`, app shell, Page 2) | Sushmitha |
| 2 · Closure scenario model (gold `closure_scenarios`, `neighbour_load`, `closure_conflicts`, `closure_queue`) | Saanvi |
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
- Only the owning notebook writes a shared table in `hawkerreach`. Experiments write to a personal schema, `hawkerreach.dev_<name>`.
- Every number shown in the app carries a MEASURED, MODELLED or ASSUMPTION tag and a line in the Assumptions panel.
- No routing at click time: the app reads precomputed gold tables.

## Decisions

- Walking paces: 1.4 / 1.2 / 1.0 m/s (brisk / typical / senior), as in `04_gold_access`. Page 2's age-group control maps onto these.
- Walking distance cutoff: 2 km, as in `silver.dist_matrix`.
- Diners per centre per day = residents whose nearest centre it is × 0.83 (NEA Perception Survey of Hawker Centre Patrons 2018) × visits per week ÷ 7. Base case 3 visits/week; range 1–5. Tagged ASSUMPTION.
- The AAC column in the meal-support list is Phase 2 (waits on MSF data).
- The anchor centre for the demo is picked after the first MVP.
- Still open: a kg-per-diner-per-day waste source (blocks Spec 4).

## Agent skills

### Issue tracker

Issues live in GitHub Issues on sushmithabalaji/HAWKER-REACH, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
