import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "rr-base": "#030712",
        "rr-surface": "#0B1117",
        "rr-surface2": "#0f1923",
        "rr-border": "#1F2937",
        "rr-border2": "#374151",
        "rr-cyan": "#38BDF8",
        "rr-indigo": "#818CF8",
        "rr-text": "#F9FAFB",
        "rr-text2": "#9CA3AF",
        "rr-muted": "#4B5563",
        "risk-critical": "#f87171",
        "risk-high": "#fb923c",
        "risk-medium": "#fbbf24",
        "risk-low": "#34d399",
        "sev-severe": "#f87171",
        "sev-moderate": "#fbbf24",
        "sev-low": "#34d399",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Consolas", "monospace"],
        display: ["var(--font-geist-sans)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "rr-grid": "linear-gradient(rgba(56,189,248,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.035) 1px, transparent 1px)",
      },
      boxShadow: {
        "rr-cyan": "0 0 0 0.5px rgba(56,189,248,0.7), 0 0 20px rgba(56,189,248,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
