## Problem to solve

Currently type inference relies on hardcoded functions in transform.ts,
such as `inferFunctionResultType`, `inferBinaryResultType`, `inferType`.

As far as the stdlib is concerned, the returning type of function call is part
of the language design, and is the same whatever the target language chosen.

I think we should extract this kind of type information, necessary for better
type inference separated.

## Idea

Extract it to an inspectable/reusable abstraction.

**CRITICAL** this is a pure refactoring. Don't touch any integration/acceptance
test file of fixture, make sure they all pass. You can add unit tests or course.
