import type { NextRequest } from "next/server";

export const isPageRequest = (req: NextRequest) => {
  const excludedRegex = /^\/(?:_next|api|fonts?|assets?|images?|documents?)\//;
  return !excludedRegex.test(req.nextUrl.pathname);
};
