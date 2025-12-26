## Problem to solve

Finitio allows validating and dressing "external" data via type definitions,
including complex data/object structures (typically coming from json files).

In Elo's mindset, this means that while dressing scalars is possible:

```
'2025-12-26' |> Date
```

Then, object dressing should be possible too :

```
{ x: '2025-12-26' } |> Object({ x: Date })
```

Finitio is rather powerful, since it allows complex object definitions like:

```
{
  x :  Date|String
  y :? Date
  ...
}
```

## Idea

Let's brainstorm about the feasibility to bring this kind of feature to Elo,
that would make if super powerful and distinguisable from existing programming
languages.
