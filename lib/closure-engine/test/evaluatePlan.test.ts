import { describe, expect, it } from "vitest";
import { evaluatePlan } from "../src";
import { assumptions, block, centre, town, withValues } from "./sample";

describe("evaluatePlan: single closure", () => {
  it("moves each block whose nearest centre closes, whole, to its next-nearest centre", () => {
    const data = town(
      [centre("HC_A"), centre("HC_B"), centre("HC_C")],
      [
        block("B1", [["HC_A", 300], ["HC_B", 700]], { diners: 40 }),
        block("B2", [["HC_A", 400], ["HC_C", 600], ["HC_B", 800]], { diners: 25 }),
        block("B3", [["HC_B", 200], ["HC_A", 500]], { diners: 100 }),
      ],
    );

    const result = evaluatePlan(data, "HC_A", [], assumptions);

    expect(result.displacedDinersPerDay).toBe(65);
    expect(
      result.receivers.map((r) => [r.centreId, r.extraDinersPerDay]),
    ).toEqual([
      ["HC_B", 40],
      ["HC_C", 25],
    ]);
  });

  it("breaks a tie on walking distance by the lower centre_id", () => {
    const data = town(
      [centre("HC_A"), centre("HC_B"), centre("HC_C")],
      [block("B1", [["HC_A", 300], ["HC_C", 650], ["HC_B", 650]], { diners: 40 })],
    );

    const result = evaluatePlan(data, "HC_A", [], assumptions);

    expect(result.receivers.map((r) => r.centreId)).toEqual(["HC_B"]);
  });
});

describe("evaluatePlan: joint closure", () => {
  it("evaluates the anchor and selected centres as one plan, skipping every closed centre", () => {
    const data = town(
      [centre("HC_A"), centre("HC_B"), centre("HC_C"), centre("HC_D")],
      [
        block("B1", [["HC_A", 300], ["HC_B", 500], ["HC_D", 900]], { diners: 30 }),
        block("B2", [["HC_B", 200], ["HC_D", 700]], { diners: 50 }),
        block("B3", [["HC_C", 250], ["HC_D", 600]], { diners: 20 }),
        block("B4", [["HC_D", 100], ["HC_A", 400]], { diners: 70 }),
      ],
    );

    const result = evaluatePlan(data, "HC_A", ["HC_B", "HC_C"], assumptions);

    expect(result.displacedDinersPerDay).toBe(100);
    expect(
      result.receivers.map((r) => [r.centreId, r.extraDinersPerDay]),
    ).toEqual([["HC_D", 100]]);
  });
});

describe("evaluatePlan: unserved", () => {
  it("counts only residents who lose every centre within 2 km because of the plan", () => {
    const data = town(
      [centre("HC_A"), centre("HC_B")],
      [
        block("LOSES_ALL", [["HC_A", 800]], { residents: 250, diners: 90 }),
        block("ALREADY_NONE", [], { residents: 400, diners: 140 }),
        block("MOVES", [["HC_A", 300], ["HC_B", 900]], { residents: 100, diners: 36 }),
      ],
    );

    const result = evaluatePlan(data, "HC_A", [], assumptions);

    expect(result.unserved).toEqual({ blocks: 1, residents: 250, dinersPerDay: 90 });
    expect(result.displacedDinersPerDay).toBe(36);
  });

  it("reads the walking cutoff from assumptions", () => {
    const data = town(
      [centre("HC_A"), centre("HC_B")],
      [block("B1", [["HC_A", 300], ["HC_B", 900]], { residents: 100, diners: 36 })],
    );

    const result = evaluatePlan(data, "HC_A", [], withValues({ "walk.cutoff_m": 800 }));

    expect(result.unserved.residents).toBe(100);
    expect(result.receivers).toEqual([]);
  });
});

describe("evaluatePlan: load at receiving centres", () => {
  it("gives extra diners per stall and % over baseline, or 'new' when the baseline is 0", () => {
    const data = town(
      [
        centre("HC_A"),
        centre("HC_B", { stalls: 20, baseline: 800 }),
        centre("HC_NEW", { stalls: 4, baseline: 0 }),
      ],
      [
        block("B1", [["HC_A", 300], ["HC_B", 600]], { diners: 100 }),
        block("B2", [["HC_A", 350], ["HC_NEW", 500]], { diners: 36 }),
      ],
    );

    const result = evaluatePlan(data, "HC_A", [], assumptions);

    expect(
      result.receivers.map((r) => [r.centreId, r.extraDinersPerStall, r.pctOverBaseline]),
    ).toEqual([
      ["HC_B", 5, 12.5],
      ["HC_NEW", 9, "new"],
    ]);
  });
});

