---
"@next-safe/middleware": minor
---

provide new middleware abstractions for Next.js 12.2 stable middleware

* `matchChain` function that allows to disable chain execution for certain requests with a matcher (predicate on `NextRequest`)
* `continued` function that allows to continue a middleware response to a middleware chain
* `isPageRequest` matcher that matches only requests to Next.js pages