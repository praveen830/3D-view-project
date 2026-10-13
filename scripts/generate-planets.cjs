const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xEDB88320);
    }
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(h * (w * 4 + 1));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      raw[offset++] = rgba[idx];
      raw[offset++] = rgba[idx + 1];
      raw[offset++] = rgba[idx + 2];
      raw[offset++] = rgba[idx + 3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function pseudoNoise(x, y, seed = 1) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, s = 1) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sX = fx * fx * (3 - 2 * fx);
  const sY = fy * fy * (3 - 2 * fy);

  const n00 = pseudoNoise(i, j, s);
  const n10 = pseudoNoise(i + 1, j, s);
  const n01 = pseudoNoise(i, j + 1, s);
  const n11 = pseudoNoise(i + 1, j + 1, s);

  const top = n00 * (1 - sX) + n10 * sX;
  const bottom = n01 * (1 - sX) + n11 * sX;
  return top * (1 - sY) + bottom * sY;
}

function fractalNoise(x, y, octaves = 5, seed = 1) {
  let val = 0;
  let freq = 1;
  let amp = 0.5;
  for (let o = 0; o < octaves; o++) {
    val += smoothNoise(x * freq, y * freq, seed + o * 13) * amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

// Planetary Shader models
const planetShaders = {
  sun: (lon, lat) => {
    const f1 = fractalNoise(lon * 8, lat * 8, 4, 11);
    const f2 = fractalNoise(lon * 16, lat * 16, 3, 22);
    const flare = Math.sin(lon * 20 + lat * 10) * 0.15;
    const heat = Math.min(1.0, Math.max(0.0, 0.75 + f1 * 0.35 + f2 * 0.15 + flare));
    return [
      255,
      Math.floor(180 + heat * 65),
      Math.floor(20 + heat * 80)
    ];
  },

  mercury: (lon, lat) => {
    const n = fractalNoise(lon * 6, lat * 6, 5, 31);
    const crater = fractalNoise(lon * 12, lat * 12, 3, 91);
    const cVal = crater > 0.68 ? 25 : 0;
    const base = Math.floor(130 + n * 55 - cVal);
    return [Math.floor(base * 1.05), Math.floor(base * 0.98), Math.floor(base * 0.92)];
  },

  venus: (lon, lat) => {
    const bands = Math.sin(lat * 8 + Math.cos(lon * 4) * 1.5);
    const n = fractalNoise(lon * 4, lat * 4, 4, 45);
    const val = 210 + bands * 25 + n * 20;
    return [
      Math.min(255, Math.floor(val * 1.05)),
      Math.min(255, Math.floor(val * 0.88)),
      Math.min(255, Math.floor(val * 0.65))
    ];
  },

  earth: (lon, lat) => {
    // Polar ice caps
    if (Math.abs(lat) > 0.82) {
      const iceNoise = fractalNoise(lon * 5, lat * 5, 3, 77);
      return [245 + Math.floor(iceNoise * 10), 248 + Math.floor(iceNoise * 7), 255];
    }
    // Landmass noise
    const land = fractalNoise(lon * 2.8, lat * 2.8, 5, 88);
    const isLand = land > 0.46;
    const cloud = fractalNoise(lon * 4.2 + 0.5, lat * 4.2, 4, 12);
    const hasCloud = cloud > 0.62;

    if (hasCloud) {
      return [250, 252, 255];
    }
    if (isLand) {
      const arid = fractalNoise(lon * 5, lat * 5, 3, 33);
      if (arid > 0.55 || Math.abs(lat) < 0.25) {
        // Savanna / ochre desert
        return [195, 160, 95];
      }
      // Lush vegetation green
      return [48, 128, 58];
    } else {
      // Ocean deep blue
      const depth = fractalNoise(lon * 3, lat * 3, 3, 99);
      return [18 + Math.floor(depth * 15), 58 + Math.floor(depth * 30), 155 + Math.floor(depth * 45)];
    }
  },

  moon: (lon, lat) => {
    const n = fractalNoise(lon * 5, lat * 5, 5, 101);
    const maria = fractalNoise(lon * 2, lat * 2, 4, 29) > 0.52;
    const base = maria ? 75 + n * 35 : 185 + n * 50;
    return [Math.floor(base), Math.floor(base * 0.98), Math.floor(base * 0.96)];
  },

  mars: (lon, lat) => {
    if (Math.abs(lat) > 0.86) {
      return [250, 245, 248]; // North/south polar caps
    }
    const n = fractalNoise(lon * 4.5, lat * 4.5, 5, 62);
    const darkLowland = fractalNoise(lon * 2.5, lat * 2.5, 4, 19) > 0.56;
    if (darkLowland) {
      // Syrtis Major basalt dark volcanic terrain
      const v = Math.floor(110 + n * 35);
      return [Math.floor(v * 1.15), Math.floor(v * 0.78), Math.floor(v * 0.65)];
    }
    // Red oxide sands
    const r = Math.floor(195 + n * 38);
    return [Math.min(255, r + 20), Math.floor(r * 0.58), Math.floor(r * 0.38)];
  },

  jupiter: (lon, lat) => {
    // Banded gas giant belts
    const bandFreq = 16;
    const band = Math.sin(lat * bandFreq + fractalNoise(lon * 6, lat * 3, 3, 15) * 2.5);
    const n = fractalNoise(lon * 8, lat * 8, 4, 42);
    
    // Great Red Spot at lon ~ 0.25, lat ~ -0.28
    const dGRS = Math.hypot((lon - 0.22) * 1.8, (lat - (-0.28)) * 3.5);
    if (dGRS < 0.22) {
      const grsNoise = fractalNoise(lon * 12, lat * 12, 3, 77);
      return [225 + Math.floor(grsNoise * 25), 65 + Math.floor(grsNoise * 30), 40 + Math.floor(grsNoise * 20)];
    }

    if (band > 0.15) {
      // Warm brownish-red belt
      const v = 175 + n * 30;
      return [Math.floor(v * 1.15), Math.floor(v * 0.76), Math.floor(v * 0.52)];
    } else {
      // Pale cream/ivory ammonia cloud zone
      const v = 225 + n * 22;
      return [Math.min(255, v + 10), Math.floor(v * 0.95), Math.floor(v * 0.82)];
    }
  },

  saturn: (lon, lat) => {
    const band = Math.sin(lat * 18 + fractalNoise(lon * 4, lat * 2, 2, 10) * 0.8);
    const n = fractalNoise(lon * 4, lat * 4, 3, 50);
    const v = 215 + band * 22 + n * 15;
    return [
      Math.min(255, Math.floor(v * 1.12)),
      Math.min(255, Math.floor(v * 0.98)),
      Math.min(255, Math.floor(v * 0.72))
    ];
  },

  uranus: (lon, lat) => {
    const n = fractalNoise(lon * 3, lat * 3, 3, 88);
    const band = Math.sin(lat * 6) * 12;
    const v = 185 + n * 20 + band;
    return [
      Math.floor(v * 0.72),
      Math.min(255, Math.floor(v * 1.05)),
      Math.min(255, Math.floor(v * 1.18))
    ];
  },

  neptune: (lon, lat) => {
    const n = fractalNoise(lon * 4, lat * 4, 4, 33);
    const storms = fractalNoise(lon * 10, lat * 10, 2, 91) > 0.72;
    // Great Dark Spot
    const dDark = Math.hypot((lon - (-0.15)) * 1.5, (lat - (-0.25)) * 3.0);
    if (dDark < 0.18) {
      return [25, 45, 140];
    }
    if (storms) {
      return [230, 245, 255]; // Cirrus methane clouds
    }
    const v = 160 + n * 30;
    return [
      Math.floor(v * 0.35),
      Math.floor(v * 0.65),
      Math.min(255, Math.floor(v * 1.45))
    ];
  },

  pluto: (lon, lat) => {
    const n = fractalNoise(lon * 5, lat * 5, 5, 12);
    // Tombaugh Regio bright nitrogen ice heart
    const dHeart = Math.hypot((lon - 0.1) * 1.2, (lat - 0.05) * 1.5);
    if (dHeart < 0.32) {
      return [245, 238, 225];
    }
    // Cthulhu Macula dark reddish-brown tholins
    const v = 110 + n * 40;
    return [Math.floor(v * 1.25), Math.floor(v * 0.75), Math.floor(v * 0.55)];
  }
};

// Render 3D Spherical Globe with Lambertian Lighting & Limb Darkening
function generatePlanetPortrait(id, size = 384) {
  const shader = planetShaders[id] || planetShaders.earth;
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.40;
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Key light direction
  const lx = -0.6;
  const ly = -0.4;
  const lz = 0.68;
  const lLen = Math.hypot(lx, ly, lz);
  const lightDir = [lx / lLen, ly / lLen, lz / lLen];

  const hasRings = id === 'saturn';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const d2 = dx * dx + dy * dy;

      let r = 5, g = 8, b = 16, a = 255;

      // Saturn Rings Check (Front and Back projection)
      // Ring plane inclined ~24 deg: y_ring = dy * cos(tilt) + dz * sin(tilt)
      const ringTilt = 0.42;
      const ringY = dy / Math.sin(ringTilt);
      const ringDist = Math.hypot(dx, ringY);
      const isRing = hasRings && ringDist >= 1.25 && ringDist <= 2.25;

      if (d2 <= 1.0) {
        // Pixel is on the planet sphere
        const dz = Math.sqrt(1.0 - d2);

        // Spherical coordinates
        const lon = Math.atan2(dx, dz) / Math.PI;
        const lat = -dy;

        const baseCol = shader(lon, lat);

        let diffuse = 1.0;
        let limb = 1.0;

        if (id === 'sun') {
          // Self-luminous star: bright core, gentle limb darkening
          limb = Math.pow(dz, 0.28);
          diffuse = 1.0;
        } else {
          // Normal planet with directional sunlight
          const dot = dx * lightDir[0] + dy * lightDir[1] + dz * lightDir[2];
          diffuse = Math.max(0.05, dot);
          limb = Math.pow(dz, 0.45);
        }

        // Atmosphere halo & specular
        let atmoR = 0, atmoG = 0, atmoB = 0;
        if (id === 'earth') {
          // Soft cyan atmospheric edge
          const rim = Math.pow(1.0 - dz, 3.0) * 0.4;
          atmoR = rim * 120;
          atmoG = rim * 180;
          atmoB = rim * 255;
        } else if (id === 'venus') {
          const rim = Math.pow(1.0 - dz, 2.5) * 0.35;
          atmoR = rim * 240;
          atmoG = rim * 200;
          atmoB = rim * 100;
        } else if (id === 'sun') {
          const rim = Math.pow(1.0 - dz, 2.0) * 0.6;
          atmoR = rim * 255;
          atmoG = rim * 150;
          atmoB = rim * 30;
        }

        r = Math.min(255, Math.floor(baseCol[0] * diffuse * limb + atmoR));
        g = Math.min(255, Math.floor(baseCol[1] * diffuse * limb + atmoG));
        b = Math.min(255, Math.floor(baseCol[2] * diffuse * limb + atmoB));
      } else if (isRing) {
        // Saturn Rings outside planet
        const ringNorm = (ringDist - 1.25) / 1.0;
        const cassiniGap = ringNorm > 0.48 && ringNorm < 0.56;
        if (!cassiniGap) {
          const rBrightness = Math.sin(ringNorm * Math.PI) * 0.85 + 0.15;
          r = Math.floor(210 * rBrightness);
          g = Math.floor(185 * rBrightness);
          b = Math.floor(135 * rBrightness);
        }
      } else if (id === 'sun' && d2 <= 1.25) {
        // Solar coronal glow
        const glow = Math.pow(1.0 - (d2 - 1.0) / 0.25, 2.0) * 0.65;
        r = Math.min(255, Math.floor(glow * 255));
        g = Math.min(255, Math.floor(glow * 140));
        b = Math.min(255, Math.floor(glow * 30));
      } else if (id === 'earth' && d2 <= 1.06) {
        // Earth atmospheric glow ring
        const glow = Math.pow(1.0 - (d2 - 1.0) / 0.06, 2.0) * 0.45;
        r = Math.floor(glow * 60);
        g = Math.floor(glow * 140);
        b = Math.floor(glow * 255);
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return encodePNG(size, size, rgba);
}

// Ensure output directories exist
const imgDir = path.resolve(__dirname, '../public/images');
const rootPublic = path.resolve(__dirname, '../public');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const planetIds = [
  'sun', 'mercury', 'venus', 'earth', 'moon',
  'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
];

console.log('Generating photorealistic 3D planet globe portraits...');

planetIds.forEach(id => {
  const pngData = generatePlanetPortrait(id, 384);
  fs.writeFileSync(path.join(imgDir, `${id}.png`), pngData);
  fs.writeFileSync(path.join(imgDir, `${id}.jpg`), pngData);
  console.log(`✓ Generated realistic 3D globe for ${id}`);
});

// Also generate Solar System overview poster
function generateSolarSystemPoster(w = 640, h = 360) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Deep space subtle nebula gradient
      const neb = fractalNoise(x / 180, y / 180, 3, 77);
      rgba[idx] = Math.floor(10 + neb * 15);
      rgba[idx + 1] = Math.floor(15 + neb * 25);
      rgba[idx + 2] = Math.floor(35 + neb * 45);
      rgba[idx + 3] = 255;
    }
  }

  // Draw Sun on the left
  const sunX = 40, sunY = 180, sunR = 110;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - sunX, y - sunY);
      if (d <= sunR) {
        const idx = (y * w + x) * 4;
        const norm = d / sunR;
        rgba[idx] = 255;
        rgba[idx + 1] = Math.floor(220 - norm * 80);
        rgba[idx + 2] = Math.floor(120 - norm * 90);
      } else if (d <= sunR * 1.6) {
        const idx = (y * w + x) * 4;
        const glow = (1.0 - (d - sunR) / (sunR * 0.6));
        rgba[idx] = Math.min(255, rgba[idx] + Math.floor(glow * 180));
        rgba[idx + 1] = Math.min(255, rgba[idx + 1] + Math.floor(glow * 110));
        rgba[idx + 2] = Math.min(255, rgba[idx + 2] + Math.floor(glow * 30));
      }
    }
  }

  // Draw planets in orbital lineup
  const planets = [
    { name: 'mercury', x: 170, y: 180, r: 5, col: [160, 150, 140] },
    { name: 'venus',   x: 210, y: 180, r: 9, col: [225, 195, 140] },
    { name: 'earth',   x: 260, y: 180, r: 10, col: [60, 130, 240] },
    { name: 'mars',    x: 315, y: 180, r: 7, col: [215, 95, 60] },
    { name: 'jupiter', x: 395, y: 180, r: 24, col: [215, 165, 120] },
    { name: 'saturn',  x: 485, y: 180, r: 18, col: [230, 205, 150], ring: 38 },
    { name: 'uranus',  x: 560, y: 180, r: 12, col: [140, 220, 240] },
    { name: 'neptune', x: 610, y: 180, r: 12, col: [60, 110, 240] }
  ];

  planets.forEach(p => {
    // Rings for Saturn
    if (p.ring) {
      for (let rx = -p.ring; rx <= p.ring; rx++) {
        for (let ry = -Math.floor(p.ring * 0.35); ry <= Math.floor(p.ring * 0.35); ry++) {
          const d = Math.hypot(rx, ry / 0.35);
          if (d >= p.r * 1.3 && d <= p.ring) {
            const px = p.x + rx;
            const py = p.y + ry;
            if (px >= 0 && px < w && py >= 0 && py < h) {
              const idx = (py * w + px) * 4;
              rgba[idx] = 200;
              rgba[idx + 1] = 180;
              rgba[idx + 2] = 130;
            }
          }
        }
      }
    }
    // Planet body
    for (let py = p.y - p.r; py <= p.y + p.r; py++) {
      for (let px = p.x - p.r; px <= p.x + p.r; px++) {
        if (px >= 0 && px < w && py >= 0 && py < h) {
          const d = Math.hypot(px - p.x, py - p.y);
          if (d <= p.r) {
            const idx = (py * w + px) * 4;
            const shade = 0.5 + 0.5 * (1.0 - (px - (p.x - p.r * 0.4)) / (p.r * 2));
            rgba[idx] = Math.floor(p.col[0] * Math.max(0.2, shade));
            rgba[idx + 1] = Math.floor(p.col[1] * Math.max(0.2, shade));
            rgba[idx + 2] = Math.floor(p.col[2] * Math.max(0.2, shade));
          }
        }
      }
    }
  });

  return encodePNG(w, h, rgba);
}

const ssPoster = generateSolarSystemPoster();
fs.writeFileSync(path.join(imgDir, 'solarsystem.png'), ssPoster);
fs.writeFileSync(path.join(imgDir, 'solarsystem.jpg'), ssPoster);
console.log('✓ Generated realistic 3D Solar System overview poster');

console.log('All 3D planetary portrait generation complete!');
