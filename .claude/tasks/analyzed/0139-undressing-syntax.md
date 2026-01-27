## Problem to solve

* Elo needs syntax for "undressing" Finitio information contracts - the inverse of dressing.
* Dressing is easy: `"P1Y" |> Duration` (string → typed value)
* What's the syntax for the opposite: typed value → representation?

## Context

In Finitio, types can have multiple representations:
- `Duration<iso8601>` - ISO 8601 string like "P1Y3D"
- `Duration<parts>` - structural tuple like `{ years: 1, days: 3 }`
- `Color<hex>` - hex string like "#FF5733"
- `Color<rgb>` - tuple like `{ r: 255, g: 87, b: 51 }`

## Use case explored

Extracting the years from a Duration. Two different concepts:
1. **Component access**: the `years` field from the structural parts (integer)
2. **Unit conversion**: the entire duration measured in years (float)

This mirrors how Luxon/Day.js/Ruby distinguish:
- `.days` / `.parts[:days]` → component
- `.asDays()` / `.in_days` → measurement

## Syntax options explored

### Option 1: Representation as function (rejected)
```
duration |> parts |> fetch(.years)
```
Problem: `x |> parts` is unclear without context. What type's parts?

### Option 2: Type parameter on representation (rejected)
```
duration |> parts<Duration> |> fetch(.years)
```
Problem: `parts<Duration>` is **ambiguous** with comparison `parts < Duration`.
The `<` token cannot be disambiguated without significant lookahead.

### Option 3: Tilde operator (selected)
```
duration |> ~Duration<parts> |> fetch(.years)
```
The `~` prefix creates an **unambiguous parsing context** where `<` means
"representation", not "less than".

## Design decision

**Undressing uses `~Type<repr>` syntax:**

| Direction | Syntax | Flow |
|-----------|--------|------|
| Dress | `"P1Y" \|> Duration` | repr → type |
| Undress | `duration \|> ~Duration<parts>` | type → repr |

Benefits:
- **Parseability**: `~` signals "type expression follows", making `<` unambiguous
- **Explicit**: Forces type annotation, improving readability in unclear contexts
- **Type checking**: Explicit types help future type inference/checking algorithms
- **Symmetry**: Visually mirrors dressing - `Duration` vs `~Duration`
- Representations use domain vocabulary (`parts`, `hex`, `rgb`, `iso8601`)

## Naming conventions (from Ruby)

Adopted Ruby's ActiveSupport naming:
- `parts` instead of `tuple` for structural decomposition
- `inDays`, `inHours` etc. for unit conversion (measurement)

## Examples

```
# Dressing
"P1Y3D" |> Duration              # string → Duration
{ years: 1, days: 3 } |> Duration # tuple → Duration (via parts repr)

# Undressing
duration |> ~Duration<iso8601>                    # → "P1Y3D"
duration |> ~Duration<parts>                      # → { years: 1, days: 3 }
duration |> ~Duration<parts> |> fetch(.years)     # → 1

# Unit conversion (different concept, stdlib functions)
duration |> inDays               # → 368.0 (measurement)
duration |> inHours              # → 8832.0

# Other types
color |> ~Color<hex>             # → "#FF5733"
color |> ~Color<rgb>             # → { r: 255, g: 87, b: 51 }
```

## Grammar extension required

Current Elo grammar does NOT support `Type<repr>` syntax. Adding undressing requires:

1. Add `~` as a token (TILDE)
2. Add undress expression: `'~' UPPER_IDENTIFIER '<' IDENTIFIER '>'`
3. The `~` prefix makes `<` unambiguous in this context

## Open questions

1. How to handle types with a "default" representation? Is explicit always required?
2. Stdlib function naming: `inDays` vs `in_days` vs `toDays`?
3. Should dressing also support explicit representation? `"P1Y3D" |> Duration<iso8601>`
