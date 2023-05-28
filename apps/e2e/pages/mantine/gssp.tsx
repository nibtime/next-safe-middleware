import type { InferGetServerSidePropsType, NextPage } from "next";
import { gsspWithNonce } from "@komw/next-safe-middleware/dist/document";
import MantinePage from "./index";

export const getServerSideProps = gsspWithNonce(async (ctx) => {
  return { props: { message: "Hi, from getServerSideProps" } };
});

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Page: NextPage<PageProps> = (props) => <MantinePage {...props} />;

export default Page;
