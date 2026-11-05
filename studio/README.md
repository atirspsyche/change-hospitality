# Change Hospitality Studio

Standalone Sanity Studio for client project `thyjjqzv` and the `production` dataset.

Hosted Studio: [Change Hospitality Studio](https://change-hospitality.sanity.studio/). Sign in with a Sanity account that is a member of the client project.

## Client Production Handoff

The website build and application API share `SANITY_PROJECT_ID` and `SANITY_DATASET`; Studio and its CLI use `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`. Defaults point to the client project. Examples are provided in each package's `.env.example`. Project identifiers are public, not login credentials. Keep write tokens and SMTP/deploy-hook secrets outside source control and public content.

First verify access with `npx sanity projects list` from this directory. The signed-in account must have write permission on `thyjjqzv`. Authenticate through `npx sanity login` locally when needed; never send credentials through chat. The CLI defaults to the client Studio deployment ID; `SANITY_STUDIO_APP_ID` is an optional override. The old Studio deployment ID is not reused. Automatic Studio package updates are disabled so deployments use the repository's installed versions.

### Import Approved Real Content

From the repository root, `npm --prefix studio run import:content` is a **dry run**. It validates `temp/team-members.md`, all named portraits and existing logo files, and performs no writes. Originals under `temp/` are intentionally ignored by Git and are not website assets. Eighteen real profiles are assigned to London (15, head office), Manchester (2) and Hampshire (1). Full biographies are preserved up to 5,000 characters; four missing biographies receive factual temporary one-liners. Unconfirmed work contacts remain empty and their public links are hidden.

The import includes 42 marquee logos named `Client 01` to `Client 42` in existing numeric order, plus five named testimonial clients. Names, display order and visibility are editable. Renaming a client does not change its ID or references.

After reviewing the dry run and confirming access, apply with `npm --prefix studio run import:content -- -- --apply --project=thyjjqzv`. The importer refuses any other target, validates every source image before writing, saves a document snapshot under ignored `temp/sanity-backups/`, and uses create-if-absent writes. It never overwrites existing editorial records or deletes documents. Review conflicts before rerunning. Sanity content-deduplicates uploaded assets.

Impact figures and temporary-worker guidance are initially created as **drafts**, requiring client review and publication. Only after approval, include `--approve-impact` and/or `--approve-guidance` in the apply arguments. These flags also publish existing drafts on a later run, using the stored draft content and revision checks rather than replacing editorial changes with seed copy. Existing published records are preserved. Required published documents are `public-contacts`, `temporary-work` and `environmental-impact`; missing required content intentionally fails builds. No fake vacancies are imported.

### Image Delivery and Limits

Portrait uploads are capped at **2 MiB (2,097,152 bytes)** and must be at least 600 by 600 pixels. Candidate gallery photos have the same size limit and must be at least 600 by 450 pixels. Logos are capped at **250 KiB (256,000 bytes)**. Use the guarded image source for selection, drop or paste; default direct uploads are disabled. Oversized files are rejected before passing them to Sanity. Existing selected assets are checked again before publishing. The importer verifies actual format, dimensions and animation metadata. Studio rules are editing safeguards, not server-side access controls on authorised API clients.

The Astro static build fetches source images, honours portrait crop/hotspot, generates responsive WebP variants and a JPEG sharing image, and emits local deployment assets. Logos retain their aspect ratio and transparent backgrounds; SVG logos are copied into local deployment assets as vectors without enabling SVG rasterisation. Visitors receive these copies from the website host. Build downloads and Studio previews still use Sanity bandwidth; visitor delivery uses Vercel bandwidth. Preserve the Astro image cache between builds where supported.

### Publishing and Cutover

Configure a private Vercel Deploy Hook and one Sanity webhook for published `job`, `consultant`, `location`, `client`, `testimonial`, `siteSettings`, `policy`, `temporaryWork`, `candidateGallery`, `storyInstagram` and `environmentalImpact` changes. Exclude draft IDs, asset documents and system documents; include create/update/delete events so publishing, replacements and unpublishing rebuild the site. Do not put the deploy-hook URL in frontend code or public Sanity content. Changes appear after the build completes.

Verify a Vercel Preview against the new project before changing live production. Website builds and `api/apply.js` must select the same project. Keep the previous Vercel deployment and its matching environment settings for rollback; leave both Sanity projects intact during acceptance. This repository does not create remote webhooks, CORS origins, memberships or deployments automatically.

When a successful published jobs query returns no vacancies, three code-defined `[Test]` roles appear. Their detail pages are noindex, omitted from the sitemap, omit JobPosting metadata, and do not accept applications. CMS failures never trigger samples. One real published job replaces all samples on the next build.

### Verification

Run `npm --prefix studio test`, `npm exec --prefix studio -- tsc --project studio/tsconfig.json --noEmit`, `npm --prefix studio run build`, root `npm test`, and root `npm run build`. A Studio build alone does not typecheck. Before cutover, inspect generated HTML, responsive sources and sharing URLs; open all office groups on desktop/mobile and confirm portrait/logo network requests use the website host after hydration. Exercise the guarded picker with oversized files via selection, drop and paste. Do not send test applications to real staff.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
npm run seed:locations
npm run seed:impact
npm run seed:gallery
npm run seed:instagram
npm run deploy
```

`npm run deploy` publishes the Studio to a Sanity-hosted `*.sanity.studio` URL. Access is controlled by Sanity project membership and roles.

The public Astro website is a separate package in the repository root. It reads published jobs, team members, locations and environmental impact numbers from Content Lake during its static build.

## Public Contacts

Open **Public contacts** and edit **general email** to change the shared enquiries address, currently `info@changehospitality.co.uk`. The site menu, shared footer and 404 help link all use this field. Publish the change, then rebuild/redeploy the static website; the configured Sanity webhook can trigger this automatically. Updating the import seed alone does not overwrite existing published contacts.

The site tagline is maintained in the website components and home story timeline, not in this Sanity document.

## Policy Pages

Open **Policy pages** to edit the four former PDF policies. Each existing `policy` document keeps its ID, footer label, display order, visibility and original PDF reference. The new **Page title**, **Page URL slug**, **SEO description**, **Cover colour theme** and **Policy content (Markdown)** fields control the website page. The PDF URL is optional and is no longer the footer destination.

The Markdown field is a plain-text editor: use `##` for section headings, `**bold**`, `-` for bullets, and `1.` for numbered lists. Indent nested lists by four spaces; nested numbered lists display as a/b/c. An ordered list restarted with `7.` keeps that numbering after intervening paragraphs. A backslash at the end of a Markdown line creates an address line break. Do not repeat the page title as a `#` heading. Raw HTML is not displayed. No Markdown plugin or browser-side renderer is needed.

Initial content lives in [the approved policy seed](data/policies.ts). From the repository root, preview the migration without writes:

```sh
npm --prefix studio run seed:policies
```

After confirming the target and reviewing the supplied wording, apply:

```sh
npm --prefix studio run seed:policies -- -- --apply --project=thyjjqzv
```

The migration only targets `thyjjqzv / production` and `policy-1` through `policy-4`. It refuses unpublished drafts and wrong document types, adds missing fields with revision-guarded atomic patches, creates absent documents, and verifies all saved fields. Rerunning never replaces existing Markdown, titles, slugs, themes, SEO copy or other editorial changes. The main content importer also includes complete policy pages for a new dataset; use this migration to upgrade existing PDF-only records.

Default themes are Data Protection: **Mist / ink**; Environmental: **B-Corp green / cream**; Equality: **Cocoa / cream**; Modern Slavery: **Citron / cocoa**. Reserve green for environmental content. Keep published slugs stable: changing one changes its public `/policies/<slug>/` URL. Publish each edited policy and allow the website rebuild to finish before checking changes. The published `policy` webhook already belongs in the Vercel deploy-hook filter described above; remote webhooks and Studio deployment are not configured by this command.

The supplied legal text is imported without substantive changes. Obtain client legal review of the Data Protection Act 1998 references, consent/access-fee wording and statement dates before launch. The website intentionally fails builds when a visible policy lacks required page content, rather than silently reverting to PDFs.

## Office Contact Details

The existing **Locations** records are also the source of truth for the franchising map. Edit **Name**, **Head office**, **Office address** and **Office phone** on the London, Greater Manchester and Hampshire & Isle of Wight records, then publish and rebuild the website. Deploy the updated Studio to expose the new address and phone fields. Keep their existing IDs and slugs (`london`, `manchester`, `hampshire`): team-member references, team order and map positions depend on those identities. The same published names appear on the team page and the franchising office list.

For the approved initial details, preview with `npm --prefix studio run seed:locations -- -- --update-office-details`. Apply with `npm --prefix studio run seed:locations -- -- --update-office-details --apply --project=thyjjqzv`. This revision-guarded update only changes the three offices' names, addresses and phone numbers; drafts stop it for review. Existing profiles, office slugs, head-office settings and team orders are preserved. Future editorial changes belong in Studio, not in this initialization command. Map coordinates remain in website code.

## Candidate Gallery

Open **Candidate gallery** to manage the Jobs page's **People behind great hospitality** photos. The singleton ID is `candidate-gallery`; drag photos to reorder them, replace images using the guarded picker, set crop/hotspot and provide accurate, non-blank image descriptions. Use only approved candidate photos. The gallery accepts one to six JPEG, PNG or WebP images, each at most 2 MiB and at least 600 by 450 pixels.

For the initial selection, run `npm --prefix studio run seed:gallery` from the repository root for a dry run. It validates all six source files under `public/candidate-pics/`: `09`, `10`, `11`, `04`, `08`, `02`, in display order. Apply with `npm --prefix studio run seed:gallery -- -- --apply --project=thyjjqzv`. The importer only targets `thyjjqzv / production`, uploads the six originals and creates the published gallery if absent. Existing published content is preserved without uploading more assets; an existing draft stops the import for review. It never overwrites other editorial documents. Sanity content-deduplicates repeated asset uploads.

To replace `03.webp` with `10.webp` in slot two and `07.webp` with `11.webp` in slot three, preview with `npm --prefix studio run seed:gallery -- -- --replace-photos`. Apply with `npm --prefix studio run seed:gallery -- -- --replace-photos --apply --project=thyjjqzv`. This mode validates the current image hashes and positions, rejects pending drafts, saves a gallery snapshot under ignored `temp/sanity-backups/`, and uses a revision-guarded patch. Only the two asset references and descriptions change; their obsolete crop/hotspot settings are cleared. The original keys `candidate-03` and `candidate-07`, the remaining four photos and display order are preserved. The entire saved photo array is verified, and an already-completed replacement is a no-op.

The approved descriptions for the current six photo keys can be previewed with `npm --prefix studio run seed:gallery -- -- --update-alt` and applied with `npm --prefix studio run seed:gallery -- -- --update-alt --apply --project=thyjjqzv`. This revision-guarded mode changes descriptions only, preserving images, crops and order; an existing draft or changed photo keys stops it for review. Future editorial image replacements can be made directly in Studio with matching descriptions.

Publish changes, then rebuild/redeploy the Astro website. Include `candidateGallery` in the published-content webhook filter. Deploy the updated Studio with `npm run deploy` to expose the editor to the team.

The build generates local responsive WebP variants, honours crop/hotspot, caps output at the source size or 1280px and uses quality 75. Visitors load only website-hosted assets, not Sanity URLs. The desktop stack fetches the first/current photo plus one ahead as needed; the mobile/reduced-motion grid fetches nearby cards. Inert image templates prevent early downloads, and native lazy-loaded images are available without JavaScript. The root Vercel configuration gives hashed `/_astro/` assets a one-year immutable browser cache. Only build-time source downloads and Studio previews use Sanity image bandwidth.

## Our Story Instagram

Open **Our story Instagram** to edit the five cards directly after Jim's letter on `/our-story/`. The singleton ID is `story-instagram`. Each post has an image, accurate image description, short caption and optional original Instagram post/reel URL. Drag cards to reorder them. The account name and shared profile destination come from **Public contacts > Social links > Instagram**, so changing the account there updates both this section and the footer.

Use approved JPEG, PNG or WebP images, at most **2 MiB** and at least **600 by 450 pixels**. The guarded **Instagram photos** picker checks uploads and publication. The website preserves the complete artwork, including text on portrait/reel covers; it does not automatically square-crop the images. Crop/hotspot remains available for intentional editorial changes. There are no fake engagement counts or non-functional action buttons: the familiar heart, comment, share and save icons are decorative, and the whole card is a labelled link.

Initialize the five supplied images from `public/instagram-pics/1.webp` through `5.webp`, in numeric order:

```sh
npm --prefix studio run seed:instagram
npm --prefix studio run seed:instagram -- -- --apply --project=thyjjqzv
```

The first command is a no-write dry run. Apply validates every source before uploading, only targets `thyjjqzv / production`, creates the published document if absent and verifies the saved image references and ordering. An existing draft stops initialization; existing published content is preserved without uploads or writes. It never modifies Candidate gallery or other editorial documents.

Original post URLs were not supplied, so the initial cards explicitly link to the Instagram profile. Add each original `/p/`, `/reel/` or `/tv/` HTTPS link to open that specific post instead; leaving the field empty intentionally keeps the profile destination. Captions are short website summaries, not imported Instagram engagement data.

Publish changes and rebuild/redeploy the static website. Include `storyInstagram` in the published-content Sanity webhook filter for automatic rebuilds. Deploy the updated Studio to expose the new editor in the hosted sidebar; the initializer does not deploy Studio or configure webhooks. Missing, incomplete or non-five-post content fails the website build with an actionable error instead of silently showing local image defaults.

The section renders as static HTML with no new client JavaScript, embed, Instagram API or tracking scripts. Astro emits local responsive WebP variants up to 800px wide without upscaling; visitors receive website-hosted, lazy-loaded images. Desktop uses three cards above two centred cards, tablet uses two columns and mobile stacks the cards. Keyboard focus, reduced motion and disabled JavaScript are supported. Run `npx playwright test story-instagram.spec.js` for the targeted website checks.

## Environmental Impact Numbers

Open **Environmental impact** in the Studio sidebar to edit the **To date** cards on `/sustainability-impact/`. This is a single document with the stable ID `environmental-impact`. Each entry has a required display value, label and card shape, plus an optional unit. Display values are text so formatting such as `3.09` and `20,000+` is preserved. Drag entries to reorder them; add or remove entries as needed, keeping at least one.

### Initial Population

Run `npm run seed:impact` from this directory using a signed-in Sanity CLI account with write access. The command creates and publishes the four currently displayed figures: 498 trees funded, 15 projects worldwide, 9 tonnes of carbon avoidance and 34 square metres of habitat restoration. The commented-out carbon removal figure is not seeded.

The seed uses `createIfNotExists`, so rerunning it preserves published edits. If only an editorial draft exists, the command stops and asks you to publish that draft instead. The website has no hardcoded fallback: missing, empty or invalid impact content fails the build with an actionable error rather than displaying stale figures.

### Editorial Workflow

1. Edit **Environmental impact**, then **Publish**.
2. Rebuild or redeploy the Astro website to display the published numbers. Draft changes are never displayed.
3. For automatic rebuilds, include `_type == "environmentalImpact"` in a Sanity webhook that calls your Vercel deploy hook. This repository does not provision that webhook.

Deploy the updated Studio with `npm run deploy` to make the new editor available to the team. The website still renders the cards as static HTML, with no new browser-side Sanity requests or hydration.

## Team Office Locations

Locations are independent Sanity documents with an **Active office** switch, **Head office** flag, optional team introduction and display order. Team members require an **Office location** reference; the picker only offers active locations. There is no default assignment.

The team page reads published active locations and automatically creates an accordion for each, including offices that do not yet have profiles. Members are matched by location document ID, so renaming an office does not break assignments. Inactive offices and their assigned profiles are not shown on the team page. The shared `getActiveLocations()` query is available for other office-based views; job vacancy location fields remain separate.

### Team Display Order

Open **Locations > office > Team display order** to add references to that office's published profiles, then drag them into the preferred sequence (CEO/founder, management, remaining team). Existing profile previews show the name, job title, office and uploaded portrait. The list uses Sanity's native sortable array, with no ranking numbers or extra plugin. Each office has an independent order; bios, job references and office assignments are unchanged.

The picker is restricted to the current office and publish validation rejects duplicates, missing/unpublished profiles and people assigned elsewhere. Publish a new member with their office selected before adding them here. New or unlisted members still appear at the end alphabetically, so forgetting to rank someone does not hide their profile. Missing or empty lists preserve alphabetical display. The order is applied before pagination.

To populate existing rosters once, run from the repository root:

```sh
npm --prefix studio run seed:team-order
```

This is a **no-write dry run** against the client project. It reads published members and prepares alphabetical reference lists only for offices with members and no existing list. After reviewing and approving the target, apply:

```sh
npm --prefix studio run seed:team-order -- -- --apply --project=thyjjqzv
```

The initializer preserves existing lists (including deliberately empty ones), refuses offices with pending drafts, uses revision-checked atomic patches, and verifies the saved sequence and office membership. Rerunning does not reset editorial ordering. Run it after importing the roster; it does not guess seniority from job titles or change member documents.

For an explicitly approved replacement order, update `requestedOrders` in `scripts/seed-team-order.ts`, then preview with `npm --prefix studio run seed:team-order -- -- --reorder`. This separate mode requires a complete roster for each listed office and rejects missing, ambiguous, duplicate, wrong-office or draft profiles. Normal initialization continues to preserve editorial lists.

The approved November 2026 order includes 16 London members, two Manchester members and one Hampshire member. To include Amy Fox's validated local portrait in the same update, preview and then apply:

```sh
npm --prefix studio run seed:team-order -- -- --reorder "--amy-portrait=public/team-pics/Amy fox.jpg"
npm --prefix studio run seed:team-order -- -- --reorder "--amy-portrait=public/team-pics/Amy fox.jpg" --apply --project=thyjjqzv
```

Applying saves the affected documents under ignored `temp/sanity-backups/`, uploads the portrait with alternative text, and commits revision-guarded office/profile patches atomically. Existing biographies, contacts and office assignments are preserved; Jim's title is confirmed as Founder & Managing Director. Saved published lists and the portrait reference are verified before reporting success. Rebuild or redeploy the website afterwards. This mode intentionally replaces existing orders; future editorial changes can still be made in Studio.

When moving someone, publish their new **Office location**, remove their reference from the old office order, and add/reposition them in the new office order. Stale old-office references cannot move a profile back; the website always uses the member's current office assignment. Before deleting a member, remove their office-order references and any job references.

### Initial Population

`npm run seed:locations` uses the signed-in Sanity CLI user to create 56 published location documents: all 55 English cities from the [Cabinet Office list](https://www.gov.uk/government/publications/list-of-cities/list-of-cities-html), plus the Hampshire office. The Manchester and Hampshire office records use the approved display names Greater Manchester and Hampshire & Isle of Wight while preserving their original IDs and slugs. London, Greater Manchester and Hampshire & Isle of Wight start active, in that order; London is head office. The other cities start inactive.

The seed uses stable document IDs and `createIfNotExists`, so rerunning it does not reset flags, names or other editorial changes. It does not replace team members or jobs.

### Editorial Workflow

1. In **Locations**, enable **Active office** for a city, provide its public office address and phone, set the introduction and display order if needed, and **Publish**. Editors can also create new locations beyond the seed list; give each a unique slug.
2. Open each team member, select their **Office location**, and **Publish**. Older documents with a plain-text location may show an invalid-type warning; reset that field and select the referenced location. Old `division` values are no longer used.
3. In **Locations > office > Team display order**, add members and drag them into the preferred sequence, then **Publish**.
4. Rebuild or redeploy the Astro website after publishing location or team changes.

No website code change is needed to add an office. The website is static, so Content Lake changes are visible on the public site after its next build, not immediately on publish. To automate that step, configure a Sanity webhook for location and consultant changes that calls a Vercel deploy hook; this is not configured by the seed or Studio deployment.

Profiles without a location reference do not appear in any accordion. Local sample members are not automatically uploaded to Sanity. Editing existing team documents preserves their IDs and job consultant references.