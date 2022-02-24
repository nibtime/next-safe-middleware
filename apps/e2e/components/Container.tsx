import tw, { styled } from 'twin.macro'

export default styled('div', {
    ...tw`p-12`,
    variants: {
        isInner: { true: tw`max-w-5xl`, false: tw`max-w-7xl mx-auto` },
        isCentered: { true: tw`flex justify-center` }
    },
})
