import { mergeWithKey, uniq } from "ramda";
import type { CSP, CSPFilter, CSPDirective } from "./types";

export const arrayifyCspValues = (values: string | string[]): string[] => {
  if (typeof values !== "string") {
    return values;
  }
  return values
    .trim()
    .split(" ")
    .map((v) => v.trim())
    .filter(Boolean);
};

export const arrayifyCsp = (csp: CSP): Record<CSPDirective, string[]> => {
  const arrayifiedEntries = Object.entries(csp).map(([directive, values]) => {
    return [directive, arrayifyCspValues(values)];
  });
  return Object.fromEntries(
    arrayifiedEntries.filter(([k, v]) => k && v && v.length)
  );
};
export const toCspContent = (csp: CSP) =>
  Object.entries(arrayifyCsp(csp))
    .map(([attr, values]) => `${attr} ${values.join(" ")}`)
    .join(";");

export const fromCspContent = (content: string): CSP =>
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

        return (directive && values.length ? [directive, values] : []) as [
          CSPDirective,
          string[]
        ];
      })
  );

export const extendCsp = (
  csp: CSP,
  cspExtension: CSP,
  mode: "prepend" | "append" | "override" = "prepend"
): CSP => {
  const concatValues = (_k: string, l: string[], r: string[]) =>
    mode !== "override"
      ? uniq(mode === "append" ? [...l, ...r] : [...r, ...l])
      : r;
  return mergeWithKey(
    concatValues,
    arrayifyCsp(csp),
    arrayifyCsp(cspExtension)
  );
};

export const filterCsp = (csp: CSP, cspFilter: CSPFilter): CSP => {
  return Object.entries(arrayifyCsp(csp)).reduce((acc, [attr, values]) => {
    const directive = attr as CSPDirective;
    const filter = cspFilter[directive];
    if (filter) {
      acc[directive] = values.filter((v: string) => !filter.test(v));
    } else {
      acc[directive] = values;
    }
    return acc;
  }, {} as CSP);
};

export const cspDirectiveHas = (
  csp: CSP,
  directive: CSPDirective,
  value: RegExp | string
) => {
  return !!arrayifyCsp(csp)[directive]?.find((v) =>
    typeof value === "string" ? v.includes(value) : value.test(v)
  );
};
