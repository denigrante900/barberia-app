import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0907",
          900: "#14110e",
          800: "#1c1814",
          700: "#2a241e",
        },
        brass: {
          300: "#e8c989",
          400: "#d4b06a",
          500: "#c49a45",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(196, 154, 69, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
