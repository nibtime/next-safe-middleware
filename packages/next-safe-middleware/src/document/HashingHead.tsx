// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead, NextScript } from "next/document";
import { difference, F, flatten, partition, pipe } from "ramda";
import React from "react";
import type { Nullable } from "./types";
import {
  integritySha256,
  isScriptElement,
  createTrustedLoadingProxy,
  withHashIfInlineScript,
  scriptWithPatchedCrossOrigin,
  isStyleElement,
  isElementWithChildren,
} from "./utils";
import {
  CSP_LOCATION_BUILD,
  SCRIPT_HASHES_FILENAME,
  STYLE_HASHES_FILENAME,
} from "../constants";

const collectedScriptHashes: string[] = [];
export const collectScriptHashes = (...hashes: string[]) => {
  collectedScriptHashes.push(
    ...difference(hashes.filter(Boolean), collectedScriptHashes)
  );
};
export const pullScriptHashes = () => collectedScriptHashes.slice();

const collectedStyleElemHashes: string[] = [];
export const collectStyleElemHashes = (...hashes: string[]) => {
  collectedStyleElemHashes.push(
    ...difference(hashes.filter(Boolean), collectedStyleElemHashes)
  );
};
export const pullStyleElemHashes = () => collectedStyleElemHashes.slice();

const collectedStyleAttrHashes: string[] = [];
export const collectStyleAttrHashes = (...hashes: string[]) => {
  collectedStyleAttrHashes.push(
    ...difference(hashes.filter(Boolean), collectedStyleAttrHashes)
  );
};
export const pullStyleAttrHashes = () => collectedStyleAttrHashes.slice();

// picks up the integrity of a script element globally for later injection in CSP tag
const pickupScriptWithIntegrity = (el: JSX.Element) => {
  const integrity = el.props.integrity;
  collectScriptHashes(integrity);
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
  const mapper = pipe(withHashIfInlineScript, scriptWithPatchedCrossOrigin);
  const withInlineHashed = scripts.map(mapper);

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
  if (
    nextInlineScriptHash &&
    !collectedScriptHashes.includes(nextInlineScriptHash)
  ) {
    collectedScriptHashes.push(nextInlineScriptHash);
  }
};

const writeScriptHashesToJson = (ctx: any, newHashes: string[]) => {
  const route = ctx.__NEXT_DATA__.page;
  // don't think this is needed, as it's type application/json and does not execute
  // pushNextInlineScriptHash(ctx);
  writeRouteHashesToJson(route, "script-hashes.txt", newHashes);
};

const collectStyleHashesFromChildren = (children: any): string[] => {
  const recurse = (child: any) => {
    if (isStyleElement(child) && child.props.dangerouslySetInnerHTML) {
      return [integritySha256(child.props.dangerouslySetInnerHTML.__html)];
    }
    if (isElementWithChildren(child)) {
      return recurse(child.props.children);
    }
    if (Array.isArray(child)) {
      return child.map(recurse);
    }
    return [];
  };
  return flatten(recurse(children));
};

export const writeStyleHashesToJson = (hashes: string[]) => {
  writeRouteHashesToJson("/", "style-hashes.txt", hashes);
};

export const trustifyScriptChildren = (children: any) => {
  React.Children.forEach(children, (child) => {
    if (isScriptElement(child)) {
      child.props = trustify([child])[0].props;
    } else if (
      isElementWithChildren(child) &&
      Array.isArray(child.props.children) &&
      child.props.children.every(isScriptElement)
    ) {
      child.props.children = trustify(child.props.children);
    } else if (isElementWithChildren(child)) {
      trustifyScriptChildren(child.props.children);
    } else if (Array.isArray(child)) {
      trustifyScriptChildren(child);
    }
  });
};

export class Head extends NextHead {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  trustifyStyles(): boolean {
    return (this.props as any).trustifyStyles ?? false;
  }
  getDynamicChunks(files: any) {
    return this.trustifyScripts()
      ? trustifyNextScripts(super.getDynamicChunks(files))
      : super.getDynamicChunks(files);
  }
  getPolyfillScripts() {
    return this.trustifyScripts()
      ? trustifyNextScripts(super.getPolyfillScripts())
      : super.getPolyfillScripts();
  }
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} />
  // and the partytown inline scripts fro <Script ... strategy="beforeInteractive"} />
  // from 'next/script'
  getPreNextScripts() {
    const preNextScripts = super.getPreNextScripts();
    if (this.trustifyScripts()) {
      trustifyScriptChildren(preNextScripts);
    }
    return preNextScripts;
  }
  // not sure whether this is the definitive best point to write hashes.
  // it should be whatever method returns the very last script in the document lifecycle.
  getScripts(files: any) {
    if (this.trustifyScripts()) {
      const scripts = trustifyNextScripts(super.getScripts(files));
      writeScriptHashesToJson(this.context, pullScriptHashes());
      return scripts;
    }
    return super.getScripts(files);
  }
  render() {
    trustifyScriptChildren(this.props.children);
    if (this.trustifyStyles()) {
      collectStyleElemHashes(
        // hashing empty string can avoid breaking things with ISR (with stitches).
        // Stitches seems to dynamically styles into an empty style tag after hydration.
        // Stitches has transitive trust to manipulate DOM with a strict-dynamic CSP,
        // an attacker can't do harm by just injecting a style tag with an empty string.
        integritySha256("")
      );
      collectStyleAttrHashes(
        // partytown iframe style
        integritySha256(
          "display:block;width:0;height:0;border:0;visibility:hidden"
        )
      );
      const styleHashes = [
        ...collectStyleHashesFromChildren(this.context.styles),
        ...collectStyleHashesFromChildren(this.props.children),
        ...pullStyleElemHashes(),
        ...pullStyleAttrHashes(),
      ];
      writeStyleHashesToJson(styleHashes);
    }
    return super.render();
  }
}
