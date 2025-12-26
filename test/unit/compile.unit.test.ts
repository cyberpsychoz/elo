import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compile } from '../../src/compile';

// Configure dayjs with required plugins
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);

const runtime = { dayjs };

describe('compile - basic lambdas', () => {
  it('compiles identity lambda', () => {
    const fn = compile<(x: number) => number>('fn(x ~> x)', { runtime });
    assert.strictEqual(fn(42), 42);
  });

  it('compiles arithmetic lambda', () => {
    const fn = compile<(x: number) => number>('fn(x ~> x * 2)', { runtime });
    assert.strictEqual(fn(21), 42);
  });

  it('compiles multi-parameter lambda', () => {
    const fn = compile<(x: number, y: number) => number>('fn(x, y ~> x + y)', { runtime });
    assert.strictEqual(fn(10, 32), 42);
  });

  it('compiles lambda with let binding', () => {
    const fn = compile<(x: number) => number>('fn(x ~> let doubled = x * 2 in doubled + 1)', { runtime });
    assert.strictEqual(fn(5), 11);
  });

  it('compiles lambda with conditional', () => {
    const fn = compile<(x: number) => number>('fn(x ~> if x > 0 then x else 0 - x)', { runtime });
    assert.strictEqual(fn(5), 5);
    assert.strictEqual(fn(-5), 5);
  });
});

describe('compile - temporal lambdas', () => {
  it('compiles lambda checking date in range', () => {
    const fn = compile<(x: unknown) => boolean>('fn(x ~> x in SOW ... EOW)', { runtime });
    // The function should be callable and return a boolean
    const result = fn(dayjs());
    assert.strictEqual(typeof result, 'boolean');
  });

  it('compiles lambda with date comparison', () => {
    const fn = compile<(x: unknown) => boolean>('fn(x ~> x >= TODAY)', { runtime });
    const tomorrow = dayjs().add(1, 'day');
    assert.strictEqual(fn(tomorrow), true);
    const yesterday = dayjs().subtract(1, 'day');
    assert.strictEqual(fn(yesterday), false);
  });
});

describe('compile - predicates', () => {
  it('compiles predicate', () => {
    const fn = compile<(x: number) => boolean>('fn(x | x > 10)', { runtime });
    assert.strictEqual(fn(5), false);
    assert.strictEqual(fn(15), true);
  });
});
