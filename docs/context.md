# System Context & Brief: Change Hospitality Redesign

## 1. Project Overview & Target Audience
- **Client:** Change Hospitality (https://www.changehospitality.co.uk/)
- **Business Model:** A premium recruitment agency specializing in temporary and permanent staffing for the hospitality sector (Front of House, Back of House, Events, and Commercial).
- **Key Brand Identity:** Certified B-Corporation (scoring 85.5), over 20 years of experience, highly professional, human-centric, and sustainable.
- **Goal:** Redesign the current web presence to look highly modern, premium, and "fancy," balancing luxury aesthetics with fast page speeds and high accessibility standards (WCAG).
- **Design Reference Concept:** The client likes the premium feel and smooth interactions of "igloo.inc". However, due to hospitality users often browsing on mobile connections and the need for high accessibility, we are avoiding heavy 3D WebGL / canvas engines. Instead, we are aiming to achieve a similar premium effect using rich typography, high-contrast layouts, smooth page transitions, and subtle scroll-driven CSS/GSAP interactions.

---

## 2. Technical Stack & Architecture
- **Framework:** Astro (for high performance and zero-JS static HTML by default).
- **Styling:** Tailwind CSS (for modern utility styling and consistent grids).
- **Deployment Platform:** Vercel.
- **Scroll & Animation Engine:** 
  - **Lenis Smooth Scroll** (to normalize scroll physics across browsers).
  - **GSAP (GreenSock)** + **ScrollTrigger** (for smooth scroll-linked visual events).
- **Interactive UI Primitives:** Radix UI or Headless UI (to ensure custom modals, dropdowns, and search lists are fully accessible and keyboard-navigable out of the box).

---

## 3. Design Tokens & Styling Guide
- **Colors:**
  - `bg-obsidian`: `#0D0D0D` (Primary dark background)
  - `bg-champagne`: `#D4C3B3` (Primary light background / accent)
  - `text-off-white`: `#FBF9F6` (Primary light text)
  - `color-bcorp-green`: `#2E5A44` (Accent color for impact/sustainability)
- **Typography:**
  - Headings: Premium Editorial Serif (e.g., Cormorant Garamond / Ogg or a luxury equivalent).
  - Body/UI elements: Clean Sans-Serif (e.g., Plus Jakarta Sans).

---

## 4. Key Animated Features & Homepage Layout
The homepage must feel fluid and narrative-driven as the user scrolls. Construct the following key sections:

### Section 1: Cinematic Hero
- **UI:** Full-screen header with a muted, high-contrast luxury background video. Overlay a clear navigation bar and a central grid displaying editorial typography with dual split-action buttons ("Seek Talent" vs "Find a Stage").
- **Animation:** On load, use a split-text reveal for headings. On scroll down, scale down the hero elements (`scale: 1` to `scale: 0.95`) and fade them out, while using a parallax drift on the background video.

### Section 2: Core Philosophy (The Reveal)
- **UI:** A centered block of large, clean display typography on an obsidian background.
- **Animation:** GSAP ScrollTrigger pinning section in place. Words should start at `opacity: 0.15` and progressively "paint" to full opacity (`opacity: 1`) word-by-word as the user scrolls.

### Section 3: Division Split (Pin & Slide)
- **UI:** A sticky split layout. On the left: minimal details on the recruitment divisions (FOH, BOH, Events). On the right: a container showing corresponding high-end imagery.
- **Animation:** Pin the section for 300vh of scroll progress. As the user scrolls, transition between images using a clean CSS/SVG mask/clip-path wipe, and transition the active navigation text on the left to match.

### Section 4: B-Corp Impact Tracker
- **UI:** Minimalist grid layout showcasing their certified 85.5 score and Ecologi accomplishments.
- **Animation:** When scrolled into view, trigger a GSAP count-up from zero to the target numbers. SVG graphic paths should draw themselves using stroke-dashoffset transitions.

### Section 5: Dynamic "Live Opportunities" Stream
- **UI:** A horizontal slider/carousel of available jobs. On desktop, this utilizes a custom drag interaction.
- **Animation:** The custom cursor transforms into a floating "Drag" or "View" bubble when hovering over the carousel. Cards should subtly scale up (`scale: 1.03`) and highlight on hover.

### Section 6: Testimonials Card Stack
- **UI:** Asymmetrical layout with an editorial quote on the left and client testimonial cards on the right.
- **Animation:** Cards should stack and shift visually, sliding over one another as the user scrolls to simulate a physical deck of cards.

### Section 7: Contrast Inversion Footer
- **UI:** The final conversion section leading into the footer.
- **Animation:** As the user scrolls into this section, trigger a global GSAP ScrollTrigger that smoothly shifts the document background from `#0D0D0D` (Obsidian) to `#D4C3B3` (Champagne Gold), creating a high-contrast visual transition that emphasizes the contact form.

---

## 5. Coding & Performance Constraints
- **Performance First:** Do not load unnecessary JS on static blocks. Keep scripts scoped to interactive components. Use Astro’s selective hydration (`client:visible` or `client:idle`) appropriately.
- **Accessibility (WCAG AA):** Ensure proper contrast ratios, aria-labels for buttons/icons, correct semantic markup (use `<header>`, `<main>`, `<section>`, `<footer>`), and ensure the site remains fully navigable using only keyboard tab/shift-tab inputs.
- **Responsive Animations:** Do not run heavy animation timelines on mobile devices. Use `gsap.matchMedia()` to simplify or scale down motion paths for screens under `1024px` to maintain a smooth experience.