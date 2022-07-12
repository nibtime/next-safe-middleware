import { forwardRef, useCallback } from "react";
import tw, { styled } from "twin.macro";

const Button = forwardRef<HTMLButtonElement, any>(
  ({ children, Icon, css, ...props }, ref) => {
    const StyledIcon = useCallback(() => {
      const I = styled(Icon, { ...tw`ml-2 -mr-0.5 h-4 w-4` });
      return <I />;
    }, [Icon]);
    return (
      <button
        type="button"
        ref={ref}
        tw="inline-flex items-center px-3 py-2"
        css={{
          ...tw`text-sm leading-4 font-medium`,
          ...tw`border border-transparent shadow-sm rounded-md`,
          ...tw`text-white bg-sky-600 hover:bg-sky-700`,
          ...tw`focus:(outline-none ring-2 ring-offset-2 ring-sky-500)`,
          ...css
        }}
        {...props}
      >
        {children}
        <StyledIcon />
      </button>
    );
  }
);

export default Button;
