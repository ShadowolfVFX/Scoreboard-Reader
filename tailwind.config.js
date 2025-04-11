// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{html,js,jsx,ts,tsx,vue,svelte}", // Adjust this to your project structure!
      "./index.html" // Include your main HTML file(s)
      // Add any other relevant file paths
    ],
    theme: {
      extend: {
        extend: { // Use extend to add to Tailwind's defaults
            colors: {
              'primary': '#FF7B00',
              'text': '#EACAAC',
              'secondary': '#FFD791',
              'alternate': '#00B4D8',
              'background-1': '#172A3A',
              'background-2': '#004346',
              'background-3': '#001c35',
            },
            fontFamily: {
              'sans': ['Panton', 'sans-serif'], // Assuming 'Panton' is your main sans-serif
              'light': ['Panton-Light', 'sans-serif'],
              'bold': ['Panton-Bold', 'sans-serif'],
            }
      },
    },
    plugins: [],
  }