# Change Hospitality Redesign

Premium Astro website concept for Change Hospitality, focused on editorial luxury, fast static rendering, accessible interactions and Vercel deployment.

## Highlights

- Astro homepage built from reusable sections for hero, philosophy, divisions, impact, opportunities, testimonials, candidate application and footer CTA.
- Tailwind tokens for Obsidian, Champagne, Off-White and B-Corp Green.
- GSAP + ScrollTrigger effects wrapped in responsive `matchMedia()` rules, with simplified mobile motion and reduced-motion support.
- Lenis smooth scrolling for desktop polish.
- Recruiter-page client logos scroll only while the logo strip is in view, pausing off-screen and resuming from the same position. Hover, keyboard focus, the pause control and reduced-motion preferences remain respected. Logo optimisation scales both dimensions together (at most 400px wide, without upscaling), ignores portrait crop/hotspot settings and uses containment to keep the complete artwork. Missing or invalid CMS dimensions are inferred from the source; SVGs stay vector. Partial logos at the strip's outer edges are the intentional scrolling boundary, not cropped source images.
- Role-specific candidate applications with server-validated CV attachments and consultant email routing.
- Sanity-managed job listings, team profiles and environmental impact numbers, with a standalone Studio in `studio/`.
- Team cards retain their hover effects, with direct email/call shortcuts and an accessible sliding biography sheet. Notes scroll inside the card without resizing the grid; Escape or Show less closes the sheet, and reduced-motion preferences disable its animation.
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
| `npm run test:e2e` | Run homepage scroll/reload, franchising and team-card regressions in desktop and mobile Chromium |
| `npm run preview` | Preview the built site locally |

## Email Flows

The job application form posts multipart data to the Vercel function at `/api/apply`. The function validates the candidate fields and CV, confirms the published job and assigned consultant in Sanity, then sends the application to that consultant with the CV attached. If `APPLICATIONS_INBOX` is configured, it receives a blind copy and acts as a fallback when a consultant has no valid email. CVs are limited to 4 MB so the complete multipart request stays below Vercel's function payload limit.

Job and team content is loaded from the Sanity `production` dataset during each static build. Each published job generates a static `/jobs/[slug]/` page.

