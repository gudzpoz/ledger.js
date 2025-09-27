import { expect, test } from 'vitest';

import parseSexpr from '../emacs';

const tests = Object.entries({
  '1': 1,
  '1.': 1,
  '.1': 0.1,

  'nil': false,
  't': true,

  '"test"': 'test',
  '"test test"': 'test test',
  '"test\ntest"': 'test\ntest',
  '"test\\"\n\\"test"': 'test"\n"test',
});

test('parse atoms', () => {
  tests.forEach(
    ([from, to]) => expect(parseSexpr(from)).toBe(to),
  );
});

test('parse lists', () => {
  for (let i = 0; i < 100; i++) {
    const indices = Array.from({ length: 10 }).map(
      () => Math.floor(Math.random() * tests.length),
    );
    const from = `(${indices.map((i) => tests[i][0]).join(' ')})`;
    const to = indices.map((i) => tests[i][1]);
    expect(parseSexpr(from)).toStrictEqual(to);
  }
});
