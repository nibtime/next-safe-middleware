import type { NextPageContext } from "next";
import type { CspDirectives } from "../types";
import { zip } from "ramda";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_NONCE_HEADER,
} from "../constants";
import { extendCsp, filterCsp, fromCspContent, toCspContent } from "../utils";

const getCtxReqHeader = (
  ctx: NextPageContext,
  header: string
) => {
  if (ctx.req) {
    return ctx.req.headers[header]?.toString() || "";
  }
  return "";
};

const getCtxResHeader = (
  ctx: NextPageContext,
  header: string
) => {
  if (ctx.res) {
    return ctx.res.getHeader(header)?.toString() || "";
  }
  return "";
};

export const getCtxHeader = (
  ctx: NextPageContext,
  header: string
) => {
  return getCtxResHeader(ctx, header) || getCtxReqHeader(ctx, header);
};

const setCtxReqHeader = (
  ctx: NextPageContext,
  header: string,
  value: string
) => {
  if (ctx.req) {
    ctx.req.headers[header] = value;
  }
};
const setCtxResHeader = (
  ctx: NextPageContext,
  header: string,
  value: string
) => {
  if (ctx.res && !ctx.res.headersSent) {
    ctx.res.setHeader(header, value);
  }
};

const setCtxHeader = (
  ctx: NextPageContext,
  header: string,
  value: string
) => {
  setCtxReqHeader(ctx, header, value);
  setCtxResHeader(ctx, header, value);
};

const deleteCtxReqHeader = (
  ctx: NextPageContext,
  header: string
) => {
  try {
    if (ctx.req) {
      delete ctx.req.headers[header];
      return true;
    }
  } finally {
    return false;
  }
};
const deleteCtxResHeader = (
  ctx: NextPageContext,
  header: string
) => {
  try {
    if (ctx.res && !ctx.res.headersSent) {
      ctx.res.removeHeader(header);
      return true;
    }
  } finally {
    return false;
  }
};

const deleteCtxHeader = (
  ctx: NextPageContext,
  header: string
) => {
  deleteCtxReqHeader(ctx, header);
  deleteCtxResHeader(ctx, header);
};

const getCspFromHeader = (
  ctx: NextPageContext,
  getter
) => {
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

const getCspFromReqHeader = (ctx: NextPageContext) =>
  getCspFromHeader(ctx, getCtxReqHeader);
const getCspFromResHeader = (ctx: NextPageContext) =>
  getCspFromHeader(ctx, getCtxResHeader);

export const getCsp = (ctx: NextPageContext) => {
  const fromRes = getCspFromResHeader(ctx);
  return fromRes.directives ? fromRes : getCspFromReqHeader(ctx);
};

export const setCsp = (
  ctx: NextPageContext,
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

export const generateNonce = (bits = 128) => {
  const crypto = require("crypto");
  return crypto.randomBytes(Math.floor(bits / 8)).toString("base64");
};

export const cspNonce = (
  ctx: NextPageContext,
  bits = 128
) => {
  if (process.env.NODE_ENV !== "production" || !ctx.req || !ctx.res) {
    return "";
  }
  let nonce = getCtxHeader(ctx, CSP_NONCE_HEADER);
  if (!nonce) {
    nonce = generateNonce(bits);
    setCtxHeader(ctx, CSP_NONCE_HEADER, nonce);
  }
  return nonce;
};

export const applyNonceToCsp = (ctx: NextPageContext) => {
  let nonce = cspNonce(ctx);
  if (nonce) {
    let { directives, reportOnly } = getCsp(ctx);
    if (directives) {
      directives = filterCsp(directives, { "script-src": /^sha\d{3}-/ });
      directives = extendCsp(directives, {
        ...(directives["script-src"] ? { "script-src": `nonce-${nonce}` } : {}),
        ...(directives["style-src"] ? { "style-src": `nonce-${nonce}` } : {}),
      });
      setCsp(ctx, directives, reportOnly);
    }
  }
  return nonce;
};

const excludeLongSecurityHeaders = (header: [string, string]) => {
  const headerLower = header[0].toLowerCase();
  return (
    headerLower !== CSP_HEADER &&
    headerLower !== CSP_HEADER_REPORT_ONLY &&
    headerLower !== "feature-policy" &&
    headerLower !== "permissions-policy"
  );
};
export const logCtxHeaders = (
  ctx: NextPageContext,
  excludeLongHeaders = true
) => {
  let reqHeaders;
  if (ctx?.req?.rawHeaders) {
    const headerNames = ctx.req.rawHeaders.filter((v, idx) => idx % 2 === 0);
    const headerValues = ctx.req.rawHeaders.filter((v, idx) => idx % 2 === 1);
    let headers = zip(headerNames, headerValues);
    if (excludeLongHeaders) {
      headers = headers.filter(excludeLongSecurityHeaders);
    }
    reqHeaders = Object.fromEntries(headers);
  }
  let resHeaders;
  if (ctx.res) {
    let headers = ctx.res
      .getHeaderNames()
      .map((header) => [header, ctx.res.getHeader(header).toString()]);
    if (excludeLongSecurityHeaders) {
      headers = headers.filter(excludeLongSecurityHeaders);
    }
    resHeaders = Object.fromEntries(headers);
  }
  if (reqHeaders || resHeaders) {
    console.info(
      "[_document]:",
      JSON.stringify({
        ctx: {
          headers: {
            req: reqHeaders ? reqHeaders : undefined,
            res: resHeaders ? resHeaders : undefined,
          },
        },
      })
    );
  }
};
