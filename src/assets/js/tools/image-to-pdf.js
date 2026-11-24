(function () {
  const { $, formatBytes, dropzone, loadImage, canvasToBlob, drawToCanvas, download, escapeHtml, toast } = window.TS;
  const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
  const items = []; // { file, img }

  dropzone($('.dropzone'), async (files) => {
    for (const file of files) {
      try {
        items.push({ file, img: await loadImage(file) });
      } catch (err) {
        toast(err.message);
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
      li.innerHTML = `<img class="file-item__thumb" alt="" src="${item.img.src}">
        <div class="file-item__info"><div class="file-item__name">${i + 1}. ${escapeHtml(item.file.name)}</div>
        <div class="file-item__meta">${item.img.naturalWidth} × ${item.img.naturalHeight} · ${formatBytes(item.file.size)}</div></div>
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
  }

  $('#create').onclick = async () => {
    const btn = $('#create');
    const status = $('#status');
    btn.disabled = true;
    status.className = 'status';
    try {
      const pdf = await PDFLib.PDFDocument.create();
      const sizeKey = $('#page-size').value;
      const orientation = $('#orientation').value;
      const margin = Number($('#margin').value);
      for (let i = 0; i < items.length; i++) {
        status.textContent = `Adding page ${i + 1} of ${items.length}…`;
        const { img } = items[i];
        const iw = img.naturalWidth || 1024;
        const ih = img.naturalHeight || 1024;
        // Re-encode every image as JPEG so any browser-readable format can be embedded.
        const blob = await canvasToBlob(drawToCanvas(img, iw, ih, 'image/jpeg'), 'image/jpeg', 0.92);
        const embedded = await pdf.embedJpg(await blob.arrayBuffer());

        let pw, ph;
        if (sizeKey === 'fit') {
          pw = iw * 0.75 + margin * 2; // px → pt at 96 DPI
          ph = ih * 0.75 + margin * 2;
        } else {
          [pw, ph] = SIZES[sizeKey];
          const landscape = orientation === 'landscape' || (orientation === 'auto' && iw > ih);
          if (landscape) [pw, ph] = [ph, pw];
        }
        const page = pdf.addPage([pw, ph]);
        const scale = Math.min((pw - margin * 2) / iw, (ph - margin * 2) / ih);
        const w = iw * scale;
        const h = ih * scale;
        page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
      const bytes = await pdf.save();
      download(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
      status.className = 'status is-ok';
      status.textContent = `Done! ${items.length}-page PDF created (${formatBytes(bytes.length)}).`;
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  };

  $('#clear').onclick = () => { items.length = 0; render(); $('#status').textContent = ''; };
})();
