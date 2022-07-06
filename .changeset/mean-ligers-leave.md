---
"@next-safe/middleware": minor
---

versatile `getCspInitialProps` for `_document.js`

- flag to opt into styles trustification for CSP
- flag to opt out from script trustification for CSP
- option to pass external raw css text to hash for CSP. For instance needed for [Mantine](https://mantine.dev/), to pass `extractCritical(initialProps.html).css` (emotion)  
- option to enhance `<App>` (`_app.js`) with nonce from SSR (needed for React Providers that can consume a nonce) 