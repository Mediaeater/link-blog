const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}', // Ensure all components are covered
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-500) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        secondary: '#14171A',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add Tailwind typography for better rendering of content
    require('@tailwindcss/forms'), // Ensure form elements have better default styles
  ],
};
