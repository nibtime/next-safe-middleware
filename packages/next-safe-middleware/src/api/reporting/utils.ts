import type {
  CspReportUriPayload,
  Reporter,
  ReportingData,
  ReportToPayload,
  ReportToSerialized,
} from "./types";

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

 * @param x - some unknown input
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
 * @param cspReportUriEndpoint
 * URL to an endpoint that accepts CSP violations in data format of `report-uri` directive
 * @param reportToPayload
 * payload in data format of `report-to` directive
 * @returns
 * an array of fetch requests to `cspReportUriEndpoint` with `report-to`directive format
 * converted to `report-uri` directive format
 *
 */
export const cspReportUriRequestsFromReportTo = (
  cspReportUriEndpoint: string,
  reportToPayload: ReportToPayload
) => {
  return reportToPayload
    .filter(({ type, body }) => type === "csp-violation" && !!body)
    .map(({ body, user_agent }) => {
      const {
        disposition,
        documentURL,
        effectiveDirective,
        originalPolicy,
        blockedURL,
        lineNumber,
        referrer,
        sample,
        sourceFile,
        statusCode,
      } = body;

      const cspReport: CspReportUriPayload = {
        "csp-report": {
          "blocked-uri": blockedURL || "",
          "violated-directive": effectiveDirective,
          "source-file": sourceFile || "",
          "original-policy": originalPolicy,
          "document-uri": documentURL,
          "script-sample": sample || "",
          "line-number": lineNumber || 0,
          "column-number": 0,
          referrer: referrer || "",
        },
      };
      return fetch(cspReportUriEndpoint, {
        method: "POST",
        body: JSON.stringify(cspReport),
        headers: {
          "user-agent": user_agent,
          "content-type": "application/json",
        },
      });
    });
};

/**
 *
 * @param sentryCspEndpoint
 * the CSP endpoint of your Sentry project. 
 * @see https://docs.sentry.io/product/security-policy-reporting/ - Has convenient copy+paste function
 * @returns
 * a reporter function compatible with reporting API handler. Ingests CSP violation reports
 * of both directives (`report-to`, `report-uri`) into your Sentry project.
 *
 * @example
 * // pages/api/reporting.js
 * import {
 *   reporting,
 *   sentryCspReporterForEndpoint
 * } from '@komw/next-safe-middleware/dist/api';
 *
 * const sentryCspEndpoint = process.env.SENTRY_CSP_ENDPOINT;
 * const sentryCspReporter = sentryCspReporterForEndpoint(sentryCspEndpoint!);
 *
 * export default reporting(sentryCspReporter)
 */
export const sentryCspReporterForEndpoint =
  (sentryCspEndpoint: string): Reporter =>
  async (data, req) => {
    if (data.kind === "csp-report-uri") {
      const userAgent = req.headers["user-agent"];
      await fetch(sentryCspEndpoint, {
        method: "POST",
        body: JSON.stringify(data.payload),
        headers: {
          "user-agent": userAgent,
          "content-type": "application/json",
        },
      });
      return;
    }
    if (data.kind === "report-to") {
      await Promise.allSettled(
        cspReportUriRequestsFromReportTo(sentryCspEndpoint, data.payload)
      );
      return;
    }
  };
