# Change Hospitality Redesign

Premium Astro website concept for Change Hospitality, focused on editorial luxury, fast static rendering, accessible interactions and Vercel deployment.

## Highlights

- Astro homepage built from reusable sections for hero, philosophy, divisions, impact, opportunities, testimonials, candidate application and footer CTA.
- Tailwind tokens for Obsidian, Champagne, Off-White and B-Corp Green.
- GSAP + ScrollTrigger effects wrapped in responsive `matchMedia()` rules, with simplified mobile motion and reduced-motion support.
- Lenis smooth scrolling for desktop polish.
- Mock candidate profile upload flow with resume validation and a Vercel `/api/apply` function stub ready for real email integration.
- SEO metadata, Open Graph tags, JSON-LD and sitemap generation.

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local development at `localhost:4321` |
| `npm run build` | Build the production site to `dist/` |
| `npm run preview` | Preview the built site locally |

## Mock Application Flow

The candidate form posts to `/api/apply`. In local Astro development, the client gracefully falls back to a mock response if that Vercel function is unavailable. On Vercel, `api/apply.js` returns a mock success response and includes commented production email logic for parsing multipart data, validating the resume and sending the profile to the recruitment inbox.

Before going live, wire the function to a real email provider and move inbox credentials into Vercel environment variables.

## Deployment

Deploy to Vercel with the standard Astro build command:

```sh
npm run build
```

The `public/robots.txt` file and Astro sitemap integration use `https://www.changehospitality.co.uk` as the production site URL.
