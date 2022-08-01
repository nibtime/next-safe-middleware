---
"@next-safe/middleware": minor
---

rebuild/refactor lib into many small modules with CSP manifest (fixes [#40](https://github.com/nibtime/next-safe-middleware/issues/40))

* writes out a single file to `.next/static/~csp/csp-manifest.json` with all information about trustable sources identified during SSR

* precursor for a multi-package approach to support alternative configuration methods (described in https://github.com/nibtime/next-safe-middleware/discussions/60#discussioncomment-3259782)

* perf: fetch CSP manifest only once on first access and cache for all subsequent middlewares