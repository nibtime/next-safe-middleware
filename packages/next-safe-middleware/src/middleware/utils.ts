import type { NextRequest } from "next/server";
import { uniq } from "ramda";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_LOCATION_MIDDLEWARE,
  SCRIPT_HASHES_FILENAME,
  STYLE_HASHES_FILENAME,
} from "../constants";
import type { CspDirectives, CspDirectivesLenient } from "../types";
import { fromCspContent, toCspContent } from "../utils";

export const setCspHeader = (
  cspContent: string,
  res: Response,
  reportOnly?: boolean
) => {
  const isReportOnly = reportOnly ?? !!res.headers.get(CSP_HEADER_REPORT_ONLY);
  if (isReportOnly) {
    res.headers.delete(CSP_HEADER);
    res.headers.set(CSP_HEADER_REPORT_ONLY, cspContent);
  } else {
    res.headers.delete(CSP_HEADER_REPORT_ONLY);
    res.headers.set(CSP_HEADER, cspContent);
  }
};

export const getCspHeader = (res: Response) => {
  return res.headers.get(CSP_HEADER) || res.headers.get(CSP_HEADER_REPORT_ONLY);
};

export const pullCspFromResponse: (
  res: Response
) => CspDirectives | undefined = (res) => {
  const cspContent = getCspHeader(res);
  if (cspContent) {
    return fromCspContent(cspContent);
  }
  return undefined;
};

export const pushCspToResponse = (
  csp: CspDirectives | CspDirectivesLenient,
  res: Response,
  reportOnly?: boolean
) => {
  setCspHeader(toCspContent(csp), res, reportOnly);
};

export const fetchHashes = async (
  req: NextRequest,
  hashesKind: typeof SCRIPT_HASHES_FILENAME | typeof STYLE_HASHES_FILENAME,
) => {
  const { origin } = req.nextUrl;
  const baseUrl = `${origin}/${CSP_LOCATION_MIDDLEWARE}`;

  // req.page.name is the name of the route, e.g. `/` or `/blog/[slug]`
  // req.page DEPRECATED in 12.2.
  // dececided to collect script hashes of all routes in single file so route info not needed
  // that solution is backwards compatible and wont break exisiting setup < 12.2
  const route = "/";

  let resHashes: Response | undefined;
  const hashesUrl = encodeURI(`${baseUrl}${route}${hashesKind}`);

  try {
    resHashes = await fetch(hashesUrl);
  } finally {
  }

  if (!resHashes) {
    return [];
  }
  try {
    const hashesText = await resHashes.text();
    const hashes = hashesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return uniq(hashes);
  } catch {
    return [];
  }
};
