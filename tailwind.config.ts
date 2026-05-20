import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Premium editorial pairing: serif display + clean sans
        display: ['"GT Sectra"', '"Cormorant Garamond"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"]
      },
      colors: {
        ink: {
          900: "#111111",
          700: "#2a2a2a",
          500: "#5b5b5b",
          300: "#9a9a9a",
          100: "#dcdcdc"
        },
        paper: {
          50: "#fbfaf7",
          100: "#f4f1ea",
          200: "#ece7dc"
        }
      },
      letterSpacing: {
        editorial: "0.08em",
        wide: "0.18em"
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};

export default config;
