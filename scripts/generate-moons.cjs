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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(h * (w * 4 + 1));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    raw[offset++] = 0; // filter type None
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

// Procedural noise functions
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

// Moon Surface Shaders (returns [r, g, b] in 0..255 for a given longitude/latitude coordinate)
const moonShaders = {
  luna: (lon, lat) => {
    // Earth's Moon: Titanium basalt dark maria vs ivory/silver highlands
    const n = fractalNoise(lon * 4.5, lat * 4.5, 6, 101);
    const mariaNoise = fractalNoise(lon * 1.8, lat * 1.8, 4, 29);
    const isMaria = mariaNoise > 0.52;
    
    // Tycho ray system
    const dTycho = Math.hypot(lon - 0.25, lat - (-0.45));
    const rays = Math.abs(Math.sin(Math.atan2(lat + 0.45, lon - 0.25) * 12)) * Math.exp(-dTycho * 3.5);
    
    let base = isMaria ? 68 + n * 35 : 185 + n * 55;
    if (rays > 0.35) base += 45;
    base = Math.min(255, Math.max(0, base));
    // Maria have titanium-blue basalt tones, highlands are warm neutral
    return isMaria 
      ? [Math.floor(base * 0.92), Math.floor(base * 0.96), Math.floor(base * 1.05)]
      : [Math.floor(base), Math.floor(base * 0.98), Math.floor(base * 0.95)];
  },

  phobos: (lon, lat) => {
    // Phobos: Dark carbonaceous asteroid, Stickney crater & groove striations
    const n = fractalNoise(lon * 5, lat * 5, 5, 77);
    const grooves = Math.sin(lon * 14 + lat * 6) * 0.15;
    const dStickney = Math.hypot(lon - 0.3, lat - 0.1);
    let rim = 0;
    if (dStickney > 0.18 && dStickney < 0.28) rim = 40;
    else if (dStickney <= 0.18) rim = -25;
    
    const val = Math.floor(95 + n * 45 + grooves * 35 + rim);
    return [Math.min(255, val + 15), Math.min(255, Math.floor(val * 0.88)), Math.min(255, Math.floor(val * 0.72))];
  },

  deimos: (lon, lat) => {
    // Deimos: Soft dusty red-brown regolith blanket
    const n = fractalNoise(lon * 4, lat * 4, 4, 88);
    const val = Math.floor(100 + n * 40);
    return [Math.min(255, val + 18), Math.min(255, Math.floor(val * 0.84)), Math.min(255, Math.floor(val * 0.70))];
  },

  io: (lon, lat) => {
    // Io: Volcanic "pizza" world - sulfur yellow, molten orange-red calderas & black hotspots
    const n = fractalNoise(lon * 4.2, lat * 4.2, 5, 42);
    const calderaPatera = fractalNoise(lon * 8.5, lat * 8.5, 3, 93);
    const frostRings = Math.sin(lon * 12 + n * 4) * Math.cos(lat * 12);
    
    if (calderaPatera > 0.76) {
      // Black silicate lava hotspot (Loki Patera)
      return [32, 28, 30];
    } else if (calderaPatera > 0.64) {
      // Molten fiery crimson & vermilion caldera ring
      return [220 + Math.floor(n * 30), 45 + Math.floor(n * 25), 20];
    } else if (calderaPatera > 0.55) {
      // Deep fiery orange halo
      return [245, 125 + Math.floor(n * 35), 25];
    } else if (frostRings > 0.6) {
      // Pale sulfur dioxide frost
      return [255, 252, 205];
    } else {
      // Vibrant sulfur yellow plains
      return [245 + Math.floor(n * 10), 200 + Math.floor(n * 40), 40 + Math.floor(n * 25)];
    }
  },

  europa: (lon, lat) => {
    // Europa: Brilliant icy-cyan crust crisscrossed by reddish-brown cycloidal lineae
    const n = fractalNoise(lon * 4.5, lat * 4.5, 4, 55);
    // Cycloidal fracture networks
    const line1 = Math.abs(Math.sin(lon * 7 + Math.sin(lat * 9) * 2.2));
    const line2 = Math.abs(Math.sin(lat * 8 + Math.cos(lon * 6) * 1.8));
    const line3 = Math.abs(Math.sin((lon + lat) * 11));
    const isLine = (line1 < 0.08) || (line2 < 0.07) || (line3 < 0.06);
    const chaos = fractalNoise(lon * 9, lat * 9, 3, 17) > 0.72;

    if (isLine || chaos) {
      // Reddish-brown / rust copper hydrated salts (lineae)
      return [180 + Math.floor(n * 30), 65 + Math.floor(n * 25), 45 + Math.floor(n * 15)];
    } else {
      // Dazzling icy white with delicate pale blue/cyan tint
      return [235 + Math.floor(n * 18), 244 + Math.floor(n * 10), 255];
    }
  },

  ganymede: (lon, lat) => {
    // Ganymede: Two-tone dark ancient bedrock vs bright icy grooved sulci
    const n = fractalNoise(lon * 5, lat * 5, 5, 33);
    const terrainMacro = fractalNoise(lon * 2.2, lat * 2.2, 3, 19);
    const isDarkTerrain = terrainMacro > 0.48; // Galileo Regio
    const grooves = Math.sin(lon * 16 + lat * 10 + n * 4) * 0.5 + 0.5;

    if (isDarkTerrain) {
      // Ancient dark chocolate/umber heavily cratered bedrock
      const v = Math.floor(82 + n * 35);
      return [v + 12, v + 2, v - 8];
    } else {
      // Bright icy grooved terrain with parallel ridges
      const v = Math.floor(185 + grooves * 45 + n * 25);
      return [Math.floor(v * 0.95), Math.floor(v * 0.98), Math.min(255, v + 10)];
    }
  },

  callisto: (lon, lat) => {
    // Callisto: Heavily cratered dark charcoal-amber bedrock frosted with brilliant white impact basins
    const n = fractalNoise(lon * 6, lat * 6, 6, 64);
    // Multi-ring Valhalla basin
    const dValhalla = Math.hypot(lon - 0.2, lat - 0.25);
    const rings = Math.sin(dValhalla * 45) * Math.exp(-dValhalla * 2.5);
    const isFrostPeak = fractalNoise(lon * 12, lat * 12, 3, 81) > 0.76;

    if (isFrostPeak || Math.abs(rings) > 0.6) {
      // Brilliant sparkling white impact frost
      return [235 + Math.floor(n * 20), 238 + Math.floor(n * 17), 245];
    } else {
      // Ancient dark charcoal-amber bedrock
      const v = Math.floor(65 + n * 40);
      return [v + 10, v + 3, v - 5];
    }
  },

  titan: (lon, lat) => {
    // Titan: Dense golden-amber/orange photochemical smog with north polar methane lakes
    const n = fractalNoise(lon * 3.5, lat * 3.5, 4, 12);
    const polarLat = lat; // lat in -1 .. 1
    const isNorthPolar = polarLat > 0.72;
    const lakeNoise = fractalNoise(lon * 8, lat * 8, 3, 99);

    if (isNorthPolar && lakeNoise > 0.68) {
      // Kraken Mare / Ligeia Mare hydrocarbon methane seas (petrol blue-black)
      return [38, 52, 70];
    } else {
      // Rich golden-amber/tangerine atmospheric haze gradient
      const haze = Math.floor(225 + n * 28);
      return [haze, Math.floor(haze * 0.68), Math.floor(35 + n * 20)];
    }
  },

  enceladus: (lon, lat) => {
    // Enceladus: Pure gleaming crystalline ice with electric-cyan "tiger stripes" at south pole
    const n = fractalNoise(lon * 4.5, lat * 4.5, 4, 15);
    const isSouthPole = lat < -0.65;
    const tigerStripes = Math.abs(Math.sin(lon * 14 + lat * 8));

    if (isSouthPole && tigerStripes < 0.18) {
      // Active electric-cyan cryovolcanic tiger-stripe fissures
      return [48, 185, 255];
    } else {
      // Pristine dazzling snow-white crystalline ice
      return [250 + Math.floor(n * 5), 252 + Math.floor(n * 3), 255];
    }
  },

  titania: (lon, lat) => {
    // Titania: Slate violet-gray ice-rock sliced by Messina Chasma fault canyons
    const n = fractalNoise(lon * 5, lat * 5, 5, 49);
    const chasma = Math.abs(Math.sin(lon * 5 + lat * 7 + n * 2));
    if (chasma < 0.09) {
      // Pale icy fault scarp
      return [185, 195, 210];
    } else {
      const v = Math.floor(120 + n * 45);
      return [Math.floor(v * 0.95), Math.floor(v * 0.98), Math.floor(v * 1.08)];
    }
  },

  miranda: (lon, lat) => {
    // Miranda: Patchwork Frankenstein moon, chevron coronae & towering 20km cliffs
    const n = fractalNoise(lon * 6, lat * 6, 5, 87);
    const chevron = Math.abs(Math.sin(Math.abs(lon * 8) - Math.abs(lat * 8)));
    if (chevron < 0.12) {
      // Exposed bright water-ice cliff faces (Verona Rupes)
      return [225 + Math.floor(n * 25), 235 + Math.floor(n * 20), 248];
    } else {
      const v = Math.floor(88 + n * 50);
      return [v, v + 4, v + 8];
    }
  },

  triton: (lon, lat) => {
    // Triton: Frozen nitrogen pink/peach south polar cap, cantaloupe terrain, dark cryogeyser plumes
    const n = fractalNoise(lon * 5, lat * 5, 5, 53);
    const cantaloupe = smoothNoise(lon * 12, lat * 12, 21);
    const isSouthPole = lat < -0.3;
    const isPlume = (Math.abs(lon * 7 + lat * 15) % 1.0 < 0.06) && isSouthPole && (cantaloupe > 0.6);

    if (isPlume) {
      // Dark carbonaceous nitrogen cryovolcanic plume streaks
      return [42, 35, 40];
    } else if (isSouthPole) {
      // Delicate pastel pink/peach nitrogen ice
      const v = Math.floor(235 + n * 18);
      return [v, Math.floor(v * 0.78), Math.floor(v * 0.86)];
    } else {
      // Mint-turquoise & pale icy blue cantaloupe terrain
      const v = Math.floor(190 + cantaloupe * 40 + n * 20);
      return [Math.floor(v * 0.82), Math.floor(v * 0.96), v];
    }
  },

  charon: (lon, lat) => {
    // Charon: Silver-gray water ice crowned with reddish-brown "Mordor Macula" north pole
    const n = fractalNoise(lon * 5, lat * 5, 5, 91);
    const isNorthPole = lat > 0.65;
    const chasmaEquator = Math.abs(lat) < 0.12 && Math.sin(lon * 8) > 0.2;

    if (isNorthPole) {
      // Rich reddish-brown tholin north polar cap ("Mordor Macula")
      const r = Math.floor(175 + n * 35);
      return [r, Math.floor(r * 0.42), Math.floor(r * 0.32)];
    } else if (chasmaEquator) {
      // Deep shadowed Serenity Chasma equatorial canyon
      return [75, 78, 85];
    } else {
      // Cool silvery-gray water ice crust
      const v = Math.floor(145 + n * 45);
      return [v, Math.floor(v * 1.02), Math.floor(v * 1.08)];
    }
  }
};

