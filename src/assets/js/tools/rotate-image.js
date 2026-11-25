(function () {
  const { $, dropzone, loadImage, canvasToBlob, renameExt, download, toast } = window.TS;
  let img = null;
  let file = null;
  const state = { quarter: 0, fine: 0, flipH: false, flipV: false };

  dropzone($('.dropzone'), async ([f]) => {
    try {
      img = await loadImage(f);
    } catch (err) {
      return toast(err.message);
    }
    file = f;
    if (['image/png', 'image/webp'].includes(f.type)) $('#format').value = f.type;
    $('.dropzone').hidden = true;
    $('#editor').hidden = false;
    resetEdits();
  });

  // Bounding box of the image rotated by the current angle. Rounding removes float noise at 90° steps.
  function outSize(w, h) {
    const rad = ((state.quarter * 90 + state.fine) * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    return [Math.max(1, Math.round(w * cos + h * sin)), Math.max(1, Math.round(w * sin + h * cos)), rad];
  }

  // Draw the transformed image onto a new canvas; scale < 1 is used for the preview.
  function draw(scale, type) {
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const [cw, ch, rad] = outSize(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    let bg = $('#bg').value;
    if (bg === 'transparent' && type === 'image/jpeg') bg = '#ffffff';
    if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch); }
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(rad);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return canvas;
  }

  function render() {
    const preview = $('#preview');
    const scale = Math.min(1, 700 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = draw(scale, $('#format').value);
    preview.width = c.width;
    preview.height = c.height;
    preview.getContext('2d').drawImage(c, 0, 0);
    const [fw, fh] = outSize(img.naturalWidth, img.naturalHeight);
    $('#size').textContent = `Output: ${fw} × ${fh} px`;
    $('#angle-out').textContent = state.fine + '°';
  }

  function resetEdits() {
    Object.assign(state, { quarter: 0, fine: 0, flipH: false, flipV: false });
    $('#angle').value = 0;
    render();
  }

  $('#left').onclick = () => { state.quarter = (state.quarter + 3) % 4; render(); };
  $('#right').onclick = () => { state.quarter = (state.quarter + 1) % 4; render(); };
  $('#flip-h').onclick = () => { state.flipH = !state.flipH; render(); };
  $('#flip-v').onclick = () => { state.flipV = !state.flipV; render(); };
  $('#angle').addEventListener('input', () => { state.fine = Number($('#angle').value); render(); });
  $('#bg').addEventListener('change', render);
  $('#format').addEventListener('change', render);
  $('#reset-edits').onclick = resetEdits;

  $('#download').onclick = async () => {
    const type = $('#format').value;
    const blob = await canvasToBlob(draw(1, type), type, 0.92);
    download(blob, renameExt(file.name, type).replace(/(\.\w+)$/, '-rotated$1'));
  };

  $('#reset').onclick = () => {
    img = file = null;
    $('#editor').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
