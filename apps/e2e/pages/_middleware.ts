import {
  chain,
  nextSafe,
  strictDynamic,
  strictInlineStyles,
  reporting,
} from "@next-safe/middleware";

const isDev = process.env.NODE_ENV === "development";
const reportOnly = !!process.env.CSP_REPORT_ONLY;

const nextSafeMiddleware = nextSafe((req) => {
  return {
    isDev,
    contentSecurityPolicy: {
      reportOnly
    },
    // customize as you need: https://trezy.gitbook.io/next-safe/usage/configuration
  };
});

const reportingMiddleware = reporting((req) => {
  const nextApiReportEndpoint = `/api/reporting`;
  return {
    csp: {
      reportUri: process.env.CSP_REPORT_URI || nextApiReportEndpoint,
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

const securityMiddleware = [
  nextSafeMiddleware,
  strictDynamic(),
  strictInlineStyles({
    extendStyleSrc: false
  }),
  reportingMiddleware,
];

export default chain(...securityMiddleware);
