import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { parse } from './parser';
import { compileToRuby } from './compilers/ruby';
import { compileToJavaScript } from './compilers/javascript';
import { compileToSQL } from './compilers/sql';

const RUBY_URL = 'http://localhost:3011';
const NODE_URL = 'http://localhost:3002';

// PostgreSQL client
let pgClient: Client;

before(async () => {
  // Wait for services to be ready
  await waitForServices();

  // Connect to PostgreSQL
  pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'klang',
    password: 'klang',
    database: 'klang'
  });
  await pgClient.connect();

  // Set timezone to UTC to ensure consistent date/time handling
  await pgClient.query("SET TIME ZONE 'UTC'");
});

async function waitForServices() {
  const maxAttempts = 30;
  const delay = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Check Ruby service
      const rubyResponse = await fetch(`${RUBY_URL}/health`);
      if (!rubyResponse.ok) throw new Error('Ruby not ready');

      // Check Node service
      const nodeResponse = await fetch(`${NODE_URL}/health`);
      if (!nodeResponse.ok) throw new Error('Node not ready');

      // Check PostgreSQL
      const testClient = new Client({
        host: 'localhost',
        port: 5432,
        user: 'klang',
        password: 'klang',
        database: 'klang'
      });
      await testClient.connect();
      await testClient.end();

      console.log('All services ready');
      return;
    } catch (e) {
      if (i === maxAttempts - 1) {
        throw new Error(`Services not ready after ${maxAttempts} attempts: ${e}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function evaluateRuby(expression: string, variables: Record<string, any> = {}): Promise<any> {
  const response = await fetch(`${RUBY_URL}/eval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, variables })
  });

  const result = await response.json() as { success: boolean; result?: any; error?: string };
  if (!result.success) {
    throw new Error(`Ruby evaluation failed: ${result.error}`);
  }
  return result.result;
}

