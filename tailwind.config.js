/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4f9',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#8dadd2',
          400: '#6692c3',
          500: '#4077b4',
          600: '#2d5a8e',
          700: '#1e3a5f',  // Primary sidebar color
          800: '#142a47',
          900: '#0f1e35',  // Sidebar bg
          950: '#080f1a',
        },
        petroleum: {
          50:  '#fff8e6',
          100: '#ffeecc',
          200: '#fedd99',
          300: '#fecc66',
          400: '#febb33',
          500: '#feaa00',  // Amber gold
          600: '#cc8800',
          700: '#996600',
          800: '#664400',
          900: '#332200',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 1px 4px -1px rgb(0 0 0 / 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
