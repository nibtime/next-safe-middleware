---
"@next-safe/middleware": patch
---

add a undefined guard to browser support check of `strictDynamic`. This led to undesired behavior when user agent is empty/unknown.
