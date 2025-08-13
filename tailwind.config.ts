import type { Config } from "tailwindcss"

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fill: {
        none: "none",
        current: "currentColor",
        white: "#ffffff",
        black: "#000000",
        transparent: "transparent",
        // Primary colors
        "blue-50": "#eff6ff",
        "blue-100": "#dbeafe",
        "blue-200": "#bfdbfe",
        "blue-300": "#93c5fd",
        "blue-400": "#60a5fa",
        "blue-500": "#3b82f6",
        "blue-600": "#2563eb",
        "blue-700": "#1d4ed8",
        "blue-800": "#1e40af",
        "blue-900": "#1e3a8a",
        // Accent colors
        "cyan-50": "#ecfeff",
        "cyan-100": "#cffafe",
        "cyan-200": "#a5f3fc",
        "cyan-300": "#67e8f9",
        "cyan-400": "#22d3ee",
        "cyan-500": "#06b6d4",
        "cyan-600": "#0891b2",
        "cyan-700": "#0e7490",
        "cyan-800": "#155e75",
        "cyan-900": "#164e63",
        // Neutral colors
        "slate-50": "#f8fafc",
        "slate-100": "#f1f5f9",
        "slate-200": "#e2e8f0",
        "slate-300": "#cbd5e1",
        "slate-400": "#94a3b8",
        "slate-500": "#64748b",
        "slate-600": "#475569",
        "slate-700": "#334155",
        "slate-800": "#1e293b",
        "slate-900": "#0f172a",
        // Status colors
        "green-50": "#f0fdf4",
        "green-100": "#dcfce7",
        "green-200": "#bbf7d0",
        "green-300": "#86efac",
        "green-400": "#4ade80",
        "green-500": "#22c55e",
        "green-600": "#16a34a",
        "green-700": "#15803d",
        "green-800": "#166534",
        "green-900": "#14532d",
        "red-50": "#fef2f2",
        "red-100": "#fee2e2",
        "red-200": "#fecaca",
        "red-300": "#fca5a5",
        "red-400": "#f87171",
        "red-500": "#ef4444",
        "red-600": "#dc2626",
        "red-700": "#b91c1c",
        "red-800": "#991b1b",
        "red-900": "#7f1d1d",
        "amber-50": "#fffbeb",
        "amber-100": "#fef3c7",
        "amber-200": "#fde68a",
        "amber-300": "#fcd34d",
        "amber-400": "#fbbf24",
        "amber-500": "#f59e0b",
        "amber-600": "#d97706",
        "amber-700": "#b45309",
        "amber-800": "#92400e",
        "amber-900": "#78350f",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
