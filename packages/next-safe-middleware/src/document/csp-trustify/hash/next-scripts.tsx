// eslint-disable-next-line @next/next/no-document-import-in-page
import { flatten, partition, splitWhenever } from "ramda";
import React, { Fragment } from "react";

import type { Nullable } from "./types";

import {
  isElementWithChildren,
  isScriptElement,
  isScriptElementWithIntegrity,
  isScriptElementWithoutIntegrity,
} from "../utils";
import { hash } from "./algorithm";
import {
  sameLengthPaddedFlatZip,
  deepMapExtractScripts,
  deepMapStripIntegrity,
} from "./utils";
import {
  createFragmentPaddedProxy,
  registerFragmentPaddedProxyForVariants,
  withHashIfInlineScript,
} from "./script-inlining";
import { readURIFromDotNextFolder } from "./file-io";
import { collectScriptElement } from "./manifest";

export const ensureScriptsInManifest = (
  els: Nullable<JSX.Element>[],
  component: "Head"
): JSX.Element[] => {
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
  const firstHasIntegrity = isScriptElementWithIntegrity(scripts[0]);

  const haveNoIntegrityChunks = splitWhenever(
    isScriptElementWithIntegrity,
    scripts
  );

  const haveIntegrityChunks = splitWhenever(
    isScriptElementWithoutIntegrity,
    scripts
  );

  const haveIntegrity = haveIntegrityChunks.flatMap((chunk) => chunk);

  collectScriptElement(...haveIntegrity);
  if (!haveNoIntegrityChunks.length) {
    return haveIntegrity;
  }
  if (component === "Head") {
    haveNoIntegrityChunks.forEach((chunk) =>
      registerFragmentPaddedProxyForVariants(chunk)
    );
  }
  const proxyChunks = haveNoIntegrityChunks.map(createFragmentPaddedProxy);
  return firstHasIntegrity
    ? sameLengthPaddedFlatZip(haveIntegrityChunks, proxyChunks)
    : sameLengthPaddedFlatZip(proxyChunks, haveIntegrityChunks);
};

export const deepEnsureScriptElementsInManifest = (
  children: any,
  component?: "Head"
) => {
  const recurse = (children: any) => {
    if (isScriptElement(children)) {
      try {
        children.props = ensureScriptsInManifest(
          [children],
          component
        )[0].props;
      } catch {}
    } else if (
      isElementWithChildren(children) &&
      Array.isArray(children.props.children) &&
      children.props.children.every(isScriptElement)
    ) {
      try {
        children.props.children = ensureScriptsInManifest(
          children.props.children,
          component
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

export const deepMapScriptsToManifest = (children: any, component?: "Head") => {
  const recurse = (children: any) => {
    if (isElementWithChildren(children)) {
      return recurse(children.props.children);
    }
    if (Array.isArray(children) && children.every(isScriptElement)) {
      return ensureScriptsInManifest(children, component);
    } else if (Array.isArray(children)) {
      return children.map(recurse);
    } else if (isScriptElement(children)) {
      return ensureScriptsInManifest([children], component);
    }
    return [];
  };
  return flatten(recurse(children));
};

export const nextScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  const src = el.props.src;
  const scriptContent = readURIFromDotNextFolder(src, basePath);
  const integrity = hash(scriptContent);
  return React.cloneElement(el, { integrity });
};

export const nextPreloadScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  const href = el.props.href;
  if (!href) {
    return <Fragment key={el.key} />;
  }
  const scriptContent = readURIFromDotNextFolder(href, basePath);
  const integrity = hash(scriptContent);
  return React.cloneElement(el, { integrity });
};

export const ensureNextPreloadLinksInManifest = (
  els: (JSX.Element | null)[],
  basePath?: string
) => {
  const [httpsLinks, nextLinks] = partition(
    (el) => el?.props?.href?.startsWith("https://"),
    els || []
  );
  const httpsProxy = createFragmentPaddedProxy(
    deepMapStripIntegrity(httpsLinks)
  );
  return [
    ...httpsProxy,
    ...nextLinks.map((el) =>
      nextPreloadScriptWithInjectedIntegrity(el, basePath)
    ),
  ];
};

const isNextManifestScript = (el: JSX.Element): boolean =>
  el?.props?.src && el.props.src.includes("Manifest");

export const ensureNextScriptsInManifest = (
  scripts,
  basePath?: string,
  component?: "Head",
  hasNextManifestFiles = false
) => {
  const [nextManifestScripts, nextScripts] = partition(
    isNextManifestScript,
    deepMapExtractScripts(scripts)
  );

  if (!hasNextManifestFiles) {
    return deepMapScriptsToManifest(
      nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath)),
      component
    );
  }

  if (component === "Head") {
    registerFragmentPaddedProxyForVariants(nextManifestScripts);
  }
  const manifestLoader = createFragmentPaddedProxy(nextManifestScripts);
  return [
    ...deepMapScriptsToManifest(
      [...nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath))],
      component
    ),
    ...manifestLoader,
  ];
};

export const loadNextByProxy = (
  proxyfiedScripts: JSX.Element[],
  component?: "Head"
) => {
  if (component === "Head") {
    registerFragmentPaddedProxyForVariants(proxyfiedScripts);
  }
  return createFragmentPaddedProxy(proxyfiedScripts);
};

export const preNextScriptsByProxy = (scripts, component?: "Head") => {
  const isArray = Array.isArray(scripts);
  const mappedScripts = deepMapScriptsToManifest(
    deepMapStripIntegrity(scripts),
    component
  );
  return isArray ? (
    mappedScripts
  ) : (
    <Fragment key={scripts.key}>{mappedScripts}</Fragment>
  );
};
