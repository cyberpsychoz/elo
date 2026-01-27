---
title: "Python Joins the Party"
date: 2026-01-27
author: "Bernard Lambeau & Claude"
lead: "Elo now compiles to Python, bringing the target count to four: JavaScript, Ruby, Python, and SQL."
---
Elo started with three compilation targets: JavaScript for the browser, Ruby for
the server, and SQL for the database. Today we add a fourth: **Python**.

## Why Python?

The goal has always been portability. Elo expressions should run wherever your
data lives. Python is the dominant language in data science, automation, and
backend scripting. Adding it was a natural next step.

Every Elo feature that works in JavaScript and Ruby now works in Python too:
arithmetic, strings, dates, durations, lambdas, data schemas, guards, and the
full standard library.

```elo
let Person = { name: String, age: Int(i | i > 0) }
in { name: 'Alice', age: '30' } |> Person
```

This compiles to idiomatic Python that validates the input, coerces `'30'` to
`30`, and checks the constraint — just like it does in JavaScript and Ruby.

## How It Works

The Python compiler follows the same architecture as the other targets: parse to
AST, transform to typed IR, emit target code. Python's single-expression lambda
constraint required a different approach for type definitions though.

In JavaScript, type parsers use multi-statement arrow functions:

```javascript
(v, p) => { const _r = pInt(v, p); if (!_r.success) return _r; ... }
```

Python lambdas can only hold a single expression, so we use **combinator-style
helpers** instead:

```python
pSubtype(pInt, [("constraint failed", lambda i: i > 0)])
```

Functions like `pSchema`, `pArray`, `pUnion`, and `pSubtype` each return a
parser function. They compose cleanly as single expressions, fitting naturally
into Python's walrus-operator chains:

```python
(_p_Person := pSchema([("name", pString, False), ("age", pInt, False)], "closed"),
 Person := lambda v: pUnwrap(_p_Person(v, '')),
 Person({"name": "Alice", "age": "30"}))[-1]
```

## Try It

The [playground](/try) now includes Python as a target. Select it from the
dropdown to see how any Elo expression compiles.

From the CLI:

```bash
eloc -e "2 + 3 * 4" -t python
# => (lambda _: 2 + 3 * 4)

eloc -t python --execute my-expression.elo | python3
```

## What's Next

Four targets, same semantics. We keep working toward the [vision](/about): a
simple, safe, portable expression language for data.

[Try Elo](/try) or check the [Changelog](https://github.com/enspirit/elo/blob/main/CHANGELOG.md) for details.
