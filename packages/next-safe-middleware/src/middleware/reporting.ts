import type { UriPath } from "../types";
import type { MiddlewareBuilder } from "./builder/types";
import { extendCsp } from "../utils";
import { ensureChainContext, unpackConfig, withDefaultConfig } from "./builder";
import {
  CspCacheKey,
  CspCacheValue,
  ReportToCacheKey,
  ReportToCacheValue,
} from "./finalizers";
import { writeReportToHeader } from "./finalizers";
import { differenceWith } from "ramda";

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
 *
 * @param reportTo an object representing a valid Report-To header
 * @returns a stringifed value of the object to be set as header value
 * @see https://developers.google.com/web/updates/2018/09/reportingapi#example_server
 */
export const stringifyReportTo = (reportTo: ReportTo) =>
  JSON.stringify(reportTo).replace(/\\"/g, '"');

const _reporting: MiddlewareBuilder<
  ReportingCfg,
  CspCacheKey | ReportToCacheKey,
  CspCacheValue | ReportToCacheValue
> = (cfg) =>
  ensureChainContext(async (req, evt, ctx) => {
    const { reportTo = [], csp: cspCfg } = await unpackConfig(
      cfg,
      req,
      evt,
      ctx
    );
    const { basePath } = req.nextUrl;
    const withBasePath = (r: ReportTo[]) => {
      if (basePath) {
        return r.map(({ endpoints, ...rest }) => ({
          ...rest,
          endpoints: endpoints.map(({ url, ...rest }) => {
            if (url.startsWith("/")) {
              return { ...rest, url: `${basePath}${url}` };
            }
            return { ...rest, url };
          }),
        }));
      }
      return r;
    };
    const arrayReportTo = withBasePath(
      Array.isArray(reportTo) ? reportTo : [reportTo]
    );

    if (arrayReportTo.length) {
      const cacheDifference = differenceWith(
        (r1, r2) => r1.group === r2.group,
        (ctx.cache.get("report-to") as ReportTo[]) ?? [],
        arrayReportTo
      );
      ctx.cache.set("report-to", [...cacheDifference, ...arrayReportTo]);
      ctx.finalize.addCallback(writeReportToHeader);
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

    const csp = ctx.cache.get("csp") as CspCacheValue;
    if (!csp) return;

    let { directives, reportOnly } = csp;
    const { reportUri = "", reportSample } = cspCfg;
    directives = extendCsp(
      directives,
      {
        ...(reportUri
          ? {
              "report-uri": [
                basePath && reportUri.startsWith("/")
                  ? `${basePath}${reportUri}`
                  : reportUri,
              ],
            }
          : {}),
        ...(reportToHasCspGroup ? { "report-to": [cspGroup] } : {}),
      },
      "override"
    );
    if (reportSample) {
      directives = extendCsp(
        directives,
        {
          ...(directives["script-src"]
            ? { "script-src": ["report-sample"] }
            : {}),
          ...(directives["style-src"]
            ? { "style-src": ["report-sample"] }
            : {}),
        },
        "append"
      );
    }
    ctx.cache.set("csp", { directives, reportOnly });
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
