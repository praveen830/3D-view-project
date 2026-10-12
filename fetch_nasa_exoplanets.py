#!/usr/bin/env python3
"""
Milky Way Explorer - NASA Exoplanet Archive TAP Query & Processor
Fetches confirmed exoplanet data directly from the NASA Exoplanet Archive (IPAC/Caltech),
filters and ranks the top 100 most interesting star systems, converts celestial
coordinates (RA/DEC/Distance) into 3D Cartesian coordinates (light-years),
maps stellar temperatures to realistic astronomical colors, and outputs `systems.json`.
"""

import os
import math
import json
import requests
import pandas as pd

# 1. Exact NASA Exoplanet Archive TAP Query
TAP_ENDPOINT = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

TAP_QUERY = """
SELECT 
    pl_name, 
    hostname, 
    sy_dist, 
    ra, 
    dec, 
    pl_rade, 
    pl_orbsmax, 
    pl_orbper, 
    st_teff, 
    st_rad, 
    st_spectype, 
    disc_year, 
    discoverymethod 
FROM ps 
WHERE default_flag = 1 
  AND ra IS NOT NULL 
  AND dec IS NOT NULL
"""

# Famous curated landmarks to guarantee in the Milky Way Explorer
KNOWN_SYSTEM_FIXES = {
    "TRAPPIST-1": {
        "dist_ly": 40.66,
        "ra": 346.622,
        "dec": -5.041,
        "st_teff": 2566,
        "st_rad": 0.121,
        "st_spectype": "M8V",
        "displayName": "TRAPPIST-1"
    },
    "Proxima Cen": {
        "displayName": "Proxima Centauri",
        "dist_ly": 4.246,
        "ra": 217.4289,
        "dec": -62.6795,
        "st_teff": 3042,
        "st_rad": 0.154,
        "st_spectype": "M5.5V"
    },
    "KOI-351": {
        "displayName": "Kepler-90 (KOI-351)",
        "dist_ly": 2840.0,
        "ra": 284.4335,
        "dec": 49.3051,
        "st_teff": 6080,
        "st_rad": 1.2,
        "st_spectype": "G0V"
    },
    "Kepler-452": {
        "displayName": "Kepler-452",
        "dist_ly": 1799.5,
        "ra": 296.0097,
        "dec": 44.2774,
        "st_teff": 5757,
        "st_rad": 1.11,
        "st_spectype": "G2V"
    },
    "Alpha Centauri": {
        "displayName": "Alpha Centauri",
        "dist_ly": 4.37,
        "ra": 219.902,
        "dec": -60.834,
        "st_teff": 5790,
        "st_rad": 1.22,
        "st_spectype": "G2V + K1V"
    },
    "Barnard's Star": {
        "displayName": "Barnard's Star",
        "dist_ly": 5.96,
        "ra": 269.452,
        "dec": 4.693,
        "st_teff": 3134,
        "st_rad": 0.196,
        "st_spectype": "M4.0V"
    },
    "Sirius": {
        "displayName": "Sirius",
        "dist_ly": 8.60,
        "ra": 101.287,
        "dec": -16.716,
        "st_teff": 9940,
        "st_rad": 1.71,
        "st_spectype": "A1V"
    },
    "Vega": {
        "displayName": "Vega",
        "dist_ly": 25.04,
        "ra": 279.234,
        "dec": 38.783,
        "st_teff": 9602,
        "st_rad": 2.36,
        "st_spectype": "A0V"
    },
    "Betelgeuse": {
        "displayName": "Betelgeuse",
        "dist_ly": 642.5,
        "ra": 88.793,
        "dec": 7.407,
        "st_teff": 3500,
        "st_rad": 764.0,
        "st_spectype": "M1-M2Ia"
    },
    "Rigel": {
        "displayName": "Rigel",
        "dist_ly": 863.0,
        "ra": 78.634,
        "dec": -8.201,
        "st_teff": 12100,
        "st_rad": 78.9,
        "st_spectype": "B8Ia"
    },
    "Polaris": {
        "displayName": "Polaris",
        "dist_ly": 433.0,
        "ra": 37.954,
        "dec": 89.264,
        "st_teff": 6015,
        "st_rad": 37.5,
        "st_spectype": "F7Ib"
    }
}

