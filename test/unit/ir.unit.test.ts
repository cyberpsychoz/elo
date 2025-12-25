import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  irInt,
  irFloat,
  irBool,
  irString,
  irDate,
  irDateTime,
  irDuration,
  irVariable,
  irCall,
  irLet,
  irMemberAccess,
  inferType,
} from '../../src/ir';
import { Types } from '../../src/types';

describe('IR literal factories', () => {
  it('irInt creates integer literal', () => {
    const node = irInt(42);
    assert.deepStrictEqual(node, { type: 'int_literal', value: 42 });
  });

  it('irInt handles zero', () => {
    const node = irInt(0);
    assert.deepStrictEqual(node, { type: 'int_literal', value: 0 });
  });

  it('irInt handles negative numbers', () => {
    const node = irInt(-5);
    assert.deepStrictEqual(node, { type: 'int_literal', value: -5 });
  });

  it('irFloat creates float literal', () => {
    const node = irFloat(3.14);
    assert.deepStrictEqual(node, { type: 'float_literal', value: 3.14 });
  });

  it('irFloat handles zero', () => {
    const node = irFloat(0.0);
    assert.deepStrictEqual(node, { type: 'float_literal', value: 0.0 });
  });

  it('irBool creates true literal', () => {
    const node = irBool(true);
    assert.deepStrictEqual(node, { type: 'bool_literal', value: true });
  });

  it('irBool creates false literal', () => {
    const node = irBool(false);
    assert.deepStrictEqual(node, { type: 'bool_literal', value: false });
  });

  it('irString creates string literal', () => {
    const node = irString('hello');
    assert.deepStrictEqual(node, { type: 'string_literal', value: 'hello' });
  });

  it('irString handles empty string', () => {
    const node = irString('');
    assert.deepStrictEqual(node, { type: 'string_literal', value: '' });
  });

  it('irDate creates date literal', () => {
    const node = irDate('2024-01-15');
    assert.deepStrictEqual(node, { type: 'date_literal', value: '2024-01-15' });
  });

  it('irDateTime creates datetime literal', () => {
    const node = irDateTime('2024-01-15T10:30:00');
    assert.deepStrictEqual(node, { type: 'datetime_literal', value: '2024-01-15T10:30:00' });
  });

  it('irDuration creates duration literal', () => {
    const node = irDuration('P1D');
    assert.deepStrictEqual(node, { type: 'duration_literal', value: 'P1D' });
  });

  it('irDuration handles complex durations', () => {
    const node = irDuration('P1Y2M3DT4H5M6S');
    assert.deepStrictEqual(node, { type: 'duration_literal', value: 'P1Y2M3DT4H5M6S' });
  });
});

describe('IR variable factory', () => {
  it('irVariable creates variable with default any type', () => {
    const node = irVariable('x');
    assert.deepStrictEqual(node, {
      type: 'variable',
      name: 'x',
      inferredType: Types.any,
    });
  });

  it('irVariable creates variable with specified type', () => {
    const node = irVariable('count', Types.int);
    assert.deepStrictEqual(node, {
      type: 'variable',
      name: 'count',
      inferredType: Types.int,
    });
  });

  it('irVariable handles underscore names', () => {
    const node = irVariable('user_name', Types.string);
    assert.strictEqual(node.name, 'user_name');
    assert.deepStrictEqual(node.inferredType, Types.string);
  });
});

describe('IR call factory', () => {
  it('irCall creates function call with no args', () => {
    const node = irCall('today', [], Types.date);
    assert.deepStrictEqual(node, {
      type: 'call',
      fn: 'today',
      args: [],
      resultType: Types.date,
    });
  });

  it('irCall creates function call with args', () => {
    const node = irCall('add_int_int', [irInt(1), irInt(2)], Types.int);
    assert.strictEqual(node.fn, 'add_int_int');
    assert.strictEqual(node.args.length, 2);
    assert.deepStrictEqual(node.resultType, Types.int);
  });

  it('irCall defaults to any result type', () => {
    const node = irCall('unknown_fn', [irVariable('x')]);
    assert.deepStrictEqual(node.resultType, Types.any);
  });

  it('irCall allows nested calls', () => {
    const inner = irCall('today', [], Types.date);
    const outer = irCall('add_date_duration', [inner, irDuration('P1D')], Types.date);
    assert.strictEqual(outer.fn, 'add_date_duration');
    assert.strictEqual(outer.args[0].type, 'call');
  });
});