async function evaluateNode(expression: string, variables: Record<string, any> = {}): Promise<any> {
  const response = await fetch(`${NODE_URL}/eval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, variables })
  });

  const result = await response.json() as { success: boolean; result?: any; error?: string };
  if (!result.success) {
    throw new Error(`Node evaluation failed: ${result.error}`);
  }
  return result.result;
}

async function evaluateSQL(expression: string, variables: Record<string, any> = {}): Promise<any> {
  // Build SELECT query with variable bindings
  const paramNames = Object.keys(variables);
  const paramValues = Object.values(variables);

  let query: string;
  if (paramNames.length > 0) {
    // Cast parameters to their appropriate PostgreSQL types based on JavaScript types
    const bindings = paramNames.map((name, i) => {
      const value = paramValues[i];
      let cast = '';

      if (typeof value === 'number') {
        cast = Number.isInteger(value) ? '::integer' : '::numeric';
      } else if (typeof value === 'boolean') {
        cast = '::boolean';
      } else if (typeof value === 'string') {
        cast = '::text';
      }

      return `$${i + 1}${cast} AS ${name}`;
    }).join(', ');
    query = `SELECT ${expression} AS result FROM (SELECT ${bindings}) AS vars`;
  } else {
    query = `SELECT ${expression} AS result`;
  }

  const result = await pgClient.query(query, paramValues);
  return result.rows[0].result;
}

async function testExpression(
  source: string,
  expectedValue: any,
  variables: Record<string, any> = {},
  options: { skipSQL?: boolean; normalizeResult?: (val: any) => any } = {}
) {
  const ast = parse(source);

  const rubyCode = compileToRuby(ast);
  const jsCode = compileToJavaScript(ast);
  const sqlCode = compileToSQL(ast);

  const rubyResult = await evaluateRuby(rubyCode, variables);
  const nodeResult = await evaluateNode(jsCode, variables);

  const normalize = options.normalizeResult || ((x) => x);

  assert.deepEqual(normalize(rubyResult), normalize(expectedValue),
    `Ruby result mismatch for "${source}": got ${JSON.stringify(rubyResult)}, expected ${JSON.stringify(expectedValue)}`);
  assert.deepEqual(normalize(nodeResult), normalize(expectedValue),
    `Node result mismatch for "${source}": got ${JSON.stringify(nodeResult)}, expected ${JSON.stringify(expectedValue)}`);

  if (!options.skipSQL) {
    const sqlResult = await evaluateSQL(sqlCode, variables);
    assert.deepEqual(normalize(sqlResult), normalize(expectedValue),
      `SQL result mismatch for "${source}": got ${JSON.stringify(sqlResult)}, expected ${JSON.stringify(expectedValue)}`);
  }
}

describe('Acceptance Tests - Arithmetic', () => {
  it('should evaluate simple addition', async () => {
    await testExpression('2 + 3', 5);
  });

  it('should evaluate complex arithmetic', async () => {
    await testExpression('2 + 3 * 4', 14);
  });

  it('should evaluate with parentheses', async () => {
    await testExpression('(2 + 3) * 4', 20);
  });

  it('should evaluate power operator', async () => {
    await testExpression('2 ^ 3', 8);
  });

  it('should evaluate modulo', async () => {
    await testExpression('10 % 3', 1);
  });

  it('should evaluate with variables', async () => {
    await testExpression('x + y * 2', 11, { x: 5, y: 3 });
  });

  it('should evaluate negative numbers', async () => {
    await testExpression('-5 + 3', -2);
  });
});

describe('Acceptance Tests - Boolean', () => {
  it('should evaluate boolean literals', async () => {
    await testExpression('true', true);
    await testExpression('false', false);
  });

  it('should evaluate comparisons', async () => {
    await testExpression('5 > 3', true);
    await testExpression('5 < 3', false);
    await testExpression('5 >= 5', true);
    await testExpression('5 <= 4', false);
  });

  it('should evaluate equality', async () => {
    await testExpression('5 == 5', true);
    await testExpression('5 != 3', true);
  });

  it('should evaluate logical AND', async () => {
    await testExpression('true && true', true);
    await testExpression('true && false', false);
  });

  it('should evaluate logical OR', async () => {
    await testExpression('false || true', true);
    await testExpression('false || false', false);
  });

  it('should evaluate logical NOT', async () => {
    await testExpression('!true', false);
    await testExpression('!false', true);
  });

  it('should evaluate complex boolean expressions', async () => {
    await testExpression('(5 > 3) && (2 < 4)', true);
    await testExpression('(5 < 3) || (2 == 2)', true);
  });
});

describe('Acceptance Tests - Temporal', () => {
  it('should evaluate date literals', async () => {
    await testExpression('d"2024-01-15"', '2024-01-15', {}, {
      skipSQL: true, // Skip SQL - PostgreSQL DATE type has timezone conversion issues
      normalizeResult: (val) => {
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        if (typeof val === 'string') {
          return val.split('T')[0];
        }
        return val;
      }
    });
  });

  it('should evaluate datetime literals', async () => {
    await testExpression('dt"2024-01-15T10:30:00Z"', '2024-01-15T10:30:00.000Z', {}, {
      normalizeResult: (val) => {
        if (val instanceof Date) {
          return val.toISOString();
        }
        if (typeof val === 'string') {
          // Normalize timestamp format
          return new Date(val).toISOString();
        }
        return val;
      }
    });
  });

  it('should compare dates', async () => {
    await testExpression('d"2024-01-15" > d"2024-01-10"', true);
    await testExpression('d"2024-01-15" < d"2024-01-10"', false);
  });

  it('should compare datetimes', async () => {
    await testExpression('dt"2024-01-15T10:30:00Z" > dt"2024-01-15T09:00:00Z"', true);
  });

  it('should add duration to date', async () => {
    await testExpression('d"2024-01-15" + P1D', '2024-01-16', {}, {
      skipSQL: true, // Skip SQL - PostgreSQL DATE type has timezone conversion issues
      normalizeResult: (val) => {
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        if (typeof val === 'string') {
          return val.split('T')[0];
        }
        return val;
      }
    });
  });

  it('should subtract duration from date', async () => {
    await testExpression('d"2024-01-15" - P1D', '2024-01-14', {}, {
      skipSQL: true, // Skip SQL - PostgreSQL DATE type has timezone conversion issues
      normalizeResult: (val) => {
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        if (typeof val === 'string') {
          return val.split('T')[0];
        }
        return val;
      }
    });
  });
});

describe('Acceptance Tests - Variables', () => {
  it('should handle numeric variables', async () => {
    await testExpression('x * 2 + y', 13, { x: 5, y: 3 });
  });

  it('should handle boolean variables', async () => {
    await testExpression('isActive && hasPermission', true, { isActive: true, hasPermission: true });
  });

  it('should handle mixed variable types', async () => {
    await testExpression('age >= 18 && isActive', true, { age: 25, isActive: true });
  });
});
