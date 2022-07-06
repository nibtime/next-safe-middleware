import crypto from "crypto";
import { DocumentContext } from "next/document";
import React from "react";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_NONCE_HEADER,
} from "../constants";
import type { IterableScript, Primitve, Nullable } from "./types";
import { extendCsp, fromCspContent, toCspContent } from "../utils";
import type { CspDirectives } from "../types";

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
  var p = document.getElementById('${id}').parentNode;
  s.forEach(function(si) {
    p.appendChild(si);
  });
})()
`
    : "";
};

// load a batch of script elements without integrity via a trusted proxy loader element with integrity
// can be used, when for some reason the correct final integrity of a script element can't be obtained at build time.
export const createTrustedLoadingProxy = (els: JSX.Element[]) => {
  const iterableScripts = els.map(iterableScriptFromProps);
  const proxy = createHashableScriptLoader(
    iterableScripts,
    "proxy-self-7f10ba7a15bc0318e7dd56e8c7e1cff"
  );
  const id = integritySha256(proxy).replace(/^sha256-/g, "");
  const inlineCode = proxy.replace(
    /proxy-self-7f10ba7a15bc0318e7dd56e8c7e1cff/g,
    id
  );
  const async = iterableScripts.every((s) => !!getScriptValue("async", s));
  const defer = iterableScripts.every((s) => !!getScriptValue("defer", s));
  return (
    <script id={id} async={async || undefined} defer={defer || undefined}>
      {inlineCode}
    </script>
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

export const scriptWithPatchedCrossOrigin = (s: JSX.Element) => {
  if (
    !isScriptElement(s) ||
    !(s.props.integrity && s.props.src) ||
    !s.props["data-crossorigin"]
  ) {
    return s;
  }
  const setCrossOrigin = { crossOrigin: s.props["data-crossorigin"] };
  return <script key={s.key} {...s.props} {...setCrossOrigin} />;
};

const getCtxReqHeader = (ctx: DocumentContext, header: string) => {
  if (ctx.req) {
    return ctx.req.headers[header]?.toString() || "";
  }
  return "";
};

const getCtxResHeader = (ctx: DocumentContext, header: string) => {
  if (ctx.res) {
    return ctx.res.getHeader(header)?.toString() || "";
  }
  return "";
};

const setCtxReqHeader = (
  ctx: DocumentContext,
  header: string,
  value: string
) => {
  if (ctx.req) {
    ctx.req.headers[header] = value;
  }
};
const setCtxResHeader = (
  ctx: DocumentContext,
  header: string,
  value: string
) => {
  if (ctx.res && !ctx.res.headersSent) {
    ctx.res.setHeader(header, value);
  }
};

const deleteCtxReqHeader = (ctx: DocumentContext, header: string) => {
  try {
    if (ctx.req) {
      delete ctx.req.headers[header];
      return true;
    }
  } finally {
    return false;
  }
};
const deleteCtxResHeader = (ctx: DocumentContext, header: string) => {
  try {
    if (ctx.res && !ctx.res.headersSent) {
      ctx.res.removeHeader(header);
      return true;
    }
  } finally {
    return false;
  }
};

const getCspFromHeader = (ctx: DocumentContext, getter) => {
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

const getCspFromReqHeader = (ctx: DocumentContext) =>
  getCspFromHeader(ctx, getCtxReqHeader);
const getCspFromResHeader = (ctx: DocumentContext) =>
  getCspFromHeader(ctx, getCtxResHeader);

export const getCsp = (ctx: DocumentContext) => {
  const fromReq = getCspFromReqHeader(ctx);
  return Object.keys(fromReq).length ? fromReq : getCspFromResHeader(ctx);
};

export const setCsp = (
  ctx: DocumentContext,
  directives: CspDirectives,
  reportOnly: boolean
) => {
  if (reportOnly) {
    deleteCtxReqHeader(ctx, CSP_HEADER);
    deleteCtxResHeader(ctx, CSP_HEADER);
    setCtxReqHeader(ctx, CSP_HEADER_REPORT_ONLY, toCspContent(directives));
    setCtxResHeader(ctx, CSP_HEADER_REPORT_ONLY, toCspContent(directives));
  } else {
    deleteCtxReqHeader(ctx, CSP_HEADER_REPORT_ONLY);
    deleteCtxResHeader(ctx, CSP_HEADER_REPORT_ONLY);
    setCtxReqHeader(ctx, CSP_HEADER, toCspContent(directives));
    setCtxResHeader(ctx, CSP_HEADER, toCspContent(directives));
  }
};

export const generateNonce = (bits = 128) => {
  const crypto = require("crypto");
  return crypto.randomBytes(Math.floor(bits / 8)).toString("base64");
};

export const cspNonce = (ctx: DocumentContext, bits = 128) => {
  let nonce =
    getCtxResHeader(ctx, CSP_NONCE_HEADER) ||
    getCtxReqHeader(ctx, CSP_NONCE_HEADER);
  if (!nonce) {
    nonce = generateNonce(bits);
    setCtxResHeader(ctx, CSP_NONCE_HEADER, nonce);
    setCtxReqHeader(ctx, CSP_NONCE_HEADER, nonce);
  }
  return nonce;
};

export const applyNonceToCsp = (ctx: DocumentContext) => {
  let nonce = cspNonce(ctx);
  if (nonce) {
    let { directives, reportOnly } = getCsp(ctx);
    if (directives) {
      directives = extendCsp(directives, {
        ...(directives["script-src"] ? { "script-src": `nonce-${nonce}` } : {}),
        ...(directives["style-src"] ? { "style-src": `nonce-${nonce}` } : {}),
      });
      setCsp(ctx, directives, reportOnly);
    }
  }
  return nonce;
};
