# KitKettle

Free online file and utility tools that run entirely in the browser. It's a plain static site with no framework and no server, so it can be hosted free on Cloudflare Pages, Netlify or GitHub Pages.

## Commands

```bash
npm run dev     # build + preview at http://localhost:8080, rebuilds when src/ changes
npm run build   # write the production site to dist/
```

Requires Node 18+. There are no npm dependencies.

## Project layout

```
site.config.json        Site name, URL, contact email, AdSense IDs
src/tools.json          Tool list: slug, name, SEO title/description, icon, extra scripts
src/tools/<slug>.html   Tool UI, then <!-- content -->, then the SEO article + FAQ
src/assets/js/tools/<slug>.js   Tool logic (loaded automatically)
src/assets/js/common.js Shared helpers (window.TS): dropzone, download, copy, image utils
src/assets/css/style.css
src/pages/*.html        About, Contact, Privacy Policy, Terms, 404
scripts/build.js        Wraps pages in the layout; writes sitemap.xml, robots.txt, ads.txt
```

## Adding a new tool

1. Add an entry to `src/tools.json`.
2. Create `src/tools/<slug>.html`: the tool UI, a `<!-- content -->` line, then 300+ words of helpful content (how-to, use cases, FAQ). This text is what ranks on Google.
3. Create `src/assets/js/tools/<slug>.js`.

The home page, footer, related-tools links and sitemap update automatically.

## Before going live

1. Buy a domain, then set `url` and `email` in `site.config.json`.
2. **Deploy on Cloudflare Pages (free):** push this repo to GitHub, then go to Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Then add your custom domain in the project settings.
3. Add the site to [Google Search Console](https://search.google.com/search-console) and submit `https://yourdomain.com/sitemap.xml`.

## Turning on AdSense

1. Apply at [adsense.google.com](https://adsense.google.com) once the site is live on your domain.
2. Put your publisher ID in `site.config.json` → `adsense.client` (e.g. `ca-pub-1234567890123456`). This adds the AdSense script to every page and generates `ads.txt`.
3. After approval, create two display ad units and put their slot IDs in `adsense.slots.afterTool` and `adsense.slots.afterContent`. Or turn on Auto ads in the AdSense dashboard instead.
4. In AdSense → Privacy & messaging, turn on the GDPR consent message for EU/UK visitors (the privacy policy already mentions it).
