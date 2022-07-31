import type { CspDirectives } from "../../types";
import type { CtxHeaders } from "./types";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "../../constants";
import { fromCspContent, toCspContent } from "../../utils";
import { deleteCtxHeader, getCtxReqHeader, getCtxResHeader, setCtxHeader } from "./headers";

const getCspFromHeader = (ctx: CtxHeaders, getter) => {
  if (ctx.req) {
    const cspContent = getter(ctx, CSP_HEADER);
    const cspContentReportOnly = getter(ctx, CSP_HEADER_REPORT_ONLY);
    if (cspContent) {
      return {
        directives: fromCspContent(cspContent),
        reportOnly: false,
      };
    }
    if (cspContentReportOnly) {
      return {
        directives: fromCspContent(cspContent),
        reportOnly: true,
      };
    }
  }
  return {};
};

const getCspFromReqHeader = (ctx: CtxHeaders) =>
  getCspFromHeader(ctx, getCtxReqHeader);
const getCspFromResHeader = (ctx: CtxHeaders) =>
  getCspFromHeader(ctx, getCtxResHeader);

export const getCtxCsp = (ctx: CtxHeaders) => {
  const fromRes = getCspFromResHeader(ctx);
  return fromRes.directives ? fromRes : getCspFromReqHeader(ctx);
};

export const setCtxCsp = (
  ctx: CtxHeaders,
  directives: CspDirectives,
  reportOnly: boolean
) => {
  if (reportOnly) {
    setCtxHeader(ctx, CSP_HEADER_REPORT_ONLY, toCspContent(directives));
    deleteCtxHeader(ctx, CSP_HEADER);
  } else {
    setCtxHeader(ctx, CSP_HEADER, toCspContent(directives));
    deleteCtxHeader(ctx, CSP_HEADER_REPORT_ONLY);
  }
};