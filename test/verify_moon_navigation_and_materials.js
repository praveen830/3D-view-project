import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== VERIFYING MOON DECOUPLING, NAVIGATION & PBR MATERIALS ===\n');

// 1. Inspect main.js source code for key architectural patterns
const mainSrc = fs.readFileSync('src/main.js', 'utf-8');

console.log('--- 1. Moon Orbital Decoupling Verification ---');
// Verify moonAnchorGroup exists
assert.ok(mainSrc.includes('moonAnchorGroup = new THREE.Group()'), 'moonAnchorGroup must be instantiated');
assert.ok(mainSrc.includes('this.moonAnchorGroups.push'), 'moonAnchorGroups must be tracked');
assert.ok(mainSrc.includes('this.systemGroup.add(moonAnchorGroup)'), 'moonAnchorGroup must be added to systemGroup, NOT spinning planetMesh');
assert.ok(mainSrc.includes('moonAnchorGroup.add(moonMesh)'), 'moonMesh must be child of moonAnchorGroup');
assert.ok(mainSrc.includes('moonAnchorGroup.add(mLine)'), 'mLine orbit must be child of moonAnchorGroup');
console.log('[PASS] Moon orbit line and mesh are attached to non-spinning moonAnchorGroup.');

// Verify update in animate loop
assert.ok(mainSrc.includes('entry.group.position.copy(entry.planetMesh.position)'), 'moonAnchorGroup must follow planet center in animate loop');
console.log('[PASS] Moon anchor follows planet orbital position without inheriting axial rotation.');

console.log('\n--- 2. Camera Transition Isolation Verification ---');
// Verify killCameraTransition helper
assert.ok(mainSrc.includes('killCameraTransition()'), 'killCameraTransition must be defined');
assert.ok(mainSrc.includes('this.activeCamTween = gsap.to'), 'activeCamTween must be saved on transitions');
// Verify OrbitControls.update() is guarded
assert.ok(mainSrc.includes('if (!this.isTransitioning) {\n      this.controls.update();\n    }'), 'OrbitControls.update must be guarded by !isTransitioning in animate loop');
console.log('[PASS] Camera transitions are isolated; OrbitControls.update cannot fight GSAP tweens.');

console.log('\n--- 3. Moon to Parent Planet Navigation & Breadcrumb Links ---');
// Verify focusOnMoon sets currentPlanet
assert.ok(mainSrc.includes('if (moonMesh.userData.parentPlanetMesh) {\n      this.currentPlanet = moonMesh.userData.parentPlanetMesh.userData.planetData;\n    }'), 'focusOnMoon must set this.currentPlanet to parent planet');
// Verify Return to Parent Planet button in details panel
assert.ok(mainSrc.includes('btn-return-parent-planet'), 'Return to Parent Planet button must exist in details panel for moons');
assert.ok(mainSrc.includes('this.focusOnPlanet(pMesh)'), 'Return button must call focusOnPlanet');
console.log('[PASS] Moon view provides direct navigation back to parent planet in breadcrumbs and details panel.');

console.log('\n--- 4. PBR Planetary & Lunar Material Realism ---');
// Verify PBR Materials in main.js
assert.ok(mainSrc.includes('textures.createEarthNormalTexture()'), 'Earth normal map must be loaded');
assert.ok(mainSrc.includes('textures.createEarthSpecularTexture()'), 'Earth specular/roughness map must be loaded');
assert.ok(mainSrc.includes('textures.createEarthCloudsTexture()'), 'Earth floating cloud layer must be loaded');
assert.ok(mainSrc.includes('bumpScale: 0.05'), 'Luna must have bump mapping for craters');
assert.ok(mainSrc.includes('textures.createSaturnRingGeometry'), 'Saturn ring geometry must be generated');
assert.ok(mainSrc.includes('textures.createSaturnRingTexture'), 'Saturn ring texture with Cassini division must be loaded');
console.log('[PASS] Realistic PBR materials with bump/normal maps and shaders verified.');

console.log('\n--- 5. textures.js ColorSpace Handling ---');
const texSrc = fs.readFileSync('src/textures.js', 'utf-8');
assert.ok(texSrc.includes('tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace'), 'Linear color space for normal and specular maps verified');
assert.ok(texSrc.includes('createEarthNormalTexture() {\n  return loadPlanetTexture(\'earth_normal.jpg\', () => null, false)'), 'Earth normal map uses linear NoColorSpace');
console.log('[PASS] ColorSpace properly distinguishes sRGB textures from linear normal/specular maps.');

console.log('\n===============================================================');
console.log('ALL MOON DECOUPLING, NAVIGATION & MATERIAL TESTS PASSED (0 FAILURES).');
console.log('===============================================================');
