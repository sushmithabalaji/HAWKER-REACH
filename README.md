# HawkerReach

What happens when a Singapore hawker centre closes for works? HawkerReach answers two questions from public data:

- **Closure scenarios (for NEA planners):** if this centre closes, where do its diners go, and which other centres can safely close at the same time?
- **Seniors & access (for AACs):** if this centre closes, which seniors lose a walkable hawker centre, and who should check on them?

Databricks notebooks turn public data into gold tables in the `hawkerreach` catalog. A React app, deployed as a Databricks App, reads those gold tables and shows them on maps.

```
data.gov.sg + SingStat files, OSM walking network
        ▼
Databricks notebooks  →  hawkerreach.bronze → silver → gold
        ▼
SQL warehouse
        ▲  SQL query files (gold only)
Node server (AppKit), deployed as a Databricks App
        ▲  /api
Browser: React + Vite + deck.gl
```

More: [docs/architecture.md](docs/architecture.md), [ADR 0001](docs/adr/0001-react-and-node-on-databricks-apps.md), the screens in [docs/wireframes/v1/README.md](docs/wireframes/v1/README.md).

## Repo layout

| Path | What |
|---|---|
| `01_ingest` … `07_lineage_check` (`.ipynb`) | The pipeline notebooks (see below) |
| `dq.py` | `DQLog`: appends to `silver.data_quality_log`, the one table every notebook writes |
| `tiers.py` | Walking-access tiers T1–T4, shared by `04_gold_access` and `05_gold_closures` |
| `tests/` | Python unit tests for `tiers.py` |
| `Sql/00_setup.sql` | Creates the catalog, schemas, raw-files volume and the data-quality log |
| `Sql/01_app_grants.sql` | Gold-only read grants for the app's service principal |
| `databricks.yml`, `resources/` | Bundle for the `hawkerreach_rebuild` job |
| `app/` | The app (its own bundle in `app/databricks.yml`; see [app/README.md](app/README.md)) |
| `assumptions.json` | Values more than one spec reads (paces, cutoffs, visit rates, waste) |
| `ASSUMPTIONS.md` | Spec 1's assumptions and decisions |
| `docs/` | Architecture, ADRs, wireframes, agent notes |

## The pipeline

| Notebook | Writes |
|---|---|
| `01_ingest` | `bronze`: the raw files as tables |
| `02_silver` | `silver`: centres, blocks, subzones, closures |
| `03_dist_matrix` | `silver.dist_matrix`: the walking network and block → centre walks up to 2 km |
| `04_gold_access` | `gold.block_access`, `gold.subzone_seniors`, `gold.access_sensitivity`, and the tables both pages share: `gold.centres`, `gold.centre_closures`, `gold.subzone_shapes` |
| `05_gold_closures` | `gold.block_options`, `gold.centre_demand`, `gold.closure_scenarios` |
| `06_sensitivity_mlflow` | Four MLflow runs (10, 15 and 20 min limits, plus a step-free run) so a data refresh that shifts the numbers shows up |
| `07_lineage_check` | Checks from Unity Catalog lineage that gold reads only silver and gold, and the app reads only gold. Logs, never fails |

The Lakeflow Job `hawkerreach_rebuild` runs them in order on serverless. It has no schedule; run it by hand after a data refresh, from the repo root:

```bash
databricks bundle deploy
databricks bundle run rebuild
```

First-time setup: run `Sql/00_setup.sql` once, and `Sql/01_app_grants.sql` after the app exists.

Python tests:

```bash
python3 -m unittest discover tests
```

## The app

```bash
cd app
cp .env.example .env      # set DATABRICKS_HOST (or DATABRICKS_CONFIG_PROFILE) and DATABRICKS_WAREHOUSE_ID
npm install
npm run dev               # local, against the real warehouse
```

Before committing app changes, run `npm run typecheck`, `npm test`, `npm run lint` and `npm run lint:ast-grep` (deploy fails on the last one). To deploy: `databricks apps validate`, then `databricks apps deploy`.

The app has two pages, registered in `app/client/src/pages/registry.tsx`:

1. **Closure scenarios** (`/closures`): pick an anchor centre and up to 5 more, see where displaced diners go, whether the set can close together, extra demand and waste per centre, and good candidates to schedule alongside.
2. **Seniors & access** (`/seniors`): HDB blocks coloured by walking tier at 15 minutes before and after a closure, the areas to alert, and a senior support list you can download as CSV.

Where pages, queries and shared code go is in [app/README.md](app/README.md).

## Key assumptions

- Walking paces: 1.4 / 1.2 / 1.0 m/s (brisk / typical / senior). Seniors walk at 1.0 m/s.
- Walking cutoff: 2 km. The map uses a 15-minute limit.
- Diners per centre per day = residents whose nearest centre it is × 0.83 × visits per week ÷ 7. Base case 3 visits a week, range 1–5.
- Waste per diner per day: 0.09 / 0.20 / 0.32 kg (low / base / high). No Singapore source yet.

Every number in the app has a line in its page's Assumptions panel tagged **MEASURED**, **MODELLED** or **ASSUMPTION**. To change a shared value, edit the root `assumptions.json`, then run `npm run sync:assumptions` in `app/`.

## Working on it

- Never commit to `main`. One branch per ticket (`<issue number>-<short-name>`), one PR per ticket with `Closes #<issue number>`.
- Run `/code-review` on the branch before opening the PR. Owners squash-merge their own PRs and delete the branch.
- Changing something another spec depends on (gold columns, the app shell, assumptions) needs a comment on that spec's issue tagging its owner first.
- Only the owning notebook writes a shared table. Experiments write to `hawkerreach.dev_<name>`. Clear notebook outputs before committing.
- The app reads precomputed gold tables only: no routing at click time, and the browser never queries Databricks directly.

Issues and spec owners: [GitHub Issues](https://github.com/sushmithabalaji/HAWKER-REACH/issues) and the table in [CLAUDE.md](CLAUDE.md).
