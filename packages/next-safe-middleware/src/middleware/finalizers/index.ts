import type { ChainFinalizer } from "../compose/types";
import type { CspCfg } from '../csp'
import { pushCspToResponse } from "../utils";

export type CspCacheKey = "csp";
export type CspCacheValue = Omit<CspCfg, "isDev">;

export const writeCspToResponse: ChainFinalizer<CspCacheKey, CspCacheValue> = (
  _req,
  _evt,
  ctx
) => {
  const csp = ctx.cache.get("csp");
  if (csp && csp.directives && !ctx.finalize.terminatedByResponse()) {
    pushCspToResponse(csp.directives, ctx.res.get(), csp.reportOnly);
  }
};