(function () {
  const { $, copyText, download } = window.TS;
  const input = $('#input');
  const output = $('#output');
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  function run() {
    const ignoreCase = $('#ignore-case').checked;
    const trim = $('#trim').checked;
    const removeEmpty = $('#remove-empty').checked;
    const lines = input.value.split(/\r?\n/);
    const seen = new Set();
    let result = [];
    for (let line of lines) {
      if (trim) line = line.trim();
      if (removeEmpty && !line.trim()) continue;
      const key = ignoreCase ? line.toLowerCase() : line;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(line);
    }
    const sort = $('#sort').value;
    if (sort !== 'none') {
      result.sort(collator.compare);
      if (sort === 'desc') result.reverse();
    }
    output.value = result.join('\n');
    const total = input.value ? lines.length : 0;
    $('#summary').textContent = total
      ? `${total.toLocaleString()} lines in → ${result.length.toLocaleString()} unique lines out (${(total - result.length).toLocaleString()} removed)`
      : '';
  }

  input.addEventListener('input', run);
  ['#ignore-case', '#trim', '#remove-empty', '#sort'].forEach((id) => $(id).addEventListener('change', run));
  $('#copy').onclick = () => copyText(output.value);
  $('#download').onclick = () => download(new Blob([output.value], { type: 'text/plain' }), 'unique-lines.txt');
  $('#clear').onclick = () => { input.value = ''; run(); input.focus(); };
})();
