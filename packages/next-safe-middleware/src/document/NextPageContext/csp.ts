import type { CspDirectives } from "@strict-csp/builder";
import type { CtxHeaders } from "./types";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "../../constants";
import { CspBuilder } from "@strict-csp/builder";
import {
  deleteCtxHeader,
  getCtxReqHeader,
  getCtxResHeader,
  setCtxHeader,
} from "./headers";

const getCspFromHeader = (ctx: CtxHeaders, getter) => {
  if (ctx.req) {
    const cspContent = getter(ctx, CSP_HEADER);
    const cspContentReportOnly = getter(ctx, CSP_HEADER_REPORT_ONLY);
    if (cspContent) {
      return new CspBuilder({
        directives: cspContent,
        reportOnly: false,
      });
    }
    if (cspContentReportOnly) {
      return new CspBuilder({
        directives: cspContentReportOnly,
        reportOnly: false,
      });
    }
  }
  return null;
};
const getCspFromReqHeader = (ctx: CtxHeaders) =>
  getCspFromHeader(ctx, getCtxReqHeader);
const getCspFromResHeader = (ctx: CtxHeaders) =>
  getCspFromHeader(ctx, getCtxResHeader);

export const getCtxCsp = (ctx: CtxHeaders) => {
  const fromRes = getCspFromResHeader(ctx);
  return fromRes ? fromRes : getCspFromReqHeader(ctx) ?? new CspBuilder();
};

export const setCtxCsp = (ctx: CtxHeaders, builder: CspBuilder) => {
  deleteCtxHeader(ctx, CSP_HEADER);
  deleteCtxHeader(ctx, CSP_HEADER_REPORT_ONLY);
  const [header, value] = builder.toHeaderKeyValue();
  if (value) {
    setCtxHeader(ctx, header, value);
  }
};
