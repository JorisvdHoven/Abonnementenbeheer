/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F47920',
        'primary-light': '#FFF3E8',
        dark: '#1A1A1A',
        neutral: '#F5F5F5'
      }
    },
  },
  plugins: [],
}