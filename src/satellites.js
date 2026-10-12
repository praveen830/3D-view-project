import * as THREE from 'three';

/**
 * 🛰️ High-Detail Procedural Spacecraft & Satellites (NASA & SpaceX 2026)
 * 
 * Features:
 * 1. ISS (International Space Station) with 8 golden solar arrays, truss, and docked Crew Dragon
 * 2. Hubble Space Telescope with aperture door, solar wings, and high-gain antenna
 * 3. James Webb Space Telescope (JWST) with 18 gold hexagonal mirrors and 5-layer sunshield at Sun-Earth L2
 * 4. Astronaut Spacewalker (EVA) with life-support MMU backpack and gold-reflective visor
 * 5. Voyager 1 Interstellar Probe with parabolic dish, RTGs, and golden record on escape trajectory
 */

// Procedural photovoltaic solar cell texture
function createSolarCellTexture() {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark metallic blue-copper base
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 512);

  // Solar cell grid lines
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  const numRows = 16;
  const numCols = 4;
  for (let r = 0; r <= numRows; r++) {
    const y = (r / numRows) * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let c = 0; c <= numCols; c++) {
    const x = (c / numCols) * 256;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Golden busbar highlights
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Procedural multi-layer insulation foil texture
function createFoilTexture(colorHex = '#e2e8f0') {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle crinkle pattern
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  return new THREE.CanvasTexture(canvas);
}

// -------------------------------------------------------------
// 1. INTERNATIONAL SPACE STATION (ISS)
// -------------------------------------------------------------
export function createISS() {
  const iss = new THREE.Group();
  iss.name = 'ISS';

  const solarTex = createSolarCellTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.25,
    side: THREE.DoubleSide
  });

  const moduleMat = new THREE.MeshStandardMaterial({
    map: createFoilTexture('#f8fafc'),
    metalness: 0.6,
    roughness: 0.4
  });

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.3
  });

  // Central Integrated Truss Structure (long horizontal beam)
  const trussGeo = new THREE.BoxGeometry(2.4, 0.06, 0.06);
  const truss = new THREE.Mesh(trussGeo, trussMat);
  iss.add(truss);

  // Habitation & Laboratory Modules (Destiny, Unity, Zarya, Zvezda)
  const modGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 16);
  modGeo.rotateX(Math.PI / 2);
  const mainModule = new THREE.Mesh(modGeo, moduleMat);
  iss.add(mainModule);

  const crossModGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 16);
  const crossModule = new THREE.Mesh(crossModGeo, moduleMat);
  iss.add(crossModule);

  // Solar Array Wings (8 massive dual arrays)
  const wingGeo = new THREE.PlaneGeometry(0.25, 0.7);
  const wingOffsetsX = [-1.0, -0.65, 0.65, 1.0];
  wingOffsetsX.forEach(x => {
    // Upper wing
    const topWing = new THREE.Mesh(wingGeo, solarMat);
    topWing.position.set(x, 0.45, 0);
    iss.add(topWing);

    // Lower wing
    const botWing = new THREE.Mesh(wingGeo, solarMat);
    botWing.position.set(x, -0.45, 0);
    iss.add(botWing);
  });

  // Heat rejection radiators (white perpendicular panels)
  const radGeo = new THREE.PlaneGeometry(0.18, 0.4);
  const radMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  [-0.3, 0.3].forEach(x => {
    const rad = new THREE.Mesh(radGeo, radMat);
    rad.rotation.x = Math.PI / 2;
    rad.position.set(x, 0, 0.22);
    iss.add(rad);
  });

  // Docked SpaceX Crew Dragon Capsule
  const dragonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const dragonGeo = new THREE.ConeGeometry(0.06, 0.14, 12);
  dragonGeo.rotateX(Math.PI / 2);
  const dragon = new THREE.Mesh(dragonGeo, dragonMat);
  dragon.position.set(0, 0, 0.42);
  iss.add(dragon);

  iss.scale.set(0.7, 0.7, 0.7);
  return iss;
}

