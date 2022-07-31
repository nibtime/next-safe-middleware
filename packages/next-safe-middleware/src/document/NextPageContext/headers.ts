import type { NextPageContext } from "next";
import { zip } from "ramda";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "../../constants";

type CtxHeaders = Pick<NextPageContext, "req" | "res">;

export const getCtxReqHeader = (ctx: CtxHeaders, header: string) => {
  if (ctx.req) {
    const headerValue = ctx.req.headers[header];
    if (typeof headerValue === "string" || typeof headerValue === "number") {
      return `${headerValue}`;
    }
    if (
      Array.isArray(headerValue) &&
      headerValue.every((v) => typeof v === "string")
    ) {
      return headerValue.join(",");
    }
  }
  return "";
};

export const getCtxResHeader = (ctx: CtxHeaders, header: string) => {
  if (ctx.res) {
    const headerValue = ctx.res.getHeader(header);
    if (typeof headerValue === "string" || typeof headerValue === "number") {
      return `${headerValue}`;
    }
    if (
      Array.isArray(headerValue) &&
      headerValue.every((v) => typeof v === "string")
    ) {
      return headerValue.join(",");
    }
  }
  return "";
};

export const getCtxHeader = (ctx: CtxHeaders, header: string) => {
  return getCtxResHeader(ctx, header) || getCtxReqHeader(ctx, header);
};

export const setCtxReqHeader = (
  ctx: CtxHeaders,
  header: string,
  value: string
) => {
  if (ctx.req) {
    ctx.req.headers[header] = value;
  }
};
export const setCtxResHeader = (
  ctx: CtxHeaders,
  header: string,
  value: string
) => {
  if (ctx.res && !ctx.res.headersSent) {
    ctx.res.setHeader(header, value);
  }
};

export const setCtxHeader = (
  ctx: CtxHeaders,
  header: string,
  value: string
) => {
  setCtxReqHeader(ctx, header, value);
  setCtxResHeader(ctx, header, value);
};

export const deleteCtxReqHeader = (ctx: CtxHeaders, header: string) => {
  try {
    if (ctx.req) {
      delete ctx.req.headers[header];
      return true;
    }
  } finally {
    return false;
  }
};
export const deleteCtxResHeader = (ctx: CtxHeaders, header: string) => {
  try {
    if (ctx.res && !ctx.res.headersSent) {
      ctx.res.removeHeader(header);
      return true;
    }
  } finally {
    return false;
  }
};

export const deleteCtxHeader = (ctx: CtxHeaders, header: string) => {
  deleteCtxReqHeader(ctx, header);
  deleteCtxResHeader(ctx, header);
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
