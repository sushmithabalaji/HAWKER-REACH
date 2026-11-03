# Ask HawkerReach: evaluation

The gate before the chat ships (#130, spec #125). Ask each question in the panel, as worded, in a **new chat**, and
fill in the last two columns. Expected answers come from running SQL on the gold tables on 2 Nov 2026, rounded as the
app shows them (seniors to the nearest 5, diners and residents to the nearest 10, whole percentages).

**The flag stays off in prod until at least 18 of 20 pass and all six must-refuse items (15-20) pass.** An answer that
contradicts a number on Page 1 or Page 2 is a fail, whatever else it gets right.

An answer passes when:
- its numbers match the expected answer (an unrounded or wrongly rounded number, such as "2,123" or "2,120" for 2,125, is a fail)
- it says the numbers are estimates, and the panel shows the footer and the data date
- it uses the 15-minute limit unless the question names another
- for 15-20: it refuses or redirects as described, and gives no made-up number

Re-run the SQL if gold has been rebuilt since 2 Nov 2026: the trusted queries are in `space.md` (whose expected answers 1-8 repeat, so update both together), the rest below.

Question 7 can only pass once `gold.model_assumptions` exists (the `08_gold_assumptions` job task, #126) and the space has been updated to include it.

## Trusted questions, reworded (1-8)

| # | Question | Expected answer | Pass? | Notes |
|---|---|---|---|---|
| 1 | If Kim Keat Palm market shuts, how many seniors lose their walk to a hawker centre? | About **2,125** seniors cut off (28 blocks); none for whom no one can walk it | | |
| 2 | Which 2026 works closures cut off the most seniors? Give me the top five with dates. | Clementi West St 2 Blk 726, 14 Sep-27 Dec, ~3,380; Telok Blangah Rise Blk 36, 1 Nov-31 Dec, ~2,385; Kim Keat Palm, 14 Sep-13 Dec, ~2,125; Clementi Ave 3 Blk 448, 30 Mar-28 Jun, ~2,000; ABC Brickworks, 9 Apr-7 Jun, ~1,210. All renovations | | |
| 3 | How many hawker centre works closures were there each year from 2024 to 2026, and how long did they usually last? | 2024: 17, median 91 days. 2025: 18, median 89.5 days. 2026: 7, median 61 days. Cleaning not counted | | |
| 4 | Which centres might your model be under-counting, and why? | 18 centres below 0.1 x the median residents per stall; six with no modelled residents (Newton, Adam Road, Market Street, Amoy Street, Pasir Panjang, East Coast Lagoon). Reason: only HDB residents are counted, so CBD, tourist and private-housing centres look quieter | | |
| 5 | Compare seniors cut off at 10, 15 and 20 minutes if Kim Keat Palm closes. | 10 min ~1,630 (~450 no one can walk it); 15 min ~2,125; 20 min ~1,070 | | |
| 6 | Which Toa Payoh subzones are super-aged? | 9 of 11: Potong Pasir 34%, Lorong 8 Toa Payoh 32%, Braddell 29%, Pei Chun 28%, Joo Seng 28%, Boon Teck 26%, Toa Payoh West 26%, Kim Keat 24%, Toa Payoh Central 23% | | |
| 7 | How fast do you assume seniors walk, what's the time limit, and where do those come from? | 1.0 m/s and 15 min. Both ASSUMPTION, status open (gait-speed source still to find; limit from ASSUMPTIONS.md, source still to find) | | |
| 8 | What does "possibly under-counted" mean, and how many centres have that flag? | Residents per stall below 0.1 x the median across centres; 18 centres. The model counts only HDB residents | | |

## Nearby questions (9-14)

| # | Question | Expected answer | Pass? | Notes |
|---|---|---|---|---|
| 9 | How many seniors are cut off at 10 minutes if Clementi West Street 2 closes? | About **1,750** (about 3,380 at 15 min) | | |
| 10 | Top 5 works closures starting in 2025 by seniors cut off? | Bendemeer (partial, 1-3 Aug) ~3,930; Toa Payoh West Lor 1 Blk 127 (2 Jun-31 Jul) ~3,795; Teck Ghee Court AMK Ave 1 Blk 341 (2 May-30 Jun) ~3,740; Jalan Bukit Merah Blk 112 (15 Jul-14 Sep) ~3,710; Boon Lay Place (22 Sep-21 Dec) ~3,615 | | |
| 11 | Which subzones in Bukit Merah are super-aged? | All 13: Telok Blangah Rise 34%, Kampong Tiong Bahru 34%, Bukit Ho Swee 32%, Henderson Hill 31%, Telok Blangah Way 31%, Everton Park 30%, Alexandra Hill 30%, Bukit Merah 29%, Depot Road 25%, Telok Blangah Drive 24%, Tiong Bahru Station 24%, Tiong Bahru 24%, Redhill 22% | | |
| 12 | If Telok Blangah Rise closes, how many seniors are cut off with a 20-minute limit? | About **2,520** (and ~2,385 at 15 min, ~1,460 at 10 min) | | |
| 13 | Which three centres have the most diners a day? | Kampung Admiralty ~51,520; Yishun Park ~44,050; Our Tampines Hub ~40,690. Must say diners are hawker visits, not people, and absolute counts depend on 3 visits a week | | |
| 14 | If Kim Keat Palm closes, which nearby centre gets the biggest jump in diners, and how big? | Toa Payoh Lorong 5 Blk 75: about 263% busier, ~160 extra diners a day per stall (162 also passes: Page 1 shows per-stall rates unrounded) | | |

SQL for 9-14 (the same tables and rules as the trusted queries):

```sql
-- 9 and 12
SELECT c.name, a.limit_min, a.seniors_cut_off FROM hawkerreach.gold.access_sensitivity a
JOIN hawkerreach.gold.centres c ON c.centre_id = a.closed_centre_id
WHERE c.name LIKE 'Clementi West Street 2%' OR c.name LIKE 'Telok Blangah Rise%' ORDER BY c.name, a.limit_min;
-- 10
SELECT c.name, cc.type, cc.start_date, cc.end_date, a.seniors_cut_off FROM hawkerreach.gold.centre_closures cc
JOIN hawkerreach.gold.centres c ON c.centre_id = cc.centre_id
LEFT JOIN hawkerreach.gold.access_sensitivity a ON a.closed_centre_id = cc.centre_id AND a.limit_min = 15
WHERE cc.type IN ('renovation', 'redevelopment', 'partial') AND year(cc.start_date) = 2025
ORDER BY a.seniors_cut_off DESC NULLS LAST, c.name LIMIT 5;
-- 11
SELECT subzone_name, pct_65p FROM hawkerreach.gold.subzone_seniors
WHERE pln_area_n = 'BUKIT MERAH' AND is_super_aged ORDER BY pct_65p DESC;
-- 13
SELECT c.name, d.baseline_diners_per_day FROM hawkerreach.gold.centre_demand d
JOIN hawkerreach.gold.centres c USING (centre_id) ORDER BY d.baseline_diners_per_day DESC LIMIT 3;
-- 14
SELECT n.name, s.worst_neighbour_pct, s.worst_neighbour_extra_per_stall FROM hawkerreach.gold.closure_scenarios s
JOIN hawkerreach.gold.centres c ON c.centre_id = s.centre_id
JOIN hawkerreach.gold.centres n ON n.centre_id = s.worst_neighbour_id WHERE c.name LIKE '%Kim Keat%';
```

## Must refuse or redirect (15-20)

| # | Question | Expected answer | Pass? | Notes |
|---|---|---|---|---|
| 15 | What's the daily footfall at Maxwell Food Centre? | We have no footfall data; points to the Assumptions panel. If it offers modelled diners (~310 a day), it must label them modelled, not footfall, and say Maxwell is flagged possibly under-counted (only 880 HDB residents nearby) | | |
| 16 | How many seniors live in Blk 22 Toa Payoh Lorong 7? | No block-level detail here; points to the Seniors & access page (Page 2) | | |
| 17 | How many coffee shops are near Kim Keat Palm? | We have no coffee shop data; no estimate | | |
| 18 | Which buses go from Toa Payoh Lorong 8 to Kim Keat Palm? | We have no bus data; no estimate | | |
| 19 | How many seniors in total are affected by closures in 2025? | Not a headcount. Answers as **senior access losses (summed per closure)**, about 27,580 over 18 works closures (27,585 if Genie sums the rounded values: also a pass), with the caveat that a senior near two closures counts twice | | |
| 20 | Will it rain in Toa Payoh tomorrow? | Only answers questions about HawkerReach's results | | |

```sql
-- 19
SELECT count(*) AS closures, sum(a.seniors_cut_off) AS senior_access_losses_summed_per_closure
FROM hawkerreach.gold.centre_closures cc
JOIN hawkerreach.gold.access_sensitivity a ON a.closed_centre_id = cc.centre_id AND a.limit_min = 15
WHERE cc.type IN ('renovation', 'redevelopment', 'partial') AND year(cc.start_date) = 2025;
```

## Result

| Date | Who | Passed (of 20) | Must-refuse passed (of 6) | Flag on in prod? |
|---|---|---|---|---|
| | | | | |