FAMOUS_SYSTEMS = [
    "Proxima", "Alpha Centauri", "TRAPPIST-1", "Kepler-452", 
    "Kepler-186", "Kepler-90", "KOI-351", "55 Cnc", "Barnard", 
    "Sirius", "Vega", "Betelgeuse", "Rigel", "Polaris", "HD 189733", 
    "HD 209458", "WASP-12", "WASP-76", "Kepler-16", "LHS 1140", 
    "TOI-700", "Kepler-22", "Kepler-62", "Gliese 667 C", "Ross 128", 
    "Tau Ceti", "Epsilon Eridani", "K2-18", "51 Peg", "Wolf 1061", 
    "Teegarden's Star", "HR 8799", "Beta Pictoris", "Fomalhaut", 
    "Gliese 581", "Gliese 436", "HD 10180", "Kepler-11", "Kepler-20", 
    "Kepler-80", "HD 219134"
]

def map_temp_to_color(teff, spectype=""):
    """Maps stellar temperature (Kelvin) to realistic color hex & spectral class."""
    if pd.isna(teff) or teff <= 0:
        spec = str(spectype).strip().upper() if pd.notna(spectype) else ""
        if spec.startswith('O'): return "#6CA0DC", "O"
        if spec.startswith('B'): return "#9DB4FF", "B"
        if spec.startswith('A'): return "#BBCCFF", "A"
        if spec.startswith('F'): return "#F8F9FA", "F"
        if spec.startswith('G'): return "#FFD700", "G"
        if spec.startswith('K'): return "#FF9E40", "K"
        if spec.startswith('M'): return "#FF5533", "M"
        return "#FFD700", "G"

    if teff >= 30000:
        return "#6CA0DC", "O"    # Deep Blue
    elif teff >= 10000:
        return "#9DB4FF", "B"    # Blue-White
    elif teff >= 7500:
        return "#D5E0FF", "A"    # White
    elif teff >= 6000:
        return "#F8F9FA", "F"    # Yellow-White
    elif teff >= 5200:
        return "#FFD700", "G"    # Yellow (Sun-like)
    elif teff >= 3700:
        return "#FF9E40", "K"    # Orange
    elif teff >= 2400:
        return "#FF5533", "M"    # Red (Red Dwarf)
    else:
        return "#C83232", "L/T"  # Deep Crimson / Brown Dwarf

def is_habitable_zone(pl_rade, pl_orbsmax, st_teff):
    """Detects potentially habitable rocky planets."""
    if pd.isna(pl_rade) or pl_rade < 0.5 or pl_rade > 2.0:
        return False
    if pd.isna(pl_orbsmax) or pl_orbsmax <= 0:
        return False
    teff = st_teff if (pd.notna(st_teff) and st_teff > 0) else 5778
    rel_lum = (teff / 5778.0) ** 4
    hz_inner = 0.70 * math.sqrt(rel_lum)
    hz_outer = 1.80 * math.sqrt(rel_lum)
    return hz_inner <= pl_orbsmax <= hz_outer

def get_planet_color(pl_rade, pl_orbsmax, is_hz):
    """Assigns procedural display color to exoplanets based on physics."""
    if is_hz:
        return "#3D9BE9" # Ocean / Earth-like blue
    if pd.isna(pl_rade):
        return "#BDC3C7"
    if pl_rade > 6.0:
        return "#F39C12" if (pd.isna(pl_orbsmax) or pl_orbsmax > 0.1) else "#E67E22"
    elif pl_rade > 2.0:
        return "#00CEC9" # Cyan ice world
    elif pl_rade > 1.25:
        return "#9B59B6" # Super-Earth
    else:
        return "#E74C3C" if (pd.notna(pl_orbsmax) and pl_orbsmax < 0.05) else "#95A5A6"

def score_system(hostname, dist_ly, planet_rows, st_teff):
    n_planets = len(planet_rows)
    score = 0.0
    
    # Planet count weighting
    score += (n_planets ** 2.2) * 15.0
    
    # Proximity weighting
    if dist_ly < 20:
        score += 200.0 / (dist_ly + 1.0)
    elif dist_ly < 100:
        score += 100.0 / (dist_ly ** 0.5)
    elif dist_ly < 500:
        score += 40.0 / (dist_ly ** 0.5)
    else:
        score += 5.0
        
    # Habitable zone weighting
    for p in planet_rows:
        if is_habitable_zone(p.get('pl_rade'), p.get('pl_orbsmax'), st_teff):
            score += 40.0
            
    # Famous system bonus
    for famous in FAMOUS_SYSTEMS:
        if famous.lower() in hostname.lower() or hostname.lower() in famous.lower():
            score += 1500.0
            break
            
    return score

