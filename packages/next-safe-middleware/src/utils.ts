import { mergeWithKey, uniq } from "ramda";
import type {
  BooleanDirectives,
  CspDirectives,
  CspDirectivesLenient,
  CspFilter,
} from "./types";

const isBoolDirective = (directive: string) => {
  return ["upgrade-insecure-requests", "block-all-mixed-content"].includes(
    directive
  );
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
  if(directiveValue.startsWith("'") && directiveValue.endsWith("'")) {
    return directiveValue.slice(1, -1)
  }
  return directiveValue
}

export const arrayifyCspValues = (
  values: string | string[] | boolean
): string[] | boolean => {
  if (typeof values !== "string") {
    return values;
  }
  return values
    .trim()
    .split(" ")
    .map((v) => v.trim())
    .filter(Boolean);
};

const arrayifyCspDirectives = (
  directives: CspDirectives | CspDirectivesLenient
): CspDirectives => {
  const arrayifiedEntries = Object.entries(directives).map(
    ([directive, values]) => {
      return [directive, arrayifyCspValues(values)];
    }
  );
  return Object.fromEntries(
    arrayifiedEntries.filter(([k, v]) =>
      k && v && Array.isArray(v) ? v.length : true
    )
  );
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
      .trim()
      .split(";")
      .filter(Boolean)
      .map((line) =>
        line
          .split(" ")
          .map((lineItem) => lineItem.trim())
          .filter(Boolean)
      )
      .filter(Boolean)
      .map((line) => {
        const directive = line[0];
        const values = line.slice(1);
        if (isBoolDirective(directive)) {
          return [directive, true];
        }
        return (directive && values.length ? [directive, values.map(unquotify)] : []) as [
          keyof CspDirectives,
          string[]
        ];
      })
  );

export const extendCsp = (
  csp: CspDirectives | CspDirectivesLenient,
  cspExtension: CspDirectives | CspDirectivesLenient,
  mode: "prepend" | "append" | "override" = "prepend"
): CspDirectives => {
  const concatValues = (_k: string, l: string[], r: string[]) =>
    mode !== "override"
      ? uniq(mode === "append" ? [...l, ...r] : [...r, ...l])
      : r;
  return mergeWithKey(
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
        acc[directive] = values.filter((v: string) => !excludePattern.test(v));
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
