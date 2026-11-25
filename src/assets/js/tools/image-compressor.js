(function () {
  const { $, formatBytes, dropzone, loadImage, canEncode, canvasToBlob, drawToCanvas, renameExt, download, escapeHtml } = window.TS;
  const list = $('#files');
  const quality = $('#quality');
  const items = []; // { file, img, li, result }

  quality.addEventListener('input', () => { $('#quality-out').textContent = quality.value + '%'; });
  [quality, $('#format'), $('#max-width')].forEach((el) => el.addEventListener('change', recompressAll));

  dropzone($('.dropzone'), async (files) => {
    for (const file of files) {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `<img class="file-item__thumb" alt=""><div class="file-item__info"><div class="file-item__name">${escapeHtml(file.name)}</div><div class="file-item__meta">Compressing…</div></div><div class="file-item__actions"></div>`;
      list.appendChild(li);
      const item = { file, li, img: null, result: null };
      items.push(item);
      try {
        item.img = await loadImage(file);
        $('img', li).src = item.img.src;
        await compress(item);
      } catch (err) {
        $('.file-item__meta', li).innerHTML = `<span class="bad">${escapeHtml(err.message)}</span>`;
      }
    }
    $('#actions').hidden = !items.length;
    updateSummary();
  });

  async function compress(item) {
    const run = (item.run = (item.run || 0) + 1);
    const fmt = $('#format').value;
    const type = fmt === 'original' ? (item.file.type === 'image/png' ? 'image/png' : item.file.type) : fmt;
    const maxW = parseInt($('#max-width').value, 10);
    let { naturalWidth: w, naturalHeight: h } = item.img;
    if (maxW > 0 && w > maxW) { h = (h * maxW) / w; w = maxW; }
    const canvas = drawToCanvas(item.img, w, h, type);
    const encodable = canEncode(type);
    let blob = encodable ? await canvasToBlob(canvas, type, quality.value / 100) : item.file;
    if (run !== item.run) return; // settings changed while encoding; a newer run owns the result
    let note = '';
    // If re-encoding didn't help and nothing else changed, keep the original file.
    if (!encodable) {
      note = ` · this browser can't compress WebP, choose JPG instead`;
    } else if (blob.size >= item.file.size && type === item.file.type && !(maxW > 0 && item.img.naturalWidth > maxW)) {
      blob = item.file;
      note = ' · already optimized';
    }
    item.result = { blob, name: renameExt(item.file.name, blob.type || type) };
    const saved = 1 - blob.size / item.file.size;
    $('.file-item__meta', item.li).innerHTML =
      `${formatBytes(item.file.size)} → <strong>${formatBytes(blob.size)}</strong> ` +
      `<span class="${saved > 0 ? 'good' : 'bad'}">${saved > 0 ? '−' : '+'}${Math.abs(saved * 100).toFixed(0)}%</span>${note}`;
    const actions = $('.file-item__actions', item.li);
    actions.innerHTML = '<button class="btn btn--sm" type="button">Download</button>';
    actions.firstChild.onclick = () => download(item.result.blob, item.result.name);
  }

  async function recompressAll() {
    for (const item of items) if (item.img) await compress(item);
    updateSummary();
  }

  function updateSummary() {
    const done = items.filter((i) => i.result);
    if (!done.length) { $('#summary').textContent = ''; return; }
    const before = done.reduce((s, i) => s + i.file.size, 0);
    const after = done.reduce((s, i) => s + i.result.blob.size, 0);
    $('#summary').className = 'status is-ok';
    $('#summary').textContent = `Total: ${formatBytes(before)} → ${formatBytes(after)} (saved ${Math.max(0, (1 - after / before) * 100).toFixed(0)}%)`;
  }

  $('#download-all').onclick = async () => {
    for (const item of items) {
      if (!item.result) continue;
      download(item.result.blob, item.result.name);
      await new Promise((r) => setTimeout(r, 300)); // browsers block rapid-fire downloads
    }
  };
  $('#clear').onclick = () => {
    items.length = 0;
    list.innerHTML = '';
    $('#actions').hidden = true;
    $('#summary').textContent = '';
  };
})();
