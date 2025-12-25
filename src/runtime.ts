/**
 * Klang runtime helpers for JavaScript execution.
 * These are used by compiled K expressions at runtime.
 *
 * This module provides a factory function that creates the klang namespace
 * given a dayjs instance. This allows the same logic to be used in both
 * Node.js (with require) and browser (with ES modules) environments.
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
