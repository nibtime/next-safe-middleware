// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import {
  scriptWithPatchedCrossOrigin,
  withHashIfInlineScript,
  isStyleElement,
  isScriptElement,
  isElementWithChildren,
} from "./utils";
import { pipe } from "ramda";
import React from "react";

export const noncifyChildren = (
  nonce: string,
  children: any,
  { trustifyStyles, trustifyScripts }
) => {
  if (nonce) {
    React.Children.forEach(children, (child: any) => {
      if (trustifyScripts && isScriptElement(child) && !child.props.nonce) {
        const map = pipe(withHashIfInlineScript, scriptWithPatchedCrossOrigin);
        const newProps = map(child).props;
        try {
          child.props = { ...newProps, nonce };
        } catch {}
      } else if (trustifyStyles && isStyleElement(child) && !child.props.nonce) {
        try {
          child.props.nonce = nonce;
        } catch {}
      } else if (isElementWithChildren(child)) {
        noncifyChildren(nonce, child.props.children, {
          trustifyStyles,
          trustifyScripts,
        });
      } else if (Array.isArray(child)) {
        noncifyChildren(nonce, child, { trustifyStyles, trustifyScripts });
      }
    });
  }
};

export class Head extends NextHead {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  trustifyStyles(): boolean {
    return (this.props as any).trustifyStyles ?? false;
  }
  getPreNextScripts() {
    const preNextScripts = super.getPreNextScripts();
    noncifyChildren(this.props.nonce, preNextScripts, {
      trustifyStyles: this.trustifyStyles(),
      trustifyScripts: this.trustifyScripts(),
    });
    return preNextScripts;
  }
  render() {
    const nonce = this.props.nonce;
    const trustifyStyles = this.trustifyStyles();
    const trustifyScripts = this.trustifyScripts();

    noncifyChildren(nonce, this.context.styles, {
      trustifyStyles,
      trustifyScripts,
    });
    noncifyChildren(nonce, this.props.children, {
      trustifyStyles,
      trustifyScripts,
    });
    return super.render();
  }
}