def fetch_and_process_systems():
    print("=" * 60)
    print("Fetching confirmed exoplanets from NASA TAP endpoint...")
    params = {'query': TAP_QUERY, 'format': 'json'}
    response = requests.get(TAP_ENDPOINT, params=params, timeout=45)
    response.raise_for_status()
    raw_planets = response.json()
    print(f"Downloaded {len(raw_planets)} confirmed planet records from NASA!")

    df = pd.DataFrame(raw_planets)

    # Load famous descriptions
    famous_desc_path = os.path.join(os.path.dirname(__file__), "src", "data", "famous-descriptions.json")
    famous_descriptions = {}
    if os.path.exists(famous_desc_path):
        try:
            with open(famous_desc_path, "r", encoding="utf-8") as f:
                famous_descriptions = json.load(f).get("systems", {})
        except Exception:
            pass

    grouped = df.groupby('hostname')
    system_candidates = []

    for hostname, group in grouped:
        first_row = group.iloc[0]
        fix = KNOWN_SYSTEM_FIXES.get(hostname, {})

        # Determine distance in light-years
        if "dist_ly" in fix:
            dist_ly = fix["dist_ly"]
        elif pd.notna(first_row.get('sy_dist')):
            dist_ly = float(first_row['sy_dist']) * 3.2615638
        else:
            # Check other rows in the group for distance
            dists = [float(r['sy_dist']) for _, r in group.iterrows() if pd.notna(r.get('sy_dist'))]
            dist_ly = (dists[0] * 3.2615638) if dists else 100.0

        ra_deg = fix.get("ra", float(first_row['ra']) if pd.notna(first_row['ra']) else 0.0)
        dec_deg = fix.get("dec", float(first_row['dec']) if pd.notna(first_row['dec']) else 0.0)
        st_teff = fix.get("st_teff", float(first_row['st_teff']) if pd.notna(first_row['st_teff']) else None)

        ra_rad = math.radians(ra_deg)
        dec_rad = math.radians(dec_deg)
        
        # 3D Cartesian coordinates (light-years), Sun at (0, 0, 0)
        x_ly = dist_ly * math.cos(dec_rad) * math.cos(ra_rad)
        y_ly = dist_ly * math.cos(dec_rad) * math.sin(ra_rad)
        z_ly = dist_ly * math.sin(dec_rad)

        planet_list = group.to_dict('records')
        score = score_system(hostname, dist_ly, planet_list, st_teff)

        system_candidates.append({
            'hostname': hostname,
            'displayName': fix.get("displayName", hostname),
            'first_row': first_row,
            'fix': fix,
            'planet_list': planet_list,
            'dist_ly': dist_ly,
            'ra_deg': ra_deg,
            'dec_deg': dec_deg,
            'x_ly': round(x_ly, 3),
            'y_ly': round(y_ly, 3),
            'z_ly': round(z_ly, 3),
            'score': score
        })

    # Add standalone famous landmark stars if not in exoplanet DB
    for star_name, fix in KNOWN_SYSTEM_FIXES.items():
        if not any(c['displayName'] == fix.get('displayName', star_name) or c['hostname'] == star_name for c in system_candidates):
            ra_rad = math.radians(fix['ra'])
            dec_rad = math.radians(fix['dec'])
            x_ly = fix['dist_ly'] * math.cos(dec_rad) * math.cos(ra_rad)
            y_ly = fix['dist_ly'] * math.cos(dec_rad) * math.sin(ra_rad)
            z_ly = fix['dist_ly'] * math.sin(dec_rad)
            system_candidates.append({
                'hostname': star_name,
                'displayName': fix.get('displayName', star_name),
                'first_row': {},
                'fix': fix,
                'planet_list': [],
                'dist_ly': fix['dist_ly'],
                'ra_deg': fix['ra'],
                'dec_deg': fix['dec'],
                'x_ly': round(x_ly, 3),
                'y_ly': round(y_ly, 3),
                'z_ly': round(z_ly, 3),
                'score': 5000.0
            })
        else:
            # Boost the existing one
            for c in system_candidates:
                if c['displayName'] == fix.get('displayName', star_name) or c['hostname'] == star_name:
                    c['score'] += 5000.0

    # Sort and pick top 100 systems
    system_candidates.sort(key=lambda s: s['score'], reverse=True)
    top_candidates = system_candidates[:100]

    final_systems = []

    # 1. Solar System at origin
    final_systems.append({
        "id": "solar-system",
        "name": { "en": "Solar System", "fr": "Système Solaire" },
        "hostname": "The Sun",
        "isSolarSystem": True,
        "dist_ly": 0.0,
        "ra": 0.0,
        "dec": 0.0,
        "coords_ly": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "star": {
            "name": { "en": "The Sun", "fr": "Le Soleil" },
            "spectralType": "G2V",
            "temperatureK": 5778,
            "radiusSolar": 1.0,
            "colorHex": "#FFA500",
            "class": "G"
        },
        "planetCount": 8,
        "description": {
            "en": "Our home star system in the Orion Arm of the Milky Way, hosting 8 major planets, Pluto, and humanity.",
            "fr": "Notre système stellaire natal dans le bras d'Orion de la Voie Lactée, abritant 8 planètes majeures, Pluton et l'humanité."
        },
        "hasHabitablePlanet": True,
        "planetsSummary": ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
    })

    # 2. Exoplanet systems
    for cand in top_candidates:
        first = cand['first_row']
        fix = cand['fix']
        hostname = cand['hostname']
        display_name = cand['displayName']

        st_teff = fix.get('st_teff', float(first['st_teff']) if pd.notna(first.get('st_teff')) else None)
        st_rad = fix.get('st_rad', float(first['st_rad']) if pd.notna(first.get('st_rad')) else 1.0)
        spectype = fix.get('st_spectype', str(first.get('st_spectype')).strip() if pd.notna(first.get('st_spectype')) else "")
        color_hex, stellar_class = map_temp_to_color(st_teff, spectype)

        # Match famous description
        matched_desc = None
        for key, val in famous_descriptions.items():
            if key.lower() in display_name.lower() or display_name.lower() in key.lower():
                matched_desc = val
                break
        
        if not matched_desc:
            p_len = len(cand['planet_list'])
            matched_desc = {
                "en": f"A {stellar_class}-type star system located {round(cand['dist_ly'], 1)} light-years away with {p_len} confirmed planet(s).",
                "fr": f"Un système stellaire de classe {stellar_class} situé à {round(cand['dist_ly'], 1)} années-lumière avec {p_len} planète(s) confirmée(s)."
            }

        planets = []
        has_hz = False
        sorted_planets = sorted(cand['planet_list'], key=lambda p: float(p['pl_orbsmax']) if pd.notna(p.get('pl_orbsmax')) else (float(p['pl_orbper']) if pd.notna(p.get('pl_orbper')) else 999))
        
        for p in sorted_planets:
            pl_rade = float(p['pl_rade']) if pd.notna(p.get('pl_rade')) else None
            pl_orbsmax = float(p['pl_orbsmax']) if pd.notna(p.get('pl_orbsmax')) else None
            pl_orbper = float(p['pl_orbper']) if pd.notna(p.get('pl_orbper')) else None
            hz = is_habitable_zone(pl_rade, pl_orbsmax, st_teff)
            if hz:
                has_hz = True
            
            p_color = get_planet_color(pl_rade, pl_orbsmax, hz)
            
            if pl_orbsmax is None and pl_orbper is not None:
                m_star = st_rad if st_rad else 1.0
                pl_orbsmax = round(((pl_orbper / 365.25) ** 2 * m_star) ** (1/3), 4)

            planets.append({
                "name": str(p['pl_name']),
                "radiusEarth": round(pl_rade, 2) if pl_rade else None,
                "semiMajorAxisAU": round(pl_orbsmax, 4) if pl_orbsmax else None,
                "orbitalPeriodDays": round(pl_orbper, 3) if pl_orbper else None,
                "discoveryYear": int(p['disc_year']) if pd.notna(p.get('disc_year')) else None,
                "discoveryMethod": str(p['discoverymethod']) if pd.notna(p.get('discoverymethod')) else "Transit",
                "isHabitableZone": hz,
                "colorHex": p_color
            })

        system_id = display_name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("+", "plus").replace("/", "-")
        final_systems.append({
            "id": system_id,
            "name": { "en": display_name, "fr": display_name },
            "hostname": display_name,
            "isSolarSystem": False,
            "dist_ly": round(cand['dist_ly'], 2),
            "ra": round(cand['ra_deg'], 4),
            "dec": round(cand['dec_deg'], 4),
            "coords_ly": {
                "x": cand['x_ly'],
                "y": cand['y_ly'],
                "z": cand['z_ly']
            },
            "star": {
                "name": { "en": display_name, "fr": display_name },
                "spectralType": spectype if spectype else f"{stellar_class} V",
                "temperatureK": int(st_teff) if st_teff else None,
                "radiusSolar": round(st_rad, 2) if st_rad else 1.0,
                "colorHex": color_hex,
                "class": stellar_class
            },
            "planetCount": len(planets),
            "description": matched_desc,
            "hasHabitablePlanet": has_hz,
            "planets": planets
        })

    out_file = os.path.join(os.path.dirname(__file__), "src", "data", "systems.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(final_systems, f, indent=2, ensure_ascii=False)

    print(f"Successfully exported {len(final_systems)} star systems to {out_file}!")

if __name__ == "__main__":
    fetch_and_process_systems()
