(function () {
  const { $, formatBytes, dropzone, download, toast } = window.TS;
  let doc = null;
  let baseName = 'document';

  dropzone($('.dropzone'), async ([file]) => {
    try {
      doc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    } catch (err) {
      return toast(/encrypt/i.test(err.message) ? 'This PDF is password-protected' : 'Could not read this PDF');
    }
    baseName = file.name.replace(/\.pdf$/i, '');
    $('#info').textContent = `${file.name} · ${doc.getPageCount()} pages · ${formatBytes(file.size)}`;
    $('#ranges').placeholder = `e.g. 1-3, 5 (pages 1–${doc.getPageCount()})`;
    $('.dropzone').hidden = true;
    $('#options').hidden = false;
  });

  // "1-3, 5" → [[0,1,2],[4]] (zero-based). Throws with a readable message on bad input.
  function parseRanges(text, count) {
    if (!text.trim()) return [Array.from({ length: count }, (_, i) => i)];
    return text.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
      const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!m) throw new Error(`"${part}" is not a valid page or range`);
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : a;
      if (a < 1 || b < 1 || a > count || b > count) throw new Error(`"${part}" is outside 1–${count}`);
      const step = a <= b ? 1 : -1;
      const pages = [];
      for (let p = a; p !== b + step; p += step) pages.push(p - 1);
      return pages;
    });
  }

  async function build(indices) {
    const out = await PDFLib.PDFDocument.create();
    (await out.copyPages(doc, indices)).forEach((p) => out.addPage(p));
    return new Blob([await out.save()], { type: 'application/pdf' });
  }

  $('#split').onclick = async () => {
    const status = $('#status');
    const btn = $('#split');
    status.className = 'status';
    let groups;
    try {
      groups = parseRanges($('#ranges').value, doc.getPageCount());
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = err.message;
      return;
    }
    const mode = $('#mode').value;
    if (mode === 'one') groups = [groups.flat()];
    else if (mode === 'each-page') groups = groups.flat().map((p) => [p]);

    btn.disabled = true;
    try {
      for (let i = 0; i < groups.length; i++) {
        status.textContent = `Creating file ${i + 1} of ${groups.length}…`;
        const g = groups[i];
        const label = g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`;
        download(await build(g), `${baseName}-${label}.pdf`);
        if (groups.length > 1) await new Promise((r) => setTimeout(r, 350));
      }
      status.className = 'status is-ok';
      status.textContent = `Done! Created ${groups.length} file${groups.length === 1 ? '' : 's'}.`;
    } catch (err) {
      status.className = 'status is-error';
      status.textContent = 'Something went wrong: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  };

  $('#reset').onclick = () => {
    doc = null;
    $('#options').hidden = true;
    $('.dropzone').hidden = false;
    $('#status').textContent = '';
    $('#ranges').value = '';
  };
})();
