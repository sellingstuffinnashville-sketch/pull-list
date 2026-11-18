// Home pick-list helpers: yard set-date labels and a 4-hour greedy pull estimate.
// Pure functions (no DOM). Used by the RPG and plain apps; also loaded in node tests.
(function (root) {
  const TRIP_MIN = 240;

  function scanCars(scan) {
    const cars = [];
    for (const row of (scan && scan.rows) || []) {
      for (const car of row.cars || []) cars.push(car);
    }
    return cars;
  }

  // Total minutes already include packing: $/hr = net / (pull + pack minutes).
  function partMinutes(p) {
    const net = Number(p && p.net), dph = Number(p && p.dollars_per_hour);
    if (Number.isFinite(net) && Number.isFinite(dph) && dph > 0) return (net * 60) / dph;
    return null;
  }

  // Greedy by $/hr (then net, then code): take a part if it fits in the remaining 4 hours;
  // skip ones that do not fit and keep going so leftover minutes can still be filled.
  function fourHourPull(parts, cap) {
    if (cap == null) cap = TRIP_MIN;
    const scored = (parts || []).map(p => ({
      p, min: partMinutes(p), net: Number(p && p.net) || 0, dph: Number(p && p.dollars_per_hour) || 0
    })).filter(x => x.min != null && x.min > 0)
      .sort((a, b) => b.dph - a.dph || b.net - a.net || String((a.p && a.p.code) || '').localeCompare(String((b.p && b.p.code) || '')));
    let used = 0, net = 0, n = 0;
    for (const x of scored) {
      if (used + x.min <= cap + 1e-9) { used += x.min; net += x.net; n++; }
    }
    return { net, used, n, timed: scored.length };
  }

  function setDateLabel(cars, fallback) {
    const counts = Object.create(null);
    for (const c of cars || []) {
      const d = c && c.date_set;
      if (d && /^\d{4}-\d\d-\d\d$/.test(d)) counts[d] = (counts[d] || 0) + 1;
    }
    const dates = Object.keys(counts).sort();
    if (!dates.length) return fallback || '';
    if (dates.length === 1) return dates[0];
    const last = dates[dates.length - 1];
    return dates[0].slice(0, 7) === last.slice(0, 7) ? dates[0] + '–' + last.slice(5) : dates[0] + '–' + last;
  }

  function moneyInt(n) {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return '$' + Math.round(Number(n));
  }

  function summarize(indexEntry, scan) {
    const s = indexEntry || {};
    const cars = scan ? scanCars(scan) : [];
    const parts = cars.flatMap(c => c.parts || []);
    const nCars = cars.length || s.cars || 0;
    const nParts = parts.length || s.parts || 0;
    const setDate = cars.length ? setDateLabel(cars, s.date) : (s.date || '');
    const est = parts.length ? fourHourPull(parts) : null;
    const fourHour = est && est.timed ? est.net : null;
    return { date: s.date, setDate, cars: nCars, parts: nParts, fourHour, est };
  }

  function rowText(row) {
    const d = row.setDate || row.date || '';
    const cars = row.cars === 1 ? '1 car' : (row.cars || 0) + ' cars';
    const parts = row.parts === 1 ? '1 part' : (row.parts || 0) + ' parts';
    let t = d + ' (' + cars + ', ' + parts + ')';
    const m = moneyInt(row.fourHour);
    if (m) t += ' · 4-hr pull ≈ ' + m;
    return t;
  }

  function sortRows(rows) {
    return (rows || []).slice().sort((a, b) => {
      const ad = a.setDate || a.date || '', bd = b.setDate || b.date || '';
      return bd.localeCompare(ad) || String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function splitDays(rows, keep) {
    if (keep == null) keep = 3;
    const list = sortRows(rows);
    return { recent: list.slice(0, keep), older: list.slice(keep) };
  }

  root.PLHomeList = {
    TRIP_MIN, scanCars, partMinutes, fourHourPull, setDateLabel, moneyInt, summarize, rowText, sortRows, splitDays
  };
})(typeof window !== 'undefined' ? window : globalThis);
