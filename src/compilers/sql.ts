import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { Types } from '../types';
import { StdLib, EmitContext, nullary, fnCall } from '../stdlib';

/**
 * SQL compilation options
 */
export interface SQLCompileOptions {
  // Reserved for future options
}

/**
 * SQL operator precedence (higher = binds tighter)
 */
const SQL_PRECEDENCE: Record<string, number> = {
  'OR': 0,
  'AND': 1,
  '=': 2, '<>': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
};

/**
 * Map IR function names to SQL operators
 */
const OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '=', 'neq': '<>', 'and': 'AND', 'or': 'OR',
};

/**
 * Check if a call will be emitted as a native SQL binary operator
 */
function isNativeBinaryOp(ir: IRExpr): boolean {
  if (ir.type !== 'call') return false;
  return OP_MAP[ir.fn] !== undefined && ir.argTypes.length === 2;
}

/**
 * Check if an IR expression needs parentheses when used as child of a binary op
 */
function needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean {
  if (!isNativeBinaryOp(child)) return false;

  const call = child as IRCall;
  const childOp = OP_MAP[call.fn];
  if (!childOp) return false;

  const parentPrec = SQL_PRECEDENCE[parentOp] || 0;
  const childPrec = SQL_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

/**
 * Helper for SQL binary operators
 */
function sqlBinaryOp(op: string): (args: IRExpr[], ctx: EmitContext<string>) => string {
  return (args, ctx) => {
    const left = ctx.emitWithParens(args[0], op, 'left');
    const right = ctx.emitWithParens(args[1], op, 'right');
    return `${left} ${op} ${right}`;
  };
}

// Build the SQL standard library
const sqlLib = new StdLib<string>();

// Temporal nullary functions
sqlLib.register('today', [], nullary('CURRENT_DATE'));
sqlLib.register('now', [], nullary('CURRENT_TIMESTAMP'));

// Period boundary functions using date_trunc
const periodBoundarySQL: Record<string, { truncate: string; end?: string }> = {
  'start_of_day': { truncate: 'day' },
  'end_of_day': { truncate: 'day', end: "+ INTERVAL '1 day' - INTERVAL '1 second'" },
  'start_of_week': { truncate: 'week' },
  'end_of_week': { truncate: 'week', end: "+ INTERVAL '6 days'" },
  'start_of_month': { truncate: 'month' },
  'end_of_month': { truncate: 'month', end: "+ INTERVAL '1 month' - INTERVAL '1 day'" },
  'start_of_quarter': { truncate: 'quarter' },
  'end_of_quarter': { truncate: 'quarter', end: "+ INTERVAL '3 months' - INTERVAL '1 day'" },
  'start_of_year': { truncate: 'year' },
  'end_of_year': { truncate: 'year', end: "+ INTERVAL '1 year' - INTERVAL '1 day'" },
};

for (const [fn, { truncate, end }] of Object.entries(periodBoundarySQL)) {
  sqlLib.register(fn, [Types.datetime], (args, ctx) => {
    const arg = args[0];
    let baseExpr: string;
    if (arg.type === 'call' && arg.fn === 'now') {
      baseExpr = fn.includes('_day') ? 'CURRENT_TIMESTAMP' : 'CURRENT_DATE';
    } else {
      baseExpr = ctx.emit(arg);
    }
    const truncated = `date_trunc('${truncate}', ${baseExpr})`;
    return end ? `${truncated} ${end}` : truncated;
  });
}

// Numeric arithmetic - native SQL operators, including with any type
const numericAndAny = [Types.int, Types.float, Types.any];
for (const leftType of numericAndAny) {
  for (const rightType of numericAndAny) {
    sqlLib.register('add', [leftType, rightType], sqlBinaryOp('+'));
    sqlLib.register('sub', [leftType, rightType], sqlBinaryOp('-'));
    sqlLib.register('mul', [leftType, rightType], sqlBinaryOp('*'));
    sqlLib.register('div', [leftType, rightType], sqlBinaryOp('/'));
    sqlLib.register('mod', [leftType, rightType], sqlBinaryOp('%'));
    sqlLib.register('pow', [leftType, rightType], fnCall('POWER'));
  }
}

// String concatenation (including with any)
sqlLib.register('add', [Types.string, Types.string], sqlBinaryOp('+'));
sqlLib.register('add', [Types.string, Types.any], sqlBinaryOp('+'));
sqlLib.register('add', [Types.any, Types.string], sqlBinaryOp('+'));

// Temporal arithmetic
// Special case: today() + duration('P1D') -> CURRENT_DATE + INTERVAL '1 day' (for TOMORROW)
sqlLib.register('add', [Types.date, Types.duration], (args, ctx) => {
  const leftArg = args[0];
  const rightArg = args[1];
  if (leftArg.type === 'call' && leftArg.fn === 'today' &&
      rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
    return "CURRENT_DATE + INTERVAL '1 day'";
  }
  const left = ctx.emitWithParens(args[0], '+', 'left');
  const right = ctx.emitWithParens(args[1], '+', 'right');
  return `${left} + ${right}`;
});

sqlLib.register('add', [Types.datetime, Types.duration], sqlBinaryOp('+'));
sqlLib.register('add', [Types.duration, Types.date], sqlBinaryOp('+'));
sqlLib.register('add', [Types.duration, Types.datetime], sqlBinaryOp('+'));
sqlLib.register('add', [Types.duration, Types.duration], sqlBinaryOp('+'));

// Special case: today() - duration('P1D') -> CURRENT_DATE - INTERVAL '1 day' (for YESTERDAY)
sqlLib.register('sub', [Types.date, Types.duration], (args, ctx) => {
  const leftArg = args[0];
  const rightArg = args[1];
  if (leftArg.type === 'call' && leftArg.fn === 'today' &&
      rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
    return "CURRENT_DATE - INTERVAL '1 day'";
  }
  const left = ctx.emitWithParens(args[0], '-', 'left');
  const right = ctx.emitWithParens(args[1], '-', 'right');
  return `${left} - ${right}`;
});

sqlLib.register('sub', [Types.datetime, Types.duration], sqlBinaryOp('-'));

// Duration scaling
sqlLib.register('mul', [Types.int, Types.duration], sqlBinaryOp('*'));
sqlLib.register('mul', [Types.float, Types.duration], sqlBinaryOp('*'));
sqlLib.register('mul', [Types.duration, Types.int], sqlBinaryOp('*'));
sqlLib.register('mul', [Types.duration, Types.float], sqlBinaryOp('*'));
sqlLib.register('div', [Types.duration, Types.int], sqlBinaryOp('/'));
sqlLib.register('div', [Types.duration, Types.float], sqlBinaryOp('/'));

// Comparison and logical operators - SQL handles all types including any
const allTypes = [Types.int, Types.float, Types.string, Types.bool, Types.date, Types.datetime, Types.any];
for (const leftType of allTypes) {
  for (const rightType of allTypes) {
    sqlLib.register('lt', [leftType, rightType], sqlBinaryOp('<'));
    sqlLib.register('gt', [leftType, rightType], sqlBinaryOp('>'));
    sqlLib.register('lte', [leftType, rightType], sqlBinaryOp('<='));
    sqlLib.register('gte', [leftType, rightType], sqlBinaryOp('>='));
    sqlLib.register('eq', [leftType, rightType], sqlBinaryOp('='));
    sqlLib.register('neq', [leftType, rightType], sqlBinaryOp('<>'));
  }
}

// Logical operators - always native SQL operators, including with any type
for (const leftType of [Types.bool, Types.any]) {
  for (const rightType of [Types.bool, Types.any]) {
    sqlLib.register('and', [leftType, rightType], sqlBinaryOp('AND'));
    sqlLib.register('or', [leftType, rightType], sqlBinaryOp('OR'));
  }
}

// Unary operators
for (const t of [Types.int, Types.float]) {
  sqlLib.register('neg', [t], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `-(${operand})`;
    return `-${operand}`;
  });
  sqlLib.register('pos', [t], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `+(${operand})`;
    return `+${operand}`;
  });
}

