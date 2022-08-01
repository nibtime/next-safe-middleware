import React from "react";

export const isJsxElement = (el: any): el is JSX.Element =>
  !!el && typeof el === "object" && "props" in el;

export const isFragment = (el: any): el is JSX.Element =>
  isJsxElement(el) && el.type === "Fragment";

export const isElementWithChildren = (el: any): el is JSX.Element =>
  isJsxElement(el) && "children" in el.props;

export const isScriptElement = (el: any): el is JSX.Element =>
  isJsxElement(el) && el.type === "script";

export const isInlineScriptElement = (el: any): el is JSX.Element =>
  isScriptElement(el) && !!el.props.dangerouslySetInnerHTML?.__html;

export const isSrcScriptElement = (el: any): el is JSX.Element =>
  isScriptElement(el) && !!el.props.src

export const isScriptElementWithIntegrity = (el: any): el is JSX.Element =>
  isJsxElement(el) && !!el.props.integrity;

  export const isScriptElementWithoutIntegrity = (el: any): el is JSX.Element =>
  isJsxElement(el) && !el.props.integrity;

export const isLinkElement = (el: any): el is JSX.Element =>
  isJsxElement(el) && el.type === "link" && !!el.props.href;

export const isScriptPreloadLink = (el: any): el is JSX.Element =>
  isLinkElement(el) && el.props.as === "script";

export const isScriptPreloadLinkWithIntegrity = (el: any): el is JSX.Element =>
  isScriptPreloadLink(el) && !!el.props.integrity;

export const isStyleElement = (el: unknown): el is JSX.Element =>
  isJsxElement(el) && el.type === "style";

export const isInlineStyleElement = (el: unknown): el is JSX.Element =>
  isStyleElement(el) && !!el.props.dangerouslySetInnerHTML?.__html;

export const isStyleSheetElement = (el: unknown): el is JSX.Element =>
  isLinkElement(el) && el.props.rel === "stylesheet";

export const withStringChildrenAsInlineCode = (el: JSX.Element) => {
  if (typeof el.props.children !== "string") {
    return el;
  }
  const { children, ...props } = el.props.children;
  return (
    <script
      key={el.key}
      {...props}
      dangerouslySetInnerHTML={{ __html: el.props.children }}
    />
  );
};
