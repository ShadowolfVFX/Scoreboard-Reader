// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}', // Adjust the path according to your project structure
  ],
  theme: {
    extend: {
      fontFamily: {
        panton: ['Panton', 'sans-serif'],
      },
      colors: {
        primary: '#FF7B00',
        secondary: '#FFD791',
        alternate: '#00B4D8',
        background1: '#172A3A',
        background2: '#004346',
        background3: '#001c35',
      },
    },
  },
  plugins: [],
}