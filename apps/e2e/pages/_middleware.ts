import {
  chain,
  csp,
  nextSafe,
  strictDynamic,
  strictInlineStyles,
  reporting,
} from "@next-safe/middleware";

const securityMiddleware = [
  nextSafe({ disableCsp: true }),
  csp({
    directives: {
      "frame-src": ["self"],
      "img-src": ["self", "data:", "https://images.unsplash.com"],
      "font-src": ["self", "https://fonts.gstatic.com"],
      "connect-src": ["self", "sentry.io"],
    },
  }),
  strictDynamic(),
  strictInlineStyles(),
  reporting({
    csp: {
      reportUri: "/api/reporting"
    },
    reportTo: {
      max_age: 1800,
      endpoints: [{ url: "/api/reporting" }],
    },
  }),
];

export default chain(...securityMiddleware);
