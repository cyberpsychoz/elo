## Problem to solve

I think we need to distinguish between :

- `bin/eloc` the compiler
- `bin/elo` the evaluator

Simply because we have two target publics.

- Developers interested in integrating Elo insider their No-Code product or data
  pipelines.
- Newcomers wanting to play with the language itself.

## Idea

Introduce `bin/elo` next to `bin/eloc`.

- `bin/elo` could have options to defined where the input data comes from
  (e.g. stdin, stdin already parsed as json/csv/xlsx, a data file)
- `bin/eloc` would be cleaned of execution semantics (such as -i option)

`bin/elo` would simply compile the .elo file to javascript then evaluate it
