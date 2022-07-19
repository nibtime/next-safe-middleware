---
"e2e": minor
---

provide `gsspWithNonceAppliedToCsp` and `gipWithNonceAppliedToCsp` wrappers to inject nonce into pages with `getServerSideProps` / `getInitialProps`.

BREAKING CHANGE: nonce doesn't get applied to CSP automatically anymore. This extra step is neccessary
as there is no longer a way of reliably do that with Next 12.2.

BREAKING CHANGE: drop `enhanceAppWithNonce`, it's no longer needed as nonce is injected though `getServerSideProps` of routes/pages now. That's actually a good thing, because [customizing `renderPage` is discouranged](https://nextjs.org/docs/advanced-features/custom-document#customizing-renderpage)