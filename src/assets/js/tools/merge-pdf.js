(function () {
  const { $, formatBytes, dropzone, download, escapeHtml, toast } = window.TS;
  const items = []; // { file, pages, bytes }

  dropzone($('.dropzone'), async (files) => {
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        items.push({ file, bytes, pages: doc.getPageCount() });
      } catch (err) {
        toast(/encrypt/i.test(err.message) ? `${file.name} is password-protected` : `Could not read ${file.name}`);
      }
    }
    render();
  });

  function render() {
    const list = $('#files');
    list.innerHTML = '';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `<span class="file-item__thumb" style="display:grid;place-items:center;font-size:1.5rem">📄</span>
        <div class="file-item__info"><div class="file-item__name">${i + 1}. ${escapeHtml(item.file.name)}</div>
        <div class="file-item__meta">${item.pages} page${item.pages === 1 ? '' : 's'} · ${formatBytes(item.file.size)}</div></div>
        <div class="file-item__actions">
          <button class="btn btn--ghost btn--sm" data-act="up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn--ghost btn--sm" data-act="down" aria-label="Move down" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn--ghost btn--sm" data-act="remove" aria-label="Remove">✕</button>
        </div>`;
      li.addEventListener('click', (e) => {
        const act = e.target.dataset.act;
        if (act === 'up') [items[i - 1], items[i]] = [items[i], items[i - 1]];
        else if (act === 'down') [items[i + 1], items[i]] = [items[i], items[i + 1]];
        else if (act === 'remove') items.splice(i, 1);
        else return;
        render();
      });
      list.appendChild(li);
    });
    $('#options').hidden = !items.length;
    $('#merge').disabled = items.length < 2;
  }

  $('#merge').onclick = async () => {
    const btn = $('#merge');
    const status = $('#status');
    btn.disabled = true;
    status.className = 'status';
    try {
      const out = await PDFLib.PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        status.textContent = `Merging file ${i + 1} of ${items.length}…`;
        const src = await PDFLib.PDFDocument.load(items[i].bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      download(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf');
      status.className = 'status is-ok';
      status.textContent = `Done! Merged ${items.length} files into ${out.getPageCount()} pages (${formatBytes(bytes.length)}).`;
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      btn.disabled = items.length < 2;
    }
  };

  $('#clear').onclick = () => { items.length = 0; render(); $('#status').textContent = ''; };
})();
