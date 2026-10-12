import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fast 3D View Motion, Interactive Image Navigation, and Glowing Highlights', () => {
  const mainJsPath = path.resolve(process.cwd(), 'src/main.js');
  const styleCssPath = path.resolve(process.cwd(), 'src/style.css');
  const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');
  const styleCssCode = fs.readFileSync(styleCssPath, 'utf8');

  it('1. Fast Snappy Camera Motion (durations <= 0.90s with power2.out easing)', () => {
    // Check focusOnPlanet tween duration
    const planetDurationMatch = mainJsCode.match(/focusOnPlanet[\s\S]*?duration:\s*([0-9.]+)/);
    expect(planetDurationMatch).not.toBeNull();
    const planetDuration = parseFloat(planetDurationMatch[1]);
    expect(planetDuration).toBeLessThanOrEqual(0.85);

    // Check focusOnMoon tween duration
    const moonDurationMatch = mainJsCode.match(/focusOnMoon[\s\S]*?duration:\s*([0-9.]+)/);
    expect(moonDurationMatch).not.toBeNull();
    const moonDuration = parseFloat(moonDurationMatch[1]);
    expect(moonDuration).toBeLessThanOrEqual(0.75);

    // Check flyToStarSystem tween duration
    const sysDurationMatch = mainJsCode.match(/flyToStarSystem[\s\S]*?duration:\s*([0-9.]+)/);
    expect(sysDurationMatch).not.toBeNull();
    const sysDuration = parseFloat(sysDurationMatch[1]);
    expect(sysDuration).toBeLessThanOrEqual(0.85);

    // Check flyToGalaxyView tween duration
    const galaxyDurationMatch = mainJsCode.match(/flyToGalaxyView[\s\S]*?duration:\s*([0-9.]+)/);
    expect(galaxyDurationMatch).not.toBeNull();
    const galaxyDuration = parseFloat(galaxyDurationMatch[1]);
    expect(galaxyDuration).toBeLessThanOrEqual(0.90);

    // Check focusOnSpacecraft tween duration
    const craftDurationMatch = mainJsCode.match(/focusOnSpacecraft[\s\S]*?duration:\s*([0-9.]+)/);
    expect(craftDurationMatch).not.toBeNull();
    const craftDuration = parseFloat(craftDurationMatch[1]);
    expect(craftDuration).toBeLessThanOrEqual(0.85);

    // Easing should be power2.out for rapid responsiveness
    expect(mainJsCode).toContain("ease: 'power2.out'");
  });

  it('2. Interactive Image and Thumbnail Click Handlers in Left Navigation', () => {
    // Section 1: Galaxy row click
    expect(mainJsCode).toContain("secGalaxyRow.addEventListener('click', triggerGalaxyNav)");
    
    // Section 3: Solar System row click
    expect(mainJsCode).toContain("secSolarRow.addEventListener('click', triggerSolarNav)");

    // Section 5: Planet card and thumb interaction
    expect(mainJsCode).toContain("card.className = 'lnav-planet-card'");
    expect(mainJsCode).toContain("lnav-planet-thumb-wrap");
    expect(mainJsCode).toContain("lnav-card-hover-overlay");
    expect(mainJsCode).toContain("card.addEventListener('click'");

    // Section 6: Moon item and thumb interaction
    expect(mainJsCode).toContain("item.className = 'lnav-moon-item'");
    expect(mainJsCode).toContain("lnav-moon-thumb-wrap");
    expect(mainJsCode).toContain("item.addEventListener('click'");
  });

  it('3. Explicit Navigation Options (Action Buttons & Overlays)', () => {
    // Planet card navigation button & overlay
    expect(mainJsCode).toContain("lnav-card-nav-btn");
    expect(mainJsCode).toContain("Fly 3D");
    expect(mainJsCode).toContain("3D View");

    // Moon navigation button
    expect(mainJsCode).toContain("lnav-moon-nav-btn");

    // Details panel hero image click handler
    expect(mainJsCode).toContain("heroImgEl.onclick = () => {");
    expect(mainJsCode).toContain("heroImgEl.title = 'Click image to fly into 3D view 🚀'");
    expect(mainJsCode).toContain("heroImgEl.style.cursor = 'pointer'");
  });

  it('4. highlightActiveNav Glowing Selection State across Celestial Bodies and Sections', () => {
    expect(mainJsCode).toContain("highlightActiveNav(type, id)");
    expect(mainJsCode).toContain("sec-galaxy");
    expect(mainJsCode).toContain("sec-solar");
    expect(mainJsCode).toContain("lnav-planet-card[data-planet-id=");
    expect(mainJsCode).toContain("lnav-moon-item[data-moon-id=");
    expect(mainJsCode).toContain("scrollIntoView({ behavior: 'smooth', block: 'nearest' })");
  });

  it('5. CSS Visual Highlighting & Glowing Styles in style.css', () => {
    // Planet active glowing card & thumb
    expect(styleCssCode).toContain(".lnav-planet-card.active");
    expect(styleCssCode).toContain(".lnav-planet-card.active .lnav-planet-thumb-wrap");
    expect(styleCssCode).toContain(".lnav-card-nav-btn");
    expect(styleCssCode).toContain(".lnav-card-hover-overlay");

    // Moon active item & thumb
    expect(styleCssCode).toContain(".lnav-moon-item.active");
    expect(styleCssCode).toContain(".lnav-moon-nav-btn");

    // Galaxy & Solar System active highlighting
    expect(styleCssCode).toContain("#sec-galaxy.active");
    expect(styleCssCode).toContain("#sec-solar.active");

    // Detail hero banner interactive styles
    expect(styleCssCode).toContain(".detail-hero-banner:hover");
    expect(styleCssCode).toContain("box-shadow: 0 0 20px rgba(56, 189, 248, 0.45)");
  });
});
