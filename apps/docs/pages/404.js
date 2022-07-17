import Error from "next/error";
import tw from "twin.macro";

export default () => (
  <div css={{ h2: tw`border-0!` }}>
    <Error statusCode={404} />
  </div>
);
