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
| "Slower walkers lose more" panel | On Page 2 | Removed. Replaced by the sensitivity line ("If the limit were 10 or 20 min…"), itself removed in #96; the 10 and 20 min runs stay in `gold.access_sensitivity` and MLflow. |
| "AACs to alert" | Ranked by seniors affected × multiplier | Renamed "Areas to alert": one row per subzone, sorted by seniors cut off, with `is_super_aged` as a badge and no multiplied score. |
| Priority areas | Every area to alert listed alike (#32) | Replaces #32's "list every area" rule: priority areas come first and are badged (see below). Still no multiplied score: priority only orders and labels the list; within each group the order stays by seniors cut off. (#77, #110) |
| AAC column | Phase 2 | Still Phase 2, plus a spike ticket on AAC data sources. |
| Seniors per block | Subzone 65+ residents spread evenly over its blocks | `silver.blocks.est_seniors`, weighted by flat type. |
| Number tags | Page 1 only | Every number on Page 2 has a line in the Assumptions panel, which carries its tag. Since #91 tags aren't shown beside numbers on Page 2 (as on Page 1, #80). |
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

- **Suggested support** (#78, replaces the meal-support rule; walking buddy is dropped, since asking seniors to walk further isn't the answer). Each area shows its **alternative centre** (the open centre nearest any of its cut-off blocks, with the walk; where its shuttle goes) and only the supports its conditions trigger, each with a short reason on hover:
  - **Shuttle:** an open centre is still within 2 km. One shuttle per subzone picks up from its cut-off blocks and goes to the nearest open centre.
  - **Meal delivery or vouchers:** a cut-off block has no open centre within 2 km.
  - **Volunteer check-ins:** a super-aged area where some block has no centre anyone can walk to (T1 → T4).
  - **Temporary food point:** at least `access.food_point_min_seniors` (100, status `open`) seniors cut off by the closure in the area have no open centre within 2 km. Blocks that were already without a walkable centre before the closure aren't counted.
  - Check-ins wait until `subzone_seniors` loads, so they never quietly drop out.
  - "No open centre within 2 km" means the block's second and third nearest centres are closed or out of range (gold keeps three per block).
  - Each block row keeps its own support (shuttle or meals). The CSV has `block_support` and `area_supports` columns.
  - **Not built yet:** community meal points (no data on where they are), and a "may be crowded" flag on the alternative centre (it needs the closure engine's receivers from Spec 2's `centre_demand`; #86).
- **Priority areas** (#77): an area to alert is a priority if a block in it went T1 → T4 (no one can walk to a centre) or it is super-aged (21%+ aged 65+).
  - The support list shows up to 5 affected areas by default, fewer if fewer are affected (#116): areas with seniors cut off first (priority first, then by seniors cut off), then **Longer walk** areas (the nearest centre closes but seniors can still walk to the next), then **Loses a backup centre** areas (the closed centre is a block's second or third nearest), each by seniors. The extra rows are labelled and say "No extra support needed". "Show all N affected areas" lists every one (#110). For the real NEA closures this is 8, 4 and 4 areas. Priority rows carry a "Priority" badge. Each row shows the area's vulnerability band and multiplier, and the CSV has a `vulnerability_multiplier` column.
  - On the vulnerability map, only priority areas get the dark outline.
  - The CSV keeps every affected block, with a `priority` column (yes / no).
  - If no area is a priority, the severity box says "No area needs urgent help"; the support list still shows its top 5.
  - Until the super-aged flags load (or if `subzone_seniors` fails), the rule can't run, so every area shows as before.
- **Page 2 layout** (#79): the right-hand column reads closure → impact → severity → what to do.
  - **Closing:** the centre, its closure type, dates and days, and any works closures nearby at the same time.
  - **Impact:** seniors who lose a 15-min walk, and how many of them no one can walk for.
  - **Severity** (ASSUMPTION, status `open`): **Severe** at `access.severity.severe_priority_areas` (3) or more priority areas, or `access.severity.severe_no_walk_seniors` (50) or more seniors no one can walk for; **Moderate** with any priority area; **Low** when seniors only have a longer walk. Shown once the super-aged flags load.
  - **Access before → after** (#99, replaces the "What to do" card, which repeated the support list): seniors in blocks whose nearest centre closed, by map level before → after (OK, Concerning, Highly vulnerable), one row per change with a bar. Blocks that keep their level are left out. What to do is in the support list below the map. Severity waits for `subzone_seniors`, with a line saying so.
  - The closed centre gets a highlight "×" on the map, as on Page 1 (#99).
  - **No helper text** (#91): Page 2 shows no tags beside numbers and no small grey explanatory lines, only what happened, who is affected, how serious it is and what to do, plus empty and loading states. The Assumptions panel keeps only lines a reader needs; method notes (rounding to 5, outline simplification, small-subzone cutoff, HDB residents vs citizens, overlap handling, Phase 2 and follow-up notes) live in this file only.
  - No "Details" toggle (#96): the outcome groups, the 10 and 20 min figures and cleaning nearby aren't shown on Page 2. The 10 and 20 min runs stay in `gold.access_sensitivity` and MLflow for the team. The sources paragraph moved into the Assumptions panel; block rows in the support list are behind a per-area "Show N blocks".
- **Map legends** (#75): plain words instead of tier codes and bare multipliers.
  - Access tiers show three levels of concern: **Accessible** (T1, a senior can walk there in 15 min; called "OK" until #103), **Concerning** (T2 and T3, too far for a senior to walk) and **Highly vulnerable** (T4, no one can walk there). T2 and T3 share the amber colour; the tier codes stay in the model, the block tooltip and the CSV.
  - The vulnerability multiplier has four named bands: **Low vulnerability** (under ×0.85), **Moderate** (×0.85–1.1), **High** (×1.1–1.35) and **Extremely vulnerable** (×1.35+), on the app's orange ramp (#99; it was purple in #75), getting stronger as the number goes up. The wireframe's lowest two bands (split at ×0.6) are merged. The subzone popup leads with the band name. Every subzone is shaded, closure or not (#110 undid #105's affected-only shading). The legend says each band in plain words, for example "High: 10–35% more seniors than average".
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
- **`centres`**: `centre_id` (same `HC_` IDs as silver), `name`, `lon`, `lat`, `cooked_food_stalls`, `is_interim`, `pln_area_n`, `subzone_id`, `opening_year` (nullable; Spec 4's age proxy). Interim centres count as open neighbours but can't be picked to close.
- **`centre_closures`**: every type and every date, with `closure_id`, `centre_id`, `type` (cleaning / renovation / redevelopment / partial), `start_date`, `end_date`, `duration_days`, `remarks`. Page 2 filters in its SQL.
- **Excluded centres:** list which operating centres (about 118 expected) are excluded and why.
- **Logging:** `data_quality_log` records issues, plus per-step summary rows (`rows_in`, `rows_out`, `dropped`).

## Rebuild job, sensitivity and lineage (#33)

- **Job:** `hawkerreach_rebuild` (bundle `databricks.yml` at the repo root), serverless, manual runs only. Order: `01_ingest` → `02_silver` → `03_dist_matrix` → `04_gold_access` → `05_gold_closures` (Spec 2; after `04` because it reads `gold.block_access`) and `06_sensitivity_mlflow`, then `07_lineage_check`, which runs even if an earlier task failed.
- **Step-free network:** `03_dist_matrix` reruns the walking search with every OpenStreetMap segment tagged `highway=steps` removed, and writes `silver.dist_matrix_step_free` (same columns, same 2 km cutoff). Ramps, lifts and the slope of a path aren't modelled. The step-free pass takes its own largest connected piece of the network and snaps blocks to it again, so a few walks come out slightly shorter than with steps. "Seniors cut off by steps" is therefore a slight undercount. No gold table the app reads uses this matrix.
- **MLflow runs** (`06_sensitivity_mlflow`, experiment `hawkerreach_access_sensitivity`): four per job run, at 10, 15 and 20 min on the walking network, plus seniors at 1.0 m/s and 15 min step-free. Params: paces, limit, cutoff, data download dates. Metrics:
  - `seniors_cut_off_summed_over_closures`: each closable centre closing alone, added up. A senior near several centres counts once per centre, so this compares runs; it isn't a headcount.
  - `seniors_cut_off_worst_closure`: the single closure that cuts off the most seniors.
  - `seniors_cut_off_by_steps`: a headcount of seniors who are T1 today but not T1 step-free.
  - `seniors_without_walk`, `t4_blocks`, `centres_excluded`: today, with every centre open. `centres_excluded` depends on the cutoff, not the time limit, so it's the same in the three limit runs.
  - The app never reads MLflow. Overload sensitivity (eating share, distance decay) is Spec 2's.
- **Lineage check** (`07_lineage_check`): gold tables read only `hawkerreach.silver`/`gold`, and the app's service principal reads only `hawkerreach.gold`, from `system.access.table_lineage` over the last 30 days (not only this run). Lineage records only some of the app's reads, so a static check that every app query names only `hawkerreach.gold.*` tables runs too. Results go to `data_quality_log`; the check never fails the run.

## Tags

| Tag | Numbers |
|---|---|
| MEASURED | centre locations, closure dates, stall counts, SingStat residents (rounded to 10) |
| MODELLED | walk distances, tiers, seniors per block, seniors cut off, multiplier, diners per centre / overload |
| ASSUMPTION | 1.0/1.2/1.4 m/s, the 15-min limit, the 2 km cutoff, the 21% threshold, the suggested-support rules and food-point threshold, eating share, waste per meal |

## App shell

- **Page code:** `app/client/src/pages/<page>/`.
- **Queries:** `app/config/queries/<page>_<name>.sql`. AppKit names each query after its file, so prefix with the page.
- **Custom /api routes:** none by default. Any route goes in `app/server/server.ts` inside `onPluginsReady`, after a check with the shell owner.
- **Top-bar tabs and routes:** both come from `app/client/src/pages/registry.tsx` (#41 replaced the sidebar with the wireframe's top bar).
- **Shared components** in `app/client/src/components/shared/`, built by Spec 1 and reused by other pages:
  - `CentreSearch`
  - `BaseMap`, with `centresLayer` and `mapColours`
  - `Panel`, `MapRow`, `Pill`, `InkToggleItem` (the wireframe's look, #41)
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

## Page 1 closure verdicts (Spec 3 and Spec 4)

Added 2026-10-26 with the "can these close together" logic fix. Every value below lives in `assumptions.json` and is read by the app; change it there.

- **Only the pair counts.** An added centre is judged on what happens because it closes together with the rest of the plan (the anchor and the other added centres), never on what it or the anchor does alone. What it does alone is listed under its card and never sets its colour.
- **Rules, first one that fires wins:**

  | Colour | Rule | Constant |
  |---|---|---|
  | Red | The added centre takes at least this share of the rest of the plan's displaced diners | `verdict.share.red` = 10% |
  | Red | At least this many blocks lose a centre within 15 min at senior pace only when both close | `verdict.access.min_new_blocks` = 1 |
  | Red | A third centre gets more than this much busier than today only when both close | `verdict.load.red_pct` = 20% |
  | Yellow | Share at least | `verdict.share.yellow` = 5% |
  | Yellow | A third centre gets more than this much busier only when both close | `verdict.load.yellow_pct` = 10% |
  | Green | None of the above ("Too far apart to overlap") | |

- **"Only when both close"** means the block is not cut off, or the centre is not past the limit, when the rest of the plan closes without the added centre, or when the added centre closes on its own.
- **Busier** is extra diners as a % of the centre's modelled diners today. A centre with under 1 diner a day today has no % and is shown as "new".
- **Cut off** means a block had a centre within the limit before and none after. A block already too far to walk is not counted.
- **NEA actions flag:** a centre is flagged when it gets more than `actions.waste.flag_pct` (20%) busier; a "new" centre counts as flagged. It never changes a colour.
- **Retired:** the NEA-closure benchmark (`verdict.load.yellow_quantile`, `verdict.load.red_quantile`) and the per-stall flag (`actions.waste.extra_per_stall_share`, `actions.waste.typical_centre_quantile`). Extra diners per stall remains in `gold.closure_scenarios` for the Spec 2 check.
- **Walking distance** stays the street-network `walk_m` from `silver.dist_matrix`, at the senior pace (1.0 m/s, 900 m in 15 min), so Page 1 agrees with Page 2.
