import { extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./builder/types";
import { fetchHashes } from "./utils";
import { withDefaultConfig, ensureChainContext, unpackConfig } from "./builder";
import type { CspCacheKey, CspCacheValue } from "./finalizers";

export type StrictInlineStylesCfg = {
  /**
   * if set to true, it will extend an existing style-src directive
   * from further left in the middleware chain
   *
   * Default: `true`. This respects an existing `style-src` configuration
   * that relies on additonal stylesheets on top of inline styles.
   *
   * Set to `false` if you use a CSS-in-JS solution like Stitches that relies on
   * inline styles and don't need to include any further stylesheet for your app.
   */
  extendStyleSrc?: boolean;
};

const _strictInlineStyles: MiddlewareBuilder<
  StrictInlineStylesCfg,
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

    const fetchedHashes = await fetchHashes(req, "style-hashes.txt");
    if (Array.isArray(fetchedHashes) && fetchedHashes.length) {
      const { extendStyleSrc } = await unpackConfig(cfg, req, evt, ctx);
      const mode = extendStyleSrc ? "append" : "override";
      directives = extendCsp(
        directives,
        {
          "style-src": [...fetchedHashes, "unsafe-hashes"],
        },
        mode
      );
      ctx.cache.set("csp", { directives, reportOnly });
    } else {
      console.error(
        `[strictInlineStyles]: No style hashes could be fetched. 
  Did you call getCspInitialProps with trustifyStyles in _document?. If yes, this is unexpected`,
        { styleHashesFetchStatus: fetchedHashes }
      );
    }
  });

/**
 * @param cfg a configuration object for strict inline styles within a Content Security Policy (CSP)
 *
 * @returns a middleware that provides an augmented CSP with strict inline styles.
 * It will ensure to all style hashes (elem and attr) in the CSP that could be picked up during prerendering
 *
 * @requires `@next-safe/middleware/dist/document`
 *
 * Must be used together with `getCspInitialProps` and `provideComponents` in `pages/_document.js`
 * to wire stuff up with Next.js page prerendering. Additionally, you must pass
 * `{ trustifyStyles: true }` to `getCspInitialProps`.
 *
 * @example
 * import {
 *   chainMatch,
 *   isPageRequest,
 *   csp,
 *   strictDynamic,
 *   strictInlineStyles,
 * } from "@next-safe/middleware";
 *
 * const securityMiddleware = [
 *   csp(),
 *   strictDynamic(),
 *   strictInlineStyles(),
 * ];
 *
 * export default chainMatch(isPageRequest)(...securityMiddleware);
 */
const strictInlineStyles = withDefaultConfig(_strictInlineStyles, {
  extendStyleSrc: true,
});

export default strictInlineStyles;
