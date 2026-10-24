import { describe, expect, test } from 'vitest';
import { rippleFrame, SETTLED, START } from './ripple';

describe('rippleFrame', () => {
  test('rings, then lines, then receivers, one step each, then settles', () => {
    expect(rippleFrame(0, 600)).toEqual(START);
    expect(rippleFrame(300, 600)).toEqual({ rings: 0.5, lines: 0, receivers: 0, done: false });
    expect(rippleFrame(900, 600)).toEqual({ rings: 1, lines: 0.5, receivers: 0, done: false });
    expect(rippleFrame(1500, 600)).toEqual({ rings: 1, lines: 1, receivers: 0.5, done: false });
    expect(rippleFrame(1800, 600)).toEqual(SETTLED);
    expect(rippleFrame(5000, 600)).toEqual(SETTLED);
  });
});
