# Change Hospitality Redesign

Premium Astro website concept for Change Hospitality, focused on editorial luxury, fast static rendering, accessible interactions and Vercel deployment.

## Highlights

- Astro homepage built from reusable sections for hero, philosophy, divisions, impact, opportunities, testimonials, candidate application and footer CTA.
- Tailwind tokens for Obsidian, Champagne, Off-White and B-Corp Green.
- GSAP + ScrollTrigger effects wrapped in responsive `matchMedia()` rules, with simplified mobile motion and reduced-motion support.
- Lenis smooth scrolling for desktop polish.
- Mock candidate profile upload flow with resume validation and a Vercel `/api/apply` function stub ready for real email integration.
- Sanity-managed job listings and team profiles, with a standalone Studio in `studio/`.
- Shareable `/jobs/[slug]/` detail routes with assigned consultant contacts and role-specific stepped applications.
- Reusable recruiter staffing brief with accessible multi-select controls, responsive motion and a production Resend email function.
- SEO metadata, Open Graph tags, JSON-LD and sitemap generation.

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local development at `localhost:4321` |
| `npm run build` | Build the production site to `dist/` |
| `npm run preview` | Preview the built site locally |

## Mock Application Flow

The candidate forms post to `/api/apply`. Role-specific applications include `jobId`, `jobSlug`, `role`, `position`, `jobLocation` and `consultantId` alongside the candidate fields and CV. In local Astro development, the client uses a mock response because the Astro server does not execute root-level Vercel functions. On Vercel, `api/apply.js` returns a mock success response and includes commented production email logic for parsing multipart data, validating the resume and routing the application to the assigned consultant.

Job and team content is loaded from the Sanity `production` dataset during each static build. Each published job generates a static `/jobs/[slug]/` page.

Before going live, wire the function to a real email provider and move inbox credentials into Vercel environment variables.

The mock handler contract can be checked with:

```sh
node --test api/apply.test.js
```

## Sanity Studio

Sanity Studio is maintained as an independent project in `studio/` and is configured for project `3z2hqf8g`, dataset `production`. Editors can create, publish, update and remove jobs and team members there. A job must reference a team member, so Sanity will prevent deleting a team member while a published job still uses them.

Install and run the Studio locally:

```sh
cd studio
npm install
npm run dev
```

Deploy it on Sanity hosting after authenticating with an administrator account:

```sh
cd studio
npm run deploy
```

The deployed `*.sanity.studio` URL uses Sanity login and project roles. Uploaded team portraits are preferred; the external portrait URL field remains available for the imported starter content.

Because the site is statically generated, publishing in Studio requires a new Vercel deployment before the public pages change. Configure a Vercel Deploy Hook and a Sanity webhook for document creates, updates and deletes on `job` and `consultant` documents.

## Recruit Talent Email Flow

The recruiter experience lives at `/recruit-talent/`. Its reusable form posts JSON to the Vercel function at `/api/recruit-talent`, which validates and sanitizes the staffing brief before emailing the recruitment team through Resend.

Configure these variables in the Vercel project for Production, Preview and Development as required:

| Variable | Purpose |
| :-- | :-- |
| `RESEND_API_KEY` | Resend API key with permission to send from the verified domain |
| `RECRUITMENT_INBOX` | Private destination address for new staffing briefs |
| `RECRUITMENT_FROM_EMAIL` | Verified sender, for example `Change Hospitality <website@example.com>` |

No separate backend application is required for this volume: `api/recruit-talent.js` is deployed as a serverless function alongside the static Astro site. Keep the API key and inbox in Vercel environment variables, never in browser code.

Astro's local dev server serves the form UI but does not execute root-level Vercel functions. Use `vercel dev` when testing the complete local email path, or deploy a Preview build with the Development/Preview variables configured. The API behavior itself can be checked without sending email:

```sh
node --test api/recruit-talent.test.js
```

## Deployment

Deploy to Vercel with the standard Astro build command:

```sh
npm run build
```

The `public/robots.txt` file and Astro sitemap integration use `https://www.changehospitality.co.uk` as the production site URL.
