import { mergeDeepWithKey, difference, map } from "ramda";
import { CSP_HEADER, CSP_HEADER_REPORT_ONLY } from "./constants";
import type {
  BooleanDirectives,
  CspDirectives,
  CspDirectivesLenient,
  CspFilter,
} from "./types";

const isBoolDirective = (directive: string) => {
  return [
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "sandbox",
  ].includes(directive);
};

const singleQuotify = (directiveValue: string) => `'${directiveValue}'`;

const isLiteralDirectiveValue = (directiveValue: string) => {
  const c1 = [
    "strict-dynamic",
    "report-sample",
    "self",
    "unsafe-eval",
    "unsafe-hashes",
    "unsafe-inline",
    "none",
  ].includes(directiveValue);
  const c2 = ["nonce", "sha256", "sha384", "sha512"].reduce(
    (is, next) => is || directiveValue.startsWith(`${next}-`),
    false
  );
  return c1 || c2;
};

const singleQuotifiedIfLiteral = (directiveValue: string) =>
  isLiteralDirectiveValue(directiveValue)
    ? singleQuotify(directiveValue)
    : directiveValue;

const unquotify = (directiveValue: string) => {
  if (directiveValue.startsWith("'") && directiveValue.endsWith("'")) {
    return directiveValue.slice(1, -1);
  }
  return directiveValue;
};

const arrayifyCspValues = (
  values: string | string[] | boolean
): string[] | boolean => {
  if (typeof values === "boolean") {
    return values;
  }
  let arrayValues: string[];
  if (typeof values === "string") {
    arrayValues = values
      .trim()
      .split(" ")
      .map((v) => v.trim());
  } else {
    arrayValues = values || [];
  }
  return arrayValues.filter(Boolean);
};

const arrayifyCspDirectives = (
  directives: CspDirectives | CspDirectivesLenient
): CspDirectives => {
  return map(arrayifyCspValues, directives) as CspDirectives;
};

export const toCspContent = (csp: CspDirectives | CspDirectivesLenient) =>
  Object.entries(arrayifyCspDirectives(csp))
    .map(([attr, values]) =>
      typeof values == "boolean"
        ? isBoolDirective(attr) && values
          ? attr
          : ""
        : `${attr} ${values.map(singleQuotifiedIfLiteral).join(" ")}`
    )
    .filter(Boolean)
    .join(";");

export const fromCspContent = (content: string): CspDirectives =>
  Object.fromEntries(
    content
      // split to directive lines
      .split(";")
      .map((line) =>
        line
          // get rid of execess whitespace around line
          .trim()
          // line items are split by single space ...
          .split(" ")
          // ... if there are multiple, get rid of them
          .map((lineItem) => lineItem.trim())
          .filter(Boolean)
      )
      // map to CspDirectives
      .map((line) => {
        const directive = line[0];
        const values = line.slice(1);
        if (isBoolDirective(directive)) {
          return [directive, true];
        }
        return (
          directive && values.length
            ? [directive, values.map(unquotify)]
            : undefined
        ) as [keyof CspDirectives, string[]];
      })
      // get rid of anything undefined
      .filter(Boolean)
  );

export const extendCsp = (
  csp?: CspDirectives | CspDirectivesLenient,
  cspExtension?: CspDirectives | CspDirectivesLenient,
  mergedDirectiveValues: "append" | "prepend" | "override" = "append"
): CspDirectives => {
  const concatValues = (
    _k: string,
    l: string[] | boolean,
    r: string[] | boolean
  ) =>
    Array.isArray(l) && Array.isArray(r) && mergedDirectiveValues === "append"
      ? [...l, ...difference(r, l)]
      : Array.isArray(l) &&
        Array.isArray(r) &&
        mergedDirectiveValues === "prepend"
      ? [...difference(r, l), ...l]
      : r;
  return mergeDeepWithKey(
    concatValues,
    arrayifyCspDirectives(csp),
    arrayifyCspDirectives(cspExtension)
  );
};

