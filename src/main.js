import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

import { createMilkyWay, createStarTexture, createCloudTexture } from './galaxy.js';
import * as textures from './textures.js';
import { sound } from './audio.js';
import { i18n } from './i18n.js';

import * as satellites from './satellites.js';

import solarSystemData from './data/solar-system.json';
import systemsData from './data/systems.json';
import creditsData from './data/credits.json';

import { SimulationClock, solveKepler, calculateKeplerianPosition } from './astro-engine.js';
export { SimulationClock, solveKepler, calculateKeplerianPosition };

/**
 * Milky Way Explorer - Advanced 3D Engine & Multi-Epoch Simulator
 */
class MilkyWayExplorer {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.viewMode = 'galaxy'; // 'galaxy' | 'system' | 'planet' | 'moon' | 'spacecraft'
    this.currentSystem = null;
    this.currentPlanet = null;
    this.currentMoon = null;
    this.currentSpacecraft = null;
    this.currentSpacecraftMesh = null;

    // Single Authoritative Simulation Clock
    this.clock = new SimulationClock();
    
    // Visual toggles
    this.showOrbits = true;
    this.showLabels = true;

    // Guided tour state
    this.isTourActive = false;
    this.tourStepIndex = 0;
    this.tourStops = [];

    // Interactive Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.clickableObjects = [];
    this.hoveredObject = null;

    // 3D Scene Groups
    this.systemGroup = new THREE.Group();
    this.orbitMeshes = [];
    this.planetMeshes = [];
    this.moonMeshes = [];
    this.moonOrbitLines = [];
    this.moonAnchorGroups = [];
    this.spacecraftMeshes = [];
    this.starMesh = null;
    this.starGlowSprite = null;
    this.earthCloudsMesh = null;
    this.activeCamTween = null;

    // Marker objects in Galaxy View
    this.systemMarkers = [];
    this.labelSprites = [];
    this.planetLabelSprites = [];
    this.moonLabelSprites = [];
    this.starLabelSprite = null;
    this.sunMarker = null;

