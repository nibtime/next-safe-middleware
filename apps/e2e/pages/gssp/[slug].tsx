import { useRouter } from "next/router";
import Page from "./index";
import "twin.macro";
import { gsspWithNonceAppliedToCsp } from "@next-safe/middleware/dist/document";

export const getServerSideProps = gsspWithNonceAppliedToCsp(async (ctx) => {
  return {
    props: {},
  };
});

const SlugPage = () => {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <div tw="space-y-6">
      <p>Slug: {slug}</p>
      <Page />
    </div>
  );
};

export default SlugPage;
