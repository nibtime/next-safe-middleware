import type { CSS as StitchesCSS } from '@stitches/react'
import { config, css as cssStitches, styled as styledStitches } from '../stitches.config'

declare global {
  type CSS = StitchesCSS<typeof config>
}

declare module 'react' {
  // The css prop
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    css?: CSS
    tw?: string
  }
  // The inline svg css prop
  interface SVGProps<T> extends SVGProps<SVGSVGElement> {
    css?: CSS
    tw?: string
  }
}

declare module 'twin.macro' {
  // The styled and css imports
  const styled: typeof styledStitches
  const css: typeof cssStitches
}