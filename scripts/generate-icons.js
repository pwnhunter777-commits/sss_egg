import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create Brand SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="egg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="60%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="220" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/>
  <path d="M 256 90 C 180 90, 140 210, 140 310 C 140 395, 190 435, 256 435 C 322 435, 372 395, 372 310 C 372 210, 332 90, 256 90 Z" fill="url(#egg)" filter="url(#shadow)"/>
  <path d="M 230 140 C 200 160, 180 230, 180 280 C 180 250, 195 190, 220 155 C 224 150, 227 145, 230 140 Z" fill="#ffffff" opacity="0.4"/>
  <text x="256" y="475" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="3">SSS EGG</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate raw PNG
function createPng(width, height, isMaskable = false) {
  // CRC table for PNG chunks
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    buf.writeUInt32BE(crc32(typeAndData), 8 + len);
    return buf;
  }

  // Draw pixel by pixel: SSS Egg Agency logo in deep blue with gold egg
  // Scanlines: 1 filter byte (0) + 4 bytes per pixel (RGBA)
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.36 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Background gradient: #1e3a8a (top) to #0f172a (bottom)
      const gradRatio = y / height;
      let r = Math.round(30 * (1 - gradRatio) + 15 * gradRatio);
      let g = Math.round(58 * (1 - gradRatio) + 23 * gradRatio);
      let b = Math.round(138 * (1 - gradRatio) + 42 * gradRatio);
      let a = 255;

      // Egg curve equation: (x-cx)^2 / (rx*(1 - 0.2*(y-cy)/ry))^2 + (y-cy)^2 / ry^2 <= 1
      const dy = (y - cy) / radius;
      const taper = 1.0 - 0.28 * dy;
      const dx = (x - cx) / (radius * 0.72 * Math.max(0.5, taper));
      const distSq = dx * dx + dy * dy;

      if (distSq <= 1.0) {
        // Inside Egg: Gold Gradient (#f59e0b to #d97706) with soft edge
        const eggRatio = (dy + 1) / 2;
        const baseR = Math.round(254 * (1 - eggRatio) + 217 * eggRatio);
        const baseG = Math.round(240 * (1 - eggRatio) + 119 * eggRatio);
        const baseB = Math.round(138 * (1 - eggRatio) + 6 * eggRatio);

        // Highlight sheen on top left
        const hlX = (x - (cx - radius * 0.2)) / (radius * 0.35);
        const hlY = (y - (cy - radius * 0.35)) / (radius * 0.45);
        const isHighlight = (hlX * hlX + hlY * hlY) <= 0.6;

        if (isHighlight) {
          r = 255;
          g = 255;
          b = 255;
        } else {
          r = baseR;
          g = baseG;
          b = baseB;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all standard PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('All PWA icons generated successfully in public/');