export const filterCsp = (
  directives: CspDirectives | CspDirectivesLenient,
  excludePatterns: CspFilter
): CspDirectives => {
  return Object.entries(arrayifyCspDirectives(directives)).reduce(
    (acc, [attr, values]) => {
      const directive = attr;
      const excludePattern = excludePatterns[directive];
      if (excludePattern && typeof values !== "boolean") {
        acc[directive] = values.filter((v: string) =>
          Array.isArray(excludePattern)
            ? !excludePattern.includes(v)
            : !excludePattern.test(v)
        );
      } else {
        acc[directive] = values;
      }
      return acc;
    },
    {} as CspDirectives
  );
};

export const cspDirectiveHas = (
  directives: CspDirectives | CspDirectivesLenient,
  directive: Exclude<keyof CspDirectives, BooleanDirectives>,
  patternOrValue: RegExp | string
) => {
  const directiveValues = arrayifyCspDirectives(directives)[directive];
  if (typeof directiveValues === "boolean") {
    return directiveValues;
  }
  if (!directiveValues) {
    return false;
  }
  return directiveValues.some((v) =>
    typeof patternOrValue === "string"
      ? v.includes(patternOrValue)
      : patternOrValue.test(v)
  );
};

type BuilderConstructorObj = {
  directives?: CspDirectives | CspDirectivesLenient | string;
  reportOnly?: boolean;
};

type CspBuilderConstructorParam =
  | BuilderConstructorObj
  | CspBuilder
  | string
  | [string, string];

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
        this._csp = {
          directives: fromCspContent(param[1]),
          reportOnly: !isCspHeader && isCspReportOnlyHeader,
        };
      } else {
        this._csp = {
          directives:
            typeof param.directives === "string"
              ? fromCspContent(param.directives)
              : arrayifyCspDirectives(param.directives ?? {}),
          reportOnly: param.reportOnly,
        };
      }
    } else {
      this._csp = { directives: {} };
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
    directive: Exclude<keyof CspDirectives, BooleanDirectives>,
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
    return [key, this.toHeaderValue()] as [string, string];
  }

  public toString() {
    return this.toHeaderValue();
  }

  public withNonceApplied(nonce: string) {
    if (this.hasDirective("script-src")) {
      this.withoutDirectiveValues({
        "script-src": /nonce/,
      });
      this.withDirectives({ "script-src": [`nonce-${nonce}`] });
    }
    if (this.hasDirective("style-src")) {
      this.withoutDirectiveValues({
        "style-src": /nonce/,
      });
      this.withDirectives({ "style-src": [`nonce-${nonce}`] });
    }
    if (this.hasDirective("style-src-elem")) {
      this.withoutDirectiveValues({
        "style-src-elem": /nonce/,
      });
      this.withDirectives({ "style-src-elem": [`nonce-${nonce}`] });
    }
    return this;
  }

  public csp() {
    return { ...this._csp };
  }

  public withStrictDynamic(
    hashesOrNonce: string | string[],
    fallback: CspDirectives["script-src"] = ["https:", "unsafe-inline"],
    extendScriptSrc = false
  ) {
    const hashes = Array.isArray(hashesOrNonce) ? hashesOrNonce : []
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
    elemHashes: string[] = [],
    attrHashes: string[] = [],
  ) {
    const unsafeHashes = attrHashes.length ? ["unsafe-hashes"] : [];
    if (elemHashes.length || attrHashes.length) {
      this.withoutDirectiveValues({ "style-src": ["unsafe-inline"] });
      this.withDirectives({
        "style-src": [...elemHashes, ...attrHashes, ...unsafeHashes],
      });
    }
    if (this.hasDirective("style-src-elem") && elemHashes.length) {
      this.withoutDirectiveValues({ "style-src-elem": ["unsafe-inline"] });
      this.withDirectives({
        "style-src-elem": [...elemHashes],
      });
    }
    if (this.hasDirective("style-src-attr") && attrHashes.length) {
      this.withoutDirectiveValues({ "style-src-attr": ["unsafe-inline"] });
      this.withDirectives({
        "style-src-attr": [...attrHashes, ...unsafeHashes],
      });
    }
    return this;
  }
}
