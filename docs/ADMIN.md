# AEEL website administration

## Edit content

Open [Pages CMS](https://app.pagescms.org/), sign in with GitHub, select `AEEL-JWS/AEEL-JWS`, and choose **Research**, **Publications**, **People**, or **News**. Create, edit, and delete entries there. Saved changes commit to `main` and trigger the GitHub Pages deployment workflow.

Editors need GitHub access to this repository and the Pages CMS GitHub App must be installed for this repository. Uploaded images go to `public/images`.

## Local development

```sh
pnpm install
pnpm dev
pnpm build
```

## Final domain after review

The temporary site uses `/AEEL-JWS/`. After the lab approves the site and Korea University arranges DNS for `AEEL.korea.ac.kr`, set `SITE_URL=https://AEEL.korea.ac.kr` and `BASE_PATH=/` for the deployment build, and add `public/CNAME` containing `AEEL.korea.ac.kr`. Keep the temporary site configuration until then.

Initial text is adapted from the [existing AEEL website](https://shimgrp.korea.ac.kr/) and should be reviewed by the lab before using the final domain. Details of the initial sources are in `CONTENT_SOURCES.md`.
