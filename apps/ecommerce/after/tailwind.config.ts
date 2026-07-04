import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#05070f",
        panel: "#0b1020",
        line: "rgba(148,163,184,0.14)",
        "line-soft": "rgba(148,163,184,0.07)",
        dim: "#94a3b8",
        faint: "#64748b",
        accent: "#22d3ee",
        "accent-soft": "rgba(34,211,238,0.14)",
        warn: "#fbbf24",
        err: "#f87171",
        ok: "#34d399",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
