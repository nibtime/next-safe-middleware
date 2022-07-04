

<div style="text-align:center">
  
  <img src=https://user-images.githubusercontent.com/52962482/177227813-b15198ca-2c36-4ba3-afec-efeb581a19a1.png height=75 width=75 />
  <h1><code>@next-safe/middleware</code></h1>
  <p><strong>Strict Content-Security-Policy (CSP) for Next.js</strong></p>
  <p>Works for hybrid apps and supports pages with any data fetching method.</p>
  <p>Always sets CSP by HTTP Response header and enables easy setup of reporting.</p>
  <p>I want this: <a href="#getting-started">How can I get started?</a></p>

<br>

[![Version][version-badge]][package]
[![Downloads][downloads-badge]][npmtrends]
[![MIT][license-badge]][license]

[![Release][release-status-badge]][release-status]

[![Star on GitHub][github-star-badge]][github-star]
[![Watch on GitHub][github-watch-badge]][github-watch]
[![Forks on GitHub][github-forks-badge]][github-forks]

</div>

[downloads-badge]: https://img.shields.io/npm/dm/next-safe.svg?style=flat-square
[github-watch]: https://github.com/nibtime/next-safe-middleware/watchers
[github-watch-badge]: https://img.shields.io/github/watchers/nibtime/next-safe-middleware.svg?style=social
[github-star]: https://github.com/nibtime/next-safe-middleware/stargazers
[github-star-badge]: https://img.shields.io/github/stars/nibtime/next-safe-middleware.svg?style=social
[github-forks]: https://github.com/nibtime/next-safe-middleware/network/members
[github-forks-badge]: https://img.shields.io/github/forks/nibtime/next-safe-middleware.svg?style=social
[license]: LICENSE
[license-badge]: https://img.shields.io/npm/l/@next-safe/middleware.svg?style=flat-square
[npmtrends]: https://www.npmtrends.com/@next-safe/middleware
[package]: https://npmjs.com/package/@next-safe/middleware
[release-status]: https://github.com/nibtime/next-safe-middleware/actions/workflows/release.yml
[release-status-badge]: https://img.shields.io/github/workflow/status/nibtime/next-safe-middleware/Release?style=flat-square&label=release
[version-badge]: https://img.shields.io/npm/v/@next-safe/middleware.svg?style=flat-square

