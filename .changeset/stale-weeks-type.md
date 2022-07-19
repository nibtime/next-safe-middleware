---
"@next-safe/middleware": patch
---

fix: better `isPageRequest` matcher

* exclude only basepaths `/_next` and `/api`
* exclude all paths with file endings
* exclude `isPreviewModeRequest` and `isNextJsDataRequest` (new matchers)

