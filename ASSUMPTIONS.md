# Spec 1 assumptions and decisions

Settled in the Spec 1 grilling session (2026-10-22 and 2026-10-23). Spec 1 covers the seniors & access page (Page 2 in `docs/wireframes/v1/README.md`), gold `block_access`, `subzone_seniors` and the app shell. Owner: Sushmitha.

Where this file disagrees with the wireframe, this file wins.

## Changes from the wireframe and earlier plan

| Area | Was | Now |
|---|---|---|
| App stack | Streamlit in `app/` | Databricks AppKit in `app/`: React (Vite) + deck.gl on AppKit's Node server ([ADR 0002](docs/adr/0002-appkit-for-the-app.md)). Every read of a gold table is an AppKit SQL file on the SQL warehouse (Analytics, not Lakebase). No Streamlit or FastAPI. |
| `gold.block_access` | One row per block for each of 10/15/20 min, tiers T1–T4 | Replaced in place (no `_v2`) with one row per block (columns below). |
| Time limit | 10 / 15 / 20 min on the map | Fixed at 15 min on the map. 10 and 20 min stay in the pipeline only, for sensitivity runs. |
| Age-group control | Under 65 / 65–74 / 75–84 / 85+, at 1.3 / 1.2 / 1.0 / 0.8 m/s | Removed from the MVP. Seniors (65+) walk at 1.0 m/s everywhere. |
| "Slower walkers lose more" panel | On Page 2 | Removed. Replaced by the sensitivity line ("If the limit were 10 or 20 min…"). |
| "AACs to alert" | Ranked by seniors affected × multiplier | Renamed "Areas to alert": one row per subzone, sorted by seniors cut off, with `is_super_aged` as a badge and no multiplied score. |
| AAC column | Phase 2 | Still Phase 2, plus a spike ticket on AAC data sources. |
| Seniors per block | Subzone 65+ residents spread evenly over its blocks | `silver.blocks.est_seniors`, weighted by flat type. |
| Number tags | Page 1 only | Every number on Page 2 too, each with a line in the shared Assumptions panel. |
| Print brief | In the wireframe | Deferred. CSV download (built in React) stays in the MVP. |
| Page 2 data sources | Some silver | Gold only. Spec 1 adds `gold.centres` and `gold.centre_closures` for both pages. |

## Access model

