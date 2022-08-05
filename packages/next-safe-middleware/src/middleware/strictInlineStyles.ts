import type { MiddlewareBuilder } from "./builder/types";
import { withDefaultConfig } from "./builder";
import { chainableMiddleware } from "./compose";
import { cachedCspBuilder, cachedCspManifest } from "./utils";

export type StrictInlineStylesCfg = {};

const _strictInlineStyles: MiddlewareBuilder<StrictInlineStylesCfg> = (cfg) =>
  chainableMiddleware(async (req, evt, ctx) => {
    const cspManifest = await cachedCspManifest(req);
    const cspBuilder = await cachedCspBuilder(ctx);

    if (!cspManifest) {
      return;
    }
    const { elem, attr } = cspManifest.styles;
    cspBuilder.withStyleHashes(elem, attr);
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
const strictInlineStyles = withDefaultConfig(_strictInlineStyles, {});

export default strictInlineStyles;
