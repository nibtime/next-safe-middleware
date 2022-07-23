import {
  collectScriptHashes,
  hashifyNextScripts,
  mapHashifyScripts,
  pullScriptHashes,
  writeHashesWithLock,
} from "./HashingHead";
import { NextScript as NextNextScript } from "next/document";
import React from "react";
import { integritySha256 } from "./utils";

// to obtain the hash from NextScript.getInlineScriptSource
const pushNextInlineScriptHash = (ctx: any) => {
  const nextInlineScript = NextScript.getInlineScriptSource(ctx);
  if (!nextInlineScript) {
    return;
  }
  const nextInlineScriptHash = integritySha256(nextInlineScript);
  collectScriptHashes(nextInlineScriptHash);
};

export class NextScript extends NextNextScript {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  trustifyStyles(): boolean {
    return (this.props as any).trustifyStyles ?? false;
  }
  getDynamicChunks(files: any) {
    let scripts = super.getDynamicChunks(files);
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = hashifyNextScripts(scripts, this.context.canonicalBase);
    return scripts;
  }
  getPolyfillScripts() {
    let scripts = super.getPolyfillScripts();
    if (!this.trustifyScripts()) {
      scripts;
    }
    scripts = hashifyNextScripts(scripts, this.context.canonicalBase);
    return scripts;
  }
  getPreNextScripts() {
    let scripts = super.getPreNextScripts();
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = mapHashifyScripts(scripts);
    return <>{scripts}</>;
  }
  getScripts(files: any) {
    let scripts = super.getScripts(files);
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = hashifyNextScripts(scripts, this.context.canonicalBase, true);
    pushNextInlineScriptHash(this.context);
    writeHashesWithLock("script-hashes.txt", pullScriptHashes());
    return scripts;
  }
}
