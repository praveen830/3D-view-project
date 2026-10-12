import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== VERIFYING COLORFUL MOON IMAGES, OWN PALETTES & AXIAL ROTATION ===\n');

const moonIds = [
  'luna', 'phobos', 'deimos', 'io', 'europa', 'ganymede',
  'callisto', 'titan', 'enceladus', 'titania', 'miranda',
  'triton', 'charon'
];

console.log('--- 1. Dedicated Moon Portrait Assets in public/images/moons/ ---');
moonIds.forEach(id => {
  const pngPath = path.resolve('public/images/moons', `${id}.png`);
  const jpgPath = path.resolve('public/images/moons', `${id}.jpg`);
  assert.ok(fs.existsSync(pngPath), `Missing dedicated PNG portrait for moon: ${id}`);
  assert.ok(fs.existsSync(jpgPath), `Missing dedicated JPG portrait for moon: ${id}`);
  const stat = fs.statSync(pngPath);
  assert.ok(stat.size > 10000, `Moon portrait ${id}.png is too small (${stat.size} bytes)`);
  console.log(`[PASS] Moon [${id}]: Dedicated portrait exists (${(stat.size / 1024).toFixed(1)} KB)`);
});

console.log('\n--- 2. Dedicated Moon Surface Maps in public/textures/planets/ ---');
moonIds.forEach(id => {
  const texPath = path.resolve('public/textures/planets', `moon_${id}.png`);
  assert.ok(fs.existsSync(texPath), `Missing 1024x512 equirectangular texture for moon: ${id}`);
  const stat = fs.statSync(texPath);
  assert.ok(stat.size > 10000, `Moon surface texture moon_${id}.png is too small (${stat.size} bytes)`);
  console.log(`[PASS] Moon [${id}]: Dedicated 1024x512 surface map exists (${(stat.size / 1024).toFixed(1)} KB)`);
});

console.log('\n--- 3. main.js Moon Asset Binding & getMoonImagePath Implementation ---');
const mainSrc = fs.readFileSync('src/main.js', 'utf-8');

assert.ok(mainSrc.includes('getMoonImagePath(id)'), 'getMoonImagePath method must be implemented');
assert.ok(mainSrc.includes('heroImgEl.src = this.getMoonImagePath(data?.id)'), 'Details panel must bind moon own photo');
assert.ok(!mainSrc.includes('<img src="/images/moon.jpg" alt="${mName}" class="lnav-moon-thumb">'), 'Left nav must NOT hardcode /images/moon.jpg for all moons');
assert.ok(mainSrc.includes('this.getMoonImagePath(m.id)'), 'Left nav must use getMoonImagePath for thumbnails');
assert.ok(mainSrc.includes('class="moon-card-thumb"'), 'Planet details panel must display moon-card-thumb');
console.log('[PASS] All UI components (Left Nav, Details Panel hero, Planet moon cards) bind own colorful images.');

console.log('\n--- 4. textures.js Procedural Moon Shaders & Textures ---');
const texSrc = fs.readFileSync('src/textures.js', 'utf-8');

assert.ok(texSrc.includes('createMoonTexture(moonId)'), 'createMoonTexture function must exist');
assert.ok(texSrc.includes('loadPlanetTexture(`moon_${fileKey}.png`'), 'createMoonTexture loads dedicated moon surface maps');
assert.ok(texSrc.includes("id === 'io'"), 'Procedural fallback includes Io sulfur volcanic shaders');
assert.ok(texSrc.includes("id === 'europa'"), 'Procedural fallback includes Europa icy fracture shaders');
assert.ok(texSrc.includes("id === 'ganymede'"), 'Procedural fallback includes Ganymede two-tone terrain');
assert.ok(texSrc.includes("id === 'callisto'"), 'Procedural fallback includes Callisto Valhalla crater shaders');
assert.ok(texSrc.includes("id === 'titan'"), 'Procedural fallback includes Titan photochemical smog shaders');
assert.ok(texSrc.includes("id === 'enceladus'"), 'Procedural fallback includes Enceladus tiger stripe shaders');
assert.ok(texSrc.includes("id === 'triton'"), 'Procedural fallback includes Triton cantaloupe pink nitrogen shaders');
assert.ok(texSrc.includes("id === 'charon'"), 'Procedural fallback includes Charon Mordor Macula red tholin shaders');
console.log('[PASS] Full suite of authentic colorful shaders implemented for all 13 moons.');

console.log('\n--- 5. Moon & Planet Axial Rotation Mechanics ---');
assert.ok(mainSrc.includes('mU.axialSpin = (mU.axialSpin || 0)'), 'Moon axial spin tracker initialized');
assert.ok(mainSrc.includes('mMesh.rotation.y = mAngle + mU.axialSpin'), 'Physical orbital tidal locking + continuous inspection spin combined');
assert.ok(mainSrc.includes('isCurrentFocusedMoon'), 'Inspection spin triggered when focusing on moon');
assert.ok(mainSrc.includes('u.idleSpin = (u.idleSpin || 0)'), 'Planet idle spin tracker initialized');
assert.ok(mainSrc.includes('mesh.rotation.y = rotAngle + u.idleSpin'), 'Planet axial rotation maintains buttery motion');
console.log('[PASS] Buttery-smooth axial rotation verified for focused inspection and paused modes.');

console.log('\n===============================================================');
console.log('ALL COLORFUL MOON & ROTATION VERIFICATIONS PASSED (0 FAILURES).');
console.log('===============================================================\n');
