## Implementation Status (Phase 1 Complete - JS only)

✅ Parser: Uppercase let bindings parsed as type definitions
✅ AST: TypeDef, TypeRef, TypeSchema nodes
✅ IR: IRTypeDef, IRTypeRef, IRTypeSchema nodes
✅ JS Compiler: Generates parser functions with Result type
✅ JS Runtime: pOk, pFail, pUnwrap, pAny, pString, pInt, pBool, pDatetime helpers
✅ Acceptance tests: 11 assertions covering base types and object schemas
✅ Lexer fix: 'P' followed by non-duration chars now correctly tokenizes as identifier
⏳ Ruby/SQL: Not yet implemented (throws error)
⏳ Documentation: Not yet added
⏳ Subtype constraints: Not yet implemented

## Problem to solve

Finitio allows validating and dressing "external" data via type definitions,
including complex data/object structures (typically coming from json files).

In Elo's mindset, this means that while dressing scalars is possible:

```elo
'2025-12-26' |> Date
```

Then, object dressing should be possible too:

```elo
let Person = { name: String, born: Date } in
  data |> Person
```

Finitio also supports subtype constraints:

```finitio
PosInt = Int( i | i > 0 )
```

And complex object definitions like:

```finitio
{
  x :  Date|String    # Union type
  y :? Date           # Optional field
  ...                 # Open struct
}
```

### First steps

Let's start with a subset of those.

- We will only support Any type (`.` in Finitio) and our base types (`String`, `Int`, `Boolean`, `Datetime`)
- Type schemas always declared in `let X = ...` where the type name starts with an uppercase letter.
- When called X will "parse" the value or fail.
- The compilation should use functions with signature like ParseFn below

  ```typescript
  export type Result = { success: boolean, path: string, value: any, cause: Result[] }
  export type ParserFn = (value: any, path: string): Result
  ```
- General implementation algorithm is close to a PEG parser. Each step tries to parse the
  input value and returns a result that tracks success/error and value/message (+ causes).
- It's ready for `|` operator, that has to try the alternatives and collect eventual
  errors in causes.

## Current State

1. **Scalar dressing works**: `'2025-12-26' |> Date` via type selectors (`Date()`, `Int()`, etc.)
2. **Objects are simple**: `{key: value}` syntax, `.property` access, but no type validation
3. **Type system is flat**: `TypeKind` enum without structural type info (no object shapes)
4. **Parser distinguishes identifiers**: `IDENTIFIER` (lowercase) vs `UPPER_IDENTIFIER` (uppercase)

## Key Design Decision: Type Definitions via Uppercase `let` Bindings

Instead of `Object({ x: Date })` wrapper syntax, use uppercase identifiers in `let`:

```elo
let Person = { name: String, age: Int } in
  data |> Person
```

**Advantages:**
- Clear syntax: uppercase LHS signals type definition, not value binding
- No parsing ambiguity: `{ name: String }` in type context is clearly a type schema
- Consistent with Finitio: `Person = { name: String, ... }`
- Natural usage: `data |> Person` mirrors `data |> Date`

**Parser change:**
- When `let` sees `UPPER_IDENTIFIER = ...`, parse RHS as a type expression
- Type expressions: type selectors, subtype constraints, object schemas

## Syntax Summary

### Subtype constraints (scalar types)
```elo
let PosInt = Int(i | i > 0) in
  '-5' |> PosInt                    # => null (constraint fails)
```

### Object type schemas
```elo
let Person = { name: String, age: Int } in
  { name: 'Alice', age: '30' } |> Person   # => { name: 'Alice', age: 30 }
```

### Combined (nested constrained types)
```elo
let Person = {
  name: String(s | length(s) > 0),
  age: Int(a | a >= 0 && a <= 150)
} in
  data |> Person
```

## Key Challenges

### 1. Type schemas vs object literals

When parsing `let Person = { name: String }`:
- `Person` is `UPPER_IDENTIFIER` → this is a type definition
- RHS `{ name: String }` must be parsed as type schema
- Property values are type references, not expressions

When parsing `let person = { name: 'Alice' }`:
- `person` is `IDENTIFIER` → this is a value binding
- RHS `{ name: 'Alice' }` is a regular object literal

### 2. Type expression grammar

