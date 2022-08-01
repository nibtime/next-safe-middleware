// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import React, { Fragment } from "react";
import { getExcludeList, isHashProxy } from "../cfg";
import { writeManifestToFileWithLock } from "./file-io";
import { deepExtractStyleElemHashes, deepMapExtractScripts } from "./utils";
import { collectStyleElem, pullManifest } from "./manifest";
import {
  createFragmentPaddedProxy,
  registerFragmentPaddedProxyForVariants,
} from "./script-inlining";
import {
  deepEnsureScriptElementsInManifest,
  deepMapScriptsToManifest,
  ensureNextPreloadLinksInManifest,
  ensureNextScriptsInManifest,
  loadNextByProxy,
  preNextScriptsByProxy,
} from "./next-scripts";

export default class Head extends NextHead {
  private proxyfiedScripts: any[] = [];

  getPreloadDynamicChunks(): JSX.Element[] {
    //@ts-ignore
    let preloadScripts: any = super.getPreloadDynamicChunks();
    if (getExcludeList().includes("scripts")) {
      return preloadScripts;
    }
    if (isHashProxy()) {
      preloadScripts = createFragmentPaddedProxy(preloadScripts);
      return preloadScripts;
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
      preloadScripts = createFragmentPaddedProxy(preloadScripts);
      return preloadScripts;
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
    scripts = deepMapScriptsToManifest(scripts, "Head");
    return scripts;
  }

  getPolyfillScripts() {
    //@ts-ignore
    let scripts: any = super.getPolyfillScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      const polyfillProxy = createFragmentPaddedProxy(scripts);
      registerFragmentPaddedProxyForVariants(scripts);
      return polyfillProxy;
    }
    return ensureNextScriptsInManifest(
      scripts,
      this.context.canonicalBase,
      "Head"
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
      scripts = preNextScriptsByProxy(scripts, "Head");
      return scripts;
    }
    scripts = deepMapScriptsToManifest(scripts, "Head");
    return isArray ? scripts : <Fragment key={scripts.key}>{scripts}</Fragment>;
  }

  getDynamicChunks(files: any) {
    //@ts-ignore
    let scripts: any = super.getDynamicChunks(files);
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      this.proxyfiedScripts.push(...deepMapExtractScripts(scripts));
      return [];
    }
    return ensureNextScriptsInManifest(
      scripts,
      this.context.canonicalBase,
      "Head"
    );
  }

  getScripts(files: any) {
    //@ts-ignore
    let scripts: any = super.getScripts(files);
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    // need to call preload links during build time to collect proxy hash
    this.getPreloadDynamicChunks();
    this.getPreloadMainLinks(files);
    if (isHashProxy()) {
      this.proxyfiedScripts.push(...deepMapExtractScripts(scripts));
      scripts = loadNextByProxy(this.proxyfiedScripts, "Head");
    } else {
      scripts = ensureNextScriptsInManifest(
        scripts,
        this.context.canonicalBase,
        "Head",
        true
      );
    }
    writeManifestToFileWithLock(pullManifest());
    return scripts;
  }

  render() {
    if (!getExcludeList().includes("scripts")) {
      deepEnsureScriptElementsInManifest(this.props.children);
    }

    if (!getExcludeList().includes("styles")) {
      collectStyleElem(
        ...deepExtractStyleElemHashes(this.context.styles),
        ...deepExtractStyleElemHashes(this.props.children)
      );
    }

    return super.render();
  }
}
