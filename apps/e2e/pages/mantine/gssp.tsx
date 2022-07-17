import type { InferGetServerSidePropsType, NextPage } from "next";
import { gsspWithNonceAppliedToCsp } from "@next-safe/middleware/dist/document";
import MantinePage from "./index";

export const getServerSideProps = gsspWithNonceAppliedToCsp(async (ctx) => {
  return { props: { message: "Hi, from getServerSideProps" } };
});

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Page: NextPage<PageProps> = (props) => <MantinePage {...props} />;

export default Page;
