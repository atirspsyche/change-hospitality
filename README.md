# Change Hospitality Redesign

Premium Astro website concept for Change Hospitality, focused on editorial luxury, fast static rendering, accessible interactions and Vercel deployment.

## Highlights

- Astro homepage built from reusable sections for hero, philosophy, divisions, impact, opportunities, testimonials, candidate application and footer CTA.
- Tailwind tokens for Obsidian, Champagne, Off-White and B-Corp Green.
- GSAP + ScrollTrigger effects wrapped in responsive `matchMedia()` rules, with simplified mobile motion and reduced-motion support.
- Lenis smooth scrolling for desktop polish. Native CSS smooth scrolling stays disabled while Lenis is active, so GSAP layout refreshes can reset and restore the scroll position synchronously without competing browser animations.
- Recruiter-page client logos use a 210-second loop (20% faster than the previous 252-second loop) and scroll only while the logo strip is in view, pausing off-screen and resuming from the same position. Hover, keyboard focus, the pause control and reduced-motion preferences remain respected. Logo optimisation scales both dimensions together (at most 400px wide, without upscaling), ignores portrait crop/hotspot settings and uses containment to keep the complete artwork. Missing or invalid CMS dimensions are inferred from the source; SVGs stay vector. Partial logos at the strip's outer edges are the intentional scrolling boundary, not cropped source images.
- Role-specific candidate applications with server-validated CV attachments and consultant email routing.
- Sanity-managed job listings, team profiles and environmental impact numbers, with a standalone Studio in `studio/`.
- Team cards retain their hover effects, with direct email/call shortcuts and an accessible sliding biography sheet. Notes scroll inside the card without resizing the grid; Escape or Show less closes the sheet, and reduced-motion preferences disable its animation.
- Team offices fetch their member data once at build time and render eight cards per page in a single `client:visible` island per office. Off-page cards and portraits stay out of the live DOM; each office remembers its page when reopening. The themed controls support keyboard navigation, screen-reader range announcements and a compact mobile layout. Remaining profiles are available without JavaScript.
- Shareable `/jobs/[slug]/` detail routes with assigned consultant contacts and role-specific stepped applications.
- Reusable recruiter staffing brief with accessible multi-select controls, responsive motion and SMTP delivery.
- SEO metadata, Open Graph tags, JSON-LD and sitemap generation.
- The Our Story letter is followed by five Sanity-managed, scrapbook-style Instagram cards with recognisable decorative social icons, full uncropped artwork and accessible external links. Images, descriptions, captions, order and optional post/reel URLs are editable under **Our story Instagram**. The hero uses the supplied chick, trimmed and rotated upright, without the former pan. See the [Instagram editing workflow](studio/README.md#our-story-instagram).

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local development at `localhost:4321` |
| `npm run build` | Build the production site to `dist/` |
| `npm test` | Run the Vercel function and SMTP configuration tests |
| `npm run test:e2e` | Run desktop/mobile Chromium regressions and WebKit dropdown scroll checks |
| `npm run preview` | Preview the built site locally |

Install the test browsers with `npx playwright install chromium webkit`. Run `npx playwright test dropdown-scroll.spec.js` for frame-by-frame scroll-position checks when opening and closing job FAQs and recruiter dropdowns, including navigation from the homepage, keyboard input, reduced motion and disabled JavaScript. The WebKit project is scoped to this suite; the other suites continue to use Chromium. Confirm Safari-specific reports on the affected macOS Safari version as well.

## Email Flows

The job application form posts multipart data to the Vercel function at `/api/apply`. The function validates the candidate fields and CV, confirms the published job and assigned consultant in Sanity, then sends the application to that consultant with the CV attached. If `APPLICATIONS_INBOX` is configured, it receives a blind copy and acts as a fallback when a consultant has no valid email. CVs are limited to 4 MB so the complete multipart request stays below Vercel's function payload limit.

Job and team content is loaded from the Sanity `production` dataset during each static build. Each published job generates a static `/jobs/[slug]/` page.

The **To date** impact numbers on `/sustainability-impact/` also come from published Sanity content at build time. Before the first build, run `npm run seed:impact` in [studio/](studio/) to migrate the existing four figures without overwriting editorial changes. Editors can update values, labels, units, shapes and their order under **Environmental impact**, then publish and rebuild the site. Missing or invalid impact content fails the build rather than falling back to hardcoded numbers. See the [Studio workflow](studio/README.md#environmental-impact-numbers) for setup and deployment.

### Sustainability artwork

Certification and partner logos, including the supplied B Corp mark, are local assets in [public/client-logos/sustainability-logo/](public/client-logos/sustainability-logo/). [EnvironmentalPolicy.astro](src/components/EnvironmentalPolicy.astro) reuses the same B Corp artwork in the hero, partner list and certifications, with real ISO 14001 and ISO 9001 logos. The Social Impact cards reuse the Living Wage, The Good Apple Effect and Beyond Food logos instead of illustrations. Desktop cards share logo and text rows, aligning their tops, bottoms and copy; tablet and mobile cards remain stacked. Social logos are top-aligned in matching frames without decorative parallax. Logo dimensions match their source files; portrait and wide marks have separate sizing and use containment rather than cropping or recolouring.

The three certification photos in [sustainability-pics/](public/client-logos/sustainability-logo/sustainability-pics/) retain their full landscape, square and portrait compositions. Larger frames form a three-column desktop gallery, two columns on tablet and one on mobile. Images have explicit dimensions, descriptive alt text and lazy loading. These media changes require a website rebuild, not a Sanity migration or Studio deployment; the published impact figures remain unchanged. Run `npx playwright test sustainability.spec.js` for responsive artwork and certification-gallery checks.

The `/jobs/` hero uses a compact, keyboard-accessible Permanent / Temporary selector. Permanent mode shows a compact, transparent location and position filter toolbar within Open roles, with a single Search jobs action. Choose Anywhere and Any team to broaden the search again; the no-results state also provides a reset. Temporary mode hides those listings and filters in favour of the temporary-work experience. Filter selections are preserved when switching between modes.

The hero content is vertically centred on larger screens, with content-driven height on mobile. Focused filter fields underline their labels instead of adding a second outer border.

The recruiter experience lives at `/recruit-talent/`. Its form posts JSON to `/api/recruit-talent`, which validates and sanitizes the staffing brief before sending it to `RECRUITMENT_INBOX`. Division separators stay between rows only, leaving the curved transition from Events & Commercial into the staffing form unbroken. The form section has no oversized decorative side capsule.

Directly below the staffing form, [RecruitmentFAQs.astro](src/components/RecruitmentFAQs.astro) presents five recruitment FAQs in the footer's playful cream, citron and cocoa style. Native HTML disclosures keep every question and answer as server-rendered text, support keyboard controls and work without JavaScript. Answers open independently with a smooth CSS height transition and a gentle fade/slide in browsers supporting `interpolate-size` and `::details-content`; other browsers retain instant native toggles. Reduced-motion preferences disable the expansion, hover and toggle transitions. Run `npx playwright test recruitment-faqs.spec.js` for exact-copy, placement, interaction, responsive and contrast checks.

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

The photos come from the published **Candidate gallery** singleton in Sanity. Editors can replace photos, edit descriptive alt text and drag to reorder up to six images. The current selection is `09`, `10`, `11`, `04`, `08`, `02`: individual service moments, venue teams, bartending and a team celebration. The second and third slots retain their original item keys after replacing `03` with `10` and `07` with `11`. Descriptions do not invent candidate names, employers or placement outcomes. Missing or invalid gallery content fails the build instead of showing placeholder photos.

Astro downloads the sources at build time and produces local, hashed, responsive WebP assets (quality 75, up to 1280px, without upscaling), respecting Sanity crop/hotspot settings. Visitors never download gallery images from Sanity. Vercel serves `/_astro/` assets with a one-year immutable browser cache; unchanged images can be reused on repeat visits. Build downloads and Studio previews still consume Sanity bandwidth.

Image markup stays inside inert templates until needed, so browser-native lazy-loading heuristics cannot download the whole hidden desktop stack. An IntersectionObserver starts loading within 200px of the viewport: desktop loads the first photo and one ahead, then the scroll timeline loads the current/next photo; the mobile/reduced-motion grid loads individual cards as they approach. Unvisited photos are not fetched. Native lazy-loaded `noscript` images preserve the gallery without JavaScript. Print loads all photos. Low-priority, asynchronously decoded images retain reserved 4:3 space; failures show an explicit message.

Run `npx playwright test candidate-gallery.spec.js` for deferred requests, staged desktop/mobile loading, responsive sources, mode/preference changes and no-JavaScript coverage. See [Studio setup](studio/README.md#candidate-gallery) for the safe initial upload, publishing and rebuild workflow.

## Loading & Missing Pages

The homepage uses [StoryLoadingScreen.astro](src/components/StoryLoadingScreen.astro) while its opening story assets decode and the scroll timeline initializes. The branded hatching-egg illustration is inline SVG/CSS, with actual asset progress, a reduced-motion treatment and no artificial minimum wait. Scrolling and background controls stay locked until the story and fonts are ready. Other static pages do not incur a loading-screen delay.

The top-left header and loading screen share [SiteLogo.astro](src/components/SiteLogo.astro), using the supplied [new logo](public/new-change-logo.svg). Its SVG viewBox removes the source artboard's transparent margins without clipping the wordmark or B Corp seal. The header retains its large 208px desktop width and the artwork's natural aspect ratio, scaling down only to keep the mobile menu reachable. Keyboard focus, hover motion and reduced-motion behaviour are preserved.

The opening story reserves its scroll height in the server-rendered layout so reload restoration can reach the same position before hydration. The canvas is synchronized on ScrollTrigger refresh, and the restored scene is decoded and drawn before the loader releases the page. Reloading within the story or in a section below it therefore preserves both the scroll position and the animation frame without requiring a wheel/touch event. Reduced-motion, failed-asset and JavaScript-disabled views do not reserve pin space.

The `plate-center-next` beat pairs franchising copy and its CTA with [FranchiseMap](src/components/FranchiseMap.tsx). Desktop copy and artwork align to the outer story gutters, leaving the centre clear for the plate even on wide displays; portrait-tablet layouts stack them. On phones, the map replaces the plate in the illustration area, with three separate 44px office controls and contained popovers. The supplied [map illustration](public/illustrations/map.webp) is cropped to its artwork and rotated clockwise in SVG without altering the source image. London (head office), Greater Manchester and Hampshire & Isle of Wight markers use the footer's warm palette and hand-drawn accents; hover previews an office card, while tap or Enter/Space toggles its Headless UI popover. Escape and outside clicks dismiss opened cards. Office names, head-office status, addresses and clickable phone numbers come from the existing published **Locations** records in Sanity at build time; [franchiseLocations.ts](src/data/franchiseLocations.ts) retains only stable office IDs, map coordinates and validation. Missing contact details fail the build rather than displaying placeholders. The homepage, reusable `client:visible` Astro wrapper, reduced-motion and failed-story views share that data; the no-JavaScript directory includes the same addresses and call links. The franchising page's office list uses the same published names. See the [Studio office workflow](studio/README.md#office-contact-details) for the guarded initial update and later editorial changes.

The supplied [new logo](public/new-change-logo.svg) is printed into the first 13 opening frames. **Specialists in hospitality recruitment and staffing** is also printed directly into frames 16–58 of the [carton sequence](public/story_sequence/), from the first visible inside-lid surface until the lettering moves out of view. Its perspective, scale and position follow the lid, including reverse scrolling and the fully open hold; there is no detached desktop text reveal. The print uses Clash Display and the named `carton-ink` grey sampled from the carton tagline, with at least 3:1 contrast for its large lettering. Asset dimensions, frame count and story pacing are unchanged, with no new runtime drawing or font dependency. A screen-reader heading preserves the desktop message; mobile chapters, reduced-motion and no-JavaScript views retain readable HTML copy. Replacing these source frames must preserve the printed artwork. The shared sign-off is **We're good eggs** across the loader, footer, story, franchising, missing page and mobile story.

Below 768px, the homepage uses its own eight-chapter timeline: heading above, reframed landscape artwork in the middle, and supporting copy and action below. Business/job-seeker and team/values messages appear sequentially; desktop and portrait-tablet beats are unchanged. Uniform camera transforms preserve the existing assets and leave the final cutlery outside the plate. The pin uses `100svh`, notch and home-indicator safe-area insets, and refreshes when its height changes, keeping actions above expanded browser toolbars. Screens shorter than 480px, insufficient content space and enlarged text use the readable story instead of clipped controls; short touch-device landscape widths below 1024px follow the same policy.

For browser regression coverage, run `npx playwright install chromium` once, then `npm run test:e2e`. [The reload tests](tests/e2e/home-story-reload.spec.js) compare scroll position, rendered frames and visible copy before any input, then check that a tiny wheel event does not cause a jump. They also cover all mobile chapters at 320px, 375px, 390px and 430px, text contrast, touch and keyboard use, browser-toolbar and notch emulation, breakpoint changes, reduced motion and readable fallbacks. Pixel references use the renderer's ImageBitmap decoder, and seeking uses the pin's actual rounded scroll distance. The suite runs against an existing local server at `127.0.0.1:4321`, or starts and stops one automatically.

If the opening assets fail, or initialization exceeds 15 seconds, the loader releases the page into the readable story with a visible explanation. Pending animation work is cancelled so it cannot later pin the page or move the visitor. JavaScript-disabled visitors see the readable story without a loading overlay.

[404.astro](src/pages/404.astro) generates the static host's `404.html` with a noindex directive. Its main button returns home by default; missing `/jobs/{slug}/` URLs (and the singular `/job/{slug}/` form) instead offer **Explore jobs**. Client-side URL detection handles static hosts that reuse the same 404 document for every missing path.

## Page Illustrations

[HeroIllustration.astro](src/components/HeroIllustration.astro) frames the supplied transparent WebP artwork from [public/illustrations](public/illustrations): `chef.webp` for Jobs, `bart.webp` for Recruit Talent, `salt.webp` for Team, and `plant.webp` for the Sustainability & Impact hero. Below the fold, Recruitment FAQs uses `case.webp`, the Franchising partnership uses `pipo.webp`, and the environmental impact header uses `plant2.webp`. Frame coordinates remove empty canvas space without stretching the drawings; update them if the source artwork changes. These three below-fold illustrations rotate 90 degrees clockwise to stand upright and have no backdrop or extra marks. Jobs uses a larger chef over a smooth, clockwise-tilted citron oval; Team also shows its artwork without a backdrop or extra marks. The sustainability hero retains its deep B Corp green arch, and Recruit Talent retains its blush organic shape. Dashed outlines and small hand-drawn accents on the backed illustrations echo the shared footer.

Fine-pointer desktop visitors get a gently eased mouse-follow effect, limited to 4px horizontally, 3px vertically and one degree of tilt. [PageMotion.astro](src/components/PageMotion.astro) also moves the corner shapes on Jobs, Recruit Talent and Team by at most 6px horizontally and 4px vertically, preserving their existing rotation and scroll motion. Team's other decorative layers use the same reduced movement. All cursor effects reset on pointer exit and are disabled on touch devices, narrow screens and for reduced-motion preferences. Event listeners and pending frames are cleaned up on Astro navigation and preference changes. The images are decorative, have reserved layout space and remain available without JavaScript; all three below-fold illustrations use native `loading="lazy"` and asynchronous decoding. The environmental sprout remains hidden at widths of 600px and below.

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

## Policy Pages

Footer policy links open internal `/policies/<slug>/` pages in the same tab instead of the original PDFs. [PolicyContent](src/components/PolicyContent.astro) supplies the shared colour cover and readable policy body; [the policy route](src/pages/policies/[slug].astro) generates one static page for every visible, published Sanity `policy`. The four initial themes are mist/ink (Data Protection), B-Corp green/cream (Environmental), cocoa/cream (Equality) and citron/cocoa (Modern Slavery).

Each document has an editable footer label, title, slug, SEO description, named colour theme and plain Markdown body. Markdown is rendered and sanitised at build time with Astro's Markdown processor; raw HTML is disabled. Headings, paragraphs, nested lists, continuation numbering, bold text and links are present in the initial HTML without client hydration. The page title is separate from the body, which should start section headings at `##`. Canonical URLs, social metadata, WebPage structured data and sitemap entries are generated for these pages.

Footer links and policy covers/titles share Astro transition names, using the same opening mechanism as job cards and detail pages. The current policy's footer link omits the matching name to avoid duplicate transition elements. Normal links remain functional without JavaScript, and Astro respects reduced-motion preferences. The fixed navigation stays transparent with a neutral cream/cocoa menu control. The logo is light over dark policy covers and returns to dark over the cream article; an intersection observer keeps that contrast in sync with scrolling and Astro navigation.

Run the safe migration described in [the Studio policy workflow](studio/README.md#policy-pages) before building against existing PDF-only records. Missing or invalid published content fails the build explicitly rather than hiding policies or falling back to PDFs. Original Google Drive URLs remain optional Studio references and are not used for website navigation. Supplied legal wording is preserved; the Data Protection Act 1998 references and access-fee wording need client legal review before launch.

Focused checks: `node --experimental-strip-types --test src/lib/policies.test.js` and `npx playwright test policy-pages.spec.js`.

## Curved Section Transitions

[SectionCurve.astro](src/components/SectionCurve.astro) brings the shallow, full-width arch from Our Story's `story-next` section to the content section transitions on Team, Recruit and Jobs. Wrap a section in `SectionCurve` and set `backdropColor` to the preceding surface's colour token. The wrapper paints the exposed corners without negative margins or overlapping content; section spacing, anchors and interactive behaviour remain unchanged. Jobs includes the temporary-work benefits, application and FAQ sections; the testimonial backdrop follows the selected work mode, and the gallery follows the active work surface when no testimonials are published. Hero tops stay flat, and their lower decorative capsules are omitted (commented out on Jobs) so they do not end abruptly above the arch. The upper accents remain, with Team's accent kept above the transition on mobile too. Footers are deliberately excluded and retain their original rounded-corner design.

Run `npx playwright test section-curves.spec.js` for desktop/mobile curve geometry, corner colours, responsive overflow and interactive/no-JavaScript coverage.

## Our Story Page

The desktop letter in [src/components/OurStory.astro](src/components/OurStory.astro) uses a `600svh` sticky section, leaving five viewport-heights of scroll travel instead of ten. The typewriter reveal therefore advances twice as fast for the same scroll input. Mobile and short viewports retain their natural, unpinned flow; reduced-motion preferences, printing and no-JavaScript reading retain the complete letter.

All four story content actions use the shared `PrimaryButton` without React hydration. The letter entry keeps its downward arrow, the closing links keep their destinations and colours, and "Read full letter" still exits the animation and focuses the complete letter. The read control stays hidden when the animation is unavailable or has been skipped.

## Team Page

The team page always lists London, Manchester, then Hampshire, using stable office slugs so existing Sanity display-order values and office renames do not change that sequence. Additional active offices follow, sorted by their display order and then name; inactive offices remain hidden.

Within each office, profiles follow **Locations > office > Team display order** in Sanity. Editors add references to published members from that office and drag leadership to the top; the selected order is applied before the eight-person pagination. New or unlisted members remain visible at the end alphabetically. Offices without a list retain alphabetical display. Initialize existing rosters with the dry-run-first `npm --prefix studio run seed:team-order` workflow in [studio/README.md](studio/README.md#team-display-order).

Profile cards consistently use the cream surface. The Sanity profile label colour controls only the small label over the portrait. Open office panels cycle through mint, flame, blush and citron, never cream. The team page uses a slightly darker, token-derived flame surface with off-white text for AA contrast, including the role badges. Closed panels retain dark text on paper, and the numbered badges keep their own light surface and dark text.

Profile names use card-relative font-size caps and wrap between words rather than splitting surnames. The shared card styles apply to both the front and biography heading, including the no-JavaScript profiles; names in Sanity stay unchanged.

The hero's "Meet the team" link uses the shared `PrimaryButton` with a cocoa face and no shadow, without additional client-side JavaScript.

## Sanity Studio

Sanity Studio is maintained as an independent project in `studio/` and defaults to client project `thyjjqzv`, dataset `production`. Website builds and the application API share configurable project settings; Studio uses corresponding `SANITY_STUDIO_` settings. Editors can manage jobs, profiles, offices, impact figures, testimonials, client logos, public contacts, policy Drive links and temporary-worker guidance. Referenced team members cannot be deleted while jobs or office order lists still use them.

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

Because the site is statically generated, publishing in Studio requires a new Vercel deployment before the public pages change. Configure a Vercel Deploy Hook and a Sanity webhook for document creates, updates and deletes on `job`, `consultant` and `location` documents, including published team-order changes.

## Illustrated Menu Control

The shared navigation trigger reads "The Menu" inside its original hand-drawn SVG contour, retaining each page's existing colour overrides. On desktop hover or keyboard focus, a citron highlight rises behind the lettering, the letters roll through a masked reveal and a second outline draws around the seal. Opening the existing drawer continuously morphs the same opaque SVG surface into an icon-only close control over 540ms; the icon stays anchored while its strokes become a cross. The existing GSAP dependency interpolates matching path segments inside `matchMedia()`, reversing from the current outline when interrupted. There is no separate close surface to crossfade or swap, and no additional dependency or hydrated island.

Touch devices do not depend on hover. Reduced-motion preferences remove the transitions, SVG tween and letter movement. The control retains its accessible name, expanded state and visible keyboard focus; Escape closes the drawer and returns focus to the trigger. The rotated drawer starts fully beyond the viewport so its decorative shapes cannot flash on screen before its entrance begins.

The bar hides on downward scrolling past 120px and reveals on upward scrolling, requiring 12px of accumulated movement before changing direction. Idle events and tiny mobile scroll corrections do not change its visibility, and positions are clamped to the document bounds to ignore overscroll. Keyboard focus always reveals the bar. The mobile opening story retains its existing pinned-header treatment.

The shared header/loading logo renders the supplied wordmark as inline vector paths rather than bitmap images inside a filtered SVG. Its crop, dimensions and B-Corp seal placement are unchanged; the seal uses the existing higher-resolution transparent PNG as an alpha mask with a unique ID per logo. Both follow `currentColor` without CSS filters, keeping the lettering sharp on high-density mobile screens and the complete logo readable over light and dark policy covers, including in WebKit.

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
