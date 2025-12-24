import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from '../../src/parser';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * Compiler tests using test fixtures from test/ directory.
 *
 * Each test suite has:
 * - <name>.klang - Klang expressions, one per line
 * - <name>.expected.js - Expected JavaScript compilation
 * - <name>.expected.ruby - Expected Ruby compilation
 * - <name>.expected.sql - Expected SQL compilation
 */

const TEST_DIR = join(__dirname, '../../../test/fixtures');

interface TestSuite {
  name: string;
  klang: string[];
  expectedJS: string[];
  expectedRuby: string[];
  expectedSQL: string[];
  expectedTestableJS?: string[];    // Optional testable JavaScript variant
  expectedTestableRuby?: string[];  // Optional testable Ruby variant
  expectedTestableSQL?: string[];   // Optional testable SQL variant
}

function loadTestSuites(): TestSuite[] {
  const suites: TestSuite[] = [];

  // Find all .klang files
  const files = readdirSync(TEST_DIR);
  const klangFiles = files.filter(f => f.endsWith('.klang'));

  for (const klangFile of klangFiles) {
    const name = klangFile.replace('.klang', '');

    // Read all related files
    const klangPath = join(TEST_DIR, `${name}.klang`);
    const jsPath = join(TEST_DIR, `${name}.expected.js`);
    const rubyPath = join(TEST_DIR, `${name}.expected.ruby`);
    const sqlPath = join(TEST_DIR, `${name}.expected.sql`);

    const klang = readFileSync(klangPath, 'utf-8').split('\n');
    const expectedJS = readFileSync(jsPath, 'utf-8').split('\n');
    const expectedRuby = readFileSync(rubyPath, 'utf-8').split('\n');
    const expectedSQL = readFileSync(sqlPath, 'utf-8').split('\n');

    // Check for testable variants
    const testableJsPath = join(TEST_DIR, `${name}.expected.testable.js`);
    const expectedTestableJS = existsSync(testableJsPath)
      ? readFileSync(testableJsPath, 'utf-8').split('\n')
      : undefined;

    const testableRubyPath = join(TEST_DIR, `${name}.expected.testable.ruby`);
    const expectedTestableRuby = existsSync(testableRubyPath)
      ? readFileSync(testableRubyPath, 'utf-8').split('\n')
      : undefined;

    const testableSqlPath = join(TEST_DIR, `${name}.expected.testable.sql`);
    const expectedTestableSQL = existsSync(testableSqlPath)
      ? readFileSync(testableSqlPath, 'utf-8').split('\n')
      : undefined;

    suites.push({
      name,
      klang,
      expectedJS,
      expectedRuby,
      expectedSQL,
      expectedTestableJS,
      expectedTestableRuby,
      expectedTestableSQL
    });
  }

  return suites;
}

const testSuites = loadTestSuites();

for (const suite of testSuites) {
  describe(`Compiler - ${suite.name}`, () => {
    for (let i = 0; i < suite.klang.length; i++) {
      const expr = suite.klang[i].trim();

      // Skip empty lines
      if (!expr) continue;

      const lineNum = i + 1;

      it(`should compile line ${lineNum}: ${expr}`, () => {
        const ast = parse(expr);

        // Test JavaScript compilation (production mode)
        const actualJS = compileToJavaScript(ast);
        const expectedJS = suite.expectedJS[i].trim();
        assert.strictEqual(
          actualJS,
          expectedJS,
          `JavaScript compilation mismatch on line ${lineNum}`
        );

        // Test JavaScript compilation (testable mode) if variant exists
        if (suite.expectedTestableJS) {
          const actualTestableJS = compileToJavaScript(ast, { temporalMode: 'testable' });
          const expectedTestableJS = suite.expectedTestableJS[i].trim();
          assert.strictEqual(
            actualTestableJS,
            expectedTestableJS,
            `Testable JavaScript compilation mismatch on line ${lineNum}`
          );
        }

        // Test Ruby compilation (production mode)
        const actualRuby = compileToRuby(ast);
        const expectedRuby = suite.expectedRuby[i].trim();
        assert.strictEqual(
          actualRuby,
          expectedRuby,
          `Ruby compilation mismatch on line ${lineNum}`
        );

        // Test Ruby compilation (testable mode) if variant exists
        if (suite.expectedTestableRuby) {
          const actualTestableRuby = compileToRuby(ast, { temporalMode: 'testable' });
          const expectedTestableRuby = suite.expectedTestableRuby[i].trim();
          assert.strictEqual(
            actualTestableRuby,
            expectedTestableRuby,
            `Testable Ruby compilation mismatch on line ${lineNum}`
          );
        }

        // Test SQL compilation (production mode)
        const actualSQL = compileToSQL(ast);
        const expectedSQL = suite.expectedSQL[i].trim();
        assert.strictEqual(
          actualSQL,
          expectedSQL,
          `SQL compilation mismatch on line ${lineNum}`
        );

        // Test SQL compilation (testable mode) if variant exists
        if (suite.expectedTestableSQL) {
          const actualTestableSQL = compileToSQL(ast, { temporalMode: 'testable' });
          const expectedTestableSQL = suite.expectedTestableSQL[i].trim();
          assert.strictEqual(
            actualTestableSQL,
            expectedTestableSQL,
            `Testable SQL compilation mismatch on line ${lineNum}`
          );
        }
      });
    }
  });
}
