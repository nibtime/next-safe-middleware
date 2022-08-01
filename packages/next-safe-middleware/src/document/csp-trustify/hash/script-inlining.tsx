import { sortBy } from "ramda";
import React from "react";
import { collectScriptElement } from "./manifest";
import { isScriptElement } from "../utils";
import { hash } from "./algorithm";
import { IterableScript, Primitive } from "./types";
import { deepStripIntegrity } from "./utils";

const quoteIfString = (value: Primitive) =>
  typeof value === "string" ? `'${value}'` : value;

// the attributes the can be set in plain string JS hacking
const isKnownScriptAttr = (attr: string) =>
  [
    "id",
    "src",
    "integrity",
    "async",
    "defer",
    "noModule",
    "crossOrigin",
    "nonce",
    "rel",
    "href",
    "as",
  ].includes(attr);

export const getScriptValue = (attr: string, attrs: IterableScript) =>
  attrs.find(([a]) => attr === a)?.[1];

export const createHashableScriptLoader = (
  scripts: IterableScript[],
  id: string
) => {
  const element = (attrs) => {
    if (
      getScriptValue("rel", attrs) === "preload" &&
      !!getScriptValue("href", attrs)
    ) {
      return "link";
    }
    return "script";
  };
  return scripts.length > 0
    ? `(function () { ${scripts
        .map(
          (attrs, i) => `
  var s${i} = document.createElement('${element(attrs)}');
  ${attrs
    ?.map(([attr, value]) =>
      isKnownScriptAttr(attr)
        ? `s${i}.${attr}=${quoteIfString(value)}`
        : `s${i}.setAttribute('${attr}', '${value}')`
    )
    .join(";")}`
        )
        .join(";")};
  var s = [${scripts.map((s, i) => `s${i}`).join(",")}];
  var self = document.getElementById('${id}');
  var p = self.parentNode;
  s.forEach(function(si) {
    p.appendChild(si);
  });
})()
`
    : "";
};
export const withHashIfInlineScript = (s: JSX.Element) => {
  if (!isScriptElement(s)) {
    return s;
  }

  const { children, dangerouslySetInnerHTML, ...props } = s.props;

  let inlineScriptCode = "";

  if (typeof children === "string") {
    inlineScriptCode = s.props.children;
  } else if (dangerouslySetInnerHTML) {
    inlineScriptCode = dangerouslySetInnerHTML.__html;
  }

  if (!inlineScriptCode) {
    return s;
  }
  return (
    <script
      key={s.key}
      {...props}
      integrity={hash(inlineScriptCode)}
      dangerouslySetInnerHTML={{ __html: inlineScriptCode }}
    />
  );
};

export const iterableScriptFromProps = (
  el: JSX.Element | null
): IterableScript | null => {
  if (!isScriptElement(el)) return null;
  return Object.entries(el.props).filter(
    ([, value]) =>
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number"
  ) as IterableScript;
};

export const sortIterableScriptByAttr = (s: IterableScript) => {
  return sortBy(([attr]) => attr, s);
};

const proxyGuid = "csp-proxy-loader-7f10ba7a15bc0318e7dd56e8c7e1cff";

export const createTrustedLoadingProxy = (els: JSX.Element[]) => {
  const iterableScripts = deepStripIntegrity(els)
    .map(iterableScriptFromProps)
    .filter(Boolean)
    .map(sortIterableScriptByAttr);
  const proxy = createHashableScriptLoader(iterableScripts, proxyGuid);
  const id = hash(proxy).replace(/^sha\d{3}-/g, "");
  const inlineCode = proxy.replace(proxyGuid, id);
  const loader = withHashIfInlineScript(
    <script key={id} id={id} dangerouslySetInnerHTML={{ __html: inlineCode }} />
  );
  collectScriptElement(loader);
  return loader;
};