describe("evaluatePlan: interim centres", () => {
  const data = town(
    [centre("HC_A"), centre("HC_B"), centre("HC_INT", { interim: true })],
    [
      block("B1", [["HC_A", 300], ["HC_INT", 500], ["HC_B", 700]], { diners: 40 }),
      block("B2", [["HC_INT", 200], ["HC_B", 600]], { diners: 30 }),
    ],
  );

  it("counts an interim centre as a place displaced diners can go", () => {
    const result = evaluatePlan(data, "HC_A", [], assumptions);

    expect(result.receivers.map((r) => [r.centreId, r.extraDinersPerDay])).toEqual([
      ["HC_INT", 40],
    ]);
  });

  it("rejects an interim centre as the anchor", () => {
    expect(() => evaluatePlan(data, "HC_INT", [], assumptions)).toThrow(
      expect.objectContaining({ code: "interim-centre" }),
    );
  });

  it("rejects an interim centre as a selected centre", () => {
    expect(() => evaluatePlan(data, "HC_A", ["HC_INT"], assumptions)).toThrow(
      expect.objectContaining({ code: "interim-centre" }),
    );
  });
});

describe("evaluatePlan: plan size", () => {
  const ids = ["HC_A", "HC_B", "HC_C", "HC_D", "HC_E", "HC_F", "HC_G", "HC_H"];
  const data = town(
    ids.map((id) => centre(id)),
    [block("B1", [["HC_A", 300], ["HC_H", 900]])],
  );

  it("accepts 5 selected centres and rejects a 6th with the planner's message", () => {
    expect(() => evaluatePlan(data, "HC_A", ids.slice(1, 6), assumptions)).not.toThrow();
    expect(() => evaluatePlan(data, "HC_A", ids.slice(1, 7), assumptions)).toThrow(
      expect.objectContaining({
        code: "too-many-centres",
        message: "Up to 5 at once. Remove one to add another.",
      }),
    );
  });

  it("rejects a centre that isn't in gold.centres", () => {
    expect(() => evaluatePlan(data, "HC_NOPE", [], assumptions)).toThrow(
      expect.objectContaining({ code: "unknown-centre" }),
    );
    expect(() => evaluatePlan(data, "HC_A", ["HC_NOPE"], assumptions)).toThrow(
      expect.objectContaining({ code: "unknown-centre" }),
    );
  });

  it("rejects the anchor or a centre selected twice", () => {
    expect(() => evaluatePlan(data, "HC_A", ["HC_A"], assumptions)).toThrow(
      expect.objectContaining({ code: "duplicate-centre" }),
    );
    expect(() => evaluatePlan(data, "HC_A", ["HC_B", "HC_B"], assumptions)).toThrow(
      expect.objectContaining({ code: "duplicate-centre" }),
    );
  });

  it("reads the limit from assumptions", () => {
    const limitOf2 = withValues({ "plan.max_extra_centres": 2 });

    expect(() => evaluatePlan(data, "HC_A", ids.slice(1, 4), limitOf2)).toThrow(
      expect.objectContaining({ message: "Up to 2 at once. Remove one to add another." }),
    );
  });
});

describe("evaluatePlan: headline tiles", () => {
  const data = town(
    [
      centre("HC_A"),
      centre("HC_BIG", { stalls: 50, baseline: 4000, name: "Big Market" }),
      centre("HC_SMALL", { stalls: 8, baseline: 400, name: "Small Corner" }),
    ],
    [
      block("B1", [["HC_A", 300], ["HC_BIG", 950]], { diners: 734, seniors: 40 }),
      block("B2", [["HC_A", 450], ["HC_SMALL", 700]], { diners: 500, seniors: 30 }),
      block("B3", [["HC_A", 600]], { diners: 46, seniors: 25 }),
    ],
  );

  it("returns displaced diners to the nearest 10, plus newly unserved diners", () => {
    const { tiles } = evaluatePlan(data, "HC_A", [], assumptions);

    expect(tiles.displaced).toMatchObject({ dinersPerDay: 1230, unservedDinersPerDay: 50, tag: "MODELLED" });
    expect(tiles.displaced.source).toContain("gold.block_options");
  });

  it("returns the biggest load increase by extra diners per stall, with its %", () => {
    const { tiles } = evaluatePlan(data, "HC_A", [], assumptions);

    // Big Market takes more diners (734) but Small Corner takes more per stall (62.5 vs 14.68).
    expect(tiles.biggestLoad.centre).toEqual({
      centreId: "HC_SMALL",
      name: "Small Corner",
      extraDinersPerStall: 62.5,
      pctOverBaseline: 125,
    });
    expect(tiles.biggestLoad.tag).toBe("MODELLED");
  });

  it("returns blocks losing a centre within the limit at senior, typical and brisk pace", () => {
    const { tiles } = evaluatePlan(data, "HC_A", [], assumptions);

    expect(tiles.accessLoss).toMatchObject({ limitMin: 15, senior: 2, typical: 1, brisk: 1, tag: "MODELLED" });
  });

  it("breaks a tie on extra diners per stall by the lower centre_id", () => {
    const tied = town(
      [centre("HC_A"), centre("HC_Z", { stalls: 10 }), centre("HC_M", { stalls: 10 })],
      [
        block("B1", [["HC_A", 300], ["HC_Z", 600]], { diners: 50 }),
        block("B2", [["HC_A", 300], ["HC_M", 600]], { diners: 50 }),
      ],
    );

    const result = evaluatePlan(tied, "HC_A", [], assumptions);

    expect(result.tiles.biggestLoad.centre?.centreId).toBe("HC_M");
    expect(result.receivers.map((r) => r.centreId)).toEqual(["HC_M", "HC_Z"]);
  });

  it("has no biggest load when nobody moves", () => {
    const { tiles } = evaluatePlan(data, "HC_SMALL", [], assumptions);

    expect(tiles.biggestLoad.centre).toBeNull();
  });
});

