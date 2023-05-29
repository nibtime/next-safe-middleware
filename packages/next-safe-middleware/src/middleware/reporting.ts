import type { UriPath } from "@komw/next-safe-builder";
import type { MiddlewareBuilder } from "./builder/types";
import { differenceWith } from "ramda";
import { memoizeResponseHeader, chainableMiddleware } from "./compose";
import { unpackConfig, withDefaultConfig } from "./builder";
import { cachedCspBuilder } from "./utils";

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
  csp?: ReportingCSP | false;
};

/**
 * @param reportTo an object representing a valid Report-To header
 * @returns a stringifed value of the object to be set as header value
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#example_server
 */
const stringifyReportTo = (reportTo: ReportTo) =>
  JSON.stringify(reportTo).replace(/\\"/g, '"');

const reportToCached = memoizeResponseHeader<ReportTo[]>(
  "report-to",
  (x: string) => (x ? x.split(",").map((y) => JSON.parse(y)) : []),
  (x: ReportTo[]) => x.map(stringifyReportTo).join(","),
  (r1: ReportTo[], r2: ReportTo[]) => {
    const r1Diff = differenceWith((r1, r2) => r1.group === r2.group, r1, r2);
    return [...r1Diff, ...r2];
  }
);

const withBasePath = (reportTo: ReportTo[], basePath?: string) => {
  if (basePath) {
    return reportTo.map(({ endpoints, ...rest }) => ({
      ...rest,
      endpoints: endpoints.map(({ url, ...rest }) => {
        if (url.startsWith("/")) {
          return { ...rest, url: `${basePath}${url}` };
        }
        return { ...rest, url };
      }),
    }));
  }
  return reportTo;
};

const _reporting: MiddlewareBuilder<ReportingCfg> = (cfg) =>
  chainableMiddleware(async (req, evt, ctx) => {
    const config = await unpackConfig(cfg, req, evt, ctx);
    const { reportTo = [], csp: cspCfg } = config;

    const { basePath } = req.nextUrl;
    const arrayReportTo = withBasePath(
      Array.isArray(reportTo) ? reportTo : [reportTo],
      basePath
    );
    if (arrayReportTo.length) {
      const [, setMergeReportTo] = reportToCached(ctx);
      setMergeReportTo(arrayReportTo);
    }

    const [reportToCache] = reportToCached(ctx);

    if (!cspCfg) {
      return;
    }

    const cspGroup = cspCfg.reportTo;

    const groupMatches = (group?: string) =>
      (!group && cspGroup === "default") ||
      (cspGroup ? group === cspGroup : false);

    const reportToHasCspGroup = !!reportToCache.find((r) =>
      groupMatches(r.group)
    );

    let cspBuilder = await cachedCspBuilder(ctx);
    const { reportUri = "", reportSample } = cspCfg;
    if (reportUri) {
      cspBuilder.withDirectives({
        "report-uri": [
          basePath && reportUri.startsWith("/")
            ? `${basePath}${reportUri}`
            : reportUri,
        ],
      });
    }
    if (reportToHasCspGroup) {
      cspBuilder.withDirectives({ "report-to": [cspGroup] });
    }
    if (reportSample) {
      if (cspBuilder.hasDirective("script-src")) {
        cspBuilder.withDirectives({ "script-src": ["report-sample"] });
      }
      if (cspBuilder.hasDirective("style-src")) {
        cspBuilder.withDirectives({ "style-src": ["report-sample"] });
      }
      if (cspBuilder.hasDirective("style-src-elem")) {
        cspBuilder.withDirectives({ "style-src-elem": ["report-sample"] });
      }
      if (cspBuilder.hasDirective("style-src-attr")) {
        cspBuilder.withDirectives({ "style-src-attr": ["report-sample"] });
      }
    }
  });

/**
 * @param cfg a configuration object to set up reporting according to the Reporting API spec
 * @returns a middleware that sets response headers according to the configured reporting capabilites
 * @see https://developers.google.com/web/updates/2018/09/reportingapi
 *
 * @example
 * import {
 *   chainMatch,
 *   isPageRequest,
 *   csp,
 *   strictDynamic,
 *   reporting,
 * } from "@komw/next-safe-middleware";
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
 * export default chainMatch(isPageRequest)(...securityMiddleware);
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
