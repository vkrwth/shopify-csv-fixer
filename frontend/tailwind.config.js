/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Helvetica Neue", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"],
      },
      colors: {
        canvas: "#FBFBFA",
        surface: "#FFFFFF",
        ink: "#111111",
        muted: "#787774",
        faint: "#B2B0AA",
        rule: "#EAEAEA",
        // Muted pastel accents (protocol §4)
        "pale-red": { bg: "#FDEBEC", text: "#9F2F2D" },
        "pale-green": { bg: "#EDF3EC", text: "#346538" },
        "pale-yellow": { bg: "#FBF3DB", text: "#956400" },
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        widest: "0.15em",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
