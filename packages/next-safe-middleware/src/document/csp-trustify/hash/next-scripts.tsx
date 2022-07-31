// eslint-disable-next-line @next/next/no-document-import-in-page
import { partition } from "ramda";
import React, { Fragment } from "react";
import { readURIFromDotNextFolder } from "./file-io";
import { hash } from "./algorithm";
import { createTrustedLoadingProxy } from "./script-inlining";
import { ensureScriptsInManifest } from "./utils";

export const nextScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  const src = el.props.src;
  const scriptContent = readURIFromDotNextFolder(src, basePath);
  if (!scriptContent) {
    return el;
  }
  const integrity = hash(scriptContent);
  return React.cloneElement(el, { integrity });
};

export const nextPreloadScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  const href = el.props.href;
  if (!href || href.startsWith("https://")) {
    return <Fragment key={el.key} />;
  }
  const scriptContent = readURIFromDotNextFolder(href, basePath);
  if (!scriptContent) {
    return <Fragment key={el.key} />;
  }
  const integrity = hash(scriptContent);
  return React.cloneElement(el, { integrity });
};

export const ensureNextPreloadLinksInManifest = (
  els: (JSX.Element | null)[],
  basePath?: string
) => {
  return els.map((el) => nextPreloadScriptWithInjectedIntegrity(el, basePath));
};

const isNextManifestScript = (el: JSX.Element): boolean =>
  el?.props?.src && el.props.src.includes("Manifest");

export const ensureNextScriptsInManifest = (
  els: (JSX.Element | null)[],
  component: "Head" | "NextScript",
  basePath?: string,
  hasNextManifestFiles = false
) => {
  const [nextManifestScripts, nextScripts] = partition(
    isNextManifestScript,
    els
  );

  if (!hasNextManifestFiles) {
    return ensureScriptsInManifest(
      nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath))
    );
  }
  const deferredManifestScripts = nextManifestScripts.map((s) =>
    React.cloneElement(s, { defer: true, async: false })
  );
  const asyncManifestScripts = nextManifestScripts.map((s) =>
    React.cloneElement(s, { defer: false, async: true })
  );

  const deferredLoader = createTrustedLoadingProxy(deferredManifestScripts);
  const asyncLoader = createTrustedLoadingProxy(asyncManifestScripts);

  return [
    ...ensureScriptsInManifest([
      ...nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath)),
      component === "Head" ? deferredLoader : asyncLoader,
    ]),
  ];
};

export const loadNextByProxy = (
  proxyfiedScripts,
  component: "Head" | "NextScript"
) => {
  const deferredProxified = proxyfiedScripts.map((s) => {
    return React.cloneElement(s, { defer: true, async: false });
  });
  const asyncProxified = proxyfiedScripts.map((s) => {
    return React.cloneElement(s, { defer: false, async: true });
  });
  const deferredProxy = createTrustedLoadingProxy(deferredProxified);
  const asyncProxy = createTrustedLoadingProxy(asyncProxified);
  return component === "Head" ? deferredProxy : asyncProxy;
};
