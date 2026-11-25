(function () {
  const { $, formatBytes, dropzone, download, toast, openPdf, renderPdfPage, pdfLoadError, canvasToBlob, EXT } = window.TS;
  let pdf = null;
  let baseName = 'document';
  let results = []; // { blob, name }

  dropzone($('.dropzone'), async ([file]) => {
    try {
      pdf = await openPdf(await file.arrayBuffer());
    } catch (err) {
      return toast(pdfLoadError(err, file.name));
    }
    baseName = file.name.replace(/\.pdf$/i, '');
    $('#info').textContent = `${file.name} · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    $('.dropzone').hidden = true;
    $('#options').hidden = false;
  });

  // "1-3, 5" → [1, 2, 3, 5]; empty → all pages.
  function parsePages(text, count) {
    if (!text.trim()) return Array.from({ length: count }, (_, i) => i + 1);
    const pages = [];
    for (const part of text.split(',').map((p) => p.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!m) throw new Error(`"${part}" is not a valid page or range`);
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : a;
      if (a < 1 || b > count || a > b) throw new Error(`"${part}" is outside 1–${count}`);
      for (let p = a; p <= b; p++) pages.push(p);
    }
    return pages;
  }

  $('#convert').onclick = async () => {
    const status = $('#status');
    const list = $('#results');
    let pages;
    try {
      pages = parsePages($('#pages').value, pdf.numPages);
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = err.message;
      return;
    }
    const type = $('#format').value;
    const scale = Number($('#dpi').value) / 72;
    results.forEach((r) => URL.revokeObjectURL(r.url));
    results = [];
    list.innerHTML = '';
    $('#all-wrap').hidden = true;
    $('#convert').disabled = true;
    status.className = 'status';
    try {
      for (let i = 0; i < pages.length; i++) {
        status.textContent = `Rendering page ${pages[i]} (${i + 1} of ${pages.length})…`;
        const canvas = await renderPdfPage(pdf, pages[i], scale);
        const blob = await canvasToBlob(canvas, type, 0.9);
        const result = { blob, name: `${baseName}-page-${pages[i]}.${EXT[type]}`, url: URL.createObjectURL(blob) };
        results.push(result);
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `<img class="file-item__thumb" alt="" src="${result.url}" style="object-fit:contain;background:#fff">
          <div class="file-item__info"><div class="file-item__name">Page ${pages[i]}</div>
          <div class="file-item__meta">${canvas.width} × ${canvas.height} px · ${formatBytes(blob.size)}</div></div>
          <div class="file-item__actions"><button class="btn btn--sm" type="button">Download</button></div>`;
        $('button', li).onclick = () => download(result.blob, result.name);
        list.appendChild(li);
      }
      status.className = 'status is-ok';
      status.textContent = `Done! ${results.length} image${results.length === 1 ? '' : 's'} ready.`;
      $('#all-wrap').hidden = results.length < 2;
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      $('#convert').disabled = false;
    }
  };

  $('#download-all').onclick = async () => {
    for (const r of results) {
      download(r.blob, r.name);
      await new Promise((res) => setTimeout(res, 350));
    }
  };

  $('#reset').onclick = () => {
    if (pdf) pdf.destroy();
    pdf = null;
    results.forEach((r) => URL.revokeObjectURL(r.url));
    results = [];
    $('#results').innerHTML = '';
    $('#status').textContent = '';
    $('#pages').value = '';
    $('#all-wrap').hidden = true;
    $('#options').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
