// Minimal store-only ZIP writer (no compression; JPEGs are already compressed).
const ZipLite = (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function make(files) { // files: [{name, data: Blob|string}]
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const D = new Date(), dd = ((D.getFullYear() - 1980) << 9) | ((D.getMonth() + 1) << 5) | D.getDate(), dt = (D.getHours() << 11) | (D.getMinutes() << 5);
    for (const f of files) {
      const data = typeof f.data === 'string' ? enc.encode(f.data) : new Uint8Array(await f.data.arrayBuffer());
      const name = enc.encode(f.name), c = crc(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(h, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, c, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(ch, name); off += 30 + name.length + data.length;
    }
    const csize = central.reduce((s, x) => s + x.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  return { make };
})();
