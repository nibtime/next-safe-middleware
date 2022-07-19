---
"@next-safe/middleware": patch
---

fix(document): support new script insertion behavior
- handle `getPreloadDynamicChunks` and `getPreloadMainLinks` in `<Head>`
- hash `beforeInteractiveInlineScripts` in `<Head>`
- handle scripts also in drop-in component for `<NextScript>`
- trustify scripts in `initialProps.head`