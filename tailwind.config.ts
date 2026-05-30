import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-bg-card)",
        page: "var(--color-bg-page)",
        muted: "var(--color-bg-muted)",
        border: "var(--color-border-light)",
        primary: "var(--color-primary)",
        "primary-soft": "var(--color-primary-bg)",
        foreground: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
      },
    },
  },
  plugins: [],
};

export default config;
