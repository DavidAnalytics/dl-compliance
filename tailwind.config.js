/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEEDFD',
          100: '#DAD8FB',
          200: '#BBB6F7',
          300: '#9A93F2',
          400: '#7B72EC',
          500: '#635BE5',
          600: '#514AD6',
          700: '#423BB8',
          800: '#363095',
          900: '#2C2878',
        },
        canvas: '#F4F4FB',
        surface: '#FFFFFF',
        line: '#ECECF5',
        ink: {
          DEFAULT: '#1F1B3A',
          muted: '#525573',
          faint: '#9A9CB3',
        },
        rag: {
          green: '#15A34A',
          greenbg: '#E8F6EE',
          amber: '#E08A0B',
          amberbg: '#FCF2E1',
          red: '#E0453C',
          redbg: '#FCE9E8',
        },
        cat: {
          pink: '#EC6A99',
          violet: '#635BE5',
          teal: '#2BB8A3',
          amber: '#E08A0B',
          blue: '#4C8DF6',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 27, 58, 0.04), 0 4px 16px rgba(31, 27, 58, 0.05)',
        pop: '0 8px 30px rgba(31, 27, 58, 0.12)',
        nav: '0 10px 30px rgba(81, 74, 214, 0.25)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #635BE5 0%, #8B82F2 100%)',
      },
    },
  },
  plugins: [],
};
