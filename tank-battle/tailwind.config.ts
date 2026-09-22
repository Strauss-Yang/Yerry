import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'battle-bg': '#000000',
        'battle-green': '#4ade80',
        'battle-red': '#f87171',
        'battle-yellow': '#facc15',
        'battle-steel': '#94a3b8',
        'battle-brick': '#b45309',
      }
    },
  },
  plugins: [],
};

export default config;
