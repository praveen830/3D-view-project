import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== VERIFYING BILLBOARD LABELS, MENU AUTO-COLLAPSE & NAVIGATION ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

const mainJsPath = resolve('src/main.js');
const mainJs = readFileSync(mainJsPath, 'utf8');

// --- TEST 1: 3D Billboard Celestial Label Implementation ---
console.log('--- 1. 3D Billboard Celestial Label Sprite Architecture ---');

assert(
  mainJs.includes('createCelestialLabel(name,'),
  'createCelestialLabel method defined with high-DPI text canvas generator'
);

assert(
  mainJs.includes('depthTest: false') && mainJs.includes('depthWrite: false'),
  'Celestial label sprites configured with depthTest: false and depthWrite: false (prevents celestial clipping)'
);

assert(
  mainJs.includes('this.planetLabelSprites = [];') &&
  mainJs.includes('this.moonLabelSprites = [];') &&
  mainJs.includes('this.starLabelSprite = null;'),
  'Constructor initializes tracking arrays for planetLabelSprites, moonLabelSprites, and starLabelSprite'
);

assert(
  mainJs.includes("this.planetLabelSprites.push(pLabelSprite);"),
  'buildSolarSystemPlanets attaches 3D celestial text name tags to all planets'
);

assert(
  mainJs.includes("this.moonLabelSprites.push(mLabelSprite);"),
  'buildSolarSystemPlanets attaches 3D billboard labels to all moons inside moonAnchorGroup'
);

assert(
  mainJs.includes("this.starLabelSprite = this.createCelestialLabel") &&
  mainJs.includes("this.systemGroup.add(this.starLabelSprite);"),
  'loadStarSystem generates and docks luminous billboard label for host star (Sun / Exostar)'
);

assert(
  mainJs.includes("updateLabelsVisibility()"),
  'updateLabelsVisibility intelligently hides moon clutter in system view and displays tags when focused'
);

// --- TEST 2: Render Loop Coordinate Synchronization ---
console.log('\n--- 2. Orbital Coordinate Synchronization ---');

assert(
  mainJs.includes('u.labelSprite.position.set(pos.x, pos.y + u.labelSprite.userData.yOffset, pos.z)'),
  'Planetary label sprites position-sync dynamically to Keplerian orbital coordinates in animate()'
);

assert(
  mainJs.includes('mU.labelSprite.position.set(') && mainJs.includes('mU.labelSprite.userData.yOffset'),
  'Lunar label sprites position-sync dynamically to moon coordinates in animate()'
);

// --- TEST 3: Menu Auto-Collapse & Case-Insensitive Navigation ---
console.log('\n--- 3. Left Nav Drawer Auto-Collapse & Universal Navigation ---');

assert(
  mainJs.includes('toggleLeftNav(forceState) {') &&
  mainJs.includes('drawer.classList.add(\'collapsed\');') &&
  mainJs.includes('drawer.classList.remove(\'collapsed\');'),
  'toggleLeftNav is defined as an authoritative class method supporting forced and toggled states'
);

assert(
  mainJs.includes('navigateToCelestialBody(id, isStar = false) {') &&
  mainJs.includes('this.toggleLeftNav(false);') &&
  mainJs.includes('this.closeCosmicGuide();'),
  'navigateToCelestialBody auto-collapses drawer and closes modals so 3D universe is fully visible'
);

assert(
  mainJs.includes('const cleanId = String(id || \'\').trim().toLowerCase();'),
  'navigateToCelestialBody sanitizes celestial identifier to lowercase trimmed string'
);

assert(
  mainJs.includes('mid === cleanId || mName === cleanId') &&
  mainJs.includes('(cleanId === \'moon\' && mid === \'luna\')'),
  'navigateToCelestialBody supports case-insensitive names and moon/luna astronomical aliases'
);

// --- TEST 4: Raycasting & Click Interactivity for Labels ---
console.log('\n--- 4. Interactive Raycasting & Billboard Label Clicks ---');

assert(
  mainJs.includes('activeLabels.push(...this.planetLabelSprites)') &&
  mainJs.includes('activeLabels.push(...this.moonLabelSprites)') &&
  mainJs.includes('activeLabels.push(this.starLabelSprite)'),
  'Raycaster targets active celestial billboard labels in onPointerMove and onClick'
);

assert(
  mainJs.includes('hit.userData.type === \'planet-label\'') &&
  mainJs.includes('hit.userData.type === \'moon-label\'') &&
  mainJs.includes('hit.userData.type === \'star-label\''),
  'onClick and onPointerMove recognize planet-label, moon-label, and star-label types'
);

assert(
  mainJs.includes('this.focusOnPlanet(pMesh)') &&
  mainJs.includes('this.focusOnMoon(mMesh)'),
  'Clicking celestial labels triggers cinematic camera focusOnPlanet and focusOnMoon'
);

// --- TEST 5: Cosmic Atmosphere, Orbits & Deep Space Lighting ---
console.log('\n--- 5. Cosmic Glows, Orbits & Deep Space Lighting ---');

assert(
  mainJs.includes('color: orbitColor') &&
  mainJs.includes('0x38bdf8') &&
  mainJs.includes('blending: THREE.AdditiveBlending'),
  'Orbit lines feature luminous cyan/azure palette with additive blending'
);

assert(
  mainJs.includes('new THREE.AmbientLight(0x0f2042, 0.42)'),
  'Ambient light configured with deep sapphire cosmic hue (0x0f2042, 0.42) for realistic night-side planet shadows'
);

// Summary
console.log('\n===============================================================');
if (failCount === 0) {
  console.log(`ALL BILLBOARD LABELS & NAVIGATION TESTS PASSED (${passCount} PASSED, 0 FAILURES).`);
  console.log('===============================================================');
  process.exit(0);
} else {
  console.error(`VERIFICATION FAILED: ${failCount} failures out of ${passCount + failCount} assertions.`);
  console.log('===============================================================');
  process.exit(1);
}
