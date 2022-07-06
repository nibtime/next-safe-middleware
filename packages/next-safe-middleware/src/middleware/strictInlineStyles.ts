import { extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./types";
import { pullCspFromResponse, pushCspToResponse, fetchHashes } from "./utils";
import { withDefaultConfig, ensureChainContext, unpackConfig } from "./builder";

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

const _strictInlineStyles: MiddlewareBuilder<StrictInlineStylesCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    const fetchedHashes = await fetchHashes(req, "style-hashes.txt");
    if (fetchedHashes.length) {
      const { extendStyleSrc } = await unpackConfig(req, res, cfg);
      const mode = extendStyleSrc ? "append" : "override";
      let csp = pullCspFromResponse(res) ?? {};
      csp = extendCsp(
        csp,
        {
          "style-src": [...fetchedHashes, "unsafe-hashes"],
        },
        mode
      );
      pushCspToResponse(csp, res);
    } else {
      console.error(
        "[strictInlineStyles]: No styles. Is your app using any inline styles at all?. If yes, this is unexpected"
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
 *   chain,
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
 * export default chain(...securityMiddleware);
 */
const strictInlineStyles = withDefaultConfig(_strictInlineStyles, {
  extendStyleSrc: true,
});

export default strictInlineStyles;
