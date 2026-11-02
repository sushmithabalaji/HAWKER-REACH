"""The "Ask HawkerReach" Genie space (#127): the one source for its tables, instructions and trusted queries.

Writes docs/genie/space.json (the serialized space for `databricks genie create-space` / `update-space`)
and docs/genie/space.md (the same content for people). Edit this file, never the two outputs, then run
    python3 docs/genie/build_space.py
IDs are fixed so the outputs only change when the content does.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
G = "hawkerreach.gold"
WAREHOUSE_ID = "a8c31c5b693a27fd"
TITLE = "Ask HawkerReach"
SPACE_ID = "01f1d6d1a23a1742ae05a2cda8ed8ce6"  # created 2 Nov 2026 on WAREHOUSE_ID
DESCRIPTION = ("Questions about HawkerReach's hawker centre closure stress test: seniors cut off, closures, "
               "demand and super-aged subzones. Gold tables only. Every number is an estimate.")

# Model values come from assumptions.json at the repo root, the file the notebooks and the app read.
with open(os.path.join(HERE, "..", "..", "assumptions.json")) as f:
    A = {k: v["value"] for k, v in json.load(f).items()}
PACE = {k: A[f"walk.pace.{k}"] for k in ("senior", "typical", "brisk")}
LIMIT = A["walk.limit_min"]
REACH = {k: round(p * LIMIT * 60) for k, p in PACE.items()}  # metres each pace covers in LIMIT minutes
CUTOFF_KM = A["walk.cutoff_m"] / 1000
SENSITIVITY = sorted([LIMIT] + [int(x) for x in str(A["access.sensitivity_limits_min"]).split(",")])


def num(x):
    return f"{x:g}"


def rounded(col, step, alias=None):
    """Round in SQL as the app does (roughSeniors: step 5, roughDiners: step 10). Under 5 stays as is, so the
    app shows "<5" seniors or "<10" diners, as Page 1 and Page 2 do."""
    expr = f"CASE WHEN {col} < 5 THEN {col} ELSE ROUND({col} / {step}) * {step} END"
    return f"{expr} AS {alias or col.split('.')[-1]}" if alias != "" else expr


# Gold only (#125 rule 1). Not block_access, block_options, subzone_shapes, silver or bronze.
TABLES = {
    "centres": "operating hawker centre: names, location, stalls, interim flag",
    "centre_closures": "NEA closure event: dates and type (renovation, redevelopment, partial, cleaning)",
    "closure_scenarios": "closable centre closing alone: residents and seniors displaced, seniors cut off (seniors_lost_walk), worst neighbour",
    "access_sensitivity": "closable centre x limit (10/15/20 min): seniors cut off, no one can walk it, already without access, now worse",
    "centre_demand": "centre: baseline diners, residents per stall, possibly under-counted flag",
    "subzone_seniors": "subzone: HDB residents, HDB seniors, 65+ share, multiplier, super-aged flag",
    "model_assumptions": "assumption: key, name, value, unit, tag, status, source, built_at",
}

# Names people type: let Genie match "Kim Keat" to the full centre name, and planning areas in any case.
ENTITY_COLUMNS = {
    "centres": ["name", "pln_area_n"],
    "centre_closures": ["type"],
    "subzone_seniors": ["pln_area_n", "subzone_name"],
    "model_assumptions": ["key"],
}

limits = ", ".join(str(x) for x in SENSITIVITY if x != LIMIT)
INSTRUCTIONS = [
    "HawkerReach is a closure stress test for NEA hawker centres in Singapore. It is used by NEA planners and Active Ageing Centres (AACs) to see who loses a walkable hawker centre when a centre closes.",
    "",
    f"Walking tiers, by the walk to the nearest open centre (walking-time limit {LIMIT} min unless the user asks for {limits.replace(', ', ' or ')}): "
    f"T1 a senior walking {PACE['senior']:.1f} m/s can make it (at {LIMIT} min, up to {REACH['senior']:,} m), "
    f"T2 only a typical walker at {PACE['typical']:.1f} m/s (up to {REACH['typical']:,} m), "
    f"T3 only a brisk walker at {PACE['brisk']:.1f} m/s (up to {REACH['brisk']:,} m), "
    f"T4 no one can, or there is no centre within {num(CUTOFF_KM)} km.",
    f"\"Seniors cut off\" = T1 before the closure and T2-T4 after it: access_sensitivity.seniors_cut_off, which equals closure_scenarios.seniors_lost_walk at {LIMIT} min. \"No one can walk it\" = T1 before, T4 after: access_sensitivity.seniors_no_one_can_walk. Always filter access_sensitivity to one limit_min, {LIMIT} by default.",
    f"Each closure scenario is one centre closing alone. Its residents move, all or nothing, to their second-nearest centre within {num(CUTOFF_KM)} km.",
    "",
    f"Diners per day = residents whose nearest centre it is x {num(A['diners.eating_share'])} (NEA Perception Survey of Hawker Centre Patrons 2018) x {num(A['diners.visits_per_week.base'])} visits a week / 7. "
    f"Diners means hawker visits a day, not unique people. Rankings and % busier hold across {num(A['diners.visits_per_week.min'])}-{num(A['diners.visits_per_week.max'])} visits a week, absolute counts do not: say so when giving a diner count.",
    "",
    "Works closures are centre_closures.type IN ('renovation', 'redevelopment', 'partial'). Cleaning is routine and is never a closure. A closure belongs to the year of its start_date. In the app's \"can these close together?\" overlap check, partial closures are not counted: mention this if asked about overlapping closures.",
    "",
    "Never add seniors across closures and call it a headcount: a senior near two closures counts twice. If asked for a total across closures, sum per closure and label it \"senior access losses (summed per closure)\", with that caveat.",
    "",
    f"Rounding: do it in the SQL, never in your head, and quote the rounded values exactly. Seniors: {rounded('x', 5, '')}. Diners and residents: {rounded('x', 10, '')}. Percentages: ROUND(x). Keep the column name as the alias. "
    "In sentences: seniors to the nearest 5, and seniors under 5 are \"fewer than 5\". Diners and residents to the nearest 10, and under 5 are \"fewer than 10\". Percentages to a whole percent. "
    "pct_65p is a fraction from 0 to 1: select ROUND(pct_65p * 100) AS pct_65p and say it as a whole percent (0.249 is 25%). worst_neighbour_pct is already a percent. Never show decimals for people.",
    "Every senior, resident and diner number is an estimate from HawkerReach's model: say so.",
    "Keep the gold column names in results (seniors_cut_off, hdb_seniors, baseline_diners_per_day, pct_65p) rather than renaming them.",
    "",
    f"Super-aged = 65+ share >= {num(A['access.super_aged_share'] * 100)}% (MOH definition): subzone_seniors.is_super_aged. Our shares are SingStat HDB residents (citizens and PRs), not citizens alone, so they differ slightly from official figures.",
    "Planning area and subzone names are stored in capitals (TOA PAYOH). Centre names are long NEA names such as \"Toa Payoh Lorong 7 Blk 22 (Kim Keat Palm Market and Food Centre)\": match them with LIKE on a distinctive part.",
    "For what the model assumes (walking pace, time limit, diners, thresholds), use model_assumptions and give value, unit, source and status. status 'open' means a source is still needed: say so.",
    "",
    "We have no data on footfall, coffee shops, buses, AAC locations, or anything at block level. If a question needs it, say we don't have that data and point to the Assumptions panel, or to the Seniors & access page for block-level detail. Never estimate it. Questions unrelated to hawker centres: say this assistant only answers questions about HawkerReach's results.",
]

# Trusted questions (#125, Phase 1). answer: from running the SQL on 2 Nov 2026, rounded as the app shows it.
# Query 7's answer is from assumptions.json until gold.model_assumptions exists (#126); re-check it after the job.
QUERIES = [
    {
        "question": "How many seniors are cut off if Kim Keat Palm closes?",
        "sql": f"""SELECT c.name, {rounded('a.seniors_cut_off', 5)}, {rounded('a.seniors_no_one_can_walk', 5)}, a.blocks_cut_off
