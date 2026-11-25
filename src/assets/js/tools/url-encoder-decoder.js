(function () {
  const { $, copyText, escapeHtml } = window.TS;
  const input = $('#input');
  const output = $('#output');
  const status = $('#status');

  const setStatus = (msg, cls = '') => { status.className = 'status ' + cls; status.textContent = msg; };

  function breakdown(text) {
    let url;
    try {
      url = new URL(text.trim());
      if (!/^[a-z][a-z0-9+.-]*:$/i.test(url.protocol) || !url.host) throw new Error();
    } catch {
      $('#parts-wrap').hidden = true;
      return;
    }
    const row = (k, v) => `<tr><th>${k}</th><td>${escapeHtml(v)}</td></tr>`;
    let html = row('Protocol', url.protocol.replace(':', '')) + row('Host', url.hostname);
    if (url.port) html += row('Port', url.port);
    html += row('Path', decodeURIComponentSafe(url.pathname));
    for (const [k, v] of url.searchParams) html += row(`Param: ${escapeHtml(k)}`, v);
    if (url.hash) html += row('Fragment', decodeURIComponentSafe(url.hash.slice(1)));
    $('#parts').innerHTML = html;
    $('#parts-wrap').hidden = false;
  }

  function decodeURIComponentSafe(s) {
    try { return decodeURIComponent(s); } catch { return s; }
  }

  $('#encode').onclick = () => {
    output.value = encodeURIComponent(input.value);
    setStatus('Encoded as a URL component', 'is-ok');
  };
  $('#encode-uri').onclick = () => {
    try {
      output.value = encodeURI(input.value);
      setStatus('Encoded as a full URL', 'is-ok');
      breakdown(input.value);
    } catch {
      setStatus('The text contains invalid characters (unpaired surrogates).', 'is-error');
    }
  };
  $('#decode').onclick = () => {
    let s = input.value;
    if ($('#plus').checked) s = s.replace(/\+/g, ' ');
    try {
      output.value = decodeURIComponent(s);
      setStatus(/%[0-9a-f]{2}/i.test(output.value) ? 'Decoded — the result still contains encoded characters; decode again if needed.' : 'Decoded successfully', 'is-ok');
      breakdown(input.value);
    } catch {
      setStatus('Invalid percent-encoding: a % must be followed by two hex digits forming valid UTF-8.', 'is-error');
    }
  };
  $('#swap').onclick = () => { [input.value, output.value] = [output.value, input.value]; };
  $('#copy').onclick = () => copyText(output.value);
  $('#clear').onclick = () => { input.value = output.value = ''; setStatus(''); $('#parts-wrap').hidden = true; input.focus(); };
  input.addEventListener('input', () => breakdown(input.value));
})();
