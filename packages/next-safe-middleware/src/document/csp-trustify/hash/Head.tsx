// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import { partition } from "ramda";
import React, { Fragment } from "react";
import { getExcludeList, isHashProxy } from "../cfg";
import { isInlineScriptElement } from "../utils";
import { writeManifestToFileWithLock } from "./file-io";
import { collectStyleElem, iterableScripts, pullManifest } from "./manifest";
import {
  ensureNextPreloadLinksInManifest,
  ensureNextScriptsInManifest,
  loadNextByProxy,
} from "./next-scripts";
import { createTrustedLoadingProxy } from "./script-inlining";
import {
  deepExtractStyleElemHashes,
  deepEnsureScriptElementsInManifest,
  deepExtractScripts,
  deepMapScriptsToManifest,
} from "./utils";

export default class Head extends NextHead {
  private proxyfiedScripts: any[] = [];

  getPreloadDynamicChunks(): JSX.Element[] {
    //@ts-ignore
    let preloadScripts: any = super.getPreloadDynamicChunks();
    if (getExcludeList().includes("scripts")) {
      return preloadScripts;
    }
    if (isHashProxy()) {
      return [];
    }
    preloadScripts = ensureNextPreloadLinksInManifest(
      preloadScripts,
      this.context.canonicalBase
    );
    return preloadScripts;
  }
  getPreloadMainLinks(files) {
    //@ts-ignore
    let preloadScripts: any = super.getPreloadMainLinks(files);
    if (getExcludeList().includes("scripts")) {
      return preloadScripts;
    }
    if (isHashProxy()) {
      return [];
    }
    preloadScripts = ensureNextPreloadLinksInManifest(
      preloadScripts,
      this.context.canonicalBase
    );
    return preloadScripts;
  }

  getBeforeInteractiveInlineScripts() {
    //@ts-ignore
    let scripts: any = super.getBeforeInteractiveInlineScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    scripts = deepMapScriptsToManifest(scripts);
    return scripts;
  }

  getPolyfillScripts() {
    //@ts-ignore
    let scripts: any = super.getPolyfillScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      const scriptss = deepExtractScripts(scripts);
      const polyfillProxy = createTrustedLoadingProxy(scriptss);
      createTrustedLoadingProxy(
        scriptss.map((s) => React.cloneElement(s, { defer: false }))
      );
      return [polyfillProxy];
    }
    return ensureNextScriptsInManifest(
      scripts,
      "Head",
      this.context.canonicalBase
    );
  }

  // this will return partytown init scripts
  // + all <Script strategy="worker" />
  // + all <Script strategy="beforeInteractive" src="..." />
  getPreNextScripts() {
    //@ts-ignore
    let scripts: any = super.getPreNextScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    const isArray = Array.isArray(scripts);
    if (isHashProxy()) {
      let [inlineScripts, srcScripts] = partition(
        isInlineScriptElement,
        deepExtractScripts(scripts)
      );
      inlineScripts = deepMapScriptsToManifest(inlineScripts);
      const srcProxy = createTrustedLoadingProxy(srcScripts);
      createTrustedLoadingProxy(
        srcScripts.map((s) => React.cloneElement(s, { defer: false }))
      );
      inlineScripts = deepMapScriptsToManifest(inlineScripts);
      return isArray ? (
        [...inlineScripts, srcProxy]
      ) : (
        <Fragment key={scripts.key}>{[...inlineScripts, srcProxy]}</Fragment>
      );
    }
    scripts = deepMapScriptsToManifest(scripts);
    return isArray ? scripts : <Fragment key={scripts.key}>{scripts}</Fragment>;
  }

  getDynamicChunks(files: any) {
    //@ts-ignore
    let scripts: any = super.getDynamicChunks(files);
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      this.proxyfiedScripts.push(...deepExtractScripts(scripts));
      return [];
    }
    return ensureNextScriptsInManifest(
      scripts,
      "Head",
      this.context.canonicalBase
    );
  }

  getScripts(files: any) {
    //@ts-ignore
    let scripts: any = super.getScripts(files);
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      this.proxyfiedScripts.push(...deepExtractScripts(scripts));
      scripts = [loadNextByProxy(this.proxyfiedScripts, "Head")];
    } else {
      scripts = ensureNextScriptsInManifest(
        scripts,
        "Head",
        this.context.canonicalBase,
        true
      );
    }
    writeManifestToFileWithLock(pullManifest());
    return scripts;
  }

  render() {
    deepEnsureScriptElementsInManifest(this.props.children, getExcludeList());
    collectStyleElem(
      ...deepExtractStyleElemHashes(this.context.styles, getExcludeList()),
      ...deepExtractStyleElemHashes(this.props.children, getExcludeList())
    );
    return super.render();
  }
}
