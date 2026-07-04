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
        primary: {
          1: "#E6FAFA",
          2: "#B3EFEF",
          3: "#82E6E6",
          4: "#06CECE",
          5: "#05B1B1",
          6: "#049494",
          7: "#047676",
          8: "#025259",
        },
        secondary: {
          1: "#FDF1EC",
          2: "#E8713F",
          3: "#F3B89F",
          4: "#ED8D65",
          5: "#E8713F",
          6: "#D5653C",
        },
        background: {
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
  plugins: [require("tailwindcss-animate"), heroui()],
} satisfies Config;

export default config;
