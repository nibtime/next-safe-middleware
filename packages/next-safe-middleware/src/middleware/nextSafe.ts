import _nextSafe from "next-safe";
import type { MiddlewareBuilder } from "./types";
import { unpackConfig, withDefaultConfig, ensureChainContext } from "./builder";

// because of type bug.
const nextSafe = _nextSafe as unknown as typeof _nextSafe.nextSafe;

export type NextSafeCfg = Parameters<typeof nextSafe>[0];
type _NextSafeCSPCfg = NonNullable<NextSafeCfg>["contentSecurityPolicy"];
export type NextSafeCfgCSP = Exclude<_NextSafeCSPCfg, false>;

const nextSafeMiddleware: MiddlewareBuilder<NextSafeCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    const unpackedCfg = await unpackConfig(req, res, cfg);
    nextSafe(unpackedCfg).forEach((header) =>
      res.headers.set(header.key, header.value)
    );
  });

export default withDefaultConfig(nextSafeMiddleware, {});
