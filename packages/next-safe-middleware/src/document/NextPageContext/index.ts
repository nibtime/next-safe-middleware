import type { GetServerSideProps, NextPageContext, PreviewData } from "next";
import type { ParsedUrlQuery } from "querystring";
import { getCreateCtxNonceIdempotent } from "./nonce";

export function gsspWithNonce<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData
>(
  getServerSideProps: GetServerSideProps<P, Q, D>
): GetServerSideProps<P & { nonce: string }, Q, D> {
  return async (ctx) => {
    const gsspResult = await getServerSideProps(ctx);
    if ("props" in gsspResult) {
      const nonce = getCreateCtxNonceIdempotent(ctx);
      const props = await gsspResult.props;
      return { ...gsspResult, props: { ...props, nonce } };
    }
  };
}

export function gipWithNonce<
  Props extends Record<string, any> = Record<string, any>
>(
  getInitialProps: (ctx: NextPageContext) => Promise<Props>
): (ctx: NextPageContext) => Promise<Props & { nonce: string }> {
  return async (ctx) => {
    const props = await getInitialProps(ctx);
    const nonce = getCreateCtxNonceIdempotent(ctx);
    return { ...props, nonce };
  };
}

/**
 * @alias gsspWithNonce
 */
export const gsspWithNonceAppliedToCsp = gsspWithNonce;

/**
 * @alias gipWithNonce
 */
export const gipWithNonceAppliedToCsp = gipWithNonce;

export { logCtxHeaders } from "./headers";
export { setCtxCsp, getCtxCsp } from "./csp";
export {
  setNonceBits,
  generateNonce,
  getCtxNonce,
  getCreateCtxNonceIdempotent,
} from "./nonce";
