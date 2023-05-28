import {
  chainMatch,
  isPageRequest,
  csp,
  nextSafe,
  strictDynamic,
  strictInlineStyles,
  reporting,
  telemetry,
} from "@komw/next-safe-middleware";

const securityMiddleware = [
  nextSafe({ disableCsp: true }),
  csp({
    directives: {
      "img-src": ["self", "data:", "https://images.unsplash.com"],
      "font-src": ["self", "https://fonts.gstatic.com"],
    },
  }),
  strictDynamic(),
  strictInlineStyles(),
  reporting(),
];

const withTelemetry = telemetry({
  middlewares: securityMiddleware,
  profileLabel: "securityMiddleware",
  logHeaders: !!process.env.LOG_MIDDLEWARE_HEADERS,
  logExecutionTime: !!process.env.LOG_MIDDLEWARE_TIME,
});

export default chainMatch(isPageRequest)(withTelemetry);
