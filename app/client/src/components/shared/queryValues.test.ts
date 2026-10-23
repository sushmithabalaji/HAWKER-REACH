import { expect, test } from 'vitest';
import { toBoolean, toNumber } from './queryValues';

test('numbers parse from strings and pass through when already numbers', () => {
  expect(toNumber('103.81')).toBe(103.81);
  expect(toNumber(1.32)).toBe(1.32);
});

test("booleans: only true or 'true' are true", () => {
  expect(toBoolean('true')).toBe(true);
  expect(toBoolean(true)).toBe(true);
  expect(toBoolean('false')).toBe(false);
  expect(toBoolean(null)).toBe(false);
});
