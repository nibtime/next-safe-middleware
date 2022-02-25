import type { CSP } from "../types";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "../constants";
import { fromCspContent, toCspContent } from "../utils";

export const pullCspFromResponse: (res: Response) => CSP | undefined = (
  res
) => {
  const cspContent = res.headers.get(CSP_HEADER);
  const cspContentReportOnly = res.headers.get(CSP_HEADER_REPORT_ONLY);
  if (cspContent) {
    return fromCspContent(cspContent);
  }
  if (cspContentReportOnly) {
    return fromCspContent(cspContentReportOnly);
  }
  return undefined;
};

export const pushCspToResponse = (csp: CSP, res: Response) => {
  const hasCsp = !!res.headers.get(CSP_HEADER);
  const hasCspReportOnlyCsp = !!res.headers.get(CSP_HEADER_REPORT_ONLY);
  if (hasCsp) {
    res.headers.set(CSP_HEADER, toCspContent(csp));
    return;
  }
  if (hasCspReportOnlyCsp) {
    res.headers.set(CSP_HEADER_REPORT_ONLY, toCspContent(csp));
  }
};
