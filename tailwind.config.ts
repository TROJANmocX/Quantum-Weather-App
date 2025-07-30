/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom neon colors
        "neon-blue": "hsl(210 80% 60%)", // Brighter blue
        "neon-purple": "hsl(270 80% 60%)", // Brighter purple
        "deep-purple": "hsl(270 60% 20%)", // Deeper purple for backgrounds
        "dark-bg": "hsl(240 10% 8%)", // Very dark background
        "dark-card": "hsl(240 8% 12%)", // Slightly lighter dark for cards
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-sm": "0 0 5px var(--neon-blue), 0 0 10px var(--neon-purple)",
        "glow-md": "0 0 10px var(--neon-blue), 0 0 20px var(--neon-purple)",
        "glow-lg": "0 0 15px var(--neon-blue), 0 0 30px var(--neon-purple)",
        "glow-purple": "0 0 10px var(--neon-purple), 0 0 20px var(--neon-purple)",
        "glow-blue": "0 0 10px var(--neon-blue), 0 0 20px var(--neon-blue)",
      },
      textShadow: {
        "glow-sm": "0 0 3px var(--neon-blue), 0 0 6px var(--neon-purple)",
        "glow-md": "0 0 5px var(--neon-blue), 0 0 10px var(--neon-purple)",
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
        "orb-spin": {
          "0%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "100%": { transform: "rotateY(360deg) rotateX(360deg)" },
        },
        "text-glow": {
          "0%, 100%": { "text-shadow": "0 0 8px hsl(210 80% 60% / 0.7), 0 0 15px hsl(270 80% 60% / 0.5)" },
          "50%": { "text-shadow": "0 0 12px hsl(210 80% 60% / 1), 0 0 20px hsl(270 80% 60% / 0.8)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.2" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "orb-spin": "orb-spin 20s linear infinite",
        "text-glow": "text-glow 3s ease-in-out infinite alternate",
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
        glitch: "glitch 0.5s infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
