import { uniq } from "ramda";
import type { NextRequest } from "next/server";
import uaParser from "ua-parser-js";
import type { CSP } from "../types";
import { extendCsp } from "../utils";
import { CSP_LOCATION_MIDDLEWARE, SCRIPT_HASHES_FILENAME } from "../constants";
import type { Middleware } from "./types";
import {
  cspNonce,
  pullCspFromResponse,
  pushCspToResponse
} from "./utils";

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

const getSupportInfo = (req: NextRequest) => {
  const ua = new uaParser(req.headers.get("user-agent"));
  const browserName = ua.getBrowser().name;
  const isFirefox = browserName.includes("Firefox");
  const isSafari = browserName.includes("Safari");
  const supportsStrictDynamic = !isSafari;
  const supportsHashBased = !isFirefox;

  return {
    supportsStrictDynamic,
    supportsHashBased,
  };
};

export type StrictDynamicCfg = {
  /**
   * A fallback value for the `script-src` directive. Used for browsers that don't support `'strict-dynamic'`
   *
   * Defaults to `https: 'unsafe-inline'`
   *
   * @see https://caniuse.com/?search=strict-dynamic
   * @see https://web.dev/strict-csp/#step-4:-add-fallbacks-to-support-safari-and-older-browsers
   *
   * It is also possible, that browsers support 'strict-dynamic', but don't support Hash-based (like Firefox).
   * In this case, static routes will use the fallback value for script-src and dynamic routes will use a Nonce-based strict CSP.
   *
   * @see  https://github.com/nibtime/next-safe-middleware/issues/5
   */
  fallbackScriptSrc?: string;
};

/**
 * @see https://web.dev/strict-csp/
 * 
 * @param cfg A configuration object for a strict Content Security Policy (CSP)
 * 
 * @returns
 * a middleware that provides a strict CSP. It will ensure to include hashes of scripts for static routes (`getStaticProps` - Hash-based strict CSP)
 * or a nonce for dynamic routes (`getServerSideProps` - Nonce-based strict CSP).
 * 
 * Must be used together with custom `next/document` component drop-ins
 * that wire it up with page prerendering.
 *
 * @requires \@next-safe/middleware/dist/document
 *
 * @example
 *
 * import { chain, nextSafe, strictDynamic } from '@next-safe/middleware'
 *
 * const isDev = process.env.NODE_ENV === 'development'
 *
 * export default chain(nextSafe({ isDev }), strictDynamic())
 *
 */
const strictDynamic: (cfg?: StrictDynamicCfg) => Middleware =
  ({ fallbackScriptSrc } = {}) =>
  async (req, evt, res) => {
    if (process.env.NODE_ENV === "development" || !req.page.name || !res) {
      return;
    }
    const csp = pullCspFromResponse(res);
    if (!csp) {
      return;
    }
    const fallback = fallbackScriptSrc || `https: 'unsafe-inline'`;
    try {
      const { supportsHashBased, supportsStrictDynamic } = getSupportInfo(req);

      if (!supportsStrictDynamic) {
        pushCspToResponse(
          extendCsp(
            csp,
            {
              "script-src": fallback,
            },
            "override"
          ),
          res
        );
        return;
      }

      let extendedCsp: CSP | undefined;
      const getCsp = () => extendedCsp || csp;
      const scriptSrcHashes = await fetchScriptSrcHashes(req);
      // if fetched hashes, it's a static page. Hash-based strict CSP
      if (scriptSrcHashes) {
        if (supportsHashBased) {
          extendedCsp = extendCsp(
            getCsp(),
            {
              "script-src": [
                `'strict-dynamic' ${fallback}`,
                ...scriptSrcHashes,
              ],
            },
            "override"
          );
        } else {
          extendedCsp = extendCsp(
            getCsp(),
            {
              "script-src": fallback,
            },
            "override"
          );
        }
      }
      // if not it's a dynamic page. Nonce-based strict CSP
      else {
        extendedCsp = extendCsp(
          getCsp(),
          {
            "script-src": `'strict-dynamic' 'nonce-${cspNonce(
              res
            )}' ${fallback}`,
          },
          "override"
        );
      }
      if (extendedCsp) {
        pushCspToResponse(extendedCsp, res);
      }
    } catch (err) {
      const withFallbackScriptsrc = extendCsp(csp, {
        "script-src": fallback,
      }, 'override');
      pushCspToResponse(withFallbackScriptsrc, res);
      console.error(
        "[strictDynamic]: Internal error. Use script-src fallback value",
        { fallbackScriptSrc, err }
      );
    }
  };

export default strictDynamic;
