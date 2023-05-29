import {
  chainMatch,
  isPageRequest,
  csp,
  nextSafe,
  strictDynamic,
  strictInlineStyles,
  reporting,
} from "@komw/next-safe-middleware";

const securityMiddleware = [
  nextSafe({ disableCsp: true }),
  csp({
    "directives": {
      "font-src": [
        "https://rsms.me"
      ],
      "img-src": [
        "self",
        "data:",
        "https://avatars.githubusercontent.com",
        "https://gitpod.io",
        "https://img.shields.io",
        "https://vercel.com"
      ],
      "style-src": [
        "self",
        "https://rsms.me/inter/"
      ],
    }
  }),
  strictDynamic(),
  strictInlineStyles(),
  reporting(),
];

export default chainMatch(isPageRequest)(...securityMiddleware);
