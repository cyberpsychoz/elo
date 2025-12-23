import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from './parser';
import { compileToRuby, compileToJavaScript, compileToSQL } from './index';

describe('Member Access - Parsing', () => {
  it('should parse simple member access', () => {
    const ast = parse('t.age');
    assert.strictEqual(ast.type, 'member_access');
    if (ast.type === 'member_access') {
      assert.strictEqual(ast.object.type, 'variable');
      if (ast.object.type === 'variable') {
        assert.strictEqual(ast.object.name, 't');
      }
      assert.strictEqual(ast.property, 'age');
    }
  });

  it('should parse chained member access', () => {
    const ast = parse('t.person.age');
    assert.strictEqual(ast.type, 'member_access');
    if (ast.type === 'member_access') {
      assert.strictEqual(ast.property, 'age');
      assert.strictEqual(ast.object.type, 'member_access');
      if (ast.object.type === 'member_access') {
        assert.strictEqual(ast.object.property, 'person');
        assert.strictEqual(ast.object.object.type, 'variable');
      }
    }
  });

  it('should parse member access in comparison', () => {
    const ast = parse('t.age > 35');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '>');
      assert.strictEqual(ast.left.type, 'member_access');
      assert.strictEqual(ast.right.type, 'literal');
    }
  });

  it('should parse member access with underscore variable', () => {
    const ast = parse('_.name');
    assert.strictEqual(ast.type, 'member_access');
    if (ast.type === 'member_access') {
      assert.strictEqual(ast.object.type, 'variable');
      if (ast.object.type === 'variable') {
        assert.strictEqual(ast.object.name, '_');
      }
      assert.strictEqual(ast.property, 'name');
    }
  });
});

describe('Member Access - JavaScript Compilation', () => {
  it('should compile simple member access', () => {
    const ast = parse('t.age');
    assert.strictEqual(compileToJavaScript(ast), 't.age');
  });

  it('should compile chained member access', () => {
    const ast = parse('t.person.age');
    assert.strictEqual(compileToJavaScript(ast), 't.person.age');
  });

  it('should compile member access in expression', () => {
    const ast = parse('t.age > 35');
    assert.strictEqual(compileToJavaScript(ast), 't.age > 35');
  });

  it('should compile member access in arithmetic', () => {
    const ast = parse('t.age + 5');
    assert.strictEqual(compileToJavaScript(ast), 't.age + 5');
  });
});

describe('Member Access - Ruby Compilation', () => {
  it('should compile simple member access', () => {
    const ast = parse('t.age');
    assert.strictEqual(compileToRuby(ast), 't[:age]');
  });

  it('should compile chained member access', () => {
    const ast = parse('t.person.age');
    assert.strictEqual(compileToRuby(ast), 't[:person][:age]');
  });

  it('should compile member access in expression', () => {
    const ast = parse('t.age > 35');
    assert.strictEqual(compileToRuby(ast), 't[:age] > 35');
  });

  it('should compile member access in arithmetic', () => {
    const ast = parse('t.age + 5');
    assert.strictEqual(compileToRuby(ast), 't[:age] + 5');
  });
});

describe('Member Access - SQL Compilation', () => {
  it('should compile simple member access', () => {
    const ast = parse('t.age');
    assert.strictEqual(compileToSQL(ast), 't.age');
  });

  it('should compile chained member access', () => {
    const ast = parse('t.person.age');
    assert.strictEqual(compileToSQL(ast), 't.person.age');
  });

  it('should compile member access in expression', () => {
    const ast = parse('t.age > 35');
    assert.strictEqual(compileToSQL(ast), 't.age > 35');
  });

  it('should compile member access in arithmetic', () => {
    const ast = parse('t.age + 5');
    assert.strictEqual(compileToSQL(ast), 't.age + 5');
  });
});

describe('Member Access - Complex Expressions', () => {
  it('should parse member access with logical operators', () => {
    const ast = parse('t.age > 18 && t.active');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
      assert.strictEqual(ast.left.type, 'binary');
      assert.strictEqual(ast.right.type, 'member_access');
    }
  });

  it('should compile complex boolean expression', () => {
    const ast = parse('t.age >= 18 && t.active');
    assert.strictEqual(
      compileToJavaScript(ast),
      't.age >= 18 && t.active'
    );
    assert.strictEqual(
      compileToRuby(ast),
      't[:age] >= 18 && t[:active]'
    );
    assert.strictEqual(
      compileToSQL(ast),
      't.age >= 18 AND t.active'
    );
  });
});
