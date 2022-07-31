import type { DocumentContext, DocumentInitialProps } from "next/document";

export type ProcessHtmlOptions = {
  styles?: boolean | { elements?: boolean; attributes?: boolean };
};

export type CspDocumentInitialPropsOptions = {
  /** the context of the document, same as passed to `Document.getInitialProps` */
  ctx: DocumentContext;

  /**
   * if you call `Document.getInitialProps` yourself and want to do more customizations
   * on initialProps before, do them and pass the result here  */
  passInitialProps?: DocumentInitialProps;

  /**
   * You need to set this to `true`, if you want strict inline styles and use the `strictInlineStyles` middleware.
   * If you do so, styles (tags and attributes) of prerendered HTML
   * will be visited and nonced/hashed for CSP.
   *
   * @default false
   *
   * @see https://github.com/nibtime/next-safe-middleware/issues/31
   */
  trustifyStyles?: boolean;

  /**
   * This needs to be `true` if you use a strict CSP with `strictDynamic` middleware.
   * This will ensure that all your scripts that need to load before your app
   * is interactive (including Next itself) get nonced/hashed and included in your CSP.
   *
   * @default true
   */
  trustifyScripts?: boolean;

  /**
   * you can pass raw css of style tags here to be hashed. This is necessary if a framework adds
   * style tags in an opaque way with a React component, like Mantine. In such cases you can pass
   * the raw css text of the underlying CSS-in-JS framework here.
   *
   * values can be a string with raw css text
   * or a function that pull a string with css text from `initialProps`
   * (if you want an enhanced <App> with nonce, you can't call Document.getInitialProps before);
   *
   * @see https://github.com/nibtime/next-safe-middleware/issues/34
   *
   * @example
   * const initialProps = await getCspInitialProps({
   *   ctx,
   *   trustifyStyles: true,
   *   hashStyleElements: [
   *     (initialProps) =>
   *       stylesServer
   *         .extractCriticalToChunks(initialProps.html)
   *         .styles.map((s) => s.css),
   *   ],
   * });
   * ...
   *
   * return initialProps
   */
  hashRawCss?: (
    | string
    | ((initialProps: DocumentInitialProps) => string | string[])
  )[];

  /**
   * To control whether to trustify stuff in initialProps.html
   *
   * This can be potentially dangerous if you server-render dynamic user data from `getStaticProps` or `getServerSideProps`
   * in HTML. However if you turn it off, every inline style of every 3rd party lib (including even default Next.js 404) will
   * be blocked by CSP with the only alternative being `style-src unsafe-inline`.
   *
   * Can be turned completely on/off complete per directives with `trustify...` flags
   * and selectively for initialProps.html with granluar control via this config object
   * @default
   * {
   *   styles: {
   *     elements: true,
   *     attributes: true
   *   }
   * }
   */
  processHtmlOptions?: ProcessHtmlOptions;
  hashBasedByProxy?: boolean
};

