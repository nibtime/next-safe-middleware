---
"@next-safe/middleware": minor
---

:boom: changes to `ChainableMiddleware` decrease resource utilization ([#45](https://github.com/nibtime/next-safe-middleware/issues/45))

- new `MiddlewareChainContext` interface

perf: decrease CPU utilization
- use `ctx.cache.get` and `ctx.cache.set` for caching CSP in middleware chain (no serialize/deserialize)
- write to repsonse only once from chain cache at the end
- remove unnecessary some double ops

perf: decrease deployed size
- use new built-in `userAgent` from `next/server`

BREAKING CHANGE: supports only Stable middleware from now on (needs `next >= 12.2`, as is specified in peerDeps)

BREAKING CHANGE:  replace `ua-parser-js` with `userAgent` from `next/server` available since `12.2`

BREAKING CHANGE: `ChainableMiddleware` with `(ctx: MiddlewareChainContext)` as 3rd parameter.

BREAKING CHANGE: turn positional params into named params for `Configinitializer`






