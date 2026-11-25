(function () {
  const { $, formatBytes, dropzone, download, toast, openPdf, renderPdfPage, pdfLoadError, canvasToBlob } = window.TS;
  const grid = $('#grid');
  let bytes = null;
  let fileName = '';
  let rotations = []; // extra clockwise rotation per page, in degrees
  let thumbs = [];
  let renderToken = 0;

  dropzone($('.dropzone'), async ([file]) => {
    let pdf;
    try {
      bytes = await file.arrayBuffer();
      pdf = await openPdf(bytes);
    } catch (err) {
      return toast(pdfLoadError(err, file.name));
    }
    fileName = file.name;
    $('#info').textContent = `${file.name} · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    $('.dropzone').hidden = true;
    $('#options').hidden = false;
    rotations = new Array(pdf.numPages).fill(0);
    grid.innerHTML = '';
    thumbs = rotations.map((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-thumb';
      btn.innerHTML = `<span class="page-thumb__frame"><img alt="Page ${i + 1}"></span><span>Page ${i + 1}</span>`;
      btn.onclick = () => { rotations[i] = (rotations[i] + 90) % 360; update(); };
      grid.appendChild(btn);
      return $('img', btn);
    });
    // Render thumbnails one at a time; stop if another file is loaded meanwhile.
    const token = ++renderToken;
    for (let n = 1; n <= pdf.numPages && token === renderToken; n++) {
      const page = await pdf.getPage(n);
      const scale = 160 / Math.max(page.getViewport({ scale: 1 }).width, page.getViewport({ scale: 1 }).height);
      const canvas = await renderPdfPage(pdf, n, scale);
      if (token === renderToken) thumbs[n - 1].src = URL.createObjectURL(await canvasToBlob(canvas, 'image/jpeg', 0.8));
    }
    pdf.destroy();
  });

  function update() {
    thumbs.forEach((img, i) => { img.style.transform = `rotate(${rotations[i]}deg)`; });
  }

  $('#all-left').onclick = () => { rotations = rotations.map((r) => (r + 270) % 360); update(); };
  $('#all-right').onclick = () => { rotations = rotations.map((r) => (r + 90) % 360); update(); };
  $('#clear-rot').onclick = () => { rotations = rotations.map(() => 0); update(); };

  $('#save').onclick = async () => {
    const status = $('#status');
    $('#save').disabled = true;
    try {
      const doc = await PDFLib.PDFDocument.load(bytes);
      doc.getPages().forEach((page, i) => {
        if (rotations[i]) page.setRotation(PDFLib.degrees((page.getRotation().angle + rotations[i]) % 360));
      });
      download(new Blob([await doc.save()], { type: 'application/pdf' }), fileName.replace(/\.pdf$/i, '') + '-rotated.pdf');
      status.className = 'status is-ok';
      status.textContent = `Done! ${rotations.filter(Boolean).length} page(s) rotated.`;
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      $('#save').disabled = false;
    }
  };

  $('#reset').onclick = () => {
    renderToken++;
    thumbs.forEach((img) => img.src && URL.revokeObjectURL(img.src));
    bytes = null;
    thumbs = rotations = [];
    grid.innerHTML = '';
    $('#status').textContent = '';
    $('#options').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
