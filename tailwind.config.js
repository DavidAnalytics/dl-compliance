/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#16243D',
          800: '#1A2B47',
          700: '#213457',
          600: '#2B4269',
          500: '#34507F',
        },
        paper: '#F5F6F8',
        surface: '#FFFFFF',
        line: '#E3E6EB',
        brass: {
          DEFAULT: '#B38A3C',
          soft: '#F3ECDD',
          700: '#977330',
        },
        content: {
          strong: '#16243D',
          DEFAULT: '#3A4559',
          muted: '#6B7585',
        },
        rag: {
          green: '#1F7A4D',
          greenbg: '#E7F3EC',
          amber: '#B46A12',
          amberbg: '#FBF0DF',
          red: '#B42318',
          redbg: '#FBE9E7',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22, 36, 61, 0.04), 0 1px 3px rgba(22, 36, 61, 0.06)',
        raised: '0 4px 12px rgba(22, 36, 61, 0.08)',
      },
    },
  },
  plugins: [],
};
