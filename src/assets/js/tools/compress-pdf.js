(function () {
  const { $, formatBytes, dropzone, download, toast, openPdf, renderPdfPage, pdfLoadError, canvasToBlob } = window.TS;
  let pdf = null;
  let original = null; // File
  let output = null;   // Blob

  dropzone($('.dropzone'), async ([file]) => {
    try {
      pdf = await openPdf(await file.arrayBuffer());
    } catch (err) {
      return toast(pdfLoadError(err, file.name));
    }
    original = file;
    $('#info').textContent = `${file.name} · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    $('.dropzone').hidden = true;
    $('#options').hidden = false;
  });

  function grayscale(canvas) {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i + 1] = d[i + 2] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    ctx.putImageData(data, 0, 0);
  }

  $('#compress').onclick = async () => {
    const status = $('#status');
    const [dpi, quality] = $('#level').value.split(',').map(Number);
    $('#compress').disabled = true;
    $('#result').hidden = true;
    status.className = 'status';
    try {
      const out = await PDFLib.PDFDocument.create();
      for (let n = 1; n <= pdf.numPages; n++) {
        status.textContent = `Compressing page ${n} of ${pdf.numPages}…`;
        const page = await pdf.getPage(n);
        const { width, height } = page.getViewport({ scale: 1 }); // in PDF points, rotation applied
        const canvas = await renderPdfPage(pdf, n, dpi / 72);
        if ($('#gray').checked) grayscale(canvas);
        const jpg = await out.embedJpg(await (await canvasToBlob(canvas, 'image/jpeg', quality)).arrayBuffer());
        out.addPage([width, height]).drawImage(jpg, { x: 0, y: 0, width, height });
      }
      output = new Blob([await out.save()], { type: 'application/pdf' });
      const saved = 1 - output.size / original.size;
      if (saved <= 0.02) {
        status.className = 'status is-error';
        status.textContent = `This PDF is already well optimized — compressing it would give ${formatBytes(output.size)} (original ${formatBytes(original.size)}). Keep your original file.`;
      } else {
        status.className = 'status is-ok';
        status.textContent = `${formatBytes(original.size)} → ${formatBytes(output.size)} (${Math.round(saved * 100)}% smaller)`;
        $('#result').hidden = false;
      }
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      $('#compress').disabled = false;
    }
  };

  $('#download').onclick = () => {
    if (output) download(output, original.name.replace(/\.pdf$/i, '') + '-compressed.pdf');
  };

  $('#reset').onclick = () => {
    if (pdf) pdf.destroy();
    pdf = original = output = null;
    $('#status').textContent = '';
    $('#result').hidden = true;
    $('#options').hidden = true;
    $('.dropzone').hidden = false;
  };
})();
