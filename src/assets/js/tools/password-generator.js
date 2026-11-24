(function () {
  const { $, $$, copyText } = window.TS;
  const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
  };
  const AMBIGUOUS = /[0O1lI|]/g;

  // Uniform random integer in [0, max) using rejection sampling to avoid modulo bias.
  function randInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % max;
  }

  function generate() {
    const length = Number($('#length').value);
    const noAmb = $('#no-ambiguous').checked;
    const sets = Object.keys(SETS)
      .filter((k) => $('#' + k).checked)
      .map((k) => (noAmb ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]));
    if (!sets.length) {
      $('#password').value = '';
      $('#strength').textContent = 'Select at least one character type.';
      $('#meter').style.width = '0';
      return;
    }
    const all = sets.join('');
    // Guarantee one character from each chosen set, fill the rest, then shuffle.
    const chars = sets.map((s) => s[randInt(s.length)]);
    while (chars.length < length) chars.push(all[randInt(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    $('#password').value = chars.slice(0, length).join('');

    const bits = Math.round(length * Math.log2(all.length));
    const [label, color, pct] =
      bits < 40 ? ['Weak', 'var(--danger)', 25] :
      bits < 60 ? ['Fair', '#d97706', 50] :
      bits < 80 ? ['Strong', 'var(--success)', 75] : ['Very strong', 'var(--success)', 100];
    $('#meter').style.width = pct + '%';
    $('#meter').style.background = color;
    $('#strength').textContent = `${label} · ${bits} bits of entropy`;
  }

  $('#length').addEventListener('input', () => { $('#length-out').textContent = $('#length').value; generate(); });
  $$('#tool input[type=checkbox]').forEach((el) => el.addEventListener('change', generate));
  $('#regen').onclick = generate;
  $('#copy').onclick = () => { if ($('#password').value) copyText($('#password').value); };
  generate();
})();
