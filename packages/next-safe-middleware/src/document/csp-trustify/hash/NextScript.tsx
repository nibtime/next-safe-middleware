import { NextScript as NextNextScript } from "next/document";
import { ensureNextScriptsInManifest, loadNextByProxy } from "./next-scripts";
import { getExcludeList, isHashProxy } from "../cfg";
import {
  deepExtractScripts,
  deepMapScriptsToManifest,
} from "./utils";
import { Fragment } from "react";
import React from "react";
import { partition } from "ramda";
import { isInlineScriptElement } from "../utils";
import { createTrustedLoadingProxy } from "./script-inlining";

export default class NextScript extends NextNextScript {
  private proxyfiedScripts: any[] = [];

  getPolyfillScripts() {
    //@ts-ignore
    let scripts: any = super.getPolyfillScripts();
    if (getExcludeList().includes("scripts")) {
      return scripts;
    }
    if (isHashProxy()) {
      const polyfillProxy = createTrustedLoadingProxy(
        deepExtractScripts(scripts)
      );
      return [polyfillProxy];
    }
    return ensureNextScriptsInManifest(
      scripts,
      "NextScript",
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
      const srcProxy = createTrustedLoadingProxy(srcScripts);
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
      "NextScript",
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
      this.proxyfiedScripts.push(...scripts);
      scripts = [loadNextByProxy(this.proxyfiedScripts, "NextScript")];
    } else {
      scripts = ensureNextScriptsInManifest(
        scripts,
        "NextScript",
        this.context.canonicalBase,
        true
      );
    }
    return scripts;
  }
}
