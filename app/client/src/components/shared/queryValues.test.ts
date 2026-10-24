import { expect, test } from 'vitest';
import { isMissing, toBoolean, toNumber, toNumberOrNull, toText } from './queryValues';

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

test('text passes strings through', () => {
  expect(toText('HC_1')).toBe('HC_1');
  expect(toText(12)).toBe('12');
});

test('null, "" and a missing column all count as missing', () => {
  expect([null, '', undefined, '0', 0, 'false'].map(isMissing)).toEqual([true, true, true, false, false, false]);
  expect(toNumberOrNull('')).toBeNull();
  expect(toNumberOrNull('0')).toBe(0);
});
