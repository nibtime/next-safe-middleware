import _nextSafe from "next-safe";
import type { MiddlewareBuilder } from "./types";
import { unpackConfig, withDefaultConfig, ensureChainContext } from "./builder";

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

export type NextSafeCfg = NextSafeConfig;
type _NextSafeCSPCfg = NonNullable<NextSafeCfg>["contentSecurityPolicy"];
export type NextSafeCfgCSP = Exclude<_NextSafeCSPCfg, false>;

// derive from lib to check if local signatures are valid.
const nextSafe = _nextSafe as unknown as typeof _nextSafe.nextSafe;

const nextSafeMiddleware: MiddlewareBuilder<NextSafeCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    const unpackedCfg = await unpackConfig(req, res, cfg);
    nextSafe(unpackedCfg).forEach((header) =>
      res.headers.set(header.key, header.value)
    );
  });

export default withDefaultConfig(nextSafeMiddleware, {});