FROM {G}.access_sensitivity a
JOIN {G}.centres c ON c.centre_id = a.closed_centre_id
WHERE lower(c.name) LIKE '%kim keat%' AND a.limit_min = 15""",
        "answer": "About 2,125 seniors cut off (28 blocks) at 15 min; none for whom no one can walk it.",
    },
    {
        "question": "What are the top 5 works closures starting in 2026 by seniors cut off?",
        "sql": f"""SELECT c.name, cc.type, cc.start_date, cc.end_date, {rounded('a.seniors_cut_off', 5)}
FROM {G}.centre_closures cc
JOIN {G}.centres c ON c.centre_id = cc.centre_id
LEFT JOIN {G}.access_sensitivity a ON a.closed_centre_id = cc.centre_id AND a.limit_min = 15
WHERE cc.type IN ('renovation', 'redevelopment', 'partial') AND year(cc.start_date) = 2026
ORDER BY a.seniors_cut_off DESC NULLS LAST, c.name, cc.start_date
LIMIT 5""",
        "answer": ("Clementi West St 2 Blk 726 (14 Sep-27 Dec) about 3,380; Telok Blangah Rise Blk 36 (1 Nov-31 Dec) about 2,385; "
                   "Kim Keat Palm (14 Sep-13 Dec) about 2,125; Clementi Ave 3 Blk 448 (30 Mar-28 Jun) about 2,000; "
                   "ABC Brickworks (9 Apr-7 Jun) about 1,210. All renovations."),
    },
    {
        "question": "How many works closures were there per year from 2024 to 2026, and how long did they last?",
        "sql": f"""SELECT year(start_date) AS year, count(*) AS works_closures,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_days) AS median_days
