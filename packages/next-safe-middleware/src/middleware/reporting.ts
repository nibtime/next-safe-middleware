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
  /** endpoint for report-uri directive (is deprecated in new browsers) */
  reportUri?: string;
  /**
   * group name for the report-to directive.
   *
   * Must match a group name in the Report-To header
   * that accepts CSP violation reports in Reporting API format.
   *
   * Will be set to `default` if omitted
   *
   * Will be ommitted if no match is present in Report-To
   *
   * @see https://canhas.report/csp-report-to
   */
  reportTo?: string | "default";
  /**
   * adds `report-sample` to supported directives
   *
   * e.g. if added to script-src, the first 40 characters of a blocked script will be added
   * to the CSP violation report
   *
   * @see https://csper.io/blog/csp-report-filtering
   */
  reportSample?: boolean;
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
  csp?: ReportingCSP | boolean;
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
const reporting: MiddlewareBuilder<ReportingCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    const { reportTo = [], csp: cspCfg } = await unpackConfig(req, res, cfg);

    const arrayReportTo = Array.isArray(reportTo) ? reportTo : [reportTo];

    const withSubstitutedRelativePaths = arrayReportTo.map((r) => ({
      ...r,
      endpoints: r.endpoints.map((e) => ({
        ...e,
        ...(e.url.startsWith("/")
          ? { url: `${req.nextUrl.origin}${e.url}` }
          : {}),
      })),
    }));
    const reportToHeaderValue = withSubstitutedRelativePaths
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

    const reportToHasCspGroup = !!withSubstitutedRelativePaths.find((r) =>
      groupMatches(r.group)
    );

    let csp = pullCspFromResponse(res);
    if (!csp) {
      return;
    } else {
      const { reportUri = "", reportSample } = cspCfg;
      const cspReportUri = reportUri.startsWith("/")
        ? `${req.nextUrl.origin}${reportUri}`
        : reportUri;
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

export default withDefaultConfig(reporting, {
  csp: {
    reportSample: true,
    reportTo: "default",
  },
});
