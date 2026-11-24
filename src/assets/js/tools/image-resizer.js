(function () {
  const { $, $$, formatBytes, dropzone, loadImage, canvasToBlob, drawToCanvas, renameExt, download, toast } = window.TS;
  const widthIn = $('#width');
  const heightIn = $('#height');
  const lock = $('#lock');
  const quality = $('#quality');
  let img = null;
  let file = null;

  dropzone($('.dropzone'), async ([f]) => {
    try {
      img = await loadImage(f);
    } catch (err) {
      return toast(err.message);
    }
    file = f;
    widthIn.value = img.naturalWidth;
    heightIn.value = img.naturalHeight;
    if (['image/png', 'image/webp'].includes(f.type)) $('#format').value = f.type;
    $('#original').textContent = `Original: ${img.naturalWidth} × ${img.naturalHeight} px · ${formatBytes(f.size)}`;
    $('.dropzone').hidden = true;
    $('#editor').hidden = false;
    renderPreview();
  });

  const ratio = () => img.naturalWidth / img.naturalHeight;
  widthIn.addEventListener('input', () => {
    if (lock.checked && widthIn.value) heightIn.value = Math.max(1, Math.round(widthIn.value / ratio()));
    renderPreview();
  });
  heightIn.addEventListener('input', () => {
    if (lock.checked && heightIn.value) widthIn.value = Math.max(1, Math.round(heightIn.value * ratio()));
    renderPreview();
  });
  quality.addEventListener('input', () => { $('#quality-out').textContent = quality.value + '%'; });

  $$('#presets button').forEach((btn) => btn.addEventListener('click', () => {
    if (!img) return;
    if (btn.dataset.pct) {
      const p = btn.dataset.pct / 100;
      widthIn.value = Math.round(img.naturalWidth * p);
      heightIn.value = Math.round(img.naturalHeight * p);
    } else if (btn.dataset.h) {
      lock.checked = false;
      widthIn.value = btn.dataset.w;
      heightIn.value = btn.dataset.h;
    } else {
      widthIn.value = btn.dataset.w;
      heightIn.value = Math.round(btn.dataset.w / ratio());
    }
    renderPreview();
  }));

  function size() {
    const w = parseInt(widthIn.value, 10);
    const h = parseInt(heightIn.value, 10);
    return w > 0 && h > 0 && w <= 16000 && h <= 16000 ? [w, h] : null;
  }

  function renderPreview() {
    const s = size();
    const canvas = $('#preview');
    if (!s) return;
    // Preview is capped for speed; the download uses the full requested size.
    const scale = Math.min(1, 800 / Math.max(...s));
    canvas.width = Math.round(s[0] * scale);
    canvas.height = Math.round(s[1] * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  $('#download').onclick = async () => {
    const s = size();
    if (!s) return toast('Enter a width and height between 1 and 16000');
    const type = $('#format').value;
    const canvas = drawToCanvas(img, s[0], s[1], type);
    const blob = await canvasToBlob(canvas, type, quality.value / 100);
    download(blob, renameExt(file.name, type).replace(/(\.\w+)$/, `-${s[0]}x${s[1]}$1`));
  };

  $('#reset').onclick = () => {
    img = file = null;
    $('#editor').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
