const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
			sans: ['Inter var', ...defaultTheme.fontFamily.sans],
			serif: defaultTheme.fontFamily.serif,
			mono: defaultTheme.fontFamily.mono,
		},
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
