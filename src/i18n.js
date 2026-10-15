/**
 * Milky Way Explorer - Internationalization (EN / FR)
 */

export const translations = {
  en: {
    appTitle: "Milky Way Explorer",
    subtitle: "3D Galaxy, Star Systems & Planetary Evolution",
    disclaimer: "Sizes and distances are not to scale",
    youAreHere: "You Are Here (Sun)",
    searchPlaceholder: "Search stars, planets, moons (e.g. Earth, Moon, Jupiter, TRAPPIST-1)...",
    noResults: "No celestial objects found",
    
    // Breadcrumbs
    crumbGalaxy: "Milky Way",
    crumbSolarSystem: "Solar System",
    
    // Toolbar buttons
    btnHome: "Galaxy View",
    btnZoomIn: "Zoom In",
    btnZoomOut: "Zoom Out",
    btnPlay: "Resume Simulation",
    btnPause: "Pause Simulation",
    btnOrbits: "Orbit Paths",
    btnLabels: "Labels",
    btnHotspots: "3D Hotspots",
    btnTour: "Guided Tour",
    btnExitTour: "Exit Tour",
    btnSound: "Audio",
    btnCredits: "Sources & Credits",
    
    // Detail sheet tabs
    tabOverview: "Overview",
    tabFormation: "Formation",
    tabStructure: "Structure",
    tabMoons: "Moons",
    tabSpecs: "Specs",
    tabFacts: "Fun Facts",
    
    // Formation & Structure Titles
    formationTitle: "Cosmic Origin & Accretion History",
    interiorTitle: "Interior Layers & Core",
    atmoTitle: "Atmosphere & Surface Pressure",
    viewMoon: "Explore in 3D",
    
    // Metric keys
    type: "Object Classification",
    radius: "Equatorial Radius",
    distFromSun: "Distance from Sun",
    distFromStar: "Distance from Star",
    orbitalPeriod: "Orbital Period",
    rotationPeriod: "Rotation Period",
    axialTilt: "Axial Tilt",
    moons: "Confirmed Moons",
    temperature: "Surface Temperature",
    spectralType: "Spectral Type",
    discoveryYear: "Discovery Year",
    discoveryMethod: "Detection Method",
    habitableZone: "Habitable Zone Candidate",
    habitableYes: "Yes (Temperate Liquid Water Potential)",
    habitableNo: "No (Outside Habitable Zone)",
    rotationsCompleted: "Rotations Completed",
    orbitsCompleted: "Orbits Completed",
    orbitalSpeed: "Orbital Speed",
    eccentricity: "Orbital Eccentricity (e)",
    inclination: "Orbital Inclination (i)",
    provenanceMeasured: "NASA Measured",
    provenanceDerived: "Kepler Derived",
    provenanceIllustrative: "Illustrative Scale",
    provenanceSourceNasa: "Source: NASA GSFC Planetary Fact Sheet",
    provenanceSourceArchive: "Source: NASA Exoplanet Archive",
    provenanceSourceModel: "Source: Keplerian Astrodynamics Model",
    
    // Time Simulator
    epochText: "Epoch: +{years} Years, {months} Months, {days} Days ({hours}h)",
    planetTrackingText: "{name}: {rotations} Rotations ({hoursTotal}h) • {orbits} Orbits",
    jumpHour: "+1 Hr",
    jumpDay: "+1 Day",
    jumpMonth: "+1 Mo",
    jumpYear: "+1 Yr",
    jumpDecade: "+Decade (10y)",
    jumpCentury: "+Century (100y)",
    jumpCustom: "⚙️ Custom",
    resetTime: "Reset",
    
    // Custom Time Jump Panel
    customTimeTitle: "Custom Time Leap",
    customAmount: "Amount:",
    customUnitHours: "Hours",
    customUnitDays: "Days",
    customUnitMonths: "Months (~30.4d)",
    customUnitYears: "Years (365.25d)",
    customUnitDecades: "Decades (10y)",
    customUnitCenturies: "Centuries (100y)",
    customQuickPick: "Quick:",
    customAdvance: "Advance Time",
    customToast: "Advanced {amount} {unit}: Earth completes {earthOrbits} orbits & {earthRotations} rotations • Mercury completes {mercOrbits} orbits.",
    customToastSelected: "Advanced {amount} {unit}: {name} completes {orbits} orbits & {rotations} rotations.",
    timeBannerTip: "Select any time increment (+1 Hr, +1 Day, +1 Mo, +1 Yr, +Decade, +Century, or Custom) to inspect real astronomical rotations & orbits!",
    
    // Time leap explanation toasts
    leapHour: "Advanced 1 Hour: Earth rotates 15.0° on axis • Moon advances 0.55° along orbit.",
    leapDay: "Advanced 1 Day: Earth completes 1.00 full axial rotation (24h) • Travels 2.57M km in orbit.",
    leapMonth: "Advanced 1 Month (30.4d): Moon completes 1 full revolution (27.3d) • Earth covers 30.0° of orbit • Mercury completes 1/3 of its year.",
    leapYear: "Advanced 1 Year (365.25d): Earth completes 1.00 full orbit & 365.25 axial rotations • Mercury completes 4.15 orbits • Mars completes 0.53 orbits.",
    leapDecade: "Advanced 1 Decade (10 Years): Earth completes 10 orbits • Jupiter completes 0.84 orbits • Saturn completes 0.34 orbits.",
    leapCentury: "Advanced 1 Century (100 Years): Earth completes 100 orbits • Uranus completes 1.19 orbits • Neptune completes 0.61 orbits • Sun drifts 725,000 km in galaxy.",
    leapReset: "Reset simulation to initial epoch (T+0).",
    
    // Footer
    footerTitle: "Milky Way Explorer 3D",
    footerData: "Data: NASA Exoplanet Archive & Goddard Fact Sheets",
    footerAttribution: "Built with Three.js & Vite • 60 FPS WebGL",
    
    // Units
    km: "km",
    au: "AU",
    days: "days",
    hours: "hours",
    deg: "°",
    lightYears: "light-years",
    earthRadii: "Earth radii (R⊕)",
    solarRadii: "Solar radii (R☉)",
    
    // Tour steps
    tourTitle: "Milky Way Expedition",
    tourNext: "Next Destination",
    tourPrev: "Previous",
    tourFinish: "Complete Tour",
    tourStepCount: "Stop {current} of {total}",
    
    // Credits modal
    creditsTitle: "Data Sources & Acknowledgments",
    close: "Close",

    // Cosmic Guide & 3D Explorer
    btnCosmicGuide: "Universe Menu",
    btnMenuBar: "Menu",
    cosmicGuideTitle: "Cosmic Guide & 3D Planetary Explorer",
    cosmicGuideSubtitle: "Discover the Milky Way, Solar System, and planetary worlds in realistic 3D space",
    tabMilkyWay: "The Milky Way",
    tabSolarSystem: "The Solar System",
    tabPlanets: "Planets & Worlds (3D)",
    milkyWayBadge: "Barred Spiral Galaxy • SBbc",
    milkyWayDescTitle: "What is the Milky Way?",
    milkyWayDesc1: "The Milky Way is our cosmic home—a vast barred spiral galaxy containing 100 to 400 billion stars and over 100 billion planets. Spanning approximately 100,000 light-years in diameter, its luminous spiral arms are woven with nebulae, star clusters, and deep cosmic dust lanes.",
    milkyWayDesc2: "At the galactic center lies Sagittarius A*, a supermassive black hole with a mass 4.15 million times our Sun. Our Solar System is situated in the Orion Spur ~26,000 light-years from the core, orbiting at 828,000 km/h and taking 230 million years to complete one Galactic Year.",
    mwMetricDiam: "100,000 light-years",
    mwMetricStars: "100-400 Billion Stars",
    mwMetricMass: "1.5 Trillion M☉",
    mwMetricCore: "Sagittarius A* (4.15M M☉)",
    btnFlyMilkyWay: "🌌 Explore Milky Way in 3D",

    solarSystemBadge: "Gravitationally Bound Star System • Age 4.6 Gyr",
    solarSystemDescTitle: "What is the Solar System?",
    solarSystemDesc1: "Formed 4.6 billion years ago from the gravitational collapse of a giant interstellar cloud, our Solar System comprises our host star—the Sun—and every celestial body bound by its gravity. The Sun contains 99.86% of the system's total mass, fueling planetary climates and orbital mechanics.",
    solarSystemDesc2: "The system is divided into four inner rocky terrestrial planets (Mercury, Venus, Earth, Mars), the Asteroid Belt, two gas giants (Jupiter, Saturn), and two ice giants (Uranus, Neptune). All major planets orbit counterclockwise in the flat ecliptic plane, surrounded by hundreds of moons, rings, and comets.",
    ssMetricAge: "4.57 Billion Years",
    ssMetricStar: "The Sun (G2V Yellow Dwarf)",
    ssMetricPlanets: "8 Major Worlds (290+ Moons)",
    ssMetricSpeed: "828,000 km/h Orbital Speed",
    btnNavSolarSystem: "🚀 Navigate to Solar System in 3D",

    planetsGalleryTitle: "Planetary Worlds & Celestial Bodies",
    planetsGallerySubtitle: "Select any celestial body to inspect in 3D, view authentic NASA photography, and rotate 360°:",
    btnFlyPlanet3D: "🔭 Inspect & Rotate in 3D",
    realSpacePhoto: "Official NASA Photography",

    // Solar System Guided Tour Dashboard (Screenshot 1)
    tourBadge: "GUIDED TOUR",
    tourMainHeadingPrefix: "Take a tour of the",
    tourMainHeadingAccent: "solar system",
    tourMainDesc: "Here, everything really moves: the planets orbit the Sun, each at its own pace. You can spin them around, get up close and read their fact sheet.",
    tourStatStar: "star, the Sun",
    tourStatPlanets: "planets",
    tourStatEarth: "Earth, our home",
    tourStickyNote: "Did you know? By plane, it would take almost 20 years to fly from Earth to the Sun!",
    tourStep1: "Swipe to turn in every direction",
    tourStep2: "Pinch (or scroll) to zoom",
    tourStep3: "Tap a planet to discover it",
    tourBtnStart: "Start the tour →",
    tourBtnSkip: "Explore Freely",

    // Top Celestial Navigation Bar (Screenshots 1 & 3)
    topSysTitle: "The Solar System",
    topSysSubtitle: "Simulated time: {time} Earth years • drag to turn in every direction • scroll / pinch to zoom • sizes and distances not to scale",
    
    // Bottom Controls & Insights
    bottomFact1: "💡 Sunlight takes more than 4 hours to reach Neptune.",
    bottomFact2: "💡 If the Sun were a basketball, Earth would be a peppercorn 26 meters away.",
    bottomFact3: "💡 A year on Mercury is only 88 Earth days long!",
    bottomFact4: "💡 Jupiter is so massive that all other planets in the Solar System could fit inside it.",
    bottomDaysPerSec: "days/s",
    bottomAccueil: "Home",
    bottomOrbits: "Orbits",
    bottomNames: "Names"
  },
  
  fr: {
    appTitle: "Explorateur de la Voie Lactée",
    subtitle: "Galaxie 3D, Systèmes Stellaires & Évolution Planétaire",
    disclaimer: "Tailles et distances non à l'échelle",
    youAreHere: "Vous êtes ici (Soleil)",
    searchPlaceholder: "Rechercher étoiles, planètes, lunes (ex. Terre, Lune, Jupiter, TRAPPIST-1)...",
    noResults: "Aucun astre trouvé",
    
    // Breadcrumbs
    crumbGalaxy: "Voie Lactée",
    crumbSolarSystem: "Système Solaire",
    
    // Toolbar buttons
    btnHome: "Vue Galaxie",
    btnZoomIn: "Zoomer",
    btnZoomOut: "Dézoomer",
    btnPlay: "Reprendre la simulation",
    btnPause: "Mettre en pause",
    btnOrbits: "Orbites",
    btnLabels: "Noms",
    btnHotspots: "Points 3D",
    btnTour: "Visite Guidée",
    btnExitTour: "Quitter la Visite",
    btnSound: "Son",
    btnCredits: "Sources & Crédits",
    
    // Detail sheet tabs
    tabOverview: "Aperçu",
    tabFormation: "Formation",
    tabStructure: "Structure",
    tabMoons: "Lunes",
    tabSpecs: "Données",
    tabFacts: "Faits Fascinants",
    
    // Formation & Structure Titles
    formationTitle: "Origine Cosmique & Histoire d'Accrétion",
    interiorTitle: "Couches Internes & Cœur",
    atmoTitle: "Atmosphère & Pression en Surface",
    viewMoon: "Explorer en 3D",
    
    // Metric keys
    type: "Classification de l'Astre",
    radius: "Rayon Équatorial",
    distFromSun: "Distance du Soleil",
    distFromStar: "Distance de l'Étoile",
    orbitalPeriod: "Période Orbitale",
    rotationPeriod: "Période de Rotation",
    axialTilt: "Inclinaison de l'Axe",
    moons: "Lunes Confirmées",
    temperature: "Température de Surface",
    spectralType: "Type Spectral",
    discoveryYear: "Année de Découverte",
    discoveryMethod: "Méthode de Détection",
    habitableZone: "Candidate Zone Habitable",
    habitableYes: "Oui (Potentiel d'eau liquide tempérée)",
    habitableNo: "Non (Hors zone habitable)",
    rotationsCompleted: "Rotations effectuées",
    orbitsCompleted: "Orbites effectuées",
    orbitalSpeed: "Vitesse orbitale",
    eccentricity: "Excentricité Orbitale (e)",
    inclination: "Inclinaison Orbitale (i)",
    provenanceMeasured: "Mesuré par la NASA",
    provenanceDerived: "Dérivé de Kepler",
    provenanceIllustrative: "Échelle Illustrative",
    provenanceSourceNasa: "Source : Fiche Planétaire NASA GSFC",
    provenanceSourceArchive: "Source : Archives Exoplanètes NASA",
    provenanceSourceModel: "Source : Modèle Astrodynamique de Kepler",
    
    // Time Simulator
    epochText: "Époque : +{years} Ans, {months} Mois, {days} Jours ({hours}h)",
    planetTrackingText: "{name} : {rotations} Rotations ({hoursTotal}h) • {orbits} Orbites",
    jumpHour: "+1 H",
    jumpDay: "+1 Jour",
    jumpMonth: "+1 Mois",
    jumpYear: "+1 An",
    jumpDecade: "+Décennie (10 ans)",
    jumpCentury: "+Siècle (100 ans)",
    jumpCustom: "⚙️ Personnalisé",
    resetTime: "Réinitialiser",
    
    // Custom Time Jump Panel
    customTimeTitle: "Saut Temporel Personnalisé",
    customAmount: "Quantité :",
    customUnitHours: "Heures",
    customUnitDays: "Jours",
    customUnitMonths: "Mois (~30,4j)",
    customUnitYears: "Ans (365,25j)",
    customUnitDecades: "Décennies (10 ans)",
    customUnitCenturies: "Siècles (100 ans)",
    customQuickPick: "Rapide :",
    customAdvance: "Avancer le temps",
    customToast: "Avancé de {amount} {unit} : La Terre effectue {earthOrbits} orbites et {earthRotations} rotations • Mercure effectue {mercOrbits} orbites.",
    customToastSelected: "Avancé de {amount} {unit} : {name} effectue {orbits} orbites et {rotations} rotations.",
    timeBannerTip: "Sélectionnez un incrément temporel (+1 H, +1 Jour, +1 Mois, +1 An, +Décennie, +Siècle, ou Personnalisé) pour observer les orbites réelles !",
    
    // Time leap explanation toasts
    leapHour: "Avance de 1 Heure : La Terre tourne de 15,0° • La Lune avance de 0,55° sur son orbite.",
    leapDay: "Avance de 1 Jour : La Terre effectue 1,00 rotation axiale complète (24h) • Parcourt 2,57M km sur son orbite.",
    leapMonth: "Avance de 1 Mois (30,4j) : La Lune boucle 1 révolution (27,3j) • La Terre couvre 30,0° d'orbite • Mercure boucle 1/3 de son année.",
    leapYear: "Avance de 1 An (365,25j) : La Terre boucle 1 orbite complète et 365,25 rotations axiales • Mercure boucle 4,15 orbites • Mars 0,53 orbites.",
    leapDecade: "Avance de 1 Décennie (10 Ans) : La Terre boucle 10 orbites • Jupiter 0,84 orbite • Saturne 0,34 orbite.",
    leapCentury: "Avance de 1 Siècle (100 Ans) : La Terre boucle 100 orbites • Uranus 1,19 orbite • Neptune 0,61 orbite • Le Soleil dérive de 725 000 km dans la galaxie.",
    leapReset: "Réinitialisation de la simulation à l'époque initiale (T+0).",
    
    // Footer
    footerTitle: "Explorateur de la Voie Lactée 3D",
    footerData: "Données : Archives Exoplanétaires de la NASA & Goddard",
    footerAttribution: "Développé avec Three.js & Vite • 60 FPS WebGL",
    
    // Units
    km: "km",
    au: "UA",
    days: "jours",
    hours: "heures",
    deg: "°",
    lightYears: "années-lumière",
    earthRadii: "Rayons terrestres (R⊕)",
    solarRadii: "Rayons solaires (R☉)",
    
    // Tour steps
    tourTitle: "Expédition Voie Lactée",
    tourNext: "Étape Suivante",
    tourPrev: "Précédent",
    tourFinish: "Terminer la Visite",
    tourStepCount: "Étape {current} sur {total}",
    
    // Credits modal
    creditsTitle: "Sources de Données & Remerciements",
    close: "Fermer",

    // Cosmic Guide & 3D Explorer
    btnCosmicGuide: "Menu Univers",
    btnMenuBar: "Menu",
    cosmicGuideTitle: "Guide Cosmique & Explorateur Planétaire 3D",
    cosmicGuideSubtitle: "Découvrez la Voie Lactée, le Système Solaire et les mondes planétaires dans un espace 3D réaliste",
    tabMilkyWay: "La Voie Lactée",
    tabSolarSystem: "Le Système Solaire",
    tabPlanets: "Planètes & Mondes (3D)",
    milkyWayBadge: "Galaxie Spirale Barrée • SBbc",
    milkyWayDescTitle: "Qu'est-ce que la Voie Lactée ?",
    milkyWayDesc1: "La Voie Lactée est notre berceau galactique : une gigantesque galaxie spirale barrée abritant 100 à 400 milliards d'étoiles et plus de 100 milliards de planètes. S'étendant sur environ 100 000 années-lumière de diamètre, ses bras spiraux sont parsemés de nébuleuses brillantes et de couloirs de poussière interstellaire.",
    milkyWayDesc2: "Au centre galactique réside Sagittarius A*, un trou noir supermassif de 4,15 millions de masses solaires. Notre Système Solaire est situé dans le Bras d'Orion à ~26 000 années-lumière du centre, voyageant à 828 000 km/h et effectuant une révolution tous les 230 millions d'années (une Année Cosmique).",
    mwMetricDiam: "100 000 années-lumière",
    mwMetricStars: "100-400 Milliards d'étoiles",
    mwMetricMass: "1,5 Billion M☉",
    mwMetricCore: "Sagittarius A* (4,15M M☉)",
    btnFlyMilkyWay: "🌌 Explorer la Voie Lactée en 3D",

    solarSystemBadge: "Système Stellaire Lié par Gravité • Âge 4,6 Ga",
    solarSystemDescTitle: "Qu'est-ce que le Système Solaire ?",
    solarSystemDesc1: "Né il y a 4,6 milliards d'années de l'effondrement gravitationnel d'un nuage moléculaire interstellaire géant, notre Système Solaire comprend notre étoile hôte — le Soleil — et tout ce qui est lié à sa gravité. Le Soleil concentre 99,86 % de toute la masse du système.",
    solarSystemDesc2: "Le système regroupe quatre planètes rocheuses telluriques internes (Mercure, Vénus, Terre, Mars), la Ceinture d'Astéroïdes, deux géantes gazeuses (Jupiter, Saturne) et deux géantes de glace (Uranus, Neptune). Toutes les planètes gravitent dans le plan de l'écliptique avec des centaines de lunes, anneaux et comètes.",
    ssMetricAge: "4,57 Milliards d'Années",
    ssMetricStar: "Le Soleil (Naine Jaune G2V)",
    ssMetricPlanets: "8 Planètes Majeures (290+ Lunes)",
    ssMetricSpeed: "828 000 km/h Vitesse Orbitale",
    btnNavSolarSystem: "🚀 Naviguer vers le Système Solaire en 3D",

    planetsGalleryTitle: "Mondes Planétaires & Astres du Système",
    planetsGallerySubtitle: "Sélectionnez un astre pour l'observer en 3D, inspecter les photographies réelles de la NASA et pivoter à 360° :",
    btnFlyPlanet3D: "🔭 Observer & Pivoter en 3D",
    realSpacePhoto: "Photographie Réelle NASA",

    // Solar System Guided Tour Dashboard (Screenshot 1)
    tourBadge: "VISITE GUIDÉE",
    tourMainHeadingPrefix: "Faites le tour du",
    tourMainHeadingAccent: "système solaire",
    tourMainDesc: "Ici, tout bouge vraiment : les planètes tournent autour du Soleil, chacune à son rythme. Vous pouvez les faire pivoter, vous en approcher et lire leur fiche descriptive.",
    tourStatStar: "étoile, le Soleil",
    tourStatPlanets: "planètes",
    tourStatEarth: "Terre, notre maison",
    tourStickyNote: "Le saviez-vous ? En avion, il faudrait près de 20 ans pour voler de la Terre au Soleil !",
    tourStep1: "Glisse pour tourner dans tous les sens",
    tourStep2: "Pince (ou molette) pour zoomer",
    tourStep3: "Touche une planète pour la découvrir",
    tourBtnStart: "Démarrer la visite →",
    tourBtnSkip: "Explorer Librement",

    // Top Celestial Navigation Bar (Screenshots 1 & 3)
    topSysTitle: "Le système solaire",
    topSysSubtitle: "Temps simulé : {time} années terrestres • glisse pour tourner dans tous les sens • molette / pincement : zoom • tailles et distances non à l'échelle",

    // Bottom Controls & Insights
    bottomFact1: "💡 La lumière du Soleil met plus de 4 heures pour atteindre Neptune.",
    bottomFact2: "💡 Si le Soleil était un ballon de basket, la Terre serait un grain de poivre à 26 mètres.",
    bottomFact3: "💡 Une année sur Mercure ne dure que 88 jours terrestres !",
    bottomFact4: "💡 Jupiter est si massive que toutes les autres planètes réunies pourraient y entrer.",
    bottomDaysPerSec: "jours/s",
    bottomAccueil: "Accueil",
    bottomOrbits: "Orbites",
    bottomNames: "Noms"
  }
};

export class I18nManager {
  constructor(initialLang = 'en') {
    this.currentLang = initialLang;
    this.listeners = [];
  }

  get lang() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'fr') return;
    this.currentLang = lang;
    this.listeners.forEach(fn => fn(this.currentLang));
  }

  t(key, params = {}) {
    let str = translations[this.currentLang]?.[key] || translations['en']?.[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, v);
    }
    return str;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }
}

export const i18n = new I18nManager('en');
