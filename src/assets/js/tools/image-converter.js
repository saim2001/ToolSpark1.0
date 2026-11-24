(function () {
  const { $, formatBytes, dropzone, loadImage, canvasToBlob, drawToCanvas, renameExt, download, escapeHtml, EXT } = window.TS;
  const list = $('#files');
  const format = $('#format');
  const quality = $('#quality');
  const items = []; // { file, img, li, result }

  const syncQuality = () => { $('#quality-field').hidden = format.value === 'image/png'; };
  syncQuality();
  quality.addEventListener('input', () => { $('#quality-out').textContent = quality.value + '%'; });
  format.addEventListener('change', () => { syncQuality(); convertAll(); });
  quality.addEventListener('change', convertAll);

  dropzone($('.dropzone'), async (files) => {
    for (const file of files) {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `<img class="file-item__thumb" alt=""><div class="file-item__info"><div class="file-item__name">${escapeHtml(file.name)}</div><div class="file-item__meta">Converting…</div></div><div class="file-item__actions"></div>`;
      list.appendChild(li);
      const item = { file, li, img: null, result: null };
      items.push(item);
      try {
        item.img = await loadImage(file);
        $('img', li).src = item.img.src;
        await convert(item);
      } catch (err) {
        $('.file-item__meta', li).innerHTML = `<span class="bad">${escapeHtml(err.message)}</span>`;
      }
    }
    $('#actions').hidden = !items.length;
  });

  async function convert(item) {
    const type = format.value;
    // SVGs without explicit dimensions report 0 — fall back to a sensible size.
    const w = item.img.naturalWidth || 1024;
    const h = item.img.naturalHeight || 1024;
    const blob = await canvasToBlob(drawToCanvas(item.img, w, h, type), type, quality.value / 100);
    item.result = { blob, name: renameExt(item.file.name, type) };
    $('.file-item__meta', item.li).innerHTML =
      `${formatBytes(item.file.size)} → <strong>${EXT[type].toUpperCase()}</strong> · ${formatBytes(blob.size)}`;
    const actions = $('.file-item__actions', item.li);
    actions.innerHTML = '<button class="btn btn--sm" type="button">Download</button>';
    actions.firstChild.onclick = () => download(item.result.blob, item.result.name);
  }

  async function convertAll() {
    for (const item of items) if (item.img) await convert(item);
  }

  $('#download-all').onclick = async () => {
    for (const item of items) {
      if (!item.result) continue;
      download(item.result.blob, item.result.name);
      await new Promise((r) => setTimeout(r, 300));
    }
  };
  $('#clear').onclick = () => {
    items.length = 0;
    list.innerHTML = '';
    $('#actions').hidden = true;
  };
})();
