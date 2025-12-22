# What is Klang?

A small expression language that compiles/translates to Ruby, Javascript and PostgreSQL.

## Aim

Having small purely functional expressions expressed in a user-friendly language,
that can be evaluated in different environments.

## Current Features

- **Arithmetic expressions** with scalars and variables
- **Boolean expressions** with comparison and logical operators
- **Temporal types** with dates, datetimes, and ISO8601 durations
- **Infix notation** (standard mathematical notation)
- **Arithmetic operators**: `+`, `-`, `*`, `/`, `%`, `^` (power)
- **Comparison operators**: `<`, `>`, `<=`, `>=`, `==`, `!=`
- **Logical operators**: `&&`, `||`, `!`
- **Unary operators**: `-`, `+`, `!`
- **Literals**:
  - Numbers: `42`, `3.14`
  - Booleans: `true`, `false`
  - Dates: `d"2024-01-15"`
  - DateTimes: `dt"2024-01-15T10:30:00Z"`
  - Durations: `P1D`, `PT1H30M`, `P1Y2M3D` (ISO8601)
- **Parentheses** for grouping
- **Multi-target compilation**:
  - Ruby (using `**` for power, `&&`/`||`/`!` for boolean logic, `Date.parse()`, `DateTime.parse()`, `ActiveSupport::Duration.parse()`)
  - JavaScript (using `Math.pow()` for power, `&&`/`||`/`!` for boolean logic, `new Date()`, `Duration.parse()`)
  - PostgreSQL (using `POWER()` for power, `AND`/`OR`/`NOT` for boolean logic, `DATE`, `TIMESTAMP`, `INTERVAL` for temporals)

## Installation

```bash
npm install
npm run build
```

## Testing

Klang includes a comprehensive test suite with 136 tests across 31 suites covering:
- Parser and lexer functionality (literals, operators, precedence)
- AST construction and helper functions
- All three target compilers (Ruby, JavaScript, SQL)
- Temporal types (dates, datetimes, durations)
- Integration tests with real-world examples
- Edge cases and error handling

Run the tests:
```bash
npm test
```

Current test results: **136 tests, 0 failures**

## Usage

### Parsing and Compiling Arithmetic Expressions

```typescript
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from './src';

// Parse an expression
const ast = parse('x + y * 2');

// Compile to different targets
console.log(compileToRuby(ast));       // => x + y * 2
console.log(compileToJavaScript(ast)); // => x + y * 2
console.log(compileToSQL(ast));        // => x + y * 2

// Power operator example
const powerExpr = parse('2 ^ 3 + 1');
console.log(compileToRuby(powerExpr));       // => 2 ** 3 + 1
console.log(compileToJavaScript(powerExpr)); // => Math.pow(2, 3) + 1
console.log(compileToSQL(powerExpr));        // => POWER(2, 3) + 1
```

### Boolean Expressions

```typescript
// Comparison operators
const ast1 = parse('x > 10 && x < 100');
console.log(compileToRuby(ast1));       // => x > 10 && x < 100
console.log(compileToJavaScript(ast1)); // => x > 10 && x < 100
console.log(compileToSQL(ast1));        // => x > 10 AND x < 100

// Logical operators with boolean literals
const ast2 = parse('active == true || admin == true');
console.log(compileToRuby(ast2));       // => active == true || admin == true
console.log(compileToJavaScript(ast2)); // => active == true || admin == true
console.log(compileToSQL(ast2));        // => active == TRUE OR admin == TRUE

// Negation
const ast3 = parse('!disabled');
console.log(compileToRuby(ast3));       // => !disabled
console.log(compileToJavaScript(ast3)); // => !disabled
console.log(compileToSQL(ast3));        // => NOT disabled
```

### Temporal Expressions

```typescript
// Date literals
const date = parse('d"2024-01-15"');
console.log(compileToRuby(date));       // => Date.parse('2024-01-15')
console.log(compileToJavaScript(date)); // => new Date('2024-01-15')
console.log(compileToSQL(date));        // => DATE '2024-01-15'

// DateTime literals
const datetime = parse('dt"2024-01-15T10:30:00Z"');
console.log(compileToRuby(datetime));       // => DateTime.parse('2024-01-15T10:30:00Z')
console.log(compileToJavaScript(datetime)); // => new Date('2024-01-15T10:30:00Z')
console.log(compileToSQL(datetime));        // => TIMESTAMP '2024-01-15 10:30:00'

// Duration literals (ISO8601)
const duration = parse('P1D');          // 1 day
const duration2 = parse('PT1H30M');     // 1 hour 30 minutes
const duration3 = parse('P1Y2M3D');     // 1 year, 2 months, 3 days
console.log(compileToRuby(duration));       // => ActiveSupport::Duration.parse('P1D')
console.log(compileToJavaScript(duration)); // => Duration.parse('P1D')
console.log(compileToSQL(duration));        // => INTERVAL 'P1D'

// Date arithmetic
const futureDate = parse('d"2024-01-15" + P1D');
console.log(compileToRuby(futureDate));
// => Date.parse('2024-01-15') + ActiveSupport::Duration.parse('P1D')
console.log(compileToSQL(futureDate));
// => DATE '2024-01-15' + INTERVAL 'P1D'

// Date comparisons
const dateCheck = parse('d"2024-01-15" < d"2024-12-31"');
console.log(compileToSQL(dateCheck));
// => DATE '2024-01-15' < DATE '2024-12-31'

// Complex temporal expressions
const ageCheck = parse('current_date - birth_date > P18Y');
const rangeCheck = parse('event_date >= d"2024-01-01" && event_date <= d"2024-01-01" + P30D');
```

