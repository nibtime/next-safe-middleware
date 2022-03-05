// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead, NextScript } from "next/document";
import { difference, partition, flatten } from "ramda";
import React from "react";
import type { Nullable } from "./types";
import {
  integritySha256,
  isScriptElement,
  createTrustedLoadingProxy,
  withHashIfInlineScript,
  scriptWithPatchedCrossOrigin,
  isStyleElement,
  isJsxElement,
} from "./utils";
import {
  CSP_LOCATION_BUILD,
  SCRIPT_HASHES_FILENAME,
  STYLE_HASHES_FILENAME,
} from "../constants";

const collectedHashes: string[] = [];
const pullHashes = () => collectedHashes;

// picks up the integrity of a script element globally for later injection in CSP tag
const pickupScriptWithIntegrity = (el: JSX.Element) => {
  const integrity = el.props.integrity;
  if (!collectedHashes.includes(integrity)) {
    collectedHashes.push(integrity);
  }
  return !!integrity;
};

// trustify script element(s) for CSP
// scripts with integrity will be registered and passed through
// scripts without integrity will be loaded by a trusted proxy loading script
// all integrities (self or proxy) will be picked up by CSP tag later
export const trustify = (els: Nullable<JSX.Element>[]) => {
  const assert = Array.isArray(els) && els.every(isScriptElement);
  console.assert(
    assert,
    "trustify: array of elements must be script elements",
    { elements: els }
  );
  if (!assert) {
    return els;
  }

  const scripts = els;
  const withInlineHashed = scripts.map(withHashIfInlineScript);

  const [haveIntegrity, haveNoIntegrity] = partition(
    pickupScriptWithIntegrity,
    withInlineHashed
  );
  if (haveNoIntegrity.length) {
    const proxyLoader = withHashIfInlineScript(
      createTrustedLoadingProxy(haveNoIntegrity)
    );
    pickupScriptWithIntegrity(proxyLoader);
    return [...haveIntegrity, proxyLoader];
  }
  return haveIntegrity;
};

const dotNextFolder = () => `${process.cwd()}/.next`;
const staticCspFolder = () => `${process.cwd()}/${CSP_LOCATION_BUILD}`;

// calculates the integrity for a Next.js framework script from its file during build
// returns the script element with its integrity injected
const nextScriptWithInjectedIntegrity = (el: JSX.Element) => {
  try {
    const src = el.props.src;
    if (
      // Manifest files have a different hash when they are served from CDN
      // than they have at build time. Will be loaded by trusted proxy.
      src.includes("Manifest")
    ) {
      return el;
    }

    const filePath = decodeURI(src).replace("/_next", dotNextFolder());
    const fs = getFs();
    const assert = fs && fs.existsSync(filePath);
    console.assert(
      assert,
      "nextScriptWithInjectedIntegrity: file not found, cannot set integrity",
      { filePath }
    );
    if (!assert) {
      return el;
    }
    const scriptContent = fs.readFileSync(filePath, "utf8");
    const integrity = integritySha256(scriptContent);
    return <script key={el.key} {...el.props} integrity={integrity} />;
  } catch (e) {
    console.error(
      "nextScriptWithInjectedIntegrity: something went wrong with loading script content from file",
      e
    );
    return el;
  }
};

const getFs = () => {
  try {
    return require("fs");
  } catch (e) {
    return undefined;
  }
};

type HashesKind = typeof SCRIPT_HASHES_FILENAME | typeof STYLE_HASHES_FILENAME;

const writeRouteHashesToJson = (
  route: string,
  hashesKind: HashesKind,
  hashes: string[] = []
) => {
  const dir = `${staticCspFolder()}${route}`;
  const filename = hashesKind;
  const filepath = `${dir}/${filename}`;
  const fs = getFs();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // expected to fail in ISR
    return;
  }

  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, hashes.join("\n"), "utf8");
    return;
  }

  const oldHashes: string[] = [];
  try {
    oldHashes.push(
      ...fs
        .readFileSync(filepath, "utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
    );
  } catch {
    try {
      fs.appendFileSync(filepath, `\n${hashes.join("\n")}`, "utf8");
      return;
    } catch {
      return;
    }
  }

  const newHashes = difference(hashes, oldHashes);
  if (newHashes.length) {
    fs.appendFileSync(filepath, `\n${newHashes.join("\n")}`);
  }
};

