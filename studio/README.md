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

Portrait uploads are capped at **2 MiB (2,097,152 bytes)** and must be at least 600 by 600 pixels. Logos are capped at **250 KiB (256,000 bytes)**. Use the guarded image source for selection, drop or paste; default direct uploads are disabled. Oversized files are rejected before passing them to Sanity. Existing selected assets are checked again before publishing. The importer verifies actual format, dimensions and animation metadata. Studio rules are editing safeguards, not server-side access controls on authorised API clients.

The Astro static build fetches source images, honours portrait crop/hotspot, generates responsive WebP variants and a JPEG sharing image, and emits local deployment assets. Logos retain their aspect ratio and transparent backgrounds; SVG logos are copied into local deployment assets as vectors without enabling SVG rasterisation. Visitors receive these copies from the website host. Build downloads and Studio previews still use Sanity bandwidth; visitor delivery uses Vercel bandwidth. Preserve the Astro image cache between builds where supported.

### Publishing and Cutover

Configure a private Vercel Deploy Hook and one Sanity webhook for published `job`, `consultant`, `location`, `client`, `testimonial`, `siteSettings`, `policy`, `temporaryWork` and `environmentalImpact` changes. Exclude draft IDs, asset documents and system documents; include create/update/delete events so publishing, replacements and unpublishing rebuild the site. Do not put the deploy-hook URL in frontend code or public Sanity content. Changes appear after the build completes.

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
npm run deploy
```

`npm run deploy` publishes the Studio to a Sanity-hosted `*.sanity.studio` URL. Access is controlled by Sanity project membership and roles.

The public Astro website is a separate package in the repository root. It reads published jobs, team members, locations and environmental impact numbers from Content Lake during its static build.

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

### Initial Population

`npm run seed:locations` uses the signed-in Sanity CLI user to create 56 published location documents: all 55 English cities from the [Cabinet Office list](https://www.gov.uk/government/publications/list-of-cities/list-of-cities-html), plus Hampshire, which is a county rather than a city. London, Hampshire and Manchester start active, in that order; London is head office. The other cities start inactive.

The seed uses stable document IDs and `createIfNotExists`, so rerunning it does not reset flags, names or other editorial changes. It does not replace team members or jobs.

### Editorial Workflow

1. In **Locations**, enable **Active office** for a city, set the introduction and display order if needed, and **Publish**. Editors can also create new locations beyond the seed list; give each a unique slug.
2. Open each team member, select their **Office location**, and **Publish**. Older documents with a plain-text location may show an invalid-type warning; reset that field and select the referenced location. Old `division` values are no longer used.
3. Rebuild or redeploy the Astro website after publishing location or team changes.

No website code change is needed to add an office. The website is static, so Content Lake changes are visible on the public site after its next build, not immediately on publish. To automate that step, configure a Sanity webhook for location and consultant changes that calls a Vercel deploy hook; this is not configured by the seed or Studio deployment.

Profiles without a location reference do not appear in any accordion. Local sample members are not automatically uploaded to Sanity. Editing existing team documents preserves their IDs and job consultant references.