// -------------------------------------------------------------
// 2. HUBBLE SPACE TELESCOPE
// -------------------------------------------------------------
export function createHubble() {
  const hubble = new THREE.Group();
  hubble.name = 'Hubble';

  const bodyMat = new THREE.MeshStandardMaterial({
    map: createFoilTexture('#e2e8f0'),
    metalness: 0.9,
    roughness: 0.2
  });

  // Main cylindrical telescope body
  const bodyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 18);
  bodyGeo.rotateZ(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  hubble.add(body);

  // Aperture Door (open at 45 degrees)
  const doorGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.02, 18);
  doorGeo.rotateZ(Math.PI / 2);
  const door = new THREE.Mesh(doorGeo, bodyMat);
  door.position.set(0.28, 0.06, 0);
  door.rotation.y = 0.5;
  hubble.add(door);

  // Solar Wings (2 rectangular arrays)
  const solarTex = createSolarCellTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    color: 0x38bdf8,
    metalness: 0.8,
    roughness: 0.3,
    side: THREE.DoubleSide
  });

  const wingGeo = new THREE.PlaneGeometry(0.18, 0.45);
  const wingLeft = new THREE.Mesh(wingGeo, solarMat);
  wingLeft.position.set(0, 0.32, 0);
  hubble.add(wingLeft);

  const wingRight = new THREE.Mesh(wingGeo, solarMat);
  wingRight.position.set(0, -0.32, 0);
  hubble.add(wingRight);

  // High-gain parabolic antenna dishes
  const dishGeo = new THREE.SphereGeometry(0.06, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(-0.25, 0.15, 0);
  dish.rotation.x = Math.PI / 2;
  hubble.add(dish);

  hubble.scale.set(0.65, 0.65, 0.65);
  return hubble;
}

// -------------------------------------------------------------
// 3. JAMES WEBB SPACE TELESCOPE (JWST)
// -------------------------------------------------------------
export function createJWST() {
  const jwst = new THREE.Group();
  jwst.name = 'JWST';

  // 5-Layer Kapton Sunshield (Kite / Diamond shape)
  const sunshieldMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd,
    metalness: 0.95,
    roughness: 0.15,
    side: THREE.DoubleSide
  });

  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(0, 0.7);
  shieldShape.lineTo(0.35, 0);
  shieldShape.lineTo(0, -0.7);
  shieldShape.lineTo(-0.35, 0);
  shieldShape.closePath();

  const shieldGeo = new THREE.ShapeGeometry(shieldShape);
  const sunshield = new THREE.Mesh(shieldGeo, sunshieldMat);
  sunshield.rotation.x = Math.PI / 2;
  jwst.add(sunshield);

  // Primary Mirror Array (18 Hexagonal Gold Beryllium Segments)
  const mirrorGroup = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.98,
    roughness: 0.08,
    side: THREE.DoubleSide
  });

  const hexRadius = 0.055;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2 && !(q === 0 && r === 0)) {
        const hx = hexRadius * Math.sqrt(3) * (q + r / 2);
        const hy = hexRadius * (3 / 2) * r;
        const hexGeo = new THREE.CircleGeometry(hexRadius * 0.92, 6);
        const hexMesh = new THREE.Mesh(hexGeo, goldMat);
        hexMesh.position.set(hx, hy, 0);
        mirrorGroup.add(hexMesh);
      }
    }
  }
  mirrorGroup.position.set(0, 0.12, 0);
  jwst.add(mirrorGroup);

  // Secondary Mirror Tripod Boom
  const tripodMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const boomGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35);
  [-0.15, 0.15].forEach(x => {
    const boom = new THREE.Mesh(boomGeo, tripodMat);
    boom.position.set(x, 0.22, 0.1);
    boom.rotation.x = 0.3;
    jwst.add(boom);
  });

  jwst.scale.set(0.9, 0.9, 0.9);
  return jwst;
}

