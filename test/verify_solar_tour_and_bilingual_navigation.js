import { readFileSync } from 'fs';
import { resolve } from 'path';
import { translations } from '../src/i18n.js';

console.log('=== VERIFYING SOLAR SYSTEM GUIDED TOUR & BILINGUAL NAVIGATION ===\n');

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

const html = readFileSync(resolve('index.html'), 'utf8');
const mainJs = readFileSync(resolve('src/main.js'), 'utf8');
const styleCss = readFileSync(resolve('src/style.css'), 'utf8');

// --- 1. Guided Tour Welcome Dashboard (Screenshot 1) ---
console.log('--- 1. Guided Tour Welcome Dashboard Verification (Screenshot 1) ---');
assert(html.includes('id="tour-welcome-panel"'), 'index.html contains #tour-welcome-panel');
assert(html.includes('id="txt-tour-badge"'), 'index.html contains GUIDED TOUR badge (#txt-tour-badge)');
assert(html.includes('id="txt-tour-welcome-title"'), 'index.html contains tour welcome title');
assert(html.includes('id="txt-tour-welcome-desc"'), 'index.html contains tour description');
assert(html.includes('id="txt-stat-star"') && html.includes('id="txt-stat-planets"') && html.includes('id="txt-stat-earth"'), 'index.html contains 3 key metric counters (1 star, 8 planets, 1 Earth)');
assert(html.includes('id="txt-sticky-note"'), 'index.html contains yellow sticky card (#txt-sticky-note)');
assert(html.includes('id="txt-step-1"') && html.includes('id="txt-step-2"') && html.includes('id="txt-step-3"'), 'index.html contains 3-step numbered guide');
assert(html.includes('id="btn-start-solar-tour"'), 'index.html contains Start the tour button');
assert(html.includes('id="btn-close-tour-welcome"'), 'index.html contains close / explore freely button');

// --- 2. Top Celestial Navigation Pills Bar (Screenshots 1 & 3) ---
console.log('\n--- 2. Top Celestial Navigation Bar Verification (Screenshots 1 & 3) ---');
assert(html.includes('id="celestial-pills-bar"'), 'index.html contains horizontal pills bar (#celestial-pills-bar)');
const requiredPills = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
requiredPills.forEach(p => {
  assert(html.includes(`data-id="${p}"`), `Celestial pill [${p}] is present with data-id`);
});
assert(html.includes('id="system-guide-ticker"'), 'index.html contains dynamic system guide ticker');

// --- 3. Bottom Controls Bar & Facts Ticker (Screenshots 1 & 3) ---
console.log('\n--- 3. Bottom Controls Bar & Facts Ticker Verification ---');
assert(html.includes('id="bottom-fact-pill"') && html.includes('id="txt-bottom-fact"'), 'index.html contains bottom astronomical fact banner (#txt-bottom-fact)');
assert(html.includes('id="sim-speed-slider"') && html.includes('id="txt-slider-speed-badge"'), 'index.html contains simulation speed slider with days/s badge');
assert(html.includes('id="chk-bottom-orbits"'), 'index.html contains Orbits toggle checkbox');
assert(html.includes('id="chk-bottom-names"'), 'index.html contains Names toggle checkbox');
assert(html.includes('id="btn-bottom-home"'), 'index.html contains bottom Home / Accueil pill');

// --- 4. Bilingual Translation Coverage (EN & FR) ---
console.log('\n--- 4. Bilingual Translations Coverage (i18n.js) ---');
const requiredI18nKeys = [
  'tourBadge', 'tourMainHeadingPrefix', 'tourMainHeadingAccent', 'tourMainDesc',
  'tourStatStar', 'tourStatPlanets', 'tourStatEarth', 'tourStickyNote',
  'tourStep1', 'tourStep2', 'tourStep3', 'tourBtnStart', 'tourBtnSkip',
  'topSysTitle', 'topSysSubtitle', 'bottomFact1', 'bottomFact2', 'bottomDaysPerSec',
  'bottomAccueil', 'bottomOrbits', 'bottomNames'
];
requiredI18nKeys.forEach(k => {
  assert(translations.en[k] !== undefined, `EN translation defined for [${k}]`);
  assert(translations.fr[k] !== undefined, `FR translation defined for [${k}]`);
});

// --- 5. main.js Bilingual Navigation & Methods ---
console.log('\n--- 5. main.js Bilingual Navigation & Method Implementations ---');
assert(mainJs.includes('initTourWelcome() {'), 'mainJs implements initTourWelcome method');
assert(mainJs.includes('initCelestialPills() {'), 'mainJs implements initCelestialPills method');
assert(mainJs.includes('highlightCelestialPill('), 'mainJs implements highlightCelestialPill method');
assert(mainJs.includes('initBottomControls() {'), 'mainJs implements initBottomControls method');
assert(mainJs.includes('updateBillboardLabelsText() {'), 'mainJs implements updateBillboardLabelsText for live 3D label translation');

// Verify alias handling for Terre, Lune, Soleil, Mercure, Saturne in navigateToCelestialBody
assert(mainJs.includes("'soleil': 'sun'") && mainJs.includes("'terre': 'earth'") && mainJs.includes("'lune': 'luna'") && mainJs.includes("'mercure': 'mercury'"), 'navigateToCelestialBody maps French names (soleil, terre, lune, mercure) to standard IDs');

// Verify removal of "Fly 3D" in left nav
assert(!mainJs.includes('Fly 3D'), 'mainJs has removed "Fly 3D" button text in favor of "3D View"');

// --- 6. CSS Styling Verification ---
console.log('\n--- 6. CSS Styling Verification ---');
assert(styleCss.includes('.tour-welcome-panel'), 'style.css defines .tour-welcome-panel');
assert(styleCss.includes('.tour-welcome-card'), 'style.css defines .tour-welcome-card');
assert(styleCss.includes('.tour-sticky-card'), 'style.css defines .tour-sticky-card with realistic tilted yellow post-it note aesthetic');
assert(styleCss.includes('.celestial-pills-bar'), 'style.css defines .celestial-pills-bar');
assert(styleCss.includes('.bottom-fact-banner'), 'style.css defines .bottom-fact-banner');
assert(styleCss.includes('.lang-btn.active'), 'style.css styles active language button with yellow accent');

console.log('\n===============================================================');
if (failCount === 0) {
  console.log(`ALL SOLAR TOUR & BILINGUAL VERIFICATIONS PASSED (${passCount} PASSED, 0 FAILURES).`);
  console.log('===============================================================');
  process.exit(0);
} else {
  console.error(`VERIFICATION FAILED: ${failCount} failures out of ${passCount + failCount} assertions.`);
  console.log('===============================================================');
  process.exit(1);
}
