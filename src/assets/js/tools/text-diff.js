(function () {
  const { $, escapeHtml } = window.TS;
  const CONTEXT = 3;

  // Myers O(ND) diff over arrays of comparable keys.
  // Returns ops: { t: '=' | '-' | '+', a?: index in a, b?: index in b }, in order.
  function myers(a, b) {
    const n = a.length, m = b.length, max = n + m, off = max + 1;
    const v = new Int32Array(2 * max + 3);
    const trace = [];
    outer: for (let d = 0; d <= max; d++) {
      trace.push(v.slice(off - d - 1, off + d + 2)); // k range [-d-1, d+1]
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) break outer;
      }
    }
    const ops = [];
    let x = n, y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
      const t = trace[d];
      const at = (k) => t[k + d + 1];
      const k = x - y;
      const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
      const prevX = at(prevK);
      const prevY = prevX - prevK;
      while (x > prevX && y > prevY) { x--; y--; ops.push({ t: '=', a: x, b: y }); }
      if (d > 0) {
        if (x === prevX) ops.push({ t: '+', b: prevY });
        else ops.push({ t: '-', a: prevX });
      }
      x = prevX;
      y = prevY;
    }
    return ops.reverse();
  }

  // Highlight changed words between a removed line and its added replacement.
  function wordDiff(oldLine, newLine) {
    const tok = (s) => s.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) || [];
    const a = tok(oldLine), b = tok(newLine);
    if (a.length * b.length > 250000) return [escapeHtml(oldLine), escapeHtml(newLine)];
    let left = '', right = '';
    for (const op of myers(a, b)) {
      if (op.t === '=') { left += escapeHtml(a[op.a]); right += escapeHtml(b[op.b]); }
      else if (op.t === '-') left += `<mark>${escapeHtml(a[op.a])}</mark>`;
      else right += `<mark>${escapeHtml(b[op.b])}</mark>`;
    }
    return [left, right];
  }

  function compare() {
    const A = $('#a').value.split(/\r?\n/);
    const B = $('#b').value.split(/\r?\n/);
    const norm = (s) => {
      if ($('#ignore-space').checked) s = s.replace(/\s+/g, ' ').trim();
      if ($('#ignore-case').checked) s = s.toLowerCase();
      return s;
    };
    // Map each distinct normalized line to an integer so comparisons are cheap.
    const ids = new Map();
    const key = (s) => { const k = norm(s); if (!ids.has(k)) ids.set(k, ids.size); return ids.get(k); };
    const ops = myers(A.map(key), B.map(key));

    // Build rows, pairing runs of deletions with following insertions for word-level highlights.
    const rows = [];
    for (let i = 0; i < ops.length;) {
      if (ops[i].t === '=') { rows.push({ t: '=', a: ops[i].a, b: ops[i].b, html: escapeHtml(A[ops[i].a]) }); i++; continue; }
      const dels = [], adds = [];
      while (i < ops.length && ops[i].t === '-') dels.push(ops[i++].a);
      while (i < ops.length && ops[i].t === '+') adds.push(ops[i++].b);
      const pairs = Math.min(dels.length, adds.length);
      const delHtml = dels.map((d) => escapeHtml(A[d]));
      const addHtml = adds.map((d) => escapeHtml(B[d]));
      for (let p = 0; p < pairs; p++) [delHtml[p], addHtml[p]] = wordDiff(A[dels[p]], B[adds[p]]);
      dels.forEach((d, j) => rows.push({ t: '-', a: d, html: delHtml[j] }));
      adds.forEach((d, j) => rows.push({ t: '+', b: d, html: addHtml[j] }));
    }

    const added = rows.filter((r) => r.t === '+').length;
    const removed = rows.filter((r) => r.t === '-').length;
    const summary = $('#summary');
    if (!added && !removed) {
      summary.className = 'status is-ok';
      summary.textContent = '✓ The texts are identical' + ($('#ignore-case').checked || $('#ignore-space').checked ? ' (with the selected options).' : '.');
      $('#result').hidden = true;
      return;
    }
    summary.className = 'status';
    summary.innerHTML = `<span class="good">+${added} added</span> · <span class="bad">−${removed} removed</span> line${added + removed === 1 ? '' : 's'}`;

    // Optionally collapse unchanged runs, keeping CONTEXT lines around each change.
    const keep = rows.map(() => !$('#only-changes').checked);
    if (!keep[0] && rows.length) {
      rows.forEach((r, i) => {
        if (r.t === '=') return;
        for (let j = Math.max(0, i - CONTEXT); j <= Math.min(rows.length - 1, i + CONTEXT); j++) keep[j] = true;
      });
    }
    let html = '<table class="diff"><tbody>';
    let skipped = 0;
    rows.forEach((r, i) => {
      if (!keep[i]) { skipped++; return; }
      if (skipped) { html += `<tr class="gap"><td colspan="4">⋯ ${skipped} unchanged line${skipped === 1 ? '' : 's'} ⋯</td></tr>`; skipped = 0; }
      const cls = r.t === '+' ? 'add' : r.t === '-' ? 'del' : '';
      html += `<tr class="${cls}"><td class="ln">${r.a !== undefined ? r.a + 1 : ''}</td><td class="ln">${r.b !== undefined ? r.b + 1 : ''}</td><td class="sign">${r.t === '=' ? ' ' : r.t === '-' ? '−' : '+'}</td><td>${r.html || ' '}</td></tr>`;
    });
    if (skipped) html += `<tr class="gap"><td colspan="4">⋯ ${skipped} unchanged line${skipped === 1 ? '' : 's'} ⋯</td></tr>`;
    $('#result').innerHTML = html + '</tbody></table>';
    $('#result').hidden = false;
  }

  $('#compare').onclick = compare;
  ['#ignore-case', '#ignore-space', '#only-changes'].forEach((id) => $(id).addEventListener('change', () => {
    if (!$('#result').hidden || $('#summary').textContent) compare();
  }));
  $('#swap').onclick = () => { [$('#a').value, $('#b').value] = [$('#b').value, $('#a').value]; compare(); };
  $('#clear').onclick = () => {
    $('#a').value = $('#b').value = '';
    $('#summary').textContent = '';
    $('#result').hidden = true;
  };
})();
