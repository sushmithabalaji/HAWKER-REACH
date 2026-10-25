import { describe, expect, test } from 'vitest';
import { addToPlan, removeFromPlan, withAnchor, type Plan } from './plan';

const plan = (anchorId: string | null, selectedIds: string[] = []): Plan => ({ anchorId, selectedIds });
const centre = (centre_id: string, is_interim = false) => ({ centre_id, is_interim });

describe('addToPlan', () => {
  test('adds a centre to close at the same time, in the order picked', () => {
    expect(addToPlan(plan('A', ['B']), centre('C'), 5)).toEqual({ plan: plan('A', ['B', 'C']), message: null });
  });

  test('a 6th centre is refused with the limit from assumptions', () => {
    const full = plan('A', ['B', 'C', 'D', 'E', 'F']);
    expect(addToPlan(full, centre('G'), 5)).toEqual({
      plan: full,
      message: 'Up to 5 at once. Remove one to add another.',
    });
  });

  test('the anchor, a centre already added and an interim centre are not added', () => {
    const p = plan('A', ['B']);
    expect(addToPlan(p, centre('A'), 5).plan).toBe(p);
    expect(addToPlan(p, centre('B'), 5).plan).toBe(p);
    expect(addToPlan(p, centre('I', true), 5).plan).toBe(p);
  });
});

describe('removeFromPlan', () => {
  test('removes an added centre and keeps the rest in order', () => {
    expect(removeFromPlan(plan('A', ['B', 'C', 'D']), 'C')).toEqual(plan('A', ['B', 'D']));
  });
});

describe('withAnchor', () => {
  test('a new anchor keeps the centres added, minus itself', () => {
    expect(withAnchor(plan('A', ['B', 'C']), 'B')).toEqual(plan('B', ['C']));
    expect(withAnchor(plan(null), 'A')).toEqual(plan('A'));
  });
});
