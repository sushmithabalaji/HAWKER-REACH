import { describe, expect, test } from 'vitest';
import { isTag } from './tags';

describe('isTag', () => {
  test('accepts the three tags and nothing else', () => {
    expect(['MEASURED', 'MODELLED', 'ASSUMPTION'].every(isTag)).toBe(true);
    expect(isTag('MODELED')).toBe(false);
    expect(isTag('measured')).toBe(false);
  });
});
