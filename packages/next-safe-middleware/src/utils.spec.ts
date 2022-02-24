// __tests__/index.test.jsx

import { fromCspContent, toCspContent, extendCsp, filterCsp } from '../src/utils'
import fs from 'fs'

const cspContent = fs.readFileSync(`${process.cwd()}/__fixtures__/csp.txt`, 'utf-8')
const parsedCsp  = fromCspContent(cspContent)

describe('CSP utils', () => {
  it('stringifies and parses a CSP back into the same CSP', () => {
    expect(parsedCsp).toEqual(fromCspContent(toCspContent(parsedCsp)))
  }),
  it('extends and filters a CSP back into the same CSP', () => {
    const extendedCSP = extendCsp(parsedCsp, {"script-src": 'https://example.com'})
    const reducedCSP = filterCsp(extendedCSP, {"script-src": /example\.com/})
    expect(parsedCsp).toEqual(reducedCSP)
  })
})

