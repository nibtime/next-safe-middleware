---
"@next-safe/middleware": patch
---

fetch script/style hashes for `/404` route if a request has no route/page. This makes strict CSP work with a custom `pages/404.js`.
