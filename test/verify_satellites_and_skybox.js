import assert from 'node:assert';
import fs from 'node:fs';
import * as satellites from '../src/satellites.js';

console.log('=== VERIFYING SATELLITES, INTERSTELLAR SKYBOX & TIME PAUSE BEHAVIOR ===\n');

// 1. Verify Spacecraft Catalog & Procedural 3D Generators
console.log('--- 1. Spacecraft Catalog Integrity ---');
assert.strictEqual(satellites.humanMissionsCatalog.length, 5, 'Should have 5 cataloged human missions');
const expectedIds = ['iss', 'hubble', 'jwst', 'astronaut', 'voyager1'];
expectedIds.forEach(id => {
  const craft = satellites.humanMissionsCatalog.find(c => c.id === id);
  assert.ok(craft, `Missing spacecraft ${id}`);
  assert.ok(craft.name.en, `Spacecraft ${id} missing english name`);
  assert.ok(craft.name.fr, `Spacecraft ${id} missing french name`);
  assert.ok(craft.agency, `Spacecraft ${id} missing agency`);
  assert.ok(craft.speedKmH, `Spacecraft ${id} missing speedKmH`);
  assert.ok(craft.altitudeKm, `Spacecraft ${id} missing altitudeKm`);
  assert.ok(craft.periodMins, `Spacecraft ${id} missing periodMins`);
  assert.ok(craft.photo, `Spacecraft ${id} missing photo`);
  assert.ok(Array.isArray(craft.funFacts.en) && craft.funFacts.en.length >= 3, `Spacecraft ${id} missing fun facts`);
  console.log(`[PASS] Spacecraft ${id.toUpperCase()}: ${craft.name.en} | Agency: ${craft.agency}`);
});

// 2. Verify Procedural 3D Mesh Builders
console.log('\n--- 2. Procedural Spacecraft Mesh Generators ---');
const iss = satellites.createISS();
assert.strictEqual(iss.name, 'ISS');
assert.ok(iss.children.length >= 6, 'ISS should have solar arrays and modules');
console.log(`[PASS] createISS() generated hierarchy with ${iss.children.length} structural elements`);

const hubble = satellites.createHubble();
assert.strictEqual(hubble.name, 'Hubble');
assert.ok(hubble.children.length >= 4, 'Hubble should have tube, aperture, and solar wings');
console.log(`[PASS] createHubble() generated hierarchy with ${hubble.children.length} structural elements`);

const jwst = satellites.createJWST();
assert.strictEqual(jwst.name, 'JWST');
assert.ok(jwst.children.length >= 4, 'JWST should have sunshield, beryllium gold mirror, and secondary boom');
console.log(`[PASS] createJWST() generated hierarchy with ${jwst.children.length} structural elements`);

const astronaut = satellites.createAstronaut();
assert.strictEqual(astronaut.name, 'Astronaut');
assert.ok(astronaut.children.length >= 5, 'Astronaut should have helmet visor, suit, and MMU');
console.log(`[PASS] createAstronaut() generated hierarchy with ${astronaut.children.length} structural elements`);

const voyager = satellites.createVoyager1();
assert.ok(voyager.name === 'Voyager 1' || voyager.name === 'Voyager1');
assert.ok(voyager.children.length >= 5, 'Voyager should have parabolic dish, Golden Record, and RTG booms');
console.log(`[PASS] createVoyager1() generated hierarchy with ${voyager.children.length} structural elements`);

// 3. Verify HTML and DOM Structure
console.log('\n--- 3. UI Navigation & Section 11 Hook Verification ---');
const indexHtml = fs.readFileSync('index.html', 'utf-8');
assert.ok(indexHtml.includes('id="sec-satellites"'), 'index.html missing Section 11 (#sec-satellites)');
assert.ok(indexHtml.includes('data-section="sec-satellites"'), 'index.html missing Missions category pill');
assert.ok(indexHtml.includes('id="lnav-satellites-list"'), 'index.html missing lnav-satellites-list container');
console.log('[PASS] index.html contains Section 11 and Missions category pill');

// 4. Verify main.js Implementation Details
console.log('\n--- 4. main.js Simulation & Render Enhancements ---');
const mainJs = fs.readFileSync('src/main.js', 'utf-8');
assert.ok(mainJs.includes('this.setSimulationPaused(true);'), 'jumpTime must pause simulation clock for static inspection');
assert.ok(mainJs.includes('this.buildHumanSpacecraft();'), 'Solar System must instantiate human missions');
assert.ok(mainJs.includes('this.focusOnSpacecraft'), 'Must support 360 focusing on spacecraft');
assert.ok(mainJs.includes('sizeAttenuation: false'), 'Deep space background must use sizeAttenuation: false for visible stars');
assert.ok(mainJs.includes('mwStarCount'), 'Deep space background must include Milky Way galactic band');
assert.ok(mainJs.includes('brightCount'), 'Deep space background must include prominent 1st-magnitude stars');
console.log('[PASS] main.js contains time pausing, spacecraft building/focusing, and interstellar skybox');

console.log('\n===============================================================');
console.log('ALL NEW FEATURES VERIFIED SUCCESSFULLY (0 FAILURES).');
console.log('===============================================================\n');
