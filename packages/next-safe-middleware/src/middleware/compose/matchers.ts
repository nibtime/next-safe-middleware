import type { NextRequestPredicate } from "./types";

export const matchNot =
  (matcher: NextRequestPredicate): NextRequestPredicate =>
  (req) =>
    !matcher(req);

export const matchAnd =
  (...matchers: NextRequestPredicate[]): NextRequestPredicate =>
  (req) => {
    let matches = true;
    for (const matcher of matchers) {
      matches = matcher(req);
      if (!matches) return matches;
    }
    return matches;
  };

export const matchOr =
  (...matchers: NextRequestPredicate[]): NextRequestPredicate =>
  (req) => {
    let matches = false;
    for (const matcher of matchers) {
      matches = matcher(req);
      if (matches) return matches;
    }
    return matches;
  };

export const isPagePathRequest: NextRequestPredicate = (req) => {
  const isNonPagePathPrefix = /^\/(?:_next|api)\//;
  const isFile = /\..*$/;
  const { pathname } = req.nextUrl;
  return !isNonPagePathPrefix.test(pathname) && !isFile.test(pathname);
};

export const isPreviewModeRequest: NextRequestPredicate = (req) =>
  !!req.cookies.get("__next_preview_data");

export const isNextJsDataRequest: NextRequestPredicate = (req) =>
  !!req.headers.get("x-nextjs-data");

export const isPageRequest = matchAnd(
  isPagePathRequest,
  matchNot(isPreviewModeRequest),
  matchNot(isNextJsDataRequest)
);