FROM {G}.centre_closures
WHERE type IN ('renovation', 'redevelopment', 'partial') AND year(start_date) BETWEEN 2024 AND 2026
GROUP BY 1
ORDER BY 1""",
        "answer": "2024: 17 closures, median 91 days. 2025: 18, median 89.5 days. 2026: 7, median 61 days.",
    },
    {
        "question": "Which centres are flagged as possibly under-counted, and why?",
        "sql": f"""SELECT c.name, c.cooked_food_stalls, {rounded('d.baseline_residents', 10)}, ROUND(d.residents_per_stall) AS residents_per_stall
FROM {G}.centre_demand d
JOIN {G}.centres c ON c.centre_id = d.centre_id
WHERE d.possibly_undercounted
ORDER BY d.residents_per_stall""",
        "answer": (f"18 centres, with residents per stall below {num(A['undercount_factor'])} x the median. Six have no modelled residents at all "
                   "(Newton, Adam Road, Market Street, Amoy Street, Pasir Panjang, East Coast Lagoon); others include "
                   "Alexandra Village, Changi Village, Chinatown Complex, Maxwell and Hong Lim. The model counts only HDB "
                   "residents, so centres serving offices, tourists or private housing look quieter than they are."),
    },
    {
        "question": "How many seniors are cut off at 10, 15 and 20 minutes if Kim Keat Palm closes?",
        "sql": f"""SELECT a.limit_min, {rounded('a.seniors_cut_off', 5)}, {rounded('a.seniors_no_one_can_walk', 5)}
FROM {G}.access_sensitivity a
JOIN {G}.centres c ON c.centre_id = a.closed_centre_id
WHERE lower(c.name) LIKE '%kim keat%'
ORDER BY a.limit_min""",
        "answer": "10 min: about 1,630 cut off (about 450 no one can walk it). 15 min: about 2,125 (none). 20 min: about 1,070 (none).",
    },
    {
        "question": "Which subzones in Toa Payoh are super-aged?",
        "sql": f"""SELECT subzone_name, {rounded('hdb_residents', 10)}, {rounded('hdb_seniors', 5)}, ROUND(pct_65p * 100) AS pct_65p