const trustifyNextScripts = (els: Nullable<JSX.Element>[]) => {
  const nextScripts = els.filter(isScriptElement);
  // preemptively register a single proxy loader for ISR mode
  // however it is recommended to include the chunks in the route config
  // with unstable_includeFiles so they can be assigned an integrity attribute during revalidation
  // Sometimes observed problems in a real setup when all Next scripts get loaded this way
  const nextProxyLoader = withHashIfInlineScript(
    createTrustedLoadingProxy(nextScripts)
  );
  pickupScriptWithIntegrity(nextProxyLoader);
  return trustify(nextScripts.map(nextScriptWithInjectedIntegrity));
};

// to obtain the hash from NextScript.getInlineScriptSource
const pushNextInlineScriptHash = (ctx: any) => {
  const nextInlineScript = NextScript.getInlineScriptSource(ctx);
  const nextInlineScriptHash =
    nextInlineScript && integritySha256(nextInlineScript);
  if (nextInlineScriptHash && !collectedHashes.includes(nextInlineScriptHash)) {
    collectedHashes.push(nextInlineScriptHash);
  }
};

const writeScriptHashesToJson = (ctx: any, newHashes: string[]) => {
  const route = ctx.__NEXT_DATA__.page;
  pushNextInlineScriptHash(ctx);
  writeRouteHashesToJson(route, "script-hashes.txt", newHashes);
};

const collectStyleHashes = (children: any) => {
  const recurse = (child: any) => {
    return React.Children.toArray(child)
      .filter(isJsxElement)
      .map((el) => {
        if (isJsxElement(el) && el.props.children) {
          return recurse(el.props.children);
        }
        if (isStyleElement(el) && el.props.dangerouslySetInnerHTML) {
          return [integritySha256(el.props.dangerouslySetInnerHTML.__html)];
        }
        return [];
      });
  };
  return flatten(recurse(children));
};

const writeStyleHashesToJson = (ctx: any, customHead: any) => {
  const route = ctx.__NEXT_DATA__.page;
  writeRouteHashesToJson(route, "style-hashes.txt", [
    ...collectStyleHashes(ctx.styles),
    ...collectStyleHashes(customHead),
  ]);
};

const trustifyHeadElements = (children: any) => {
  const recurse = (child: any) => {
    React.Children.forEach(child, (el) => {
      if (isScriptElement(el)) {
        const trustified = trustify([el])[0];
        el.props = trustified.props;
        return;
      }
      if (
        isJsxElement(el) &&
        Array.isArray(el.props.children) &&
        el.props.children.every(isScriptElement)
      ) {
        el.props.children = trustify(el.props.children);
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
  getDynamicChunks(files: any) {
    return trustifyNextScripts(super.getDynamicChunks(files));
  }
  getPolyfillScripts() {
    return trustifyNextScripts(super.getPolyfillScripts());
  }
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} /> from 'next/script' somewhere.
  getPreNextScripts() {
    return trustify(
      super.getPreNextScripts().map(scriptWithPatchedCrossOrigin)
    );
  }
  // not sure whether this is the definitive best point to write hashes.
  // it should be whatever method returns the very last script in the document lifecycle.
  getScripts(files: any) {
    const scripts = trustifyNextScripts(super.getScripts(files));
    writeScriptHashesToJson(this.context, pullHashes());
    return scripts;
  }
  render() {
    writeStyleHashesToJson(this.context, this.props.children);
    trustifyHeadElements(this.props.children);
    return super.render();
  }
}
