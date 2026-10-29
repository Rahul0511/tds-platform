/** @type {import('tailwindcss').Config} */

// Semantic colours come from CSS variables (see styles.css), so one class
// such as `bg-surface` works in both light and dark mode.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        muted: token('muted'),
        subtle: token('subtle'),
        // Siegwerk red (#D8000A on siegwerk.com)
        brand: {
          50: '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc6c7',
          300: '#ff9a9d',
          400: '#fd5d63',
          500: '#f0262f',
          600: '#d8000a',
          700: '#b3000c',
          800: '#930710',
          900: '#7a0c13',
          950: '#430206',
        },
        'brand-wordmark': '#d91c01',
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.25), 0 4px 10px -6px rgb(15 23 42 / 0.15)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 180ms cubic-bezier(0.2, 0.9, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
