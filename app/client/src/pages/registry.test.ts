import { describe, expect, test } from 'vitest';
import { resolveLine } from '@shared/assumptions';
import { pages } from './registry';

describe('page registry', () => {
  test('paths and labels are unique', () => {
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.label)).size).toBe(pages.length);
  });

  test('there is at least one page, for "/" to land on', () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every((p) => p.path.startsWith('/') && p.path !== '/')).toBe(true);
  });

  test("every page's assumption lines resolve", () => {
    for (const page of pages) {
      for (const line of page.assumptions) expect(() => resolveLine(line)).not.toThrow();
    }
  });
});
