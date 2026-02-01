/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f0',
          100: '#dcf0dc',
          200: '#b8e1b8',
          300: '#8fd28f',
          400: '#66c366',
          500: '#4CAF50',
          600: '#3d8b40',
          700: '#2e6b30',
          800: '#1f4a20',
          900: '#0f2910',
        },
        secondary: {
          50: '#f5f8fa',
          100: '#e6edf2',
          200: '#c9d9e5',
          300: '#9cbdd2',
          400: '#6898ba',
          500: '#3a7ca8',
          600: '#2c6284',
          700: '#224c68',
          800: '#1a384e',
          900: '#122534',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}