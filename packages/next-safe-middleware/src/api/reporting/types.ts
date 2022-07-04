// type info based from log extraction with https://transform.tools/json-to-typescript

import type { NextApiRequest } from "next";

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

export type ReportToSerialized<AdditionalReportToTypes = never> =
  ReportToSerializedBase & (ReportToCspViolation | AdditionalReportToTypes);

/**
 * the data shape of that payload that browsers send to endpoints of Report-To headers
 * @see https://w3c.github.io/reporting/#serialize-reports
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#reportypes
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#debug
 *
 */
export type ReportToPayload<AdditionalFormats = never> =
  ReportToSerialized<AdditionalFormats>[];

/**
 * the data shape of CSP violation reports for the `report-uri` directive
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
 * @see https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
 *
 */
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
 * the data shape of the payload that browsers send to endpoints of CSP `report-uri` directive
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
   * the data shape of that payload that browsers send to endpoints of `Report-To` headers
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
   * the data shape of the payload that browsers send to endpoints of CSP `report-uri` directive
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
   * @see https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
   *
   */
  payload: CspReportUriPayload;
};

/**
 * Union shape for all kinds of reporting data
 * @see https://w3c.github.io/reporting/#serialize-reports
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#reportypes
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#debug
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
 * @see https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
 *
 */
export type ReportingData = PayloadKindReportTo | PayloadKindCspReportUri;

/**
 * Function that processes reporting data sent to Next function endpoints
 */
export type Reporter = (data: ReportingData, req: NextApiRequest) => Promise<void> | void
