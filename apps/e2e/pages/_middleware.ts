import {
  chain,
  nextSafe,
  strictDynamic,
  reporting
} from "@next-safe/middleware";

const isDev = process.env.NODE_ENV === "development";

const nextSafeMiddleware = nextSafe((req, res) => {
  return {
    isDev,
    contentSecurityPolicy: {
      "style-src": `'unsafe-inline'`,
    },
    // customize as you need: https://trezy.gitbook.io/next-safe/usage/configuration
  };
});

const vercelUrl = process.env.VERCEL_URL
const reportEndpoint = vercelUrl ? `https://${vercelUrl}/api/reporting` : ""

const reportingMiddleware = reporting({
  csp: {
    reportUri: process.env.CSP_REPORT_URI || reportEndpoint || "https://example.com/csp-report-uri",
    reportSample: true
  },
  reportTo: {
    max_age: 1800,
    endpoints: [
      {
        url: process.env.CSP_REPORT_TO || reportEndpoint || "https://example.com/reporting-api",
      },
    ],
  },

});

export default chain(
  nextSafeMiddleware,
  strictDynamic(),
  reportingMiddleware
);
