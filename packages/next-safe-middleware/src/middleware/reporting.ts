import type { Middleware } from "./types";
import { extendCsp } from "../utils";
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
  includeSubdomains?: true;
};

export type ReportingCfgCSP = {
  /** endpoint for report-uri directive (is deprecated in new browsers) */
  reportUri?: string;
  /**
   * group name for the report-to directive.
   *
   * Must match a group name in the Report-To header
   * that accepts CSP violation reports in Reporting API format.
   *
   * Will be ommitted from CSP if no match is present.
   *
   * Will be set to `default` if omited
   * @see https://canhas.report/csp-report-to
   */
  reportTo?: string;
  /**
   * adds `report-sample` to supported directives
   *
   * e.g. if added to script-src, the first 40 characters of a blocked script will be added
   * to the CSP violation report
   */
  reportSample?: true;
};

export type ReportingCfg = {
  /**
   * a JS object representing a valid Report-To header
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#header
   */
  reportTo?: ReportTo | ReportTo[];
  /**
   * configure concerning CSP directives alongside the Reporting API configuration
   * @see https://canhas.report/csp-report-to
   *
   * if set to `true`, the group name `default` will be set for `report-to` directive
   */
  csp?: ReportingCfgCSP | true;
};

/**
 *
 * @param reportTo a JS object representing a valid Report-To header
 * @returns a stringifed value of the object to be set as header value
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#example_server
 */
const stringifyReportTo = (reportTo: ReportTo) =>
  JSON.stringify(reportTo).replace(/\\"/g, '"')

/**
 * @see https://developers.google.com/web/updates/2018/09/reportingapi
 * @param cfg a configuration object for the Reporting API
 * @returns a middleware that extends a continued response of a middleware chain
 * with the configured reporting capabilites
 */
const reporting: (cfg: ReportingCfg) => Middleware =
  ({ reportTo = [], csp: cspCfg }) =>
  (req, evt, res) => {
    if (!res) {
      return;
    }
    const reportToHeaderValue = Array.isArray(reportTo)
      ? reportTo.map((r) => stringifyReportTo(r)).join(",")
      : stringifyReportTo(reportTo);

    if(reportToHeaderValue) {
      res.headers.set("report-to", reportToHeaderValue);
    }

    const cspGroup = cspCfg === true ? "default" : cspCfg.reportTo ? cspCfg.reportTo : "default";

    const groupMatches = (group?: string) =>
      (!group && cspGroup === "default") || group === cspGroup;

    const reportToHasCspGroup = Array.isArray(reportTo)
      ? !!reportTo.find((r) => groupMatches(r.group))
      : groupMatches(reportTo.group);

    const cspReportUri = cspCfg !== true && cspCfg?.reportUri;
    const reportSample = cspCfg !== true && cspCfg?.reportSample;

    if (cspReportUri || reportToHasCspGroup) {
      let csp = pullCspFromResponse(res);
      if (csp) {
        csp = extendCsp(
          csp,
          {
            ...(cspReportUri ? { "report-uri": cspReportUri } : {}),
            ...(reportToHasCspGroup ? { "report-to": cspGroup } : {}),
          },
          "override"
        );
        if (reportSample) {
          csp = extendCsp(
            csp,
            {
              "script-src": `'report-sample'`,
            },
            "append"
          );
        }
        pushCspToResponse(csp, res);
      }
    }
  };

export default reporting;
