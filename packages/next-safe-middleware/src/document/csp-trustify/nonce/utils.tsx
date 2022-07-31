import { flatten } from "ramda";
import React from "react";
import {
  isElementWithChildren,
  isScriptElement,
  isScriptPreloadLink,
  isStyleElement,
  isStyleSheetElement,
  withStringChildrenAsInlineCode,
} from "../utils";

export const deepEnsureNonceInChildren = (
  nonce: string,
  children: any,
  exclude: ("scripts" | "styles")[] = []
) => {
  if (!nonce) {
    return;
  }
  const recurse = (children: any) => {
    if (
      ((isScriptElement(children) || isScriptPreloadLink(children)) &&
        !exclude.includes("scripts")) ||
      ((isStyleElement(children) || isStyleSheetElement(children)) &&
        !exclude.includes("styles"))
    ) {
      try {
        children.props = {
          ...withStringChildrenAsInlineCode(children).props,
          nonce,
          integrity: null,
        };
      } catch {}
    } else if (isElementWithChildren(children)) {
      recurse(children.props.children);
    } else if (Array.isArray(children)) {
      children.forEach(recurse);
    }
  };
  recurse(children);
};

export const deepMapWithNonce = (
  nonce: string,
  children: any,
  exclude: ("scripts" | "styles")[] = []
): JSX.Element[] => {
  if (!nonce) {
    return children;
  }
  const recurse = (children: any) => {
    if (
      ((isScriptElement(children) || isScriptPreloadLink(children)) &&
        !exclude.includes("scripts")) ||
      ((isStyleElement(children) || isStyleSheetElement(children)) &&
        !exclude.includes("styles"))
    ) {
      return [React.cloneElement(children, { nonce, integrity: null })];
    } else if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    }
    return [];
  };

  return flatten(recurse(children));
};
