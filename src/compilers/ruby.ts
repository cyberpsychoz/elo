import { Expr } from '../ast';
import { IRExpr, IRCall } from '../ir';
import { transform } from '../transform';
import { Types } from '../types';
import { StdLib, EmitContext, simpleBinaryOp, nullary } from '../stdlib';

/**
 * Ruby compilation options
 */
export interface RubyCompileOptions {
  // Reserved for future options
}

/**
 * Ruby operator precedence (higher = binds tighter)
 */
const RUBY_PRECEDENCE: Record<string, number> = {
  '||': 0,
  '&&': 1,
  '==': 2, '!=': 2,
  '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
  '**': 6,
};

/**
 * Map IR function names to Ruby operators
 */
const OP_MAP: Record<string, string> = {
  'add': '+', 'sub': '-', 'mul': '*', 'div': '/', 'mod': '%', 'pow': '**',
  'lt': '<', 'gt': '>', 'lte': '<=', 'gte': '>=',
  'eq': '==', 'neq': '!=', 'and': '&&', 'or': '||',
};

/**
 * Check if a call will be emitted as a native Ruby binary operator
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

  const parentPrec = RUBY_PRECEDENCE[parentOp] || 0;
  const childPrec = RUBY_PRECEDENCE[childOp] || 0;

  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) {
    return true;
  }

  return false;
}

// Build the Ruby standard library
const rubyLib = new StdLib<string>();

// Temporal nullary functions
rubyLib.register('today', [], nullary('Date.today'));
rubyLib.register('now', [], nullary('DateTime.now'));

// Period boundary functions
const periodBoundaryMap: Record<string, string> = {
  'start_of_day': 'beginning_of_day',
  'end_of_day': 'end_of_day',
  'start_of_week': 'beginning_of_week',
  'end_of_week': 'end_of_week',
  'start_of_month': 'beginning_of_month',
  'end_of_month': 'end_of_month',
  'start_of_quarter': 'beginning_of_quarter',
  'end_of_quarter': 'end_of_quarter',
  'start_of_year': 'beginning_of_year',
  'end_of_year': 'end_of_year',
};

for (const [fn, method] of Object.entries(periodBoundaryMap)) {
  rubyLib.register(fn, [Types.datetime], (args, ctx) => {
    const arg = args[0];
    // For period boundaries, emit Date.today.method (not DateTime.now.method)
    if (arg.type === 'call' && arg.fn === 'now') {
      return `Date.today.${method}`;
    }
    return `${ctx.emit(arg)}.${method}`;
  });
}

// Ruby uses native operators for all types due to operator overloading
// Using any,any registration - type generalization handles all concrete type combinations
rubyLib.register('add', [Types.any, Types.any], simpleBinaryOp('+'));
rubyLib.register('sub', [Types.any, Types.any], simpleBinaryOp('-'));
rubyLib.register('mul', [Types.any, Types.any], simpleBinaryOp('*'));
rubyLib.register('div', [Types.any, Types.any], simpleBinaryOp('/'));
rubyLib.register('mod', [Types.any, Types.any], simpleBinaryOp('%'));
rubyLib.register('pow', [Types.any, Types.any], simpleBinaryOp('**'));

// Temporal arithmetic - Ruby's operator overloading handles this
// Special case: today() + duration('P1D') -> Date.today + 1 (for TOMORROW)
rubyLib.register('add', [Types.date, Types.duration], (args, ctx) => {
  const leftArg = args[0];
  const rightArg = args[1];
  if (leftArg.type === 'call' && leftArg.fn === 'today' &&
      rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
    return `${ctx.emit(leftArg)} + 1`;
  }
  const left = ctx.emitWithParens(args[0], '+', 'left');
  const right = ctx.emitWithParens(args[1], '+', 'right');
  return `${left} + ${right}`;
});

// Other temporal additions (datetime+duration, duration+*, duration+duration)
// are covered by the any,any registration since they use the same operator

// Special case: today() - duration('P1D') -> Date.today - 1 (for YESTERDAY)
rubyLib.register('sub', [Types.date, Types.duration], (args, ctx) => {
  const leftArg = args[0];
  const rightArg = args[1];
  if (leftArg.type === 'call' && leftArg.fn === 'today' &&
      rightArg.type === 'duration_literal' && rightArg.value === 'P1D') {
    return `${ctx.emit(leftArg)} - 1`;
  }
  const left = ctx.emitWithParens(args[0], '-', 'left');
  const right = ctx.emitWithParens(args[1], '-', 'right');
  return `${left} - ${right}`;
});

// datetime - duration uses the same operator, covered by any,any registration

// Comparison operators - Ruby's operator overloading handles all types
// Type generalization will match any concrete type combination
rubyLib.register('lt', [Types.any, Types.any], simpleBinaryOp('<'));
rubyLib.register('gt', [Types.any, Types.any], simpleBinaryOp('>'));
rubyLib.register('lte', [Types.any, Types.any], simpleBinaryOp('<='));
rubyLib.register('gte', [Types.any, Types.any], simpleBinaryOp('>='));
rubyLib.register('eq', [Types.any, Types.any], simpleBinaryOp('=='));
rubyLib.register('neq', [Types.any, Types.any], simpleBinaryOp('!='));

// Logical operators
rubyLib.register('and', [Types.any, Types.any], simpleBinaryOp('&&'));
rubyLib.register('or', [Types.any, Types.any], simpleBinaryOp('||'));

// Unary operators - type generalization handles int, float, and any
rubyLib.register('neg', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `-(${operand})`;
  return `-${operand}`;
});
rubyLib.register('pos', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `+(${operand})`;
  return `+${operand}`;
});
rubyLib.register('not', [Types.any], (args, ctx) => {
  const operand = ctx.emit(args[0]);
  if (isNativeBinaryOp(args[0])) return `!(${operand})`;
  return `!${operand}`;
});

// Assert function - type generalization handles bool and any
rubyLib.register('assert', [Types.any], (args, ctx) => {
  const condition = ctx.emit(args[0]);
  return `(raise "Assertion failed" unless ${condition}; true)`;
});
rubyLib.register('assert', [Types.any, Types.string], (args, ctx) => {
  const condition = ctx.emit(args[0]);
  const message = ctx.emit(args[1]);
  return `(raise ${message} unless ${condition}; true)`;
});

// Fallback for unknown functions
rubyLib.registerFallback((name, args, _argTypes, ctx) => {
  const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
  return `${name}(${emittedArgs})`;
});

/**
 * Compiles Klang expressions to Ruby code
 *
 * This compiler works in two phases:
 * 1. Transform AST to typed IR
 * 2. Emit Ruby from IR
 */
