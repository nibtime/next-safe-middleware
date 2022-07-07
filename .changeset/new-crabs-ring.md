---
"@next-safe/middleware": patch
---

fix: `enhanceAppWithNonce` as separate function.Must spread `nonce` into `pageProps`, else fails with Next 12.2
