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

// SQL uses native operators for all types - type generalization handles all combinations
sqlLib.register('add', [Types.any, Types.any], sqlBinaryOp('+'));
sqlLib.register('sub', [Types.any, Types.any], sqlBinaryOp('-'));
sqlLib.register('mul', [Types.any, Types.any], sqlBinaryOp('*'));
sqlLib.register('div', [Types.any, Types.any], sqlBinaryOp('/'));
sqlLib.register('mod', [Types.any, Types.any], sqlBinaryOp('%'));
sqlLib.register('pow', [Types.any, Types.any], fnCall('POWER'));

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

// Other temporal additions are covered by any,any registration

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

// Other temporal subtractions and duration scaling are covered by any,any registrations

// Comparison operators - SQL handles all types, type generalization applies
sqlLib.register('lt', [Types.any, Types.any], sqlBinaryOp('<'));
sqlLib.register('gt', [Types.any, Types.any], sqlBinaryOp('>'));
sqlLib.register('lte', [Types.any, Types.any], sqlBinaryOp('<='));
sqlLib.register('gte', [Types.any, Types.any], sqlBinaryOp('>='));
sqlLib.register('eq', [Types.any, Types.any], sqlBinaryOp('='));
sqlLib.register('neq', [Types.any, Types.any], sqlBinaryOp('<>'));

// Logical operators
sqlLib.register('and', [Types.any, Types.any], sqlBinaryOp('AND'));
sqlLib.register('or', [Types.any, Types.any], sqlBinaryOp('OR'));

// Unary operators - type generalization handles int, float, and any
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
sqlLib.register('not', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `NOT (${operand})`;
  return `NOT ${operand}`;
});

// Assert function - type generalization handles bool and any
sqlLib.register('assert', [Types.any], (args, ctx) => {
  const condition = ctx.emit(args[0]);
  return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
});
sqlLib.register('assert', [Types.any, Types.string], (args, ctx) => {
  const condition = ctx.emit(args[0]);
  return `CASE WHEN ${condition} THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END`;
});

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
