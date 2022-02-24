// eslint-disable-next-line @next/next/no-document-import-in-page
import { Head as NextHead } from 'next/document';
import { scriptWithPatchedCrossOrigin, withHashIfInlineScript } from './utils';
import { pipe } from 'ramda'

export class Head extends NextHead {
  // this will return the scripts that have been inserted by
  // <Script ... strategy="beforeInteractive"} /> from 'next/script' somewhere.
  getPreNextScripts() {
    return super.getPreNextScripts().map(pipe(withHashIfInlineScript, scriptWithPatchedCrossOrigin));
  }
}
