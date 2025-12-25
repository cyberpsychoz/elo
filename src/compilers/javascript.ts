import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { Types } from '../types';
import { StdLib, EmitContext, simpleBinaryOp, nullary, fnCall } from '../stdlib';

/**
 * JavaScript compilation options
 */
export interface JavaScriptCompileOptions {
  // Reserved for future options
}

/**
 * Compiles Klang expressions to JavaScript code
 * Uses dayjs for temporal operations
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit JavaScript from IR
 */
export function compileToJavaScript(expr: Expr, options?: JavaScriptCompileOptions): string {
  const ir = transform(expr);
  return emitJS(ir);
}

/**
 * JavaScript operator precedence (higher = binds tighter)
 */
const JS_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3,
  '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
};

/**
 * Map IR function names to JS operators for precedence checking
 */
const OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
};

/**
 * Check if a call will be emitted as a native JS binary operator
 */
function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  const { fn, argTypes } = ir;

  // Arithmetic with numeric types
  if (['add', 'sub', 'mul', 'div', 'mod'].includes(fn)) {
    const [left, right] = argTypes;
    if ((left.kind === 'int' || left.kind === 'float') &&
        (right.kind === 'int' || right.kind === 'float')) {
      return true;
    }
    // String concatenation
    if (fn === 'add' && left.kind === 'string' && right.kind === 'string') {
      return true;
    }
  }

  // Comparison and logical operators
  if (['lt', 'gt', 'lte', 'gte', 'eq', 'neq', 'and', 'or'].includes(fn)) {
    return true;
  }

  return false;
}

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = JS_PRECEDENCE[parentOp] || 0;
  const childPrec = JS_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right') return true;

  return false;
}

// Build the JavaScript standard library
const jsLib = new StdLib<string>();

// Temporal nullary functions
jsLib.register('today', [], nullary("dayjs().startOf('day')"));
jsLib.register('now', [], nullary('dayjs()'));

// Period boundary functions
const periodBoundaryMap: Record<string, string> = {
  'start_of_day': "startOf('day')",
  'end_of_day': "endOf('day')",
  'start_of_week': "startOf('isoWeek')",
  'end_of_week': "endOf('isoWeek')",
  'start_of_month': "startOf('month')",
  'end_of_month': "endOf('month')",
  'start_of_quarter': "startOf('quarter')",
  'end_of_quarter': "endOf('quarter')",
  'start_of_year': "startOf('year')",
  'end_of_year': "endOf('year')",
};

for (const [fn, method] of Object.entries(periodBoundaryMap)) {
  jsLib.register(fn, [Types.datetime], (args, ctx) => `${ctx.emit(args[0])}.${method}`);
}

// Numeric arithmetic - native JS operators only for known numeric types
// Unknown types fall through to klang.* fallback
for (const leftType of [Types.int, Types.float]) {
  for (const rightType of [Types.int, Types.float]) {
    jsLib.register('add', [leftType, rightType], simpleBinaryOp('+'));
    jsLib.register('sub', [leftType, rightType], simpleBinaryOp('-'));
    jsLib.register('mul', [leftType, rightType], simpleBinaryOp('*'));
    jsLib.register('div', [leftType, rightType], simpleBinaryOp('/'));
    jsLib.register('mod', [leftType, rightType], simpleBinaryOp('%'));
    jsLib.register('pow', [leftType, rightType], fnCall('Math.pow'));
  }
}

// String concatenation
jsLib.register('add', [Types.string, Types.string], simpleBinaryOp('+'));

// Temporal addition
jsLib.register('add', [Types.date, Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);
jsLib.register('add', [Types.datetime, Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);
jsLib.register('add', [Types.duration, Types.date], (args, ctx) =>
  `${ctx.emit(args[1])}.add(${ctx.emit(args[0])})`);
jsLib.register('add', [Types.duration, Types.datetime], (args, ctx) =>
  `${ctx.emit(args[1])}.add(${ctx.emit(args[0])})`);
jsLib.register('add', [Types.duration, Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.add(${ctx.emit(args[1])})`);

// Temporal subtraction
jsLib.register('sub', [Types.date, Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.subtract(${ctx.emit(args[1])})`);
jsLib.register('sub', [Types.datetime, Types.duration], (args, ctx) =>
  `${ctx.emit(args[0])}.subtract(${ctx.emit(args[1])})`);

// Duration scaling: n * duration or duration * n
jsLib.register('mul', [Types.int, Types.duration], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[1])}.asMilliseconds() * ${ctx.emit(args[0])})`);
jsLib.register('mul', [Types.float, Types.duration], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[1])}.asMilliseconds() * ${ctx.emit(args[0])})`);
jsLib.register('mul', [Types.duration, Types.int], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() * ${ctx.emit(args[1])})`);
jsLib.register('mul', [Types.duration, Types.float], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() * ${ctx.emit(args[1])})`);

