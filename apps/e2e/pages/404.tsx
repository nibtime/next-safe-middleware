import tw, { styled } from "twin.macro";
import Container from "components/Container";

const Error = styled("pre", {
  ...tw`font-mono text-red-600 text-2xl sm:text-5xl xl:text-7xl `,
});

export default () => (
  <div tw="min-h-screen flex flex-col justify-center">
    <Container isCentered>
      <Error>404 - Page not found</Error>
    </Container>
  </div>
);
