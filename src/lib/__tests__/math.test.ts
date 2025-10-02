import { expect, test } from 'vitest';

import { positiveAngleDelta, lesserAngleDelta } from '../math';

test('random angle deltas', () => {
  for (let i = 0; i < 10000; i++) {
    const a1 = Math.random() * Math.PI * 2;
    const a2 = Math.random() * Math.PI * 2;
    const delta = lesserAngleDelta(a1, a2);
    expect(delta)
      .greaterThanOrEqual(-Math.PI)
      .lessThanOrEqual(Math.PI);
    expect(Math.abs(Math.sin(delta))).approximately(Math.abs(Math.sin(a1 - a2)), 1e-8);
    expect(Math.abs(Math.cos(delta))).approximately(Math.abs(Math.cos(a1 - a2)), 1e-8);
    const directed = positiveAngleDelta(a1, a2);
    if (a1 > a2) {
      expect(directed).approximately(a1 - a2, 1e-8);
    } else {
      expect(directed).approximately(a1 - a2 + 2 * Math.PI, 1e-8);
    }
  }
});
