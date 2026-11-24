(function () {
  const { $, copyText, escapeHtml } = window.TS;
  const text = $('#text');
  const STOP = new Set('a an and are as at be but by for from has have he her his i in is it its of on or our she so that the their them they this to was we were what which who will with you your not no do does did can could would should than then there these those been being am if into about up out just also more most very'.split(' '));

  const fmtTime = (min) => (min < 1 ? Math.ceil(min * 60) + ' sec' : Math.round(min) + ' min');

  function update() {
    const v = text.value;
    const words = v.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
    $('#words').textContent = words.length.toLocaleString();
    $('#chars').textContent = [...v].length.toLocaleString();
    $('#chars-ns').textContent = [...v.replace(/\s/g, '')].length.toLocaleString();
    $('#sentences').textContent = (v.match(/[^.!?…]*[\p{L}\p{N}][^.!?…]*(?:[.!?…]+|$)/gu) || []).length.toLocaleString();
    $('#paragraphs').textContent = v.split(/\n+/).filter((p) => p.trim()).length.toLocaleString();
    $('#reading').textContent = words.length ? fmtTime(words.length / 238) : '0 min';
    $('#speaking').textContent = words.length ? fmtTime(words.length / 140) : '0 min';

    const freq = new Map();
    for (const w of words) {
      const k = w.toLowerCase();
      if (k.length > 2 && !STOP.has(k) && !/^\d+$/.test(k)) freq.set(k, (freq.get(k) || 0) + 1);
    }
    const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 10).filter(([, n]) => n > 1);
    $('#keywords-wrap').hidden = !top.length;
    $('#keywords').innerHTML = top.map(([w, n]) =>
      `<span class="btn btn--ghost btn--sm" style="cursor:default">${escapeHtml(w)} · ${n} (${((n / words.length) * 100).toFixed(1)}%)</span>`).join('');
  }

  text.addEventListener('input', update);
  $('#copy').onclick = () => copyText(text.value);
  $('#clear').onclick = () => { text.value = ''; update(); text.focus(); };
  update();
})();
