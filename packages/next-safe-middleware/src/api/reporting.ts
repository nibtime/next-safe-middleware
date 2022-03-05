// type info based from log extraction with https://transform.tools/json-to-typescript

import type { NextApiHandler } from "next";

export type ReportToSerializedBase = {
  age: number;
  url: string;
  user_agent: string;
};

/**
 * @see https://w3c.github.io/webappsec-csp/#csp-violation-report
 */
export type CSPViolationReportBody = {
  documentURL: string;
  referrer?: string;
  blockedURL?: string;
  effectiveDirective: string;
  originalPolicy: string;
  sourceFile?: string;
  sample?: string;
  disposition: "enforce" | "report";
  lineNumber?: number;
  statusCode?: number;
};

export type ReportToCspViolation = {
  type: "csp-violation";
  /**
   * @see https://w3c.github.io/webappsec-csp/#csp-violation-report
   */
  body: CSPViolationReportBody;
};

export type ReportToAny = {
  type: string;
  body: Record<string, any> | null;
};

export type ReportToSerialized = ReportToSerializedBase &
  (ReportToCspViolation | ReportToAny);

/**
 * the data shape of what browsers send to endpoints of Report-To headers
 * @see https://w3c.github.io/reporting/#serialize-reports
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#reportypes
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#debug
 *
 */
export type ReportToPayload = ReportToSerialized[];

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
 * the data shape of what browsers send to endpoints of CSP report-uri directive
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
 * @see https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
 *
 */
export type CspReportUriPayload = {
  "csp-report": CspReport;
};

export type PayloadKindReportTo = {
  kind: "report-to";
  /**
   * the serialized payload of what browsers send to endpoints of Report-To headers
   * @see https://w3c.github.io/reporting/#serialize-reports
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#reportypes
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#debug
   *
   */
  payload: ReportToPayload;
};

export type PayloadKindCspReportUri = {
  kind: "csp-report-uri";
  /**
   * the serialized payload of what browsers send to endpoints of CSP report-uri directive
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
   * @see https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
   */
  payload: CspReportUriPayload;
};

export type ReportingData = PayloadKindReportTo | PayloadKindCspReportUri;

// TODO: find out what's required and what's optional
export const isReportToItem = (x: any): x is ReportToSerialized => {
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

/**

 * @param {unknown} x - unknown
 * @returns a `ReportingData` object if the input represents
 * valid reporting data. Otherwise, it returns `undefined`.
 */
export const extractReportingData = (x: unknown): ReportingData | undefined => {
  if (isReportingData(x)) {
    return x;
  }
  const payload = deepJsonParse(x);
  if (isCspReportUriPayload(payload)) {
    return {
      kind: "csp-report-uri",
      payload,
    };
  }
  if (isReportToPayload(payload)) {
    return {
      kind: "report-to",
      payload,
    };
  }

  return undefined;
};

/**
 *
 * @param process a function that processes reporting data (e.g. log to console, send to logging service, etc.)
 * @returns a `NextApiHandler` that processes incoming reporting data. This is what's expected to be exported from files in `pages/api`
 *
 * @example // pages/api/reporting.ts
 *
 * import type{ ReportToPayload, CspReportUriPayload } from "@next-safe/middleware/dist/api";
 * import { reporting } from "@next-safe/middleware/dist/api";
 *
 * const handleReportTo = async (data: ReportToPayload) => {
 * // handle Report-To header
 * };
 *
 * const handleCspReportUri = async (data: CspReportUriPayload) => {
 * // handle CSP reports of report-uri directive
 * };
 *
 * const handler = reporting(async (data) => {
 *            switch (data.kind) {
 *            case "report-to":
 *              handleReportTo(data.payload);
 *              break;
 *            case "csp-report-uri":
 *              handleCspReportUri(data.payload);
 *              break;
 *            }
 * });
 *
 * export default handler;
 */
const apiHandler: (
  process: (data: ReportingData) => Promise<void> | void
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
