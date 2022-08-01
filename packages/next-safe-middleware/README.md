<div align="center">
  <br />
  <img src=https://user-images.githubusercontent.com/52962482/177227813-b15198ca-2c36-4ba3-afec-efeb581a19a1.png height=75 width=75 />
  <h1><code>@next-safe/middleware</code></h1>
  <p><strong>Strict Content-Security-Policy (CSP) for Next.js with composable middleware</strong></p>
  <p>Works for hybrid apps and supports pages with any data fetching method.</p>
  <p>Always sets CSP by HTTP Response header and enables easy setup of reporting.</p>

  <br />

  [![Version][version-badge]][package]
  [![Downloads][downloads-badge]][npmtrends]
  [![MIT][license-badge]][license]

  [![Release][release-status-badge]][release-status]

  <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<p><a href="#contributors"><img src="https://img.shields.io/badge/all_contributors-8-orange.svg?style=flat-square"></img></a></p>
<!-- ALL-CONTRIBUTORS-BADGE:END -->

  [![Star on GitHub][github-star-badge]][github-star]
  [![Watch on GitHub][github-watch-badge]][github-watch]
  [![Forks on GitHub][github-forks-badge]][github-forks]

  
  <br />

  <h2>
  
  <a href="#getting-started">Getting started</a>
  
  <a href="https://next-safe-middleware.vercel.app" target="_blank" rel="noopener noreferrer">Read the docs</a>

  <a href="#contributors" target="_blank" rel="noopener noreferrer">Contribute</a>

  </h2>

  <br />
  <br />

</div>

[package]: https://npmjs.com/package/@next-safe/middleware
[npmtrends]: https://www.npmtrends.com/@next-safe/middleware

[version-badge]: https://img.shields.io/npm/v/@next-safe/middleware.svg?style=flat-square
[downloads-badge]: https://img.shields.io/npm/dm/next-safe.svg?style=flat-square
[license]: LICENSE
[license-badge]: https://img.shields.io/github/license/nibtime/next-safe-middleware?style=flat-square

[release-status]: https://github.com/nibtime/next-safe-middleware/actions/workflows/release.yml
[release-status-badge]: https://img.shields.io/github/workflow/status/nibtime/next-safe-middleware/Release?style=flat-square&label=release

[github-watch]: https://github.com/nibtime/next-safe-middleware/watchers
[github-watch-badge]: https://img.shields.io/github/watchers/nibtime/next-safe-middleware.svg?style=social
[github-star]: https://github.com/nibtime/next-safe-middleware/stargazers
[github-star-badge]: https://img.shields.io/github/stars/nibtime/next-safe-middleware.svg?style=social
[github-forks]: https://github.com/nibtime/next-safe-middleware/network/members
[github-forks-badge]: https://img.shields.io/github/forks/nibtime/next-safe-middleware.svg?style=social

