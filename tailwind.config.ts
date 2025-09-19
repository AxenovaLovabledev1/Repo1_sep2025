import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          light: "#f5f5f7",
          dark: "#111827"
        }
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        blink: "blink 1.4s infinite both"
      }
    }
  },
  plugins: []
};

export default config;
