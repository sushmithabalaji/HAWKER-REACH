# HawkerReach wireframe: first draft (v1)

**Live, clickable version:** https://claude.ai/artifact/XhisvM4eC1ecGd19QL2b5D
**Snapshot taken:** 2026-10-22 (first taken 2026-10-21; see Changes)

The `.dc.html` files in `source/` are template files from the Claude Design canvas. They contain `{{placeholders}}` and only render inside the artifact, so open the link above to see the screens. The files are kept here so the specs and tickets can quote exact labels, controls and table names.

## Current screens

The two screens marked ★ on the canvas are the current design. Everything in `source/earlier/` is an older version and is kept only for history.

### Page 1 · Closure scenarios (for NEA planners): `source/Feature1Ripple.dc.html`

Question it answers: *if this centre closes, where do its diners go, and what else can safely close at the same time?*

1. **Pick an anchor centre** by searching operating NEA centres or clicking one on the map. Up to 5 more centres can be added to "also close at the same time". Closure dates come from the NEA schedule, or the user enters them.
2. **Where displaced diners go:** a ripple map from the closed centre, with lines showing each neighbour's share and the extra diners it absorbs.
3. **Can these close together?** Each selected centre gets red, yellow or green, with the reasons, its share of displaced diners, and any blocks left with no centre in range. Below the map and verdict sit a one-line takeaway, then six headline numbers, each with its tag and source table.
4. **Demand dispersion and waste:** extra diners per day per centre and per stall, plus extra waste. Centres over +20% are flagged with suggested actions.
5. **Good candidates to schedule alongside:** nearby centres with no overlapping closure, showing years since their last major works.
6. **Assumptions and thresholds** panel.
7. **States:** builder-only reference (empty, loading, too many selected, and so on). It will be removed before the demo; don't treat it as a feature.

Reads: `silver.centres`, `silver.closures`, `silver.blocks`, `silver.dist_matrix`

### Page 2 · Seniors & access (for AACs): `source/Seniors.dc.html`

Question it answers: *if this centre closes, which seniors lose a walkable hawker centre, and who should check on them?*

- **Controls:** town and map view (access tiers or vulnerability multiplier). Pick a real NEA closure in that town, or click any centre. *Built (#31): the age-group / walking-pace control is removed; seniors walk at 1.0 m/s.*
- **Map:** HDB blocks coloured by walking tier, with a popup per subzone showing % aged 65+, seniors who lost a 15-min walk, and the multiplier. *Built (#31): tiers are at 15 min only (T1 a senior can walk it, T2 a typical walker only, T3 a brisk walker only, T4 no one can), shown before or after the closure.*
- **AACs to alert:** areas where 21% or more of residents are 65+ and seniors lost their walk, ranked by seniors affected × multiplier. *Changed (ASSUMPTIONS.md): "Areas to alert", one row per subzone sorted by seniors cut off, with 21%+ as a badge and no multiplied score (#32).*
- ~~**Slower walkers lose more:** the loss at each walking speed.~~ *Removed (#31). Replaced by the line "If the limit were 10 or 20 min…", from `gold.access_sensitivity`.*
- **Senior meal-support list:** subzone, blocks, estimated seniors, nearest open centre, suggested support (walking buddy or meal delivery), and nearest AAC. The AAC column is Phase 2 and waits on the MSF data. Download as CSV, or print a 1-page brief.

Planned Gold tables: `block_access (block, subzone, nearest_id, walk_m, second_walk_m)` and `subzone_seniors (subzone, pct_65p, multiplier)`

## Number labels

Every number on both pages has a line in the Assumptions panel, tagged **MEASURED**, **MODELLED** or **ASSUMPTION** with its source. Tags are shown only in the panel, not beside the numbers (#80).

The 21% super-aged threshold is MOH's definition (NPTD Population in Brief 2026), tagged ASSUMPTION. Our share aged 65+ counts SingStat HDB residents, while the official figure counts citizens.

## Assumptions in the draft (from the canvas notes)

| Assumption | Value in draft | Status |
|---|---|---|
| Walking pace by age | under 65: 1.3 · 65–74: 1.2 · 75–84: 1.0 · 85+: 0.8 m/s | needs a gait-speed source |
| Walk distance | straight line × 1.3 | preview only; replace with the walking distance matrix |
| Time thresholds | 10 / 15 / 20 min | |
| Seniors per block | subzone 65+ residents spread evenly over its blocks | |
| Vulnerability multiplier | subzone % aged 65+ ÷ HDB average | |
| AAC alert threshold | 21%+ aged 65+ | |
| Meal-support rule | open centre within 30 min at 1.0 m/s → walking buddy, otherwise meal delivery | editable |
| Diner shares | stalls ÷ distance² within 2.5 km | illustrative; the real version uses walking time from every block |
| Waste | scales with diners; kg per diner per day not sourced yet | needs a source |

## Open questions

- Should every estimated number get a small "Modelled" tag, with a single Assumptions panel covering walking paces, time thresholds and senior-count estimates? Page 1 already does this; Page 2 doesn't yet.
- Can someone follow the flow without being walked through it: pick a centre → see who's cut off → see what to do next? Right now the flow is split across the two pages.
- Anchor case: Kim Keat Palm's nearest neighbour is only about 460 m away, so in Toa Payoh the story may be overload rather than lost access. The notes say to pick the final anchor after the model runs.

## Changes

- 2026-10-24: Page 2 as built (#31). The age-group control and "Slower walkers lose more" panel are removed, tiers are at 15 min, every number is tagged, and the 21% source is added. See ASSUMPTIONS.md for the full list of changes from this draft.

- 2026-10-22: Page 1's takeaway and headline numbers moved from the top of the page to below the map. Page order is now controls → map and verdict → takeaway → headline numbers → demand and candidates → assumptions.
