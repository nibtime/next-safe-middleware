// type info based from log extraction with https://transform.tools/json-to-typescript

import type { NextApiHandler } from "next";

export type ReportToItemBase = {
  age: number;
  url: string;
  user_agent: string;
};

export type ReportToBodyCspViolation = {
  blockedURL: string;
  disposition: string;
  documentURL: string;
  effectiveDirective: string;
  lineNumber: number;
  originalPolicy: string;
  referrer: string;
  sample: string;
  sourceFile: string;
  statusCode: number;
};

export type ReportToCspViolationItem = ReportToItemBase & {
  type: "csp-violation";
  body: ReportToBodyCspViolation;
};

export type AnyViolationItem = ReportToItemBase & {
  type: string;
  body: Record<string, any>;
};

export type ReportToItem = ReportToCspViolationItem | AnyViolationItem;

/**
 * the data shape of what browsers sent to endpoints of Report-To headers
 */
export type ReportToPayload = ReportToItem[];

export type CspReport = {
  "blocked-uri": string;
  "column-number": number;
  "document-uri": string;
  "line-number": number;
  "original-policy": string;
  referrer: string;
  "script-sample": string;
  "source-file": string;
  "violated-directive": string;
};

/**
 * the data shape of what browsers sent to endpoints of CSP report-uri directive
 */
export type CspReportUriPayload = {
  "csp-report": CspReport;
};

export type ReportToData = {
  kind: "report-to";
  data: ReportToPayload;
};

export type CspReportUriData = {
  kind: "csp-report-uri";
  data: CspReportUriPayload;
};

//
export type ReportingData = ReportToData | CspReportUriData;

// TODO: find out what's required and what's optional
export const isReportToItem = (x: any): x is ReportToItem => {
  if (typeof x !== "object") {
    return false;
  }
  const requiredKeys = ["type", "body"];
  const itemKeys = Object.keys(x);
  return requiredKeys.every((key) => itemKeys.includes(key));
};

export const isReportToPayload = (x: any): x is ReportToPayload => {
  return Array.isArray(x) && x.every(isReportToItem);
};

export const isCspReportUriPayload = (x: any): x is CspReportUriPayload => {
  return typeof x === "object" && !!x["csp-report"];
};

export const isReportingData = (x: any): x is ReportingData => {
  return (
    typeof x === "object" &&
    ["csp-report-uri", "report-to"].includes(x["kind"] || "")
  );
};

const maybeArr = (x: string) => x.startsWith("[");
const maybeObj = (x: string) => x.startsWith("{");

const deepJsonParse = (x: unknown) => {
  if (typeof x === "string" && (maybeArr(x) || maybeObj(x))) {
    try {
      return JSON.parse(x);
    } catch {
      return x;
    }
  }
  if (typeof x === "object") {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, deepJsonParse(v)])
    );
  }
  if (Array.isArray(x)) {
    return x.map(deepJsonParse);
  }
  return x;
};

export const extractReportingData = (x: unknown): ReportingData | undefined => {
  if (isReportingData(x)) {
    return x;
  }
  const data = deepJsonParse(x);
  if (isCspReportUriPayload(data)) {
    return {
      kind: "csp-report-uri",
      data: data,
    };
  }
  if (isReportToPayload(data)) {
    return {
      kind: "report-to",
      data,
    };
  }

  return undefined;
};

const apiHandler: (
  process: (reportingData: ReportingData) => Promise<void> | void
) => NextApiHandler = (process) => async (req, res) => {
  try {
    const data = extractReportingData(req.body);
    if (data) {
      await process(data);
      // Accepted: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/202
      res.status(202).end();
      return;
    }
  } finally {
    // Unprocessable Entity: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
    res.status(422).end();
  }
};

export default apiHandler;
