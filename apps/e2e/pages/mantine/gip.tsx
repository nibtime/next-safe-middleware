import { gipWithNonceAppliedToCsp } from "@next-safe/middleware/dist/document";
import MantinePage from "./index";

const Page = (props) => <MantinePage {...props} />;

Page.getInitialProps = gipWithNonceAppliedToCsp(async (ctx) => {
  return { message: "Hi, from getInitialProps" };
});

export default Page;
