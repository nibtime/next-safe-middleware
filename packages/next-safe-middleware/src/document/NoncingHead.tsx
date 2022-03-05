// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import {
  scriptWithPatchedCrossOrigin,
  withHashIfInlineScript,
  isStyleElement,
  isScriptElement,
  isJsxElement,
} from "./utils";
import { pipe } from "ramda";
import React from "react";

const noncifyElements = (children: any, nonce: string) => {
  const recurse = (child: any) => {
    React.Children.forEach(child, (el) => {
      if (isScriptElement(el)) {
        const inlined = withHashIfInlineScript(el);
        el.props = inlined.props;
      }
      if (isScriptElement(el) || isStyleElement(el)) {
        el.props.nonce = nonce;
        return;
      }
      if (
        isJsxElement(el) &&
        Array.isArray(el.props.children) &&
        el.props.children.every(isScriptElement)
      ) {
        el.props.children = el.props.children.map((s) => {
          const inlined = withHashIfInlineScript(s);
          inlined.props.nonce = nonce;
          return inlined;
        });
        return;
      }
      if (isJsxElement(el) && el.props.children) {
        recurse(el.props.children);
      }
    });
  };
  recurse(children);
};

export class Head extends NextHead {
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} /> from 'next/script' somewhere.
  getPreNextScripts() {
    return super
      .getPreNextScripts()
      .map(pipe(withHashIfInlineScript, scriptWithPatchedCrossOrigin));
  }
  render() {
    const nonce = this.props.nonce;
    noncifyElements(this.context.styles, nonce);
    noncifyElements(this.props.children, nonce);
    return super.render();
  }
}