// Duration division
jsLib.register('div', [Types.duration, Types.int], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() / ${ctx.emit(args[1])})`);
jsLib.register('div', [Types.duration, Types.float], (args, ctx) =>
  `dayjs.duration(${ctx.emit(args[0])}.asMilliseconds() / ${ctx.emit(args[1])})`);

// Comparison operators - type generalization handles most combinations
// Date/datetime equality needs special valueOf comparison (using +)
const temporalTypes = [Types.date, Types.datetime];
for (const leftType of temporalTypes) {
  for (const rightType of temporalTypes) {
    jsLib.register('eq', [leftType, rightType], (args, ctx) =>
      `+${ctx.emit(args[0])} === +${ctx.emit(args[1])}`);
    jsLib.register('neq', [leftType, rightType], (args, ctx) =>
      `+${ctx.emit(args[0])} !== +${ctx.emit(args[1])}`);
  }
}
// All other comparisons use native JS operators
jsLib.register('lt', [Types.any, Types.any], simpleBinaryOp('<'));
jsLib.register('gt', [Types.any, Types.any], simpleBinaryOp('>'));
jsLib.register('lte', [Types.any, Types.any], simpleBinaryOp('<='));
jsLib.register('gte', [Types.any, Types.any], simpleBinaryOp('>='));
jsLib.register('eq', [Types.any, Types.any], simpleBinaryOp('=='));
jsLib.register('neq', [Types.any, Types.any], simpleBinaryOp('!='));

// Logical operators
jsLib.register('and', [Types.any, Types.any], simpleBinaryOp('&&'));
jsLib.register('or', [Types.any, Types.any], simpleBinaryOp('||'));

// Unary operators - only for known types, unknown falls through to klang.* fallback
for (const t of [Types.int, Types.float]) {
  jsLib.register('neg', [t], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `-(${operand})`;
    return `-${operand}`;
  });
  jsLib.register('pos', [t], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `+(${operand})`;
    return `+${operand}`;
  });
}

jsLib.register('not', [Types.bool], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `!(${operand})`;
  return `!${operand}`;
});

// Assert function - accept both bool and any (for dynamic expressions)
for (const conditionType of [Types.bool, Types.any]) {
  jsLib.register('assert', [conditionType], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `(function() { if (!(${condition})) throw new Error("Assertion failed"); return true; })()`;
  });
  jsLib.register('assert', [conditionType, Types.string], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    const message = ctx.emit(args[1]);
    return `(function() { if (!(${condition})) throw new Error(${message}); return true; })()`;
  });
}

// Fallback for unknown functions - use klang. namespace for runtime helpers
jsLib.registerFallback((name, args, _argTypes, ctx) => {
  const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
  return `klang.${name}(${emittedArgs})`;
});

/**
 * Emit JavaScript code from IR
 */
function emitJS(ir: IRExpr): string {
  const ctx: EmitContext<string> = {
    emit: emitJS,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitJS(child);
      if (needsParens(child, parentOp, side)) {
        return `(${emitted})`;
      }
      return emitted;
    },
  };

  switch (ir.type) {
    case 'int_literal':
    case 'float_literal':
      return ir.value.toString();

    case 'bool_literal':
      return ir.value.toString();

    case 'string_literal':
      return JSON.stringify(ir.value);

    case 'date_literal':
      return `dayjs('${ir.value}')`;

    case 'datetime_literal':
      return `dayjs('${ir.value}')`;

    case 'duration_literal':
      return `dayjs.duration('${ir.value}')`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitJS(ir.object);
      const needsParensForMember = ir.object.type === 'call';
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}.${ir.property}`;
    }

    case 'let': {
      const params = ir.bindings.map(b => b.name).join(', ');
      const args = ir.bindings.map(b => emitJS(b.value)).join(', ');
      const body = emitJS(ir.body);
      return `((${params}) => ${body})(${args})`;
    }

    case 'call':
      return jsLib.emit(ir.fn, ir.args, ir.argTypes, ctx);
  }
}
