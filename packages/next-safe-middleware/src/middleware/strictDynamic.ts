import UAParser from "ua-parser-js";
import type { CspDirectives } from "../types";
import { extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./types";
import {
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

type ScriptSrcSources = CspDirectives["script-src"];
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
  fallbackScriptSrc?: ScriptSrcSources;

  /**
   * In some cases you might have to allow eval() for your app to work (e.g. for MDX)
   * This makes the policy slightly less secure, but works alongside 'strict-dynamic'
   *
   * @see https://web.dev/strict-csp/#use-of-eval()-in-javascript
   */
  allowUnsafeEval?: true;

  /**
   * @param {UAParser} uaParser a `UAParser` instance from the `ua-parser-js` module
   * @returns {SupportInfo} the required support info for applying`'strict-dynamic'` correctly
   */
  tellSupported?: TellSupported;

  /**
   * if you set this to true, the `fallbackScriptSrc` you specified
   * will be appended to `strict-dynamic` also when `tellSupported` says "is supported"
   * This shifts the support decision to the browser.
   *
   * Defaults to true, as this is more lenient towards a "blacklisting"
   * approach of browser support, like the default `tellSupported` does.
   *
   * Set this to false, if you pass a detailled support specification with `tellSupported`
   *
   */
  inclusiveFallback?: boolean;
};

const _strictDynamic: MiddlewareBuilder<StrictDynamicCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    const csp = pullCspFromResponse(res) ?? {};
    const {
      fallbackScriptSrc,
      allowUnsafeEval,
      tellSupported,
      uaParser,
      inclusiveFallback,
    } = await unpackConfig(req, res, cfg);
    const withUnsafeEval = (values: ScriptSrcSources): ScriptSrcSources =>
      allowUnsafeEval ? [...values, "unsafe-eval"] : values;
    const appendToStrictDynamic = withUnsafeEval(
      inclusiveFallback ? fallbackScriptSrc : []
    );
    const { supportsSrcIntegrityCheck, supportsStrictDynamic } =
      tellSupported(uaParser);

    if (!supportsStrictDynamic) {
      pushCspToResponse(
        extendCsp(
          csp,
          {
            "script-src": withUnsafeEval(fallbackScriptSrc),
          },
          "override"
        ),
        res
      );
      return;
    }

    let extendedCsp: CspDirectives | undefined;
    const getCsp = () => extendedCsp || csp;
    const scriptSrcHashes = (await fetchHashes(
      req,
      "script-hashes.txt"
    )) as ScriptSrcSources;
    // if fetched hashes, it's a static page. Hash-based strict CSP
    if (
      scriptSrcHashes.length &&
      supportsStrictDynamic &&
      supportsSrcIntegrityCheck
    ) {
      extendedCsp = extendCsp(
        getCsp(),
        {
          "script-src": [
            "strict-dynamic",
            ...appendToStrictDynamic,
            ...scriptSrcHashes,
          ],
        },
        "override"
      );
      if (extendedCsp) {
        pushCspToResponse(extendedCsp, res);
      }
    }
    //
    else {
      console.error(
        "[strictDynamic]: Couldn't fetch hashes. has your app static pages for Hash-based strict CSP?. If yes, this is unexpected",
        {
          supportsStrictDynamic,
          supportsSrcIntegrityCheck,
          browser: uaParser.getBrowser().name,
          version: uaParser.getBrowser().version,
        }
      );

      extendedCsp = extendCsp(
        getCsp(),
        {
          "script-src": [...withUnsafeEval(fallbackScriptSrc)],
        },
        "override"
      );
    }
    if (extendedCsp) {
      pushCspToResponse(extendedCsp, res);
    }
  });

const tellSupported: TellSupported = (ua) => {
  const browserName = ua.getBrowser().name || "";
  const isFirefox = browserName.includes("Firefox");
  const isUnsupportedSafari =
    browserName.includes("Safari") && Number(ua.getBrowser().version) <= 15.4;
  const supportsStrictDynamic = !isUnsupportedSafari;
  const supportsSrcIntegrityCheck = !isFirefox;

  return {
    supportsStrictDynamic,
    supportsSrcIntegrityCheck,
  };
};

/**
 *
 * @param cfg A configuration object for a strict Content Security Policy (CSP)
 * @see https://web.dev/strict-csp/
 *
 * @returns
 * a middleware that provides an augmented strict CSP. It will ensure to include hashes of scripts for static routes (`getStaticProps` - Hash-based strict CSP)
 * or a nonce for dynamic routes (`getServerSideProps` - Nonce-based strict CSP).
 *
 * @requires `@next-safe/middleware/dist/document`
 *
 * Must be used together with `getCspInitialProps` and `provideComponents`
 * in `pages/_document.js` to wire stuff up with Next.js page prerendering.
 *
 * @example
 * import {
 *   chain,
 *   csp,
 *   strictDynamic,
 * } from "@next-safe/middleware";
 *
 *  const securityMiddleware = [
 *    csp(),
 *    strictDynamic(),
 *  ];
 *
 * export default chain(...securityMiddleware);
 *
 */
const strictDynamic = withDefaultConfig(_strictDynamic, {
  fallbackScriptSrc: ["https:", "unsafe-inline"],
  tellSupported,
  inclusiveFallback: true,
});
export default strictDynamic;
