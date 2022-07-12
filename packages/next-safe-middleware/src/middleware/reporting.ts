import type { UriPath } from "../types";
import type { MiddlewareBuilder } from "./types";
import { extendCsp } from "../utils";
import { ensureChainContext, unpackConfig, withDefaultConfig } from "./builder";
import { pullCspFromResponse, pushCspToResponse } from "./utils";

/**
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#fields
 */
export type ReportTo = {
  group?: string;
  max_age: number;
  /**
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#load
   */
  endpoints: {
    url: string;
    priority?: number;
    weight?: number;
  }[];
  includeSubdomains?: boolean;
};

export type ReportingCSP = {
  /** endpoint for the `report-uri` directive */
  reportUri?: UriPath;
  /**
   * group name for the `report-to` directive.
   *
   * Must match a group name in the Report-To header
   *
   * @default "default"
   *
   * @see https://canhas.report/csp-report-to
   *
   * Will be ommitted from CSP if no match for this group name is present in the Report-To header.
   * To unset the `report-to` directive from CSP, set to empty string
   *
   */
  reportTo?: string | "default";
  /**
   * adds `report-sample` to supported directives
   *
   * e.g. if added to script-src, the first 40 characters of a blocked script will be added
   * to the CSP violation report
   *
   * @default true
   * @see https://csper.io/blog/csp-report-filtering
   */
  reportSample?: boolean;
};

export type ReportingCfg = {
  /**
   * object/object array representing valid Report-To header(s)
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#header
   */
  reportTo?: ReportTo | ReportTo[];
  /**
   * configuration of CSP directives concerned with reporting
   * @see https://canhas.report/csp-report-to
   */
  csp?: ReportingCSP;
};

/**
 *
 * @param reportTo an object representing a valid Report-To header
 * @returns a stringifed value of the object to be set as header value
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#example_server
 */
const stringifyReportTo = (reportTo: ReportTo) =>
  JSON.stringify(reportTo).replace(/\\"/g, '"');

const _reporting: MiddlewareBuilder<ReportingCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    const { reportTo = [], csp: cspCfg } = await unpackConfig(req, res, cfg);

    const arrayReportTo = Array.isArray(reportTo) ? reportTo : [reportTo];

    const reportToHeaderValue = arrayReportTo
      .map((r) => stringifyReportTo(r))
      .join(",");

    if (reportToHeaderValue) {
      res.headers.set("report-to", reportToHeaderValue);
    }

    if (!cspCfg) {
      return;
    }

    const cspGroup = cspCfg.reportTo;

    const groupMatches = (group?: string) =>
      (!group && cspGroup === "default") ||
      (cspGroup ? group === cspGroup : false);

    const reportToHasCspGroup = !!arrayReportTo.find((r) =>
      groupMatches(r.group)
    );

    let csp = pullCspFromResponse(res);
    if (!csp) {
      return;
    } else {
      const { reportUri = "", reportSample } = cspCfg;
      if (csp) {
        csp = extendCsp(
          csp,
          {
            ...(reportUri ? { "report-uri": [reportUri] } : {}),
            ...(reportToHasCspGroup ? { "report-to": [cspGroup] } : {}),
          },
          "override"
        );
        if (reportSample) {
          csp = extendCsp(
            csp,
            {
              ...(csp["script-src"] ? { "script-src": ["report-sample"] } : {}),
              ...(csp["style-src"] ? { "style-src": ["report-sample"] } : {}),
            },
            "append"
          );
        }
      }
    }
    pushCspToResponse(csp, res);
  });

/**
 * @param cfg a configuration object to set up reporting according to the Reporting API spec
 * @returns a middleware that sets response headers according to the configured reporting capabilites
 * @see https://developers.google.com/web/updates/2018/09/reportingapi
 *
 * @example
 * import {
 *   chain,
 *   csp,
 *   strictDynamic,
 *   reporting,
 * } from "@next-safe/middleware";
 *
 * const securityMiddleware = [
 *   csp(),
 *   strictDynamic(),
 *   reporting({
 *     csp: {
 *       reportUri: "/api/reporting"
 *     },
 *     reportTo: {
 *       max_age: 1800,
 *       endpoints: [{ url: "/api/reporting" }],
 *     },
 *   }),
 * ];
 *
 * export default chain(...securityMiddleware);
 *
 */
const reporting = withDefaultConfig(_reporting, {
  csp: {
    reportSample: true,
    reportTo: "default",
    reportUri: "/api/reporting",
  },
  reportTo: {
    max_age: 1800,
    endpoints: [{ url: "/api/reporting" }],
  },
});

export default reporting;
