import crypto from "crypto";
import { DocumentContext } from "next/document";
import React from "react";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_NONCE_HEADER,
} from "../constants";
import type { IterableScript, Primitve, Nullable } from "./types";
import { extendCsp, fromCspContent, toCspContent, filterCsp } from "../utils";
import type { CspDirectives } from "../types";
import { sortBy, zip } from "ramda";

export const integritySha256 = (inlineScriptCode: string) => {
  const hash = crypto.createHash("sha256");
  hash.update(inlineScriptCode);
  return `sha256-${hash.digest("base64")}`;
};

const getScriptValue = (attr: string, attrs: IterableScript) =>
  attrs.find(([a]) => attr === a)?.[1];

const quoteIfString = (value: Primitve) =>
  typeof value === "string" ? `'${value}'` : value;

// the attributes the can be set in plain string JS hacking
const isKnownScriptAttr = (attr: string) =>
  [
    "id",
    "src",
    "integrity",
    "async",
    "defer",
    "noModule",
    "crossOrigin",
    "nonce",
  ].includes(attr);

export const isJsxElement = (el: any): el is JSX.Element =>
  !!el && typeof el === "object" && "props" in el;

export const isElementWithChildren = (el: any): el is JSX.Element =>
  isJsxElement(el) && "children" in el.props;

export const isScriptElement = (el: any): el is JSX.Element =>
  isJsxElement(el) && el.type === "script";

export const isPreloadScriptElement = (el: any): el is JSX.Element =>
  isJsxElement(el) &&
  el.type === "link" &&
  el.props.rel === "preload" &&
  !!el.props.href &&
  el.props.as === "script";

export const isStyleElement = (el: unknown): el is JSX.Element =>
  isJsxElement(el) && el.type === "style";

const iterableScriptFromProps = (el: Nullable<JSX.Element>): IterableScript => {
  if (!isScriptElement(el)) return [];
  return Object.entries<Primitve>(el.props).filter(
    ([, value]) =>
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number"
  );
};

// create a inline script loader (plain string JS code) to load a batch of scripts non-parser inserted.
// wrap in IIFE to avoid naming collisions in global window scope.
export const createHashableScriptLoader = (
  scripts: IterableScript[],
  id: string
) => {
  return scripts.length > 0
    ? `(function () { ${scripts
        .map(
          (attrs, i) => `
  var s${i} = document.createElement('script');
  ${attrs
    ?.map(([attr, value]) =>
      isKnownScriptAttr(attr)
        ? `s${i}.${attr}=${quoteIfString(value)}`
        : `s${i}.setAttribute('${attr}', '${value}')`
    )
    .join(";")}`
        )
        .join(";")};
  var s = [${scripts.map((s, i) => `s${i}`).join(",")}];
  var self = document.getElementById('${id}');
  var p = self.parentNode;
  s.forEach(function(si) {
    p.appendChild(si);
  });
})()
`
    : "";
};

const sortIterableScriptByProps = (s: IterableScript) => {
  return sortBy(([attr]) => attr, s);
};
// load a batch of script elements without integrity via a trusted proxy loader element with integrity
// can be used, when for some reason the correct final integrity of a script element can't be obtained at build time.
export const createTrustedLoadingProxy = (els: JSX.Element[]) => {
  const iterableScripts = els
    .map(iterableScriptFromProps)
    .map(sortIterableScriptByProps);
  const proxy = createHashableScriptLoader(
    iterableScripts,
    "proxy-self-7f10ba7a15bc0318e7dd56e8c7e1cff"
  );
  const id = integritySha256(proxy).replace(/^sha256-/g, "");
  const inlineCode = proxy.replace(
    /proxy-self-7f10ba7a15bc0318e7dd56e8c7e1cff/g,
    id
  );
  return (
    <script key={id} id={id} dangerouslySetInnerHTML={{ __html: inlineCode }} />
  );
};

// create a script element from inline code with its hash as integrity
// a script element is interpreted to be a inline script if it has a single child of type string
export const withHashIfInlineScript = (s: JSX.Element) => {
  if (!isScriptElement(s)) {
    return s;
  }

  const { children, dangerouslySetInnerHTML, ...props } = s.props;

  let inlineScriptCode = "";

  if (typeof children === "string") {
    inlineScriptCode = s.props.children;
  } else if (dangerouslySetInnerHTML) {
    inlineScriptCode = dangerouslySetInnerHTML.__html;
  }

  if (!inlineScriptCode) {
    return s;
  }
  const integrity = integritySha256(inlineScriptCode);
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script
      key={s.key}
      {...props}
      src={null}
      integrity={integrity}
      dangerouslySetInnerHTML={{ __html: inlineScriptCode }}
    />
  );
};

const getCtxReqHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string
) => {
  if (ctx.req) {
    return ctx.req.headers[header]?.toString() || "";
  }
  return "";
};

const getCtxResHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string
) => {
  if (ctx.res) {
    return ctx.res.getHeader(header)?.toString() || "";
  }
  return "";
};

export const getCtxHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string
) => {
  return getCtxResHeader(ctx, header) || getCtxReqHeader(ctx, header);
};

const setCtxReqHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string,
  value: string
) => {
  if (ctx.req) {
    ctx.req.headers[header] = value;
  }
};
const setCtxResHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string,
  value: string
) => {
  if (ctx.res && !ctx.res.headersSent) {
    ctx.res.setHeader(header, value);
  }
};

const setCtxHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string,
  value: string
) => {
  setCtxReqHeader(ctx, header, value);
  setCtxResHeader(ctx, header, value);
};

const deleteCtxReqHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
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
  ctx: Pick<DocumentContext, "req" | "res">,
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
  ctx: Pick<DocumentContext, "req" | "res">,
  header: string
) => {
  deleteCtxReqHeader(ctx, header);
  deleteCtxResHeader(ctx, header);
};

const getCspFromHeader = (
  ctx: Pick<DocumentContext, "req" | "res">,
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

const getCspFromReqHeader = (ctx: Pick<DocumentContext, "req" | "res">) =>
  getCspFromHeader(ctx, getCtxReqHeader);
const getCspFromResHeader = (ctx: Pick<DocumentContext, "req" | "res">) =>
  getCspFromHeader(ctx, getCtxResHeader);

export const getCsp = (ctx: Pick<DocumentContext, "req" | "res">) => {
  const fromRes = getCspFromResHeader(ctx);
  return fromRes.directives ? fromRes : getCspFromReqHeader(ctx);
};

export const setCsp = (
  ctx: Pick<DocumentContext, "req" | "res">,
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
  ctx: Pick<DocumentContext, "req" | "res">,
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

export const applyNonceToCsp = (ctx: Pick<DocumentContext, "req" | "res">) => {
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
  ctx: DocumentContext,
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