FROM {G}.subzone_seniors
WHERE pln_area_n = 'TOA PAYOH' AND is_super_aged
ORDER BY pct_65p DESC, subzone_name""",
        "answer": ("9 of 11: Potong Pasir 34%, Lorong 8 Toa Payoh 32%, Braddell 29%, Pei Chun 28%, Joo Seng 28%, "
                   "Boon Teck 26%, Toa Payoh West 26%, Kim Keat 24%, Toa Payoh Central 23%."),
    },
    {
        "question": "What walking pace and time limit does the model assume for seniors, and where are they from?",
        "sql": f"""SELECT key, name, value, unit, tag, status, source
FROM {G}.model_assumptions
WHERE key IN ('walk.pace.senior', 'walk.limit_min')""",
        "answer": ("Seniors walk 1.0 m/s and the limit is 15 min. Both are ASSUMPTIONs with status open: "
                   "the pace is from 04_gold_access with a gait-speed source still to find, the limit from ASSUMPTIONS.md (Spec 1), source still to find."),
    },
]

# The app's suggested chips (#129) ask these; Genie shows them as its own sample questions too.
SAMPLE_QUESTIONS = [
    QUERIES[0]["question"],
    QUERIES[1]["question"],
    QUERIES[2]["question"],
    "What walking pace do you assume for seniors?",
]


def fixed_id(prefix, i):
    return f"{prefix}{i:031x}"


def serialized_space():
    tables = []
    for name in sorted(TABLES):
        t = {"identifier": f"{G}.{name}"}
        cols = ENTITY_COLUMNS.get(name)
        if cols:
            t["column_configs"] = [{"column_name": c, "enable_entity_matching": True, "enable_format_assistance": True}
                                   for c in sorted(cols)]
        tables.append(t)
    return {
        "version": 2,
        "config": {"sample_questions": [{"id": fixed_id("1", i), "question": [q]} for i, q in enumerate(SAMPLE_QUESTIONS)]},
        "data_sources": {"tables": tables},
        "instructions": {
            "text_instructions": [{"id": fixed_id("3", 0), "content": [line + "\n" for line in INSTRUCTIONS]}],
            "example_question_sqls": [{"id": fixed_id("2", i), "question": [q["question"]], "sql": [q["sql"]]}
                                      for i, q in enumerate(QUERIES)],
        },
    }


def markdown():
    out = [f"# {TITLE}: Genie space", "",
           "Generated by `docs/genie/build_space.py`; edit that file, not this one. Spec: #125, ticket #127.", "",
           f"**Space ID:** `{SPACE_ID}`  ", f"**Description:** {DESCRIPTION}", "", "## Tables (gold only)", "", "| Table | One row per |", "|---|---|"]
    out += [f"| `{G}.{t}` | {d} |" for t, d in TABLES.items()]
    out += ["", "Not allowed: `block_access`, `block_options`, `subzone_shapes`, any silver or bronze table. "
            "Column meanings come from Unity Catalog comments (`Sql/02_gold_comments.sql`).", "",
            "## Instructions", ""]
    out += INSTRUCTIONS
    out += ["", "## Sample questions", ""] + [f"- {q}" for q in SAMPLE_QUESTIONS]
    out += ["", "## Trusted queries", "", "Expected answers come from running the SQL on 2 Nov 2026, rounded as the app shows them."]
    for i, q in enumerate(QUERIES, 1):
        out += ["", f"### {i}. {q['question']}", "", "```sql", q["sql"], "```", "", f"**Expected:** {q['answer']}"]
    out += ["", "## Create or update the space", "", "```bash",
            "python3 docs/genie/build_space.py",
            "# first time:",
            f"databricks genie create-space {WAREHOUSE_ID} \"$(cat docs/genie/space.json)\" \\",
            f"  --title \"{TITLE}\" --description \"{DESCRIPTION}\"",
            "# after a change:",
            f"databricks genie update-space {SPACE_ID} --serialized-space \"$(cat docs/genie/space.json)\"",
            "```", ""]
    return "\n".join(out)


if __name__ == "__main__":
    with open(os.path.join(HERE, "space.json"), "w") as f:
        json.dump(serialized_space(), f, indent=1)
        f.write("\n")
    with open(os.path.join(HERE, "space.md"), "w") as f:
        f.write(markdown())
    print("wrote space.json and space.md")
