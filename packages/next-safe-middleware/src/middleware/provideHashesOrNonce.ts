import { nanoid } from "nanoid";
import { uniq } from "ramda";
import type { NextRequest } from "next/server";
import type { CSP } from "../types";
import {
  cspDirectiveHas,
  extendCsp,
} from "../utils";
import {
  CSP_LOCATION_MIDDLEWARE,
  SCRIPT_HASHES_FILENAME,
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_NONCE_HEADER,
} from "../constants";
import type { Middleware } from "./types";
import { pullCspFromResponse, pushCspToResponse } from "./utils";

const singleQuotify = (value: string) => `'${value}'`;

const fetchScriptSrcHashes = async (req: NextRequest) => {
  // req.page.name is the name of the route, e.g. `/` or `/blog/[slug]`
  const route = req.page.name;
  const { origin, pathname } = req.nextUrl;
  let resHashes: Response | undefined;
  const baseUrl = `${origin}/${CSP_LOCATION_MIDDLEWARE}`;
  // route seems to get confused when there's a dynamic route and a
  // matching static route within the same folder. Attempt to fix that.
  // TODO: This is a hack, and should be removed once we found a better way to handle this.
  if (route !== pathname) {
    const hashesUrl = encodeURI(
      `${baseUrl}${pathname}/${SCRIPT_HASHES_FILENAME}`
    );
    resHashes = await fetch(hashesUrl);
  }
  if (!resHashes?.ok) {
    const hashesUrl = encodeURI(`${baseUrl}${route}/${SCRIPT_HASHES_FILENAME}`);
    resHashes = await fetch(hashesUrl);
  }
  if (!resHashes?.ok) {
    return undefined;
  }
  const hashesText = await resHashes.text();
  const hashes = hashesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return uniq(hashes).map(singleQuotify);
};

const setNonceHeader = (res: Response, nonce: string) => {
  if (!res.headers.get(CSP_NONCE_HEADER)) {
    res.headers.set(CSP_NONCE_HEADER, nonce);
  }
};

/**
 * A middleware that provides hashes of scripts for static routes (getStaticProps - Hash-based strict CSP) 
 * or a nonce (getServerSideProps - Nonce-based strict CSP) for dynamic routes.
 * 
 * Must be used together with the custom next/document component drop-ins of @next-safe/middleware
 * that wire it up with page prerendering.
 *   
 * @requires \@next-safe/middleware/dist/document
 */
const provideHashesOrNonce: Middleware = async (req, evt, res) => {
  if (!req.page.name || !res) {
    return;
  }
  const csp = pullCspFromResponse(res);
  if (!csp) {
    return;
  }
  try {
    let extendedCsp: CSP | undefined;
    const nonce = nanoid();
    const getCsp = () => extendedCsp || csp;
    if (cspDirectiveHas(csp, "script-src", /strict-dynamic/)) {
      const scriptSrcHashes = await fetchScriptSrcHashes(req);
      // if fetched hashes, it's a static page. Hash-based strict CSP
      if (scriptSrcHashes) {
        extendedCsp = extendCsp(getCsp(), {
          "script-src": scriptSrcHashes,
        });

      }
      // if not it's a dynamic page. Nonce-based strict CSP 
      else {
        extendedCsp = extendCsp(getCsp(), {
          "script-src": `'nonce-${nonce}'`,
        });
        setNonceHeader(res, nonce);
      }
    }
    if (extendedCsp) {
      pushCspToResponse(extendedCsp, res);
    }
  } catch (err) {
    console.error(
      "provideHashesOrNonce: Internal error. Enforcing CSP report-only mode to not break the app for your users.",
      err
    );
    const cspContent = res.headers.get(CSP_HEADER);
    if (cspContent) {
      res.headers.set(CSP_HEADER_REPORT_ONLY, cspContent);
      res.headers.delete(CSP_HEADER);
    }
  }
};

export default provideHashesOrNonce;
