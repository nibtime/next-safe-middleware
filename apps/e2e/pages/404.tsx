import tw from "twin.macro";
import Container from "components/Container";
import ErrorComponent from "next/error";

const NotFound = tw.pre`font-mono text-red-600 text-2xl sm:text-5xl xl:text-7xl`;

export default () => (
  <div tw="min-h-screen flex flex-col">
    <Container isCentered>
      <NotFound>404 - Custom styled error</NotFound>
    </Container>
    <ErrorComponent statusCode={404} />
  </div>
);
