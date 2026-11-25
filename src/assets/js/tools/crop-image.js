(function () {
  const { $, dropzone, loadImage, canEncode, canvasToBlob, drawToCanvas, renameExt, download, toast } = window.TS;
  const stage = $('#stage');
  const imgEl = $('#img');
  const boxEl = $('#box');
  let img = null;
  let file = null;
  let W = 0, H = 0;        // natural image size
  let box = null;          // selection in natural pixels: { x, y, w, h }
  let drag = null;         // { mode: 'move' | 'nw' | 'ne' | 'sw' | 'se', start, px, py }

  dropzone($('.dropzone'), async ([f]) => {
    try {
      img = await loadImage(f);
    } catch (err) {
      return toast(err.message);
    }
    file = f;
    W = img.naturalWidth;
    H = img.naturalHeight;
    imgEl.src = img.src;
    if (['image/png', 'image/webp'].includes(f.type)) $('#format').value = canEncode(f.type) ? f.type : 'image/png';
    $('.dropzone').hidden = true;
    $('#editor').hidden = false;
    applyRatio();
  });

  function ratio() {
    const v = $('#ratio').value;
    return v === 'original' ? W / H : Number(v);
  }

  // Largest centered box with the chosen ratio, at 80% of the image.
  function applyRatio() {
    const r = ratio();
    let w = W * 0.8;
    let h = H * 0.8;
    if (r) {
      if (w / h > r) w = h * r; else h = w / r;
    }
    box = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    render();
  }

  function render() {
    boxEl.style.left = (box.x / W) * 100 + '%';
    boxEl.style.top = (box.y / H) * 100 + '%';
    boxEl.style.width = (box.w / W) * 100 + '%';
    boxEl.style.height = (box.h / H) * 100 + '%';
    $('#size').textContent = `Selection: ${Math.round(box.w)} × ${Math.round(box.h)} px`;
  }

  function toNatural(e) {
    const rect = stage.getBoundingClientRect();
    return [
      Math.min(W, Math.max(0, ((e.clientX - rect.left) / rect.width) * W)),
      Math.min(H, Math.max(0, ((e.clientY - rect.top) / rect.height) * H)),
    ];
  }

  stage.addEventListener('pointerdown', (e) => {
    if (!img) return;
    e.preventDefault();
    const [px, py] = toNatural(e);
    const handle = e.target.dataset.h;
    if (handle) drag = { mode: handle, start: { ...box } };
    else if (e.target === boxEl) drag = { mode: 'move', start: { ...box }, px, py };
    else drag = { mode: 'se', start: { x: px, y: py, w: 0, h: 0 } }; // draw a new selection
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [px, py] = toNatural(e);
    const s = drag.start;
    if (drag.mode === 'move') {
      box.x = Math.min(W - s.w, Math.max(0, s.x + px - drag.px));
      box.y = Math.min(H - s.h, Math.max(0, s.y + py - drag.py));
    } else {
      // The corner opposite the dragged handle stays fixed.
      const ax = drag.mode.includes('w') ? s.x + s.w : s.x;
      const ay = drag.mode.includes('n') ? s.y + s.h : s.y;
      const dx = px < ax ? -1 : 1;
      const dy = py < ay ? -1 : 1;
      let w = Math.min(Math.abs(px - ax), dx < 0 ? ax : W - ax);
      let h = Math.min(Math.abs(py - ay), dy < 0 ? ay : H - ay);
      const r = ratio();
      if (r) { if (w / h > r) w = h * r; else h = w / r; }
      const min = Math.max(4, Math.min(W, H) * 0.02);
      if (w < min || h < min) return;
      box = { x: dx < 0 ? ax - w : ax, y: dy < 0 ? ay - h : ay, w, h };
    }
    render();
  });

  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  $('#ratio').addEventListener('change', applyRatio);

  $('#download').onclick = async () => {
    const type = $('#format').value;
    const x = Math.round(box.x), y = Math.round(box.y);
    const w = Math.round(box.w), h = Math.round(box.h);
    const canvas = drawToCanvas(img, w, h, type);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, type, 0.92);
    download(blob, renameExt(file.name, type).replace(/(\.\w+)$/, '-cropped$1'));
  };

  $('#reset').onclick = () => {
    img = file = box = null;
    $('#editor').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
