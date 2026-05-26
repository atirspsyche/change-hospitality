# GitHub Copilot Instructions — Change Hospitality Redesign

## Project Overview

A premium hospitality recruitment agency website redesign for **Change Hospitality** (https://www.changehospitality.co.uk/). The site must feel luxury, editorial, and human-centric while maintaining fast performance and WCAG AA accessibility.

---

## Technical Stack

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Framework     | **Astro** (static-first, zero-JS by default)       |
| Styling       | **Tailwind CSS**                                   |
| Scroll        | **Lenis Smooth Scroll**                            |
| Animation     | **GSAP + ScrollTrigger**                           |
| UI Primitives | **Radix UI** or **Headless UI** (fully accessible) |
| Deployment    | **Vercel**                                         |

---

## Design Tokens

Always use these CSS custom properties / Tailwind class names — never hardcode raw hex values:

| Token               | Value     | Usage                                 |
| ------------------- | --------- | ------------------------------------- |
| `bg-obsidian`       | `#0D0D0D` | Primary dark background               |
| `bg-champagne`      | `#D4C3B3` | Light background / primary accent     |
| `text-off-white`    | `#FBF9F6` | Primary light text                    |
| `color-bcorp-green` | `#2E5A44` | Sustainability / impact sections only |

### Typography

- **Headings:** Cormorant Garamond (or equivalent luxury editorial serif). Use `font-serif`.
- **Body / UI:** Plus Jakarta Sans. Use `font-sans`.
- Display headings should use wide line heights (`leading-tight` to `leading-none` depending on scale).

---

## Page Sections & Animation Contracts

When implementing or modifying any homepage section, follow these contracts exactly.

### Section 1 — Cinematic Hero

- Full-viewport `<section class="relative h-screen w-full overflow-hidden bg-obsidian">`.
- Muted ambient background `<video>` at `opacity: 0.4`.
- Gradient overlay: `bg-gradient-to-t from-obsidian via-transparent to-obsidian/50`.
- Dual CTA buttons: **"Find Talent"** and **"Find Work"** — minimal, split-style.
- **Load animation:** Split-text reveal (lines/words slide up via `clip-path`), video fades from 0 → 0.4 over 1.5s.
- **Scroll animation:** Hero scales `1 → 0.95` and fades out; video drifts upward `yPercent: 30` (parallax).

### Section 2 — Philosophy Reveal

- Centered display typography at `text-3xl md:text-5xl`, wide line height.
- Background: `bg-obsidian`.
- **Animation:** GSAP ScrollTrigger with `scrub: true` + pinning. Words start at `opacity: 0.15` and paint word-by-word to `opacity: 1` as the user scrolls. Forces slow, deliberate reading.

### Section 3 — Division Split (Pin & Slide)

- Wrapper height: `300vh` to allow scroll-scrubbing.
- Inner element: `sticky top-0 h-screen flex flex-col md:flex-row overflow-hidden`.
- **Left panel:** Text for three divisions — Front of House, Back of House, Events & Commercial. Active item scales up slightly and transitions color from muted grey → Champagne Gold.
- **Right panel:** Three absolute-positioned image layers with `clip-path` wipe transitions (vertical or diagonal).
- **Animation:** GSAP pinning for the full `300vh`. Clip-path and left-side cross-fade driven by scroll progress.

### Section 4 — B-Corp Impact Tracker

- Grid layout with B-Corp seal, score (`85.5`), and environmental stats (`20,000+ trees`).
- Background: `bg-obsidian` with `border-t border-b border-white/10`.
- **Animation:** Count-up from 0 to target values via GSAP ticker, triggered when section is `20%` in view. SVG outlines draw via `stroke-dashoffset` animation.

### Section 5 — Live Opportunities Stream

- Horizontal draggable/swipeable job card slider. Use `client:visible` hydration for the interactive component.
- Cards display: Role, Location, Salary, Type.
- **Hover:** Cards scale to `1.03`; accent background slides up from bottom using `cubic-bezier(0.25, 1, 0.5, 1)`.
- **Custom cursor:** On carousel hover, inject a floating Champagne Gold bubble cursor reading "Drag to Explore".

### Section 6 — Testimonials Card Stack

- Asymmetrical layout: large quote left, client detail cards right.
- **Animation:** Cards stack vertically. On scroll, each card slides upward covering the previous, scaling down slightly for depth. Use GSAP pinning.

### Section 7 — Contrast Inversion CTA / Footer

- Section background: `bg-champagne text-obsidian`.
- **Animation:** As this section enters the viewport, GSAP ScrollTrigger animates `document.body` (or root wrapper) background from `#0D0D0D` → `#D4C3B3`. This is a global color shift — not just the section.

---

## Coding Rules

### Performance

- Default to zero client JS. Only hydrate interactive components using Astro's `client:visible` or `client:idle` directives.
- Never load GSAP timelines eagerly for off-screen sections — use `ScrollTrigger` to initialize them on entry.

### Animations & Responsiveness

- All GSAP timelines **must** be wrapped in `gsap.matchMedia()`.
- On screens **< 1024px**: simplify or disable heavy scroll-linked animations. Reduce parallax, skip pinning where possible.
- Never autoplay video on mobile without `playsinline muted autoplay` attributes set.

### Accessibility (WCAG AA)

- Use semantic HTML: `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`, `<article>`.
- All interactive elements require `aria-label` or visible text labels.
- Contrast ratios must meet WCAG AA minimums — test Champagne Gold on Obsidian and Off-White on Obsidian.
- The site must be **fully keyboard-navigable** (tab / shift-tab through all interactive controls).
- Use Radix UI or Headless UI primitives for modals, dropdowns, and any custom interactive patterns to inherit built-in accessibility behaviours.

### Astro Conventions

- Co-locate component styles using `<style>` blocks scoped to the component.
- Global tokens and base styles go in a single `src/styles/global.css` imported in the root layout.
- Use Astro layout files (`src/layouts/`) for shared page shells.
- Page-level components live in `src/pages/`; reusable UI components in `src/components/`.

### Tailwind Conventions

- Extend `tailwind.config.*` to register `obsidian`, `champagne`, `off-white`, and `bcorp-green` as named color tokens.
- Never use arbitrary `[#hex]` values — always reference the named token.
- Use `@layer components` for any repeated multi-class patterns rather than duplicating utility strings.

---

## Brand & Content Guardrails

- The brand voice is **premium, human, and trustworthy** — not corporate or algorithmic.
- B-Corp credentials and sustainability stats must only appear styled in `bcorp-green` — do not use this colour elsewhere.
- Copy should reference Change Hospitality's 20+ year history and face-to-face relationship model where appropriate.
- The three core divisions are always named: **Front of House**, **Back of House**, **Events & Commercial**.
