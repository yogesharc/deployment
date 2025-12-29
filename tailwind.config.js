/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vercel: {
          black: '#000000',
          white: '#ffffff',
          gray: {
            100: '#fafafa',
            200: '#eaeaea',
            300: '#999999',
            400: '#888888',
            500: '#666666',
            600: '#444444',
            700: '#333333',
            800: '#222222',
            900: '#111111',
          },
          blue: '#0070f3',
          success: '#0070f3',
          error: '#ee0000',
          warning: '#f5a623',
        }
      }
    },
  },
  plugins: [],
}
