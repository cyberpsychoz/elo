/**
 * Standard Library for Klang
 *
 * Provides a type-based dispatch system for function implementations.
 * Each target compiler (JS, Ruby, SQL) defines its own implementations
 * that are looked up by function name and argument types.
 */

import { KlangType, Types, typeName } from './types';
import { IRExpr } from './ir';

/**
 * A function signature: name + argument types
 */
export interface FunctionSignature {
  name: string;
  argTypes: KlangType[];
}

/**
 * Create a signature key for lookup
 * e.g., "add:int,int" or "neg:float"
 */
export function signatureKey(name: string, argTypes: KlangType[]): string {
  const typeNames = argTypes.map(typeName).join(',');
  return typeNames ? `${name}:${typeNames}` : name;
}

/**
 * Context passed to emitters for recursive emission
 */
export interface EmitContext<T> {
  emit: (ir: IRExpr) => T;
  emitWithParens: (ir: IRExpr, parentOp: string, side: 'left' | 'right') => T;
}

/**
 * A function implementation that emits code for a specific signature
 */
export type FunctionEmitter<T> = (args: IRExpr[], ctx: EmitContext<T>) => T;

/**
 * A library of function implementations for a target language
 */
export class StdLib<T> {
  private implementations: Map<string, FunctionEmitter<T>> = new Map();
  private fallback: ((name: string, args: IRExpr[], argTypes: KlangType[], ctx: EmitContext<T>) => T) | null = null;

  /**
   * Register an implementation for a specific signature
   */
  register(name: string, argTypes: KlangType[], emitter: FunctionEmitter<T>): this {
    const key = signatureKey(name, argTypes);
    this.implementations.set(key, emitter);
    return this;
  }

  /**
   * Register a fallback for unmatched signatures
   */
  registerFallback(handler: (name: string, args: IRExpr[], argTypes: KlangType[], ctx: EmitContext<T>) => T): this {
    this.fallback = handler;
    return this;
  }

  /**
   * Look up an implementation by signature
   */
  lookup(name: string, argTypes: KlangType[]): FunctionEmitter<T> | undefined {
    const key = signatureKey(name, argTypes);
    return this.implementations.get(key);
  }

  /**
   * Emit code for a function call
   */
  emit(name: string, args: IRExpr[], argTypes: KlangType[], ctx: EmitContext<T>): T {
    const impl = this.lookup(name, argTypes);
    if (impl) {
      return impl(args, ctx);
    }
    if (this.fallback) {
      return this.fallback(name, args, argTypes, ctx);
    }
    throw new Error(`No implementation for ${signatureKey(name, argTypes)}`);
  }
}

/**
 * Helper to create a binary operator emitter
 */
export function binaryOp<T>(
  op: string,
  format: (left: T, right: T) => T
): FunctionEmitter<T> {
  return (args, ctx) => {
    const left = ctx.emitWithParens(args[0], op, 'left');
    const right = ctx.emitWithParens(args[1], op, 'right');
    return format(left, right);
  };
}

/**
 * Helper to create a simple binary operator that just joins with the operator
 */
export function simpleBinaryOp(op: string): FunctionEmitter<string> {
  return binaryOp(op, (left, right) => `${left} ${op} ${right}`);
}

/**
 * Helper to create a unary operator emitter
 */
export function unaryOp<T>(
  format: (operand: T, needsParens: boolean) => T,
  needsParensCheck: (arg: IRExpr) => boolean
): FunctionEmitter<T> {
  return (args, ctx) => {
    const operand = ctx.emit(args[0]);
    const needsParens = needsParensCheck(args[0]);
    return format(operand, needsParens);
  };
}

/**
 * Helper for method call style: arg0.method(arg1)
 */
export function methodCall(method: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const obj = ctx.emit(args[0]);
    const arg = ctx.emit(args[1]);
    return `${obj}.${method}(${arg})`;
  };
}

/**
 * Helper for nullary function (no args)
 */
export function nullary<T>(value: T): FunctionEmitter<T> {
  return () => value;
}

/**
 * Helper for unary method call: arg0.method()
 */
export function unaryMethod(method: string): FunctionEmitter<string> {
  return (args, ctx) => `${ctx.emit(args[0])}.${method}`;
}

/**
 * Helper for function call style: fn(arg0, arg1, ...)
 */
export function fnCall(fnName: string): FunctionEmitter<string> {
  return (args, ctx) => {
    const emittedArgs = args.map(a => ctx.emit(a)).join(', ');
    return `${fnName}(${emittedArgs})`;
  };
}