describe('IR let factory', () => {
  it('irLet creates let with single binding', () => {
    const node = irLet(
      [{ name: 'x', value: irInt(1) }],
      irVariable('x', Types.int)
    );
    assert.strictEqual(node.type, 'let');
    assert.strictEqual(node.bindings.length, 1);
    assert.strictEqual(node.bindings[0].name, 'x');
    assert.deepStrictEqual(node.bindings[0].value, irInt(1));
  });

  it('irLet creates let with multiple bindings', () => {
    const node = irLet(
      [
        { name: 'x', value: irInt(1) },
        { name: 'y', value: irInt(2) },
      ],
      irCall('add_int_int', [irVariable('x', Types.int), irVariable('y', Types.int)], Types.int)
    );
    assert.strictEqual(node.bindings.length, 2);
  });
});

describe('IR member access factory', () => {
  it('irMemberAccess creates member access', () => {
    const node = irMemberAccess(irVariable('obj'), 'property');
    assert.deepStrictEqual(node, {
      type: 'member_access',
      object: irVariable('obj'),
      property: 'property',
    });
  });

  it('irMemberAccess allows chained access', () => {
    const inner = irMemberAccess(irVariable('obj'), 'foo');
    const outer = irMemberAccess(inner, 'bar');
    assert.strictEqual(outer.object.type, 'member_access');
    assert.strictEqual(outer.property, 'bar');
  });
});

describe('inferType', () => {
  it('infers int from int_literal', () => {
    assert.deepStrictEqual(inferType(irInt(42)), Types.int);
  });

  it('infers float from float_literal', () => {
    assert.deepStrictEqual(inferType(irFloat(3.14)), Types.float);
  });

  it('infers bool from bool_literal', () => {
    assert.deepStrictEqual(inferType(irBool(true)), Types.bool);
    assert.deepStrictEqual(inferType(irBool(false)), Types.bool);
  });

  it('infers string from string_literal', () => {
    assert.deepStrictEqual(inferType(irString('hello')), Types.string);
  });

  it('infers date from date_literal', () => {
    assert.deepStrictEqual(inferType(irDate('2024-01-15')), Types.date);
  });

  it('infers datetime from datetime_literal', () => {
    assert.deepStrictEqual(inferType(irDateTime('2024-01-15T10:30:00')), Types.datetime);
  });

  it('infers duration from duration_literal', () => {
    assert.deepStrictEqual(inferType(irDuration('P1D')), Types.duration);
  });

  it('infers type from variable', () => {
    assert.deepStrictEqual(inferType(irVariable('x', Types.int)), Types.int);
    assert.deepStrictEqual(inferType(irVariable('y', Types.string)), Types.string);
    assert.deepStrictEqual(inferType(irVariable('z')), Types.any);
  });

  it('infers type from call result type', () => {
    assert.deepStrictEqual(inferType(irCall('add_int_int', [], Types.int)), Types.int);
    assert.deepStrictEqual(inferType(irCall('today', [], Types.date)), Types.date);
  });

  it('infers type from let body', () => {
    const node = irLet(
      [{ name: 'x', value: irInt(1) }],
      irCall('add_int_int', [irVariable('x', Types.int), irInt(2)], Types.int)
    );
    assert.deepStrictEqual(inferType(node), Types.int);
  });

  it('infers any from member access', () => {
    const node = irMemberAccess(irVariable('obj'), 'property');
    assert.deepStrictEqual(inferType(node), Types.any);
  });
});