### Programmatic AST Construction

```typescript
import { binary, variable, literal } from './src';

// Build: (price * quantity) - discount
const ast = binary(
  '-',
  binary('*', variable('price'), variable('quantity')),
  variable('discount')
);
```

## Examples

Run the examples:

```bash
npm run build
node dist/examples/basic.js     # Arithmetic expressions
node dist/examples/boolean.js   # Boolean expressions
node dist/examples/temporal.js  # Temporal expressions (dates, durations)
node dist/examples/demo.js      # Quick demo
```

### Example Expressions

**Arithmetic:**
- `2 + 3 * 4` - Order of operations
- `(price * quantity) - discount` - Business calculations
- `2 ^ 3 + 1` - Power operations

**Boolean:**
- `x > 10 && x < 100` - Range checks
- `status == 1 || status == 2` - Multiple conditions
- `!active` - Negation

**Temporal:**
- `d"2024-01-15" + P1D` - Add 1 day to a date
- `d"2024-12-31" - d"2024-01-01"` - Calculate days between dates
- `current_date - birth_date > P18Y` - Age validation
- `event_date >= d"2024-01-01" && event_date <= d"2024-01-01" + P30D` - Date range check
- `dt"2024-01-15T09:00:00Z" + PT2H30M` - Add duration to datetime

## Grammar

```
expr       -> logical_or
logical_or -> logical_and ('||' logical_and)*
logical_and -> equality ('&&' equality)*
equality   -> comparison (('==' | '!=') comparison)*
comparison -> addition (('<' | '>' | '<=' | '>=') addition)*
addition   -> term (('+' | '-') term)*
term       -> factor (('*' | '/' | '%') factor)*
factor     -> power
power      -> unary ('^' unary)*
unary      -> ('!' | '-' | '+') unary | primary
primary    -> NUMBER | BOOLEAN | DATE | DATETIME | DURATION | IDENTIFIER | '(' expr ')'
```

**Temporal Literal Syntax:**
- `DATE` → `d"YYYY-MM-DD"` (e.g., `d"2024-01-15"`)
- `DATETIME` → `dt"ISO8601"` (e.g., `dt"2024-01-15T10:30:00Z"`)
- `DURATION` → ISO8601 duration (e.g., `P1D`, `PT1H30M`, `P1Y2M3D`)
  - Years: `Y`, Months: `M`, Weeks: `W`, Days: `D`
  - Time separator: `T`
  - Hours: `H`, Minutes: `M`, Seconds: `S`
  - Examples: `P1D` (1 day), `PT2H30M` (2.5 hours), `P1Y6M` (1.5 years)

## Project Structure

```
klang/
├── src/
│   ├── ast.ts                 # AST node type definitions
│   ├── parser.ts              # Lexer and parser for infix expressions
│   ├── index.ts               # Main exports
│   ├── ast.test.ts            # AST helper tests
│   ├── parser.test.ts         # Parser and lexer tests
│   ├── integration.test.ts    # End-to-end integration tests
│   ├── temporal.test.ts       # Temporal feature tests
│   └── compilers/
│       ├── ruby.ts            # Ruby code generator
│       ├── ruby.test.ts       # Ruby compiler tests
│       ├── javascript.ts      # JavaScript code generator
│       ├── javascript.test.ts # JavaScript compiler tests
│       ├── sql.ts             # PostgreSQL code generator
│       └── sql.test.ts        # SQL compiler tests
├── examples/
│   ├── basic.ts               # Arithmetic expression examples
│   ├── boolean.ts             # Boolean expression examples
│   ├── temporal.ts            # Temporal expression examples
│   └── demo.ts                # Quick demo
├── package.json
├── tsconfig.json
└── README.md
```

## Roadmap

Future enhancements could include:
- **String literals and operations**: String concatenation, pattern matching, substring operations
- **Conditional expressions**: Ternary operator (`condition ? then : else`) or if-then-else syntax
- **Function calls**: Built-in and user-defined functions (e.g., `abs(x)`, `round(price, 2)`)
- **Array/list literals**: Support for arrays and collection operations
- **Null handling**: Null literals and null-safe operations
- **Type system**: Optional static type checking and type inference
- **Optimization**: Constant folding, expression simplification, dead code elimination
- **Additional targets**: Python, Go, Rust code generation
- **Timezone support**: Explicit timezone handling for datetime operations

