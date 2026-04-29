import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cairo"', "system-ui", "sans-serif"],
        display: ['"Tajawal"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        ink: {
          50: "#F7F6F2",
          100: "#EDEAE0",
          200: "#D8D3C2",
          300: "#B8B0A0",
          400: "#8A8170",
          500: "#5C5444",
          600: "#3F3A2E",
          700: "#2A2620",
          800: "#1A1814",
          900: "#0F0E0B",
        },
        accent: {
          DEFAULT: "#E8A87C",
          dark: "#C97C5D",
        },
        sage: {
          DEFAULT: "#A8B5A0",
          dark: "#6B7A63",
        },
        clay: {
          DEFAULT: "#D4886F",
          dark: "#8E5240",
        },
        ocean: {
          DEFAULT: "#7B9EA8",
          dark: "#4A6670",
        },
        sun: {
          DEFAULT: "#E5B567",
          dark: "#B08A3F",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