The **To date** impact numbers on `/sustainability-impact/` also come from published Sanity content at build time. Before the first build, run `npm run seed:impact` in [studio/](studio/) to migrate the existing four figures without overwriting editorial changes. Editors can update values, labels, units, shapes and their order under **Environmental impact**, then publish and rebuild the site. Missing or invalid impact content fails the build rather than falling back to hardcoded numbers. See the [Studio workflow](studio/README.md#environmental-impact-numbers) for setup and deployment.

The `/jobs/` hero uses a compact, keyboard-accessible Permanent / Temporary selector. Permanent mode shows a compact, transparent location and position filter toolbar within Open roles, with a single Search jobs action. Choose Anywhere and Any team to broaden the search again; the no-results state also provides a reset. Temporary mode hides those listings and filters in favour of the temporary-work experience. Filter selections are preserved when switching between modes.

The hero content is vertically centred on larger screens, with content-driven height on mobile. Focused filter fields underline their labels instead of adding a second outer border.

The recruiter experience lives at `/recruit-talent/`. Its form posts JSON to `/api/recruit-talent`, which validates and sanitizes the staffing brief before sending it to `RECRUITMENT_INBOX`. Division separators stay between rows only, leaving the curved transition from Events & Commercial into the staffing form unbroken. The form section has no oversized decorative side capsule.

Run `npx playwright test client-logos.spec.js` for logo aspect ratios, responsive containment, seamless looping, pause controls and reduced-motion scrolling. Run `npx playwright test section-curves.spec.js --grep Recruit` for the staffing-form transition with the last division open and closed.

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

## Jobs Page Gallery

The candidate gallery in [src/components/StoryboardGallery.astro](src/components/StoryboardGallery.astro) uses a borderless photo stack on desktop. Its scroll-scrubbed timeline is created as the section approaches the viewport, pins the section while photos arrive one at a time, then reveals the closing message. Pinning starts at the section's actual top edge, without velocity-based anticipation that can cause an early snap during smooth scrolling. Mobile, short viewports, reduced-motion preferences, printing and browsers without JavaScript use an unpinned photo grid.

The current group photos are **temporary Unsplash placeholders**, not photographs of Change candidates. Replace `galleryItems` with approved candidate/group photos and accurate alt text, then remove the visible photo-preview note and placeholder wording from the list label. Keep the supplied image dimensions and responsive sources aligned with the final photos.

## Loading & Missing Pages

The homepage uses [StoryLoadingScreen.astro](src/components/StoryLoadingScreen.astro) while its opening story assets decode and the scroll timeline initializes. The branded hatching-egg illustration is inline SVG/CSS, with actual asset progress, a reduced-motion treatment and no artificial minimum wait. Scrolling and background controls stay locked until the story and fonts are ready. Other static pages do not incur a loading-screen delay.

The opening story reserves its scroll height in the server-rendered layout so reload restoration can reach the same position before hydration. The canvas is synchronized on ScrollTrigger refresh, and the restored scene is decoded and drawn before the loader releases the page. Reloading within the story or in a section below it therefore preserves both the scroll position and the animation frame without requiring a wheel/touch event. Reduced-motion, failed-asset and JavaScript-disabled views do not reserve pin space.

For browser regression coverage, run `npx playwright install chromium` once, then `npm run test:e2e`. [The reload tests](tests/e2e/home-story-reload.spec.js) check seven positions from the first frame through the footer, compare the position, rendered frame and visible copy before any input, then check that a tiny wheel event does not cause a jump. The suite runs against an existing local server at `127.0.0.1:4321`, or starts and stops one automatically.

If the opening assets fail, or initialization exceeds 15 seconds, the loader releases the page into the readable story with a visible explanation. Pending animation work is cancelled so it cannot later pin the page or move the visitor. JavaScript-disabled visitors see the readable story without a loading overlay.

[404.astro](src/pages/404.astro) generates the static host's `404.html` with a noindex directive. Its main button returns home by default; missing `/jobs/{slug}/` URLs (and the singular `/job/{slug}/` form) instead offer **Explore jobs**. Client-side URL detection handles static hosts that reuse the same 404 document for every missing path.

## Page Illustrations

[HeroIllustration.astro](src/components/HeroIllustration.astro) frames the supplied transparent WebP artwork from [public/illustrations](public/illustrations): `chef.webp` for Jobs, `bart.webp` for Recruit Talent, `salt.webp` for Team, and `plant.webp` for both plants on Sustainability & Impact. Frame coordinates remove empty canvas space without stretching the drawings; update them if the source artwork changes. Jobs uses a larger chef over a smooth, clockwise-tilted citron oval; Team shows the salt-and-pepper artwork without a backdrop or extra marks. The plants retain their deep B Corp green arches, and Recruit Talent retains its blush organic shape. Dashed outlines and small hand-drawn accents on the backed illustrations echo the shared footer.

Fine-pointer desktop visitors get a gently eased mouse-follow effect, limited to 4px horizontally, 3px vertically and one degree of tilt. [PageMotion.astro](src/components/PageMotion.astro) also moves the corner shapes on Jobs, Recruit Talent and Team by at most 6px horizontally and 4px vertically, preserving their existing rotation and scroll motion. Team's other decorative layers use the same reduced movement. All cursor effects reset on pointer exit and are disabled on touch devices, narrow screens and for reduced-motion preferences. Event listeners and pending frames are cleaned up on Astro navigation and preference changes. The images are decorative, have reserved layout space and remain visible without JavaScript; the below-fold plant loads lazily.

Run `npx playwright test hero-illustrations.spec.js` for asset mapping, responsive fit, hover/reset, touch, reduced motion, client navigation and no-JavaScript coverage.

## Shared Buttons

`PrimaryButton` and `SecondaryButton` are named exports from [src/components/Button.tsx](src/components/Button.tsx). Both use Lucide React icons and the original story button's 2px border, rounded shape, 450ms left-to-right colour wipe, slight lift and diagonal icon movement. Their styles live in [src/components/Button.module.css](src/components/Button.module.css), not the global stylesheet.

```astro
---
import { ArrowRight } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../components/Button';
---

<PrimaryButton
  href="/jobs/"
  shadow={false}
  backgroundColor="var(--color-cocoa)"
  textColor="var(--color-cream)"
  hoverBackgroundColor="var(--color-citron)"
  hoverTextColor="var(--color-ink)"
  icon={ArrowRight}
>
  Find work
</PrimaryButton>

<SecondaryButton type="button" data-empty-show-all>
  Show all jobs
</SecondaryButton>
```

Use the same props in React/TSX. Without `href`, either component renders a native button (`type="button"` by default); with `href`, it renders a native link. Native attributes, React event handlers, refs, `aria-*`, `data-*`, `className` and `style` are forwarded. Use `type="submit"` for form submission. Do not add a `client:*` directive in Astro unless React event handlers actually need hydration: these page CTAs render as static HTML, while the existing interactive home story hydrates them as part of its island.

| Prop | Default / behaviour |
| :-- | :-- |
| `backgroundColor` | Primary only; `var(--color-cream)`. Secondary always starts transparent. |
| `hoverBackgroundColor` | `var(--color-blush)` |
| `textColor` / `hoverTextColor` | `var(--color-ink)` |
| `borderColor` | `var(--color-ink)`; also colours the optional shadow and focus ring |
| `shadow` | `true` for Primary, `false` for Secondary |
| `icon` | Lucide `ArrowUpRight`; pass another Lucide component or `null` for no icon |

Choose existing colour tokens with sufficient text contrast for both resting and hover states. Home keeps raised shadows; Jobs, Team and Recruit opt out. The temporary form and Recruit page use cocoa rather than flame behind light button text for AA contrast. “Show all jobs”, the homepage sustainability CTA and Recruit's hero telephone link use the outlined Secondary variant. Keyboard focus triggers the same fill, disabled native buttons skip the effect, and reduced-motion preferences disable spatial motion. Page styles retain only placement or context-specific sizing via `--button-min-height`, `--button-padding`, `--button-gap`, `--button-font-size` and `--button-icon-size`.

Home, Jobs, Team, Recruit and Our Story content CTAs use these components, including Recruit's staffing-brief submit button and Our Story's letter controls. Recruit retains its compact short-viewport button sizing and hides the hero telephone link on small screens as before. The shared footer also uses both button variants. Menu toggles, work-mode switches, pagination, accordion controls, map markers and inline links remain unchanged. Other page-specific global styles are outside this button extraction.

Focused component tests run with `node --experimental-strip-types --test src/lib/buttons.test.js` and are also included in `npm test`.

## Shared Footer

[SiteFooter](src/components/SiteFooter.astro) provides the citron footer on the main website pages, including Franchising and Recruit. It occupies exactly one dynamic viewport in height and the available viewport width, with height-aware type and spacing for short screens. Its rounded top is component-owned, so it also applies without a `brand-footer` wrapper. The lower footer has two vertical columns: large stacked page links on the left (Home, Jobs, Recruit, Team, Our story, Franchising and Sustainability), and policies, Sanity-managed contact/social links, then the smaller logo on the right. The right-hand groups share one left alignment. Policies use two compact columns on desktop and a single column on narrow screens. The original square logo is framed by an SVG viewBox containing the complete wordmark and Hospitality line, rather than an oversized, positioned image. All content remains server-rendered without React hydration. Recruit keeps its existing conversation CTA above the shared footer; Franchising passes `backToTopHref="#franchise-title"` to preserve its return link.

[FooterIllustration](src/components/FooterIllustration.astro) uses the supplied [hand illustration](public/illustrations/hand.webp), with decorative SVG stars and rays. The illustration stays contained inside the original content column; no edge extension or sleeve manipulation is applied. A one-shot intersection observer starts a short star animation only when the footer enters view; it is disconnected on Astro navigation. Hovering the artwork moves the stars smoothly without transforming the image. Link lettering retains its staggered bounce on hover and keyboard focus, without duplicating accessible link names. Reduced motion disables these animations, and all content and links work without JavaScript. Compact policy and contact links retain at least 24px target heights.

Very short viewports reserve room for the floating site navigation and use a single-line footer heading. Below 640px wide and 500px tall, the decorative hand is omitted so the buttons, complete directory, all policies and contact links remain available without overflow.

Run `npx playwright test footer.spec.js` for desktop/mobile coverage of exact viewport dimensions and content bounds from 320px to 1920px (including short portrait and landscape screens), all four policies, shared buttons, complete branding, contrast, keyboard focus, star hover effects, motion preferences, Astro navigation and no-JavaScript use.

## Curved Section Transitions

[SectionCurve.astro](src/components/SectionCurve.astro) brings the shallow, full-width arch from Our Story's `story-next` section to the content section transitions on Team, Recruit and Jobs. Wrap a section in `SectionCurve` and set `backdropColor` to the preceding surface's colour token. The wrapper paints the exposed corners without negative margins or overlapping content; section spacing, anchors and interactive behaviour remain unchanged. Jobs includes the temporary-work benefits, application and FAQ sections; the testimonial backdrop follows the selected work mode, and the gallery follows the active work surface when no testimonials are published. Hero tops stay flat, and their lower decorative capsules are omitted (commented out on Jobs) so they do not end abruptly above the arch. The upper accents remain, with Team's accent kept above the transition on mobile too. Footers are deliberately excluded and retain their original rounded-corner design.

Run `npx playwright test section-curves.spec.js` for desktop/mobile curve geometry, corner colours, responsive overflow and interactive/no-JavaScript coverage.

## Our Story Page

The desktop letter in [src/components/OurStory.astro](src/components/OurStory.astro) uses a `600svh` sticky section, leaving five viewport-heights of scroll travel instead of ten. The typewriter reveal therefore advances twice as fast for the same scroll input. Mobile and short viewports retain their natural, unpinned flow; reduced-motion preferences, printing and no-JavaScript reading retain the complete letter.

All four story content actions use the shared `PrimaryButton` without React hydration. The letter entry keeps its downward arrow, the closing links keep their destinations and colours, and "Read full letter" still exits the animation and focuses the complete letter. The read control stays hidden when the animation is unavailable or has been skipped.

## Team Page

The team page always lists London, Manchester, then Hampshire, using stable office slugs so existing Sanity display-order values and office renames do not change that sequence. Additional active offices follow, sorted by their display order and then name; inactive offices remain hidden.

Profile cards consistently use the cream surface. The Sanity profile label colour controls only the small label over the portrait. Open office panels cycle through mint, flame, blush and citron, never cream. The team page uses a slightly darker, token-derived flame surface with off-white text for AA contrast, including the role badges. Closed panels retain dark text on paper, and the numbered badges keep their own light surface and dark text.

The hero's "Meet the team" link uses the shared `PrimaryButton` with a cocoa face and no shadow, without additional client-side JavaScript.

## Sanity Studio

Sanity Studio is maintained as an independent project in `studio/` and defaults to client project `thyjjqzv`, dataset `production`. Website builds and the application API share configurable project settings; Studio uses corresponding `SANITY_STUDIO_` settings. Editors can manage jobs, profiles, offices, impact figures, testimonials, client logos, public contacts, policy Drive links and temporary-worker guidance. Referenced team members cannot be deleted while jobs still use them.

Portraits and client logos are optimised during the static build and emitted with the deployment, rather than delivered from Sanity to each visitor. Upload limits are 2 MiB for portraits and 250 KiB for logos. Full biographies allow 5,000 characters; unconfirmed contacts are optional. The importer defaults to a no-write dry run and preserves client edits. See [studio/README.md](studio/README.md#client-production-handoff) for access checks, import approval, draft review, verification, webhooks and coordinated cutover.

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

## Illustrated Menu Control

The shared navigation trigger reads "The Menu" inside its original hand-drawn SVG contour, retaining each page's existing colour overrides. On desktop hover or keyboard focus, a citron highlight rises behind the lettering, the letters roll through a masked reveal and a second outline draws around the seal. Opening the existing drawer continuously morphs the same opaque SVG surface into an icon-only close control over 540ms; the icon stays anchored while its strokes become a cross. The existing GSAP dependency interpolates matching path segments inside `matchMedia()`, reversing from the current outline when interrupted. There is no separate close surface to crossfade or swap, and no additional dependency or hydrated island.

Touch devices do not depend on hover. Reduced-motion preferences remove the transitions, SVG tween and letter movement. The control retains its accessible name, expanded state and visible keyboard focus; Escape closes the drawer and returns focus to the trigger. The rotated drawer starts fully beyond the viewport so its decorative shapes cannot flash on screen before its entrance begins.

The drawer's slightly irregular SVG pen line is its outer border, with a cream keyline and no inset frame or drop shadow. The decorative surface clips to the same contour so its colours meet the border. Hover and keyboard focus transition the background and both decorative shapes together through coordinated token-based palettes. Seven equally prominent navigation rows include Franchising; responsive sizing preserves the existing drawer footprint, with internal scrolling on short screens. The current row stays citron with a dark outline and a visible, unrotated "You're here" capsule, including on hover and keyboard focus. On mobile the capsule sits below the label so long page names retain their space. `aria-current` identifies the page (`location` for a parent section on detail pages); directional arrows ease in on hover or keyboard focus. Reduced motion also removes the drawer's entrance delays and palette/arrow transitions.

Run `npm run test:e2e -- menu` for desktop/mobile layout, seven-link navigation, current-page markers, palette separation, hover and focus, open/close interruptions, reduced motion and client-navigation coverage.

## Franchising Page & Film

The franchising page follows Recruit and Our Story's warm brand palette, display typography, illustrations and shared buttons. The original opportunity copy is preserved across four numbered chapters: the sector, the proven model, national relationships and franchisee support. `PageMotion` supplies the same Lenis scrolling, entry reveals and desktop-only layered parallax as the other brand pages. Content stays visible without JavaScript; reduced-motion and print views skip the motion, and mobile layouts are unpinned.

The hero's entrance uses opacity and translation without a clipping mask, so heading descenders, lifted button borders and keyboard focus outlines remain visible.

Run `npm run test:e2e -- franchising` for content preservation, shared CTA destinations and keyboard focus, hero hover/descender clipping, responsive layout, the film's coming-soon state, lazy desktop parallax, reduced motion, client navigation and no-JavaScript coverage.

The film feature on `/franchising/` is configured by `franchiseFilm` at the top of [src/pages/franchising.astro](src/pages/franchising.astro). Leave `src` empty to show the illustrated "Film coming soon" state. Set `src` to a public, direct MP4 URL to render the native video player; an embed-page URL (YouTube, Vimeo or a dashboard link) will not work in this field.

The presentation lives in [src/components/FranchiseFilm.astro](src/components/FranchiseFilm.astro): a rounded cinema frame, branded illustrated poster and editorial caption. The coming-soon state is deliberately not a play button. Once configured, the native player replaces the illustration and an **Open film** link provides direct access to the media.

Set `poster` to a still from the actual film, `captions` to an English WebVTT file and `transcriptUrl` to an accessible transcript page. Provide captions for speech and meaningful sounds, and audio description when essential visual information is not conveyed in the soundtrack. The player preserves the film's aspect ratio inside a stable 16:9 area (the illustrated placeholder uses a taller mobile layout), supports inline mobile playback, and has no autoplay or video preloading. A poster image is still downloaded when supplied. Real playback and caption timing must be checked after the final assets are available.

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
