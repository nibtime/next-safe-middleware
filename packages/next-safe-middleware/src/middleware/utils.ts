import type { CSP } from "../types";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY, CSP_NONCE_HEADER } from "../constants";
import { fromCspContent, toCspContent } from "../utils";
import { nanoid } from "nanoid";

export const setCspHeader = (cspContent: string, res: Response, reportOnly?: boolean) => {
  const isReportOnly = reportOnly ?? !!res.headers.get(CSP_HEADER_REPORT_ONLY);
  if(isReportOnly) {
    res.headers.delete(CSP_HEADER)
    res.headers.set(CSP_HEADER_REPORT_ONLY, cspContent)
  }
  else {
    res.headers.delete(CSP_HEADER_REPORT_ONLY)
    res.headers.set(CSP_HEADER, cspContent)
  }
}

export const getCspHeader = (res: Response) => {
  return res.headers.get(CSP_HEADER) || res.headers.get(CSP_HEADER_REPORT_ONLY)
}

export const pullCspFromResponse: (res: Response) => CSP | undefined = (
  res
) => {
  const cspContent = getCspHeader(res)
  if (cspContent) {
    return fromCspContent(cspContent);
  }
  return undefined;
};

export const pushCspToResponse = (csp: CSP, res: Response, reportOnly?: boolean) => {
  setCspHeader(toCspContent(csp), res, reportOnly)
};

export const cspNonce = (res: Response) => {
  let nonce = res.headers.get(CSP_NONCE_HEADER)
  if(!nonce) {
    nonce = nanoid()
    res.headers.set(CSP_NONCE_HEADER, nonce)
  }
  return nonce
}
