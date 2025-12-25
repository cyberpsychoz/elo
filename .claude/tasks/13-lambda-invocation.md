## Problem to solve

We just added support for lambda function like `( x | x * 2 )`. To be truly
useful though, one should be able to invoke them. For instance, the following
should work:

```k
let
  double = ( x | x * 2 )
in
  assert(double(2) == 4)
```

## Idea

Let's add that :-)

How will we distinguish from invoking a lambda and invoking a stdlib function ?
