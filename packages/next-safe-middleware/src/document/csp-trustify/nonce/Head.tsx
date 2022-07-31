// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import React, { Fragment } from "react";
import { getExcludeList } from "../cfg";
import { deepMapWithNonce, deepEnsureNonceInChildren } from "./utils";

const mapPreloadLink = (el: JSX.Element) => {
  const href = el.props.href;
  if (!href || href.startsWith("https://")) {
    return <Fragment key={el.key} />;
  }
  return React.cloneElement(el, { integrity: null });
};

export default class Head extends NextHead {
  getPreloadDynamicChunks() {
    //@ts-ignore
    let preloadScripts: any = super.getPreloadDynamicChunks();
    preloadScripts = preloadScripts.map(mapPreloadLink);
    return preloadScripts;
  }
  getPreloadMainLinks(files) {
    //@ts-ignore
    let preloadScripts: any = super.getPreloadMainLinks(files);
    preloadScripts = preloadScripts.map(mapPreloadLink);
    return preloadScripts;
  }
  getPreNextScripts() {
    //@ts-ignore
    let scripts: any = super.getPreNextScripts();
    const isArray = Array.isArray(scripts);
    scripts = deepMapWithNonce(this.props.nonce, scripts, getExcludeList());
    return isArray ? scripts : <Fragment key={scripts.key}>{scripts}</Fragment>;
  }
  render() {
    const nonce = this.props.nonce;
    deepEnsureNonceInChildren(nonce, this.context.styles, getExcludeList());
    deepEnsureNonceInChildren(nonce, this.props.children, getExcludeList());
    return super.render();
  }
}
