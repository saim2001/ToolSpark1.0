(function () {
  const { $, copyText } = window.TS;

  // Each unit: [label, factor to the category's base unit]. Temperature is handled separately.
  const CATEGORIES = {
    length: { name: 'Length', from: 'm', to: 'ft', units: {
      mm: ['Millimeters (mm)', 0.001], cm: ['Centimeters (cm)', 0.01], m: ['Meters (m)', 1], km: ['Kilometers (km)', 1000],
      in: ['Inches (in)', 0.0254], ft: ['Feet (ft)', 0.3048], yd: ['Yards (yd)', 0.9144], mi: ['Miles (mi)', 1609.344],
      nmi: ['Nautical miles', 1852], um: ['Micrometers (µm)', 1e-6] } },
    weight: { name: 'Weight / Mass', from: 'kg', to: 'lb', units: {
      mg: ['Milligrams (mg)', 1e-6], g: ['Grams (g)', 0.001], kg: ['Kilograms (kg)', 1], t: ['Metric tons (t)', 1000],
      oz: ['Ounces (oz)', 0.028349523125], lb: ['Pounds (lb)', 0.45359237], st: ['Stone (st)', 6.35029318],
      ton: ['US tons', 907.18474], lt: ['UK long tons', 1016.0469088] } },
    temperature: { name: 'Temperature', from: 'c', to: 'f', units: {
      c: ['Celsius (°C)'], f: ['Fahrenheit (°F)'], k: ['Kelvin (K)'] } },
    volume: { name: 'Volume', from: 'l', to: 'gal', units: {
      ml: ['Milliliters (mL)', 0.001], l: ['Liters (L)', 1], m3: ['Cubic meters (m³)', 1000],
      tsp: ['Teaspoons (US)', 0.00492892159375], tbsp: ['Tablespoons (US)', 0.01478676478125],
      floz: ['Fluid ounces (US)', 0.0295735295625], cup: ['Cups (US)', 0.2365882365], pt: ['Pints (US)', 0.473176473],
      qt: ['Quarts (US)', 0.946352946], gal: ['Gallons (US)', 3.785411784], ukgal: ['Gallons (UK)', 4.54609],
      ft3: ['Cubic feet (ft³)', 28.316846592], in3: ['Cubic inches (in³)', 0.016387064] } },
    area: { name: 'Area', from: 'm2', to: 'ft2', units: {
      mm2: ['Square millimeters', 1e-6], cm2: ['Square centimeters', 1e-4], m2: ['Square meters (m²)', 1],
      ha: ['Hectares (ha)', 1e4], km2: ['Square kilometers', 1e6], in2: ['Square inches', 0.00064516],
      ft2: ['Square feet (ft²)', 0.09290304], yd2: ['Square yards', 0.83612736], ac: ['Acres', 4046.8564224],
      mi2: ['Square miles', 2589988.110336] } },
    speed: { name: 'Speed', from: 'kmh', to: 'mph', units: {
      ms: ['Meters per second (m/s)', 1], kmh: ['Kilometers per hour (km/h)', 1 / 3.6], mph: ['Miles per hour (mph)', 0.44704],
      kn: ['Knots (kn)', 1852 / 3600], fts: ['Feet per second (ft/s)', 0.3048] } },
    time: { name: 'Time', from: 'h', to: 'min', units: {
      ms: ['Milliseconds', 0.001], s: ['Seconds', 1], min: ['Minutes', 60], h: ['Hours', 3600], d: ['Days', 86400],
      wk: ['Weeks', 604800], mo: ['Months (average)', 2629746], yr: ['Years (average)', 31556952] } },
    data: { name: 'Data Storage', from: 'gb', to: 'mb', units: {
      bit: ['Bits', 0.125], b: ['Bytes (B)', 1], kb: ['Kilobytes (KB)', 1e3], mb: ['Megabytes (MB)', 1e6],
      gb: ['Gigabytes (GB)', 1e9], tb: ['Terabytes (TB)', 1e12], kib: ['Kibibytes (KiB)', 1024],
      mib: ['Mebibytes (MiB)', 1024 ** 2], gib: ['Gibibytes (GiB)', 1024 ** 3], tib: ['Tebibytes (TiB)', 1024 ** 4] } },
    pressure: { name: 'Pressure', from: 'bar', to: 'psi', units: {
      pa: ['Pascals (Pa)', 1], kpa: ['Kilopascals (kPa)', 1000], bar: ['Bar', 1e5], psi: ['PSI (lbf/in²)', 6894.757293168],
      atm: ['Atmospheres (atm)', 101325], mmhg: ['mmHg (Torr)', 133.322387415] } },
    energy: { name: 'Energy', from: 'kcal', to: 'kj', units: {
      j: ['Joules (J)', 1], kj: ['Kilojoules (kJ)', 1000], cal: ['Calories (cal)', 4.184], kcal: ['Kilocalories (kcal / food Calories)', 4184],
      wh: ['Watt-hours (Wh)', 3600], kwh: ['Kilowatt-hours (kWh)', 3.6e6], btu: ['BTU', 1055.05585262], ev: ['Electronvolts (eV)', 1.602176634e-19] } },
  };

  const TEMP_TO_C = { c: (v) => v, f: (v) => ((v - 32) * 5) / 9, k: (v) => v - 273.15 };
  const TEMP_FROM_C = { c: (v) => v, f: (v) => (v * 9) / 5 + 32, k: (v) => v + 273.15 };

  const cat = () => CATEGORIES[$('#category').value];

  function convert(value, from, to) {
    if ($('#category').value === 'temperature') return TEMP_FROM_C[to](TEMP_TO_C[from](value));
    const u = cat().units;
    return (value * u[from][1]) / u[to][1];
  }

  // Plain number for input boxes (no thousands separators), 10 significant digits.
  const plain = (x) => String(Number(x.toPrecision(10)));
  const pretty = (x) => {
    const abs = Math.abs(x);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return x.toPrecision(6).replace(/\.?0+e/, 'e');
    return x.toLocaleString('en-US', { maximumSignificantDigits: 10 });
  };
  const parse = (s) => {
    const v = Number(String(s).replace(/,/g, '').trim());
    return String(s).trim() === '' || !isFinite(v) ? null : v;
  };

  function fillUnits() {
    const c = cat();
    const options = Object.entries(c.units).map(([k, [label]]) => `<option value="${k}">${label}</option>`).join('');
    $('#from-unit').innerHTML = $('#to-unit').innerHTML = options;
    $('#from-unit').value = c.from;
    $('#to-unit').value = c.to;
    $('#all-title').textContent = `All ${c.name.toLowerCase()} conversions`;
  }

  function update(direction = 'forward') {
    const [srcIn, srcUnit, dstIn, dstUnit] = direction === 'forward'
      ? ['#from-value', '#from-unit', '#to-value', '#to-unit']
      : ['#to-value', '#to-unit', '#from-value', '#from-unit'];
    const v = parse($(srcIn).value);
    if (v === null) { $(dstIn).value = ''; $('#formula').textContent = ''; $('#all').innerHTML = ''; return; }
    $(dstIn).value = plain(convert(v, $(srcUnit).value, $(dstUnit).value));

    const from = $('#from-unit').value, to = $('#to-unit').value;
    const fv = parse($('#from-value').value);
    const label = (k) => cat().units[k][0].replace(/ \(.*\)$/, '');
    $('#formula').textContent = `${pretty(fv)} ${label(from)} = ${pretty(convert(fv, from, to))} ${label(to)}`;
    $('#all').innerHTML = Object.entries(cat().units)
      .map(([k, [name]]) => `<tr><th>${name}</th><td>${pretty(convert(fv, from, k))}</td></tr>`).join('');
  }

  $('#category').innerHTML = Object.entries(CATEGORIES).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('');
  $('#category').addEventListener('change', () => { fillUnits(); update(); });
  $('#from-value').addEventListener('input', () => update('forward'));
  $('#to-value').addEventListener('input', () => update('backward'));
  $('#from-unit').addEventListener('change', () => update('forward'));
  $('#to-unit').addEventListener('change', () => update('forward'));
  $('#swap').onclick = () => {
    const f = $('#from-unit').value;
    $('#from-unit').value = $('#to-unit').value;
    $('#to-unit').value = f;
    update('forward');
  };
  $('#copy').onclick = () => copyText($('#to-value').value);

  fillUnits();
  update();
})();
