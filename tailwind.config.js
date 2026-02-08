/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cadence brand colors from logo
        cadence: {
          pink: '#E91E8C',
          magenta: '#C41E7A',
          orange: '#F7941D',
          teal: '#00B4A6',
          cyan: '#00D4C8',
          blue: '#4A7FC1',
          purple: '#8B5DC8',
          navy: '#1E2A4A',
        },
        // Semantic colors
        primary: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#E91E8C',
          600: '#C41E7A',
          700: '#9D174D',
          800: '#831843',
          900: '#500724',
        },
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#00B4A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
