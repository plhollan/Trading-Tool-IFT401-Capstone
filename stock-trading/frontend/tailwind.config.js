/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfafa',
          100: '#d5f5f6',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
        surface: {
          900: '#0a0e1a',
          800: '#0f1629',
          700: '#151d35',
          600: '#1c2640',
          500: '#243050',
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
