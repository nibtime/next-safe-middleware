import type { Nullable, ExcludeList } from "../types";
import React from "react";
import {
  isElementWithChildren,
  isInlineStyleElement,
  isJsxElement,
  isScriptElement,
  isScriptElementWithIntegrity,
} from "../utils";
import { complement, flatten, maxBy, range, splitWhenever, zip } from "ramda";
import { hash } from "./algorithm";
import { collectScriptElement } from "./manifest";
import {
  createTrustedLoadingProxy,
  withHashIfInlineScript,
} from "./script-inlining";

const sameLengthPaddedArrays = (a, b) => {
  const maxLength = maxBy((arr) => arr.length, a, b).length;
  console.log(maxLength);
  const aPadLength = maxLength - a.length;
  const bPadLength = maxLength - b.length;
  const aPadding = range(0, aPadLength).map(() => []);
  const bPadding = range(0, bPadLength).map(() => []);
  return [
    [...a, ...aPadding],
    [...b, ...bPadding],
  ];
};

const sameLengthPaddedFlatZip = (a, b) => {
  const [aPadded, bPadded] = sameLengthPaddedArrays(a, b);
  return flatten(zip(aPadded, bPadded));
};

export const ensureScriptsInManifest = (
  els: Nullable<JSX.Element>[],
  exclude: ExcludeList = []
): JSX.Element[] => {
  if (exclude.includes("scripts")) {
    return els;
  }
  const assert = Array.isArray(els) && els.every(isScriptElement);
  console.assert(
    assert,
    "ensureScriptsInManifest: array of elements must be script elements",
    {
      elements: els,
    }
  );
  if (!assert) {
    return els;
  }

  const scripts = els.map(withHashIfInlineScript);

  const haveNoIntegrityChunks = splitWhenever(
    isScriptElementWithIntegrity,
    scripts
  );

  const haveIntegrityChunks = splitWhenever(
    complement(isScriptElementWithIntegrity),
    scripts
  );

  haveIntegrityChunks.forEach((chunk) => collectScriptElement(...chunk));
  if (haveNoIntegrityChunks.length) {
    const proxyLoaderChunks = haveNoIntegrityChunks.map((chunk) => [
      withHashIfInlineScript(createTrustedLoadingProxy(chunk)),
    ]);
    proxyLoaderChunks.forEach(([proxyLoader]) =>
      collectScriptElement(proxyLoader)
    );
    return sameLengthPaddedFlatZip(proxyLoaderChunks, haveIntegrityChunks);
  }
  return flatten(haveIntegrityChunks);
};

export const deepEnsureScriptElementsInManifest = (
  children: any,
  exclude: ExcludeList = []
) => {
  if (exclude.includes("scripts")) {
    return;
  }
  const recurse = (children: any) => {
    if (isScriptElement(children)) {
      try {
        children.props = ensureScriptsInManifest([children])[0].props;
      } catch {}
    } else if (
      isElementWithChildren(children) &&
      Array.isArray(children.props.children) &&
      children.props.children.every(isScriptElement)
    ) {
      try {
        children.props.children = ensureScriptsInManifest(
          children.props.children
        );
      } catch {}
    } else if (isElementWithChildren(children)) {
      recurse(children.props.children);
    } else if (Array.isArray(children)) {
      children.forEach(recurse);
    }
  };
  recurse(children);
};

export const deepMapScriptsToManifest = (
  children: any,
  exclude: ExcludeList = []
) => {
  if (exclude.includes("scripts")) {
    return children;
  }
  const recurse = (children: any) => {
    if (isScriptElement(children)) {
      return ensureScriptsInManifest([children], exclude);
    } else if (
      isElementWithChildren(children) &&
      Array.isArray(children.props.children) &&
      children.props.children.every(isScriptElement)
    ) {
      return ensureScriptsInManifest(children.props.children);
    } else if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    }
    return [];
  };
  return flatten(recurse(children));
};

export const deepExtractStyleElemHashes = (
  children: any,
  exclude: ExcludeList = []
): string[] => {
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

export const deepExtractScripts = (children: any) => {
  const recurse = (children: any) => {
    if (isScriptElement(children)) {
      return [children];
    } else if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    }
    return [];
  };
  return flatten(recurse(children));
};

export const deepStripIntegrity = (children: any) => {
  const recurse = (children: any) => {
    if (isJsxElement(children) && !!children.props.integrity) {
      return [React.cloneElement(children, { integrity: null })];
    } else if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    }
    return [children];
  };
  return flatten(recurse(children));
};
