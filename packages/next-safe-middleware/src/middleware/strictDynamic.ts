import UAParser from "ua-parser-js";
import type { CSP } from "../types";
import { arrayifyCspValues, extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./types";
import {
  cspNonce,
  pullCspFromResponse,
  pushCspToResponse,
  fetchHashes,
} from "./utils";
import { unpackConfig, withDefaultConfig, ensureChainContext } from "./builder";

export type SupportInfo = {
  /**
   * Whether the browser supports`'strict-dynamic'`.
   */
  supportsStrictDynamic: boolean;
  /**
   * Whether the browser supports the `integrity` attribute on <script>` tags
   * in combination with `src` attribute. If a browser doesn;t
   * support this, it can't use a Hash-based strict CSP on pages with `getStaticProps`
   */
  supportsSrcIntegrityCheck: boolean;
};

export type TellSupported = (uaParser: UAParser) => SupportInfo;

/**
 * configuration object for strict CSPs with strict-dynamic
 */
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
   * @see  https://github.com/nibtime/next-safe-middleware/issues/
   *
   * When to use this value, can be customized by passing the `tellSupported` function to this config.
   */
  fallbackScriptSrc?: string | string[];

  /**
   * In some cases you might have to allow eval() for your app to work (e.g. for MDX)
   * This makes the policy slightly less secure, but works alongside 'strict-dynamic'
   *
   * @see https://web.dev/strict-csp/#use-of-eval()-in-javascript
   */
  allowUnsafeEval?: true;

  /**
   * Before you enforce a CSP in production, you might want to test in report-only mode
   * first to make sure configuration mistakes or bugs of this package
   * don't break your app.
   *
   * @see https://web.dev/strict-csp/#step-2:-set-a-strict-csp-and-prepare-your-scripts
   */
  reportOnly?: true;
  /**
   * @param {UAParser} uaParser a `UAParser` instance from the `ua-parser-js` module
   * @returns {SupportInfo} the required support info for applying`'strict-dynamic'` correctly
   */
  tellSupported?: TellSupported;
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
 * @see https://github.com/nibtime/next-safe-middleware/blob/main/packages/next-safe-middleware/README.md#with-csp3-strict-dynamic
 *
 * @example
 *
 * // pages/_middleware.js
 *
 * import { chain, nextSafe, strictDynamic } from '@next-safe/middleware'
 *
 * const isDev = process.env.NODE_ENV === 'development'
 *
 * export default chain(nextSafe({ isDev }), strictDynamic())
 *
 */
const strictDynamic: MiddlewareBuilder<StrictDynamicCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    const csp = pullCspFromResponse(res) ?? {};
    const { fallbackScriptSrc, allowUnsafeEval, reportOnly, tellSupported } =
      await unpackConfig(req, res, cfg);
    const fallbackSrcArray = arrayifyCspValues(fallbackScriptSrc);
    const withUnsafeEval = (values: string[]) =>
      allowUnsafeEval ? [...values, `'unsafe-eval'`] : values;
    try {
      const uaParser = new UAParser(req.headers.get("user-agent"));
      const { supportsSrcIntegrityCheck, supportsStrictDynamic } =
        tellSupported(uaParser);

      if (!supportsStrictDynamic) {
        pushCspToResponse(
          extendCsp(
            csp,
            {
              "script-src": withUnsafeEval(fallbackSrcArray),
            },
            "override"
          ),
          res,
          reportOnly
        );
        return;
      }

      let extendedCsp: CSP | undefined;
      const getCsp = () => extendedCsp || csp;
      const scriptSrcHashes = await fetchHashes(req, "script-hashes.txt");
      // if fetched hashes, it's a static page. Hash-based strict CSP
      if (scriptSrcHashes) {
        if (supportsSrcIntegrityCheck) {
          extendedCsp = extendCsp(
            getCsp(),
            {
              "script-src": [
                `'strict-dynamic'`,
                ...withUnsafeEval(fallbackSrcArray),
                ...scriptSrcHashes,
              ],
            },
            "override"
          );
        } else {
          // Hash-based unsupported. 'strict-dynamic' would be enforced and break things if we set it.
          extendedCsp = extendCsp(
            getCsp(),
            {
              "script-src": withUnsafeEval(fallbackSrcArray),
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
            "script-src": [
              `'strict-dynamic' 'nonce-${cspNonce(res)}'`,
              ...withUnsafeEval(fallbackSrcArray),
            ],
          },
          "override"
        );
      }
      if (extendedCsp) {
        pushCspToResponse(extendedCsp, res, reportOnly);
      }
    } catch (err) {
      const errorCsp = extendCsp(
        csp,
        {
          "script-src": [
            `'strict-dynamic'`,
            ...withUnsafeEval(fallbackSrcArray),
          ],
        },
        "override"
      );
      pushCspToResponse(errorCsp, res, true);
      console.error(
        "[strictDynamic]: Internal error. No hashes or nonce have been added to CSP. Switch to report-only mode to not break the app and to let you know about this.",
        { errorCsp, err }
      );
    }
  });

const tellSupported: TellSupported = (ua) => {
  const browserName = ua.getBrowser().name || "";
  const isFirefox = browserName.includes("Firefox");
  const isSafari = browserName.includes("Safari");
  const supportsStrictDynamic = !isSafari;
  const supportsSrcIntegrityCheck = !isFirefox;

  return {
    supportsStrictDynamic,
    supportsSrcIntegrityCheck,
  };
};

export default withDefaultConfig(strictDynamic, {
  fallbackScriptSrc: `https: 'unsafe-inline'`,
  tellSupported,
});