// 1. Generate 3D Spherical Portrait Icons (384x384 PNG) for each moon
function generateSphericalPortrait(moonId, size = 384) {
  const shader = moonShaders[moonId] || moonShaders.luna;
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.44;
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Key light direction (from top-left, slightly toward viewer)
  const lx = -0.55;
  const ly = -0.45;
  const lz = 0.70;
  const lLen = Math.hypot(lx, ly, lz);
  const lightDir = [lx / lLen, ly / lLen, lz / lLen];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const d2 = dx * dx + dy * dy;

      if (d2 <= 1.0) {
        // Pixel is on the sphere
        const dz = Math.sqrt(1.0 - d2); // normal z pointing out toward viewer

        // Spherical longitude & latitude
        const lon = Math.atan2(dx, dz) / Math.PI; // -1 .. 1
        const lat = -dy;                         // -1 .. 1

        const baseCol = shader(lon, lat);

        // Lambertian diffuse lighting
        const dot = dx * lightDir[0] + dy * lightDir[1] + dz * lightDir[2];
        const diffuse = Math.max(0.04, dot); // slight ambient space light

        // Smooth limb darkening
        const limb = Math.pow(dz, 0.42);

        // Titan special atmospheric glow
        let atmoGlow = 0;
        if (moonId === 'titan') {
          atmoGlow = Math.pow(1.0 - dz, 2.5) * 0.5;
        }

        const r = Math.min(255, Math.floor(baseCol[0] * diffuse * limb + atmoGlow * 255));
        const g = Math.min(255, Math.floor(baseCol[1] * diffuse * limb + atmoGlow * 160));
        const b = Math.min(255, Math.floor(baseCol[2] * diffuse * limb + atmoGlow * 40));

        rgba[idx] = r;
        rgba[idx + 1] = g;
        rgba[idx + 2] = b;
        rgba[idx + 3] = 255;
      } else if (d2 <= 1.05 && moonId === 'titan') {
        // Atmospheric haze fringe outside Titan's solid disk
        const fringe = 1.0 - (d2 - 1.0) / 0.05;
        const alpha = Math.floor(fringe * 140);
        rgba[idx] = 245;
        rgba[idx + 1] = 160;
        rgba[idx + 2] = 45;
        rgba[idx + 3] = alpha;
      } else {
        // Deep space black background (transparent or dark black)
        rgba[idx] = 4;
        rgba[idx + 1] = 6;
        rgba[idx + 2] = 12;
        rgba[idx + 3] = 255; // solid black background for clean card & hero image display
      }
    }
  }

  return encodePNG(size, size, rgba);
}

