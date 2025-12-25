/**
 * Klang runtime helpers for JavaScript execution.
 * These are used by compiled K expressions at runtime.
 *
 * This module provides:
 * 1. A factory function for creating the runtime (used by web frontend)
 * 2. String snippets for embedding in preludes (used by CLI)
 */

export interface DayjsLike {
  isDayjs(value: any): boolean;
  isDuration(value: any): boolean;
}

export interface KlangRuntime {
  add(left: any, right: any): any;
  subtract(left: any, right: any): any;
  multiply(left: any, right: any): any;
  divide(left: any, right: any): any;
  modulo(left: any, right: any): any;
  power(left: any, right: any): any;
}

/**
 * Creates the klang runtime helpers using the provided dayjs instance.
 * Used by the web frontend where dayjs is already loaded.
 */
export function createKlangRuntime(dayjs: DayjsLike): KlangRuntime {
  return {
    add(left: any, right: any): any {
      if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.add(right);
      if (dayjs.isDuration(left) && dayjs.isDayjs(right)) return right.add(left);
      return left + right;
    },
    subtract(left: any, right: any): any {
      if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.subtract(right);
      return left - right;
    },
    multiply(left: any, right: any): any {
      return left * right;
    },
    divide(left: any, right: any): any {
      return left / right;
    },
    modulo(left: any, right: any): any {
      return left % right;
    },
    power(left: any, right: any): any {
      return Math.pow(left, right);
    }
  };
}

/**
 * JavaScript source code for the arithmetic helpers.
 * This is embedded in preludes to avoid code duplication.
 */
export const KLANG_ARITHMETIC_HELPERS = `
  add(left, right) {
    if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.add(right);
    if (dayjs.isDuration(left) && dayjs.isDayjs(right)) return right.add(left);
    return left + right;
  },
  subtract(left, right) {
    if (dayjs.isDayjs(left) && dayjs.isDuration(right)) return left.subtract(right);
    return left - right;
  },
  multiply(left, right) {
    return left * right;
  },
  divide(left, right) {
    return left / right;
  },
  modulo(left, right) {
    return left % right;
  },
  power(left, right) {
    return Math.pow(left, right);
  }`;
