// Local preview server for dist/. Rebuilds when src/ changes.
// Usage: node scripts/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.argv[2]) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

function build() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  } catch {
    console.error('Build failed');
  }
}

build();
let timer;
for (const watched of [path.join(ROOT, 'src'), path.join(ROOT, 'site.config.json')]) {
  fs.watch(watched, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Preview at http://localhost:${PORT}`));
