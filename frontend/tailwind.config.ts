import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Semantic color token defined in globals.css (light under :root, dark under .dark).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        subtle: { foreground: token("subtle-foreground") },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground"), soft: token("primary-soft") },
        accent: { soft: token("accent-soft") },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        info: { DEFAULT: token("info"), soft: token("info-soft") },
      },
      fontFamily: {
        sans: ["var(--font-inter)", '"Inter"', '"Noto Sans Ethiopic"', '"Nyala"', ...defaultTheme.fontFamily.sans],
        display: [
          "var(--font-poppins)",
          '"Poppins"',
          '"Noto Sans Ethiopic"',
          '"Nyala"',
          ...defaultTheme.fontFamily.sans,
        ],
        heading: [
          "var(--font-poppins)",
          '"Poppins"',
          '"Noto Sans Ethiopic"',
          '"Nyala"',
          ...defaultTheme.fontFamily.sans,
        ],
        amharic: ['"Noto Sans Ethiopic"', '"Nyala"', '"Abyssinica SIL"', "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 1px 3px 0 rgb(var(--shadow) / 0.08)",
        lift: "0 8px 24px -6px rgb(var(--shadow) / 0.12), 0 2px 6px -2px rgb(var(--shadow) / 0.06)",
        glow: "0 0 0 1px rgb(99 102 241 / 0.2), 0 8px 24px -6px rgb(99 102 241 / 0.35)",
        card: "0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 12px 32px -12px rgb(var(--shadow) / 0.12)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #fdf4ff 100%)",
        "sidebar-gradient":
          "linear-gradient(180deg, #0d1020 0%, #13163a 55%, #1e1340 100%)",
        "hero-gradient":
          "radial-gradient(at 20% 20%, rgb(99 102 241 / 0.16) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(168 85 247 / 0.14) 0px, transparent 50%), radial-gradient(at 50% 100%, rgb(56 189 248 / 0.12) 0px, transparent 50%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
