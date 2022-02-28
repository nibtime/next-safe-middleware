# @next-safe/middleware

## What and Why
this is an extension of the [**next-safe**](https://github.com/trezy/next-safe) package for [**Next 12 Middleware**](https://nextjs.org/docs/middleware).

At its bare minimum it is an alternative method to configure `next-safe` as described in https://trezy.gitbook.io/next-safe/quick-start#usage. Yet, it is more flexible and powerful because you can build your config from request data of type [`NextRequest`](https://nextjs.org/docs/api-reference/next/server#nextrequest) and can use any V8 compatible code for it. 

On top of that, it enables a new class of patterns and solutions that are highly desirable, but weren't feasible before Next 12 without middleware. 

Like the one that is the main purpose why this package has been created: **CSP3 strict-dynamic support for hybrid Next.js applications**. For pages with [`getStaticProps` - Hash-based](https://nextjs.org/docs/basic-features/data-fetching/get-static-props), [`getServerSideProps` - Nonce-based](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props) and [`getStaticProps` + `revalidate` (ISR) - Hash-based](https://vercel.com/docs/concepts/next.js/incremental-static-regeneration)

Why you might want to have that and more infos on it:

* https://web.dev/strict-csp/
* https://owasp.org/www-pdf-archive/2017-04-20-OWASPNZ-SpagnuoloWeichselbaum.pdf

## Quickstart

First, install `@next-safe/middleware`:

```bash
npm -i @next-safe/middleware
```

```bash
yarn add @next-safe/middleware
```

Then, create a file `pages/_middleware.(js|ts)` and ...

... go with the minimal possible config and `next-safe` defaults:

```js
import { nextSafe } from '@next-safe/middleware';

const isDev = process.env.NODE_ENV === 'development';

export default nextSafe({ isDev })
```

... or go with a config that gives you more flexiblity for custom configuration: 
```js
import { nextSafe } from '@next-safe/middleware';

const isDev = process.env.NODE_ENV === 'development';

// req is of type NextRequest
const middleware = nextSafe((req) => ({
  isDev
  // next-safe config: https://trezy.gitbook.io/next-safe/usage/configuration
  // you can do conditional spreading based on req here or do more complex things in the function body.
}));

export default middleware;
```

## Demo project
There's a demo project available: https://github.com/nibtime/demo-next-safe-middleware.

You can quickly edit, test and run on StackBlitz or deploy to Vercel from there.

## With CSP3 strict-dynamic

Create a file `pages/_middleware.(js|ts)`:

```js
import { chain, nextSafe, strictDynamic } from '@next-safe/middleware';

const isDev = process.env.NODE_ENV === 'development';

export default chain(nextSafe({ isDev }), strictDynamic());
```

Then, create a custom `pages/_document.(jsx|tsx)`:

```jsx
import Document, { provideComponents } from '@next-safe/middleware/dist/document';
import { Html, Main } from 'next/document';
import React from 'react';

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps
  }

  render() {
    // those components are automagically wired with strictDynamic
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

### How can I add custom scripts?

Do not add any script tags to your custom `_document`, use [`next/script`](https://nextjs.org/docs/basic-features/script) instead!

It comes with 3 strategies: `beforeInteractive`, `afterInteractive` and `lazyOnLoad`.

`<Script>` tags with the latter two will be inserted after Next has loaded, which is then already trusted. With strict-dynamic, trust is propagated transitively if an already trusted script adds another script in "non-parser-inserted" fashion (which is the case here). So those scripts don't need to be considered for CSP.

`<Script>` tags with the `beforeInteractive` strategy will appear in prerendered HTML of pages just above the Next framework scripts, so either their hash must appear in CSP (Hash-based) or the nonce from CSP must be attached to them (Nonce-based). Placing scripts with this strategy is very similar to putting the scripts in the `<Head>` of your custom `_document`, however with the additional benefit of a per-route basis decision. If you need a script on all pages, you can place it in `_app`.

Fortunately, this is handled by this package. Look at the following `pages/_app.js`:

```js
import Script from 'next/script';

const customInlineScriptBefore = `console.log('Hi I am inline-script running with strategy beforeInteractive')`;

const customInlineScriptAfter = `console.log('Hi I am an inline-script running with strategy afterInteractive')`;

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Script
        id="inline-before-test-script"
        // if you for some reason must use a inline script with beforeInteractive
        // offically unsupported: https://nextjs.org/docs/basic-features/script#inline-scripts
        // this is mostly equivalent to putting it in the Head of _document. 
        // However, this way your inline script code gets automatically hashed and picked up for 
        // Hash-based CSP routes or gets assigned a nonce for Nonce-based CSP routes
        strategy="beforeInteractive"
      >
        {customInlineScriptBefore}
      </Script>
      <Script
        id="sentry-script"
        strategy="beforeInteractive"
        src="https://browser.sentry-cdn.com/6.16.1/bundle.min.js"
        // the script will get assigned a nonce for Nonce-based CSP routes
        // the integrity attribute will be picked up for Hash-based CSP routes
        integrity="sha384-WkFzsrcXKeJ3KlWNXojDiim8rplIj1RPsCbuv7dsLECoXY8C6Cx158CMgl+O+QKW"
        // crossOrigin attribute gets dropped by Next somehow which leads to a CORS error with integrity. Add it with data-crossorigin in this case, will be picked up
        data-crossorigin="anonymous"
      />
      <Script 
        id="inline-after-test-script" 
        // in most cases use your inline scripts with afterInteractive. 
        // That way they will be inserted by Next and don't need to be nonced or hashed. 
        // Also, the whole DOM will be available at this point, in beforeInteractive it is not.
        strategy="afterInteractive">
        {customInlineScriptAfter}
      </Script>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

```

### Hash-based CSP support for pages with ISR
Add the following code to the top of every route with `getStaticProps` that uses `revalidate` (including the new `unstable_revalidate` for on-demand ISR of Next 12.1):

```js
export const config = {
  unstable_includeFiles: ['.next/static/chunks/**/*.js'],
};
```

### Evaluate your CSP
To test and evaluate the CSP of your website, you can use this tool: https://csp-evaluator.withgoogle.com/.

The tool also has a [Chrome Extension](https://chrome.google.com/webstore/detail/csp-evaluator/fjohamlofnakbnbfjkohkbdigoodcejf) that is much more convenient to use. With this you can browse the routes of your website and see immediately what's going on with CSP.

## Compose middleware

At this moment, Next 12 doesn't provide a abstraction to compose modular pieces of logic within the same `_middleware` file.

In your top-level `pages/_middleware` you might potentially want to do more interesting things than just setting security headers.

That's why `@next-safe/middleware` provides a minimal and simple abstraction for composing/chaining multiple middlewares within the same `_middleware` file. For this, it provides a function **`chain`**, that accepts an array of type `Middleware`:

```ts
type Middleware = (
	req: NextRequest,
	evt: NextFetchEvent,
	res?: Response,
	next?: (res: Response) => void
) => Promise<Response | void> | Response | void;
```

This interface conforms to the Next.js spec (what is expected to be exported from `_middleware` files) and provides additional handles for the composition context with **`chain`**:  

**`req`**: https://vercel.com/docs/concepts/functions/edge-functions#nextrequest

**`evt`**: https://vercel.com/docs/concepts/functions/edge-functions#nextfetchevent

**`res`** (in chain context): a continued response from further left in the chain. Middleware further right in the chain can modify it, by adding/changing headers, cookies etc.

**`next`** (in chain context): a function to signal that middleware further right in the chain should continue execution with the passed response. 

In chain context, return value of `Middleware` is interpreted as follows:

* a middleware returns a response: Chain is terminated. Middlewares to its right in the chain don't execute
* a middleware returns nothing: Chain continues with the middleware to its right
* a middleware returns a response with **`next`**: Chain continues with the middleware to its right and the returned response is available in **`res`**. 

here's an example how you can combine stuff from `@next-safe/middleware` with other interesting stuff like geo blocking by using **`chain`**:

```ts
import type { Middleware } from '@next-safe/middleware';
import { chain, nextSafe } from '@next-safe/middleware';


const geoBlockMiddleware: Middleware = (req, evt, res, next) => {
  const BLOCKED_COUNTRY = 'GB';
  const country = req.geo.country || 'US';

  if (country === BLOCKED_COUNTRY) {
    const response = new Response('Blocked for legal reasons', { status: 451 });
    // returning response terminates the chain
    return response
    // returning response with next continues the chain with response as `res` param
    // next will only be available in chain context, not if used as standalone middleware 
    return next ? next(response) : response
  }
  // returning nothing continues the chain
}

const isDev = process.env.NODE_ENV === 'development';

// nextSafe is a constructor for type Middleware
// nextSafe internally returns its response with `next`
// so middleware to it's right can pick up on it
const nextSafeMiddleware: Middleware = nextSafe({ isDev })

export default chain(geoBlockMiddleware, nextSafeMiddleware)

// standalone exports work as well because Middleware interface conforms to Next.js spec
export default geoBlockMiddleware
export default nextSafeMiddleware

```

### Tip: How to get IntelliSense in js files
If you don't want to use TypeScript you can code your custom middlewares against the `Middleware` spec anyways by doing this:

```js 
/** @type {import('@next-safe/middleware').Middleware} */
const geoBlockMiddleware = (req, evt, res, next) => {
  ...
}
```

This will work when you have TypeScript enabled in your Next project. To do that, create an empty `tsconfig.json` file in the root of your Next project and run: 

```
npm -i typescript @types/node @types/react --save-dev
```

```
yarn add typescript @types/node @types/react -D
```

The next time you run `next dev` you're all set up. It's a great way to explore TypeScript bit by bit, without being coerced into anything.