// -------------------------------------------------------------
// 4. SPACEWALKER / ASTRONAUT (EVA)
// -------------------------------------------------------------
export function createAstronaut() {
  const astronaut = new THREE.Group();
  astronaut.name = 'Astronaut';

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.65,
    metalness: 0.1
  });

  const goldVisorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.98,
    roughness: 0.05
  });

  const packMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.5,
    metalness: 0.3
  });

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.12, 0.18, 0.09);
  const torso = new THREE.Mesh(torsoGeo, suitMat);
  astronaut.add(torso);

  // Life-Support Backpack (MMU / PLSS)
  const packGeo = new THREE.BoxGeometry(0.11, 0.16, 0.07);
  const pack = new THREE.Mesh(packGeo, packMat);
  pack.position.set(0, 0.01, -0.07);
  astronaut.add(pack);

  // Helmet with Gold Reflective Visor
  const helmetGeo = new THREE.SphereGeometry(0.065, 16, 16);
  const helmet = new THREE.Mesh(helmetGeo, suitMat);
  helmet.position.set(0, 0.15, 0);
  astronaut.add(helmet);

  const visorGeo = new THREE.SphereGeometry(0.055, 16, 16, 0, Math.PI, 0, Math.PI / 2);
  const visor = new THREE.Mesh(visorGeo, goldVisorMat);
  visor.position.set(0, 0.15, 0.02);
  visor.rotation.x = Math.PI / 2;
  astronaut.add(visor);

  // Limbs (Arms and Legs floating in microgravity)
  const limbGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
  [-0.08, 0.08].forEach(x => {
    // Arms
    const arm = new THREE.Mesh(limbGeo, suitMat);
    arm.position.set(x, 0.04, 0.04);
    arm.rotation.z = x > 0 ? -0.4 : 0.4;
    astronaut.add(arm);

    // Legs
    const leg = new THREE.Mesh(limbGeo, suitMat);
    leg.position.set(x * 0.5, -0.16, 0);
    leg.rotation.x = 0.2;
    astronaut.add(leg);
  });

  astronaut.scale.set(0.65, 0.65, 0.65);
  return astronaut;
}

// -------------------------------------------------------------
// 5. VOYAGER 1 INTERSTELLAR PROBE
// -------------------------------------------------------------
export function createVoyager1() {
  const voyager = new THREE.Group();
  voyager.name = 'Voyager 1';

  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide
  });

  const busMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.7,
    roughness: 0.3
  });

  // 3.7m Parabolic High-Gain Dish Antenna
  const dishGeo = new THREE.SphereGeometry(0.35, 24, 16, 0, Math.PI * 2, 0, 0.75);
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = Math.PI;
  voyager.add(dish);

  // 10-Sided Bus Equipment Bay
  const busGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10);
  const bus = new THREE.Mesh(busGeo, busMat);
  bus.position.set(0, -0.12, 0);
  voyager.add(bus);

  // Golden Record attached to equipment bay
  const recordGeo = new THREE.CircleGeometry(0.065, 24);
  const recordMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.1,
    side: THREE.DoubleSide
  });
  const record = new THREE.Mesh(recordGeo, recordMat);
  record.position.set(0.142, -0.12, 0);
  record.rotation.y = Math.PI / 2;
  voyager.add(record);

  // Magnetometer Boom (Extending 13 meters into the cosmic void)
  const boomMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const boomGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.4);
  const boom = new THREE.Mesh(boomGeo, boomMat);
  boom.position.set(0.65, -0.15, 0);
  boom.rotation.z = Math.PI / 3;
  voyager.add(boom);

  // Radioisotope Thermoelectric Generators (RTG) power canister
  const rtgGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8);
  const rtgMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const rtg = new THREE.Mesh(rtgGeo, rtgMat);
  rtg.position.set(-0.45, -0.18, 0);
  rtg.rotation.z = -Math.PI / 3;
  voyager.add(rtg);

  voyager.scale.set(0.8, 0.8, 0.8);
  return voyager;
}

