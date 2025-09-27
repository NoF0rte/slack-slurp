import { defineConfig } from '@tailwindcss/postcss'

export default defineConfig({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Slack color palette
        slack: {
          purple: '#4A154B',
          dark: '#1D1C1D',
          gray: '#616061',
          lightgray: '#F8F8F8',
          blue: '#1264A3',
          green: '#2EB67D',
          yellow: '#ECB22E',
          red: '#E01E5A',
        }
      },
      fontFamily: {
        'slack': ['Lato', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
})