- **Paces:** brisk 1.4, typical 1.2, senior 1.0 m/s.
- **Tiers at 15 min:**

  | Tier | Walk | Meaning |
  |---|---|---|
  | T1 | ≤ 900 m | a senior can walk it |
  | T2 | ≤ 1,080 m | a typical walker only |
  | T3 | ≤ 1,260 m | a brisk walker only |
  | T4 | > 1,260 m, or no centre within 2 km | no one can walk it (`nearest_centre_id` is null when there's no centre) |

- **Baseline vs scenarios:** `tier_now` is the baseline with all operating centres open. Closures are scenarios.
- **Closures handled:**
  - A clicked centre is a single closure.
  - A picked NEA closure that overlaps in time with another renovation or redevelopment closure among a block's nearest centres uses the next centre that's still open. If the second and third are both closed, the block is T4.
  - Cleaning overlaps show only as a note.
  - Users never combine closures by hand; that's Spec 2.
- **What can be picked:** renovation and redevelopment closures that are current or upcoming. Cleaning, partial (gas) and past closures are excluded.
- **Outcome groups** (blocks whose nearest open centre changes):

  | Group | Rule |
  |---|---|
  | Cut off | T1 → T2, T3 or T4 |
  | ↳ No one can walk it | T1 → T4 (sub-line of cut off) |
  | Already without access | T2–T4 before |
  | ↳ Now worse | T2/T3 → T4 (sub-count) |
  | Unaffected | T1 → T1 |

- **Meal-support rule** (column label "Suggested support"):
  - **Walking buddy:** nearest open centre after the closure is ≤ 1,800 m away (30 min at 1.0 m/s)
  - **Meal delivery:** it's further, or there's no centre within 2 km
  - Fixed and not editable. One row per subzone (the stricter suggestion wins), with block rows underneath. CSV exports at block level.
- **Town:** planning area (`pln_area_n`). The town filters the closure list and frames the map. The affected blocks include any block whose nearest centre closed, even across a town border.

## Seniors and subzones

- HDB residents only, throughout the project.
- **Super-aged threshold:** ≥ 21% aged 65+, tagged ASSUMPTION, with source "Super-aged threshold: ≥21% aged 65+ (MOH definition; NPTD Population in Brief 2026)". The Assumptions panel notes that our `pct_65p` uses SingStat residents, while the official figure uses citizens.
- **Multiplier:** subzone % aged 65+ ÷ national HDB % aged 65+.
- **Small subzones:** under 50 HDB residents get null `pct_65p` and multiplier.
- **`subzone_id`:** `subzone_id = subzone_c` everywhere.
  - Blocks get `subzone_c` from the silver spatial join.
  - Only the SingStat population joins by name (uppercased and trimmed), mapped once to `subzone_c`. Unmatched names go to `data_quality_log`.

## Gold tables (all written by `04_gold_access`)

- **`block_access`** (one row per block): `block_id`, `block_label` (blk_no + street), `subzone_id`, `pln_area_n`, `lon`, `lat`, `est_seniors`, `nearest_centre_id`, `nearest_walk_m`, `tier_now`, `second_centre_id`, `second_walk_m`, `tier_if_nearest_closes`, `third_centre_id`, `third_walk_m`.
- **`access_sensitivity`**: one row per (`closed_centre_id`, `limit_min` 10/15/20) for every closable (non-interim) centre, with `seniors_cut_off`, `seniors_no_one_can_walk`, `seniors_already_without`, `seniors_now_worse`, `blocks_cut_off`.
- **`subzone_seniors`**: `subzone_id`, `subzone_name`, `pln_area_n`, `hdb_residents`, `hdb_seniors`, `pct_65p`, `multiplier`, `is_super_aged`. No geometry.
- **`subzone_shapes`**: `subzone_id`, `name`, `planning_area`, `geometry`. Built from `silver.subzones` by:
  1. `make_valid`
  2. Project to SVY21 (EPSG:3414) and simplify to 15 m, preserving topology
  3. Project back to WGS84
  4. Assert every shape is valid and non-empty, and print the total GeoJSON size

  The app caches these shapes.
- **`centres`**: `centre_id` (same `HC_` IDs as silver), `name`, `lon`, `lat`, `cooked_food_stalls`, `is_interim`, `pln_area_n`, `subzone_id`. Interim centres count as open neighbours but can't be picked to close.
- **`centre_closures`**: every type and every date, with `closure_id`, `centre_id`, `type` (cleaning / renovation / redevelopment / partial), `start_date`, `end_date`, `duration_days`, `remarks`. Page 2 filters in its SQL.
- **Excluded centres:** list which operating centres (about 118 expected) are excluded and why.
- **Logging:** `data_quality_log` records issues, plus per-step summary rows (`rows_in`, `rows_out`, `dropped`).

## Tags

| Tag | Numbers |
|---|---|
| MEASURED | centre locations, closure dates, stall counts, SingStat residents (rounded to 10) |
| MODELLED | walk distances, tiers, seniors per block, seniors cut off, multiplier, diners per centre / overload |
| ASSUMPTION | 1.0/1.2/1.4 m/s, the 15-min limit, the 2 km cutoff, the 21% threshold, the 30-min meal-support rule, eating share, waste per meal |

## App shell

Stack and rules are in [ADR 0002](docs/adr/0002-appkit-for-the-app.md) and `docs/architecture.md`. The layout below is how pages and queries plug in.

- **Page code:** `app/client/src/pages/<page>/`, for example `pages/seniors/SeniorsPage.tsx` and its own components.
- **Queries:** `app/config/queries/<page>_<name>.sql`. AppKit names each query after its file, so prefix with the page. Run `npm run typegen`, then call it with `useAnalyticsQuery`. Gold tables only, with named parameters.
- **Custom routes:** none by default, and never for plain SELECTs. Anything a SQL file can't do goes in `app/server/server.ts` inside `onPluginsReady`, after a check with the shell owner.
- **Code used by both sides:** `app/shared/` holds pure TypeScript, with no React, Express or AppKit imports: tier rules, tag types.
- **Sidebar, client routes and Assumptions panels:** all come from `app/client/src/pages/registry.tsx` (`{ path, label, element, assumptions }`). Adding a page is one entry. Lines a spec shows on another spec's page go in `app/client/src/assumptions/<spec>.ts`. Details: `app/README.md`.
- **Tests:** Vitest, with `<name>.test.ts` next to the code.
- **Shared components** in `app/client/src/components/shared/`, built by Spec 1 and reused by other pages:
  - `CentreSearch`
  - `BaseMap`
  - `TagBadge`
  - `AssumptionsPanel` registry
- **Map:**
  - MapLibre GL via `react-map-gl` with deck.gl layers
  - OneMap grey basemap, Carto Positron as the fallback
  - `gold.subzone_shapes` always drawn underneath as a no-internet fallback
  - Tiles tested in the deployed app, with OneMap and Carto credited in the README
- **Replacing Streamlit:**
  - Done on a new branch.
  - Check `databricks apps init --help` first, and confirm AppKit apps run on Databricks Apps (Free Edition).
  - Deploy the empty shell and confirm it reads one gold table through an AppKit query file before building pages.
  - Nothing is reusable from Streamlit: `app/app.py` was only a connection check.

## Facts found

- Notebooks run from a Databricks Git folder (`/Users/sushmithabalaji2007@gmail.com/HAWKER-REACH`), so a notebook at the repo root can read repo files such as `assumptions.json` by relative path. Each teammate needs their own Git folder clone to run their branch.
- No `hawkerreach` app is deployed yet. The only app in the workspace is `hello-world`, which is stopped.
- The NEA closures file can't give "years since last major works" (Spec 4): it has at most one "other works" row per centre and no history. The closest data is `silver.centres.opening_year`.
- There's no official AAC location dataset. data.gov.sg has [yearly counts](https://data.gov.sg/datasets/d_0f70d7095a527be4ea443a7e30597896/view) and a [provider directory](https://data.gov.sg/datasets/d_d9c3fe5dd88c56c7d1322833d92c4fa7/view) that may not cover every AAC. MOH points to SupportGoWhere for confirmed locations.
- `DATABRICKS_CONFIG_PROFILE=hawkerreach` pointed at a profile missing from `~/.databrickscfg` (2026-10-22). The workspace profile is `dbc-98ae1c95-06a5`.

## Data quality, profile and registry

- **`hawkerreach.silver.data_quality_log`** is the one stated exception to the owning-notebook rule: it's append-only and every notebook writes to it. It holds issue rows plus per-step summary rows.
- **Excluded centres** are logged with `check_name = centre_excluded`, and the Assumptions panel shows "N centres excluded".
- **CLI profile:** ticket 4a adds a `[hawkerreach]` profile pointing at the `dbc-98ae1c95-06a5` workspace, so `DATABRICKS_CONFIG_PROFILE=hawkerreach` works.
- **Multiplier:** used only for the "vulnerability multiplier" map view and the subzone popup. It's built last in the Page 2 map ticket.
- **Assumptions registry:** Spec 1 builds it and registers Page 2's lines only. Specs 2 and 4 register their own. Unsourced figures (for example waste per meal) are either hidden or labelled "illustrative, unsourced"; `open` values that have a source text show it with "(source still needed)".

## Job, lineage and MLflow

- **Lakeflow Job:** defined in a Declarative Automation Bundle, on serverless, triggered manually.
  - Tasks run `01` → `02` → `03` → `04`. Saanvi's `05_gold_closures` runs after `03`, or after `04` if it reads `block_access`.
  - If the bundle isn't working within about an hour, define the job in the Jobs UI and commit its YAML.
- **`05_gold_closures` must not compute its own tiers.** It either reads `block_access` after `04`, or both use one shared tier function.
- **Lineage check:** queries `system.access.table_lineage` to confirm that gold tables read only from `hawkerreach.silver`/`gold` and that the app's service principal reads only gold. Without system tables, it falls back to a static check that every app query file references only `hawkerreach.gold.*`. It logs the result and writes it to `data_quality_log`, and never fails the run.
- **MLflow:** four runs per job run, at 10, 15 and 20 min plus a step-free senior run (`highway=steps` removed, from `silver.dist_matrix_step_free`). The app never reads MLflow. Overload sensitivity (eating share, distance decay) belongs to Spec 2.

## Tickets

Spec 1 is a GitHub parent issue with these tickets as sub-issues, in build order:

1. Scaffold AppKit, deploy the empty shell, read one gold table
2. Silver: `data_quality_log` and `subzone_c`
3. Gold access: `block_access`, `access_sensitivity`, `centres`, `centre_closures`
4. Gold subzones: `subzone_seniors`, `subzone_shapes`
5. Shell: page registry, sidebar, `TagBadge`, `AssumptionsPanel`
6. Shared `BaseMap` and `CentreSearch`
7. Page 2: closure picker, access map, outcome groups, sensitivity line, then the multiplier view. Also updates the wireframe README.
8. Page 2: Areas to alert, Senior meal-support list, CSV
9. Lakeflow Job, lineage check, MLflow runs

The AAC location source is a separate Phase 2 issue.
