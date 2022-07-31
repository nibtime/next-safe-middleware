import type { NextPageContext } from "next";

export type CtxHeaders = Pick<NextPageContext, "req" | "res">;
