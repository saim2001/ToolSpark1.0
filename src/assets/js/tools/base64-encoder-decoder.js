(function () {
  const { $, copyText, dropzone, formatBytes } = window.TS;
  const input = $('#input');
  const output = $('#output');
  const status = $('#status');

  const setStatus = (msg, cls = '') => { status.className = 'status ' + cls; status.textContent = msg; };

  function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  $('#encode').onclick = () => {
    let b64 = bytesToBase64(new TextEncoder().encode(input.value));
    if ($('#url-safe').checked) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    output.value = b64;
    setStatus(`Encoded ${input.value.length.toLocaleString()} characters`, 'is-ok');
  };

  $('#decode').onclick = () => {
    let s = input.value.trim().replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    try {
      const bin = atob(s);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      output.value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      setStatus('Decoded successfully', 'is-ok');
    } catch (err) {
      setStatus(err.name === 'TypeError'
        ? 'Decoded data is binary (not text) — it may be an image or file.'
        : 'Not valid Base64. Check for missing or extra characters.', 'is-error');
    }
  };

  $('#swap').onclick = () => { [input.value, output.value] = [output.value, input.value]; };
  $('#copy').onclick = () => copyText(output.value);
  $('#clear').onclick = () => { input.value = output.value = ''; setStatus(''); input.focus(); };

  dropzone($('.dropzone'), ([file]) => {
    const reader = new FileReader();
    reader.onload = () => {
      output.value = reader.result;
      setStatus(`${file.name} (${formatBytes(file.size)}) → ${formatBytes(reader.result.length)} data URL`, 'is-ok');
    };
    reader.onerror = () => setStatus('Could not read that file', 'is-error');
    reader.readAsDataURL(file);
  });
})();
