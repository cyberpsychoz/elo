## Problem to solve

* Programs could be wrong. Also compiled programs are sometimes more complex
  than necessary because we need to generate kXXX functions (e.g. kMul) to cover
  all possible cases at runtime while some of them might be unnecessary.
* A type inference + checker could be much greater for end users.

## Idea

* Add an optional --typecheck to the elo command
* Check whether a known type inference algorithm could help us here. Make the
  analysis at least and let's see what is possible.
