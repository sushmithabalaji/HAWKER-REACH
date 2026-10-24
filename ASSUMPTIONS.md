# Spec 1 assumptions and decisions

Settled in the Spec 1 grilling session (2026-10-22). Spec 1 covers the seniors & access page (Page 2 in `docs/wireframes/v1/README.md`), gold `block_access`, `subzone_seniors` and the app shell. Owner: Sushmitha.

Where this file disagrees with the wireframe, this file wins.

## Changes from the wireframe and earlier plan

| Area | Was | Now |
|---|---|---|
| App stack | Streamlit in `app/` | AppKit (React + TypeScript) in `app/`. Every read is an AppKit SQL file on the SQL warehouse (Analytics, not Lakebase). No Streamlit or FastAPI. |
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
  - Only blocks whose nearest centre is the picked one are in the scenario. An overlapping closure counts as closed only as one of those blocks' second or third centre; blocks whose own nearest is the other centre belong to that closure's scenario. (Decided in #31.)
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
- **Display rounding:** seniors counts are shown to the nearest 5, and under 5 as "<5", since seniors per block are estimates. Block counts are exact. (Decided in #31.)
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
- **`access_sensitivity`**: one row per (`closed_centre_id`, `limit_min` 10/15/20) for every operating centre, with `seniors_cut_off`, `seniors_no_one_can_walk`, `seniors_already_without`, `blocks_cut_off`.
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

- **Page code:** `app/client/src/pages/<page>/`.
- **Queries:** `app/config/queries/<page>_<name>.sql`. AppKit names each query after its file, so prefix with the page.
- **Custom /api routes:** none by default. Any route goes in `app/server/server.ts` inside `onPluginsReady`, after a check with the shell owner.
- **Sidebar and routes:** both come from `app/client/src/pages/registry.tsx`.
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
  - Check `databricks apps init --help` first.
  - Deploy the empty shell and confirm it reads one gold table before building pages.
  - Nothing is reusable from Streamlit: `app/app.py` was only a connection check.

## Facts found

- Notebooks run from a Databricks Git folder (`/Users/sushmithabalaji2007@gmail.com/HAWKER-REACH`), so a notebook at the repo root can read repo files such as `assumptions.json` by relative path. Each teammate needs their own Git folder clone to run their branch.
- No `hawkerreach` app is deployed yet. The only app in the workspace is `hello-world`, which is stopped.
- The NEA closures file can't give "years since last major works" (Spec 4): it has at most one "other works" row per centre and no history. The closest data is `silver.centres.opening_year`.
- There's no official AAC location dataset. data.gov.sg has [yearly counts](https://data.gov.sg/datasets/d_0f70d7095a527be4ea443a7e30597896/view) and a [provider directory](https://data.gov.sg/datasets/d_d9c3fe5dd88c56c7d1322833d92c4fa7/view) that may not cover every AAC. MOH points to SupportGoWhere for confirmed locations.
- `DATABRICKS_CONFIG_PROFILE=hawkerreach` points at a profile that doesn't exist in `~/.databrickscfg`. The workspace profile is `dbc-98ae1c95-06a5`.

## Still open

These are proposals, not decisions yet.

1. Put `data_quality_log` in `workspace.silver`, with the CREATE SCHEMA added to `Sql/00_setup.sql`.
2. Add a `[hawkerreach]` profile pointing at the `dbc-98ae1c95-06a5` workspace so the env var works.
3. Keep `multiplier` for the "vulnerability multiplier" map view and the subzone popup only.
4. Log centre exclusions to `data_quality_log` (`check_name = centre_excluded`) and show "N centres excluded" in the Assumptions panel.
5. Spec 1 builds the tag and assumptions registry and registers Page 2's lines only. Specs 2 and 4 register their own.
6. Split Spec 1 into eight tickets: pipeline / data quality log, gold access, gold subzones, app shell, shared map and search, Page 2 map and headline, Page 2 lists, AAC spike. Gold access comes first, because Specs 2 and 3 depend on `gold.centres` and `gold.centre_closures`.
7. Write Spec 1 as a GitHub parent issue with the tickets as sub-issues, and update the wireframe README as part of the Page 2 map ticket.
