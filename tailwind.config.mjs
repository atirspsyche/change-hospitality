/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0D0D',
        champagne: '#D4C3B3',
        'off-white': '#FBF9F6',
        'bcorp-green': '#2E5A44',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        champagne: '0 24px 80px rgba(212, 195, 179, 0.16)',
      },
    },
  },
};