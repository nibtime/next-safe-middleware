import React, { Fragment } from "react";
import { NextScript as NextNextScript } from "next/document";
import { getExcludeList, isHashProxy } from "../cfg";
import { deepMapExtractScripts } from "./utils";
import {
  createFragmentPaddedProxy,
  ensureNextScriptsInManifest,
  loadNextByProxy,
  preNextScriptsByProxy,
  deepMapScriptsToManifest,
} from "./next-scripts";

export default class NextScript extends NextNextScript {
  private proxyfiedScripts: any[] = [];

  getPolyfillScripts() {
    //@ts-ignore
    let scripts: any = super.getPolyfillScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      const polyfillProxy = createFragmentPaddedProxy(scripts);
      return polyfillProxy;
    }
    return ensureNextScriptsInManifest(scripts, this.context.canonicalBase);
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
    if (isHashProxy()) {
      scripts = preNextScriptsByProxy(scripts);
      return scripts;
    }
    const isArray = Array.isArray(scripts);
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
      this.proxyfiedScripts.push(...deepMapExtractScripts(scripts));
      return [];
    }
    return ensureNextScriptsInManifest(scripts, this.context.canonicalBase);
  }

  getScripts(files: any) {
    //@ts-ignore
    let scripts: any = super.getScripts(files);
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      this.proxyfiedScripts.push(...scripts);
      scripts = loadNextByProxy(this.proxyfiedScripts);
    } else {
      scripts = ensureNextScriptsInManifest(
        scripts,
        this.context.canonicalBase,
        undefined,
        true
      );
    }
    return scripts;
  }
}
