# Change Hospitality Studio

Standalone Sanity Studio for project `3z2hqf8g` and the `production` dataset.

## Commands

```sh
npm install
npm run dev
npm run build
npm run deploy
```

`npm run deploy` publishes the Studio to a Sanity-hosted `*.sanity.studio` URL. Access is controlled by Sanity project membership and roles.

The public Astro website is a separate package in the repository root. It reads published jobs and team members from Content Lake during its static build.