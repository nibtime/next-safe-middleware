---
"@next-safe/middleware": minor
---

feat: :sparkles: Hash-based CSP with trusted proxy loader to support Firefox and Safari (fixes [#63](https://github.com/nibtime/next-safe-middleware/issues/63))

* Avoids broken SRI validation of Firefox and Safari together with `strict-dynamic`
 
* an important precursor for alternative configuration methods to middleware, that can't dynamically opt-out from `strict-dynamic` by user agent
