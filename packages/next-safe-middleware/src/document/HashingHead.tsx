// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead, NextScript } from "next/document";
import { difference, flatten, partition } from "ramda";
import React, { Fragment } from "react";
import type { Nullable } from "./types";
import {
  integritySha256,
  isScriptElement,
  createTrustedLoadingProxy,
  withHashIfInlineScript,
  isStyleElement,
  isElementWithChildren,
  isPreloadScriptElement,
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

// hashify script element(s) for CSP
// scripts with integrity will be registered and passed through
// scripts without integrity will be loaded by a trusted proxy loading script
// all integrities (self or proxy) will be picked up by CSP tag later
export const hashify = (els: Nullable<JSX.Element>[]) => {
  const assert = Array.isArray(els) && els.every(isScriptElement);
  console.assert(
    assert,
    "trustify: array of elements must be script elements",
    { elements: els }
  );
  if (!assert) {
    return els;
  }

  const scripts = els.map(withHashIfInlineScript);

  const [haveIntegrity, haveNoIntegrity] = partition(
    pickupScriptWithIntegrity,
    scripts
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

const isManifestScript = (el: JSX.Element): boolean =>
  el?.props?.src && el.props.src.includes("Manifest");

// calculates the integrity for a Next.js framework script from its file during build
// returns the script element with its integrity injected
const nextScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  try {
    const src = el.props.src;
    const filePath = decodeURI(src).replace(
      `${basePath || ""}/_next`,
      dotNextFolder()
    );
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

const nextPreloadScriptWithInjectedIntegrity = (
  el: JSX.Element,
  basePath?: string
) => {
  try {
    const href = el.props.href;
    if (href.startsWith("https://")) {
      return <Fragment key={el.key || href} />;
    }
    const filePath = decodeURI(href).replace(
      `${basePath || ""}/_next`,
      dotNextFolder()
    );
    const fs = getFs();
    const assert = fs && fs.existsSync(filePath);
    console.assert(
      assert,
      "nextPreloadScriptWithInjectedIntegrity: file not found, cannot set integrity",
      { filePath }
    );
    if (!assert) {
      return el;
    }
    const scriptContent = fs.readFileSync(filePath, "utf8");
    const integrity = integritySha256(scriptContent);
    return <link key={el.key || href} {...el.props} integrity={integrity} />;
  } catch (e) {
    console.error(
      "nextPreloadScriptWithInjectedIntegrity: something went wrong with loading script content from file",
      e
    );
    return el;
  }
};

const getFs = () => {
  try {
    return require("fs");
  } catch {
    return undefined;
  }
};

type HashesKind = typeof SCRIPT_HASHES_FILENAME | typeof STYLE_HASHES_FILENAME;

const writeHashesTxt = (filepath: string, hashes: string[] = [], fs?) => {
  const oldHashes: string[] = [];
  oldHashes.push(
    ...fs
      .readFileSync(filepath, "utf8")
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
  );
  const newHashes = difference(hashes, oldHashes);
  if (newHashes.length) {
    fs.appendFileSync(filepath, `\n${newHashes.join("\n")}`);
  }
};

export const writeHashesWithLock = (
  kind: HashesKind,
  hashes: string[] = []
) => {
  const fs = getFs();
  const dir = staticCspFolder();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    return;
  }

  const filepath = `${dir}/${kind}`;
  const lockfilepath = `${filepath}.lock`;
  const { lock, unlock } = require("lockfile");
  lock(lockfilepath, { wait: 10000 }, (err) => {
    if (err) {
      throw err;
    }
    try {
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, hashes.join("\n"), "utf8");
        return;
      }
      writeHashesTxt(filepath, hashes, fs);
    } finally {
      unlock(lockfilepath, (err) => {
        if (err) {
          throw err;
        }
      });
    }
  });
};
export const hashifyNextScripts = (
  els: Nullable<JSX.Element>[],
  basePath?: string,
  manifest = false
) => {
  const [manifestScripts, nextScripts] = partition(
    isManifestScript,
    els.filter(isScriptElement)
  );

  if (!manifest) {
    return hashify(
      nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath))
    );
  }
  const deferredManifestScripts = manifestScripts.map((s) => (
    <script key={s.key} {...s.props} defer={true} async={false} />
  ));
  const asyncManifestScripts = manifestScripts.map((s) => (
    <script key={s.key} {...s.props} defer={false} async={true} />
  ));

  const deferredManifestProxyLoader = withHashIfInlineScript(
    createTrustedLoadingProxy(deferredManifestScripts)
  );
  const asyncManifestProxyLoader = withHashIfInlineScript(
    createTrustedLoadingProxy(asyncManifestScripts)
  );

  pickupScriptWithIntegrity(deferredManifestProxyLoader);
  pickupScriptWithIntegrity(asyncManifestProxyLoader);

  const manifestProxyLoader = withHashIfInlineScript(
    createTrustedLoadingProxy(manifestScripts)
  );

  return hashify([
    ...nextScripts.map((s) => nextScriptWithInjectedIntegrity(s, basePath)),
    manifestProxyLoader,
  ]);
};

