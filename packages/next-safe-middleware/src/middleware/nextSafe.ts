import _nextSafe from "next-safe";
import type { MiddlewareBuilder } from "./builder/types";
import { chainableMiddleware } from "./compose";
import { unpackConfig, withDefaultConfig } from "./builder";
import { cachedCspBuilder } from "./utils";
import { CSP_HEADER } from "../constants";

/**
 * A CSP Directive Poroperty
 */
type CSPDirective = string | string[];

/**
 * A CSP Config
 */
type CSPConfig = {
  "base-uri"?: CSPDirective;
  "child-src"?: CSPDirective;
  "connect-src"?: CSPDirective;
  "default-src"?: CSPDirective;
  "font-src"?: CSPDirective;
  "form-action"?: CSPDirective;
  "frame-ancestors"?: CSPDirective;
  "frame-src"?: CSPDirective;
  "img-src"?: CSPDirective;
  "manifest-src"?: CSPDirective;
  "media-src"?: CSPDirective;
  "object-src"?: CSPDirective;
  "prefetch-src"?: CSPDirective;
  "script-src"?: CSPDirective;
  "style-src"?: CSPDirective;
  "worker-src"?: CSPDirective;
  "block-all-mixed-content"?: CSPDirective;
  "plugin-types"?: CSPDirective;
  "navigate-to"?: CSPDirective;
  "require-sri-for"?: CSPDirective;
  "require-trusted-types-for"?: CSPDirective;
  sandbox?: CSPDirective;
  "script-src-attr"?: CSPDirective;
  "script-src-elem"?: CSPDirective;
  "style-src-attr"?: CSPDirective;
  "style-src-elem"?: CSPDirective;
  "trusted-types"?: CSPDirective;
  "upgrade-insecure-requests"?: CSPDirective;
  "report-to"?: CSPDirective;
  "report-uri"?: CSPDirective;
  reportOnly?: boolean;
};

type HeaderConfig = string | false;

type PermPolicyDirectiveList =
  | "experimental"
  | "legacy"
  | "proposed"
  | "standard";

/**
 * nextSafe's primary config object
 */
type NextSafeConfig = {
  contentTypeOptions?: HeaderConfig;
  /**
   * @deprecated  to configure a CSP, use the `csp` middleware instead and
   * and set `disableCsp` to `true`.
   *
   * violation reporting cannot be set up properly for both directives
   * @see https://github.com/trezy/next-safe/issues/41
   *
   */
  contentSecurityPolicy?: CSPConfig | false;
  frameOptions?: HeaderConfig;
  permissionsPolicy?:
    | {
        [key: string]: string | false;
      }
    | false;
  permissionsPolicyDirectiveSupport?: PermPolicyDirectiveList[];
  isDev?: boolean;
  referrerPolicy?: HeaderConfig;
  xssProtection?: HeaderConfig;
};

export type NextSafeCfg = NextSafeConfig & {
  /**
   * set this flag to prevent next-safe to set any CSP header.
   *
   * For CSPs, use the `csp` middleware instead and set this to `true`.
   * You can use `nextSafeMiddleware` for other security headers if you need them.
   *
   *
   * @default false
   */
  disableCsp?: boolean;
};

// derive from lib to check if local signatures are valid.
const nextSafe = _nextSafe as unknown as typeof _nextSafe.nextSafe;

const _nextSafeMiddleware: MiddlewareBuilder<NextSafeCfg> = (cfg) =>
  chainableMiddleware(async (req, evt, ctx) => {
    const [cspBuilder, config] = await Promise.all([
      cachedCspBuilder(ctx),
      unpackConfig(cfg, req, evt, ctx),
    ]);
    const { disableCsp, userAgent, ...nextSafeCfg } = config;
    const isNoCspSecurityHeader = (header) =>
      !header.key.toLowerCase().includes(CSP_HEADER) &&
      !header.key.toLowerCase().includes("csp");

    nextSafe(nextSafeCfg).forEach((header) => {
      if (isNoCspSecurityHeader(header)) {
        ctx.res.get().headers.set(header.key, header.value);
      }
    });
    if (disableCsp || nextSafeCfg.contentSecurityPolicy === false) {
      return;
    }
    const { reportOnly, ...directives } = nextSafeCfg.contentSecurityPolicy;
    cspBuilder.withDirectives(directives).withReportOnly(reportOnly);
  });

/**
 * @param cfg config object for next-safe https://trezy.gitbook.io/next-safe/usage/configuration
 * @returns a middleware that adds HTTP response headers the same way next-safe does.
 *
 * To configure a CSP, use the `csp` middleware instead and and set `disableCsp` to `true` in cfg,
 *
 * next-safe adds CSP legacy headers and set up of reporting could be problematic
 * @see https://github.com/trezy/next-safe/issues/41
 *
 * You can use the `nextSafe` middleware for other security headers if you need them.
 *
 * @example
 * import {
 *   chainMatch,
 *   isPageRequest,
 *   csp,
 *   nextSafe,
 *   strictDynamic,
 * } from "@next-safe/middleware";
 *
 * const securityMiddleware = [
 *   nextSafe({ disableCsp: true }),
 *   csp(),
 *   strictDynamic(),
 * ];
 *
 * export default chainMatch(isPageRequest)(...securityMiddleware);
 *
 */
const nextSafeMiddleware = withDefaultConfig(_nextSafeMiddleware, {
  isDev: process.env.NODE_ENV === "development",
  disableCsp: false,
  contentSecurityPolicy: {
    reportOnly: !!process.env.CSP_REPORT_ONLY,
  },
});
export default nextSafeMiddleware;
