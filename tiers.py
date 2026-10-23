"""Walking-access tiers for 04_gold_access; 05_gold_closures should import these rather than compute its own (ASSUMPTIONS.md).

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


def bands(limit_min, paces):
    """(tier, upper bound in metres) for T1-T3; anything beyond, or no centre, is T4."""
    return list(zip(("T1", "T2", "T3"), reach_m(limit_min, paces)))


def tier_of(walk_m, limit_min, paces):
    if walk_m is None:
        return "T4"
    return next((name for name, bound in bands(limit_min, paces) if walk_m <= bound), "T4")


def tier_expr(col, limit_min, paces):
    """Spark Column version of tier_of, built from the same bands."""
    from pyspark.sql import functions as F
    expr = F.when(col.isNull(), "T4")
    for name, bound in bands(limit_min, paces):
        expr = expr.when(col <= bound, name)
    return expr.otherwise("T4")
