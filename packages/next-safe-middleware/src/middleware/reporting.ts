import type { Middleware, MiddlewareConfig } from "./types";
import { extendCsp } from "../utils";
import { ensureChainContext, unpackConfig } from "./builder";
import { pullCspFromResponse, pushCspToResponse } from "./utils";

/**
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#fields
 */
export type ReportTo<Groups extends string = string> = {
  group?: Groups;
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

export type ReportingCfgCSP<Groups extends string = string> = {
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
   * Will be set to `default` if omitted
   * @see https://canhas.report/csp-report-to
   */
  reportTo?: Groups | false;
  /**
   * adds `report-sample` to supported directives
   *
   * e.g. if added to script-src, the first 40 characters of a blocked script will be added
   * to the CSP violation report
   *
   * @see https://csper.io/blog/csp-report-filtering
   */
  reportSample?: true;
};

export type ReportingCfg<Groups extends string = string> = {
  /**
   * a JS object representing a valid Report-To header
   * @see https://developers.google.com/web/updates/2018/09/reportingapi#header
   */
  reportTo?: ReportTo<Groups> | ReportTo<Groups>[];
  /**
   * configure concerning CSP directives alongside the Reporting API configuration
   * @see https://canhas.report/csp-report-to
   *
   * if set to `true`, the group name `default` will be set for `report-to` directive
   */
  csp?: ReportingCfgCSP<Groups> | true;
};

/**
 *
 * @param reportTo a JS object representing a valid Report-To header
 * @returns a stringifed value of the object to be set as header value
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#example_server
 */
const stringifyReportTo = (reportTo: ReportTo) =>
  JSON.stringify(reportTo).replace(/\\"/g, '"');

/**
 * @see https://developers.google.com/web/updates/2018/09/reportingapi
 * @param cfg a configuration object/initializer for the Reporting API
 * @returns a middleware that extends a continued response of a middleware chain
 * with the configured reporting capabilites
 */
const reporting: <Groups extends string = string>(
  cfg: MiddlewareConfig<ReportingCfg<Groups>>
) => Middleware = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    const { reportTo = [], csp: cspCfg } = await unpackConfig(req, res, cfg);
    const reportToHeaderValue = Array.isArray(reportTo)
      ? reportTo.map((r) => stringifyReportTo(r)).join(",")
      : stringifyReportTo(reportTo);

    if (reportToHeaderValue) {
      res.headers.set("report-to", reportToHeaderValue);
    }

    if (!cspCfg) {
      return;
    }

    const cspGroup =
      cspCfg === true
        ? "default"
        : cspCfg.reportTo === false
        ? ""
        : cspCfg.reportTo
        ? cspCfg.reportTo
        : "default";

    const groupMatches = (group?: string) =>
      (!group && cspGroup === "default") ||
      (cspGroup ? group === cspGroup : false);

    const reportToHasCspGroup = Array.isArray(reportTo)
      ? !!reportTo.find((r) => groupMatches(r.group))
      : groupMatches(reportTo.group);

    let csp = pullCspFromResponse(res);
    if (!csp) {
      return;
    }
    if (cspCfg === true) {
      if (reportToHasCspGroup) {
        csp = extendCsp(
          csp,
          {
            "report-to": cspGroup,
          },
          "override"
        );
      }
    } else {
      const cspReportUri = cspCfg.reportUri;
      const reportSample = cspCfg.reportSample;
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
              ...(csp["script-src"] ? { "script-src": `'report-sample'` } : {}),
              ...(csp["style-src"] ? { "style-src": `'report-sample'` } : {}),
            },
            "append"
          );
        }
      }
    }
    pushCspToResponse(csp, res);
  });

export default reporting;
