import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { BRAND_HEX, HIGHLIGHT_HEX, INK_HEX, rgb } from './mapColours';

const css = readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)?.[1]?.toLowerCase();

test("the map's colours are the theme's", () => {
  expect(HIGHLIGHT_HEX).toBe(token('highlight'));
  expect(BRAND_HEX).toBe(token('brand'));
  expect(INK_HEX).toBe(token('foreground'));
});

test('rgb turns hex into deck.gl colours', () => {
  expect(rgb('#a8380a')).toEqual([168, 56, 10, 255]);
  expect(rgb('#ffffff', 100)).toEqual([255, 255, 255, 100]);
});