## What
This package strives to make the setup and deployment of a [strict Content Security Policy (CSP)
](https://web.dev/strict-csp/) with Next.js an easy task. The design approach that makes this possible requires [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware), which has been introduced as Beta in [Next.js 12](https://nextjs.org/blog/next-12) and is stable since [Next.js 12.2](https://nextjs.org/blog/next-12-2).

This package handles all strict CSP conundrums for you and works for:

* pages with [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching/get-static-props) - **Hash-based**

* pages with [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props) - **Nonce-based** 

*  pages with [`getStaticProps` + `revalidate` (ISR)]((https://vercel.com/docs/concepts/next.js/incremental-static-regeneration)) - **Hash-based**
  

**This package always sets CSP as HTTP response header**. That enables violation reporting and report-only mode even for static pages. Plus, it provides a middleware and API handlers that make the setup of CSP violation reporting very easy. 

## Why
Configuring and maintaining a [Content-Security-Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) can be a tedious and error prone task. Furthermore, classic CSPs with a whitelist approach don't give you the security you might think you get from them, because in a lot of cases, they are automatically bypassable. 

There is a much better option: a [**Hash-based/Nonce-based strict CSP**](https://web.dev/strict-csp/).

Such CSPs provide much better security and have always the same structure, so they don't need the maintenance that whitelist CSPs need, once they've been set up properly. But this setup is usually a a very big issue with Next.js (and with all web frameworks in general).

This is where this package comes in: To make this setup easy, convenient and a lot less error-prone.


### More resources on (strict) CSPs:

* The best overview on strict CSPs: https://web.dev/strict-csp/

* Great slides from a conference talk, has lots of insights and field data: https://static.sched.com/hosted_files/locomocosec2019/db/CSP%20-%20A%20Successful%20Mess%20Between%20Hardening%20and%20Mitigation%20%281%29.pdf

* Great view on CSPs from an attacker's perspective: https://book.hacktricks.xyz/pentesting-web/content-security-policy-csp-bypass

* Good explanation of the `strict-dynamic` keyword: https://content-security-policy.com/strict-dynamic/

* Indispensible for testing: [The CSP Evaluator Extension for Google Chrome](https://chrome.google.com/webstore/detail/csp-evaluator/fjohamlofnakbnbfjkohkbdigoodcejf?hl=de)


## Getting started

install `@next-safe/middleware` from NPM

```bash
npm -i @next-safe/middleware
```

```bash
yarn add @next-safe/middleware
```

create a file `middleware.js` in your Next.js project folder (or `pages/_middleware.js` for 12 <= your Next.js version < 12.2):

```js
// middleware.js
import {
  chain,
  csp,
  strictDynamic,
} from '@next-safe/middleware';

 const securityMiddleware = [
   csp({
      // Your CSP base configuration.
      // You have full IntelliSense here and don't need to pay attention 
      // to single quotes for values like 'self' 
      directives: {
        'frame-src': ['self'],
        'img-src': ['self', 'data:', 'https://images.unsplash.com'],
        'font-src': ['self', 'https://fonts.gstatic.com'],
      }
   }),
   strictDynamic()
 ];

export default chain(...securityMiddleware);
```

create a file `pages/_document.js` in your Next.js project folder:

```jsx
// pages/_document.js
import {
  getCspInitialProps,
  provideComponents,
} from '@next-safe/middleware/dist/document';
import Document, { Html, Main } from 'next/document';

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

Thats it. You should be all set now with a strict CSP for your Next.js app!

### Hash-based strict CSP for pages with Incremental Static Regeneration (ISR)
Add the following code to the top of every route with `getStaticProps` that uses `revalidate` (including the new `res.unstable_revalidate`/`res.revalidate` of on-demand ISR, available since Next 12.1):

```js
export const config = {
  unstable_includeFiles: ['.next/static/chunks/**/*.js'],
};
```

## TypeScript
This package is written with 100% TypeScript and provides typings for full IntelliSense with CSP and middleware configuration. The typing for CSP directives is borrowed from [the CSP integration of SvelteKit](https://kit.svelte.dev/docs/types#additional-types-cspdirectives). 

Furthermore, most middlewares, functions, parameters and types have JSDoc that includes examples, explanations and links to related resources.   

## How to set up CSP violation reporting?

add the `reporting` middleware to your middleware chain in `middleware.js` or `pages/_middleware.js`:

```js
import {
  chain,
  csp,
  reporting,
  strictDynamic,
  strictInlineStyles,
} from '@next-safe/middleware';

const securityMiddleware = [
  csp(),
  strictDynamic(),
  reporting({
    csp: {
      reportUri: '/api/reporting',
    },
    reportTo: {
      max_age: 1800,
      endpoints: [
        {
          url: '/api/reporting',
        },
      ],
    },
  }),
];

export default chain(...securityMiddleware);
```

then, set up the reporting endpoint in `pages/api/reporting.js`:

```js
import { reporting } from '@next-safe/middleware/dist/api';

/** @type {import('@next-safe/middleware/dist/api').Reporter} */
const consoleLogReporter = (data) => console.log(JSON.stringify(data));

export default reporting(consoleLogReporter);
```

CSP violation reports will be send to this endpoint, both from `report-uri` and `report-to` directives. The data shape of reports is slightly different between both directives. The API handler parses the data  into a discriminated union and passes it to all reporter functions. You can pattern-match the data there with IntelliSense support.

### Ingest CSP violation reports to Sentry
If you use Sentry, there is a convenient helper `sentryCspReporterForEndpoint` to create a reporter, that ingests all CSP violations into your Sentry project:

```js
// pages/api/reporting.js
import { reporting, buildSentryCspReporter } from '@next-safe/middleware/dist/api';

// lookup at https://docs.sentry.io/product/security-policy-reporting/
const sentryCspEndpoint = process.env.SENTRY_CSP_ENDPOINT;
const sentryCspReporter = sentryCspReporterForEndpoint(sentryCspEndpoint);

export default reporting(sentryCspReporter);
```

Sentry only supports the data format of the `report-uri` directive. It can't receive violation reports in `report-to` format (Google Chrome only serves `report-to`). `sentryCspReporterForEndpoint` does the necessary conversion, so you will receive violation reports from all major browsers in Sentry.

## How to add custom (inline) scripts that work with strict CSP?
Just add them with `next/script` on the pages where you need them. If you want to include a script in all pages, add them to your `pages/app.js`. For examples, have a look at [`apps/e2e/pages/_app.tsx`](https://github.com/nibtime/next-safe-middleware/blob/main/apps/e2e/pages/_document.tsx).

### How this behaves behind the scenes
Scripts with strategies `afterInteractive` and `lazyOnLoad` will become trusted by transitive trust propagation of `strict-dynamic` and so will be all scripts that they load dynamically, etc. That should cover the majority of use cases.

Scripts with strategy `beforeInteractive` and scripts that are placed as children of `<Head>` in `_document.js` are picked up for CSP by this package. 

What this package will do with such scripts, depends:

#### Pages with getServerSideProps (Nonce-based)
the script element will eventually receive the nonce.
  
#### Pages with getStaticProps (Hash-based)
1. The script loads from `src` has an integrity attribute: The integrity attribute/hash will be picked up for CSP.
   
2. The script loads from `src` and doesn't have an integrity attribute: The script will be replaced by an inline proxy script that loads the script. The hash of this proxy script will be picked up for CSP. The actual script eventually becomes trusted by transitive trust propagation of `strict-dynamic`.

3. The script is an inline script: The inline code of the script will be hashed, the hash will be set as integrity attribute of the inline script and the hash will be picked up by CSP.  

## How to avoid the `unsafe-inline` keyword in `style-src` (with a CSS-in-JS framework)?
This package tries to provide a best effort solution to this, with a `strictInlineStyles` middleware. The e2e test app of this package comes with a setup that uses both [twin.macro](https://github.com/ben-rogerson/twin.macro) + [Stitches](https://stitches.dev/) and [Mantine](https://mantine.dev/) (uses emotion under the hood) without `unsafe-inline` in `style-src`. The following files serve as the references for such setups:

* [`apps/e2e/pages/_middleware.ts`](https://github.com/nibtime/next-safe-middleware/blob/main/apps/e2e/pages/_middleware.ts)

* [`apps/e2e/pages/_document.tsx`](https://github.com/nibtime/next-safe-middleware/blob/main/apps/e2e/pages/_document.tsx)

* [`apps/e2e/pages/_app.tsx`](https://github.com/nibtime/next-safe-middleware/blob/main/apps/e2e/pages/_app.tsx)

However, in the end this package might not always be able to solve this, as this issue is highly dependent on the actual CSS-in-JS framework and 3rd party libs (dynamically inject inline styles?) you use.

## How to set security headers other than CSP?
For this you can use the `nextSafe` middleware that wraps the [`next-safe`](https://www.npmjs.com/package/next-safe) package. Use it with CSP disabled and use the `csp` middleware for your CSP configuration instead, like so:

```js
// middleware.js
import {
  chain,
  csp,
  nextSafe,
  strictDynamic,
} from '@next-safe/middleware';

 const securityMiddleware = [
   nextSafe({ disableCsp: true })
   csp(),
   strictDynamic(),
 ];

export default chain(...securityMiddleware);
```

The configuration options of the `nextSafe` middleware are the same as documented at https://trezy.gitbook.io/next-safe/usage/configuration


## How to compose with other middleware?

In your `middleware.js` or `pages/_middleware.js` you might potentially want to do more interesting things than just setting security headers. However, Next.js doesn't offer an idiomatic abstraction for composing middlewares yet.

That's why this package provides a minimal and simple abstraction for composing/chaining multiple middlewares within the `middleware.js` file. For this, it provides a function **`chain`**, that accepts an array of type `ChainableMiddleware`:

```ts
type NextMiddlewareResult = NextResponse | Response | null | undefined | void;

// this is the Middleware spec of Next.js
type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

// this is the extended spec for chainable middleware this package uses 
type ChainableMiddleware = (
  ...params: [
    ...spec: Parameters<NextMiddleware>,
    res?: Response,
    next?: (res: Response) => void
  ]
) => ReturnType<NextMiddleware>;
```

The `ChainableMiddleware` interface is compatible with the Next.js spec (what needs to be exported from `middleware.js`) and provides additional handles for the composition context with **`chain`**:  

**`req`**: https://vercel.com/docs/concepts/functions/edge-functions#nextrequest

**`evt`**: https://vercel.com/docs/concepts/functions/edge-functions#nextfetchevent

**`res`** (in chain context): a continued response from further left in the chain. Middleware further right in the chain can modify it, by adding/changing headers, cookies etc.

**`next`** (in chain context): a function to signal that middleware further right in the chain should continue execution with the passed response. 

In chain context, the return value of `ChainableMiddleware` is interpreted as follows:

* a middleware returns a response: `chain` gets terminated. Middlewares to its right in the chain don't execute
* a middleware returns nothing: `chain` continues with the middleware to its right
* a middleware passes a response to **`next`** and returns nothing: `chain` continues with the middleware to its right, with the response available in **`res`** parameter of the next middleware. 

Here's an example to show how you can combine security middleware from this package with other middleware by using **`chain`**:

```js
// middleware.js
import { chain, csp, strictDynamic } from '@next-safe/middleware';

/** @type {import('@next-safe/middleware').ChainableMiddleware} */
const geoBlockMiddleware = (req) => {
  const BLOCKED_COUNTRY = 'GB';
  const country = req.geo.country || 'US';

  if (country === BLOCKED_COUNTRY) {
    const response = new Response('Blocked for legal reasons', { status: 451 });
    // returning response terminates the chain
    return response
  }
}

const securityMiddleware = [
  csp(),
  strictDynamic(),
]

// security middleware will only run on requests that didn't get geo-blocked
export default chain(geoBlockMiddleware, ...securityMiddleware)
```

### Can CSP/middleware configuration depend on request data?
Yes. In fact every middleware of this package supports configuration with an (async) initializer function, that receives the request as 1st param (in `req`), the currently set response of the middleware chain as 2nd (in `res`) and for convenience, a `uaParser` instance prepared with the user agent of the request as 3rd (from [`ua-parser-js`](https://www.npmjs.com/package/ua-parser-js), prebundled and minified with this package, for IntelliSense install `@types/ua-parser-js` in your project.

For example, you can use this capability to select different CSP configurations for different user agents:
```js
// middleware.js
import {
  chain,
  csp,
  strictDynamic,
} from '@next-safe/middleware';

// CSP in always in report-only mode for Firefox and by env var for other browsers
const cspMiddleware = csp(async (req, res, uaParser) => {
  const browserName = uaParser.getBrowser().name || '';
  const reportOnly = !!process.env.CSP_REPORT_ONLY  || browserName.includes('Firefox');
  return {
    reportOnly
  };
}),

const securityMiddleware = [
  cspMiddleware,
  strictDynamic(),
];

export default chain(...securityMiddleware);

```
