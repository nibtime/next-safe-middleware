import type { HashWithAlgorithm } from "@komw/next-safe-builder";
import type { ExcludeList } from "../types";
import React from "react";
import {
  isElementWithChildren,
  isInlineStyleElement,
  isJsxElement,
  isScriptElement,
} from "../utils";
import {
  flatten,
  maxBy,
  range,
  zip,
} from "ramda";
import { hash } from "./algorithm";

const sameLengthPaddedArrays = (a, b) => {
  const maxLength = maxBy((arr) => arr.length, a, b).length;
  const aPadLength = maxLength - a.length;
  const bPadLength = maxLength - b.length;
  const aPadding = range(0, aPadLength).map(() => []);
  const bPadding = range(0, bPadLength).map(() => []);
  return [
    [...a, ...aPadding],
    [...b, ...bPadding],
  ];
};

export const sameLengthPaddedFlatZip = (a, b) => {
  const [aPadded, bPadded] = sameLengthPaddedArrays(a, b);
  return flatten(zip(aPadded, bPadded));
};

export const deepMapExtractScripts = (children: any) => {
  const recurse = (children: any) => {
    if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    } else if (isScriptElement(children)) {
      return [children];
    }
    return [];
  };
  return flatten(recurse(children));
};

export const deepMapStripIntegrity = (children: any) => {
  const recurse = (children: any) => {
    if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    } else if (isJsxElement(children) && !!children.props.integrity) {
      return [React.cloneElement(children, { integrity: null })];
    }
    return [children];
  };
  return flatten(recurse(children));
};

export const deepExtractStyleElemHashes = (
  children: any,
  exclude: ExcludeList = []
): HashWithAlgorithm[] => {
  if (exclude.includes("styles")) {
    return [];
  }
  const recurse = (child: any) => {
    if (isInlineStyleElement(child)) {
      return [hash(child.props.dangerouslySetInnerHTML.__html)];
    }
    if (isElementWithChildren(child)) {
      return recurse(child.props.children);
    }
    if (Array.isArray(child)) {
      return child.map(recurse);
    }
    return [];
  };
  return flatten(recurse(children));
};
