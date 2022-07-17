import { mergeDeepWithKey, difference, map } from "ramda";
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

export const arrayifyCspValues = (
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
  csp: CspDirectives | CspDirectivesLenient,
  cspExtension: CspDirectives | CspDirectivesLenient,
  mode: "prepend" | "append" | "override" = "prepend"
): CspDirectives => {
  const concatValues = (
    _k: string,
    l: string[] | boolean,
    r: string[] | boolean
  ) =>
    Array.isArray(l) && Array.isArray(r) && mode !== "override"
      ? mode === "append"
        ? [...l, ...difference(r, l)]
        : [...difference(r, l), ...l]
      : !r
      ? undefined
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
