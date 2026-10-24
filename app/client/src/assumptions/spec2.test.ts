import { describe, expect, test } from 'vitest';
import { resolveLine } from '@shared/assumptions';
import { spec2Assumptions } from './spec2';

describe('spec 2 assumption lines', () => {
  test('every line resolves', () => {
    for (const line of spec2Assumptions) expect(() => resolveLine(line)).not.toThrow();
  });

  test('five tagged lines and one limitation', () => {
    const resolved = spec2Assumptions.map((line) => resolveLine(line));
    expect(resolved.filter((l) => l.tag !== null)).toHaveLength(5);
    expect(resolved.filter((l) => l.tag === null)).toHaveLength(1);
  });
});
