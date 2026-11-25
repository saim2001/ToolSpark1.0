(function () {
  const { $, $$, copyText, dropzone, loadImage, toast } = window.TS;
  let rgb = [79, 70, 229];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToRgb([h, s, l]) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }

  // Accepts #abc, abc, #aabbcc, rgb(1,2,3), 1,2,3, hsl(200, 50%, 40%).
  function parse(text) {
    const s = text.trim().toLowerCase();
    let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (m) {
      const hex = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
      return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    }
    m = s.match(/^hsla?\(?\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/);
    if (m) return hslToRgb([((Number(m[1]) % 360) + 360) % 360, clamp(Number(m[2]), 0, 100), clamp(Number(m[3]), 0, 100)]);
    m = s.match(/^(?:rgba?\()?\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (m) return [m[1], m[2], m[3]].map((v) => clamp(Math.round(Number(v)), 0, 255));
    return null;
  }

  function luminance([r, g, b]) {
    const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const grade = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large only' : 'Fail');

  function mix(c, target, t) { return c.map((v, i) => Math.round(v + (target[i] - v) * t)); }

  function render(skip) {
    const hex = toHex(rgb);
    const hsl = rgbToHsl(rgb);
    if (skip !== 'hex') $('#hex').value = hex;
    if (skip !== 'rgb') $('#rgb').value = `rgb(${rgb.join(', ')})`;
    if (skip !== 'hsl') $('#hsl').value = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    $('#native').value = hex.toLowerCase();
    const lum = luminance(rgb);
    const onWhite = contrast(lum, 1), onBlack = contrast(lum, 0);
    const sw = $('#swatch');
    sw.style.background = hex;
    sw.style.color = onBlack > onWhite ? '#000' : '#fff';
    sw.textContent = hex;
    $('#contrast').innerHTML = `Contrast with white text: <strong>${onWhite.toFixed(2)}:1</strong> (${grade(onWhite)}) · with black text: <strong>${onBlack.toFixed(2)}:1</strong> (${grade(onBlack)})`;
    const shades = [];
    for (let i = 5; i >= 1; i--) shades.push(mix(rgb, [255, 255, 255], i / 6));
    shades.push(rgb);
    for (let i = 1; i <= 5; i++) shades.push(mix(rgb, [0, 0, 0], i / 6));
    $('#shades').innerHTML = shades.map((c) => `<button type="button" style="background:${toHex(c)}" title="${toHex(c)}" data-hex="${toHex(c)}"></button>`).join('');
  }

  function set(c, skip) { rgb = c; render(skip); }

  ['hex', 'rgb', 'hsl'].forEach((id) => {
    $('#' + id).addEventListener('input', () => { const c = parse($('#' + id).value); if (c) set(c, id); });
    $('#' + id).addEventListener('blur', () => render());
  });
  $('#native').addEventListener('input', () => set(parse($('#native').value)));
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', (e) => { e.preventDefault(); copyText($('#' + btn.dataset.copy).value); }));
  $('#shades').addEventListener('click', (e) => { if (e.target.dataset.hex) set(parse(e.target.dataset.hex)); });

  if ('EyeDropper' in window) {
    $('#eyedropper').hidden = false;
    $('#eyedropper').onclick = async () => {
      try { set(parse((await new window.EyeDropper().open()).sRGBHex)); } catch { /* user cancelled */ }
    };
  }

  const picker = $('#picker');
  dropzone($('.dropzone'), async ([file]) => {
    let img;
    try { img = await loadImage(file); } catch (err) { return toast(err.message); }
    picker.width = img.naturalWidth;
    picker.height = img.naturalHeight;
    picker.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
    $('#picker-wrap').hidden = false;
  });
  picker.addEventListener('click', (e) => {
    const rect = picker.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * picker.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * picker.height);
    const [r, g, b] = picker.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
    set([r, g, b]);
    toast(`Picked ${toHex([r, g, b])}`);
  });

  render();
})();
