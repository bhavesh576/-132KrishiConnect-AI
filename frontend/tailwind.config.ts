import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1B5E3A", dark: "#123D26" },
        secondary: "#C97B24",
        accent: "#A8432E",
        success: "#3C7A34",
        warning: "#C97B24",
        danger: "#A8432E",
        bg: "#FAF6EE",
        surface: "#FFFFFF",
        borderc: "#D8CFBC",
        textc: "#2A2420",
        muted: "#6B6155",
        // tricolor accent strip (government portal style)
        saffron: "#FF9933",
        indiaGreen: "#138808",
      },
      fontFamily: {
        sans: ["var(--font-plex)", "var(--font-noto)", "IBM Plex Sans", "Noto Sans Devanagari", "sans-serif"],
      },
      borderRadius: {
        card: "6px",   // cards / inputs
        btn: "4px",    // buttons — NOT pill shaped
      },
      boxShadow: { subtle: "0 1px 2px rgba(0,0,0,0.06)" },
    },
  },
  plugins: [],
};
export default config;