## What
This package strives to make the setup and deployment of a [Strict Content Security Policy (CSP)
](https://web.dev/strict-csp/) with Next.js an easy task. The design approach that makes this possible requires [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware), which has been introduced as Beta in [Next.js 12](https://nextjs.org/blog/next-12) and is stable since [Next.js 12.2](https://nextjs.org/blog/next-12-2).

This package handles all Strict CSP conundrums for you and works for:

* pages with [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching/get-static-props) - **Hash-based**

* pages with [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props) - **Nonce-based** 

* pages with [`getStaticProps` + `revalidate` (ISR)](https://vercel.com/docs/concepts/next.js/incremental-static-regeneration) - **Hash-based**
  

**This package always sets CSP as HTTP response header**. That enables violation reporting and report-only mode even for static pages. Plus, it provides a middleware and API handlers that make the setup of CSP violation reporting very easy.


## Why
Configuring and maintaining a [Content-Security-Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) can be a tedious and error prone task. Furthermore, classic CSPs with a whitelist approach don't give you the security you might think you get from them, because in a lot of cases, they are automatically bypassable. 

There is a much better option: a [**Hash-based/Nonce-based Strict CSP**](https://web.dev/strict-csp/).

Such CSPs provide much better security and have always the same structure, so they don't need the maintenance that whitelist CSPs need, once they've been set up properly. But this setup is usually a a very big issue with Next.js (and with all web frameworks in general).

This is where this package comes in: To make this setup easy, convenient and a lot less error-prone.


### Good Resources about (Strict) Content-Security-Policy (CSP)

* The best overview on Strict CSPs: https://web.dev/strict-csp/

* Great slides from a conference talk, has lots of insights and field data: https://static.sched.com/hosted_files/locomocosec2019/db/CSP%20-%20A%20Successful%20Mess%20Between%20Hardening%20and%20Mitigation%20%281%29.pdf

* Great view on CSPs from an attacker's perspective: https://book.hacktricks.xyz/pentesting-web/content-security-policy-csp-bypass

* Good explanation of the `strict-dynamic` keyword: https://content-security-policy.com/strict-dynamic/

* Indispensible for testing: [The CSP Evaluator Extension for Google Chrome](https://chrome.google.com/webstore/detail/csp-evaluator/fjohamlofnakbnbfjkohkbdigoodcejf?hl=de)

* Great tool to record CSP sources by browsing your site: [The Laboratory Extension for Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/laboratory-by-mozilla/)

## Getting started

Install `@next-safe/middleware` from NPM

```bash
npm -i @next-safe/middleware
```

```bash
yarn add @next-safe/middleware
```

### Quickstart: Strict Content-Security-Policy (CSP)

Create the file `middleware.js` in your Next.js project folder:

```js
// middleware.js
import {
  chainMatch,
  isPageRequest,
  csp,
  strictDynamic,
} from "@next-safe/middleware";

const securityMiddleware = [
  csp({
    // your CSP base configuration with IntelliSense
    // single quotes for values like 'self' are automatic
    directives: {
      "img-src": ["self", "data:", "https://images.unsplash.com"],
      "font-src": ["self", "https://fonts.gstatic.com"],
    },
  }),
  strictDynamic(),
];

export default chainMatch(isPageRequest)(...securityMiddleware);
```

Create the file `pages/_document.js` in your Next.js project folder:

```jsx
// pages/_document.js
import {
  getCspInitialProps,
  provideComponents,
} from "@next-safe/middleware/dist/document";
import Document, { Html, Main } from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await getCspInitialProps({ ctx });
    return initialProps;
  }
  render() {
    const { Head, NextScript } = provideComponents(this.props);
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

For every page under `pages` that uses `getServerSideProps` for data fetching:

```js
import { gsspWithNonce } from "@next-safe/middleware/dist/document";

// wrap data fetching with gsspWithNonce 
// to generate a nonce for CSP
export const getServerSideProps = gsspWithNonce(async (ctx) => {
  return { props: { message: "Hi, from getServerSideProps" } };
});

// the generated nonce also gets injected into page props
const Page = ({ message, nonce }) => <h1>{`${message}. Nonce ${nonce}`}</h1>;

export default Page;
```

Thats it. You should be all set now with a Strict CSP for your Next.js app!

### Quickstart: CSP Violation Reporting

Add the `reporting` middleware in `middleware.js`:

```js
// middleware.js
import {
  chainMatch,
  isPageRequest
  csp,
  reporting,
  strictDynamic,
  strictInlineStyles,
} from '@next-safe/middleware';

const securityMiddleware = [
  csp(),
  strictDynamic(),
  reporting(),
];

export default chainMatch(isPageRequest)(...securityMiddleware);
```

Create the file `pages/api/reporting.js` to set up the reporting endpoint:

```js
// pages/api/reporting.js
import { reporting } from "@next-safe/middleware/dist/api";

/** @type {import('@next-safe/middleware/dist/api').Reporter} */
const consoleLogReporter = (data) =>
  console.log(JSON.stringify(data, undefined, 2));

export default reporting(consoleLogReporter);
```

Thats it. Browsers will send CSP violation reports to this endpoint. You can easily react on validated reporting data by adding any number of custom reporters.

#### Send violation reports to Sentry

If you use [Sentry](https://sentry.io) for monitoring your app, there is a convenient helper `sentryCspReporterForEndpoint` to create a reporter, that ingests all CSP violations into your Sentry project:

```jsx
// pages/api/reporting.js
import {
  reporting,
  sentryCspReporterForEndpoint,
} from "@next-safe/middleware/dist/api";

// lookup at https://docs.sentry.io/product/security-policy-reporting/
const sentryCspEndpoint = process.env.SENTRY_CSP_ENDPOINT;
const sentryCspReporter = sentryCspReporterForEndpoint(sentryCspEndpoint);

export default reporting(sentryCspReporter);
```

### Quickstart: Compose middleware

Here's an example to show how you can combine security middleware from this package with your custom middleware by using `chain` and `chainMatch`:

```js
// middleware.js
import {
  chain,
  chainMatch,
  isPageRequest,
  csp,
  strictDynamic,
} from "@next-safe/middleware";

/** @type {import('@next-safe/middleware').ChainableMiddleware} */
const geoBlockMiddleware = (req) => {
  const BLOCKED_COUNTRY = "GB";
  const country = req.geo.country || "US";

  if (country === BLOCKED_COUNTRY) {
    const response = new Response("Blocked for legal reasons", { status: 451 });
    // returning response terminates the chain
    return response;
  }
};

const securityMiddleware = [csp(), strictDynamic()];

/** 
 * geoBlockMiddleware will be invoked on all requests 
 * from `BLOCKED_COUNTRY` and then block the request 
 * and terminate chain by returning a response with status 451
 * 
 * securityMiddleware will only run on requests
 * that didn't get geo-blocked and only on requests for pages
 */
export default chain(
  geoBlockMiddleware,
  chainMatch(isPageRequest)(...securityMiddleware)
);
```

If you only want to use the composition features from this package, there's an extra bundle `@next-safe/middleware/dist/compose` just for that.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<br />

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/nibtime"><img src="https://avatars.githubusercontent.com/u/52962482?v=4?s=100" width="100px;" alt=""/><br /><sub><b>nibtime</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/commits?author=nibtime" title="Code">💻</a> <a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3Anibtime" title="Bug reports">🐛</a> <a href="https://github.com/nibtime/next-safe-middleware/commits?author=nibtime" title="Documentation">📖</a> <a href="#infra-nibtime" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/nibtime/next-safe-middleware/commits?author=nibtime" title="Tests">⚠️</a> <a href="#ideas-nibtime" title="Ideas, Planning, & Feedback">🤔</a> <a href="#example-nibtime" title="Examples">💡</a></td>
    <td align="center"><a href="https://github.com/alexturpin"><img src="https://avatars.githubusercontent.com/u/134339?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex Turpin</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3Aalexturpin" title="Bug reports">🐛</a> <a href="https://github.com/nibtime/next-safe-middleware/commits?author=alexturpin" title="Documentation">📖</a> <a href="#ideas-alexturpin" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/Neki"><img src="https://avatars.githubusercontent.com/u/2143664?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Benoît Faucon</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3Aneki" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://uxsd.io/"><img src="https://avatars.githubusercontent.com/u/1551001?v=4?s=100" width="100px;" alt=""/><br /><sub><b>René Schubert</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3Arenet" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://benhodgson.net"><img src="https://avatars.githubusercontent.com/u/189707?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ben Hodgson</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3Abenhodgson87" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://sbw.one"><img src="https://avatars.githubusercontent.com/u/908178?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Stephan Bönnemann-Walenta</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/commits?author=boennemann" title="Code">💻</a></td>
    <td align="center"><a href="https://cian.ru/"><img src="https://avatars.githubusercontent.com/u/2459175?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Shamil Yakupov</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3AShamilik" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/DuCanhGH"><img src="https://avatars.githubusercontent.com/u/75556609?v=4?s=100" width="100px;" alt=""/><br /><sub><b>DuCanhGH</b></sub></a><br /><a href="https://github.com/nibtime/next-safe-middleware/issues?q=author%3ADuCanhGH" title="Bug reports">🐛</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

<br />

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome! Check out the [contributing guide](https://next-safe-middleware.vercel.app/CONTRIBUTING) for getting started!