// eslint-disable-next-line @next/next/no-document-import-in-page
import { NextScript as NextNextScript } from "next/document";
import React from "react";
import { mapNoncifyScripts } from "./NoncingHead";

export class NextScript extends NextNextScript {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  getPreNextScripts() {
    let scripts = super.getPreNextScripts();
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = <>{mapNoncifyScripts(this.props.nonce, scripts)}</>;
    return scripts;
  }
}
