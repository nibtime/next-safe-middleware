import { mergeWithKey, uniq } from 'ramda';
import type { CSP, CSPFilter, CSPDirective } from './types';

const arrayifyValues = (csp: CSP): Record<CSPDirective, string[]> => {
  const arrayifiedEntries = Object.entries(csp).map(([directive, values]) => {
    if (typeof values !== 'string') {
      return [directive, values];
    }
    return [
      directive,
      values
        .trim()
        .split(' ')
        .map((v) => v.trim())
        .filter(Boolean)
    ];
  });
  return Object.fromEntries(arrayifiedEntries);
};
export const toCspContent = (csp: CSP) =>
  Object.entries(arrayifyValues(csp))
    .map(([attr, values]) => `${attr} ${values.join(' ')}`)
    .join(';');

export const fromCspContent = (content: string): CSP =>
  Object.fromEntries(
    content
      .trim()
      .split(';')
      .filter(Boolean)
      .map((line) =>
        line
          .split(' ')
          .map((lineItem) => lineItem.trim())
          .filter(Boolean)
      )
      .filter(Boolean)
      .map(
        (line) =>
          (line[0] ? [line[0], line.slice(1)] : []) as [CSPDirective, string[]]
      )
  );

export const extendCsp = (
  csp: CSP,
  cspExtension: CSP,
  mode: 'prepend' | 'append' | 'override' = 'prepend'
): CSP => {
  const concatValues = (_k: string, l: string[], r: string[]) =>
    mode !== 'override'
      ? uniq(mode === 'append' ? [...l, ...r] : [...r, ...l])
      : r;
  return mergeWithKey(
    concatValues,
    arrayifyValues(csp),
    arrayifyValues(cspExtension)
  );
};

export const filterCsp = (csp: CSP, cspFilter: CSPFilter): CSP => {
  return Object.entries(arrayifyValues(csp)).reduce((acc, [attr, values]) => {
    const directive = attr as CSPDirective;
    const filter = cspFilter[directive];
    if (filter) {
      acc[directive] = values.filter((v: string) => !filter.test(v));
    }
    else {
      acc[directive] = values
    }
    return acc;
  }, {} as CSP);
};

export const cspDirectiveHas = (
  csp: CSP,
  directive: CSPDirective,
  value: RegExp | string
) => {
  return !!arrayifyValues(csp)[directive]?.find((v) =>
    typeof value === 'string' ? v.includes(value) : value.test(v)
  );
};
