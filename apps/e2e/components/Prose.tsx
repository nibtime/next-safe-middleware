import tw, { styled } from 'twin.macro'

export default styled('article', {
    ...tw`prose prose-blue`,
    variants: {
        variant: {
            blueLinks: {
                ...tw`prose-blue`
            } 
        }
    },
    isLarge: { true: tw`prose-xl`, false: tw`prose-lg` }
})
