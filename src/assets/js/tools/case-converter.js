(function () {
  const { $, $$, copyText } = window.TS;
  const text = $('#text');
  const SMALL = new Set('a an and as at but by for from in nor of on or per the to vs via with'.split(' '));
  let previous = null;

  // Split into words on spaces, punctuation and camelCase boundaries.
  const words = (s) => s
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  const CASES = {
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    title: (s) => s.toLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (w, offset, full) => {
      const isFirst = !/[\p{L}\p{N}]/u.test(full.slice(0, offset));
      const isLast = !/[\p{L}\p{N}]/u.test(full.slice(offset + w.length));
      return !isFirst && !isLast && SMALL.has(w) ? w : cap(w);
    }),
    sentence: (s) => s.toLowerCase()
      .replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (m, pre, ch) => pre + ch.toUpperCase())
      .replace(/\bi\b/g, 'I'),
    camel: (s) => words(s).map((w, i) => (i ? cap(w) : w.toLowerCase())).join(''),
    pascal: (s) => words(s).map(cap).join(''),
    snake: (s) => words(s).map((w) => w.toLowerCase()).join('_'),
    kebab: (s) => words(s).map((w) => w.toLowerCase()).join('-'),
    constant: (s) => words(s).map((w) => w.toUpperCase()).join('_'),
    alternating: (s) => { let i = 0; return s.replace(/\p{L}/gu, (c) => (i++ % 2 ? c.toUpperCase() : c.toLowerCase())); },
    inverse: (s) => s.replace(/\p{L}/gu, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())),
  };

  $$('#cases button').forEach((btn) => btn.addEventListener('click', () => {
    previous = text.value;
    text.value = CASES[btn.dataset.case](text.value);
    $('#undo').disabled = false;
  }));
  $('#undo').onclick = () => {
    if (previous === null) return;
    text.value = previous;
    previous = null;
    $('#undo').disabled = true;
  };
  $('#copy').onclick = () => copyText(text.value);
  $('#clear').onclick = () => { previous = text.value; text.value = ''; $('#undo').disabled = false; text.focus(); };
})();
