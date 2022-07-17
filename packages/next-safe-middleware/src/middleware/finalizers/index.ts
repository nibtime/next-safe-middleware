import type { CspDirectives } from "../../types";
import type { ChainFinalizer } from "../compose/types";
import type { ReportTo } from "../reporting";

import { pushCspToResponse } from "../utils";
import { stringifyReportTo } from "../reporting";

export type CspCacheKey = "csp";
export type CspCacheValue = { directives: CspDirectives; reportOnly: boolean };
export type ReportToCacheKey = "report-to";
export type ReportToCacheValue = ReportTo[];

export const writeCspToResponse: ChainFinalizer<CspCacheKey, CspCacheValue> = (
  _req,
  _evt,
  ctx
) => {
  const csp = ctx.cache.get("csp");
  const chainRes = ctx.res.get();
  if (chainRes && csp && !ctx.finalize.terminatedByResponse()) {
    pushCspToResponse(csp.directives, chainRes, csp.reportOnly);
  }
};

export const writeReportToHeader: ChainFinalizer<
  ReportToCacheKey,
  ReportToCacheValue
> = (_req, _res, ctx) => {
  const reportTo = ctx.cache.get("report-to");
  const chainRes = ctx.res.get();
  if (reportTo?.length && chainRes && !ctx.finalize.terminatedByResponse()) {
    const reportToHeaderValue = reportTo
      .map((r) => stringifyReportTo(r))
      .join(",");
    chainRes.headers.set("report-to", reportToHeaderValue);
  }
};
