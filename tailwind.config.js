/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // UExam Brand Colors
        brand: {
          navy: "#002144",
          white: "#ffffff",
        },
        // Navy variations for different states
        navy: {
          50: "#f0f4f7",
          100: "#d9e2eb",
          200: "#b3c5d6",
          300: "#8ca8c2",
          400: "#668bad",
          500: "#406e99",
          600: "#335777",
          700: "#264055",
          800: "#1a2a33",
          900: "#002144",
        },
        // Keep some utility colors for states
        primary: "#002144", // Our navy blue
        secondary: "#ffffff", // White
        accent: {
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
