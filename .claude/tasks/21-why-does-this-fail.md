## Problem to solve

Why does `assert(2 * P1D == P2D)` fail ?

## Post implement discussion

What the example shows is that we lack acceptance tests that show that == is
always value equality in K. Add acceptance tests asserting that, for our various
supported types.
