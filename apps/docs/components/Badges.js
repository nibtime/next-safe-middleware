import "twin.macro";

const Badges = ({ children, ...props }) => (
  <div tw="flex justify-center space-x-3" {...props}>
    {children}
  </div>
);

const Container = ({ children, ...props }) => (
  <div tw="flex flex-col space-y-5 my-7" {...props}>
    {children}
  </div>
);

Container.Row = Badges

export default Container;