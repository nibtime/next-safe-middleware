/**
 * ┬─┬ノ( ◕◡◕ ノ) Stitches
 *
 * https://stitches.dev/
 * https://github.com/ben-rogerson/twin.examples/tree/master/next-stitches-typescript
 */

 import type { CSS as StitchesCSS } from '@stitches/react';
 import { createStitches } from '@stitches/react';
 
 export const stitches = createStitches({
   prefix: '',
   theme: {},
   utils: {},
 });
 
 export const {
   css,
   styled,
   globalCss,
   theme,
   keyframes,
   getCssText,
   config,
   reset,
 } = stitches;
 
 export type CSS = StitchesCSS<typeof stitches>;
 
 const _inlineCss = css({});
 
 /**
  * Helper to inline css
  */
 export const inlineCss = (css: CSS) => _inlineCss({ css });
 
 /**
  * Helper to inline css by className
  */
 export const classNameCss = (css: CSS, className?: string) => {
   const cssClassName = inlineCss(css).className;
   return className ? `${className} ${cssClassName}` : cssClassName;
 };
 
 /**
  * Helper to generate boolean variants for stitches styled components.
  */
 export const boolVariant = <Condition extends string>(
   booleanCondition: Condition,
   stylesIfTrue: CSS,
   stylesIfFalse?: CSS
 ) => {
   return {
     [booleanCondition]: {
       true: stylesIfTrue,
       ...(stylesIfFalse ? { false: stylesIfFalse } : {}),
     },
   } as Record<Condition, { true: CSS; false: CSS }>;
 };
 
 /**
  * Helper to apply conditional styles to stitches css prop
  */
 export const cssIf = (
   condition: boolean,
   stylesIfTrue: CSS,
   stylesIfFalse?: CSS
 ): CSS => {
   return {
     ...(condition ? stylesIfTrue : stylesIfFalse ? stylesIfFalse : {}),
   };
 };
 
 const createGetLazyCssText = () => {
   let cache: Record<string, string> = {};
 
   return Object.assign(
     (path: string) => {
       if (cache[path]) return cache[path];
       const css = (cache[path] = getCssText());
       reset();
       return css;
     },
     {
       resetCache: () => (cache = {}),
     }
   );
 };
 
 /**
  * Helper to get CSS for SSR for _document.js.
  */
 export const lazyGetCssText = createGetLazyCssText();
 