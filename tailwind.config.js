const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}', // Ensure all components are covered
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Fira Code', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary: '#1DA1F2',
        secondary: '#14171A',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add Tailwind typography for better rendering of content
    require('@tailwindcss/forms'), // Ensure form elements have better default styles
  ],
};
