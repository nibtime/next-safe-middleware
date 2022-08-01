// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from "next/document";
import React, { Fragment } from "react";
import { getExcludeList } from "../cfg";
import { deepMapWithNonce, deepEnsureNonceInChildren } from "./utils";
export default class Head extends NextHead {
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
