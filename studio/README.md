# Change Hospitality Studio

Standalone Sanity Studio for project `3z2hqf8g` and the `production` dataset.

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