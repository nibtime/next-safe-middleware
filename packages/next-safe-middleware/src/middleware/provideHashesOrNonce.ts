import { nanoid } from 'nanoid';
import { uniq } from 'ramda';
import {
  cspDirectiveHas,
  fromCspContent,
  toCspContent,
  extendCsp,
} from '../utils';
import type { Middleware } from './types';
import {
  CSP_LOCATION_MIDDLEWARE,
  SCRIPT_HASHES_FILENAME,
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_NONCE_HEADER,
} from '../constants';

const cspifyHash = (integrity: string) => `'${integrity}'`;

// eslint-disable-next-line sonarjs/cognitive-complexity
const provideHashesOrNonce: Middleware = async (req, evt, res) => {
  if (!req.page.name || !res) {
    return;
  }
  const cspContentReportOnly = res.headers.get(CSP_HEADER_REPORT_ONLY);
  const isReportOnly = !!cspContentReportOnly;
  let cspContent = isReportOnly
    ? cspContentReportOnly
    : res.headers.get(CSP_HEADER);
  if (cspContent) {
    let csp = fromCspContent(cspContent);
    if (cspDirectiveHas(csp, 'script-src', /strict-dynamic/)) {
      // req.page.name is the name of the route, e.g. `/` or `/blog/[slug]`
      const route = req.page.name;
      const { origin, pathname } = req.nextUrl;
      let resHashes: Response | undefined;

      try {
        const baseUrl = `${origin}/${CSP_LOCATION_MIDDLEWARE}`;
        // route seems to get confused when there's a dynamic route and a
        // matching static route within the same folder. Attempt to fix that.
        // TODO: This is a hack, and should be removed once we found a better way to handle this.
        if (route !== pathname) {
          const hashesUrl = encodeURI(
            `${baseUrl}${pathname}/${SCRIPT_HASHES_FILENAME}`
          );
          resHashes = await fetch(hashesUrl);
        }
        if (!resHashes?.ok) {
          const hashesUrl = encodeURI(
            `${baseUrl}${route}/${SCRIPT_HASHES_FILENAME}`
          );
          resHashes = await fetch(hashesUrl);
        }
      } catch (err) {
        console.error(
          'Internal error fetching script hashes, switching to report-only mode to not break your app.',
          err
        );
        res.headers.delete(CSP_HEADER);
        res.headers.set(CSP_HEADER_REPORT_ONLY, cspContent);
        return;
      }

      // if we fetched hashes, it's a static page. Choose strict-dynamic + hash
      if (resHashes?.ok) {
        const hashesText = await resHashes.text();
        const hashes = hashesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        csp = extendCsp(csp, {
          'script-src': uniq(hashes).map(cspifyHash),
        });
      }
      // if not it's a dynamic page. Choose strict-dynamic + nonce
      else {
        const nonce = nanoid();
        res.headers.set(CSP_NONCE_HEADER, nonce);
        csp = extendCsp(csp, {
          'script-src': [`'nonce-${nonce}'`],
        });
      }
      cspContent = toCspContent(csp);
      if (isReportOnly) {
        res.headers.set(CSP_HEADER_REPORT_ONLY, cspContent);
      } else {
        res.headers.set(CSP_HEADER, cspContent);
      }
    }
  }
};

export default provideHashesOrNonce;
