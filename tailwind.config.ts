import { heroui } from "@heroui/theme";
import type { Config } from "tailwindcss";

// Nuki design tokens — mirrored from nk-admin-portal so the Planner MVP stays
// visually consistent with the production portal (teal primary, Manrope, etc.).
const config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        body: ['"Manrope"', "sans-serif"],
        sans: ['"Manrope"', "sans-serif"],
      },
      fontSize: {
        h1: ["3rem", { fontWeight: "700" }],
        h2: ["2rem", { fontWeight: "700" }],
        "title-1": ["1.75rem", { fontWeight: "700" }],
        "title-2": ["1.5rem", { fontWeight: "700" }],
        "title-3": ["1.5rem", { fontWeight: "700" }],
        "title-4": ["1.25rem", { fontWeight: "700" }],
        p: ["1rem", { fontWeight: "400" }],
        "p-bold": ["1rem", { fontWeight: "700" }],
        "sm-p": ["0.875rem", { fontWeight: "400" }],
        "sm-p-bold": ["0.875rem", { fontWeight: "700" }],
        "xs-p": ["0.75rem", { fontWeight: "400" }],
        "xs-p-bold": ["0.75rem", { fontWeight: "700" }],
      },
      colors: {
        // Nuki numeric scale (1-8, nk-admin-portal convention). The extra
        // 50-900/DEFAULT/foreground keys keep HeroUI's semantic classes
        // (bg-primary, text-primary-foreground, ...) alive: this object
        // shadows the heroui() plugin's `primary`, so it must include them.
        primary: {
          1: "#E6FAFA",
          2: "#B3EFEF",
          3: "#82E6E6",
          4: "#06CECE",
          5: "#05B1B1",
          6: "#049494",
          7: "#047676",
          8: "#025259",
          50: "#E6FAFA",
          100: "#B3EFEF",
          200: "#82E6E6",
          300: "#06CECE",
          400: "#05B1B1",
          500: "#049494",
          600: "#047676",
          700: "#047676",
          800: "#025259",
          900: "#025259",
          DEFAULT: "#047676",
          foreground: "#ffffff",
        },
        secondary: {
          1: "#FDF1EC",
          2: "#E8713F",
          3: "#F3B89F",
          4: "#ED8D65",
          5: "#E8713F",
          6: "#D5653C",
          DEFAULT: "#E8713F",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#ffffff",
          standard: "#f5f5f5",
          modal: "#444444",
        },
        functional: {
          success: "#047676",
          "success-light": "#E6FAFA",
          warning: "#faad14",
          "warning-light": "#fffbe6",
          error: "#E45F61",
          "error-light": "#FFEFEF",
        },
        neutral: {
          "gray-1": "#ffffff",
          "gray-2": "#fafafa",
          "gray-3": "#f5f5f5",
          "gray-4": "#f0f0f0",
          "gray-5": "#d9d9d9",
          "gray-6": "#bfbfbf",
          "gray-7": "#8c8c8c",
          "gray-8": "#595959",
          "gray-9": "#434343",
          "gray-10": "#262626",
          "gray-11": "#1f1f1f",
          "gray-12": "#141414",
          "gray-13": "#000000",
        },
        // Pastel bg/fg pairs used by status badges and category chips
        // (mirrors STATUS_CFG/CAT_COLORS from the prototype).
        tint: {
          blue: { bg: "#dbeafe", fg: "#1d4ed8" },
          violet: { bg: "#ede9fe", fg: "#7c3aed" },
          pink: { bg: "#fce7f3", fg: "#be185d" },
          amber: { bg: "#fef3c7", fg: "#92400e" },
          emerald: { bg: "#d1fae5", fg: "#065f46" },
          sky: { bg: "#e0f2fe", fg: "#0369a1" },
          red: { bg: "#fee2e2", fg: "#dc2626" },
          orange: { bg: "#ffedd5", fg: "#d97706" },
          // Cores de categoria (COLOR_SCHEMES em shared/constants/categorias.ts)
          gray: { bg: "#f5f5f5", fg: "#595959" },
          yellow: { bg: "#fef9c3", fg: "#a16207" },
          green: { bg: "#dcfce7", fg: "#15803d" },
          teal: { bg: "#ccfbf1", fg: "#0f766e" },
          cyan: { bg: "#cffafe", fg: "#0e7490" },
          purple: { bg: "#f3e8ff", fg: "#7e22ce" },
        },
      },
      borderRadius: {
        // Nuki radius tokens beyond the Tailwind scale (tokens.js: xl=14, 2xl=20)
        "nk-xl": "14px",
        "nk-2xl": "20px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // HeroUI semantic colors: brand teal as `primary` (actions use primary7
    // #047676, as in the prototype's `teal` button), functional palette mapped
    // to success/warning/danger.
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50: "#E6FAFA",
              100: "#B3EFEF",
              200: "#82E6E6",
              300: "#06CECE",
              400: "#05B1B1",
              500: "#049494",
              600: "#047676",
              700: "#047676",
              800: "#025259",
              900: "#025259",
              DEFAULT: "#047676",
              foreground: "#ffffff",
            },
            success: { DEFAULT: "#047676", foreground: "#ffffff" },
            warning: { DEFAULT: "#faad14", foreground: "#262626" },
            danger: { DEFAULT: "#E45F61", foreground: "#ffffff" },
            focus: "#047676",
          },
        },
      },
    }),
  ],
} satisfies Config;

export default config;