// 2. Generate 2:1 Equirectangular Map (1024x512 PNG) for Three.js sphere mapping
function generateEquirectangularTexture(moonId, w = 1024, h = 512) {
  const shader = moonShaders[moonId] || moonShaders.luna;
  const rgba = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    const lat = 1.0 - (y / (h - 1)) * 2.0; // 1 (north pole) to -1 (south pole)
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lon = (x / (w - 1)) * 2.0 - 1.0; // -1 to 1

      const col = shader(lon, lat);
      rgba[idx] = col[0];
      rgba[idx + 1] = col[1];
      rgba[idx + 2] = col[2];
      rgba[idx + 3] = 255;
    }
  }

  return encodePNG(w, h, rgba);
}

// Ensure target directories exist
const moonsImgDir = path.resolve(__dirname, '../public/images/moons');
const distMoonsImgDir = path.resolve(__dirname, '../dist/images/moons');
const texturesDir = path.resolve(__dirname, '../public/textures/planets');

[moonsImgDir, distMoonsImgDir, texturesDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const moonIds = [
  'luna', 'phobos', 'deimos', 'io', 'europa', 'ganymede',
  'callisto', 'titan', 'enceladus', 'titania', 'miranda',
  'triton', 'charon'
];

console.log('Generating authentic, colorful moon portraits and surface textures...');

moonIds.forEach(id => {
  // 1. Generate 384x384 3D Spherical Portrait for UI & Details Panel
  const portraitPNG = generateSphericalPortrait(id, 384);
  const outPathPublic = path.join(moonsImgDir, `${id}.png`);
  const outPathDist = path.join(distMoonsImgDir, `${id}.png`);
  fs.writeFileSync(outPathPublic, portraitPNG);
  fs.writeFileSync(outPathDist, portraitPNG);

  // Also write .jpg alias for maximum browser/extension compatibility
  fs.writeFileSync(path.join(moonsImgDir, `${id}.jpg`), portraitPNG);
  fs.writeFileSync(path.join(distMoonsImgDir, `${id}.jpg`), portraitPNG);

  // 2. Generate 1024x512 Equirectangular Texture for Three.js
  const texPNG = generateEquirectangularTexture(id, 1024, 512);
  const texPath = path.join(texturesDir, `moon_${id}.png`);
  fs.writeFileSync(texPath, texPNG);

  console.log(`✓ Generated assets for ${id} (Portrait + 1024x512 Texture)`);
});

console.log('All 13 moons successfully generated!');
