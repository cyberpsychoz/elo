## Problem to solve

I'm not sure I like the Learn section (I love the mechanism, but not the table
of contents), let's maybe brainstorm another structure.

## Idea

What would be the 5 main chapters =

- Introduction

  A quick overview, should be simple but appealing. It's not a big deal if the
  learner does not understand everything, but might be excited and want to keep
  learning to actually understand the example they say.

- Extended Arithmetics

  We would put the foundation : you're used to calculator on numbers, Elo can
  do that. Actually it can do that on other "data types" (to be explained)
  than numbers. Such as boolean, strings, datetimes, aned even lists (see task
  78 we did previously, but without going in full details)

- Advanced data structures

  We would cover list and tuples, and explain that this is the way to represent
  information + a link to a future section about input data and type selectors.
  Here we would also explain that some arithmetic exists on those structure too,
  such as array concatenation. And cover data paths and fetch.

- Functions

  We would explain that operators are not enough, and introduce functions as a
  generalisation. We would cover a few examples of stdlib functions on the types
  seen earlier. Then would introduce our lambda and the fact that those functions
  can be passed as any other value.

- Program structure

  An introduction to `let`, `if/then/else` and `|>` pipe and how they help
  structuring complex programs.

- Advanced data processing

  We would cover things like map/reduce, type selectors (parsing/coercion),
  possibly the null question and `|` operator.

- Where is data coming from ?

  We would finally cover the input data `_` concept and the notion of runtime
  that is supposed to provide it.
