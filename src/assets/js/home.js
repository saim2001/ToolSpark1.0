(function () {
  const { $, $$ } = window.TS;
  const input = $('#tool-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    $$('.category').forEach((section) => {
      let visible = 0;
      $$('.tool-card', section).forEach((card) => {
        const match = !q || q.split(/\s+/).every((w) => card.dataset.search.includes(w));
        card.hidden = !match;
        if (match) visible++;
      });
      section.hidden = visible === 0;
      shown += visible;
    });
    $('#no-results').hidden = shown > 0;
  });
})();
