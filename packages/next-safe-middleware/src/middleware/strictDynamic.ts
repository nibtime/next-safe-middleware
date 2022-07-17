import type { CspDirectives } from "../types";
import { extendCsp } from "../utils";
import type { MiddlewareBuilder, NextUserAgent } from "./builder/types";
import type { CspCacheKey, CspCacheValue } from "./finalizers";

import { fetchHashes } from "./utils";
import { unpackConfig, withDefaultConfig, ensureChainContext } from "./builder";

export type SupportInfo = {
  /**
   * Whether the browser supports`strict-dynamic`.
   */
  supportsStrictDynamic: boolean;
  /**
   * Whether the browser supports the `integrity` attribute on <script>` tags
   * in combination with `src` attribute. If a browser doesn't
   * support this, it can't use a Hash-based strict CSP on pages with `getStaticProps`
   */
  supportsSrcIntegrityCheck: boolean;
};

export type TellSupported = (userAgent: NextUserAgent) => SupportInfo;

type ScriptSrcSources = CspDirectives["script-src"];
/**
 * configuration object for strict CSPs with strict-dynamic
 */
export type StrictDynamicCfg = {
  /**
   * A fallback value for the `script-src` directive. Used for browsers with `{ supportsStrictDynamic : false }`
   * and for browsers with buggy [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) validation `{ supportsSrcIntegrityCheck : false }` on static routes, because this prevents using a Hash-based Strict CSP.
   *
   * @see https://caniuse.com/?search=strict-dynamic
   * @see https://web.dev/strict-csp/#step-4:-add-fallbacks-to-support-safari-and-older-browsers
   * @see https://github.com/nibtime/next-safe-middleware/issues/5
   *
   * When and how this value get applied, can be customized by
   * the `tellSupported` function and the `inclusiveFallback` flag.
   *
   * @default
   * ['https://', 'unsafe-inline']
   */
  fallbackScriptSrc?: ScriptSrcSources;

  /**
   * In some cases you might have to allow `eval()` for your app to work (e.g. for MDX)
   * This makes the policy slightly less secure, but works alongside `strict-dynamic`
   *
   * @see https://web.dev/strict-csp/#use-of-eval()-in-javascript
   */
  allowUnsafeEval?: true;

  /**
   * @param uaParser a `UAParser` instance from the `ua-parser-js` module
   * @returns a support info that tells how to apply `strict-dynamic`
   *
   * @default
   * {
   *   supportsStrictDynamic: is not Safari < 15.4,
   *   supportsSrcIntegrityCheck: is not Firefox
   * }
   *
   */
  tellSupported?: TellSupported;

  /**
   * if you set this to true, the `fallbackScriptSrc` you specified
   * will be appended to `strict-dynamic` also when `tellSupported` says "is supported"
   * This shifts the support decision to the browser.
   *
   * Defaults to `true`, as this is more lenient towards a "blacklisting"
   * approach of browser support, like the default `tellSupported` does.
   *
   * Set this to `false`, if you pass a detailled support specification with `tellSupported`
   *
   * @default true
   */
  inclusiveFallback?: boolean;
};

const _strictDynamic: MiddlewareBuilder<
  StrictDynamicCfg,
  CspCacheKey,
  CspCacheValue
> = (cfg) =>
  ensureChainContext(async (req, evt, ctx) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    const csp = ctx.cache.get("csp");
    if (!csp) return;

    let { directives, reportOnly } = csp;

    const {
      fallbackScriptSrc,
      allowUnsafeEval,
      tellSupported,
      userAgent,
      inclusiveFallback,
    } = await unpackConfig(cfg, req, evt, ctx);
    const withUnsafeEval = (values: ScriptSrcSources): ScriptSrcSources =>
      allowUnsafeEval ? [...values, "unsafe-eval"] : values;
    const appendToStrictDynamic = withUnsafeEval(
      inclusiveFallback ? fallbackScriptSrc : []
    );
    const { supportsSrcIntegrityCheck, supportsStrictDynamic } =
      tellSupported(userAgent);

    if (!supportsStrictDynamic) {
      directives = extendCsp(
        directives,
        {
          "script-src": withUnsafeEval(fallbackScriptSrc),
        },
        "override"
      );
      ctx.cache.set("csp", { directives, reportOnly });
      return;
    }

    const scriptSrcHashes = (await fetchHashes(req, "script-hashes.txt")) as
      | ScriptSrcSources
      | string;
    if (typeof scriptSrcHashes === "string") {
      console.error(
        `[strictDynamic]: No script hashes could be fetched. 
  Did you call getCspInitialProps in _document?. If yes, this is unexpected`,
        {
          scriptHashesFetchStatus: scriptSrcHashes,
          supportsStrictDynamic,
          supportsSrcIntegrityCheck,
          browser: userAgent.browser.name,
          version: userAgent.browser.version,
        }
      );
    } else if (
      scriptSrcHashes.length &&
      supportsStrictDynamic &&
      supportsSrcIntegrityCheck
    ) {
      directives = extendCsp(
        directives,
        {
          "script-src": [
            "strict-dynamic",
            ...appendToStrictDynamic,
            ...scriptSrcHashes,
          ],
        },
        "override"
      );
    }
    //
    else {
      console.log(
        `[strictDynamic]: browser with no proper support for strict-dynamic.
  Either doesn't support the value or has buggy SRI validation
  Applying fallback sources...`,
        {
          fallbackScriptSrc,
          browser: userAgent.browser.name,
          version: userAgent.browser.version,
          supportsStrictDynamic,
          supportsSrcIntegrityCheck,
        }
      );

      directives = extendCsp(
        directives,
        {
          "script-src": [...withUnsafeEval(fallbackScriptSrc)],
        },
        "override"
      );
    }
    ctx.cache.set("csp", { directives, reportOnly });
  });

const tellSupported: TellSupported = (userAgent) => {
  const browserName = userAgent.browser.name || "";
  const browserVersion = Number(userAgent.browser.version || "");
  const isSafari = browserName.includes("Safari");
  const isFirefox = browserName.includes("Firefox");
  const isSafariWithoutStrictDynamic = isSafari && browserVersion <= 15.4;
  const supportsStrictDynamic = !isSafariWithoutStrictDynamic;
  const supportsSrcIntegrityCheck = !(isSafari || isFirefox);

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
 *   chainMatch,
 *   isPageRequest,
 *   csp,
 *   strictDynamic,
 * } from "@next-safe/middleware";
 *
 *  const securityMiddleware = [
 *    csp(),
 *    strictDynamic(),
 *  ];
 *
 * export default chainMatch(isPageRequest)(...securityMiddleware);
 *
 */
const strictDynamic = withDefaultConfig(_strictDynamic, {
  fallbackScriptSrc: ["https:", "unsafe-inline"],
  tellSupported,
  inclusiveFallback: true,
});
export default strictDynamic;
