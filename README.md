# Change Hospitality Redesign

Premium Astro website concept for Change Hospitality, focused on editorial luxury, fast static rendering, accessible interactions and Vercel deployment.

## Highlights

- Astro homepage built from reusable sections for hero, philosophy, divisions, impact, opportunities, testimonials, candidate application and footer CTA.
- Tailwind tokens for Obsidian, Champagne, Off-White and B-Corp Green.
- GSAP + ScrollTrigger effects wrapped in responsive `matchMedia()` rules, with simplified mobile motion and reduced-motion support.
- Lenis smooth scrolling for desktop polish.
- Role-specific candidate applications with server-validated CV attachments and consultant email routing.
- Sanity-managed job listings and team profiles, with a standalone Studio in `studio/`.
- Shareable `/jobs/[slug]/` detail routes with assigned consultant contacts and role-specific stepped applications.
- Reusable recruiter staffing brief with accessible multi-select controls, responsive motion and SMTP delivery.
- SEO metadata, Open Graph tags, JSON-LD and sitemap generation.

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local development at `localhost:4321` |
| `npm run build` | Build the production site to `dist/` |
| `npm test` | Run the Vercel function and SMTP configuration tests |
| `npm run preview` | Preview the built site locally |

## Email Flows

The job application form posts multipart data to the Vercel function at `/api/apply`. The function validates the candidate fields and CV, confirms the published job and assigned consultant in Sanity, then sends the application to that consultant with the CV attached. If `APPLICATIONS_INBOX` is configured, it receives a blind copy and acts as a fallback when a consultant has no valid email. CVs are limited to 4 MB so the complete multipart request stays below Vercel's function payload limit.

Job and team content is loaded from the Sanity `production` dataset during each static build. Each published job generates a static `/jobs/[slug]/` page.

The recruiter experience lives at `/recruit-talent/`. Its form posts JSON to `/api/recruit-talent`, which validates and sanitizes the staffing brief before sending it to `RECRUITMENT_INBOX`.

The temporary-work option on `/jobs/` posts candidate details to `/api/temporary-application`. The endpoint validates every field and the selected role list before emailing `TEMP_APPLICATIONS_INBOX`, falling back to `APPLICATIONS_INBOX` when no dedicated temporary-work inbox is configured.

Both functions use the shared Nodemailer transport in `server/mail.js`. They wait for the SMTP server to accept the message before returning success. Set these variables in the Vercel project for Production, Preview and Development as required:

| Variable | Purpose |
| :-- | :-- |
| `SMTP_SERVER` | SMTP hostname supplied by the mail provider |
| `SMTP_PORT` | Usually `587` for STARTTLS or `465` for implicit TLS |
| `SMTP_SECURE` | Optional override; normally `false` for `587` and `true` for `465` |
| `SMTP_LOGIN` | SMTP account username |
| `SMTP_PASSWORD` | SMTP account password or app password |
| `SMTP_FROM` | Verified sender, for example `Change Hospitality <website@example.com>` |
| `RECRUITMENT_INBOX` | Destination for company staffing briefs |
| `APPLICATIONS_INBOX` | Optional archive and fallback destination for job applications |
| `TEMP_APPLICATIONS_INBOX` | Optional dedicated destination for temporary candidate applications; falls back to `APPLICATIONS_INBOX` |

`SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are accepted as aliases for `SMTP_SERVER`, `SMTP_LOGIN` and `SMTP_PASSWORD`. Keep all credentials in Vercel environment variables and never expose them through `PUBLIC_` variables or browser code.

No separate backend application is required for these flows. Files under `api/` are deployed as serverless Vercel functions alongside the static Astro site. A cold start can add latency but does not skip an awaited SMTP operation. An HTTP success means the SMTP server accepted the message; final mailbox delivery still depends on the mail provider, DNS authentication and bounce handling. Configure SPF, DKIM and DMARC for the sender domain, and use port `465` or `587` rather than port `25`.

Astro's local server does not execute root-level Vercel functions. Use `npx vercel dev` to exercise the complete form and SMTP path locally, or deploy a Preview build with Preview environment variables configured. Run the endpoint tests without sending real email using:

```sh
npm test
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

## Franchise Film

The film feature on `/franchising/` is configured by `franchiseFilm` at the top of [src/pages/franchising.astro](src/pages/franchising.astro). Leave `src` empty to show the illustrated "Film coming soon" state. Set `src` to a public, direct MP4 URL to render the native video player; an embed-page URL (YouTube, Vimeo or a dashboard link) will not work in this field.

Set `poster` to a still from the actual film, `captions` to an English WebVTT file and `transcriptUrl` to an accessible transcript page. Provide captions for speech and meaningful sounds, and audio description when essential visual information is not conveyed in the soundtrack. The player preserves the film's aspect ratio inside a stable 16:9 area, supports inline mobile playback, and has no autoplay or video preloading. A poster image is still downloaded when supplied. Real playback and caption timing must be checked after the final assets are available.

For one short, infrequently watched film, use a compressed H.264/AAC MP4 with fast-start metadata on **Cloudflare R2 Standard storage**, exposed through an R2 custom domain. Use 720p or 1080p depending on the footage and aim for roughly 20-40 MB for a short film, checking visual quality rather than imposing a hard size limit. R2 is object storage, not an adaptive streaming/transcoding service; consider Cloudflare Stream or a dedicated video platform if longer films or multiple quality levels become necessary.

1. Create a bucket containing only public website media. Connect a custom domain such as `media.changehospitality.co.uk`; the domain must be in the same Cloudflare account. This does not require moving the Astro deployment away from Vercel. If DNS is managed elsewhere, confirm the supported Cloudflare domain setup before choosing R2. The rate-limited `r2.dev` URL is for development, not production.
2. Upload a versioned MP4, a compressed poster and the caption file. Use `video/mp4`, an appropriate image content type and `text/vtt`, respectively. Configure caching on the media domain and verify byte-range responses so seeking works. Avoid putting large videos in the Git repository or proxying them through a Vercel function.
3. Configure the bucket's CORS policy to allow `GET` and `HEAD` from the production website and required preview/local origins, with `Range` allowed. The player uses anonymous CORS requests for external video and caption files. CORS is not access control for public media. Purge existing cached objects after changing CORS headers.
4. Enter the public URLs in `franchiseFilm`, rebuild/redeploy, and verify playback, seeking, mobile controls and captions. No hosting account or Sanity schema has been provisioned by this change. If editor-managed films are needed later, store the external URL and accompanying metadata in Sanity rather than uploading the video binary there.

Pricing checked on 12 October 2026: [Sanity Free](https://www.sanity.io/pricing) includes 100 GB/month of bandwidth shared across the project; a 40 MB film watched fully 1,000 times is approximately 40 GB before other assets and repeat requests. Low page traffic makes Sanity viable, but it leaves video delivery competing with the rest of the site's quota. [R2 Standard](https://developers.cloudflare.com/r2/pricing/) includes 10 GB-month of storage, 1 million Class A operations and 10 million Class B operations per month, with no internet egress fees. Storage and requests beyond the free allowances, or other connected metered services, can still cost money. Confirm the project's actual Sanity limits and monitor usage before launch.

## Deployment

Deploy to Vercel with the standard Astro build command:

```sh
npm run build
```

The `public/robots.txt` file and Astro sitemap integration use `https://www.changehospitality.co.uk` as the production site URL.