export function compileToRuby(expr: Expr, options?: RubyCompileOptions): string {
  const ir = transform(expr);
  return emitRuby(ir);
}

/**
 * Emit Ruby code from IR
 */
function emitRuby(ir: IRExpr): string {
  const ctx: EmitContext<string> = {
    emit: emitRuby,
    emitWithParens: (child, parentOp, side) => {
      const emitted = emitRuby(child);
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

    case 'string_literal': {
      // Ruby double-quoted strings: escape backslash and double quote
      const escaped = ir.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }

    case 'date_literal':
      return `Date.parse('${ir.value}')`;

    case 'datetime_literal':
      return `DateTime.parse('${ir.value}')`;

    case 'duration_literal':
      return `ActiveSupport::Duration.parse('${ir.value}')`;

    case 'variable':
      return ir.name;

    case 'member_access': {
      const object = emitRuby(ir.object);
      const needsParensForMember = ir.object.type === 'call' && isNativeBinaryOp(ir.object);
      const objectExpr = needsParensForMember ? `(${object})` : object;
      return `${objectExpr}[:${ir.property}]`;
    }

    case 'let': {
      const params = ir.bindings.map(b => b.name).join(', ');
      const args = ir.bindings.map(b => emitRuby(b.value)).join(', ');
      const body = emitRuby(ir.body);
      return `->(${params}) { ${body} }.call(${args})`;
    }

    case 'call':
      return rubyLib.emit(ir.fn, ir.args, ir.argTypes, ctx);
  }
}
