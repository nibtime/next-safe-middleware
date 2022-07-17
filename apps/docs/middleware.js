import {
  chainMatch,
  isPageRequest,
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
      "img-src": [
        "self",
        "data:",
        "https://vercel.com",
        "https://img.shields.io",
        "https://*.githubusercontent.com",
        "https://gitpod.io",
      ],
      "font-src": ["self", "https://rsms.me"],
      "style-src": ["self", "https://rsms.me"],
    },
  }),
  strictDynamic(),
  strictInlineStyles(),
  reporting()
];

export default chainMatch(
  isPageRequest,
  !!process.env.MIDDLEWARE_LOG_PERFORMANCE ? "securityMiddleware" : undefined
)(...securityMiddleware);
