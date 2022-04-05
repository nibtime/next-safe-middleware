---
"@next-safe/middleware": patch
---

update `getPreNextScripts` for the new `<Script strategy="worker>"` with [partytown](https://partytown.builder.io/#web-workers) introduced in [Next 12.1.1](https://github.com/vercel/next.js/releases/tag/v12.1.1). 

* follow https://nextjs.org/docs/basic-features/script#off-loading-scripts-to-a-web-worker-experimental to set it up.
