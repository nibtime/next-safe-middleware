import { NextScript as NextNextScript } from "next/document";
import React, { Fragment } from "react";
import { getExcludeList } from "../cfg";
import { deepMapWithNonce } from "./utils";

export default class NextScript extends NextNextScript {
  getPreNextScripts() {
    //@ts-ignore
    let scripts: any = super.getPreNextScripts();
    const isArray = Array.isArray(scripts);
    scripts = deepMapWithNonce(this.props.nonce, scripts, getExcludeList());
    return isArray ? scripts : <Fragment key={scripts.key}>{scripts}</Fragment>;
  }
}
