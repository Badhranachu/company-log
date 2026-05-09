/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          50: '#effef7',
          100: '#d6fbea',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d'
        }
      },
      boxShadow: {
        glass: '0 8px 40px rgba(15, 23, 42, 0.12)'
      }
    }
  },
  plugins: []
}
