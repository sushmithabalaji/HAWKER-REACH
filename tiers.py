"""Walking-access tiers, shared by 04_gold_access and 05_gold_closures (ASSUMPTIONS.md, Access model).

At a time limit, a block's walk to its nearest open centre is:
  T1  a senior (slowest pace) can walk it
  T2  only a typical walker can
  T3  only a brisk walker can
  T4  no one can, or there is no centre within the 2 km cutoff
"""
import json

PACE_KEYS = ("senior", "typical", "brisk")  # slowest first


def load_paces(assumptions):
    return {k: assumptions[f"walk.pace.{k}"]["value"] for k in PACE_KEYS}


def load_assumptions(path="assumptions.json"):
    with open(path) as f:
        return json.load(f)


def reach_m(limit_min, paces):
    """Distance each pace covers in limit_min minutes, slowest first: (T1, T2, T3) upper bounds."""
    return tuple(paces[k] * limit_min * 60 for k in PACE_KEYS)


def tier_of(walk_m, limit_min, paces):
    if walk_m is None:
        return "T4"
    for name, bound in zip(("T1", "T2", "T3"), reach_m(limit_min, paces)):
        if walk_m <= bound:
            return name
    return "T4"


def tier_expr(col, limit_min, paces):
    """Spark Column version of tier_of, for the same thresholds."""
    from pyspark.sql import functions as F
    t1, t2, t3 = reach_m(limit_min, paces)
    return (F.when(col.isNull(), "T4").when(col <= t1, "T1").when(col <= t2, "T2")
            .when(col <= t3, "T3").otherwise("T4"))
