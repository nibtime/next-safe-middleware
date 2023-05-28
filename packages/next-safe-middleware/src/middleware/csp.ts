import type { CspDirectives } from "@komw/next-safe-builder";
import type { MiddlewareBuilder } from "./builder/types";
import { chainableMiddleware } from "./compose";
import { unpackConfig, withDefaultConfig } from "./builder";
import { cachedCspBuilder } from "./utils";

export type CspCfg = {
  /**
   * The directives that make up the base CSP configration.
   *
   * Typing is borrowed from SvelteKit CSP integration
   * @see https://kit.svelte.dev/docs/types#additional-types-cspdirectives
   *
   * @default
   * {
   *   "default-src": ["self"],
   *   "object-src": ["none"],
   *   "base-uri": ["none"],
   * }
   *
   */
  directives?: CspDirectives;
  /**
   * set to `true` to flag a `next dev` build.
   * Will append some directives to make the CSP work with the development server
   *
   * @default process.env.NODE_ENV === 'development'
   *
   */
  isDev?: boolean;
  /**
   * set to `true` to activate CSP report-only mode.
   * In this mode, violations will be reported, but the CSP is not enforced
   * and can't break your app (but also not protect it).
   *
   * It's recommended to roll out your CSP in this mode first, with reporting set up
   * and switch to enforce mode once everything looks right. For easy reporting setup,
   * you can use the `reporting` middleware and API handler of this lib.
   *
   * @see https://web.dev/strict-csp/#step-2:-set-a-strict-csp-and-prepare-your-scripts
   *
   * It's most convienient to control this option with an env var flag. This is also the default behavior of this option
   * (checks if `process.env.CSP_REPORT_ONLY` is set). Set this flag to an arbitrary value to enable report-only or
   * unset for enforce mode. If you use this flag, you don't need this option.
   *
   * All middleware of this lib that manipulates CSP will respect and conserve an existing reporting/enforce mode setting.
   *
   * @default !!process.env.CSP_REPORT_ONLY
   */
  reportOnly?: boolean;
};

export type CspCached = Pick<CspCfg, "directives" | "reportOnly"> | null;

const _csp: MiddlewareBuilder<CspCfg> = (cfg) =>
  chainableMiddleware(async (req, evt, ctx) => {
    const [cspBuilder, config] = await Promise.all([
      cachedCspBuilder(ctx),
      unpackConfig(cfg, req, evt, ctx),
    ]);
    let { reportOnly, directives, isDev } = config;

    if (isDev) {
      cspBuilder.withDirectives({
        "script-src": ["self", "unsafe-eval", "unsafe-inline"],
        "style-src": ["self", "unsafe-inline"],
        "font-src": ["self", "data:"],
        "connect-src": ["self", "ws:", "wss:"]
      });
    }
    cspBuilder.withDirectives(directives).withReportOnly(reportOnly);
  });

/**
 * @param cfg base configuration for a Content Security Policy (CSP)
 * @returns a middleware the applies the configured CSP to response headers
 *
 * For setting up a strict CSP or strict inline styles, you need to chain additional middleware
 * (`strictDynamic`, `strictInlineStyles`) that does more complex stuff.
 *
 * Comes with rich typing and is resistant towards the "I forgot the fucking single quotes again" problem.
 *
 * You can use it together with the `nextSafe` middleware to set security headers other than CSP
 * @see https://trezy.gitbook.io/next-safe/usage/configuration
 *
 * @example
 * import {
 *   chainMatch,
 *   isPageRequest,
 *   csp,
 *   nextSafe,
 *   strictDynamic,
 *   strictInlineStyles,
 * } from "@komw/next-safe-middleware";
 *
 * const securityMiddleware = [
 *   nextSafe({ disableCsp: true }),
 *   csp({
 *     directives: {
 *       "frame-src": ["self"],
 *       "img-src": ["self", "data:", "https://images.unsplash.com"],
 *       "font-src": ["self", "https://fonts.gstatic.com"],
 *     }
 *   }),
 *   strictDynamic(),
 *  ];
 *
 * export default chainMatch(isPageRequest)(...securityMiddleware);
 *
 */
const csp = withDefaultConfig(_csp, {
  directives: {
    "default-src": ["self"],
    "object-src": ["none"],
    "base-uri": ["none"],
  },
  isDev: process.env.NODE_ENV === "development",
  reportOnly: !!process.env.CSP_REPORT_ONLY,
});

export default csp;