    this.initThree();
    this.initScene();
    this.initUI();
    this.initTour();
    this.initCosmicGuideModal();
    this.initLeftNavDrawer();
    // Auto-collapse navigation on mobile for better initial experience
    if (window.innerWidth <= 768) {
      const drawer = document.getElementById('left-nav-drawer');
      const floatingBtn = document.getElementById('btn-left-nav-floating-open');
      if (drawer) drawer.classList.add('collapsed');
      if (floatingBtn) floatingBtn.classList.add('visible');
    }
    this.animate(0);

    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) loader.classList.add('hidden');
    }, 600);
  }

  killCameraTransition() {
    if (this.activeCamTween) {
      this.activeCamTween.kill();
      this.activeCamTween = null;
    }
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);
  }

  get simulatedDays() {
    return this.clock ? this.clock.simulatedDays : 0.0;
  }
  set simulatedDays(val) {
    if (this.clock) this.clock.simulatedDays = val;
  }

  get isPaused() {
    return this.clock ? this.clock.isPaused : false;
  }
  set isPaused(val) {
    if (this.clock) this.clock.isPaused = val;
  }

  get timeScale() {
    return this.clock ? this.clock.timeScale : 1.0;
  }
  set timeScale(val) {
    if (this.clock) this.clock.timeScale = val;
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030712, 0.00006);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      50000
    );
    this.camera.position.set(0, 1600, 2200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.maxDistance = 6000;
    this.controls.minDistance = 1.5;
    this.controls.target.set(0, 0, 0);

    this.ambientLight = new THREE.AmbientLight(0x0f2042, 0.42);
    this.scene.add(this.ambientLight);

    this.starPointLight = new THREE.PointLight(0xffffff, 3.8, 5000, 0.12);
    this.scene.add(this.starPointLight);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  initScene() {
    this.createDeepSpaceBackground();
    this.galaxy = createMilkyWay({ radius: 1450 });
    this.scene.add(this.galaxy.group);
    this.scene.add(this.systemGroup);
    this.createSystemMarkers();
  }

  createDeepSpaceBackground() {
    const bgGroup = new THREE.Group();
    bgGroup.name = 'DeepSpaceBackground';

    const starTex = createStarTexture();
    const cloudTex = createCloudTexture();

    // 1. Distant Sharp Starfield (32,000 stars across vast celestial sphere)
    const starCount = 32000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const tempColor = new THREE.Color();
    const palette = [
      new THREE.Color(0xb4d4ff), // O/B Hot blue-white
      new THREE.Color(0xe0e8ff), // A Pure white
      new THREE.Color(0xfff5eb), // F/G Sun-like warm white
      new THREE.Color(0xffdeb8), // K Orange
      new THREE.Color(0xffb896)  // M Red giant
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 22000 + Math.random() * 6000;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const sinPhi = Math.sin(phi);

      positions[i * 3] = radius * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta);

      const colorPick = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.55 + Math.random() * 0.45;
      tempColor.copy(colorPick).multiplyScalar(brightness);

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Sharp 2.0px physical screen points (sizeAttenuation: false ensures zero sub-pixel vanishing)
    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      map: starTex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
      fog: false
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    bgGroup.add(starPoints);

    // 2. Milky Way Galactic Dust Lane & Dense Star Belt (16,000 concentrated micro-stars)
    const mwStarCount = 16000;
    const mwGeo = new THREE.BufferGeometry();
    const mwPositions = new Float32Array(mwStarCount * 3);
    const mwColors = new Float32Array(mwStarCount * 3);

    const mwPalette = [
      new THREE.Color(0xfff2e0),
      new THREE.Color(0xdce7ff),
      new THREE.Color(0xffe8cc),
      new THREE.Color(0x93c5fd)
    ];

    // Inclination of galactic plane ~62.8 deg relative to celestial equator
    const galInc = THREE.MathUtils.degToRad(62.8);
    const cosInc = Math.cos(galInc);
    const sinInc = Math.sin(galInc);

    for (let k = 0; k < mwStarCount; k++) {
      const radius = 21000 + Math.random() * 5000;
      const l = Math.random() * Math.PI * 2; // galactic longitude
      // Gaussian dispersion across galactic latitude (b)
      const u1 = Math.random(), u2 = Math.random();
      const bRad = (Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)) * 0.12;

      // Position in galactic coordinates
      const xG = radius * Math.cos(bRad) * Math.cos(l);
      const yG = radius * Math.sin(bRad);
      const zG = radius * Math.cos(bRad) * Math.sin(l);

      // Rotate by galactic inclination
      mwPositions[k * 3] = xG;
      mwPositions[k * 3 + 1] = yG * cosInc - zG * sinInc;
      mwPositions[k * 3 + 2] = yG * sinInc + zG * cosInc;

      const cPick = mwPalette[Math.floor(Math.random() * mwPalette.length)];
      const bVal = 0.6 + Math.random() * 0.4;
      tempColor.copy(cPick).multiplyScalar(bVal);

      mwColors[k * 3] = tempColor.r;
      mwColors[k * 3 + 1] = tempColor.g;
      mwColors[k * 3 + 2] = tempColor.b;
    }

    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));

    const mwMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      map: starTex,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
      fog: false
    });
    const mwPoints = new THREE.Points(mwGeo, mwMat);
    bgGroup.add(mwPoints);

    // 3. Prominent 1st-Magnitude Bright Stars (Sirius, Canopus, Vega, Betelgeuse, Rigel, Arcturus)
    const brightCount = 64;
    const brightGeo = new THREE.BufferGeometry();
    const brightPositions = new Float32Array(brightCount * 3);
    const brightColors = new Float32Array(brightCount * 3);

    const brightPalette = [
      new THREE.Color(0x93c5fd), // Sirius (A1V Diamond-blue)
      new THREE.Color(0xfbcfe8), // Betelgeuse (M1-2 Supergiant orange-pink)
      new THREE.Color(0x60a5fa), // Rigel (B8Ia Blue supergiant)
      new THREE.Color(0xfde047), // Capella (G3 Yellow giant)
      new THREE.Color(0xfb923c)  // Arcturus (K0 Orange giant)
    ];

    for (let b = 0; b < brightCount; b++) {
      const bRad = 20000 + Math.random() * 4000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      brightPositions[b * 3] = bRad * Math.sin(phi) * Math.cos(theta);
      brightPositions[b * 3 + 1] = bRad * Math.cos(phi);
      brightPositions[b * 3 + 2] = bRad * Math.sin(phi) * Math.sin(theta);

      const color = brightPalette[b % brightPalette.length];
      brightColors[b * 3] = color.r;
      brightColors[b * 3 + 1] = color.g;
      brightColors[b * 3 + 2] = color.b;
    }

    brightGeo.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3));
    brightGeo.setAttribute('color', new THREE.BufferAttribute(brightColors, 3));

    const brightMat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      map: starTex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
      fog: false
    });
    const brightStars = new THREE.Points(brightGeo, brightMat);
    bgGroup.add(brightStars);

    // 4. Interstellar Cosmic Nebulae (Orion rose-pink, Cygnus cyan, Eagle violet, Carina amber)
    const nebulaColors = [
      0x0c4a6e, // Deep cosmic cyan
      0x4c1d95, // Deep interstellar violet
      0x831843, // Hydrogen-Alpha deep magenta
      0x1e1b4b, // Deep space indigo
      0x78350f  // Cosmic dust amber
    ];

    const nebulaCount = 24;
    for (let j = 0; j < nebulaCount; j++) {
      const nRadius = 18000 + Math.random() * 5000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      const x = nRadius * Math.sin(phi) * Math.cos(theta);
      const y = nRadius * Math.cos(phi);
      const z = nRadius * Math.sin(phi) * Math.sin(theta);

      const nebMat = new THREE.SpriteMaterial({
        map: cloudTex,
        color: nebulaColors[j % nebulaColors.length],
        transparent: true,
        opacity: 0.22 + Math.random() * 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false // Crucial: bypass fog so vibrant cosmic colors glow
      });

      const sprite = new THREE.Sprite(nebMat);
      sprite.position.set(x, y, z);
      const scale = 5000 + Math.random() * 6000;
      sprite.scale.set(scale, scale, 1);
      bgGroup.add(sprite);
    }

    this.scene.add(bgGroup);
    this.deepSpaceBackground = bgGroup;
  }

  createSystemMarkers() {
    const sunCoords = this.galaxy.sunCoordinates;
    const markerTexture = this.createCircleTexture('#38bdf8');
    const sunMarkerTexture = this.createCircleTexture('#f59e0b', true);

    systemsData.forEach((sys) => {
      let markerPos = new THREE.Vector3();
      if (sys.isSolarSystem) {
        markerPos.set(sunCoords.x, sunCoords.y, sunCoords.z);
      } else {
        const scale = 0.08;
        markerPos.set(
          sunCoords.x + (sys.coords_ly.x * scale),
          sunCoords.y + (sys.coords_ly.z * scale),
          sunCoords.z + (sys.coords_ly.y * scale)
        );
      }

      const isSun = sys.isSolarSystem;
      const mat = new THREE.SpriteMaterial({
        map: isSun ? sunMarkerTexture : markerTexture,
        color: new THREE.Color(sys.star.colorHex || (isSun ? '#ffa500' : '#38bdf8')),
        transparent: true,
        opacity: isSun ? 1.0 : 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      const spriteSize = isSun ? 24 : (sys.planetCount >= 5 ? 10 : 6.5);
      sprite.scale.set(spriteSize, spriteSize, 1);
      sprite.position.copy(markerPos);

      sprite.userData = {
        type: 'system-marker',
        systemData: sys,
        isSun: isSun,
        baseScale: spriteSize
      };

      this.scene.add(sprite);
      this.systemMarkers.push(sprite);
      this.clickableObjects.push(sprite);

      if (isSun) this.sunMarker = sprite;

      if (isSun || sys.planetCount >= 5 || sys.dist_ly < 16) {
        const labelSprite = this.createTextLabelSprite(
          isSun ? "Sun (You Are Here)" : sys.name.en,
          sys.star.colorHex
        );
        labelSprite.position.set(markerPos.x, markerPos.y + (spriteSize * 0.7) + 6, markerPos.z);
        labelSprite.userData = { isSun, systemId: sys.id };
        this.scene.add(labelSprite);
        this.labelSprites.push(labelSprite);
      }
    });
  }

  /**
   * Helper to control galaxy marker visibility when in System vs Galaxy view
   * Prevents labels and markers from overlapping planets in System View!
   */
  setGalaxyMarkersVisible(visible) {
    this.systemMarkers.forEach(m => {
      m.visible = visible;
    });
    this.labelSprites.forEach(l => {
      l.visible = visible && this.showLabels;
    });
  }

  createCircleTexture(color = '#ffffff', isSun = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.25, color);
    grad.addColorStop(0.65, isSun ? 'rgba(255, 160, 20, 0.4)' : 'rgba(56, 189, 248, 0.3)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  createTextLabelSprite(text, colorHex = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = colorHex || '#ffffff';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(40, 10, 1);
    return sprite;
  }

  createCelestialLabel(name, icon = '', colorHex = '#ffffff', isMoon = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Clean celestial name tag text: NO BOX, NO BORDERS, NO BACKGROUND, NO DOTS
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cleanName = String(name || '').trim();
    const fontSize = isMoon ? 38 : 44;
    ctx.font = `700 ${fontSize}px "Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif`;

    // Razor-sharp dark background outline stroke so text is 100% readable over stars & milky way
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
    ctx.strokeText(cleanName, 256, 64);

    // Pure crisp white fill with soft astronomical glow tint
    const glowColor = (typeof icon === 'string' && icon.startsWith('#') ? icon : colorHex) || '#38bdf8';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cleanName, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    const spriteW = isMoon ? 10 : 15;
    const spriteH = isMoon ? 2.5 : 3.75;
    sprite.scale.set(spriteW, spriteH, 1);
    sprite.visible = this.showLabels;
    return sprite;
  }

  updateLabelsVisibility() {
    if (this.viewMode === 'galaxy') {
      this.labelSprites.forEach(sprite => sprite.visible = this.showLabels);
      this.planetLabelSprites.forEach(sprite => sprite.visible = false);
      this.moonLabelSprites.forEach(sprite => sprite.visible = false);
      if (this.starLabelSprite) this.starLabelSprite.visible = false;
    } else if (this.viewMode === 'system') {
      this.labelSprites.forEach(sprite => sprite.visible = false);
      this.planetLabelSprites.forEach(sprite => sprite.visible = this.showLabels);
      this.moonLabelSprites.forEach(sprite => sprite.visible = false);
      if (this.starLabelSprite) this.starLabelSprite.visible = this.showLabels;
    } else if (this.viewMode === 'planet' || this.viewMode === 'moon') {
      this.labelSprites.forEach(sprite => sprite.visible = false);
      this.planetLabelSprites.forEach(sprite => sprite.visible = this.showLabels);
      if (this.starLabelSprite) this.starLabelSprite.visible = this.showLabels;
      // Only show moon labels belonging to current focused planet
      const currentPlanetId = this.currentPlanet?.id;
      this.moonLabelSprites.forEach(sprite => {
        const parentId = sprite.userData?.moonMesh?.userData?.parentPlanetMesh?.userData?.planetData?.id ||
                         sprite.userData?.moonData?.parentId;
        sprite.visible = this.showLabels && (parentId === currentPlanetId);
      });
    } else {
      this.planetLabelSprites.forEach(sprite => sprite.visible = this.showLabels);
      this.moonLabelSprites.forEach(sprite => sprite.visible = false);
      if (this.starLabelSprite) this.starLabelSprite.visible = this.showLabels;
    }
  }



  /**
   * LEVEL 2: Build Star System
   */
  loadStarSystem(systemData) {
    this.currentSystem = systemData;
    this.viewMode = 'system';
    this.currentPlanet = null;
    this.currentMoon = null;

    // Hide distant galaxy markers and galaxy particles so they DO NOT clutter and blind this system
    this.setGalaxyMarkersVisible(false);
    if (this.galaxy && this.galaxy.group) {
      this.galaxy.group.visible = false;
    }

    // Reset previous system children
    while (this.systemGroup.children.length > 0) {
      const obj = this.systemGroup.children[0];
      this.systemGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this.orbitMeshes = [];
    this.planetMeshes = [];
    this.moonMeshes = [];
    this.moonOrbitLines = [];
    this.moonAnchorGroups = [];
    this.hotspotSprites = [];
    this.planetLabelSprites = [];
    this.moonLabelSprites = [];
    this.starLabelSprite = null;
    this.systemGroup.visible = true;

    const sunCoords = this.galaxy.sunCoordinates;
    if (systemData.isSolarSystem) {
      this.systemGroup.position.set(sunCoords.x, sunCoords.y, sunCoords.z);
    } else {
      const scale = 0.08;
      this.systemGroup.position.set(
        sunCoords.x + (systemData.coords_ly.x * scale),
        sunCoords.y + (systemData.coords_ly.z * scale),
        sunCoords.z + (systemData.coords_ly.y * scale)
      );
    }

    // Host Star (Clean white tint so real NASA solar photography shines with crisp fidelity)
    const starRadius = systemData.isSolarSystem ? 14 : Math.max(8, Math.min(22, (systemData.star.radiusSolar || 1) * 12));
    const starGeo = new THREE.SphereGeometry(starRadius, 48, 48);
    const starTexture = textures.createSunTexture();

    const starMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      color: new THREE.Color(0xffffff)
    });
    this.starMesh = new THREE.Mesh(starGeo, starMat);
    this.starMesh.userData = { type: 'star', systemData: systemData };
    this.systemGroup.add(this.starMesh);
    this.clickableObjects.push(this.starMesh);

    // Corona Sprite (Atmospheric outer solar glow)
    const coronaTexture = this.createCircleTexture(systemData.star.colorHex || '#ffa500', true);
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      color: new THREE.Color(systemData.star.colorHex || '#ffa500'),
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.starGlowSprite = new THREE.Sprite(coronaMat);
    this.starGlowSprite.raycast = () => {};
    this.starGlowSprite.scale.set(starRadius * 4.4, starRadius * 4.4, 1);
    this.systemGroup.add(this.starGlowSprite);

    // Host Star 3D Billboard Celestial Name Tag
    const starLabelRaw = systemData.star?.name;
    const starLabelName = systemData.isSolarSystem ? 'The Sun' : (typeof starLabelRaw === 'object' ? (starLabelRaw[i18n.lang] || starLabelRaw.en) : (starLabelRaw || 'Star'));
    this.starLabelSprite = this.createCelestialLabel(starLabelName, '', systemData.star.colorHex || '#f59e0b', false);
    this.starLabelSprite.scale.set(16, 4.0, 1);
    this.starLabelSprite.position.set(0, starRadius + 9.5, 0);
    this.starLabelSprite.userData = {
      type: 'star-label',
      starMesh: this.starMesh,
      systemData: systemData
    };
    this.systemGroup.add(this.starLabelSprite);
    this.clickableObjects.push(this.starLabelSprite);

    this.starPointLight.position.copy(this.systemGroup.position);
    this.starPointLight.color.set(systemData.star.colorHex || '#ffffff');

    if (systemData.isSolarSystem) {
      this.buildSolarSystemPlanets(starRadius);
    } else {
      this.buildExoplanets(systemData, starRadius);
    }

    this.systemGroup.updateMatrixWorld(true);
    this.scene.updateMatrixWorld(true);

    this.updateBreadcrumbs();
    this.showDetailsPanel(systemData, 'system');
  }

  createAtmosphereGlow(radius, colorHex, intensity = 1.0, power = 3.0) {
    const atmoGeo = new THREE.SphereGeometry(radius * 1.06, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(colorHex) },
        intensity: { value: intensity },
        power: { value: power }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        uniform float power;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0);
          float glow = pow(rim, power) * intensity;
          // Soft inner haze for realism
          float innerFade = pow(max(dot(viewDir, vNormal), 0.0), 2.0);
          glow = glow * (1.0 - innerFade * 0.35);
          gl_FragColor = vec4(glowColor, glow * 0.92);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.raycast = () => {};
    return atmoMesh;
  }

  buildSolarSystemPlanets(starRadius) {
    const planetsList = solarSystemData.system.planets;
    const baseDistance = starRadius + 22;
    const distanceStep = 24;

    planetsList.forEach((planet, index) => {
      const orbitRadius = baseDistance + (index * distanceStep) + (index > 4 ? (index - 4) * 16 : 0);

      const eccentricity = planet.eccentricity || 0;
      const inclinationDeg = planet.inclinationDeg || 0;
      const incRad = THREE.MathUtils.degToRad(inclinationDeg);
      const b = orbitRadius * Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity));

      // 3D Keplerian Elliptical Orbit Geometry with Sun at Focus (0, 0, 0)
      const orbitPoints = [];
      const numSegments = 128;
      for (let s = 0; s <= numSegments; s++) {
        const E_sample = (s / numSegments) * 2 * Math.PI;
        const xOrb = orbitRadius * (Math.cos(E_sample) - eccentricity);
        const zOrb = b * Math.sin(E_sample);
        orbitPoints.push(new THREE.Vector3(
          xOrb,
          zOrb * Math.sin(incRad),
          zOrb * Math.cos(incRad)
        ));
      }

      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitColor = planet.id === 'earth' ? 0x60a5fa : 0x38bdf8;
      const orbitMat = new THREE.LineBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: planet.id === 'earth' ? 0.45 : 0.32,
        blending: THREE.AdditiveBlending,
        visible: this.showOrbits
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.raycast = () => {};
      this.systemGroup.add(orbitLine);
      this.orbitMeshes.push(orbitLine);

      let planetRadius = 2.0;
      if (planet.id === 'mercury') planetRadius = 1.4;
      else if (planet.id === 'venus') planetRadius = 2.5;
      else if (planet.id === 'earth') planetRadius = 2.7;
      else if (planet.id === 'mars') planetRadius = 1.8;
      else if (planet.id === 'jupiter') planetRadius = 7.5;
      else if (planet.id === 'saturn') planetRadius = 6.2;
      else if (planet.id === 'uranus') planetRadius = 4.2;
      else if (planet.id === 'neptune') planetRadius = 4.0;
      else if (planet.id === 'pluto') planetRadius = 1.1;

      const planetGeo = new THREE.SphereGeometry(planetRadius, 64, 64);
      let pTex;
      if (planet.id === 'mercury') pTex = textures.createMercuryTexture();
      else if (planet.id === 'venus') pTex = textures.createVenusTexture();
      else if (planet.id === 'earth') pTex = textures.createEarthTexture();
      else if (planet.id === 'mars') pTex = textures.createMarsTexture();
      else if (planet.id === 'jupiter') pTex = textures.createJupiterTexture();
      else if (planet.id === 'saturn') pTex = textures.createSaturnTexture();
      else if (planet.id === 'uranus') pTex = textures.createUranusTexture();
      else if (planet.id === 'neptune') pTex = textures.createNeptuneTexture();
      else if (planet.id === 'pluto') pTex = textures.createPlutoTexture();
      else pTex = textures.createProceduralPlanetTexture(planet.colorHex);

      let planetMat;
      if (planet.id === 'earth') {
        const earthNormal = textures.createEarthNormalTexture();
        const earthSpecular = textures.createEarthSpecularTexture();
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          normalMap: earthNormal,
          normalScale: new THREE.Vector2(0.85, 0.85),
          roughnessMap: earthSpecular,
          roughness: 0.62,
          metalness: 0.08
        });
      } else if (planet.id === 'mars') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          bumpMap: pTex,
          bumpScale: 0.045,
          roughness: 0.86,
          metalness: 0.04
        });
      } else if (planet.id === 'mercury') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          bumpMap: pTex,
          bumpScale: 0.06,
          roughness: 0.92,
          metalness: 0.08
        });
      } else if (planet.id === 'venus') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          roughness: 0.65,
          metalness: 0.02
        });
      } else if (planet.id === 'jupiter' || planet.id === 'saturn') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          roughness: 0.52,
          metalness: 0.02
        });
      } else if (planet.id === 'uranus' || planet.id === 'neptune') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          roughness: 0.42,
          metalness: 0.05
        });
      } else if (planet.id === 'pluto') {
        planetMat = new THREE.MeshStandardMaterial({
          map: pTex,
          bumpMap: pTex,
          bumpScale: 0.035,
          roughness: 0.85,
          metalness: 0.02
        });
      } else {
        planetMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.65, metalness: 0.05 });
      }
      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.rotation.z = THREE.MathUtils.degToRad(planet.axialTilt || 0);

      // Authentic Atmospheric Rayleigh Limb Glows in Deep Space
      if (planet.id === 'earth') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0x38bdf8, 1.8, 2.2);
        planetMesh.add(atmo);
        // Second atmosphere layer for more realistic limb glow
        const atmo2 = this.createAtmosphereGlow(planetRadius, 0x0ea5e9, 0.7, 4.5);
        planetMesh.add(atmo2);
      } else if (planet.id === 'venus') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0xfde68a, 1.45, 2.4);
        planetMesh.add(atmo);
      } else if (planet.id === 'mars') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0xfb923c, 0.9, 3.4);
        planetMesh.add(atmo);
      } else if (planet.id === 'jupiter') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0xfef08a, 1.0, 3.2);
        planetMesh.add(atmo);
      } else if (planet.id === 'saturn') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0xfef3c7, 0.95, 3.2);
        planetMesh.add(atmo);
      } else if (planet.id === 'uranus') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0x7dd3fc, 1.25, 2.7);
        planetMesh.add(atmo);
      } else if (planet.id === 'neptune') {
        const atmo = this.createAtmosphereGlow(planetRadius, 0x3b82f6, 1.35, 2.7);
        planetMesh.add(atmo);
      }

      // Earth Cloud Layer (Floating above surface with transparency)
      if (planet.id === 'earth') {
        const cloudGeo = new THREE.SphereGeometry(planetRadius * 1.018, 64, 64);
        const cloudTex = textures.createEarthCloudsTexture();
        const cloudMat = new THREE.MeshStandardMaterial({
          map: cloudTex,
          transparent: true,
          opacity: 0.85,
          blending: THREE.NormalBlending
        });
        this.earthCloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
        this.earthCloudsMesh.raycast = () => {};
        planetMesh.add(this.earthCloudsMesh);
      }

      // Saturn Concentric Rings with Radial UVs and transparent Cassini Division
      if (planet.hasRing) {
        const ringGeo = textures.createSaturnRingGeometry(
          planetRadius * (planet.ringInner || 1.3),
          planetRadius * (planet.ringOuter || 2.4),
          96
        );
        ringGeo.rotateX(Math.PI / 2);
        const ringTex = textures.createSaturnRingTexture();
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          roughness: 0.8,
          metalness: 0.05
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.userData = { type: 'planet', planetData: planet };
        planetMesh.add(ringMesh);
      }

      const initialAngle = (index * 0.9) + 0.3;
      const initialPos = calculateKeplerianPosition(
        orbitRadius,
        eccentricity,
        inclinationDeg,
        planet.orbitalPeriodDays,
        this.simulatedDays,
        initialAngle
      );
      planetMesh.position.copy(initialPos);

      planetMesh.userData = {
        type: 'planet',
        planetData: planet,
        systemData: solarSystemData.system,
        orbitRadius: orbitRadius,
        eccentricity: eccentricity,
        inclinationDeg: inclinationDeg,
        orbitalPeriodDays: planet.orbitalPeriodDays,
        rotationPeriodHours: planet.rotationPeriodHours || 24,
        initialAngle: initialAngle,
        currentAngle: initialAngle
      };

      this.systemGroup.add(planetMesh);
      this.planetMeshes.push(planetMesh);

      // 3D Billboard Celestial Name Tag for Planet
      const pLabelName = typeof planet.name === 'object' ? (planet.name[i18n.lang] || planet.name.en) : planet.name;
      const pLabelColor = planet.colorHex || '#38bdf8';
      const pLabelSprite = this.createCelestialLabel(pLabelName, '', pLabelColor, false);
      const pYOffset = planetRadius * 1.35 + 2.4;
      pLabelSprite.position.set(initialPos.x, initialPos.y + pYOffset, initialPos.z);
      pLabelSprite.userData = {
        type: 'planet-label',
        planetMesh: planetMesh,
        planetData: planet,
        yOffset: pYOffset
      };
      this.systemGroup.add(pLabelSprite);
      this.planetLabelSprites.push(pLabelSprite);
      this.clickableObjects.push(pLabelSprite);
      planetMesh.userData.labelSprite = pLabelSprite;

      // Moons (Decoupled from planet axial spin)
      if (planet.moonsList && planet.moonsList.length > 0) {
        const moonAnchorGroup = new THREE.Group();
        moonAnchorGroup.name = `moons-${planet.id}`;
        moonAnchorGroup.position.copy(initialPos);
        this.systemGroup.add(moonAnchorGroup);
        this.moonAnchorGroups.push({ group: moonAnchorGroup, planetMesh: planetMesh });

        planet.moonsList.forEach((moon, mIndex) => {
          const moonDistVisual = planetRadius + (moon.orbitRadiusVisual || (planetRadius * 2.5 + mIndex * 3));
          const incDeg = (moon.id === 'luna' || moon.id === 'moon') ? 5.14 : (moon.inclinationDeg || 0);
          const incRad = THREE.MathUtils.degToRad(incDeg);
          
          const mCurve = new THREE.EllipseCurve(0, 0, moonDistVisual, moonDistVisual, 0, 2 * Math.PI, false, 0);
          const mPoints = mCurve.getPoints(64);
          const mGeo = new THREE.BufferGeometry().setFromPoints(mPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
          const mMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.38,
            blending: THREE.AdditiveBlending,
            visible: this.showOrbits
          });
          const mLine = new THREE.Line(mGeo, mMat);
          mLine.raycast = () => {};
          if (incRad !== 0) mLine.rotation.x = incRad;
          moonAnchorGroup.add(mLine);
          this.moonOrbitLines.push(mLine);

          const mRadius = Math.max(0.35, Math.min(1.2, planetRadius * 0.22));
          const moonGeo = new THREE.SphereGeometry(mRadius, 32, 32);
          const moonTex = textures.createMoonTexture(moon.id);
          const isIceMoon = ['europa', 'enceladus'].includes(moon.id);
          const isTitan = moon.id === 'titan';
          const moonMat = new THREE.MeshStandardMaterial({
            map: moonTex,
            bumpMap: isTitan ? null : moonTex,
            bumpScale: 0.05,
            roughness: isIceMoon ? 0.32 : (isTitan ? 0.92 : 0.82),
            metalness: isIceMoon ? 0.08 : 0.04
          });
          const moonMesh = new THREE.Mesh(moonGeo, moonMat);

          // Titan's dense atmospheric haze
          if (moon.id === 'titan') {
            const titanAtmo = this.createAtmosphereGlow(mRadius, 0xf97316, 1.25, 3.0);
            moonMesh.add(titanAtmo);
          }

          const moonAngle = (mIndex * 1.5) + (2 * Math.PI * (this.simulatedDays / (moon.orbitalPeriodDays || 27.3)));
          moonMesh.position.set(
            Math.cos(moonAngle) * moonDistVisual,
            Math.sin(moonAngle) * moonDistVisual * Math.sin(incRad),
            Math.sin(moonAngle) * moonDistVisual * Math.cos(incRad)
          );

          moonMesh.userData = {
            type: 'moon',
            moonData: moon,
            parentPlanetMesh: planetMesh,
            orbitDistanceVisual: moonDistVisual,
            orbitalPeriodDays: moon.orbitalPeriodDays || 27.3,
            inclinationDeg: incDeg,
            initialAngle: moonAngle,
            currentAngle: moonAngle
          };

          moonAnchorGroup.add(moonMesh);
          this.moonMeshes.push(moonMesh);
          this.clickableObjects.push(moonMesh);

          // 3D Billboard Celestial Name Tag for Moon
          const mLabelName = typeof moon.name === 'object' ? (moon.name[i18n.lang] || moon.name.en) : moon.name;
          const mLabelSprite = this.createCelestialLabel(mLabelName, '', '#94a3b8', true);
          const mYOffset = mRadius + 1.8;
          mLabelSprite.position.set(moonMesh.position.x, moonMesh.position.y + mYOffset, moonMesh.position.z);
          mLabelSprite.userData = {
            type: 'moon-label',
            moonMesh: moonMesh,
            moonData: moon,
            yOffset: mYOffset
          };
          mLabelSprite.visible = false; // Hidden in system overview to prevent overlapping clutter
          moonAnchorGroup.add(mLabelSprite);
          this.moonLabelSprites.push(mLabelSprite);
          this.clickableObjects.push(mLabelSprite);
          moonMesh.userData.labelSprite = mLabelSprite;
        });
      }
    });

    // Authentic NASA & SpaceX Human Spacecraft (ISS, Hubble, JWST, Artemis Spacewalker, Voyager 1)
    this.buildHumanSpacecraft();
  }

  buildHumanSpacecraft() {
    this.spacecraftMeshes = [];
    const earthMesh = this.planetMeshes.find(m => m.userData?.planetData?.id === 'earth');
    const earthPos = earthMesh ? earthMesh.position : new THREE.Vector3(70, 0, 0);

    satellites.humanMissionsCatalog.forEach(craftData => {
      let craftGroup = null;
      if (craftData.id === 'iss') {
        craftGroup = satellites.createISS();
        craftGroup.scale.set(0.18, 0.18, 0.18);
      } else if (craftData.id === 'hubble') {
        craftGroup = satellites.createHubble();
        craftGroup.scale.set(0.15, 0.15, 0.15);
      } else if (craftData.id === 'jwst') {
        craftGroup = satellites.createJWST();
        craftGroup.scale.set(0.20, 0.20, 0.20);
      } else if (craftData.id === 'astronaut') {
        craftGroup = satellites.createAstronaut();
        craftGroup.scale.set(0.14, 0.14, 0.14);
      } else if (craftData.id === 'voyager1') {
        craftGroup = satellites.createVoyager1();
        craftGroup.scale.set(0.22, 0.22, 0.22);
      }

      if (!craftGroup) return;

      craftGroup.userData = {
        type: 'spacecraft',
        craftData: craftData,
        orbitParent: craftData.orbitParent,
        orbitRadiusVisual: craftData.orbitRadiusVisual || 4.0,
        initialAngle: Math.random() * Math.PI * 2
      };

      // Set initial positions
      if (craftData.id === 'voyager1') {
        craftGroup.position.set(230, 150, 180);
        craftGroup.rotation.y = Math.PI * 0.75;
      } else if (craftData.id === 'jwst') {
        const l2Dir = earthPos.clone().normalize();
        craftGroup.position.copy(earthPos).add(l2Dir.multiplyScalar(7.5));
      } else {
        const angle = craftGroup.userData.initialAngle;
        const r = craftGroup.userData.orbitRadiusVisual;
        craftGroup.position.set(
          earthPos.x + Math.cos(angle) * r,
          earthPos.y + (craftData.id === 'hubble' ? Math.sin(angle) * 0.8 : 0),
          earthPos.z + Math.sin(angle) * r
        );
      }

      // Add clickable beacon sprite
      const beaconTex = this.createCircleTexture('#38bdf8', true);
      const beaconMat = new THREE.SpriteMaterial({
        map: beaconTex,
        color: new THREE.Color(craftData.id === 'iss' ? '#f59e0b' : '#38bdf8'),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const beaconSprite = new THREE.Sprite(beaconMat);
      beaconSprite.scale.set(1.4, 1.4, 1);
      beaconSprite.raycast = () => {};
      craftGroup.add(beaconSprite);

      this.systemGroup.add(craftGroup);
      this.spacecraftMeshes.push(craftGroup);
      this.clickableObjects.push(craftGroup);
    });
  }

  /**
   * Focus on Human Spacecraft / Satellite in 3D 360° close inspection
   */
  focusOnSpacecraft(craftMesh) {
    const craftData = craftMesh.userData.craftData;
    this.currentSpacecraft = craftData;
    this.currentSpacecraftMesh = craftMesh;
    this.currentPlanet = null;
    this.currentMoon = null;
    this.viewMode = 'spacecraft';
    this.isTransitioning = true;
    this.lastTrackedPos = null;

    sound.playFlyby();

    this.scene.updateMatrixWorld(true);

    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 60.0;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.45;

    const camOffset = new THREE.Vector3(2.4, 1.2, 2.4);

    this.killCameraTransition();

    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const trans = { progress: 0 };

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(trans, {
      progress: 1.0,
      duration: 0.75,
      ease: 'power2.out',
      onUpdate: () => {
        const livePos = new THREE.Vector3();
        craftMesh.getWorldPosition(livePos);
        const targetCam = livePos.clone().add(camOffset);
        this.camera.position.lerpVectors(startCamPos, targetCam, trans.progress);
        this.controls.target.lerpVectors(startTarget, livePos, trans.progress);
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        const finalPos = new THREE.Vector3();
        craftMesh.getWorldPosition(finalPos);
        this.controls.target.copy(finalPos);
        this.controls.update();
        this.lastTrackedPos = finalPos.clone();
        this.activeCamTween = null;
      }
    });

    this.updateBreadcrumbs();
    this.showDetailsPanel(craftData, 'spacecraft');
    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('spacecraft', craftData.id);
  }

  buildExoplanets(systemData, starRadius) {
    const planets = systemData.planets || [];
    const baseDistance = starRadius + 20;
    const distanceStep = 22;

    planets.forEach((planet, index) => {
      const orbitRadius = baseDistance + (index * distanceStep);
      const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0);
      const points = orbitCurve.getPoints(128);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
      const orbitMat = new THREE.LineBasicMaterial({
        color: planet.isHabitableZone ? 0x22c55e : 0x38bdf8,
        transparent: true,
        opacity: planet.isHabitableZone ? 0.42 : 0.30,
        blending: THREE.AdditiveBlending,
        visible: this.showOrbits
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.raycast = () => {};
      this.systemGroup.add(orbitLine);
      this.orbitMeshes.push(orbitLine);

      const rEarth = planet.radiusEarth || 1.5;
      const planetRadius = Math.max(1.3, Math.min(6.5, rEarth * 1.6));
      const planetGeo = new THREE.SphereGeometry(planetRadius, 28, 28);
      const pTex = textures.createProceduralPlanetTexture(planet.colorHex, planet.isHabitableZone);
      const planetMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.65, metalness: 0.1 });

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      const initialAngle = (index * 1.1) + 0.4;
      planetMesh.position.set(Math.cos(initialAngle) * orbitRadius, 0, Math.sin(initialAngle) * orbitRadius);

      planetMesh.userData = {
        type: 'planet',
        planetData: planet,
        systemData: systemData,
        orbitRadius: orbitRadius,
        orbitalPeriodDays: planet.orbitalPeriodDays || (50 * (index + 1)),
        rotationPeriodHours: 24,
        initialAngle: initialAngle,
        currentAngle: initialAngle
      };

      this.systemGroup.add(planetMesh);
      this.planetMeshes.push(planetMesh);

      // 3D Billboard Celestial Name Tag for Exoplanet
      const pLabelName = typeof planet.name === 'object' ? (planet.name[i18n.lang] || planet.name.en) : planet.name;
      const pLabelColor = planet.isHabitableZone ? '#4ade80' : '#38bdf8';
      const pLabelSprite = this.createCelestialLabel(pLabelName, '', pLabelColor, false);
      const pYOffset = planetRadius * 1.35 + 2.4;
      pLabelSprite.position.set(planetMesh.position.x, planetMesh.position.y + pYOffset, planetMesh.position.z);
      pLabelSprite.userData = {
        type: 'planet-label',
        planetMesh: planetMesh,
        planetData: planet,
        yOffset: pYOffset
      };
      this.systemGroup.add(pLabelSprite);
      this.planetLabelSprites.push(pLabelSprite);
      this.clickableObjects.push(pLabelSprite);
      planetMesh.userData.labelSprite = pLabelSprite;
    });
  }

  /**
   * LEVEL 3: Focus on Planet (Clean realistic 3D view without floating headings)
   */
  focusOnPlanet(planetMesh) {
    this.currentPlanet = planetMesh.userData.planetData;
    this.currentMoon = null;
    this.viewMode = 'planet';
    this.isTransitioning = true;
    this.lastTrackedPos = null;
    this.updateLabelsVisibility();

    sound.playFlyby();

    this.scene.updateMatrixWorld(true);
    const planetRadius = planetMesh.geometry.parameters.radius || 4;
    
    // Dynamic zoom limits tailored to planet radius for ultra-close inspection without clipping
    this.controls.minDistance = Math.max(1.2, planetRadius * 1.35);
    this.controls.maxDistance = Math.max(80, planetRadius * 35);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;

    const camOffset = new THREE.Vector3(planetRadius * 3.6, planetRadius * 1.5, planetRadius * 3.6);

    this.killCameraTransition();

    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const trans = { progress: 0 };

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(trans, {
      progress: 1.0,
      duration: 0.75,
      ease: 'power2.out',
      onUpdate: () => {
        const livePos = new THREE.Vector3();
        planetMesh.getWorldPosition(livePos);
        const targetCam = livePos.clone().add(camOffset);
        this.camera.position.lerpVectors(startCamPos, targetCam, trans.progress);
        this.controls.target.lerpVectors(startTarget, livePos, trans.progress);
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        const finalPos = new THREE.Vector3();
        planetMesh.getWorldPosition(finalPos);
        this.controls.target.copy(finalPos);
        this.controls.update();
        this.lastTrackedPos = finalPos.clone();
        this.activeCamTween = null;
      }
    });

    this.updateBreadcrumbs();
    this.showDetailsPanel(this.currentPlanet, 'planet');
    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('planet', this.currentPlanet.id);
    if (typeof this.updateChartBoardTarget === 'function') {
      this.updateChartBoardTarget(this.currentPlanet, 'planet');
    }
  }

  /**
   * Focus on Moon
   */
  focusOnMoon(moonMesh) {
    this.currentMoon = moonMesh.userData.moonData;
    if (moonMesh.userData.parentPlanetMesh) {
      this.currentPlanet = moonMesh.userData.parentPlanetMesh.userData.planetData;
    }
    this.viewMode = 'moon';
    this.isTransitioning = true;
    this.lastTrackedPos = null;
    this.updateLabelsVisibility();
    sound.playFlyby();

    this.scene.updateMatrixWorld(true);
    const mR = moonMesh.geometry.parameters.radius || 0.8;

    this.controls.minDistance = Math.max(0.6, mR * 1.35);
    this.controls.maxDistance = Math.max(40, mR * 30);
    this.controls.autoRotate = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;

    const moonOffset = new THREE.Vector3(mR * 3.8, mR * 1.5, mR * 3.8);

    this.killCameraTransition();

    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const trans = { progress: 0 };

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(trans, {
      progress: 1.0,
      duration: 0.70,
      ease: 'power2.out',
      onUpdate: () => {
        const livePos = new THREE.Vector3();
        moonMesh.getWorldPosition(livePos);
        const targetCam = livePos.clone().add(moonOffset);
        this.camera.position.lerpVectors(startCamPos, targetCam, trans.progress);
        this.controls.target.lerpVectors(startTarget, livePos, trans.progress);
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        const finalPos = new THREE.Vector3();
        moonMesh.getWorldPosition(finalPos);
        this.controls.target.copy(finalPos);
        this.controls.update();
        this.lastTrackedPos = finalPos.clone();
        this.activeCamTween = null;
      }
    });

    this.updateBreadcrumbs();
    this.showDetailsPanel(this.currentMoon, 'moon');
    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('moon', this.currentMoon.id);
    if (typeof this.updateChartBoardTarget === 'function') {
      this.updateChartBoardTarget(this.currentMoon, 'moon');
    }
  }

  /**
   * Focus on Host Star (The Sun) in close-up 3D
   */
  focusOnStar(starMesh) {
    this.viewMode = 'star';
    this.currentPlanet = null;
    this.currentMoon = null;
    this.isTransitioning = true;
    this.lastTrackedPos = null;
    this.updateLabelsVisibility();

    sound.playFlyby();

    this.scene.updateMatrixWorld(true);
    const starRadius = starMesh.geometry.parameters.radius || 14;

    this.controls.minDistance = Math.max(16, starRadius * 1.35);
    this.controls.maxDistance = Math.max(250, starRadius * 25);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;

    const camOffset = new THREE.Vector3(starRadius * 2.8, starRadius * 1.1, starRadius * 2.8);

    this.killCameraTransition();

    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const trans = { progress: 0 };

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(trans, {
      progress: 1.0,
      duration: 0.75,
      ease: 'power2.out',
      onUpdate: () => {
        const livePos = new THREE.Vector3();
        starMesh.getWorldPosition(livePos);
        const targetCam = livePos.clone().add(camOffset);
        this.camera.position.lerpVectors(startCamPos, targetCam, trans.progress);
        this.controls.target.lerpVectors(startTarget, livePos, trans.progress);
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        const finalPos = new THREE.Vector3();
        starMesh.getWorldPosition(finalPos);
        this.controls.target.copy(finalPos);
        this.controls.update();
        this.lastTrackedPos = finalPos.clone();
        this.activeCamTween = null;
      }
    });

    this.updateBreadcrumbs();
    this.showDetailsPanel(this.currentSystem, 'system');
    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('star', 'sun');
    if (typeof this.updateChartBoardTarget === 'function') {
      this.updateChartBoardTarget(solarSystemData?.system?.star || { name: { en: 'The Sun' }, id: 'sun' }, 'star');
    }
  }

  flyToGalaxyView() {
    this.viewMode = 'galaxy';
    this.currentSystem = null;
    this.currentPlanet = null;
    this.currentMoon = null;
    this.currentSpacecraft = null;
    this.currentSpacecraftMesh = null;
    this.isTransitioning = true;
    this.lastTrackedPos = null;

    if (this.systemGroup) {
      this.systemGroup.visible = false;
    }
    if (typeof this.toggleLeftNav === 'function') {
      this.toggleLeftNav(false);
    }
    this.updateLabelsVisibility();

    this.controls.minDistance = 15;
    this.controls.maxDistance = 6000;

    // Show all galaxy markers and galaxy points cleanly
    if (this.galaxy && this.galaxy.group) {
      this.galaxy.group.visible = true;
    }
    this.setGalaxyMarkersVisible(true);

    sound.playFlyby();

    this.killCameraTransition();

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(this.camera.position, {
      x: 0,
      y: 1600,
      z: 2200,
      duration: 0.90,
      ease: 'power2.out',
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        this.controls.update();
        this.activeCamTween = null;
      }
    });

    gsap.to(this.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.90,
      ease: 'power2.out'
    });

    this.updateBreadcrumbs();
    this.hideDetailsPanel();
    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('galaxy');
  }

  flyToStarSystem(systemData) {
    if (typeof this.toggleLeftNav === 'function') {
      this.toggleLeftNav(false);
    }
    sound.playFlyby();
    this.loadStarSystem(systemData);
    this.updateLabelsVisibility();

    this.isTransitioning = true;
    this.lastTrackedPos = null;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 3000;

    const sysPos = this.systemGroup.position;
    const targetCamPos = new THREE.Vector3(sysPos.x, sysPos.y + 160, sysPos.z + 320);

    this.killCameraTransition();

    this.controls.enabled = false;

    this.activeCamTween = gsap.to(this.camera.position, {
      x: targetCamPos.x,
      y: targetCamPos.y,
      z: targetCamPos.z,
      duration: 0.85,
      ease: 'power2.out',
      onComplete: () => {
        this.isTransitioning = false;
        this.controls.enabled = true;
        this.controls.update();
        this.activeCamTween = null;
      }
    });

    gsap.to(this.controls.target, {
      x: sysPos.x,
      y: sysPos.y,
      z: sysPos.z,
      duration: 0.85,
      ease: 'power2.out'
    });

    if (typeof this.highlightActiveNav === 'function') this.highlightActiveNav('system', systemData.id);
  }

  /**
   * TIME SIMULATOR: Multi-Epoch Jump (Hour, Day, Month, Year, Decade, Century, Custom)
   */
  setActiveTimeStep(buttonId) {
    document.querySelectorAll('.time-step-btn').forEach(btn => {
      if (btn.id !== 'btn-reset-time') {
        btn.classList.remove('highlight');
      }
    });
    if (buttonId) {
      const activeBtn = document.getElementById(buttonId);
      if (activeBtn) {
        activeBtn.classList.add('highlight');
      }
      try {
        localStorage.setItem('preferredTimeStep', buttonId);
      } catch (e) {}
    }
  }

  setSimulationPaused(paused) {
    this.isPaused = paused;
    const btnPlayPause = document.getElementById('btn-play-pause');
    const iconPause = document.getElementById('icon-pause');
    const iconPlay = document.getElementById('icon-play');
    if (btnPlayPause && iconPause && iconPlay) {
      btnPlayPause.classList.toggle('active', !this.isPaused);
      iconPause.style.display = this.isPaused ? 'none' : 'block';
      iconPlay.style.display = this.isPaused ? 'block' : 'none';
    }
  }

  jumpTime(daysToAdvance, toastKey = '', customMessage = '') {
    sound.playChime(480);
    // Pause continuous playback so user can inspect the exact increment and axial rotation without racing ahead
    this.setSimulationPaused(true);

    const targetDays = this.simulatedDays + daysToAdvance;
    
    // Eliminate tween collisions: kill ongoing leaps and lock leap state
    gsap.killTweensOf(this.clock);
    this.clock.startLeap();

    gsap.to(this.clock, {
      simulatedDays: targetDays,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => this.updateTimeHUD(),
      onComplete: () => this.clock.endLeap()
    });

    if (customMessage) {
      this.showTimeLeapToast(customMessage);
    } else if (toastKey) {
      this.showTimeLeapToast(i18n.t(toastKey));
    }
  }

  executeCustomLeap(amount, unit) {
    if (isNaN(amount) || amount <= 0) return;
    
    const unitToDays = {
      hours: 1.0 / 24.0,
      days: 1.0,
      months: 30.4375,
      years: 365.25,
      decades: 3652.5,
      centuries: 36525.0
    };
    
    const unitDays = unitToDays[unit] || 365.25;
    const totalDays = amount * unitDays;
    
    const unitAbbr = {
      hours: 'Hr',
      days: 'd',
      months: 'Mo',
      years: 'Yr',
      decades: 'Dec',
      centuries: 'Cent'
    }[unit] || unit;
    
    const btnCustom = document.getElementById('btn-jump-custom');
    if (btnCustom) {
      btnCustom.textContent = `+${amount} ${unitAbbr} ⚙️`;
    }
    this.setActiveTimeStep('btn-jump-custom');
    
    try {
      localStorage.setItem('customTimeAmount', amount.toString());
      localStorage.setItem('customTimeUnit', unit);
    } catch(e) {}

    const earthOrbits = (totalDays / 365.25).toFixed(2);
    const earthRotations = ((totalDays * 24) / 23.934).toFixed(1);
    const mercOrbits = (totalDays / 87.97).toFixed(2);
    
    let msg = '';
    if (this.currentPlanet) {
      const pName = typeof this.currentPlanet.name === 'object' ? (this.currentPlanet.name[i18n.lang] || this.currentPlanet.name.en) : this.currentPlanet.name;
      const rotHours = this.currentPlanet.rotationPeriodHours || 24;
      const orbDays = this.currentPlanet.orbitalPeriodDays || 365.25;
      const pRot = ((totalDays * 24) / Math.abs(rotHours)).toFixed(2);
      const pOrb = (totalDays / orbDays).toFixed(2);
      msg = i18n.t('customToastSelected', {
        amount,
        unit,
        name: pName,
        orbits: pOrb,
        rotations: pRot
      });
    } else {
      msg = i18n.t('customToast', {
        amount,
        unit,
        earthOrbits,
        earthRotations,
        mercOrbits
      });
    }

    this.jumpTime(totalDays, '', msg);
    
    const popover = document.getElementById('custom-time-popover');
    if (popover) {
      popover.classList.add('hidden');
    }
  }

  resetTime() {
    sound.playChime(360);
    gsap.killTweensOf(this.clock);
    this.clock.startLeap();

    gsap.to(this.clock, {
      simulatedDays: 0.0,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => this.updateTimeHUD(),
      onComplete: () => this.clock.endLeap()
    });
    document.querySelectorAll('.time-step-btn').forEach(btn => {
      btn.classList.remove('highlight');
    });
    try {
      localStorage.removeItem('preferredTimeStep');
    } catch (e) {}
    this.showTimeLeapToast(i18n.t('leapReset'));
  }

  showTimeLeapToast(message) {
    const toast = document.getElementById('time-leap-toast');
    const msgEl = document.getElementById('toast-message');
    if (toast && msgEl) {
      msgEl.textContent = message;
      toast.style.display = 'flex';
    }
  }

  updateTimeHUD() {
    const totalDays = this.simulatedDays;
    const years = Math.floor(totalDays / 365.25);
    const remAfterYears = totalDays % 365.25;
    const months = Math.floor(remAfterYears / 30.4375);
    const remAfterMonths = remAfterYears % 30.4375;
    const days = Math.floor(remAfterMonths);
    const hours = Math.floor((remAfterMonths % 1) * 24);

    const txtElapsed = document.getElementById('time-elapsed-text');
    if (txtElapsed) {
      txtElapsed.textContent = i18n.t('epochText', {
        years,
        months,
        days,
        hours
      });
    }

    const txtRotations = document.getElementById('time-rotations-text');
    if (txtRotations) {
      const activeObj = this.currentPlanet || { name: { en: "Earth", fr: "Terre" }, rotationPeriodHours: 23.934, orbitalPeriodDays: 365.25 };
      const pName = typeof activeObj.name === 'object' ? (activeObj.name[i18n.lang] || activeObj.name.en) : activeObj.name;
      const rotHours = activeObj.rotationPeriodHours || 24;
      const hoursTotal = (this.simulatedDays * 24).toFixed(0);
      const rotations = (this.simulatedDays * 24 / Math.abs(rotHours)).toFixed(2);
      const orbits = (this.simulatedDays / (activeObj.orbitalPeriodDays || 365.25)).toFixed(2);
      
      txtRotations.textContent = i18n.t('planetTrackingText', {
        name: pName,
        rotations,
        hoursTotal,
        orbits
      });
    }

    // Detail panel specs
    const valRotDone = document.getElementById('val-rotations-completed');
    const valOrbDone = document.getElementById('val-orbits-completed');
    if (valRotDone && valOrbDone && this.currentPlanet) {
      const rotPeriodHours = this.currentPlanet.rotationPeriodHours || 24;
      valRotDone.textContent = (this.simulatedDays * 24 / Math.abs(rotPeriodHours)).toFixed(2);
      valOrbDone.textContent = (this.simulatedDays / (this.currentPlanet.orbitalPeriodDays || 365.25)).toFixed(2);
    }
  }

  updateBreadcrumbs() {
    const bar = document.getElementById('breadcrumbs-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const crumbGalaxy = document.createElement('span');
    crumbGalaxy.className = `crumb-item ${this.viewMode === 'galaxy' ? 'current' : ''}`;
    crumbGalaxy.textContent = i18n.t('crumbGalaxy');
    crumbGalaxy.addEventListener('click', () => {
      this.flyToGalaxyView();
      this.showGalaxyDetails();
    });
    bar.appendChild(crumbGalaxy);

    if (this.currentSystem) {
      const sep1 = document.createElement('span');
      sep1.className = 'crumb-separator';
      sep1.textContent = '>';
      bar.appendChild(sep1);

      const sysName = this.currentSystem.isSolarSystem
        ? i18n.t('crumbSolarSystem')
        : (this.currentSystem.name[i18n.lang] || this.currentSystem.name.en);

      const crumbSystem = document.createElement('span');
      crumbSystem.className = `crumb-item ${this.viewMode === 'system' ? 'current' : ''}`;
      crumbSystem.textContent = sysName;
      crumbSystem.addEventListener('click', () => {
        if (this.viewMode === 'planet' || this.viewMode === 'moon' || this.viewMode === 'star') {
          this.flyToStarSystem(this.currentSystem);
        }
      });
      bar.appendChild(crumbSystem);
    }

    if (this.viewMode === 'star') {
      const sepStar = document.createElement('span');
      sepStar.className = 'crumb-separator';
      sepStar.textContent = '>';
      bar.appendChild(sepStar);

      const crumbStar = document.createElement('span');
      crumbStar.className = 'crumb-item current';
      const sRaw = this.currentSystem?.star?.name;
      crumbStar.textContent = typeof sRaw === 'object' ? (sRaw[i18n.lang] || sRaw.en) : (sRaw || 'The Sun');
      bar.appendChild(crumbStar);
    }

    if (this.currentPlanet) {
      const sep2 = document.createElement('span');
      sep2.className = 'crumb-separator';
      sep2.textContent = '>';
      bar.appendChild(sep2);

      const pName = typeof this.currentPlanet.name === 'object'
        ? (this.currentPlanet.name[i18n.lang] || this.currentPlanet.name.en)
        : this.currentPlanet.name;

      const crumbPlanet = document.createElement('span');
      crumbPlanet.className = `crumb-item ${this.viewMode === 'planet' ? 'current' : ''}`;
      crumbPlanet.textContent = pName;
      crumbPlanet.addEventListener('click', () => {
        if (this.viewMode === 'moon') {
          const pMesh = this.planetMeshes.find(m => m.userData.planetData.id === this.currentPlanet.id);
          if (pMesh) this.focusOnPlanet(pMesh);
        }
      });
      bar.appendChild(crumbPlanet);
    }

    if (this.currentMoon) {
      const sep3 = document.createElement('span');
      sep3.className = 'crumb-separator';
      sep3.textContent = '>';
      bar.appendChild(sep3);

      const mName = typeof this.currentMoon.name === 'object'
        ? (this.currentMoon.name[i18n.lang] || this.currentMoon.name.en)
        : this.currentMoon.name;

      const crumbMoon = document.createElement('span');
      crumbMoon.className = 'crumb-item current';
      crumbMoon.textContent = mName;
      bar.appendChild(crumbMoon);
    }

    if (this.currentSpacecraft) {
      const sepCraft = document.createElement('span');
      sepCraft.className = 'crumb-separator';
      sepCraft.textContent = '>';
      bar.appendChild(sepCraft);

      const cName = typeof this.currentSpacecraft.name === 'object'
        ? (this.currentSpacecraft.name[i18n.lang] || this.currentSpacecraft.name.en)
        : this.currentSpacecraft.name;

      const crumbCraft = document.createElement('span');
      crumbCraft.className = 'crumb-item current';
      crumbCraft.textContent = `🛰️ ${cName}`;
      bar.appendChild(crumbCraft);
    }
  }

  showGalaxyDetails() {
    const galaxyData = {
      name: { en: "Milky Way Galaxy", fr: "Voie Lactée" },
      type: { en: "Barred Spiral Galaxy (SBbc)", fr: "Galaxie Spirale Barrée (SBbc)" },
      description: {
        en: "The Milky Way is our home galaxy—a massive barred spiral system containing 100 to 400 billion stars, supermassive black hole Sagittarius A* at its center, and at least 100 billion exoplanets.",
        fr: "La Voie Lactée est notre galaxie—un vaste système spiral barré abritant de 100 à 400 milliards d'étoiles, le trou noir supermassif Sagittarius A* et au moins 100 milliards d'exoplanètes."
      },
      formation: {
        en: "Formed ~13.6 billion years ago shortly after the Big Bang through the gravitational collapse and merger of primordial gas clouds, globular clusters, and dwarf satellite galaxies.",
        fr: "Formée il y a environ 13,6 milliards d'années peu après le Big Bang par effondrement gravitationnel et fusion de nuages de gaz primordiaux et galaxies naines satellites."
      },
      interiorStructure: {
        en: "Central Galactic Bulge surrounding Sagittarius A* (4.15 million solar masses), stellar bar, thin disc (young stars & gas), thick disc (older stars), and dark matter halo.",
        fr: "Bulbe galactique central entourant Sagittarius A* (4,15 millions de masses solaires), barre stellaire, disque mince, disque épais et halo de matière noire."
      },
      atmosphereComposition: {
        en: "Interstellar medium composed of 74% Hydrogen, 24% Helium, and 2% heavier elements (metallicity), permeated by cosmic rays and magnetic fields.",
        fr: "Milieu interstellaire composé de 74% d'hydrogène, 24% d'hélium et 2% d'éléments lourds, baigné de rayons cosmiques et de champs magnétiques."
      },
      funFacts: {
        en: [
          "Our Sun travels at ~828,000 km/h (230 km/s) along its galactic orbit, taking 230 million Earth years to complete 1 Galactic Year.",
          "At the exact center lies Sagittarius A*, a supermassive black hole with 4.15 million times the mass of our Sun.",
          "The Milky Way and Andromeda galaxies will collide and merge in approximately 4.5 billion years to form 'Milkomeda'.",
          "There are estimated to be over 100 billion planets in our galaxy alone, with billions potentially in the habitable zone."
        ],
        fr: [
          "Notre Soleil voyage à ~828 000 km/h sur son orbite galactique, prenant 230 millions d'années terrestres pour boucler 1 Année Galactique.",
          "Au centre exact se trouve Sagittarius A*, un trou noir supermassif de 4,15 millions de masses solaires.",
          "La Voie Lactée et la galaxie d'Andromède entreront en collision dans environ 4,5 milliards d'années pour former 'Milkomède'.",
          "On estime qu'il existe plus de 100 milliards de planètes dans notre seule galaxie."
        ]
      }
    };
    this.showDetailsPanel(galaxyData, 'galaxy');
  }

  getMoonImagePath(id) {
    const cleanId = String(id || '').toLowerCase().trim();
    const moonIdMap = {
      moon: 'luna',
      luna: 'luna',
      phobos: 'phobos',
      deimos: 'deimos',
      io: 'io',
      europa: 'europa',
      ganymede: 'ganymede',
      callisto: 'callisto',
      titan: 'titan',
      enceladus: 'enceladus',
      titania: 'titania',
      miranda: 'miranda',
      triton: 'triton',
      charon: 'charon'
    };
    const key = moonIdMap[cleanId] || cleanId;
    return `/images/moons/${key}.png`;
  }

  showDetailsPanel(data, type) {
    const panel = document.getElementById('details-panel');
    if (!panel) return;
    const lang = i18n.lang;

    const nameEl = document.getElementById('detail-name');
    const typeEl = document.getElementById('detail-type');
    const descEl = document.getElementById('detail-desc');
    const factsList = document.getElementById('detail-facts-list');
    const badgeEl = document.getElementById('detail-hero-badge');
    const heroImgEl = document.getElementById('detail-hero-img');
    const provBadgeEl = document.getElementById('detail-provenance-badge');
    const provSourceEl = document.getElementById('detail-provenance-source');
    if (heroImgEl) {
      const realPhotoMap = {
        galaxy: '/dashboard-galaxy.jpg',
        sun: '/images/sun.jpg',
        mercury: '/images/mercury.jpg',
        venus: '/images/venus.jpg',
        earth: '/images/earth.jpg',
        mars: '/images/mars.jpg',
        jupiter: '/images/jupiter.jpg',
        saturn: '/images/saturn.jpg',
        uranus: '/images/uranus.jpg',
        neptune: '/images/neptune.jpg',
        pluto: '/images/pluto.jpg',
        solarsystem: '/images/solarsystem.jpg'
      };

      if (type === 'spacecraft') {
        heroImgEl.src = data.photo || '/images/iss.svg';
      } else if (type === 'galaxy') {
        heroImgEl.src = '/dashboard-galaxy.jpg';
      } else if (type === 'system') {
        heroImgEl.src = (data && data.isSolarSystem) ? '/images/solarsystem.jpg' : '/dashboard-galaxy.jpg';
      } else if (type === 'planet') {
        heroImgEl.src = (data && realPhotoMap[data.id]) ? realPhotoMap[data.id] : '/dashboard-galaxy.jpg';
      } else if (type === 'moon') {
        heroImgEl.src = this.getMoonImagePath(data?.id);
      } else {
        heroImgEl.src = '/dashboard-galaxy.jpg';
      }

      heroImgEl.style.cursor = 'pointer';
      heroImgEl.title = 'Click image to fly into 3D view 🚀';
      heroImgEl.onclick = () => {
        if (type === 'galaxy') {
          this.flyToGalaxyView();
        } else if (type === 'system') {
          this.flyToStarSystem(data);
        } else if (type === 'planet') {
          const pMesh = this.planetMeshes.find(m => m.userData?.planetData?.id === data.id);
          if (pMesh) this.focusOnPlanet(pMesh);
        } else if (type === 'moon') {
          const mMesh = this.moonMeshes.find(m => m.userData?.moonData?.id === data.id);
          if (mMesh) this.focusOnMoon(mMesh);
        } else if (type === 'spacecraft') {
          const scMesh = this.spacecraftMeshes?.find(m => m.userData?.craftData?.id === data.id);
          if (scMesh) this.focusOnSpacecraft(scMesh);
        }
      };
    }

    panel.classList.add('active');

    if (type === 'galaxy') {
      const gName = typeof data.name === 'object' ? (data.name[lang] || data.name.en) : data.name;
      const gType = typeof data.type === 'object' ? (data.type[lang] || data.type.en) : data.type;

      if (badgeEl) badgeEl.textContent = gName;
      nameEl.textContent = gName;
      typeEl.textContent = gType;
      descEl.textContent = (data.description && data.description[lang]) ? data.description[lang] : data.description.en;

      if (provBadgeEl) {
        provBadgeEl.className = 'provenance-badge illustrative';
        provBadgeEl.textContent = i18n.t('provenanceIllustrative');
      }
      if (provSourceEl) {
        provSourceEl.textContent = i18n.t('provenanceSourceModel');
      }

      const lblEcc = document.getElementById('lbl-eccentricity');
      const valEcc = document.getElementById('val-eccentricity');
      if (lblEcc && valEcc) {
        lblEcc.textContent = 'Disk Flatness';
        valEcc.textContent = '0.98';
      }
      const lblInc = document.getElementById('lbl-inclination');
      const valInc = document.getElementById('val-inclination');
      if (lblInc && valInc) {
        lblInc.textContent = 'Galactic Tilt';
        valInc.textContent = '63.0°';
      }

      const formEl = document.getElementById('detail-formation-desc');
      if (formEl) formEl.textContent = data.formation ? (data.formation[lang] || data.formation.en) : '';

      const structEl = document.getElementById('detail-interior-desc');
      if (structEl) structEl.textContent = data.interiorStructure ? (data.interiorStructure[lang] || data.interiorStructure.en) : '';

      const atmoEl = document.getElementById('detail-atmo-desc');
      if (atmoEl) atmoEl.textContent = data.atmosphereComposition ? (data.atmosphereComposition[lang] || data.atmosphereComposition.en) : '';

      const moonsContainer = document.getElementById('detail-moons-container');
      if (moonsContainer) {
        moonsContainer.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">Major Satellite Galaxies: Large Magellanic Cloud (LMC), Small Magellanic Cloud (SMC), Sagittarius Dwarf, Canis Major Dwarf.</p>`;
      }

      document.getElementById('lbl-dist').textContent = 'Galactic Diameter';
      document.getElementById('val-dist').textContent = '100,000 ly';

      document.getElementById('lbl-planets').textContent = 'Total Stars';
      document.getElementById('val-planets').textContent = '100–400 Billion Stars';

      document.getElementById('lbl-radius').textContent = 'Sun to Center';
      document.getElementById('val-radius').textContent = '26,670 ly';

      document.getElementById('lbl-temp').textContent = 'Galactic Year';
      document.getElementById('val-temp').textContent = '230 Myr';

      document.getElementById('lbl-rotation').textContent = 'Morphology';
      document.getElementById('val-rotation').textContent = 'SBbc (Spiral)';

      document.getElementById('lbl-tilt').textContent = 'Major Arms';
      document.getElementById('val-tilt').textContent = '4 Spiral Arms';

      document.getElementById('lbl-period').textContent = 'Supermassive Core';
      document.getElementById('val-period').textContent = 'Sgr A* (4.15M M☉)';

      document.getElementById('lbl-speed').textContent = 'Solar Orbit Speed';
      document.getElementById('val-speed').textContent = '828,000 km/h (230 km/s)';

      factsList.innerHTML = '';
      const facts = (data.funFacts && data.funFacts[lang]) || data.funFacts.en;
      facts.forEach(fact => {
        const item = document.createElement('div');
        item.className = 'fun-fact-item';
        item.textContent = fact;
        factsList.appendChild(item);
      });

    } else if (type === 'planet' || type === 'moon') {
      const pName = typeof data.name === 'object' ? (data.name[lang] || data.name.en) : data.name;
        const pType = typeof data.type === 'object' ? (data.type[lang] || data.type.en) : (type === 'moon' ? 'Natural Satellite (Moon)' : 'Exoplanet');

      if (badgeEl) badgeEl.textContent = pName;
      nameEl.textContent = pName;
      typeEl.textContent = pType;
      descEl.textContent = (data.funFacts && data.funFacts[lang]) ? data.funFacts[lang][0] : `Celestial body in the ${this.currentSystem?.name?.en || 'system'}.`;

      if (provBadgeEl) {
        const status = (data.provenance && data.provenance.status) || 'MEASURED';
        provBadgeEl.className = `provenance-badge ${status.toLowerCase()}`;
        provBadgeEl.textContent = status === 'MEASURED' ? i18n.t('provenanceMeasured') : i18n.t('provenanceDerived');
      }
      if (provSourceEl) {
        provSourceEl.textContent = (data.provenance && data.provenance.source) 
          ? `Source: ${data.provenance.source}` 
          : i18n.t('provenanceSourceNasa');
      }

      const formEl = document.getElementById('detail-formation-desc');
      if (formEl) {
        formEl.textContent = data.formation ? (data.formation[lang] || data.formation.en) : "Formed during early protoplanetary disk accretion 4.5 billion years ago.";
      }
      const structEl = document.getElementById('detail-interior-desc');
      if (structEl) {
        structEl.textContent = data.interiorStructure ? (data.interiorStructure[lang] || data.interiorStructure.en) : "Composed of metallic core and mantle layers.";
      }
      const atmoEl = document.getElementById('detail-atmo-desc');
      if (atmoEl) {
        atmoEl.textContent = data.atmosphereComposition ? (data.atmosphereComposition[lang] || data.atmosphereComposition.en) : "Thin exosphere / vacuum.";
      }

      const moonsContainer = document.getElementById('detail-moons-container');
      if (moonsContainer) {
        moonsContainer.innerHTML = '';
        if (type === 'moon') {
          const parentPlanet = this.currentPlanet;
          const parentName = parentPlanet ? (parentPlanet.name[lang] || parentPlanet.name.en) : 'Parent Planet';
          moonsContainer.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 14px; margin-top: 8px; text-align: center;">
              <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                ${lang === 'fr' ? 'Planète Mère' : 'Orbiting Parent Planet'}
              </div>
              <div style="font-weight: 700; font-size: 1.1rem; color: #f8fafc; margin-bottom: 12px;">
                🪐 ${parentName}
              </div>
              <button id="btn-return-parent-planet" class="guide-planet-btn" style="width: 100%; justify-content: center; padding: 8px 16px;">
                <span>←</span> ${lang === 'fr' ? 'Retourner à ' + parentName : 'Return to ' + parentName}
              </button>
            </div>
          `;
          const btnReturn = document.getElementById('btn-return-parent-planet');
          if (btnReturn && parentPlanet) {
            btnReturn.addEventListener('click', () => {
              const pMesh = this.planetMeshes.find(m => m.userData.planetData.id === parentPlanet.id);
              if (pMesh) this.focusOnPlanet(pMesh);
            });
          }
        } else if (data.moonsList && data.moonsList.length > 0) {
          data.moonsList.forEach(m => {
            const mName = typeof m.name === 'object' ? (m.name[lang] || m.name.en) : m.name;
            const card = document.createElement('div');
            card.className = 'moon-card-item';
            card.innerHTML = `
              <div class="moon-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <img src="${this.getMoonImagePath(m.id)}" alt="${mName}" class="moon-card-thumb" onerror="this.src='/images/moon.jpg'">
                  <span class="moon-card-name">${mName}</span>
                </div>
                <span class="moon-card-radius">${m.radiusKm} km</span>
              </div>
              <p class="moon-card-fact">${m.funFacts ? (m.funFacts[lang] ? m.funFacts[lang][0] : m.funFacts.en[0]) : ''}</p>
              <button class="btn-view-moon">${i18n.t('viewMoon')}</button>
            `;
            card.querySelector('.btn-view-moon').addEventListener('click', () => {
              const mMesh = this.moonMeshes.find(mesh => mesh.userData.moonData.id === m.id);
              if (mMesh) this.focusOnMoon(mMesh);
            });
            moonsContainer.appendChild(card);
          });
        } else {
          moonsContainer.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">No natural satellites / moons orbiting this body.</p>`;
        }
      }

      document.getElementById('lbl-dist').textContent = i18n.t('distFromStar');
      document.getElementById('val-dist').textContent = data.distanceFromSun ? `${data.distanceFromSun.au} AU` : (data.orbitalDistanceKm ? `${data.orbitalDistanceKm.toLocaleString()} km` : 'N/A');

      document.getElementById('lbl-planets').textContent = type === 'moon' ? 'Parent World' : i18n.t('moons');
      document.getElementById('val-planets').textContent = type === 'moon' ? (this.currentPlanet?.name?.en || 'Planet') : (data.moons !== undefined ? data.moons : '0');

      document.getElementById('lbl-radius').textContent = i18n.t('radius');
      document.getElementById('val-radius').textContent = data.radiusKm ? `${data.radiusKm.toLocaleString()} km` : `${data.radiusEarth || 1.0} R⊕`;

      document.getElementById('lbl-temp').textContent = i18n.t('temperature');
      document.getElementById('val-temp').textContent = data.surfaceTemperature ? (typeof data.surfaceTemperature.celsius === 'string' ? data.surfaceTemperature.celsius : `${data.surfaceTemperature.celsius} °C`) : 'Variable';

      document.getElementById('lbl-rotation').textContent = i18n.t('rotationPeriod');
      document.getElementById('val-rotation').textContent = data.rotationPeriod ? (data.rotationPeriod[lang] || data.rotationPeriod.en) : 'Synchronous';

      document.getElementById('lbl-tilt').textContent = i18n.t('axialTilt');
      document.getElementById('val-tilt').textContent = data.axialTilt !== undefined ? `${data.axialTilt}°` : 'N/A';

      document.getElementById('lbl-period').textContent = i18n.t('orbitalPeriod');
      document.getElementById('val-period').textContent = data.orbitalPeriodDays ? `${data.orbitalPeriodDays} ${i18n.t('days')}` : 'N/A';

      document.getElementById('lbl-speed').textContent = i18n.t('orbitalSpeed');
      document.getElementById('val-speed').textContent = data.orbitalSpeedKmS ? `${data.orbitalSpeedKmS} km/s` : 'Keplerian';

      const lblEcc = document.getElementById('lbl-eccentricity');
      const valEcc = document.getElementById('val-eccentricity');
      if (lblEcc && valEcc) {
        lblEcc.textContent = i18n.t('eccentricity');
        valEcc.textContent = data.eccentricity !== undefined ? data.eccentricity.toFixed(4) : (type === 'moon' ? '0.0549' : '0.0000');
      }
      const lblInc = document.getElementById('lbl-inclination');
      const valInc = document.getElementById('val-inclination');
      if (lblInc && valInc) {
        lblInc.textContent = i18n.t('inclination');
        valInc.textContent = data.inclinationDeg !== undefined ? `${data.inclinationDeg.toFixed(2)}°` : (type === 'moon' ? '5.14°' : '0.00°');
      }

      factsList.innerHTML = '';
      const facts = (data.funFacts && data.funFacts[lang]) || (data.funFacts && data.funFacts.en) || [
        `Equatorial radius: ${data.radiusKm || 1000} km.`,
        `Orbital period: ${data.orbitalPeriodDays || 'N/A'} days.`
      ];
      facts.forEach(fact => {
        const item = document.createElement('div');
        item.className = 'fun-fact-item';
        item.textContent = fact;
        factsList.appendChild(item);
      });

    } else if (type === 'spacecraft') {
      const cName = typeof data.name === 'object' ? (data.name[lang] || data.name.en) : data.name;
      if (badgeEl) badgeEl.textContent = data.agency;
      nameEl.textContent = cName;
      typeEl.textContent = data.type;
      descEl.textContent = (data.desc && data.desc[lang]) ? data.desc[lang] : data.desc.en;

      if (provBadgeEl) {
        provBadgeEl.className = 'provenance-badge measured';
        provBadgeEl.textContent = 'NASA / SpaceX';
      }
      if (provSourceEl) {
        provSourceEl.textContent = `Source: 2026 Epoch Mission Telemetry (${data.agency})`;
      }

      const formEl = document.getElementById('detail-formation-desc');
      if (formEl) formEl.textContent = `Mission Destination: ${data.orbitParent.toUpperCase()} (${data.altitudeKm})`;

      const structEl = document.getElementById('detail-interior-desc');
      if (structEl) structEl.textContent = `Launch & Specifications: Spacecraft launched ${data.launchYear}, Mass: ${data.massKg}.`;

      const atmoEl = document.getElementById('detail-atmo-desc');
      if (atmoEl) atmoEl.textContent = `Orbital Mechanics: High-vacuum space, cruising velocity ${data.speedKmH}.`;

      const moonsContainer = document.getElementById('detail-moons-container');
      if (moonsContainer) {
        moonsContainer.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">Active Spacecraft: Continuous tracking via NASA Deep Space Network (DSN) and Tracking and Data Relay Satellites (TDRS).</p>`;
      }

      document.getElementById('lbl-dist').textContent = 'Orbiting Body';
      document.getElementById('val-dist').textContent = data.orbitParent === 'earth' ? 'Earth (Low Orbit)' : (data.orbitParent === 'sun-earth-l2' ? 'Sun-Earth L2' : 'Interstellar Escape');

      document.getElementById('lbl-planets').textContent = 'Orbital Period';
      document.getElementById('val-planets').textContent = data.periodMins;

      document.getElementById('lbl-radius').textContent = 'Altitude / Distance';
      document.getElementById('val-radius').textContent = data.altitudeKm;

      document.getElementById('lbl-temp').textContent = 'Launch Year';
      document.getElementById('val-temp').textContent = `${data.launchYear}`;

      document.getElementById('lbl-rotation').textContent = 'Total Mass';
      document.getElementById('val-rotation').textContent = data.massKg;

      document.getElementById('lbl-tilt').textContent = 'Flight Regime';
      document.getElementById('val-tilt').textContent = 'Microgravity';

      document.getElementById('lbl-period').textContent = 'Ground Station';
      document.getElementById('val-period').textContent = 'NASA DSN';

      document.getElementById('lbl-speed').textContent = 'Orbital Velocity';
      document.getElementById('val-speed').textContent = data.speedKmH;

      const lblEcc = document.getElementById('lbl-eccentricity');
      const valEcc = document.getElementById('val-eccentricity');
      if (lblEcc && valEcc) {
        lblEcc.textContent = 'Mission Agency';
        valEcc.textContent = data.agency.split('/')[0].trim();
      }
      const lblInc = document.getElementById('lbl-inclination');
      const valInc = document.getElementById('val-inclination');
      if (lblInc && valInc) {
        lblInc.textContent = 'Target Orbit';
        valInc.textContent = data.orbitParent;
      }

      factsList.innerHTML = '';
      const facts = (data.funFacts && data.funFacts[lang]) || data.funFacts.en || [];
      facts.forEach(fact => {
        const item = document.createElement('div');
        item.className = 'fun-fact-item';
        item.textContent = fact;
        factsList.appendChild(item);
      });

    } else {
      const sName = data.isSolarSystem ? i18n.t('crumbSolarSystem') : (data.name[lang] || data.name.en);
      if (badgeEl) badgeEl.textContent = sName;
      nameEl.textContent = sName;
      typeEl.textContent = `${data.star.spectralType || data.star.class} • ${data.planetCount} planets`;
      descEl.textContent = data.description ? (data.description[lang] || data.description.en) : '';

      if (provBadgeEl) {
        provBadgeEl.className = 'provenance-badge measured';
        provBadgeEl.textContent = i18n.t('provenanceMeasured');
      }
      if (provSourceEl) {
        provSourceEl.textContent = data.isSolarSystem ? i18n.t('provenanceSourceNasa') : i18n.t('provenanceSourceArchive');
      }

      const formEl = document.getElementById('detail-formation-desc');
      if (formEl) formEl.textContent = solarSystemData.system.formation ? (solarSystemData.system.formation[lang] || solarSystemData.system.formation.en) : "Collapsing molecular nebula.";
      const structEl = document.getElementById('detail-interior-desc');
      if (structEl) structEl.textContent = data.star.interiorStructure ? (data.star.interiorStructure[lang] || data.star.interiorStructure.en) : "Thermonuclear fusion core surrounded by radiative and convective zones.";
      const atmoEl = document.getElementById('detail-atmo-desc');
      if (atmoEl) atmoEl.textContent = data.star.composition ? (data.star.composition[lang] || data.star.composition.en) : "73% Hydrogen, 25% Helium.";

      document.getElementById('lbl-dist').textContent = i18n.t('distFromSun');
      document.getElementById('val-dist').textContent = `${data.dist_ly} ${i18n.t('lightYears')}`;

      document.getElementById('lbl-planets').textContent = 'Confirmed Planets';
      document.getElementById('val-planets').textContent = `${data.planetCount} Worlds`;

      document.getElementById('lbl-radius').textContent = i18n.t('radius');
      document.getElementById('val-radius').textContent = `${data.star.radiusSolar || 1.0} R☉`;

      document.getElementById('lbl-temp').textContent = i18n.t('temperature');
      document.getElementById('val-temp').textContent = data.star.temperatureK ? `${data.star.temperatureK} K` : '5,778 K';

      document.getElementById('lbl-rotation').textContent = i18n.t('spectralType');
      document.getElementById('val-rotation').textContent = data.star.spectralType || 'G2V';

      document.getElementById('lbl-tilt').textContent = 'Coordinates';
      document.getElementById('val-tilt').textContent = `${data.ra || 0}° / ${data.dec || 0}°`;

      document.getElementById('lbl-period').textContent = 'Galactic Orbit';
      document.getElementById('val-period').textContent = '~230 Million Years';

      document.getElementById('lbl-speed').textContent = i18n.t('orbitalSpeed');
      document.getElementById('val-speed').textContent = '230 km/s in Milky Way';

      const lblEcc = document.getElementById('lbl-eccentricity');
      const valEcc = document.getElementById('val-eccentricity');
      if (lblEcc && valEcc) {
        lblEcc.textContent = 'Orbital Model';
        valEcc.textContent = 'Keplerian';
      }
      const lblInc = document.getElementById('lbl-inclination');
      const valInc = document.getElementById('val-inclination');
      if (lblInc && valInc) {
        lblInc.textContent = 'Invariant Plane';
        valInc.textContent = 'Coplanar';
      }

      factsList.innerHTML = '';
      const facts = [
        `Hosts ${data.planetCount} planets cataloged by NASA missions.`,
        `Positioned ${data.dist_ly} light-years away from our Sun in the Milky Way.`,
        `Stellar class ${data.star.spectralType} radiating at ${data.star.temperatureK || 5778} Kelvin.`
      ];
      facts.forEach(f => {
        const item = document.createElement('div');
        item.className = 'fun-fact-item';
        item.textContent = f;
        factsList.appendChild(item);
      });
    }

    this.updateTimeHUD();
  }

  hideDetailsPanel() {
    const panel = document.getElementById('details-panel');
    if (panel) panel.classList.remove('active');
  }

  initTour() {
    this.tourStops = [
      {
        type: 'galaxy',
        title: { en: "Milky Way Galaxy", fr: "La Voie Lactée" },
        desc: {
          en: "Welcome to the Milky Way, a barred spiral galaxy home to over 100 billion stars spanning 100,000 light-years across. Let's begin our journey through time and space!",
          fr: "Bienvenue dans la Voie Lactée, une galaxie spirale barrée de plus de 100 milliards d'étoiles sur 100 000 années-lumière. Débutons notre voyage dans l'espace et le temps !"
        }
      },
      {
        type: 'system',
        systemId: 'solar-system',
        title: { en: "The Solar System", fr: "Le Système Solaire" },
        desc: {
          en: "Formed 4.6 billion years ago from a collapsing solar nebula, anchored by our Sun containing 99.86% of the system's mass.",
          fr: "Formé il y a 4,6 milliards d'années par effondrement d'une nébuleuse, ancré par le Soleil qui concentre 99,86 % de la masse."
        }
      },
      {
        type: 'planet',
        planetId: 'earth',
        title: { en: "Earth & The Moon", fr: "La Terre et la Lune" },
        desc: {
          en: "Earth and its Moon Luna form a double system born from a colossal protoplanet collision 4.5 billion years ago, fostering oceans and life.",
          fr: "La Terre et sa Lune forment un système né d'une collision géante il y a 4,5 milliards d'années, berceau d'océans et de la vie."
        }
      },
      {
        type: 'planet',
        planetId: 'mars',
        title: { en: "Mars & Moons Phobos/Deimos", fr: "Mars et ses lunes" },
        desc: {
          en: "Mars, the dusty red world with giant Olympus Mons and two tiny captured asteroid moons: Phobos and Deimos.",
          fr: "Mars, la planète rouge abritant Olympus Mons et deux lunes astéroïdes capturées : Phobos et Déimos."
        }
      },
      {
        type: 'planet',
        planetId: 'jupiter',
        title: { en: "Jupiter & 4 Galilean Moons", fr: "Jupiter et lunes galiléennes" },
        desc: {
          en: "Jupiter with its 350-year-old Great Red Spot and 4 mini-worlds: volcanic Io, ocean Europa, massive Ganymede, and cratered Callisto.",
          fr: "Jupiter avec sa Grande Tache rouge et ses 4 lunes majeures : Io volcanique, Europe océanique, Ganymède géante et Callisto cratérisée."
        }
      },
      {
        type: 'planet',
        planetId: 'saturn',
        title: { en: "Saturn & Titan / Enceladus", fr: "Saturne, Titan et Encelade" },
        desc: {
          en: "Adorned with pure ice rings and 146 moons, including Titan with methane lakes and Enceladus with salty water geysers.",
          fr: "Parée d'anneaux de glace et de 146 lunes, dont Titan aux lacs de méthane et Encelade aux geysers d'eau salée."
        }
      },
      {
        type: 'system',
        systemId: 'trappist-1',
        title: { en: "TRAPPIST-1 System", fr: "Système TRAPPIST-1" },
        desc: {
          en: "40 light-years away, an ultra-cool red dwarf hosting 7 Earth-sized rocky planets, 3 located in the temperate habitable zone!",
          fr: "À 40 années-lumière, une naine rouge ultra-froide abrite 7 mondes de taille terrestre, dont 3 en zone habitable !"
        }
      }
    ];
  }

  startGuidedTour() {
    this.isTourActive = true;
    this.tourStepIndex = 0;
    const tourOverlay = document.getElementById('tour-overlay');
    if (tourOverlay) tourOverlay.classList.add('active');
    this.runTourStep(0);
  }

  runTourStep(index) {
    if (index < 0 || index >= this.tourStops.length) return;
    this.tourStepIndex = index;
    const stop = this.tourStops[index];
    const lang = i18n.lang;

    document.getElementById('tour-step-counter').textContent = i18n.t('tourStepCount', {
      current: index + 1,
      total: this.tourStops.length
    });
    document.getElementById('tour-title').textContent = stop.title[lang] || stop.title.en;
    document.getElementById('tour-description').textContent = stop.desc[lang] || stop.desc.en;

    const prevBtn = document.getElementById('btn-tour-prev');
    const nextBtn = document.getElementById('btn-tour-next');
    prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = index === this.tourStops.length - 1 ? i18n.t('tourFinish') : `${i18n.t('tourNext')} →`;

    if (stop.type === 'galaxy') {
      this.flyToGalaxyView();
    } else if (stop.type === 'system') {
      const sys = systemsData.find(s => s.id === stop.systemId) || systemsData[0];
      this.flyToStarSystem(sys);
    } else if (stop.type === 'planet') {
      this.navigateToCelestialBody(stop.planetId);
    }
  }

  exitGuidedTour() {
    this.isTourActive = false;
    const tourOverlay = document.getElementById('tour-overlay');
    if (tourOverlay) tourOverlay.classList.remove('active');
  }

  onPointerMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const tooltip = document.getElementById('hover-tooltip');
    if (!tooltip) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = [];

    if (this.viewMode !== 'galaxy') {
      const activeLabels = [];
      if (this.showLabels) {
        if (this.planetLabelSprites.length > 0) activeLabels.push(...this.planetLabelSprites);
        if (this.moonLabelSprites.length > 0) activeLabels.push(...this.moonLabelSprites);
        if (this.starLabelSprite) activeLabels.push(this.starLabelSprite);
      }
      if (activeLabels.length > 0) {
        intersects = this.raycaster.intersectObjects(activeLabels);
      }
      if (intersects.length === 0 && this.spacecraftMeshes.length > 0) {
        intersects = this.raycaster.intersectObjects(this.spacecraftMeshes, true);
      }
      if (intersects.length === 0 && this.moonMeshes.length > 0) {
        intersects = this.raycaster.intersectObjects(this.moonMeshes);
      }
      if (intersects.length === 0 && this.planetMeshes.length > 0) {
        intersects = this.raycaster.intersectObjects(this.planetMeshes);
      }
      if (intersects.length === 0 && this.starMesh) {
        intersects = this.raycaster.intersectObject(this.starMesh);
      }
    } else {
      intersects = this.raycaster.intersectObjects(this.clickableObjects);
    }

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit && !hit.userData?.type && hit.parent && hit.parent !== this.systemGroup) {
        hit = hit.parent;
      }
      if (!hit || !hit.userData?.type) {
        this.hoveredObject = null;
        document.body.style.cursor = 'default';
        tooltip.classList.remove('active');
        return;
      }
      this.hoveredObject = hit;
      document.body.style.cursor = 'pointer';

      let text = '';
      if (hit.userData.type === 'planet' || hit.userData.type === 'planet-label') {
        const p = hit.userData.planetData;
        const pName = typeof p.name === 'object' ? (p.name[i18n.lang] || p.name.en) : p.name;
        const orbPeriod = hit.userData.orbitalPeriodDays || p.orbitalPeriodDays || '';
        text = `🪐 ${pName} (${orbPeriod}d orbit)`;
      } else if (hit.userData.type === 'moon' || hit.userData.type === 'moon-label') {
        const m = hit.userData.moonData;
        const mName = typeof m.name === 'object' ? (m.name[i18n.lang] || m.name.en) : m.name;
        text = `🌑 Moon: ${mName} (${m.radiusKm || ''} km)`;
      } else if (hit.userData.type === 'spacecraft') {
        const sc = hit.userData.craftData;
        const scName = typeof sc.name === 'object' ? (sc.name[i18n.lang] || sc.name.en) : sc.name;
        text = `🛰️ ${scName} • ${sc.altitudeKm}`;
      } else if (hit.userData.type === 'star' || hit.userData.type === 'star-label') {
        const sys = hit.userData.systemData || this.currentSystem;
        const starRaw = sys?.star?.name;
        const sName = typeof starRaw === 'object' ? (starRaw[i18n.lang] || starRaw.en) : (starRaw || 'The Sun');
        text = `☀️ Star: ${sName} (${sys?.star?.spectralType || 'G2V'})`;
      } else if (hit.userData.type === 'system-marker') {
        const sys = hit.userData.systemData;
        const sName = sys.isSolarSystem ? i18n.t('crumbSolarSystem') : (sys.name[i18n.lang] || sys.name.en);
        text = `⭐ ${sName} • ${sys.planetCount} planets • ${sys.dist_ly} ly`;
      }

      tooltip.textContent = text;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.add('active');
    } else {
      this.hoveredObject = null;
      document.body.style.cursor = 'default';
      tooltip.classList.remove('active');
    }
  }

  onClick(e) {
    if (e && e.target && e.target !== this.renderer.domElement) return;

    if (e) {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      let intersects = [];
      if (this.viewMode !== 'galaxy') {
        const activeLabels = [];
        if (this.showLabels) {
          if (this.planetLabelSprites.length > 0) activeLabels.push(...this.planetLabelSprites);
          if (this.moonLabelSprites.length > 0) activeLabels.push(...this.moonLabelSprites);
          if (this.starLabelSprite) activeLabels.push(this.starLabelSprite);
        }
        if (activeLabels.length > 0) intersects = this.raycaster.intersectObjects(activeLabels);
        if (intersects.length === 0 && this.spacecraftMeshes.length > 0) intersects = this.raycaster.intersectObjects(this.spacecraftMeshes, true);
        if (intersects.length === 0 && this.moonMeshes.length > 0) intersects = this.raycaster.intersectObjects(this.moonMeshes);
        if (intersects.length === 0 && this.planetMeshes.length > 0) intersects = this.raycaster.intersectObjects(this.planetMeshes);
        if (intersects.length === 0 && this.starMesh) intersects = this.raycaster.intersectObject(this.starMesh);
      } else {
        intersects = this.raycaster.intersectObjects(this.clickableObjects);
      }
      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit && !hit.userData?.type && hit.parent && hit.parent !== this.systemGroup) {
          hit = hit.parent;
        }
        if (hit && hit.userData?.type) {
          this.hoveredObject = hit;
        }
      }
    }

    if (!this.hoveredObject) return;

    sound.playChime(520);

    if (this.hoveredObject.userData.type === 'system-marker') {
      this.flyToStarSystem(this.hoveredObject.userData.systemData);
    } else if (this.hoveredObject.userData.type === 'planet' || this.hoveredObject.userData.type === 'planet-label') {
      const pMesh = this.hoveredObject.userData.planetMesh || this.hoveredObject;
      this.focusOnPlanet(pMesh);
    } else if (this.hoveredObject.userData.type === 'moon' || this.hoveredObject.userData.type === 'moon-label') {
      const mMesh = this.hoveredObject.userData.moonMesh || this.hoveredObject;
      this.focusOnMoon(mMesh);
    } else if (this.hoveredObject.userData.type === 'spacecraft') {
      this.focusOnSpacecraft(this.hoveredObject);
    } else if (this.hoveredObject.userData.type === 'star' || this.hoveredObject.userData.type === 'star-label') {
      const sMesh = this.hoveredObject.userData.starMesh || this.starMesh || this.hoveredObject;
      this.focusOnStar(sMesh);
    }
  }

  initUI() {
    // 1. Language Toggle
    const btnEn = document.getElementById('btn-lang-en');
    const btnFr = document.getElementById('btn-lang-fr');

    btnEn.addEventListener('click', () => {
      btnEn.classList.add('active');
      btnFr.classList.remove('active');
      i18n.setLanguage('en');
      this.updateUILanguage();
    });

    btnFr.addEventListener('click', () => {
      btnFr.classList.add('active');
      btnEn.classList.remove('active');
      i18n.setLanguage('fr');
      this.updateUILanguage();
    });

    // 2. Sound Toggle
    const btnAudio = document.getElementById('btn-audio');
    const iconSoundOff = document.getElementById('icon-sound-off');
    const iconSoundOn = document.getElementById('icon-sound-on');

    btnAudio.addEventListener('click', () => {
      const isUnmuted = sound.toggleMute();
      btnAudio.classList.toggle('active', isUnmuted);
      iconSoundOff.style.display = isUnmuted ? 'none' : 'block';
      iconSoundOn.style.display = isUnmuted ? 'block' : 'none';
    });

    // 3. Multi-Epoch Time Simulator Buttons
    document.getElementById('btn-jump-hour').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-hour');
      this.jumpTime(1.0 / 24.0, 'leapHour');
    });
    document.getElementById('btn-jump-day').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-day');
      this.jumpTime(1.0, 'leapDay');
    });
    document.getElementById('btn-jump-month').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-month');
      this.jumpTime(30.4375, 'leapMonth');
    });
    document.getElementById('btn-jump-year').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-year');
      this.jumpTime(365.25, 'leapYear');
    });
    document.getElementById('btn-jump-decade').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-decade');
      this.jumpTime(3652.5, 'leapDecade');
    });
    document.getElementById('btn-jump-century').addEventListener('click', () => {
      this.setActiveTimeStep('btn-jump-century');
      this.jumpTime(36525.0, 'leapCentury');
    });

    const btnCustom = document.getElementById('btn-jump-custom');
    const customPopover = document.getElementById('custom-time-popover');
    const customInput = document.getElementById('custom-time-input');
    const customUnit = document.getElementById('custom-time-unit');
    const btnCloseCustom = document.getElementById('btn-close-custom-time');
    const btnApplyCustom = document.getElementById('btn-apply-custom-leap');

    // Restore saved custom settings if available
    const savedCustomAmount = localStorage.getItem('customTimeAmount');
    const savedCustomUnit = localStorage.getItem('customTimeUnit');
    if (savedCustomAmount && customInput) customInput.value = savedCustomAmount;
    if (savedCustomUnit && customUnit) customUnit.value = savedCustomUnit;

    const savedStep = localStorage.getItem('preferredTimeStep');
    if (savedStep && document.getElementById(savedStep)) {
      this.setActiveTimeStep(savedStep);
      if (savedStep === 'btn-jump-custom' && savedCustomAmount && savedCustomUnit) {
        const unitAbbr = { hours: 'Hr', days: 'd', months: 'Mo', years: 'Yr', decades: 'Dec', centuries: 'Cent' }[savedCustomUnit] || savedCustomUnit;
        btnCustom.textContent = `+${savedCustomAmount} ${unitAbbr} ⚙️`;
      }
    }

    if (btnCustom && customPopover) {
      btnCustom.addEventListener('click', () => {
        const isHidden = customPopover.classList.contains('hidden');
        if (isHidden) {
          customPopover.classList.remove('hidden');
          if (customInput) {
            customInput.focus();
            customInput.select();
          }
        } else {
          customPopover.classList.add('hidden');
        }
      });
    }

    if (btnCloseCustom && customPopover) {
      btnCloseCustom.addEventListener('click', () => {
        customPopover.classList.add('hidden');
      });
    }

    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        const amt = parseFloat(customInput.value);
        const unit = customUnit.value;
        this.executeCustomLeap(amt, unit);
      });
    }

    if (customInput) {
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const amt = parseFloat(customInput.value);
          const unit = customUnit.value;
          this.executeCustomLeap(amt, unit);
        }
      });
    }

    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.val);
        const unit = chip.dataset.unit;
        if (customInput) customInput.value = val;
        if (customUnit) customUnit.value = unit;
        this.executeCustomLeap(val, unit);
      });
    });

    document.addEventListener('pointerdown', (e) => {
      if (customPopover && !customPopover.classList.contains('hidden')) {
        if (!customPopover.contains(e.target) && e.target !== btnCustom && !btnCustom.contains(e.target)) {
          customPopover.classList.add('hidden');
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && customPopover && !customPopover.classList.contains('hidden')) {
        customPopover.classList.add('hidden');
      }
    });

    document.getElementById('btn-reset-time').addEventListener('click', () => {
      this.resetTime();
    });

    const btnCloseToast = document.getElementById('btn-close-toast');
    if (btnCloseToast) {
      btnCloseToast.addEventListener('click', () => {
        const toast = document.getElementById('time-leap-toast');
        if (toast) toast.style.display = 'none';
      });
    }

    // 4. Search Bar
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        searchResults.classList.remove('active');
        return;
      }

      searchResults.innerHTML = '';
      const matches = [];

      solarSystemData.system.planets.forEach(p => {
        const enName = p.name.en.toLowerCase();
        const frName = p.name.fr.toLowerCase();
        if (enName.includes(query) || frName.includes(query)) {
          matches.push({ type: 'planet', data: p, name: p.name[i18n.lang] || p.name.en, parent: 'Solar System' });
        }
        if (p.moonsList) {
          p.moonsList.forEach(m => {
            const mEn = m.name.en.toLowerCase();
            const mFr = m.name.fr.toLowerCase();
            if (mEn.includes(query) || mFr.includes(query)) {
              matches.push({ type: 'moon', data: m, parentPlanet: p, name: m.name[i18n.lang] || m.name.en, parent: `Moon of ${p.name.en}` });
            }
          });
        }
      });

      systemsData.forEach(s => {
        const sName = s.name.en.toLowerCase();
        if (sName.includes(query)) {
          matches.push({ type: 'system', data: s, name: s.name[i18n.lang] || s.name.en, parent: `${s.planetCount} planets • ${s.dist_ly} ly` });
        }
      });

      if (matches.length === 0) {
        const noRes = document.createElement('div');
        noRes.className = 'search-item';
        noRes.textContent = i18n.t('noResults');
        searchResults.appendChild(noRes);
      } else {
        matches.slice(0, 7).forEach(m => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.innerHTML = `
            <div class="search-item-info">
              <span class="search-item-name">${m.name}</span>
              <span class="search-item-desc">${m.parent}</span>
            </div>
            <span class="search-item-tag">${m.type}</span>
          `;
          item.addEventListener('click', () => {
            searchResults.classList.remove('active');
            searchInput.value = '';
            if (m.type === 'system') {
              this.flyToStarSystem(m.data);
            } else if (m.type === 'planet' || m.type === 'moon' || m.type === 'spacecraft') {
              this.navigateToCelestialBody(m.data.id);
            }
          });
          searchResults.appendChild(item);
        });
      }
      searchResults.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        searchResults.classList.remove('active');
      }
    });

    // 5. Toolbar Buttons
    document.getElementById('btn-brand').addEventListener('click', () => {
      this.flyToGalaxyView();
      this.showGalaxyDetails();
    });
    document.getElementById('btn-home').addEventListener('click', () => this.flyToGalaxyView());

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      gsap.to(this.camera, {
        zoom: this.camera.zoom * 1.3,
        duration: 0.3,
        onUpdate: () => this.camera.updateProjectionMatrix()
      });
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      gsap.to(this.camera, {
        zoom: Math.max(0.5, this.camera.zoom / 1.3),
        duration: 0.3,
        onUpdate: () => this.camera.updateProjectionMatrix()
      });
    });

    const btnPlayPause = document.getElementById('btn-play-pause');
    const iconPause = document.getElementById('icon-pause');
    const iconPlay = document.getElementById('icon-play');
    btnPlayPause.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      btnPlayPause.classList.toggle('active', !this.isPaused);
      iconPause.style.display = this.isPaused ? 'none' : 'block';
      iconPlay.style.display = this.isPaused ? 'block' : 'none';
    });

    const selectSpeed = document.getElementById('select-speed');
    selectSpeed.addEventListener('change', (e) => {
      this.timeScale = parseFloat(e.target.value);
    });

    const btnToggleOrbits = document.getElementById('btn-toggle-orbits');
    btnToggleOrbits.addEventListener('click', () => {
      this.showOrbits = !this.showOrbits;
      btnToggleOrbits.classList.toggle('active', this.showOrbits);
      this.orbitMeshes.forEach(m => m.visible = this.showOrbits);
      this.moonOrbitLines.forEach(m => m.visible = this.showOrbits);
    });

    const btnToggleLabels = document.getElementById('btn-toggle-labels');
    btnToggleLabels.addEventListener('click', () => {
      this.showLabels = !this.showLabels;
      btnToggleLabels.classList.toggle('active', this.showLabels);
      this.updateLabelsVisibility();
    });

    // 5. Guided Tour
    document.getElementById('btn-close-tour').addEventListener('click', () => this.exitGuidedTour());
    document.getElementById('btn-tour-prev').addEventListener('click', () => this.runTourStep(this.tourStepIndex - 1));
    document.getElementById('btn-tour-next').addEventListener('click', () => {
      if (this.tourStepIndex >= this.tourStops.length - 1) this.exitGuidedTour();
      else this.runTourStep(this.tourStepIndex + 1);
    });

    // 6. Fact-Sheet Tabs
    document.getElementById('btn-close-details').addEventListener('click', () => this.hideDetailsPanel());

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const activeContent = document.getElementById(`tab-content-${targetTab}`);
        if (activeContent) activeContent.classList.add('active');
      });
    });

    // 7. Credits Modal
    const creditsModal = document.getElementById('credits-modal');
    document.getElementById('btn-credits').addEventListener('click', () => creditsModal.classList.add('active'));
    document.getElementById('btn-close-credits').addEventListener('click', () => creditsModal.classList.remove('active'));
    document.getElementById('btn-modal-close').addEventListener('click', () => creditsModal.classList.remove('active'));

    const footerCreditsBtn = document.getElementById('footer-btn-credits');
    if (footerCreditsBtn) {
      footerCreditsBtn.addEventListener('click', () => creditsModal.classList.add('active'));
    }

    // 8. NASA Planetary Chart Board & View Mode Switcher
    this.initChartBoard();
    this.initViewModeSwitcher();
  }

  initChartBoard() {
    const chartPanel = document.getElementById('chart-board-panel');
    const btnChart = document.getElementById('btn-chart-board');
    const btnToolChart = document.getElementById('btn-toolbar-chart');
    const btnClose = document.getElementById('btn-chart-close');
    const btnMin = document.getElementById('btn-chart-minimize');

    const toggle = () => {
      if (!chartPanel) return;
      const isClosed = chartPanel.classList.contains('collapsed') || !chartPanel.classList.contains('active');
      this.openChartBoard(isClosed);
    };

    if (btnChart) btnChart.addEventListener('click', toggle);
    if (btnToolChart) btnToolChart.addEventListener('click', toggle);
    if (btnClose) btnClose.addEventListener('click', () => this.openChartBoard(false));
    if (btnMin) btnMin.addEventListener('click', () => {
      chartPanel.classList.toggle('minimized');
    });

    // Tab buttons inside chart board
    const chartTabBtns = document.querySelectorAll('.chart-tab-btn');
    chartTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chartTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.chart-tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(tabId);
        if (pane) pane.classList.add('active');
      });
    });

    // Target chips inside chart board
    const chips = document.querySelectorAll('.target-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const targetId = chip.dataset.target;
        this.navigateToCelestialBody(targetId);
      });
    });

    // Radar canvas click interactivity
    const radarCanvas = document.getElementById('orbit-radar-canvas');
    if (radarCanvas) {
      radarCanvas.addEventListener('click', (e) => {
        const rect = radarCanvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 340;
        const clickY = ((e.clientY - rect.top) / rect.height) * 260;
        if (this.chartRadarMoons && this.chartRadarMoons.length > 0) {
          for (const m of this.chartRadarMoons) {
            if (m.currentCanvasPos) {
              const d = Math.hypot(clickX - m.currentCanvasPos.x, clickY - m.currentCanvasPos.y);
              if (d < 18) {
                this.navigateToCelestialBody(m.id);
                break;
              }
            }
          }
        }
      });
    }

    // Initialize comparative bar charts
    this.renderComparativeCharts();

    // Default to Jupiter as requested ("implement, for example, Jupiter and how many suns... and moons to rotate to Jupiter")
    const jupiterData = solarSystemData.system.planets.find(p => p.id === 'jupiter');
    if (jupiterData) {
      this.updateChartBoardTarget(jupiterData, 'planet');
    }
  }

  openChartBoard(open = true) {
    const chartPanel = document.getElementById('chart-board-panel');
    const btnChart = document.getElementById('btn-chart-board');
    const btnToolChart = document.getElementById('btn-toolbar-chart');
    if (!chartPanel) return;
    if (open) {
      chartPanel.classList.remove('collapsed');
      chartPanel.classList.add('active');
      if (btnChart) btnChart.classList.add('active');
      if (btnToolChart) btnToolChart.classList.add('active');
    } else {
      chartPanel.classList.add('collapsed');
      chartPanel.classList.remove('active');
      if (btnChart) btnChart.classList.remove('active');
      if (btnToolChart) btnToolChart.classList.remove('active');
    }
  }

  initViewModeSwitcher() {
    const btnViewMode = document.getElementById('btn-view-mode');
    const txtViewMode = document.getElementById('txt-btn-view-mode');
    const iconViewMode = document.getElementById('view-mode-icon');
    if (!btnViewMode) return;

    btnViewMode.addEventListener('click', () => {
      const isMobile = document.body.classList.toggle('view-mobile');
      document.body.classList.toggle('view-desktop', !isMobile);
      if (isMobile) {
        if (txtViewMode) txtViewMode.textContent = 'Desktop View';
        if (iconViewMode) iconViewMode.textContent = '🖥️';
      } else {
        if (txtViewMode) txtViewMode.textContent = 'Mobile View';
        if (iconViewMode) iconViewMode.textContent = '📱';
      }
      this.onWindowResize();
    });
  }

  updateChartBoardTarget(target, type = 'planet') {
    if (!target) return;
    this.currentChartTarget = target;
    this.currentChartType = type;

    // 1. Identify Target and Parent System
    let targetName = typeof target.name === 'object' ? (target.name[i18n.lang] || target.name.en) : (target.name || '');
    let targetId = target.id || (type === 'star' ? 'sun' : '');
    let targetTypeDesc = typeof target.type === 'object' ? (target.type[i18n.lang] || target.type.en) : (target.type || 'Celestial World');

    // If moon, find its parent planet
    let parentPlanet = null;
    if (type === 'moon') {
      parentPlanet = (solarSystemData.system.planets || []).find(p => p.moonsList && p.moonsList.some(m => m.id === target.id));
    }
    const hostPlanet = parentPlanet || (type === 'planet' ? target : null);

    // Update target info header
    const nameEl = document.getElementById('chart-target-name');
    const typeEl = document.getElementById('chart-target-type');
    if (nameEl) nameEl.textContent = targetName;
    if (typeEl) typeEl.textContent = targetTypeDesc;

    // Highlight target chip
    document.querySelectorAll('.target-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.target === targetId || (parentPlanet && chip.dataset.target === parentPlanet.id));
    });

    // 2. Host Sun(s) System Data ("how many suns")
    const sunCountBadge = document.getElementById('chart-suns-count');
    const sunNameEl = document.getElementById('chart-sun-name');
    const sunDistEl = document.getElementById('chart-sun-dist');
    const sunLightTimeEl = document.getElementById('chart-sun-light-time');
    const sunFluxEl = document.getElementById('chart-sun-flux');

    // NASA Host Suns Calculation
    let sunCount = 1;
    let sunName = 'The Sun (Sol - G2V)';
    let sunDist = '5.20 AU (778.5M km)';
    let lightTime = '43.3 Minutes';
    let solarFlux = '50.3 W/m² (3.7% Earth)';

    if (hostPlanet) {
      const au = hostPlanet.distanceFromSun ? hostPlanet.distanceFromSun.au : (hostPlanet.semiMajorAxisAu || 1.0);
      const millionKm = hostPlanet.distanceFromSun ? hostPlanet.distanceFromSun.millionKm : (au * 149.6).toFixed(1);
      sunDist = `${au} AU (${millionKm}M km)`;
      const lightMinutes = (au * 8.317).toFixed(1);
      lightTime = au < 0.1 ? 'Instantaneous' : (au > 10 ? `${(lightMinutes / 60).toFixed(2)} Hours` : `${lightMinutes} Minutes`);
      const flux = Math.round(1361 / (au * au));
      const fluxPct = ((flux / 1361) * 100).toFixed(1);
      solarFlux = `${flux} W/m² (${fluxPct}% Earth)`;
    } else if (type === 'star') {
      sunCount = 1;
      sunDist = '0.00 AU (Primary Star)';
      lightTime = '0.00 Seconds';
      solarFlux = '63,000,000 W/m² (Surface)';
    }

    if (sunCountBadge) sunCountBadge.textContent = `${sunCount} Sun (Sol G2V)`;
    if (sunNameEl) sunNameEl.textContent = sunName;
    if (sunDistEl) sunDistEl.textContent = sunDist;
    if (sunLightTimeEl) sunLightTimeEl.textContent = lightTime;
    if (sunFluxEl) sunFluxEl.textContent = solarFlux;

    // 3. Moons in Orbit Data ("how many moons to rotate to the Jupiter")
    const totalMoonsBadge = document.getElementById('chart-moons-total-count');
    const resonanceBox = document.getElementById('chart-resonance-box');
    const moonsListEl = document.getElementById('chart-moons-revolving-list');

    // NASA official moon counts (2024-2026 update)
    const officialNasaMoonCounts = {
      jupiter: { total: 95, major: 4, label: '95 Moons (NASA 2026)' },
      saturn: { total: 146, major: 8, label: '146 Moons (NASA 2026)' },
      uranus: { total: 28, major: 5, label: '28 Moons (NASA 2026)' },
      neptune: { total: 16, major: 1, label: '16 Moons (NASA 2026)' },
      mars: { total: 2, major: 2, label: '2 Moons (NASA 2026)' },
      earth: { total: 1, major: 1, label: '1 Moon (Luna)' },
      pluto: { total: 5, major: 1, label: '5 Moons (Charon)' },
      venus: { total: 0, major: 0, label: '0 Moons' },
      mercury: { total: 0, major: 0, label: '0 Moons' },
      sun: { total: 0, major: 0, label: '8 Major Planets' }
    };

    const targetKey = hostPlanet ? hostPlanet.id : (type === 'star' ? 'sun' : 'jupiter');
    const moonStat = officialNasaMoonCounts[targetKey] || { total: hostPlanet?.moons || 0, major: hostPlanet?.moonsList?.length || 0, label: `${hostPlanet?.moons || 0} Moons` };

    if (totalMoonsBadge) totalMoonsBadge.textContent = moonStat.label;

    // Laplace resonance box for Jupiter
    if (resonanceBox) {
      if (targetKey === 'jupiter') {
        resonanceBox.style.display = 'flex';
        resonanceBox.innerHTML = `
          <span class="resonance-icon">⚡</span>
          <div>
            <strong>Laplace Orbital Resonance (4:2:1):</strong>
            <p>For every 4 orbits of Io (1.77d), Europa completes 2 (3.55d), and Ganymede completes 1 orbit (7.15d)! Driven by mutual gravitational tidal interaction.</p>
          </div>
        `;
      } else if (targetKey === 'saturn') {
        resonanceBox.style.display = 'flex';
        resonanceBox.innerHTML = `
          <span class="resonance-icon">💍</span>
          <div>
            <strong>Saturnian Moon & Ring Dynamics:</strong>
            <p>Mimas, Enceladus, Tethys, Dione, Rhea, and giant Titan (larger than Mercury) clear gaps in Saturn's rings and drive cryovolcanic plumes.</p>
          </div>
        `;
      } else {
        resonanceBox.style.display = 'none';
      }
    }

    // Populate revolving moons cards
    if (moonsListEl) {
      moonsListEl.innerHTML = '';
      const moons = (hostPlanet && hostPlanet.moonsList) ? hostPlanet.moonsList : [];
      if (moons.length > 0) {
        moons.forEach(m => {
          const mCard = document.createElement('div');
          mCard.className = 'chart-moon-card';
          const mName = typeof m.name === 'object' ? (m.name[i18n.lang] || m.name.en) : m.name;
          const period = m.orbitalPeriodDays ? `${m.orbitalPeriodDays}d` : '';
          const radiusKm = m.radiusKm ? `${m.radiusKm.toLocaleString()} km` : '';
          mCard.innerHTML = `
            <div class="chart-moon-card-left">
              <img src="${this.getMoonImagePath(m.id)}" alt="${mName}" class="chart-moon-thumb" onerror="this.src='/images/moon.jpg'">
              <div>
                <div class="chart-moon-name">${mName}</div>
                <div class="chart-moon-meta">${radiusKm} • Orbit: ${period}</div>
              </div>
            </div>
            <button class="chart-moon-fly-btn" type="button" title="Fly to ${mName} in 3D">🚀 Fly 3D</button>
          `;
          mCard.addEventListener('click', () => {
            this.navigateToCelestialBody(m.id);
          });
          moonsListEl.appendChild(mCard);
        });
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.fontSize = '0.75rem';
        emptyMsg.style.color = '#94a3b8';
        emptyMsg.style.padding = '8px 0';
        emptyMsg.textContent = targetKey === 'sun' ? 'Host star of 8 planets, 5 dwarf planets, and 300+ moons.' : 'No natural satellites in orbit around this celestial body.';
        moonsListEl.appendChild(emptyMsg);
      }
    }

    // 4. Setup Radar Moons
    const radarHostLegend = document.getElementById('radar-legend-host');
    if (radarHostLegend) radarHostLegend.textContent = targetName;
    this.chartRadarMoons = (hostPlanet && hostPlanet.moonsList) ? hostPlanet.moonsList.map((m, idx) => ({
      id: m.id,
      name: typeof m.name === 'object' ? (m.name[i18n.lang] || m.name.en) : m.name,
      period: m.orbitalPeriodDays || 10,
      radiusVisual: 28 + (idx + 1) * 22,
      color: m.id === 'io' ? '#eab308' : (m.id === 'europa' ? '#38bdf8' : (m.id === 'titan' ? '#f97316' : '#cbd5e1')),
      initialAngle: idx * 1.5
    })) : [];
  }

  renderChartRadar() {
    const canvas = document.getElementById('orbit-radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Draw background radar concentric grid rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let r = 20; r <= 120; r += 24) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw subtle crosshair lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();

    // Draw central host world
    const hostCol = this.currentChartTarget?.colorHex || '#f59e0b';
    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.5, hostCol);
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Draw moons rotating around host
    if (this.chartRadarMoons && this.chartRadarMoons.length > 0) {
      this.chartRadarMoons.forEach(m => {
        const angle = m.initialAngle + (2 * Math.PI * (this.simulatedDays / m.period));
        const mx = cx + Math.cos(angle) * m.radiusVisual;
        const my = cy + Math.sin(angle) * (m.radiusVisual * 0.72);
        m.currentCanvasPos = { x: mx, y: my };

        // Draw moon orbit line
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, m.radiusVisual, m.radiusVisual * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw moon orb
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw moon label with angle
        const deg = Math.round(((angle * 180 / Math.PI) % 360 + 360) % 360);
        ctx.font = '600 9px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${m.name} (${deg}°)`, mx + 6, my - 3);
      });
    } else {
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('No moons in orbit', cx, cy + 30);
      ctx.textAlign = 'start';
    }
  }

  updateLiveChartTelemetry() {
    const chartPanel = document.getElementById('chart-board-panel');
    if (!chartPanel || chartPanel.classList.contains('collapsed')) return;

    this.renderChartRadar();

    const target = this.currentChartTarget || solarSystemData.system.planets.find(p => p.id === 'jupiter');
    if (!target) return;

    const periodDays = target.orbitalPeriodDays || 4332.8;
    const rotHours = target.rotationPeriodHours || 9.93;

    const trueAnomaly = ((this.simulatedDays / periodDays) * 360 % 360 + 360) % 360;
    const rotDir = rotHours < 0 ? -1 : 1;
    const spinDeg = ((this.simulatedDays * 24 / Math.abs(rotHours)) * 360 * rotDir % 360 + 360) % 360;
    const rotDone = (this.simulatedDays * 24 / Math.abs(rotHours));
    const orbDone = (this.simulatedDays / periodDays);

    const angleEl = document.getElementById('telemetry-angle');
    const spinEl = document.getElementById('telemetry-spin');
    const rotEl = document.getElementById('telemetry-rotations');
    const orbEl = document.getElementById('telemetry-orbits');
    const velEl = document.getElementById('telemetry-velocity');

    if (angleEl) angleEl.textContent = `${trueAnomaly.toFixed(2)}°`;
    if (spinEl) spinEl.textContent = `${spinDeg.toFixed(2)}°`;
    if (rotEl) rotEl.textContent = rotDone.toFixed(2);
    if (orbEl) orbEl.textContent = orbDone.toFixed(3);
    if (velEl) velEl.textContent = target.orbitalSpeedKmS ? `${target.orbitalSpeedKmS} km/s` : '13.07 km/s';
  }

  renderComparativeCharts() {
    const moonsBarContainer = document.getElementById('bar-chart-moons');
    const radiiBarContainer = document.getElementById('bar-chart-radii');

    if (moonsBarContainer) {
      moonsBarContainer.innerHTML = '';
      const moonsData = [
        { name: 'Saturn', count: 146, max: 146 },
        { name: 'Jupiter', count: 95, max: 146 },
        { name: 'Uranus', count: 28, max: 146 },
        { name: 'Neptune', count: 16, max: 146 },
        { name: 'Pluto', count: 5, max: 146 },
        { name: 'Mars', count: 2, max: 146 },
        { name: 'Earth', count: 1, max: 146 },
        { name: 'Venus', count: 0, max: 146 },
        { name: 'Mercury', count: 0, max: 146 }
      ];

      moonsData.forEach(item => {
        const row = document.createElement('div');
        row.className = 'bar-chart-row';
        const pct = item.max > 0 ? (item.count / item.max) * 100 : 0;
        row.innerHTML = `
          <span class="bar-chart-label">${item.name}</span>
          <div class="bar-chart-bar-wrap">
            <div class="bar-chart-bar-fill" style="width: ${Math.max(2, pct)}%;"></div>
          </div>
          <span class="bar-chart-val">${item.count}</span>
        `;
        moonsBarContainer.appendChild(row);
      });
    }

    if (radiiBarContainer) {
      radiiBarContainer.innerHTML = '';
      const radiiData = [
        { name: 'Jupiter', ratio: 11.21 },
        { name: 'Saturn', ratio: 9.45 },
        { name: 'Uranus', ratio: 4.01 },
        { name: 'Neptune', ratio: 3.88 },
        { name: 'Earth', ratio: 1.00 },
        { name: 'Venus', ratio: 0.95 },
        { name: 'Mars', ratio: 0.53 },
        { name: 'Mercury', ratio: 0.38 }
      ];

      radiiData.forEach(item => {
        const row = document.createElement('div');
        row.className = 'bar-chart-row';
        const pct = (item.ratio / 11.21) * 100;
        row.innerHTML = `
          <span class="bar-chart-label">${item.name}</span>
          <div class="bar-chart-bar-wrap">
            <div class="bar-chart-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, #f59e0b, #ec4899);"></div>
          </div>
          <span class="bar-chart-val">${item.ratio}x</span>
        `;
        radiiBarContainer.appendChild(row);
      });
    }
  }

  initCosmicGuideModal() {
    const guideModal = document.getElementById('cosmic-guide-modal');
    const btnGuide = document.getElementById('btn-cosmic-guide');
    const btnMenuBar = document.getElementById('btn-menu-bar');
    const btnClose = document.getElementById('btn-close-guide');

    if (btnGuide) {
      btnGuide.addEventListener('click', () => {
        if (typeof this.toggleLeftNav === 'function') {
          this.toggleLeftNav();
        } else {
          this.openCosmicGuide();
        }
      });
    }

    if (btnMenuBar) {
      btnMenuBar.addEventListener('click', () => {
        if (typeof this.toggleLeftNav === 'function') {
          this.toggleLeftNav();
        } else {
          this.openCosmicGuide();
        }
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeCosmicGuide());
    }

    if (guideModal) {
      guideModal.addEventListener('click', (e) => {
        if (e.target === guideModal) this.closeCosmicGuide();
      });
    }

    // Tabs switching
    const tabMilkyWay = document.getElementById('tab-btn-milkyway');
    const tabSolarSystem = document.getElementById('tab-btn-solarsystem');
    const tabPlanets = document.getElementById('tab-btn-planets');

    const paneMilkyWay = document.getElementById('pane-guide-milkyway');
    const paneSolarSystem = document.getElementById('pane-guide-solarsystem');
    const panePlanets = document.getElementById('pane-guide-planets');

    const setGuideTab = (activeTab, activePane) => {
      [tabMilkyWay, tabSolarSystem, tabPlanets].forEach(t => t?.classList.remove('active'));
      [paneMilkyWay, paneSolarSystem, panePlanets].forEach(p => p?.classList.remove('active'));
      activeTab?.classList.add('active');
      activePane?.classList.add('active');
      try { if (sound && typeof sound.playClick === 'function') sound.playClick(); } catch(e) {}
    };

    tabMilkyWay?.addEventListener('click', () => setGuideTab(tabMilkyWay, paneMilkyWay));
    tabSolarSystem?.addEventListener('click', () => setGuideTab(tabSolarSystem, paneSolarSystem));
    tabPlanets?.addEventListener('click', () => setGuideTab(tabPlanets, panePlanets));

    // CTA: Fly to Milky Way in 3D
    const btnFlyMW = document.getElementById('btn-guide-fly-mw');
    if (btnFlyMW) {
      btnFlyMW.addEventListener('click', () => {
        this.closeCosmicGuide();
        this.flyToGalaxyView();
      });
    }

    // CTA: Navigate to Solar System in 3D
    const btnFlySS = document.getElementById('btn-guide-fly-ss');
    if (btnFlySS) {
      btnFlySS.addEventListener('click', () => {
        this.closeCosmicGuide();
        this.flyToStarSystem(solarSystemData.system);
      });
    }

    // Global keyboard shortcut (Escape to close modal/drawer, M to toggle menu)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (guideModal?.classList.contains('active')) {
          this.closeCosmicGuide();
        } else if (typeof this.toggleLeftNav === 'function') {
          this.toggleLeftNav(false);
        }
      } else if ((e.key === 'm' || e.key === 'M') && !document.activeElement.matches('input, textarea')) {
        if (guideModal?.classList.contains('active')) {
          this.closeCosmicGuide();
        } else if (typeof this.toggleLeftNav === 'function') {
          this.toggleLeftNav();
        }
      }
    });

    this.renderCosmicGuidePlanets();
    this.updateCosmicGuideI18n();
  }

  openCosmicGuide() {
    const modal = document.getElementById('cosmic-guide-modal');
    if (!modal) return;
    try { if (sound && typeof sound.playClick === 'function') sound.playClick(); } catch(e) {}
    modal.classList.add('active');
    this.renderCosmicGuidePlanets();
    this.updateCosmicGuideI18n();
  }

  closeCosmicGuide() {
    const modal = document.getElementById('cosmic-guide-modal');
    if (modal) modal.classList.remove('active');
  }

  toggleLeftNav(forceState) {
    const drawer = document.getElementById('left-nav-drawer');
    const floatingBtn = document.getElementById('btn-left-nav-floating-open');
    if (!drawer) return;
    const isCurrentlyCollapsed = drawer.classList.contains('collapsed');
    const shouldCollapse = forceState !== undefined ? !forceState : !isCurrentlyCollapsed;

    if (shouldCollapse) {
      drawer.classList.add('collapsed');
      if (floatingBtn) floatingBtn.classList.add('visible');
    } else {
      drawer.classList.remove('collapsed');
      if (floatingBtn) floatingBtn.classList.remove('visible');
      try { if (sound && typeof sound.playClick === 'function') sound.playClick(); } catch(e) {}
    }
  }

  /**
   * Minimal Left-Side Navigation Menu Drawer (Master Prompt Section 5)
   */
  initLeftNavDrawer() {
    const btnClose = document.getElementById('btn-left-nav-close');
    const floatingBtn = document.getElementById('btn-left-nav-floating-open');

    if (btnClose) {
      btnClose.addEventListener('click', () => this.toggleLeftNav(false));
    }

    if (floatingBtn) {
      floatingBtn.addEventListener('click', () => this.toggleLeftNav(true));
    }

    // Category pills filter/scroll
    const pills = document.querySelectorAll('.lnav-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const secId = pill.dataset.section;
        const navBody = document.getElementById('left-nav-body');
        if (secId === 'all') {
          if (navBody) navBody.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const targetSec = document.getElementById(secId);
          if (targetSec && navBody) {
            targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (secId === 'sec-moons') {
            this.navigateToMoonsOverview();
          } else if (secId === 'sec-solar') {
            this.flyToStarSystem(solarSystemData.system);
            this.highlightActiveNav('system', 'solar-system');
          } else if (secId === 'sec-galaxy') {
            this.flyToGalaxyView();
            this.highlightActiveNav('galaxy');
          }
        }
      });
    });

    // Section 1: Galaxy Overview button & interactive image
    const btnFlyGalaxy = document.getElementById('btn-lnav-fly-galaxy');
    const secGalaxyRow = document.querySelector('#sec-galaxy .lnav-card-thumb-row');
    const triggerGalaxyNav = () => {
      this.toggleLeftNav(false);
      this.flyToGalaxyView();
      this.highlightActiveNav('galaxy');
    };
    if (btnFlyGalaxy) btnFlyGalaxy.addEventListener('click', triggerGalaxyNav);
    if (secGalaxyRow) secGalaxyRow.addEventListener('click', triggerGalaxyNav);

    // Section 2: Star Systems list (101 Cataloged)
    const systemsListContainer = document.getElementById('lnav-systems-list');
    if (systemsListContainer) {
      systemsListContainer.innerHTML = '';
      systemsData.forEach(sys => {
        const item = document.createElement('div');
        item.className = 'lnav-sys-item';
        item.dataset.sysId = sys.id;
        const sysName = typeof sys.name === 'object' ? (sys.name[i18n.lang] || sys.name.en) : sys.name;
        item.innerHTML = `
          <div>
            <strong>${sysName}</strong>
            <div class="lnav-item-sub">${sys.planetCount} planets • ${sys.dist_ly} ly</div>
          </div>
          <span class="lnav-item-badge">${sys.isSolarSystem ? 'Sun' : 'Exo'}</span>
        `;
        item.addEventListener('click', () => {
          this.toggleLeftNav(false);
          this.flyToStarSystem(sys);
          this.highlightActiveNav('system', sys.id);
        });
        systemsListContainer.appendChild(item);
      });
    }

    // Section 3: Solar System button & interactive image
    const btnFlySolar = document.getElementById('btn-lnav-fly-solar');
    const secSolarRow = document.querySelector('#sec-solar .lnav-card-thumb-row');
    const triggerSolarNav = () => {
      this.toggleLeftNav(false);
      this.flyToStarSystem(solarSystemData.system);
      this.highlightActiveNav('system', 'solar-system');
    };
    if (btnFlySolar) btnFlySolar.addEventListener('click', triggerSolarNav);
    if (secSolarRow) secSolarRow.addEventListener('click', triggerSolarNav);

    // Section 4: Stars list
    const starsListContainer = document.getElementById('lnav-stars-list');
    if (starsListContainer) {
      starsListContainer.innerHTML = '';
      const starEntries = [
        { id: 'sun', name: 'The Sun', sub: 'Yellow Dwarf (G2V) • 0 ly', isSolar: true },
        { id: 'proxima-centauri', name: 'Proxima Centauri', sub: 'Red Dwarf (M5.5V) • 4.24 ly', sysName: 'Proxima Centauri' },
        { id: 'trappist-1', name: 'TRAPPIST-1', sub: 'Ultra-cool Dwarf (M8V) • 39.5 ly', sysName: 'TRAPPIST-1' },
        { id: 'kepler-90', name: 'Kepler-90', sub: 'Sun-like Star (G0V) • 2840 ly', sysName: 'Kepler-90' },
        { id: 'gliese-667-c', name: 'Gliese 667 C', sub: 'Red Dwarf (M1.5V) • 23.6 ly', sysName: 'Gliese 667 C' },
        { id: 'kepler-186', name: 'Kepler-186', sub: 'Red Dwarf (M1V) • 582 ly', sysName: 'Kepler-186' }
      ];

      starEntries.forEach(st => {
        const item = document.createElement('div');
        item.className = 'lnav-star-item';
        item.dataset.starId = st.id;
        item.innerHTML = `
          <div>
            <strong>${st.name}</strong>
            <div class="lnav-item-sub">${st.sub}</div>
          </div>
          <span class="lnav-item-badge">Star</span>
        `;
        item.addEventListener('click', () => {
          this.toggleLeftNav(false);
          if (st.isSolar) {
            this.navigateToCelestialBody('sun', true);
          } else {
            const sys = systemsData.find(s => s.name.en.toLowerCase() === st.sysName.toLowerCase() || s.id === st.id);
            if (sys) this.flyToStarSystem(sys);
          }
          this.highlightActiveNav('star', st.id);
        });
        starsListContainer.appendChild(item);
      });
    }

    // Section 5: Planets Grid (9 Worlds) with interactive image click and explicit navigation option
    const planetsGrid = document.getElementById('lnav-planets-grid');
    if (planetsGrid) {
      planetsGrid.innerHTML = '';
      const planets = solarSystemData.system.planets || [];
      planets.forEach(p => {
        const card = document.createElement('div');
        card.className = 'lnav-planet-card';
        card.dataset.planetId = p.id;
        const pName = typeof p.name === 'object' ? (p.name[i18n.lang] || p.name.en) : p.name;
        const distAu = p.distanceFromSun ? `${p.distanceFromSun.au} AU` : '';
        const periodDays = `${p.orbitalPeriodDays}d`;

        card.innerHTML = `
          <div class="lnav-planet-thumb-wrap">
            <img src="/images/${p.id}.jpg" alt="${pName}" class="lnav-planet-thumb" loading="lazy">
            <div class="lnav-card-hover-overlay"><span>🔭 3D View</span></div>
          </div>
          <div class="lnav-planet-name">
            <span>${pName}</span>
          </div>
          <div class="lnav-planet-meta">
            <span>${distAu}</span>
            <span>${periodDays}</span>
          </div>
          <button class="lnav-card-nav-btn" type="button">
            <span>🚀</span> Fly 3D
          </button>
        `;
        card.addEventListener('click', () => {
          this.toggleLeftNav(false);
          this.navigateToCelestialBody(p.id, false);
          this.highlightActiveNav('planet', p.id);
        });
        planetsGrid.appendChild(card);
      });
    }

    // Section 6: Moons Overview button & interactive row
    const btnFlyMoons = document.getElementById('btn-lnav-fly-moons');
    const secMoonsRow = document.getElementById('sec-moons-row');
    const triggerMoonsNav = () => {
      this.toggleLeftNav(false);
      this.navigateToMoonsOverview();
    };
    if (btnFlyMoons) btnFlyMoons.addEventListener('click', triggerMoonsNav);
    if (secMoonsRow) secMoonsRow.addEventListener('click', triggerMoonsNav);

    // Section 6: Moons List (13 Natural Satellites) with interactive image click and explicit navigation option
    const moonsListContainer = document.getElementById('lnav-moons-list');
    if (moonsListContainer) {
      moonsListContainer.innerHTML = '';
      const moonsList = [];
      (solarSystemData.system.planets || []).forEach(p => {
        if (p.moonsList) {
          p.moonsList.forEach(m => {
            moonsList.push({ ...m, parentName: p.name.en, parentId: p.id });
          });
        }
      });

      moonsList.forEach(m => {
        const item = document.createElement('div');
        item.className = 'lnav-moon-item';
        item.dataset.moonId = m.id;
        const mName = typeof m.name === 'object' ? (m.name[i18n.lang] || m.name.en) : m.name;
        item.innerHTML = `
          <div style="display:flex; align-items:center;">
            <div class="lnav-moon-thumb-wrap">
              <img src="${this.getMoonImagePath(m.id)}" alt="${mName}" class="lnav-moon-thumb" onerror="this.src='/images/moon.jpg'">
            </div>
            <div>
              <strong>${mName}</strong>
              <div class="lnav-item-sub">Moon of ${m.parentName}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="lnav-item-badge">${m.orbitalPeriodDays}d</span>
            <button class="lnav-moon-nav-btn" type="button" title="Fly to ${mName} in 3D">🚀</button>
          </div>
        `;
        item.addEventListener('click', () => {
          this.toggleLeftNav(false);
          this.navigateToCelestialBody(m.id, false);
          this.highlightActiveNav('moon', m.id);
        });
        moonsListContainer.appendChild(item);
      });
    }

    // Section 7: Exoplanets List
    const exoListContainer = document.getElementById('lnav-exoplanets-list');
    if (exoListContainer) {
      exoListContainer.innerHTML = '';
      const famousExos = [
        { name: 'TRAPPIST-1 e', sys: 'TRAPPIST-1', sub: 'Earth-size • Habitable Zone candidate', badge: 'HZ Earth-size' },
        { name: 'Proxima Centauri b', sys: 'Proxima Centauri', sub: 'Nearest known exoplanet • 4.24 ly', badge: 'Nearest' },
        { name: 'Kepler-452 b', sys: 'Kepler-452', sub: 'Earth’s Cousin • G2 Sun-like Star', badge: 'Super-Earth' },
        { name: 'TOI-700 d', sys: 'TOI-700', sub: 'TESS Habitable Zone Earth-size', badge: 'TESS HZ' },
        { name: 'Kepler-22 b', sys: 'Kepler-22', sub: 'First Kepler planet in Habitable Zone', badge: 'Kepler HZ' },
        { name: '55 Cancri e', sys: '55 Cancri', sub: 'Ultra-hot Super-Earth Lava World', badge: 'Super-Earth' },
        { name: 'Kepler-16 b', sys: 'Kepler-16', sub: 'Circumbinary "Tatooine" Planet', badge: 'Circumbinary' }
      ];

      famousExos.forEach(exo => {
        const item = document.createElement('div');
        item.className = 'lnav-exo-item';
        item.innerHTML = `
          <div>
            <strong>${exo.name}</strong>
            <div class="lnav-item-sub">${exo.sub}</div>
          </div>
          <span class="lnav-item-badge">${exo.badge}</span>
        `;
        item.addEventListener('click', () => {
          this.toggleLeftNav(false);
          const sys = systemsData.find(s => s.name.en.toLowerCase().includes(exo.sys.toLowerCase()));
          if (sys) {
            this.flyToStarSystem(sys);
            this.highlightActiveNav('system', sys.id);
          }
        });
        exoListContainer.appendChild(item);
      });
    }

    // Section 8: Universal Search in Drawer
    const drawerSearchInput = document.getElementById('left-nav-search-input');
    const drawerSearchClear = document.getElementById('left-nav-search-clear');
    const drawerSearchMatches = document.getElementById('lnav-search-matches');

    if (drawerSearchInput && drawerSearchMatches) {
      drawerSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (drawerSearchClear) {
          drawerSearchClear.style.display = q ? 'block' : 'none';
        }
        if (!q) {
          drawerSearchMatches.innerHTML = '';
          return;
        }

        drawerSearchMatches.innerHTML = '';
        const matches = [];

        // Search planets & moons
        (solarSystemData.system.planets || []).forEach(p => {
          const en = p.name.en.toLowerCase();
          const fr = p.name.fr.toLowerCase();
          if (en.includes(q) || fr.includes(q)) {
            matches.push({ type: 'planet', id: p.id, name: p.name[i18n.lang] || p.name.en, sub: 'Solar System Planet' });
          }
          if (p.moonsList) {
            p.moonsList.forEach(m => {
              const men = m.name.en.toLowerCase();
              const mfr = m.name.fr.toLowerCase();
              if (men.includes(q) || mfr.includes(q)) {
                matches.push({ type: 'moon', id: m.id, name: m.name[i18n.lang] || m.name.en, sub: `Moon of ${p.name.en}` });
              }
            });
          }
        });

        // Search systems
        systemsData.forEach(s => {
          const sen = s.name.en.toLowerCase();
          if (sen.includes(q)) {
            matches.push({ type: 'system', sys: s, name: s.name[i18n.lang] || s.name.en, sub: `${s.planetCount} planets • ${s.dist_ly} ly` });
          }
        });

        // Search human spacecraft & satellites
        satellites.humanMissionsCatalog.forEach(craft => {
          const en = craft.name.en.toLowerCase();
          const fr = craft.name.fr.toLowerCase();
          if (en.includes(q) || fr.includes(q) || craft.id.includes(q)) {
            matches.push({ type: 'spacecraft', id: craft.id, name: craft.name[i18n.lang] || craft.name.en, sub: `${craft.agency} (${craft.launchYear})` });
          }
        });

        if (matches.length === 0) {
          drawerSearchMatches.innerHTML = `<div style="font-size:0.75rem; color:#64748b; padding:6px;">No matching celestial bodies found.</div>`;
        } else {
          matches.slice(0, 6).forEach(m => {
            const card = document.createElement('div');
            card.className = 'lnav-sys-item';
            card.innerHTML = `
              <div>
                <strong>${m.name}</strong>
                <div class="lnav-item-sub">${m.sub}</div>
              </div>
              <span class="lnav-item-badge">${m.type}</span>
            `;
            card.addEventListener('click', () => {
              this.toggleLeftNav(false);
              if (m.type === 'system') {
                this.flyToStarSystem(m.sys);
              } else if (m.type === 'planet' || m.type === 'moon' || m.type === 'spacecraft') {
                this.navigateToCelestialBody(m.id);
              }
              this.highlightActiveNav(m.type, m.id);
            });
            drawerSearchMatches.appendChild(card);
          });
        }
      });

      if (drawerSearchClear) {
        drawerSearchClear.addEventListener('click', () => {
          drawerSearchInput.value = '';
          drawerSearchMatches.innerHTML = '';
          drawerSearchClear.style.display = 'none';
          drawerSearchInput.focus();
        });
      }
    }

    // Section 9: Guided Tour button
    const btnStartTour = document.getElementById('btn-lnav-start-tour');
    if (btnStartTour) {
      btnStartTour.addEventListener('click', () => {
        this.toggleLeftNav(false);
        this.startGuidedTour();
      });
    }

    // Section 10: Scientific Data modal links
    const btnOpenGuideModal = document.getElementById('btn-lnav-open-guide-modal');
    if (btnOpenGuideModal) {
      btnOpenGuideModal.addEventListener('click', () => {
        this.openCosmicGuide();
      });
    }

    const btnOpenCredits = document.getElementById('btn-lnav-open-credits');
    if (btnOpenCredits) {
      btnOpenCredits.addEventListener('click', () => {
        const modal = document.getElementById('credits-modal');
        if (modal) modal.classList.add('active');
      });
    }

    // Section 11: Human Missions & Satellites (NASA & SpaceX 2026)
    const satListContainer = document.getElementById('lnav-satellites-list');
    if (satListContainer) {
      satListContainer.innerHTML = '';
      satellites.humanMissionsCatalog.forEach(craft => {
        const item = document.createElement('div');
        item.className = 'lnav-sat-item';
        item.dataset.craftId = craft.id;
        const cName = typeof craft.name === 'object' ? (craft.name[i18n.lang] || craft.name.en) : craft.name;
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${craft.photo}" alt="${cName}" class="lnav-sat-thumb">
            <div>
              <strong>${cName}</strong>
              <div class="lnav-item-sub">${craft.agency} • ${craft.altitudeKm}</div>
            </div>
          </div>
          <span class="lnav-item-badge">${craft.launchYear}</span>
        `;
        item.addEventListener('click', () => {
          this.toggleLeftNav(false);
          this.navigateToCelestialBody(craft.id, false);
          this.highlightActiveNav('spacecraft', craft.id);
        });
        satListContainer.appendChild(item);
      });
    }

    // Auto-collapse on mobile
    if (window.innerWidth <= 768) {
      this.toggleLeftNav(false);
    }
  }

  highlightActiveNav(type, id) {
    document.querySelectorAll('.lnav-sys-item, .lnav-star-item, .lnav-planet-card, .lnav-moon-item, .lnav-sat-item, #sec-galaxy, #sec-solar').forEach(el => {
      el.classList.remove('active');
    });

    if (type === 'galaxy') {
      const gSec = document.getElementById('sec-galaxy');
      if (gSec) gSec.classList.add('active');
    } else if (type === 'solar' || (type === 'system' && (id === 'solar-system' || id === 'solarsystem' || id === 'solar'))) {
      const sSec = document.getElementById('sec-solar');
      if (sSec) sSec.classList.add('active');
    } else if (type === 'planet' && id) {
      const card = document.querySelector(`.lnav-planet-card[data-planet-id="${id}"]`);
      if (card) {
        card.classList.add('active');
        if (typeof card.scrollIntoView === 'function') card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (type === 'moon' && id) {
      const item = document.querySelector(`.lnav-moon-item[data-moon-id="${id}"]`);
      if (item) {
        item.classList.add('active');
        if (typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (type === 'spacecraft' && id) {
      const item = document.querySelector(`.lnav-sat-item[data-craft-id="${id}"]`);
      if (item) {
        item.classList.add('active');
        if (typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (type === 'star' && id) {
      const item = document.querySelector(`.lnav-star-item[data-star-id="${id}"]`);
      if (item) {
        item.classList.add('active');
        if (typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (type === 'system' && id) {
      const item = document.querySelector(`.lnav-sys-item[data-sys-id="${id}"]`);
      if (item) {
        item.classList.add('active');
        if (typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  renderCosmicGuidePlanets() {
    const container = document.getElementById('guide-planets-container');
    if (!container) return;

    const lang = i18n.lang;
    const planets = solarSystemData.system.planets || [];

    const items = [
      {
        id: 'sun',
        isStar: true,
        name: solarSystemData.system.star.name,
        type: solarSystemData.system.star.type,
        photo: '/images/sun.jpg',
        badge: lang === 'fr' ? 'Étoile Centrale' : 'Central Star (G2V)',
        desc: solarSystemData.system.star.formation,
        diameter: '1,392,700 km',
        dist: '0 AU (Core: 26,000 ly)',
        period: '230M Yrs (Orbit)',
        moons: '8 Major Planets'
      },
      ...planets.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        photo: `/images/${p.id}.jpg`,
        badge: typeof p.type === 'object' ? (p.type[lang] || p.type.en) : p.type,
        desc: p.formation || p.interiorStructure,
        diameter: `${((p.radiusKm || 6000) * 2).toLocaleString()} km`,
        dist: p.distanceFromSun ? `${p.distanceFromSun.au} AU` : '—',
        period: `${p.orbitalPeriodDays} d`,
        moons: `${p.moons || (p.moonsList ? p.moonsList.length : 0)} Moons`
      }))
    ];

    container.innerHTML = '';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'guide-planet-card';

      const itemName = typeof item.name === 'object' ? (item.name[lang] || item.name.en) : item.name;
      const itemType = typeof item.type === 'object' ? (item.type[lang] || item.type.en) : item.type;
      const itemDesc = typeof item.desc === 'object' ? (item.desc[lang] || item.desc.en) : (item.desc || '');

      card.innerHTML = `
        <div class="guide-planet-thumb-wrap">
          <img src="${item.photo}" alt="${itemName}" class="guide-planet-thumb" loading="lazy">
          <span class="guide-planet-tag">${item.badge}</span>
        </div>
        <div class="guide-planet-info">
          <div class="guide-planet-header">
            <h4 class="guide-planet-name">${itemName}</h4>
            <span class="guide-planet-type">${itemType}</span>
          </div>
          <p class="guide-planet-desc">${itemDesc}</p>
          <div class="guide-planet-facts">
            <div><strong>Diameter:</strong> ${item.diameter}</div>
            <div><strong>Distance from Sun:</strong> ${item.dist}</div>
            <div><strong>Orbital Year:</strong> ${item.period}</div>
            <div><strong>Moons:</strong> ${item.moons}</div>
          </div>
          <button class="guide-planet-btn" data-planet-id="${item.id}" data-is-star="${item.isStar ? '1' : '0'}">
            <span>🔭</span> ${i18n.t('btnFlyPlanet3D')}
          </button>
        </div>
      `;

      const btn = card.querySelector('.guide-planet-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeCosmicGuide();
        this.navigateToCelestialBody(item.id, item.isStar);
      });

      card.addEventListener('click', () => {
        this.closeCosmicGuide();
        this.navigateToCelestialBody(item.id, item.isStar);
      });

      container.appendChild(card);
    });
  }

  navigateToMoonsOverview() {
    this.closeCosmicGuide();
    if (typeof this.toggleLeftNav === 'function') {
      this.toggleLeftNav(false);
    }
    const wasAlreadyInSolarSystem = this.currentSystem && this.currentSystem.isSolarSystem;
    if (!wasAlreadyInSolarSystem) {
      this.loadStarSystem(solarSystemData.system);
    }

    setTimeout(() => {
      const lunaMesh = this.moonMeshes.find(m => {
        const mid = String(m.userData?.moonData?.id || '').toLowerCase();
        return mid === 'luna' || mid === 'moon';
      });
      if (lunaMesh) {
        this.focusOnMoon(lunaMesh);
        this.highlightActiveNav('moon', 'luna');
        if (typeof this.updateChartBoardTarget === 'function') {
          this.updateChartBoardTarget(lunaMesh.userData.moonData, 'moon');
        }
      }
      this.openChartBoard(true);
    }, wasAlreadyInSolarSystem ? 50 : 200);
  }

  navigateToCelestialBody(id, isStar = false) {
    if (typeof this.toggleLeftNav === 'function') {
      this.toggleLeftNav(false);
    }
    this.closeCosmicGuide();

    const cleanId = String(id || '').trim().toLowerCase();

    // Direct routing for Solar System and Milky Way Galaxy
    if (cleanId === 'solar-system' || cleanId === 'solarsystem' || cleanId === 'solar') {
      this.flyToStarSystem(solarSystemData.system);
      this.highlightActiveNav('system', 'solar-system');
      if (typeof this.updateChartBoardTarget === 'function') {
        const jupiter = solarSystemData.system.planets.find(p => p.id === 'jupiter') || solarSystemData.system.planets[0];
        this.updateChartBoardTarget(jupiter, 'planet');
      }
      return;
    }
    if (cleanId === 'galaxy' || cleanId === 'milkyway' || cleanId === 'milky-way') {
      this.flyToGalaxyView();
      this.highlightActiveNav('galaxy');
      return;
    }

    // Direct routing for Solar System Moons
    if (cleanId === 'moons' || cleanId === 'solar-moons' || cleanId === 'solar-system-moons') {
      this.navigateToMoonsOverview();
      return;
    }

    const wasAlreadyInSolarSystem = this.currentSystem && this.currentSystem.isSolarSystem;

    if (!wasAlreadyInSolarSystem) {
      this.loadStarSystem(solarSystemData.system);
      // Place camera in system proximity if coming from distant galaxy view for snappy flight
      if (this.camera.position.length() > 1200) {
        const sysPos = this.systemGroup.position;
        this.camera.position.set(sysPos.x + 120, sysPos.y + 140, sysPos.z + 240);
        this.controls.target.copy(sysPos);
      }
    }
    this.scene.updateMatrixWorld(true);

    const doFocusAfterLoad = () => {
      if (isStar || cleanId === 'sun' || cleanId === 'the sun') {
        if (this.starMesh) {
          this.focusOnStar(this.starMesh);
          this.highlightActiveNav('star', 'sun');
          if (typeof this.updateChartBoardTarget === 'function') {
            this.updateChartBoardTarget(solarSystemData.system.star, 'star');
          }
        }
        return true;
      }

      // Check if it's a moon
      const moonMesh = this.moonMeshes.find(m => {
        const mid = String(m.userData?.moonData?.id || '').toLowerCase();
        const mName = String(m.userData?.moonData?.name?.en || '').toLowerCase();
        return mid === cleanId || mName === cleanId ||
          (cleanId === 'moon' && mid === 'luna') || (cleanId === 'luna' && mid === 'moon');
      });
      if (moonMesh) {
        this.focusOnMoon(moonMesh);
        this.highlightActiveNav('moon', moonMesh.userData?.moonData?.id || cleanId);
        if (typeof this.updateChartBoardTarget === 'function') {
          this.updateChartBoardTarget(moonMesh.userData?.moonData, 'moon');
        }
        return true;
      }

      // Check if it's a spacecraft
      const scMesh = this.spacecraftMeshes.find(m => {
        const scid = String(m.userData?.craftData?.id || '').toLowerCase();
        return scid === cleanId;
      });
      if (scMesh) {
        this.focusOnSpacecraft(scMesh);
        this.highlightActiveNav('spacecraft', cleanId);
        return true;
      }

      // Check if it's a planet
      const pMesh = this.planetMeshes.find(m => {
        const pid = String(m.userData?.planetData?.id || '').toLowerCase();
        const pname = String(m.userData?.planetData?.name?.en || '').toLowerCase();
        return pid === cleanId || pname === cleanId;
      });
      if (pMesh) {
        this.focusOnPlanet(pMesh);
        this.highlightActiveNav('planet', pMesh.userData?.planetData?.id || cleanId);
        if (typeof this.updateChartBoardTarget === 'function') {
          this.updateChartBoardTarget(pMesh.userData?.planetData, 'planet');
        }
        return true;
      }

      return false;
    };

    // If we just loaded the system fresh, give it a tiny delay for meshes to settle
    if (!wasAlreadyInSolarSystem) {
      setTimeout(() => {
        const found = doFocusAfterLoad();
        if (!found) {
          // Check if it's an exoplanet or outside star system
          const foundSys = systemsData.find(s => s.id === cleanId || s.planets?.some(p => {
            const pid = String(p.id || '').toLowerCase();
            const pname = String(p.name?.en || '').toLowerCase();
            return pid === cleanId || pname === cleanId;
          }));
          if (foundSys) {
            this.flyToStarSystem(foundSys);
            setTimeout(() => {
              const foundP = this.planetMeshes.find(m => {
                const pid = String(m.userData?.planetData?.id || '').toLowerCase();
                const pname = String(m.userData?.planetData?.name?.en || '').toLowerCase();
                return pid === cleanId || pname === cleanId;
              });
              if (foundP) {
                this.focusOnPlanet(foundP);
                if (typeof this.updateChartBoardTarget === 'function') {
                  this.updateChartBoardTarget(foundP.userData?.planetData, 'planet');
                }
              }
            }, 150);
          }
        }
      }, 150);
    } else {
      const found = doFocusAfterLoad();
      if (!found) {
        // Check if it's an exoplanet or outside star system
        const foundSys = systemsData.find(s => s.id === cleanId || s.planets?.some(p => {
          const pid = String(p.id || '').toLowerCase();
          const pname = String(p.name?.en || '').toLowerCase();
          return pid === cleanId || pname === cleanId;
        }));
        if (foundSys) {
          this.flyToStarSystem(foundSys);
          setTimeout(() => {
            const foundP = this.planetMeshes.find(m => {
              const pid = String(m.userData?.planetData?.id || '').toLowerCase();
              const pname = String(m.userData?.planetData?.name?.en || '').toLowerCase();
              return pid === cleanId || pname === cleanId;
            });
            if (foundP) {
              this.focusOnPlanet(foundP);
              if (typeof this.updateChartBoardTarget === 'function') {
                this.updateChartBoardTarget(foundP.userData?.planetData, 'planet');
              }
            }
          }, 150);
        }
      }
    }
  }

  updateCosmicGuideI18n() {
    const t = (k) => i18n.t(k);
    const setTxt = (id, k) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(k);
    };

    setTxt('txt-btn-guide', 'btnCosmicGuide');
    setTxt('txt-btn-menu-bar', 'btnMenuBar');
    setTxt('txt-guide-modal-title', 'cosmicGuideTitle');
    setTxt('txt-guide-modal-subtitle', 'cosmicGuideSubtitle');
    setTxt('txt-tab-milkyway', 'tabMilkyWay');
    setTxt('txt-tab-solarsystem', 'tabSolarSystem');
    setTxt('txt-tab-planets', 'tabPlanets');

    setTxt('txt-mw-badge', 'milkyWayBadge');
    setTxt('txt-mw-desc-title', 'milkyWayDescTitle');
    setTxt('txt-mw-desc-1', 'milkyWayDesc1');
    setTxt('txt-mw-desc-2', 'milkyWayDesc2');
    setTxt('txt-mw-diam', 'mwMetricDiam');
    setTxt('txt-mw-stars', 'mwMetricStars');
    setTxt('txt-mw-core', 'mwMetricCore');
    setTxt('txt-mw-speed', 'ssMetricSpeed');
    setTxt('txt-btn-fly-mw', 'btnFlyMilkyWay');

    setTxt('txt-ss-badge', 'solarSystemBadge');
    setTxt('txt-ss-desc-title', 'solarSystemDescTitle');
    setTxt('txt-ss-desc-1', 'solarSystemDesc1');
    setTxt('txt-ss-desc-2', 'solarSystemDesc2');
    setTxt('txt-ss-age', 'ssMetricAge');
    setTxt('txt-ss-star', 'ssMetricStar');
    setTxt('txt-ss-planets', 'ssMetricPlanets');
    setTxt('txt-btn-fly-ss', 'btnNavSolarSystem');

    setTxt('txt-gallery-title', 'planetsGalleryTitle');
    setTxt('txt-gallery-subtitle', 'planetsGallerySubtitle');
  }

  updateUILanguage() {
    document.getElementById('txt-app-title').textContent = i18n.t('appTitle');
    document.getElementById('txt-subtitle').textContent = i18n.t('subtitle');
    document.getElementById('txt-disclaimer').textContent = i18n.t('disclaimer');
    document.getElementById('search-input').placeholder = i18n.t('searchPlaceholder');
    document.getElementById('txt-btn-home').textContent = i18n.t('btnHome');
    document.getElementById('txt-btn-orbits').textContent = i18n.t('btnOrbits');
    document.getElementById('txt-btn-labels').textContent = i18n.t('btnLabels');
    document.getElementById('txt-btn-tour').textContent = i18n.t('btnTour');
    document.getElementById('btn-jump-hour').textContent = i18n.t('jumpHour');
    document.getElementById('btn-jump-day').textContent = i18n.t('jumpDay');
    document.getElementById('btn-jump-month').textContent = i18n.t('jumpMonth');
    document.getElementById('btn-jump-year').textContent = i18n.t('jumpYear');
    document.getElementById('btn-jump-decade').textContent = i18n.t('jumpDecade');
    document.getElementById('btn-jump-century').textContent = i18n.t('jumpCentury');
    document.getElementById('btn-reset-time').textContent = i18n.t('resetTime');

    const btnJumpCustom = document.getElementById('btn-jump-custom');
    if (btnJumpCustom && (!localStorage.getItem('customTimeAmount') || !btnJumpCustom.textContent.includes('⚙️'))) {
      btnJumpCustom.textContent = i18n.t('jumpCustom');
    }
    const lblCustomTitle = document.getElementById('lbl-custom-title');
    if (lblCustomTitle) lblCustomTitle.textContent = i18n.t('customTimeTitle');
    const lblCustomAmt = document.getElementById('lbl-custom-amount');
    if (lblCustomAmt) lblCustomAmt.textContent = i18n.t('customAmount');
    const optHours = document.getElementById('opt-hours');
    if (optHours) optHours.textContent = i18n.t('customUnitHours');
    const optDays = document.getElementById('opt-days');
    if (optDays) optDays.textContent = i18n.t('customUnitDays');
    const optMonths = document.getElementById('opt-months');
    if (optMonths) optMonths.textContent = i18n.t('customUnitMonths');
    const optYears = document.getElementById('opt-years');
    if (optYears) optYears.textContent = i18n.t('customUnitYears');
    const optDecades = document.getElementById('opt-decades');
    if (optDecades) optDecades.textContent = i18n.t('customUnitDecades');
    const optCenturies = document.getElementById('opt-centuries');
    if (optCenturies) optCenturies.textContent = i18n.t('customUnitCenturies');
    const lblQuick = document.getElementById('lbl-quick-pick');
    if (lblQuick) lblQuick.textContent = i18n.t('customQuickPick');
    const txtApply = document.getElementById('txt-apply-leap');
    if (txtApply) txtApply.textContent = i18n.t('customAdvance');
    const toastMsg = document.getElementById('toast-message');
    if (toastMsg && toastMsg.textContent.includes('increment')) {
      toastMsg.textContent = i18n.t('timeBannerTip');
    }

    document.getElementById('tab-btn-overview').textContent = i18n.t('tabOverview');
    document.getElementById('tab-btn-formation').textContent = i18n.t('tabFormation');
    document.getElementById('tab-btn-structure').textContent = i18n.t('tabStructure');
    document.getElementById('tab-btn-moons').textContent = i18n.t('tabMoons');
    document.getElementById('tab-btn-specs').textContent = i18n.t('tabSpecs');
    document.getElementById('tab-btn-facts').textContent = i18n.t('tabFacts');

    document.getElementById('lbl-formation-title').textContent = i18n.t('formationTitle');
    document.getElementById('lbl-interior-title').textContent = i18n.t('interiorTitle');
    document.getElementById('lbl-atmo-title').textContent = i18n.t('atmoTitle');

    const footTitle = document.getElementById('txt-footer-title');
    if (footTitle) footTitle.textContent = i18n.t('footerTitle');
    const footData = document.getElementById('txt-footer-data');
    if (footData) footData.textContent = i18n.t('footerData');

    this.updateBreadcrumbs();
    this.updateTimeHUD();
    this.updateCosmicGuideI18n();
    this.renderCosmicGuidePlanets();
    if (this.currentSpacecraft) this.showDetailsPanel(this.currentSpacecraft, 'spacecraft');
    else if (this.currentMoon) this.showDetailsPanel(this.currentMoon, 'moon');
    else if (this.currentPlanet) this.showDetailsPanel(this.currentPlanet, 'planet');
    else if (this.currentSystem) this.showDetailsPanel(this.currentSystem, 'system');
    else if (this.viewMode === 'galaxy' && document.getElementById('details-panel')?.classList.contains('active')) {
      this.showGalaxyDetails();
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate.bind(this));

    const daysStep = this.clock.update(timestamp);
    if (daysStep > 0 || this.clock.isLeaping) {
      this.updateTimeHUD();
    }

    // 1. Majestic Galaxy Rotation (continuous cosmic rotation from start + time evolution)
    if (this.galaxy && this.galaxy.update) {
      // 1 galactic year = ~230 million Earth years
      const galacticRotationBonus = (this.simulatedDays / (230000000 * 365.25)) * Math.PI * 2;
      this.galaxy.points.rotation.y = (timestamp * 0.00008) + (this.simulatedDays * 0.0005) + galacticRotationBonus;
    }

    if (this.deepSpaceBackground) {
      this.deepSpaceBackground.rotation.y = timestamp * 0.000015;
    }

    // 2. Pulse Sun marker halo in Galaxy View
    if (this.sunMarker && this.viewMode === 'galaxy') {
      const pulse = 1.0 + Math.sin(timestamp * 0.004) * 0.25;
      const base = this.sunMarker.userData.baseScale;
      this.sunMarker.scale.set(base * pulse, base * pulse, 1);
    }

    // 3. Star Corona Pulse
    if (this.starGlowSprite) {
      const starPulse = 1.0 + Math.sin(timestamp * 0.003) * 0.08;
      const baseR = this.starMesh.geometry.parameters.radius;
      this.starGlowSprite.scale.set(baseR * 4.4 * starPulse, baseR * 4.4 * starPulse, 1);
    }

    if (this.starMesh) {
      // Real solar rotation period: ~25.05 days at equator + ambient convective motion
      this.starMesh.rotation.y = (2 * Math.PI * (this.simulatedDays / 25.05)) + (timestamp * 0.0001);
    }

    // 4. Update Planetary Positions & Axial Spins Based on Exact Keplerian Orbit Physics
    if (this.planetMeshes.length > 0) {
      this.planetMeshes.forEach(mesh => {
        const u = mesh.userData;
        const periodDays = Math.max(u.orbitalPeriodDays, 0.1);
        
        // Exact 3D Keplerian Position with Sun at Focus
        const pos = calculateKeplerianPosition(
          u.orbitRadius,
          u.eccentricity || 0,
          u.inclinationDeg || 0,
          periodDays,
          this.simulatedDays,
          u.initialAngle
        );
        mesh.position.copy(pos);

        if (u.labelSprite) {
          u.labelSprite.position.set(pos.x, pos.y + u.labelSprite.userData.yOffset, pos.z);
        }

        // Exact axial spin: angle = (2*PI * hours / rotHours)
        // Respects directional sign: Venus (-5832.5h) rotates clockwise (retrograde)
        const rotHours = u.rotationPeriodHours || 24;
        const rotDir = rotHours < 0 ? -1 : 1;
        const rotAngle = rotDir * (2 * Math.PI * (this.simulatedDays * 24 / Math.abs(rotHours)));
        u.idleSpin = (u.idleSpin || 0);
        if (this.clock.isPaused) {
          u.idleSpin += rotDir * 0.0012;
        }
        mesh.rotation.y = rotAngle + u.idleSpin;
      });

      if (this.earthCloudsMesh) {
        this.earthCloudsMesh.rotation.y += 0.0008;
      }
    }

    // 5. Update Moon Anchor Groups to track parent planets (decoupled from axial spin)
    if (this.moonAnchorGroups && this.moonAnchorGroups.length > 0) {
      this.moonAnchorGroups.forEach(entry => {
        entry.group.position.copy(entry.planetMesh.position);
      });
    }

    // Update Moon Orbits Around Parent Planets
    if (this.moonMeshes.length > 0) {
      this.moonMeshes.forEach(mMesh => {
        const mU = mMesh.userData;
        const mPeriod = mU.orbitalPeriodDays || 27.3;
        const mAngle = mU.initialAngle + (2 * Math.PI * (this.simulatedDays / mPeriod));
        mU.currentAngle = mAngle;
        const incRad = THREE.MathUtils.degToRad(mU.inclinationDeg || 0);

        mMesh.position.set(
          Math.cos(mAngle) * mU.orbitDistanceVisual,
          Math.sin(mAngle) * mU.orbitDistanceVisual * Math.sin(incRad),
          Math.sin(mAngle) * mU.orbitDistanceVisual * Math.cos(incRad)
        );

        if (mU.labelSprite) {
          mU.labelSprite.position.set(
            mMesh.position.x,
            mMesh.position.y + mU.labelSprite.userData.yOffset,
            mMesh.position.z
          );
        }

        // Active, buttery-smooth axial rotation & synchronous tidal locking
        // When focused on this moon, provide a majestic continuous inspection spin
        mU.axialSpin = (mU.axialSpin || 0);
        const isCurrentFocusedMoon = (this.viewMode === 'moon' && this.currentMoon && this.currentMoon.id === mU.moonData?.id);

        if (isCurrentFocusedMoon) {
          // Buttery inspection spin so user can clearly see the colorful surface features rotating
          mU.axialSpin += 0.0035;
        } else if (this.clock.isPaused) {
          // Subtle ambient motion even when simulation is paused
          mU.axialSpin += 0.0008;
        }

        // Exact physical orbit-locked spin + buttery inspection spin
        mMesh.rotation.y = mAngle + mU.axialSpin;
      });
    }

    // 5.5. Update Human Spacecraft Positions (ISS, Hubble, JWST, Artemis Spacewalker, Voyager 1)
    if (this.spacecraftMeshes.length > 0) {
      const earthMesh = this.planetMeshes.find(m => m.userData?.planetData?.id === 'earth');
      const earthPos = earthMesh ? earthMesh.position : new THREE.Vector3(70, 0, 0);

      this.spacecraftMeshes.forEach(sc => {
        const u = sc.userData;
        const id = u.craftData.id;

        if (id === 'iss') {
          // ISS completes orbit in 92.68 mins = 0.06436 days
          const periodDays = 0.06436;
          const angle = u.initialAngle + (2 * Math.PI * (this.simulatedDays / periodDays));
          const r = u.orbitRadiusVisual;
          sc.position.set(
            earthPos.x + Math.cos(angle) * r,
            earthPos.y + Math.sin(angle) * 0.65, // 51.6° orbital inclination
            earthPos.z + Math.sin(angle) * r
          );
          sc.rotation.y = angle + Math.PI / 2;
        } else if (id === 'hubble') {
          // Hubble: 95.42 mins = 0.06626 days
          const periodDays = 0.06626;
          const angle = u.initialAngle + (2 * Math.PI * (this.simulatedDays / periodDays));
          const r = u.orbitRadiusVisual;
          sc.position.set(
            earthPos.x + Math.cos(angle) * r,
            earthPos.y + Math.sin(angle) * 0.45, // 28.5° inclination
            earthPos.z + Math.sin(angle) * r
          );
        } else if (id === 'astronaut') {
          // Artemis Spacewalker floats near Earth/ISS
          const periodDays = 0.06436;
          const angle = u.initialAngle + (2 * Math.PI * (this.simulatedDays / periodDays)) + 0.15;
          const r = u.orbitRadiusVisual;
          sc.position.set(
            earthPos.x + Math.cos(angle) * r,
            earthPos.y + Math.sin(angle) * 0.65 + Math.sin(timestamp * 0.002) * 0.08,
            earthPos.z + Math.sin(angle) * r
          );
          // Slow EVA tumbling
          sc.rotation.y = timestamp * 0.0004;
          sc.rotation.z = Math.sin(timestamp * 0.0003) * 0.2;
        } else if (id === 'jwst') {
          // L2 Point: permanently in anti-solar alignment behind Earth + halo oscillation
          const antiSun = earthPos.clone().normalize();
          const haloX = Math.cos(timestamp * 0.001) * 0.4;
          const haloY = Math.sin(timestamp * 0.001) * 0.4;
          sc.position.copy(earthPos).add(antiSun.multiplyScalar(7.2)).add(new THREE.Vector3(haloX, haloY, 0));
        } else if (id === 'voyager1') {
          // Voyager 1 slowly cruises on escape vector
          const vProgress = (this.simulatedDays / 365.25) * 0.2;
          sc.position.set(230 + vProgress * 1.5, 150 + vProgress, 180 + vProgress * 1.2);
        }
      });
    }

    // 6. Camera Tracking if locked on a planet, moon, star, or spacecraft
    let trackedMesh = null;
    if (this.viewMode === 'planet' && this.currentPlanet) {
      trackedMesh = this.planetMeshes.find(m => m.userData.planetData.id === this.currentPlanet.id);
    } else if (this.viewMode === 'moon' && this.currentMoon) {
      trackedMesh = this.moonMeshes.find(m => m.userData.moonData.id === this.currentMoon.id);
    } else if (this.viewMode === 'star' && this.starMesh) {
      trackedMesh = this.starMesh;
    } else if (this.viewMode === 'spacecraft' && this.currentSpacecraftMesh) {
      trackedMesh = this.currentSpacecraftMesh;
    }

    if (trackedMesh) {
      const worldPos = new THREE.Vector3();
      trackedMesh.getWorldPosition(worldPos);

      if (this.lastTrackedPos && !this.isTransitioning) {
        const deltaTrack = worldPos.clone().sub(this.lastTrackedPos);
        this.camera.position.add(deltaTrack);
        this.controls.target.add(deltaTrack);
      } else if (!this.isTransitioning) {
        this.controls.target.copy(worldPos);
      }
      this.lastTrackedPos = worldPos.clone();
    } else {
      this.lastTrackedPos = null;
    }

    if (!this.isTransitioning) {
      this.controls.update();
    }
    if (typeof this.updateLiveChartTelemetry === 'function') {
      this.updateLiveChartTelemetry();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MilkyWayExplorer();
});
