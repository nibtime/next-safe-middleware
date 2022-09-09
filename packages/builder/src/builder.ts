import type {
  CspDirectives,
  CspDirectivesLenient,
  CspFilter,
  NonBooleanCspDirectives,
  HashWithAlgorithm,
  NonceWithPrefix,
} from "./types";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "./constants";
import {
  arrayifyCspDirectives,
  cspDirectiveHas,
  extendCsp,
  filterCsp,
  fromCspContent,
  toCspContent,
} from "./utils";

export type BuilderConstructorObject = {
  directives?: CspDirectives | CspDirectivesLenient | string;
  reportOnly?: boolean;
};

export type CspBuilderConstructorParam =
  | BuilderConstructorObject
  | CspBuilder
  | string
  | [string, string];

const empty = { directives: {} };
export class CspBuilder {
  protected _csp: { directives: CspDirectives; reportOnly?: boolean };

  constructor(param?: CspBuilderConstructorParam) {
    if (param) {
      if (param instanceof CspBuilder) {
        this._csp = { ...param._csp };
      } else if (typeof param === "string") {
        this._csp = { directives: fromCspContent(param) };
      } else if (Array.isArray(param)) {
        const isCspHeader = param[0] === CSP_HEADER;
        const isCspReportOnlyHeader = param[0] === CSP_HEADER_REPORT_ONLY;
        if (!(isCspHeader || isCspReportOnlyHeader)) {
          this._csp = {...empty};
        } else {
          this._csp = {
            directives: fromCspContent(param[1]),
            reportOnly: !isCspHeader && isCspReportOnlyHeader,
          };
        }
      } else {
        this._csp = {
          directives:
            typeof param.directives === "string"
              ? fromCspContent(param.directives)
              : arrayifyCspDirectives(param.directives ?? {}),
          reportOnly: param.reportOnly || false,
        };
      }
    } else {
      this._csp = {...empty};
    }
  }

  public withDirectives(
    cspDirectives?: CspDirectives | CspDirectivesLenient | string,
    mergeDirectiveValues: "append" | "prepend" | "override" = "append"
  ) {
    const extend =
      typeof cspDirectives === "string"
        ? fromCspContent(cspDirectives)
        : cspDirectives;
    this._csp.directives = extendCsp(
      this._csp.directives,
      extend,
      mergeDirectiveValues
    );
    return this;
  }

  public withoutDirectives(excludeDirectives: (keyof CspDirectives)[]) {
    for (const directive of excludeDirectives) {
      delete this._csp.directives[directive];
    }
    return this;
  }

  public withoutDirectiveValues(excludePatterns: CspFilter) {
    this._csp.directives = filterCsp(this._csp.directives, excludePatterns);
    return this;
  }

  public withReportOnly(reportOnly = true) {
    this._csp.reportOnly = reportOnly;
    return this;
  }

  public hasDirective(directive: keyof CspDirectives) {
    const directiveValue = this._csp.directives[directive];
    if (typeof directiveValue === "boolean") {
      return directiveValue;
    }
    if (!directiveValue) {
      return false;
    }
    return directiveValue.length > 0;
  }

  public hasDirectiveWithPattern(
    directive: keyof NonBooleanCspDirectives,
    pattern: RegExp | string
  ) {
    cspDirectiveHas(this._csp.directives, directive, pattern)
      ? this
      : undefined;
  }

  public toHeaderValue() {
    return toCspContent(this._csp.directives);
  }

  public toHeaderKeyValue() {
    const key = this._csp.reportOnly ? CSP_HEADER_REPORT_ONLY : CSP_HEADER;
    return [key, this.toHeaderValue()] as [
      typeof CSP_HEADER | typeof CSP_HEADER_REPORT_ONLY,
      string
    ];
  }

  public toString() {
    return this.toHeaderValue();
  }

  public withNonceApplied(nonce: string) {
    const nonceWithPrefix: NonceWithPrefix = `nonce-${nonce}`;
    if (this.hasDirective("script-src")) {
      this.withoutDirectiveValues({
        "script-src": /nonce-/,
      }).withDirectives({ "script-src": [nonceWithPrefix] });
    }
    if (this.hasDirective("style-src")) {
      this.withoutDirectiveValues({
        "style-src": /nonce-/,
      }).withDirectives({ "style-src": [nonceWithPrefix] });
    }
    if (this.hasDirective("style-src-elem")) {
      this.withoutDirectiveValues({
        "style-src-elem": /nonce-/,
      }).withDirectives({ "style-src-elem": [nonceWithPrefix] });
    }
    return this;
  }

  public csp() {
    return { ...this._csp };
  }

  public withStrictDynamic(
    hashesOrNonce: HashWithAlgorithm[] | string,
    fallback: CspDirectives["script-src"] = ["https:", "unsafe-inline"],
    extendScriptSrc = false
  ) {
    const hashes = Array.isArray(hashesOrNonce) ? hashesOrNonce : [];
    const nonce = typeof hashesOrNonce === "string" ? hashesOrNonce : "";
    this.withDirectives(
      {
        "script-src": ["strict-dynamic", ...fallback, ...hashes],
      },
      extendScriptSrc ? "append" : "override"
    );
    if (nonce) {
      this.withNonceApplied(nonce);
    }
    return this;
  }

  public withStyleHashes(
    elemHashes: HashWithAlgorithm[] = [],
    attrHashes: HashWithAlgorithm[] = [],
    removeUnsafeInline = true
  ) {
    const unsafeHashes = attrHashes.length ? ["unsafe-hashes"] : [];
    if (elemHashes.length || attrHashes.length) {
      this.withDirectives({
        "style-src": [...elemHashes, ...attrHashes, ...unsafeHashes],
      });
    }
    if (this.hasDirective("style-src-elem") && elemHashes.length) {
      this.withDirectives({
        "style-src-elem": [...elemHashes],
      });
    }
    if (this.hasDirective("style-src-attr") && attrHashes.length) {
      this.withDirectives({
        "style-src-attr": [...attrHashes, ...unsafeHashes],
      });
    }
    if (removeUnsafeInline) {
      this.withoutDirectiveValues({
        "style-src": ["unsafe-inline"],
        "style-src-elem": ["unsafe-inline"],
        "style-src-attr": ["unsafe-inline"],
      });
    }
    return this;
  }

  public withMergedBuilder(b: CspBuilder) {
    const { directives, reportOnly } = b.csp();
    this.withDirectives(directives);
    this._csp.reportOnly = reportOnly ?? this._csp.reportOnly;
  }

  public reset() {
    this._csp = {...empty};
  }

  public isEmpty() {
    return !Object.keys(this._csp.directives).length;
  }
}