export const collectStyleHashesFromChildren = (children: any): string[] => {
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

export const hashifyScriptChildren = (children: any) => {
  React.Children.forEach(children, (child) => {
    if (isScriptElement(child)) {
      try {
        child.props = hashify([child])[0].props;
      } catch {}
    } else if (
      isElementWithChildren(child) &&
      Array.isArray(child.props.children) &&
      child.props.children.every(isScriptElement)
    ) {
      try {
        child.props.children = hashify(child.props.children);
      } catch {}
    } else if (isElementWithChildren(child)) {
      hashifyScriptChildren(child.props.children);
    } else if (Array.isArray(child)) {
      hashifyScriptChildren(child);
    }
  });
};

export const mapHashifyScripts = (children: any) => {
  const mapped = React.Children.map(children, (child) => {
    if (isScriptElement(child)) {
      return hashify([child]);
    } else if (Array.isArray(child) && child.every(isScriptElement)) {
      return hashify(child);
    } else if (
      isElementWithChildren(child) &&
      Array.isArray(child.props.children) &&
      child.props.children.every(isScriptElement)
    ) {
      return hashify(child.props.children);
    } else if (isElementWithChildren(child)) {
      return mapHashifyScripts(child.props.children);
    }
  });
  return flatten(mapped);
};

export class Head extends NextHead {
  trustifyScripts(): boolean {
    return (this.props as any).trustifyScripts ?? false;
  }
  trustifyStyles(): boolean {
    return (this.props as any).trustifyStyles ?? false;
  }
  getPreloadDynamicChunks(): JSX.Element[] {
    let preloadScripts = super.getPreloadDynamicChunks();
    if (!this.trustifyScripts()) {
      return preloadScripts;
    }
    preloadScripts = preloadScripts
      .filter(isPreloadScriptElement)
      .map((l) =>
        nextPreloadScriptWithInjectedIntegrity(l, this.context.canonicalBase)
      );
    return preloadScripts;
  }
  getPreloadMainLinks(files) {
    let preloadScripts = super.getPreloadMainLinks(files);
    if (!this.trustifyScripts()) {
      return preloadScripts;
    }
    preloadScripts = preloadScripts
      .filter(isPreloadScriptElement)
      .map((l) =>
        nextPreloadScriptWithInjectedIntegrity(l, this.context.canonicalBase)
      );
    return preloadScripts;
  }
  getDynamicChunks(files: any) {
    let scripts = super.getDynamicChunks(files);
    if (!this.trustifyScripts()) {
      return scripts;
    }
    return hashifyNextScripts(scripts, this.context.canonicalBase);
  }
  getPolyfillScripts() {
    let scripts = super.getPolyfillScripts();
    if (!this.trustifyScripts()) {
      scripts;
    }
    return hashifyNextScripts(scripts, this.context.canonicalBase);
  }
  getBeforeInteractiveInlineScripts() {
    let scripts = super.getBeforeInteractiveInlineScripts();
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = mapHashifyScripts(scripts);
    return scripts;
  }
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} />
  // and the partytown inline scripts fro <Script ... strategy="beforeInteractive"} />
  // from 'next/script'
  getPreNextScripts() {
    let scripts = super.getPreNextScripts();
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = mapHashifyScripts(scripts);
    return <>{scripts}</>;
  }
  // not sure whether this is the definitive best point to write hashes.
  // it should be whatever method returns the very last script in the document lifecycle.
  getScripts(files: any) {
    let scripts = super.getScripts(files);
    if (!this.trustifyScripts()) {
      return scripts;
    }
    scripts = hashifyNextScripts(
      super.getScripts(files),
      this.context.canonicalBase,
      true
    );
    writeHashesWithLock("script-hashes.txt", pullScriptHashes());
    return scripts;
  }
  render() {
    hashifyScriptChildren(this.props.children);
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
      writeHashesWithLock("style-hashes.txt", styleHashes);
    }
    return super.render();
  }
}
