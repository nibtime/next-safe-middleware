// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import {
  withHashIfInlineScript,
  isStyleElement,
  isScriptElement,
  isElementWithChildren,
  isPreloadScriptElement,
} from "./utils";
import React from "react";
import { flatten } from "ramda";

export const noncifyStyleChildren = (nonce: string, children: any) => {
  if (nonce) {
    React.Children.forEach(children, (child: any) => {
      if (isStyleElement(child)) {
        try {
          child.props.nonce = nonce;
        } catch {}
      } else if (isElementWithChildren(child)) {
        noncifyStyleChildren(nonce, child.props.children);
      } else if (Array.isArray(child)) {
        noncifyStyleChildren(nonce, child);
      }
    });
  }
};

export const noncifyScriptChildren = (nonce: string, children: any) => {
  if (nonce) {
    React.Children.forEach(children, (child: any) => {
      if (isScriptElement(child)) {
        try {
          const props = {
            ...withHashIfInlineScript(child).props,
            nonce,
            integrity: null,
          };
          child.props = props;
        } catch {}
      } else if (isElementWithChildren(child)) {
        noncifyScriptChildren(nonce, child.props.children);
      } else if (Array.isArray(child)) {
        noncifyScriptChildren(nonce, child);
      }
    });
  }
};

export const mapNoncifyScripts = (nonce: string, children: any) => {
  if (nonce) {
    const mapped = React.Children.map(children, (child: any) => {
      if (isScriptElement(child)) {
        const props = { ...withHashIfInlineScript(child).props, nonce };
        return <script key={child.key} {...props} integrity={null} />;
      } else if (isElementWithChildren(child)) {
        return mapNoncifyScripts(nonce, child.props.children);
      } else if (Array.isArray(child)) {
        return mapNoncifyScripts(nonce, child);
      }
    });
    return flatten(mapped);
  }
  return children;
};

export class Head extends NextHead {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  trustifyStyles(): boolean {
    return (this.props as any).trustifyStyles ?? false;
  }
  getPreloadDynamicChunks() {
    let preloadScripts = super.getPreloadDynamicChunks();
    if (!this.trustifyScripts()) {
      return preloadScripts;
    }
    preloadScripts = preloadScripts.filter(isPreloadScriptElement);
    return preloadScripts;
  }
  getPreloadMainLinks(files) {
    let preloadScripts = super.getPreloadMainLinks(files);
    if (!this.trustifyScripts()) {
      return preloadScripts;
    }
    preloadScripts = preloadScripts.filter(isPreloadScriptElement);
    return preloadScripts;
  }
  getPreNextScripts() {
    let scripts = super.getPreNextScripts();
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = mapNoncifyScripts(this.props.nonce, scripts);
    return <>{scripts}</>;
  }
  render() {
    const nonce = this.props.nonce;
    if (this.trustifyScripts()) {
      noncifyScriptChildren(nonce, this.props.children);
    }
    if (this.trustifyStyles()) {
      noncifyStyleChildren(nonce, this.context.styles);
      noncifyStyleChildren(nonce, this.props.children);
    }
    return super.render();
  }
}
