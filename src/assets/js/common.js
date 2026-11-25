// Shared helpers available to every tool page as window.TS.
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const units = ['KB', 'MB', 'GB'];
    let i = -1;
    do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
    return bytes.toFixed(bytes < 10 ? 2 : 1) + ' ' + units[i];
  }

  let toastTimer;
  function toast(message) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Copied to clipboard');
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // Wire a .dropzone element (containing an <input type=file>) to a callback receiving File[].
  function dropzone(zone, onFiles) {
    const input = $('input[type=file]', zone);
    const accept = (input.accept || '').split(',').map((s) => s.trim()).filter(Boolean);
    const matches = (file) => !accept.length || accept.some((a) =>
      a.startsWith('.') ? file.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? file.type.startsWith(a.slice(0, -1)) : file.type === a);
    const handle = (list) => {
      let files = Array.from(list).filter(matches);
      if (!input.multiple) files = files.slice(0, 1);
      if (files.length) onFiles(files);
      else if (list.length) toast('That file type is not supported here');
    };
    // preventDefault stops the <label> from also opening the picker (which would open it twice).
    zone.addEventListener('click', (e) => { if (e.target !== input) { e.preventDefault(); input.click(); } });
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { handle(input.files); input.value = ''; });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); handle(e.dataTransfer.files); });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image: ' + file.name)); };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your browser cannot export ' + type))), type, quality));
  }

  // Draw an image to a canvas at the given size. JPEG has no transparency, so fill white first.
  function drawToCanvas(img, width, height, type) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  function renameExt(name, type) {
    return name.replace(/\.[^.]+$/, '') + '.' + (EXT[type] || 'bin');
  }

  // pdf.js helpers (only usable on pages that load pdf.min.js).
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  function openPdf(bytes) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    // pdf.js transfers (detaches) the buffer it is given, so hand it a copy.
    return pdfjsLib.getDocument({ data: new Uint8Array(bytes).slice() }).promise;
  }
  async function renderPdfPage(pdf, pageNumber, scale) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();
    return canvas;
  }
  const pdfLoadError = (err, name = 'this PDF') =>
    /password/i.test(err.name + err.message) || /encrypt/i.test(err.message) ? `${name} is password-protected` : `Could not read ${name}`;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Theme toggle
  const toggle = $('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const root = document.documentElement;
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
    });
  }

  window.TS = {
    $, $$, formatBytes, toast, copyText, download, dropzone, loadImage, canvasToBlob, drawToCanvas, renameExt, escapeHtml, EXT,
    openPdf, renderPdfPage, pdfLoadError,
  };
})();
