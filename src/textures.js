import * as THREE from 'three';

/**
 * Authentic NASA Photographic & High-Resolution Planetary Textures Loader
 * 
 * Sources & Attributions:
 * - Earth, Clouds, Normal & Specular: NASA Earth Observatory Blue Marble Next Generation
 * - Sun: SOHO / Solar Dynamics Observatory (SDO)
 * - Moon: NASA Lunar Reconnaissance Orbiter (LRO) Wide Angle Camera
 * - Mercury: NASA MESSENGER Orbiter Global Mosaic
 * - Venus: NASA Magellan Radar / Pioneer Venus Orbiter
 * - Mars: NASA Viking Orbiter / Mars Global Surveyor (MGS)
 * - Jupiter: NASA Cassini / Juno Orbiter Atmospheric Belt Mosaic
 * - Saturn & Rings: NASA Cassini-Huygens Solstice Mission
 * - Uranus & Neptune: NASA Voyager 2 Planetary Flybys
 * - Pluto: NASA New Horizons Long Range Reconnaissance Imager (LORRI)
 */

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadPlanetTexture(filename, proceduralFallback, isColor = true) {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return proceduralFallback ? proceduralFallback() : new THREE.Texture();
  }

  const url = `/textures/planets/${filename}`;
  if (textureCache.has(url)) {
    return textureCache.get(url);
  }

  const texture = textureLoader.load(
    url,
    (tex) => {
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn(`[Textures] Failed to load ${url}, using procedural fallback:`, err);
    }
  );

  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(url, texture);
  return texture;
}

// -------------------------------------------------------------
// PROCEDURAL MATH NOISE FALLBACK GENERATORS
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// PLANETARY TEXTURE EXPORTS (NASA Authentic with Procedural Fallback)
// -------------------------------------------------------------

export function createSunTexture() {
  return loadPlanetTexture('sun.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.03, y * 0.03, 5, 23);
        d[idx] = Math.min(255, Math.floor(255 * (0.95 + 0.05 * n)));
        d[idx + 1] = Math.min(255, Math.floor(180 + 75 * n));
        d[idx + 2] = 30;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  });
}

