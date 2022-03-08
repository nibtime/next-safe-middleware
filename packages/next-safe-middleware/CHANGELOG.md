# @next-safe/middleware

## 0.5.2

### Patch Changes

- [#20](https://github.com/nibtime/next-safe-middleware/pull/20) [`0e5fe59`](https://github.com/nibtime/next-safe-middleware/commit/0e5fe590612624fa4727817f2fd3b77b4d07a87e) Thanks [@nibtime](https://github.com/nibtime)! - add hash of empty string to style hashes. CSS-in-js frameworks like stitches seem to need it to not break during hydration

## 0.5.1

### Patch Changes

- [#18](https://github.com/nibtime/next-safe-middleware/pull/18) [`b40cc05`](https://github.com/nibtime/next-safe-middleware/commit/b40cc0550ae8d67a97795c992155791628dd15be) Thanks [@nibtime](https://github.com/nibtime)! - use correct call order in `render()` of custom `Document` components. That should prevent things from breaking in ISR mode.

* [#18](https://github.com/nibtime/next-safe-middleware/pull/18) [`b40cc05`](https://github.com/nibtime/next-safe-middleware/commit/b40cc0550ae8d67a97795c992155791628dd15be) Thanks [@nibtime](https://github.com/nibtime)! - fetch script/style hashes for `/404` route if a request has no route/page. This makes strict CSP work with a custom `pages/404.js`.

## 0.5.0

### Minor Changes

- [#15](https://github.com/nibtime/next-safe-middleware/pull/15) [`e7b4193`](https://github.com/nibtime/next-safe-middleware/commit/e7b4193e3935d945f2103ecd75f2826aaaad82cc) Thanks [@nibtime](https://github.com/nibtime)! - better bundling config + bundling of external utils. Saves around ~100% size for `_middleware` - important for edge where limit is 1MB

* [#15](https://github.com/nibtime/next-safe-middleware/pull/15) [`e7b4193`](https://github.com/nibtime/next-safe-middleware/commit/e7b4193e3935d945f2103ecd75f2826aaaad82cc) Thanks [@nibtime](https://github.com/nibtime)! - provide an API handler for easy creation of a report procesing endpoint by Next/Vercel cloud function

- [#17](https://github.com/nibtime/next-safe-middleware/pull/17) [`b084027`](https://github.com/nibtime/next-safe-middleware/commit/b0840272b32fbec265e5bee26607160b55cb9dc4) Thanks [@nibtime](https://github.com/nibtime)! - provide `strictInlineStyles` middleware. Extend `dist/document` to write out hashes of inline styles (Hash-based) or attach nonce to inline styles (Nonce-based).

* [#17](https://github.com/nibtime/next-safe-middleware/pull/17) [`b084027`](https://github.com/nibtime/next-safe-middleware/commit/b0840272b32fbec265e5bee26607160b55cb9dc4) Thanks [@nibtime](https://github.com/nibtime)! - add `tellsupported` config option (a function) to `strictDynamic`. Allows for strong customization of fallback behavior by parsed user agent.

## 0.4.0

### Minor Changes

- [#13](https://github.com/nibtime/next-safe-middleware/pull/13) [`67469d7`](https://github.com/nibtime/next-safe-middleware/commit/67469d732b7d9bff6fe507cf94852525a10c991e) Thanks [@nibtime](https://github.com/nibtime)! - provide a uniform middleware builder and configuration interface

* [`6b8bbc1`](https://github.com/nibtime/next-safe-middleware/commit/6b8bbc19e37685695952cc32928f2f3b51ca9f0e) Thanks [@nibtime](https://github.com/nibtime)! - add configuration options to `strictDynamic` (allowUnsafeEval, reportOnly)

## 0.3.1

### Patch Changes

- [#11](https://github.com/nibtime/next-safe-middleware/pull/11) [`7f44414`](https://github.com/nibtime/next-safe-middleware/commit/7f44414f0bb09d13d1a89fa97be186bd59fd615d) Thanks [@nibtime](https://github.com/nibtime)! - add a undefined guard to browser support check of `strictDynamic`. This led to undesired behavior when user agent is empty/unknown.

## 0.3.0

### Minor Changes

- [#8](https://github.com/nibtime/next-safe-middleware/pull/8) [`84944a4`](https://github.com/nibtime/next-safe-middleware/commit/84944a42dbd3ee8ce139fea01e62cc86ea123c8b) Thanks [@nibtime](https://github.com/nibtime)! - add reporting middleware to configure reporting according to Reporting API spec

* [#10](https://github.com/nibtime/next-safe-middleware/pull/10) [`2b8a0bb`](https://github.com/nibtime/next-safe-middleware/commit/2b8a0bbd6e0e102e5f31db0c53d449573503c80b) Thanks [@nibtime](https://github.com/nibtime)! - `strictDynamic` middleware for easier strict-CSP configuration. With baked-in fallback logic for browser non-support.

## 0.2.0

### Minor Changes

- [#3](https://github.com/nibtime/next-safe-middleware/pull/3) [`a1137ab`](https://github.com/nibtime/next-safe-middleware/commit/a1137aba24c534d43770442f3a5ee06f43bdb1de) Thanks [@nibtime](https://github.com/nibtime)! - bundle package with swc and rollup as cjs and esm

## 0.1.0

**This version has been unpublished from NPM because it uses a broken build config that makes the package unusable**

### Minor Changes

- [#1](https://github.com/nibtime/next-safe-middleware/pull/1) [`06456a8`](https://github.com/nibtime/next-safe-middleware/commit/06456a83764a825a677e41c1e37ae2861d561ada) Thanks [@nibtime](https://github.com/nibtime)! - initial release of @next-safe/middleware and its companion app for e2e testing