for (const t of [Types.bool, Types.any]) {
  sqlLib.register('not', [t], (args, ctx) => {
    const operand = ctx.emit(args[0]);
    if (isNativeBinaryOp(args[0])) return `NOT (${operand})`;
    return `NOT ${operand}`;
  });
}

// Unary neg/pos for any type (unknown variables)
sqlLib.register('neg', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `-(${operand})`;
  return `-${operand}`;
});
sqlLib.register('pos', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `+(${operand})`;
  return `+${operand}`;
});

// Assert function - accept both bool and any (for dynamic expressions)
for (const conditionType of [Types.bool, Types.any]) {
  sqlLib.register('assert', [conditionType], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
  });
  sqlLib.register('assert', [conditionType, Types.string], (args, ctx) => {
    const condition = ctx.emit(args[0]);
    return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
  });
}

// Fallback for unknown functions - uppercase for SQL
sqlLib.registerFallback((name, args, _argTypes, ctx) => {
  const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
  return `${name.toUpperCase()}(${emittedArgs})`;
});

/**
 * Compiles Klang expressions to PostgreSQL SQL
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit SQL from IR
 */
export function compileToSQL(expr: Expr, options?: SQLCompileOptions): string {
  const ir = transform(expr);
  return emitSQL(ir);
}

/**
 * Emit SQL code from IR
 */
function emitSQL(ir: IRExpr): string {
  const ctx: EmitContext<string> = {
    emit: emitSQL,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitSQL(child);
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
      return ir.value ? 'TRUE' : 'FALSE';

    case 'string_literal': {
      // SQL strings use single quotes, escape single quotes by doubling
      const escaped = ir.value.replace(/'/g, "''");
      return `'${escaped}'`;
    }

    case 'date_literal':
      return `DATE '${ir.value}'`;

    case 'datetime_literal': {
      // Convert ISO8601 to PostgreSQL TIMESTAMP format
      const formatted = ir.value.replace('T', ' ').replace('Z', '').split('.')[0];
      return `TIMESTAMP '${formatted}'`;
    }

    case 'duration_literal':
      return `INTERVAL '${ir.value}'`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitSQL(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}.${ir.property}`;
    }

    case 'let': {
      const bindingCols = ir.bindings
        .map(b => `${emitSQL(b.value)} AS ${b.name}`)
        .join(', ');
      const body = emitSQL(ir.body);
      return `(SELECT ${body} FROM (SELECT ${bindingCols}) AS _let)`;
    }

    case 'call':
      return sqlLib.emit(ir.fn, ir.args, ir.argTypes, ctx);
  }
}