Type expressions include:
- Type selector names: `String`, `Int`, `Date`, etc.
- Subtype constraints: `Int(i | i > 0)`
- Object schemas: `{ prop: TypeExpr, ... }`

### 3. Type schema semantics

An object type schema `{ name: String, age: Int }` means:
1. Input must be an object with at least these properties
2. Each property value is dressed using its type selector
3. If any property dressing fails → null
4. Return dressed object with all properties

## Phased Implementation Plan

### Phase 1 - Subtype constraints on scalars

```elo
'42' |> Int(i | i > 0)           # => 42
'-5' |> Int(i | i > 0)           # => null
'abc' |> Int(i | i > 0)          # => null (dressing fails first)
```

**AST node:**
```typescript
interface SubtypeConstraint {
  type: 'subtype_constraint';
  baseType: string;           // 'Int', 'Date', etc.
  variable: string;           // 'i' in Int(i | i > 0)
  constraint: Expr;           // i > 0
}
```

**Parser change:**
- When parsing `Int(...)`, check if argument looks like `IDENTIFIER PIPE expr`
- If so, parse as subtype constraint, not function call

**IR transformation:**
```typescript
// Int(i | i > 0) on value x transforms to:
let _dressed = Int(x) in
  if _dressed != null && (let i = _dressed in i > 0) then _dressed else null
```

**Target compilation:**

| Target | Output for `Int(i | i > 0)` on `x` |
|--------|-----------------------------------|
| **JS** | `((i) => i !== null && i > 0 ? i : null)(kInt(x))` |
| **Ruby** | `(->(i) { !i.nil? && i > 0 ? i : nil }).call(k_int(x))` |
| **SQL** | `CASE WHEN elo_int(x) IS NOT NULL AND elo_int(x) > 0 THEN elo_int(x) ELSE NULL END` |

### Phase 2 - Named type definitions (uppercase let)

```elo
let PosInt = Int(i | i > 0) in
  '42' |> PosInt                    # => 42
```

**Parser changes:**
- In `letExpr()`, check if binding name is uppercase (`UPPER_IDENTIFIER`)
- If uppercase, parse RHS as type expression (same as Phase 1 for now)

**Semantics:**
- Uppercase bindings hold type values (dresser functions)
- Usage via pipe: `value |> TypeName` applies the dresser

### Phase 3 - Object type schemas

```elo
let Person = { name: String, age: Int } in
  { name: 'Alice', age: '30' } |> Person
```

**New AST node:**
```typescript
interface TypeSchema {
  type: 'type_schema';
  properties: TypeSchemaProperty[];
}

interface TypeSchemaProperty {
  key: string;
  typeExpr: TypeExpr;  // String, Int(i | i > 0), nested schema, etc.
}

type TypeExpr = string | SubtypeConstraint | TypeSchema;
```

**Parser changes:**
- When parsing type expression and see `LBRACE`:
  - Parse as object schema
  - Property values must be type expressions (not general expressions)

**Semantics:**
- Object schema returns dresser that:
  1. Checks input is object
  2. For each schema property, dresses input property
  3. Returns null if any property dressing fails
  4. Returns dressed object otherwise

### Phase 4 - Optional fields

```elo
let Person = {
  name: String,
  nickname?: String    # Optional - missing or null is OK
} in
  { name: 'Alice' } |> Person   # => { name: 'Alice', nickname: null }
```

### Phase 5 - Union types (if needed)

```elo
let Id = Int | String in
  ...
```

## Portability Analysis

| Feature | JS | Ruby | SQL | Notes |
|---------|-----|------|-----|-------|
| Subtype constraints | Yes | Yes | Yes | Lambdas/CASE |
| Type definitions | Yes | Yes | Yes | Let bindings |
| Object dressing | Yes | Yes | Partial | SQL needs jsonb helpers |
| Optional fields | Yes | Yes | Partial | NULL handling |
| Union types | Yes | Yes | Complex | SQL requires elaborate CASE |

## Open Questions

1. **Closed vs open objects**: Should extra properties in input be:
   - Stripped (closed schema) - safer, cleaner output
   - Preserved (open schema) - more flexible
   - Recommendation: Start with closed (strip extras)

2. **Error reporting**: Return null on failure, or more detailed errors?
   - Recommendation: null for simplicity (consistent with type selectors)

3. **Recursive types**: Allow `let Tree = { value: Int, children: [Tree] }`?
   - Recommendation: Defer to later phase
