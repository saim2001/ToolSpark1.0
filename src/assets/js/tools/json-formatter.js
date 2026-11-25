(function () {
  const { $, copyText, download } = window.TS;
  const input = $('#input');
  const output = $('#output');
  const status = $('#status');
  const SAMPLE = '{"site":"KitKettle","free":true,"tools":[{"name":"JSON Formatter","category":"utility"},{"name":"Merge PDF","category":"pdf"}],"stats":{"users":null,"rating":4.9}}';

  const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

  // Turn a JSON.parse error into "line X, column Y" where possible (message formats differ by browser).
  function locate(err, text) {
    let m = err.message.match(/line (\d+) column (\d+)/i);
    if (m) return { line: +m[1], col: +m[2] };
    m = err.message.match(/position (\d+)/i);
    if (!m) return null;
    const before = text.slice(0, +m[1]).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1, pos: +m[1] };
  }

  function parse() {
    const text = input.value;
    if (!text.trim()) {
      status.className = 'status';
      status.textContent = '';
      return undefined;
    }
    try {
      const value = JSON.parse(text);
      status.className = 'status is-ok';
      status.textContent = '✓ Valid JSON';
      return $('#sort-keys').checked ? sortKeys(value) : value;
    } catch (err) {
      const loc = locate(err, text);
      status.className = 'status is-error';
      status.textContent = '✗ ' + err.message.replace(/^JSON\.parse: /, '') + (loc && !/line \d+/i.test(err.message) ? ` (line ${loc.line}, column ${loc.col})` : '');
      return { error: true, loc };
    }
  }

  function run(minify) {
    const v = parse();
    if (v === undefined) { output.value = ''; return; }
    if (v && v.error) {
      if (v.loc && v.loc.pos !== undefined) { input.focus(); input.setSelectionRange(v.loc.pos, v.loc.pos + 1); }
      return;
    }
    const indent = $('#indent').value === 'tab' ? '\t' : Number($('#indent').value);
    output.value = minify ? JSON.stringify(v) : JSON.stringify(v, null, indent);
  }

  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(parse, 250); });
  $('#format').onclick = () => run(false);
  $('#minify').onclick = () => run(true);
  $('#indent').addEventListener('change', () => output.value && run(false));
  $('#sort-keys').addEventListener('change', () => output.value && run(false));
  $('#copy').onclick = () => copyText(output.value);
  $('#download').onclick = () => download(new Blob([output.value || input.value], { type: 'application/json' }), 'formatted.json');
  $('#sample').onclick = () => { input.value = SAMPLE; run(false); };
  $('#clear').onclick = () => { input.value = output.value = ''; parse(); input.focus(); };
})();
