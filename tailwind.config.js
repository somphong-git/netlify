/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#262626',
        foreground: '#f5f5f5',
        muted: '#8a8a8a',
      },
    },
  },
  plugins: [],
}
