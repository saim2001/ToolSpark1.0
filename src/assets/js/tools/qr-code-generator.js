(function () {
  const { $, $$, download } = window.TS;
  const canvas = $('#qr');
  const status = $('#status');
  const QUIET = 4; // modules of blank margin required by the QR spec
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  let qr = null;

  const wifiEscape = (s) => s.replace(/([\\;,:"])/g, '\\$1');

  function payload() {
    const v = (id) => $(id).value.trim();
    switch ($('#type').value) {
      case 'url': return v('#url') === 'https://' ? '' : v('#url');
      case 'text': return $('#text').value;
      case 'wifi': {
        if (!v('#ssid')) return '';
        const enc = $('#wifi-enc').value;
        return `WIFI:T:${enc};S:${wifiEscape(v('#ssid'))};${enc === 'nopass' ? '' : `P:${wifiEscape($('#wifi-pass').value)};`}${$('#wifi-hidden').checked ? 'H:true;' : ''};`;
      }
      case 'email': {
        if (!v('#email')) return '';
        const params = new URLSearchParams();
        if (v('#email-subject')) params.set('subject', v('#email-subject'));
        if (v('#email-body')) params.set('body', v('#email-body'));
        const q = params.toString().replace(/\+/g, '%20');
        return `mailto:${v('#email')}${q ? '?' + q : ''}`;
      }
      case 'tel': return v('#tel') ? `tel:${v('#tel').replace(/[^\d+]/g, '')}` : '';
      case 'sms': return v('#sms-tel') ? `SMSTO:${v('#sms-tel').replace(/[^\d+]/g, '')}:${v('#sms-body')}` : '';
    }
    return '';
  }

  function render() {
    const data = payload();
    const ctx = canvas.getContext('2d');
    qr = null;
    if (!data) {
      ctx.fillStyle = '#e5e5ef';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      status.className = 'status';
      status.textContent = 'Enter your details to generate a QR code';
      toggleButtons(false);
      return;
    }
    try {
      qr = qrcode(0, $('#ecl').value);
      qr.addData(data, 'Byte');
      qr.make();
    } catch {
      qr = null;
      status.className = 'status is-error';
      status.textContent = 'Too much data for a QR code — try shortening it or lowering error correction.';
      toggleButtons(false);
      return;
    }
    draw(canvas, 256);
    status.className = 'status';
    status.textContent = '';
    toggleButtons(true);
  }

  function toggleButtons(on) { $('#png').disabled = $('#svg').disabled = !on; }

  function draw(target, px) {
    const n = qr.getModuleCount();
    const total = n + QUIET * 2;
    const cell = px / total;
    target.width = target.height = px;
    const ctx = target.getContext('2d');
    ctx.fillStyle = $('#bg').value;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = $('#fg').value;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        // Round edges outward so adjacent modules don't leave hairline gaps.
        const x = Math.floor((c + QUIET) * cell);
        const y = Math.floor((r + QUIET) * cell);
        ctx.fillRect(x, y, Math.ceil((c + QUIET + 1) * cell) - x, Math.ceil((r + QUIET + 1) * cell) - y);
      }
    }
  }

  function svg() {
    const n = qr.getModuleCount();
    const total = n + QUIET * 2;
    let path = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${$('#bg').value}"/><path d="${path}" fill="${$('#fg').value}"/></svg>`;
  }

  $('#type').addEventListener('change', () => {
    $$('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== $('#type').value; });
    render();
  });
  $$('#tool input, #tool textarea, #tool select').forEach((el) => {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  $('#png').onclick = () => {
    if (!qr) return;
    const big = document.createElement('canvas');
    draw(big, Number($('#size').value));
    big.toBlob((b) => download(b, 'qr-code.png'), 'image/png');
  };
  $('#svg').onclick = () => {
    if (qr) download(new Blob([svg()], { type: 'image/svg+xml' }), 'qr-code.svg');
  };

  render();
})();
