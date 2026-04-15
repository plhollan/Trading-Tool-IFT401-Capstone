/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
        surface: {
          900: '#0d0b08',
          800: '#141109',
          700: '#1c1710',
          600: '#252018',
          500: '#2e2820',
        }
      },
      fontFamily: {
        display: ['"DM Mono"', 'monospace'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
      },
      animation: {
        'ticker-scroll': 'ticker 30s linear infinite',
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        ticker:  { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      }
    }
  },
  plugins: []
}