describe("evaluatePlan: takeaway parts", () => {
  const data = town(
    [
      centre("HC_A", { name: "Anchor Market" }),
      centre("HC_B", { name: "Beta Centre" }),
      centre("HC_C", { name: "Gamma Food Court" }),
      centre("HC_D", { name: "Delta Market" }),
    ],
    [
      block("B1", [["HC_A", 300], ["HC_C", 700]], { diners: 300 }),
      block("B2", [["HC_B", 250], ["HC_D", 800]], { diners: 100 }),
      block("B3", [["HC_A", 400]], { diners: 20, residents: 60, seniors: 9 }),
    ],
  );

  it("names the closed centres anchor first, the size of the move, and where most diners go", () => {
    const { takeaway } = evaluatePlan(data, "HC_A", ["HC_B"], assumptions);

    expect(takeaway).toEqual({
      closedCentreNames: ["Anchor Market", "Beta Centre"],
      displacedDinersPerDay: 400,
      receiverCount: 2,
      topReceiver: { name: "Gamma Food Court", shareOfDisplaced: 0.75 },
      unservedResidents: 60,
      seniorBlocksLosingAccess: 1,
    });
  });

  it("has no top receiver when a closure displaces no modelled diners", () => {
    const { takeaway } = evaluatePlan(data, "HC_D", [], assumptions);

    expect(takeaway.displacedDinersPerDay).toBe(0);
    expect(takeaway.topReceiver).toBeNull();
  });
});

describe("evaluatePlan: access loss", () => {
  // 15 min at 1.0 / 1.2 / 1.4 m/s = 900 / 1,080 / 1,260 m.
  const data = town(
    [centre("HC_A"), centre("HC_B")],
    [
      block("SENIOR_ONLY", [["HC_A", 850], ["HC_B", 950]], { seniors: 11 }),
      block("ON_TYPICAL_LIMIT", [["HC_A", 400], ["HC_B", 1080]], { seniors: 7 }),
      block("TYPICAL", [["HC_A", 1000], ["HC_B", 1100]], { seniors: 5 }),
      block("BRISK", [["HC_A", 1200], ["HC_B", 1300]], { seniors: 3 }),
      block("UNSERVED", [["HC_A", 500]], { seniors: 13 }),
      block("FAR_ALREADY", [["HC_A", 1500], ["HC_B", 1900]], { seniors: 17 }),
      block("UNTOUCHED", [["HC_B", 300]], { seniors: 19 }),
    ],
  );

  it("counts blocks that had a centre within 15 min at each pace before the plan and don't after", () => {
    const { accessLoss } = evaluatePlan(data, "HC_A", [], assumptions);

    expect(accessLoss.senior.blockIds.sort()).toEqual(["ON_TYPICAL_LIMIT", "SENIOR_ONLY", "UNSERVED"]);
    expect(accessLoss.typical.blockIds.sort()).toEqual(["TYPICAL", "UNSERVED"]);
    expect(accessLoss.brisk.blockIds.sort()).toEqual(["BRISK", "UNSERVED"]);
    expect(accessLoss.senior.blocks).toBe(3);
    expect(accessLoss.senior.seniors).toBe(31);
  });

  it("reads paces and the time limit from assumptions", () => {
    const { accessLoss } = evaluatePlan(
      data,
      "HC_A",
      [],
      withValues({ "walk.limit_min": 20, "walk.pace.senior": 0.8 }),
    );

    // 20 min at 0.8 m/s = 960 m.
    expect(accessLoss.senior.blockIds.sort()).toEqual(["ON_TYPICAL_LIMIT", "UNSERVED"]);
  });
});
