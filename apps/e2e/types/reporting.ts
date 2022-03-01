// type info based from log extraction with https://transform.tools/json-to-typescript

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

// can be extended with cased types to paint the whole report-to picture
export type ReportToItem = ReportToCspViolationItem;
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

export type CspReportUriPayload = {
  "csp-report": CspReport;
};

export type ReportToData = {
  kind: "report-to";
  data: ReportToPayload;
};
export type CspReportUriData = {
  kind: "csp-report";
  data: CspReport;
};

export type ReportingData = ReportToData | CspReportUriData;

// TODO: find out what's required and what's optional
export const isReportToItem = (x: any): x is ReportToItem => {
  const requiredKeys = ["age", "type", "body"];
  return (
    typeof x === "object" &&
    Object.keys(x).filter((key) => key in requiredKeys).length ===
      requiredKeys.length
  );
};

export const isReportToPayload = (x: any): x is ReportToPayload => {
  return Array.isArray(x) && x.every(isReportToItem);
};

export const isCspReportUriPayload = (x: any): x is CspReportUriPayload => {
  return typeof x === "object" && !!x["csp-report"];
};

export const extractReportingData = (
  data: unknown
): ReportingData | undefined => {
  if (isReportToPayload(data)) {
    return {
      kind: "report-to",
      data,
    };
  }
  if (isCspReportUriPayload(data)) {
    const kind = "csp-report";
    return {
      kind,
      data: data[kind],
    };
  }
  return undefined;
};
