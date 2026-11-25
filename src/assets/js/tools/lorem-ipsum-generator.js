(function () {
  const { $, copyText } = window.TS;
  const CLASSIC = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum ' +
    'curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra eros bibendum elit nec luctus magna felis sollicitudin mauris integer dignissim viverra metus vestibulum volutpat pretium libero cras posuere sapien quam sagittis rhoncus mattis porta fermentum suscipit morbi semper faucibus accumsan').split(' ');

  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = () => WORDS[rand(0, WORDS.length - 1)];

  function sentence() {
    const n = rand(6, 15);
    const words = [];
    for (let i = 0; i < n; i++) words.push(pick());
    if (n > 9) words[rand(3, n - 4)] += ','; // an occasional comma reads more naturally
    const s = words.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  function paragraph(first) {
    const sentences = [];
    const n = rand(4, 8);
    for (let i = 0; i < n; i++) sentences.push(first && i === 0 ? CLASSIC : sentence());
    return sentences.join(' ');
  }

  function generate() {
    const count = Math.min(500, Math.max(1, parseInt($('#count').value, 10) || 1));
    const unit = $('#unit').value;
    const classic = $('#classic').checked;
    let blocks;
    if (unit === 'paragraphs') {
      blocks = Array.from({ length: count }, (_, i) => paragraph(classic && i === 0));
    } else if (unit === 'sentences') {
      blocks = [Array.from({ length: count }, (_, i) => (classic && i === 0 ? CLASSIC : sentence())).join(' ')];
    } else {
      const words = classic ? CLASSIC.replace(/[.,]/g, '').toLowerCase().split(' ') : [];
      while (words.length < count) words.push(pick());
      const text = words.slice(0, count).join(' ');
      blocks = [text.charAt(0).toUpperCase() + text.slice(1) + '.'];
    }
    $('#output').value = $('#html').checked ? blocks.map((b) => `<p>${b}</p>`).join('\n\n') : blocks.join('\n\n');
    const text = blocks.join(' ');
    $('#stats').textContent = `${text.split(/\s+/).length.toLocaleString()} words · ${text.length.toLocaleString()} characters`;
  }

  $('#generate').onclick = generate;
  ['#unit', '#classic', '#html', '#count'].forEach((id) => $(id).addEventListener('change', generate));
  $('#copy').onclick = () => copyText($('#output').value);
  generate();
})();
