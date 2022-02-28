import {
  chain,
  nextSafe,
  strictDynamic,
  reporting,
} from "@next-safe/middleware";

const isDev = process.env.NODE_ENV === "development";
const reportOnly = !!process.env.CSP_REPORT_ONLY;

const nextSafeMiddleware = nextSafe((req) => {
  return {
    isDev,
    contentSecurityPolicy: {
      reportOnly,
      "style-src": `'unsafe-inline'`,
      "connect-src": `'self' ${req.nextUrl.origin}`,
    },
    // customize as you need: https://trezy.gitbook.io/next-safe/usage/configuration
  };
});

const reportingMiddleware = reporting((req) => {
  const nextApiReportEndpoint = `${req.nextUrl.origin}/api/reporting`;
  return {
    csp: {
      reportUri: process.env.CSP_REPORT_URI || nextApiReportEndpoint,
      reportSample: true,
    },
    reportTo: {
      max_age: 1800,
      endpoints: [
        {
          url: process.env.REPORT_TO_ENDPOINT_DEFAULT || nextApiReportEndpoint,
        },
      ],
    },
  };
});

export default chain(nextSafeMiddleware, strictDynamic(), reportingMiddleware);
