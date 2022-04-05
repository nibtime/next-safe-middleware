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

const noncifyChildren = (nonce: string, children: any) => {
  if (nonce) {
    React.Children.forEach(children, (child: any) => {
      if (isScriptElement(child)) {
        const map = pipe(withHashIfInlineScript, scriptWithPatchedCrossOrigin);
        const newProps = map(child).props;
        child.props = { ...newProps, nonce };
      } else if (isStyleElement(child)) {
        child.props.nonce = nonce;
      } else if (isElementWithChildren(child)) {
        noncifyChildren(nonce, child.props.children);
      } else if (Array.isArray(child)) {
        noncifyChildren(nonce, child);
      }
    });
  }
};

export class Head extends NextHead {
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} />
  // and the partytown inline scripts fro <Script ... strategy="beforeInteractive"} />
  // from 'next/script' 
  getPreNextScripts() {
    const preNextScripts = super.getPreNextScripts();
    noncifyChildren(this.props.nonce, preNextScripts);
    return preNextScripts;
  }
  render() {
    const nonce = this.props.nonce;
    noncifyChildren(nonce, this.context.styles);
    noncifyChildren(nonce, this.props.children);
    return super.render();
  }
}