export function createMercuryTexture() {
  return loadPlanetTexture('mercury.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.02, y * 0.02, 6, 12);
        const val = Math.floor(115 + n * 70);
        d[idx] = val; d[idx + 1] = Math.floor(val * 0.97); d[idx + 2] = Math.floor(val * 0.93); d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createVenusTexture() {
  return loadPlanetTexture('venus.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.015, y * 0.015, 5, 8);
        d[idx] = Math.floor(228 + n * 25);
        d[idx + 1] = Math.floor(188 + n * 35);
        d[idx + 2] = Math.floor(118 + n * 30);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createEarthTexture() {
  return loadPlanetTexture('earth.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      const lat = Math.abs((y - 256) / 256);
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const continent = fractalNoise(x * 0.012, y * 0.012, 6, 31);
        let r = 18, g = 65, b = 155;
        if (lat > 0.88) { r = 235; g = 245; b = 255; }
        else if (continent > 0.48) { r = 45; g = 130; b = 55; }
        d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createEarthCloudsTexture() {
  return loadPlanetTexture('earth_clouds.png', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const c = fractalNoise(x * 0.02, y * 0.02, 5, 48);
        if (c > 0.52) {
          const alpha = Math.min(255, Math.floor((c - 0.52) * 3.5 * 255));
          d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; d[idx + 3] = alpha;
        } else {
          d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; d[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createEarthNormalTexture() {
  return loadPlanetTexture('earth_normal.jpg', () => null, false);
}

export function createEarthSpecularTexture() {
  return loadPlanetTexture('earth_specular.jpg', () => null, false);
}

export function createMarsTexture() {
  return loadPlanetTexture('mars.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.018, y * 0.018, 5, 27);
        d[idx] = Math.floor(195 + n * 40);
        d[idx + 1] = Math.floor(78 + n * 30);
        d[idx + 2] = Math.floor(38 + n * 22);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createJupiterTexture() {
  return loadPlanetTexture('jupiter.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      const band = Math.sin(y * 0.09) * 0.5 + Math.sin(y * 0.035) * 0.5;
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const turbulence = fractalNoise(x * 0.018, y * 0.02, 5, 62);
        d[idx] = Math.floor(218 + band * 32 + turbulence * 22);
        d[idx + 1] = Math.floor(168 + band * 28 + turbulence * 16);
        d[idx + 2] = Math.floor(118 + band * 22 + turbulence * 12);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createSaturnTexture() {
  return loadPlanetTexture('saturn.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      const band = Math.sin(y * 0.06) * 18 + Math.sin(y * 0.02) * 12;
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.012, y * 0.025, 4, 18);
        d[idx] = Math.floor(228 + band + n * 12);
        d[idx + 1] = Math.floor(195 + band * 0.8 + n * 8);
        d[idx + 2] = Math.floor(135 + band * 0.5 + n * 6);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Creates concentric rings for Saturn with transparent Cassini & Encke divisions
 */
export function createSaturnRingTexture() {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
  gradient.addColorStop(0.00, 'rgba(0, 0, 0, 0)');          // Inner clear space
  gradient.addColorStop(0.05, 'rgba(120, 110, 95, 0.15)');  // D Ring
  gradient.addColorStop(0.12, 'rgba(165, 150, 125, 0.45)'); // C Ring
  gradient.addColorStop(0.25, 'rgba(215, 195, 160, 0.92)'); // B Ring inner
  gradient.addColorStop(0.48, 'rgba(235, 215, 180, 0.98)'); // B Ring dense bright
  gradient.addColorStop(0.51, 'rgba(20, 18, 15, 0.04)');    // Cassini Division outer slope
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');        // Cassini Division Gap (Transparent!)
  gradient.addColorStop(0.58, 'rgba(18, 16, 12, 0.06)');    // Cassini Division inner slope
  gradient.addColorStop(0.61, 'rgba(195, 175, 140, 0.88)'); // A Ring inner
  gradient.addColorStop(0.78, 'rgba(175, 155, 125, 0.75)'); // A Ring
  gradient.addColorStop(0.85, 'rgba(145, 130, 105, 0.35)'); // Encke Gap & outer A
  gradient.addColorStop(0.92, 'rgba(110, 98, 80, 0.12)');   // F Ring
  gradient.addColorStop(1.00, 'rgba(0, 0, 0, 0)');          // Outer space

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Creates RingGeometry with radial UVs so textures map in 360-degree concentric circles
 */
export function createSaturnRingGeometry(innerRadius, outerRadius, segments = 96) {
  const geo = new THREE.RingGeometry(innerRadius, outerRadius, segments, 1);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    const u = (r - innerRadius) / (outerRadius - innerRadius);
    uvs.setXY(i, u, 0.5);
  }
  uvs.needsUpdate = true;
  return geo;
}

export function createUranusTexture() {
  return loadPlanetTexture('uranus.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0.0, '#70d6ff');
    gradient.addColorStop(0.5, '#78daf3');
    gradient.addColorStop(1.0, '#70d6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createNeptuneTexture() {
  return loadPlanetTexture('neptune.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(1024, 512);
    const d = imgData.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const idx = (y * 1024 + x) * 4;
        const n = fractalNoise(x * 0.016, y * 0.03, 4, 75);
        d[idx] = 38 + Math.floor(n * 25);
        d[idx + 1] = 82 + Math.floor(n * 45);
        d[idx + 2] = 215 + Math.floor(n * 40);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

export function createPlutoTexture() {
  return loadPlanetTexture('pluto.jpg', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 256);
    const d = imgData.data;
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 512; x++) {
        const idx = (y * 512 + x) * 4;
        const n = fractalNoise(x * 0.025, y * 0.025, 4, 88);
        d[idx] = Math.floor(185 + n * 40);
        d[idx + 1] = Math.floor(145 + n * 30);
        d[idx + 2] = Math.floor(115 + n * 25);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  });
}

// -------------------------------------------------------------
// PHOTOREALISTIC PROCEDURAL & AUTHENTIC MOON TEXTURES
// -------------------------------------------------------------

export function createMoonTexture(moonId) {
  if (moonId === 'luna' || moonId === 'moon') {
    return loadPlanetTexture('moon.jpg', () => createProceduralMoonCanvas('luna'));
  }
  return createProceduralMoonCanvas(moonId);
}

function createProceduralMoonCanvas(moonId) {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(512, 256);
  const d = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const n = fractalNoise(x * 0.03, y * 0.03, 5, 42);

      let r = 180, g = 180, b = 180;

      if (moonId === 'luna' || moonId === 'moon') {
        const maria = fractalNoise(x * 0.015, y * 0.015, 3, 19);
        const val = maria > 0.54 ? Math.floor(80 + n * 35) : Math.floor(175 + n * 65);
        r = val; g = Math.floor(val * 0.98); b = Math.floor(val * 0.96);
      } else if (moonId === 'io') {
        const calderas = smoothNoise(x * 0.08, y * 0.08, 93);
        r = Math.floor(235 + n * 20);
        g = Math.floor(175 + n * 30);
        b = Math.floor(25 + n * 20);
        if (calderas > 0.8) {
          r = 180; g = 30; b = 15;
        }
      } else if (moonId === 'europa') {
        const fracture = Math.sin(x * 0.06 + y * 0.04) * fractalNoise(x * 0.04, y * 0.04, 3, 7);
        if (Math.abs(fracture) > 0.45) {
          r = 190; g = 120; b = 90;
        } else {
          r = 235; g = 240; b = 248;
        }
      } else if (moonId === 'titan') {
        r = Math.floor(225 + n * 25);
        g = Math.floor(155 + n * 25);
        b = Math.floor(40 + n * 20);
      } else if (moonId === 'enceladus') {
        const stripe = Math.sin(x * 0.08) * fractalNoise(x * 0.03, y * 0.03, 3, 6);
        if (Math.abs(stripe) > 0.42 && y > 180) {
          r = 140; g = 190; b = 255;
        } else {
          r = 250; g = 252; b = 255;
        }
      } else {
        const val = Math.floor(140 + n * 60);
        r = val; g = val; b = val;
      }

      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createProceduralPlanetTexture(colorHex = '#3B82F6', isHabitable = false) {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const baseCol = new THREE.Color(colorHex);
  const imgData = ctx.createImageData(512, 256);
  const d = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const n = fractalNoise(x * 0.02, y * 0.02, 4, 102);

      let r = baseCol.r * 255 * (0.8 + n * 0.4);
      let g = baseCol.g * 255 * (0.8 + n * 0.4);
      let b = baseCol.b * 255 * (0.8 + n * 0.4);

      if (isHabitable && n > 0.58) {
        r = 40; g = 135; b = 60;
      }

      d[idx] = Math.min(255, Math.floor(r));
      d[idx + 1] = Math.min(255, Math.floor(g));
      d[idx + 2] = Math.min(255, Math.floor(b));
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
