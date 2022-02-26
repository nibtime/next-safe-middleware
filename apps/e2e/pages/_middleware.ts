import type { Middleware } from "@next-safe/middleware";
import {
  chain,
  nextSafe,
  provideHashesOrNonce,
  reporting
} from "@next-safe/middleware";
const isDev = process.env.NODE_ENV === "development";

const geoBlockMiddleware: Middleware = (req, evt, res, next) => {
  const BLOCKED_COUNTRY = "GB";
  const country = req.geo.country || "US";

  if (country === BLOCKED_COUNTRY) {
    const response = new Response("Blocked for legal reasons", { status: 451 });
    // returning response terminates the chain
    return response;
    // returning response with next would continue the chain with response as `res` param
    // return next ? next(response) : response;
  }
  // returning nothing continues the chain
};

const nextSafeWithStrictDynamic = nextSafe((req) => {
  // don't use strict-dynamic on `next dev`
  // Browser support of strict-dynamic: https://caniuse.com/?search=strict-dynamic
  // https://web.dev/strict-csp/#step-4:-add-fallbacks-to-support-safari-and-older-browsers
  const strictDynamic = !isDev
    ? {
        "script-src": [`'strict-dynamic'`, "https:", `'unsafe-inline'`],
      }
    : {};
  return {
    isDev,
    contentSecurityPolicy: {
      ...strictDynamic,
      "style-src": `'unsafe-inline'`,
    },
    // customize as you need: https://trezy.gitbook.io/next-safe/usage/configuration
  };
});

const reportingMiddleware = reporting({
  csp: {
    reportUri: "https://example.com/csp-report-uri",
    reportSample: true
  },
  reportTo: {
    max_age: 1800,
    endpoints: [
      {
        url: "https://example.com/reporting-api",
      },
    ],
  },
});

export default chain(
  nextSafeWithStrictDynamic,
  reportingMiddleware,
  provideHashesOrNonce
);
