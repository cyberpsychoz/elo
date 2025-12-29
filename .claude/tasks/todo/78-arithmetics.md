## Problem to solve

We'd like Elo to be understood as an extended artithmetic/algebra. Instead of
being simple arithmetics on numbers, it's extended with addition types and
operators (with functions as a generalization of them).

## Idea

Let's already check our current state of arithmetics

- Int & Flow: +, -, *, /, %, (+ abs, etc.)
- String
  - `+` = concatenation
  - `*` = multiply (e.g. 3*'hi' = 'hihihi', same for 'hi'*3)
  - what else ?
- Boolean
  - `||` = or
  - `&&` = and
- Datetime
  - `+` = Datetime + Duration ~> Datetime
  - `-` = Datetime - Duration ~> Datetime
  - what else ?
- Duration
  - `+` = Duration + Datetime ~> Datetime
  - `+` = Duration + Duration ~> Duration
  - `-` = Duration - Duration ~> Duration
  - `*` = Duration * Number ~> Duration
  - `/` = Duration / Number ~> Duration
  - what else ?
- Tuple
  - `+` = Tuple + Tuple ~> Tuple (could be merge or deep merge ?)
  - what else ?
- List
  - `+` - list concatenation
  - what else ?
- DataPath
  - `+` - datapath concatenation (.name + .0.foo = .name.0.foo)
  - What else ?

## Todo

- Let's already check what we have, and make sure acceptance exists, adding
  them if needed
- Let's see what would be good additions to the stdlib for the vision
