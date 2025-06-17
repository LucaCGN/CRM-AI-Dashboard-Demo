/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ["./index.html","./src/**/*.{js,jsx}"],
    theme: {
      extend: {
        colors: {
          'dark-navy': '#0A183D',
          'deep-blue': '#0E3AAA',
          'accent-blue': '#1E90FF'
        }
      }
    },
    plugins: []
  }
  