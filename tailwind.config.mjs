/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        obsidian: 'var(--color-obsidian)',
        champagne: 'var(--color-champagne)',
        'off-white': 'var(--color-off-white)',
        'bcorp-green': 'var(--color-bcorp-green)',
        'story-pink': 'var(--color-story-pink)',
        'story-blue': 'var(--color-story-blue)',
        'story-black': 'var(--color-story-black)',
        'story-lime': 'var(--color-story-lime)',
        'story-pale': 'var(--color-story-pale)',
      },
      fontFamily: {
        serif: 'var(--font-serif)',
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
      },
      boxShadow: {
        champagne: '0 24px 80px color-mix(in srgb, var(--color-champagne) 16%, transparent)',
      },
    },
  },
};