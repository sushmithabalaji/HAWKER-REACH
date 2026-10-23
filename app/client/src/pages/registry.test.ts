import { describe, expect, test } from 'vitest';
import { resolveLine } from '@shared/assumptions';
import { pages } from './registry';

describe('page registry', () => {
  test('paths and labels are unique', () => {
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.label)).size).toBe(pages.length);
  });

  test("every page's assumption lines resolve", () => {
    for (const page of pages) {
      for (const line of page.assumptions) expect(() => resolveLine(line)).not.toThrow();
    }
  });
});