// -------------------------------------------------------------
// SCIENTIFIC MISSIONS CATALOG DATA (2026 Telemetry)
// -------------------------------------------------------------
export const humanMissionsCatalog = [
  {
    id: 'iss',
    name: { en: "International Space Station (ISS)", fr: "Station Spatiale Internationale (ISS)" },
    agency: "NASA / ESA / JAXA / Roscosmos",
    launchYear: 1998,
    type: "Crewed Low Earth Orbit Station",
    orbitParent: "earth",
    orbitRadiusVisual: 3.75, // Just above Earth (R=2.7)
    speedKmH: "27,600 km/h (7.66 km/s)",
    altitudeKm: "420 km",
    periodMins: "92.68 min",
    massKg: "450,000 kg",
    photo: "/images/iss.svg",
    desc: {
      en: "Humanity's permanently crewed microgravity orbital laboratory, inhabited continuously since November 2000.",
      fr: "Laboratoire orbital habité en permanence par l'humanité en microgravité depuis novembre 2000."
    },
    funFacts: {
      en: [
        "Completes 15.5 orbits of Earth every 24 hours, experiencing 16 sunrises and sunsets a day.",
        "Solar arrays span 109 meters—larger than an American football field.",
        "Houses up to 11 astronauts conducting cancer research, crystal growth, and deep-space life support testing."
      ],
      fr: [
        "Effectue 15,5 orbites terrestres toutes les 24 heures, voyant 16 levers et couchers de soleil par jour.",
        "Ses panneaux solaires mesurent 109 mètres, plus longs qu'un terrain de football.",
        "Abrite des équipages internationaux testant la survie humaine pour de futurs voyages vers Mars."
      ]
    }
  },
  {
    id: 'hubble',
    name: { en: "Hubble Space Telescope", fr: "Télescope Spatial Hubble" },
    agency: "NASA / ESA",
    launchYear: 1990,
    type: "Optical & UV Space Observatory",
    orbitParent: "earth",
    orbitRadiusVisual: 4.2,
    speedKmH: "27,300 km/h (7.59 km/s)",
    altitudeKm: "540 km",
    periodMins: "95.42 min",
    massKg: "11,110 kg",
    photo: "/images/hubble.svg",
    desc: {
      en: "Revolutionary 2.4-meter space observatory that measured the expansion rate of the Universe and captured the famous Ultra Deep Field.",
      fr: "Observatoire spatial mythique de 2,4 m qui a mesuré le taux d'expansion de l'Univers et immortalisé le champ ultra-profond."
    },
    funFacts: {
      en: [
        "Has completed over 1.5 million observations and traveled more than 6 billion km in orbit.",
        "Can lock onto a target with accuracy of 0.007 arcseconds—like shining a laser beam on a coin 320 km away.",
        "Provided definitive observational proof that supermassive black holes exist at the centers of galaxies."
      ],
      fr: [
        "A réalisé plus de 1,5 million d'observations et parcouru plus de 6 milliards de km.",
        "Précision de pointage de 0,007 seconde d'arc, équivalant à viser une pièce de monnaie à 320 km.",
        "A prouvé l'existence de trous noirs supermassifs au cœur des galaxies."
      ]
    }
  },
  {
    id: 'jwst',
    name: { en: "James Webb Space Telescope (JWST)", fr: "Télescope Spatial James Webb (JWST)" },
    agency: "NASA / ESA / CSA",
    launchYear: 2021,
    type: "Infrared Flagship Observatory",
    orbitParent: "sun-earth-l2",
    orbitRadiusVisual: 12.0, // Near Earth L2
    speedKmH: "107,000 km/h (In orbit with Earth)",
    altitudeKm: "1,500,000 km (Lagrange L2)",
    periodMins: "365.25 days (Halo orbit at L2)",
    massKg: "6,500 kg",
    photo: "/images/jwst.svg",
    desc: {
      en: "Humanity's most powerful infrared observatory, peering back 13.5 billion years to the formation of the first stars and analyzing exoplanet atmospheres for biosignatures.",
      fr: "Le plus puissant observatoire infrarouge observant les premières étoiles il y a 13,5 milliards d'années et sondant les atmosphères d'exoplanètes."
    },
    funFacts: {
      en: [
        "Primary mirror consists of 18 hexagonal beryllium segments coated in pure vaporized gold (only 48 grams total).",
        "Sunshield is the size of a tennis court with SPF 1,000,000, keeping instruments chilled to -233°C (40 K).",
        "Detected atmospheric water vapor, carbon dioxide, and sulfur dioxide on distant habitable-zone exoplanets."
      ],
      fr: [
        "Miroir composé de 18 hexagones de béryllium plaqués d'or pur (seulement 48 grammes d'or au total).",
        "Bouclier thermique de la taille d'un court de tennis maintenant les détecteurs à -233°C.",
        "A détecté de la vapeur d'eau et du CO2 dans les atmosphères de mondes lointains."
      ]
    }
  },
  {
    id: 'astronaut',
    name: { en: "Artemis Spacewalker (EVA)", fr: "Astronaute en Sortie Spatiale (EVA)" },
    agency: "NASA / SpaceX Artemis Program (2026)",
    launchYear: 2026,
    type: "Human Extravehicular Activity",
    orbitParent: "earth",
    orbitRadiusVisual: 3.85,
    speedKmH: "27,600 km/h",
    altitudeKm: "420 km",
    periodMins: "92.7 min",
    massKg: "145 kg (Suit + MMU)",
    photo: "/images/astronaut.svg",
    desc: {
      en: "Untethered spacewalker utilizing advanced Extravehicular Mobility Unit (EMU) and Manned Maneuvering Unit (MMU) nitrogen cold-gas thrusters in low Earth orbit.",
      fr: "Astronaute en sortie extravéhiculaire autonome avec combinaison pressurisée et propulseurs à azote."
    },
    funFacts: {
      en: [
        "Spacesuit visor is coated in a microscopic layer of pure gold to reflect intense solar radiation while allowing visible light through.",
        "Astronauts traveling at 27,600 km/h feel zero air resistance or wind in the absolute vacuum of space.",
        "Prepares human explorers for the 2026 crewed landings at the lunar South Pole and future missions to Mars."
      ],
      fr: [
        "La visière du casque est recouverte d'or pour filtrer les rayonnements ultraviolets intenses du Soleil.",
        "À 27 600 km/h, l'astronaute ne ressent aucun vent dans le vide spatial parfait.",
        "Prépare les missions Artemis habitées vers le pôle Sud lunaire et Mars."
      ]
    }
  },
  {
    id: 'voyager1',
    name: { en: "Voyager 1 Interstellar Probe", fr: "Sonde Interstellaire Voyager 1" },
    agency: "NASA Jet Propulsion Laboratory (JPL)",
    launchYear: 1977,
    type: "Interstellar Spacecraft",
    orbitParent: "solar-escape",
    orbitRadiusVisual: 380.0, // Far outer system
    speedKmH: "61,200 km/h (17.0 km/s)",
    altitudeKm: "24.5 Billion km (163.5 AU)",
    periodMins: "Interstellar Escape (Hyperbolic)",
    massKg: "825.5 kg",
    photo: "/images/voyager.svg",
    desc: {
      en: "The most distant human-made object in history, crossing the heliopause in 2012 into interstellar space carrying the iconic Golden Record.",
      fr: "L'objet fabriqué par l'homme le plus distant de l'Histoire, voguant dans le milieu interstellaire avec le disque d'or."
    },
    funFacts: {
      en: [
        "Radio signals traveling at the speed of light take over 22.5 hours each way to reach Earth.",
        "Carries the 12-inch gold-plated copper phonograph record containing sounds, music, and greetings in 55 human languages.",
        "Powered by plutonium-238 radioisotope thermoelectric generators (RTGs), still transmitting data 49 years after launch."
      ],
      fr: [
        "Les signaux radio à la vitesse de la lumière mettent plus de 22,5 heures pour atteindre la Terre.",
        "Transporte le Golden Record avec des messages en 55 langues et les chants de la Terre.",
        "Fonctionne toujours grâce à ses générateurs thermoélectriques au plutonium après 49 ans de vol."
      ]
    }
  }
];
