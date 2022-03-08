---
"@next-safe/middleware": patch
---

add hash of empty string to style hashes. CSS-in-js frameworks like stitches seem to need it to not break during hydration
