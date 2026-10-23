"""python3 -m unittest discover tests  (from the repo root)"""
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tiers import load_assumptions, load_paces, reach_m, tier_of  # noqa: E402

PACES = {"senior": 1.0, "typical": 1.2, "brisk": 1.4}


class TierEdges(unittest.TestCase):
    def test_reach_at_15_min(self):
        self.assertEqual([round(r, 6) for r in reach_m(15, PACES)], [900, 1080, 1260])

    def test_edges_are_inclusive(self):
        cases = [(0, "T1"), (900, "T1"), (900.01, "T2"), (1080, "T2"), (1080.01, "T3"),
                 (1260, "T3"), (1260.01, "T4"), (2000, "T4")]
        for walk_m, tier in cases:
            with self.subTest(walk_m=walk_m):
                self.assertEqual(tier_of(walk_m, 15, PACES), tier)

    def test_no_centre_within_cutoff_is_t4(self):
        self.assertEqual(tier_of(None, 15, PACES), "T4")

    def test_limit_scales_the_bands(self):
        self.assertEqual(tier_of(900, 10, PACES), "T4")  # 10 min: 600 / 720 / 840 m
        self.assertEqual(tier_of(1100, 20, PACES), "T1")  # 20 min: 1,200 m for a senior


class FromAssumptionsJson(unittest.TestCase):
    def test_paces_come_from_assumptions_json(self):
        a = load_assumptions(ROOT / "assumptions.json")
        self.assertEqual(load_paces(a), PACES)
        self.assertEqual(a["walk.limit_min"]["value"], 15)
        self.assertEqual(a["walk.cutoff_m"]["value"], 2000)


if __name__ == "__main__":
    unittest.main()
