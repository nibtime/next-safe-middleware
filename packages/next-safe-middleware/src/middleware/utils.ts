import type { NextRequest } from "next/server";
import { encode as base64Encode  } from 'base-64'
import { uniq } from "ramda";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_LOCATION_MIDDLEWARE,
  CSP_NONCE_HEADER,
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

export const generateNonce = (bits = 128) => {
  const buffer = new Uint8Array(Math.floor(bits / 8));
  const random = crypto.getRandomValues(buffer);
  return base64Encode([...random].join(""));
}

export const cspNonce = (res: Response, bits = 128) => {
  let nonce = res.headers.get(CSP_NONCE_HEADER);
  if (!nonce) {
    nonce = generateNonce(bits);
    res.headers.set(CSP_NONCE_HEADER, nonce);
  }
  return nonce;
};

export const fetchHashes = async (
  req: NextRequest,
  hashesKind: typeof SCRIPT_HASHES_FILENAME | typeof STYLE_HASHES_FILENAME,
  overrideFetchpath?: string
) => {
  const { origin, pathname } = req.nextUrl;
  const baseUrl = `${origin}/${CSP_LOCATION_MIDDLEWARE}`;

  // req.page.name is the name of the route, e.g. `/` or `/blog/[slug]`
  const route = req.page.name;

  let resHashes: Response | undefined;

  const fetchPaths = [
    ...(overrideFetchpath ? [overrideFetchpath] : []),
    ...(!route ? ["/404"] : []),
    // route seems to get confused when there's a dynamic route and a
    // matching static route within the same folder. Attempt to fix that.
    // TODO: This is a hack, and should be removed once we found a better way to handle this.
    ...(route ? (route !== pathname ? [pathname, route] : [route]) : []),
  ];
  const fetchUrls = fetchPaths.map((fetchPath) =>
    encodeURI(`${baseUrl}${fetchPath}/${hashesKind}`)
  );
  for (const url of fetchUrls) {
    if (!resHashes?.ok) {
      resHashes = await fetch(url);
    }
  }
  if (!resHashes?.ok) {
    return undefined;
  }
  const hashesText = await resHashes.text();
  const hashes = hashesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return uniq(hashes);
};
