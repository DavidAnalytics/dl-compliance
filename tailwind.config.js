/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e5ff',
          200: '#bcd0ff',
          300: '#8eb2ff',
          400: '#5987fc',
          500: '#3461f3',
          600: '#1f42e0',
          700: '#1a33c5',
          800: '#1c2ea0',
          900: '#1d2d7f',
        },
        rag: {
          green: '#15803d',
          amber: '#b45309',
          red: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
