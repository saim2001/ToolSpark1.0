// Static site builder: wraps pages in a shared layout and writes everything to dist/.
// No dependencies — run with `node scripts/build.js`.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const { categories, tools } = JSON.parse(fs.readFileSync(path.join(SRC, 'tools.json'), 'utf8'));
const year = new Date().getFullYear();
const today = new Date().toISOString().slice(0, 10);
const siteUrl = site.url.replace(/\/$/, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

function adUnit(slotKey) {
  const slot = site.adsense.slots[slotKey];
  if (!site.adsense.client || !slot) return '';
  return `<div class="ad-slot"><ins class="adsbygoogle" style="display:block" data-ad-client="${site.adsense.client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function toolCard(t) {
  const cat = categoryById[t.category];
  return `<a class="tool-card" href="/${t.slug}/" data-search="${esc((t.name + ' ' + t.description).toLowerCase())}">
  <span class="tool-card__icon" aria-hidden="true">${t.icon || cat.icon}</span>
  <span class="tool-card__body"><strong>${esc(t.name)}</strong><span>${esc(t.lead.split('.')[0])}.</span></span>
</a>`;
}

function layout({ title, description, urlPath, body, scripts = [], jsonLd = null, noindex = false }) {
  const canonical = siteUrl + urlPath;
  const adsHead = site.adsense.client
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsense.client}" crossorigin="anonymous"></script>`
    : '';
  const footerCats = categories
    .map((c) => `<div><h3>${esc(c.name)}</h3><ul>${tools
      .filter((t) => t.category === c.id)
      .map((t) => `<li><a href="/${t.slug}/">${esc(t.name)}</a></li>`)
      .join('')}</ul></div>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#4f46e5">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/style.css">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
${adsHead}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="/"><img class="logo__mark" src="/favicon.svg" alt="" width="30" height="30">${esc(site.name)}</a>
    <nav class="site-nav" aria-label="Main">
      ${categories.map((c) => `<a href="/#${c.id}">${esc(c.name.replace(' Tools', ''))}</a>`).join('')}
    </nav>
    <button class="theme-toggle" type="button" aria-label="Toggle dark mode">◐</button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">${footerCats}</div>
    <div class="footer-bottom">
      <p>© ${year} ${esc(site.name)}. All tools run locally in your browser.</p>
      <nav aria-label="Legal"><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy-policy/">Privacy Policy</a><a href="/terms/">Terms</a></nav>
    </div>
  </div>
</footer>
<script src="/assets/js/common.js"></script>
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
}

function write(relPath, content) {
  const file = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// Replace {{site.name}}, {{site.email}}, {{site.url}}, {{date}} in page content.
function fill(html) {
  return html
    .replace(/\{\{site\.name\}\}/g, esc(site.name))
    .replace(/\{\{site\.email\}\}/g, esc(site.email))
    .replace(/\{\{site\.url\}\}/g, siteUrl)
    .replace(/\{\{date\}\}/g, today);
}

// ---------------------------------------------------------------------------

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));
for (const f of ['favicon.svg', '_headers']) {
  if (fs.existsSync(path.join(SRC, f))) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
}

const sitemap = [{ loc: '/', priority: '1.0' }];

// Home page
const home = `
<section class="hero">
  <div class="container">
    <h1>Free online tools that <span class="accent">just work</span></h1>
    <p class="hero__lead">Compress images, merge PDFs, count words, generate QR codes and more. No signup, no watermarks — and your files never leave your device.</p>
    <label class="search"><span class="visually-hidden">Search tools</span><input id="tool-search" type="search" placeholder="Search tools… e.g. compress, pdf, json" autocomplete="off"></label>
  </div>
</section>
<div class="container">
  ${categories.map((c) => `
  <section class="category" id="${c.id}">
    <h2>${c.icon} ${esc(c.name)}</h2>
    <div class="tool-grid">${tools.filter((t) => t.category === c.id).map(toolCard).join('')}</div>
  </section>`).join('')}
  <p class="no-results" id="no-results" hidden>No tools match your search.</p>
  <section class="features">
    <div><h3>🔒 Private by design</h3><p>Every tool runs entirely in your browser. Files and text are processed on your device and never uploaded.</p></div>
    <div><h3>⚡ Fast &amp; free</h3><p>No accounts, no limits, no watermarks. Open a tool and get the job done in seconds.</p></div>
    <div><h3>📱 Works everywhere</h3><p>Use ${esc(site.name)} on your phone, tablet or computer — any modern browser will do.</p></div>
  </section>
</div>`;
write('index.html', layout({
  title: `${site.name} – ${site.tagline}`,
  description: 'Free online tools: compress and convert images, merge and split PDFs, word counter, QR code generator, password generator, JSON formatter and more. Private and fast.',
  urlPath: '/',
  body: home,
  scripts: ['/assets/js/home.js'],
  jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: siteUrl + '/' },
}));

// Tool pages
for (const t of tools) {
  const src = path.join(SRC, 'tools', `${t.slug}.html`);
  if (!fs.existsSync(src)) throw new Error(`Missing tool content: ${src}`);
  const [toolHtml, contentHtml = ''] = fill(fs.readFileSync(src, 'utf8')).split('<!-- content -->');
  const cat = categoryById[t.category];
  const related = tools.filter((o) => o.slug !== t.slug && o.category === t.category)
    .concat(tools.filter((o) => o.category !== t.category))
    .slice(0, 6);

  const body = `
<div class="container">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#${cat.id}">${esc(cat.name)}</a> › <span>${esc(t.name)}</span></nav>
  <header class="tool-header">
    <h1>${esc(t.name)}</h1>
    <p>${esc(t.lead)}</p>
  </header>
  <section class="tool" id="tool">${toolHtml}</section>
  ${adUnit('afterTool')}
  <article class="prose">${contentHtml}</article>
  ${adUnit('afterContent')}
  <section class="related">
    <h2>More free tools</h2>
    <div class="tool-grid">${related.map(toolCard).join('')}</div>
  </section>
</div>`;

  write(`${t.slug}/index.html`, layout({
    title: t.title,
    description: t.description,
    urlPath: `/${t.slug}/`,
    body,
    scripts: [...t.scripts, `/assets/js/tools/${t.slug}.js`],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t.name,
      url: `${siteUrl}/${t.slug}/`,
      description: t.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  }));
  sitemap.push({ loc: `/${t.slug}/`, priority: '0.9' });
}

// Static pages: first line is <!-- {"title": "...", "description": "..."} -->
for (const file of fs.readdirSync(path.join(SRC, 'pages'))) {
  const raw = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
  const match = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  const meta = match ? JSON.parse(match[1]) : {};
  const slug = path.basename(file, '.html');
  const is404 = slug === '404';
  const urlPath = is404 ? '/404' : `/${slug}/`;
  const body = `<div class="container"><article class="prose page">${fill(raw.slice(match ? match[0].length : 0))}</article></div>`;
  write(is404 ? '404.html' : `${slug}/index.html`, layout({
    title: `${meta.title} – ${site.name}`,
    description: meta.description || '',
    urlPath,
    body,
    noindex: is404,
  }));
  if (!is404) sitemap.push({ loc: urlPath, priority: '0.3' });
}

write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
if (site.adsense.client) {
  write('ads.txt', `google.com, ${site.adsense.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`Built ${sitemap.length} pages into dist/`);
