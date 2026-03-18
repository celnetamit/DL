import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0b1120",
        dune: "#f4ede4",
        ember: "#ff6a3d",
        moss: "#0f766e",
      },
      boxShadow: {
        glow: "0 0 30px rgba(255, 106, 61, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
