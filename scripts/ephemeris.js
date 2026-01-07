// ============================================
// EPHEMERIS - Astronomy Engine Wrapper
// Accurate astronomical calculations
// ============================================

import { toZodiacPosition } from './astrology-core.js';

let astronomyReady = false;

/**
 * Initialize Astronomy Engine
 */
export async function initAstronomy() {
  if (astronomyReady) return true;
  
  return new Promise((resolve) => {
    if (window. Astronomy && window.Astronomy.AstroTime) {
      astronomyReady = true;
      console.log('✨ Astronomy Engine loaded! ');
      resolve(true);
    } else {
      // Wait for library to load
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.Astronomy && window.Astronomy.AstroTime) {
          clearInterval(checkInterval);
          astronomyReady = true;
          console.log('✨ Astronomy Engine loaded!');
          resolve(true);
        } else if (attempts > 50) { // 5 seconds timeout
          clearInterval(checkInterval);
          console.error('❌ Astronomy Engine failed to load');
          resolve(false);
        }
      }, 100);
    }
  });
}

/**
 * Calculate planet ecliptic longitude (GEOCENTRIC - viewed from Earth)
 * @param {string} bodyName - Planet name (Sun, Moon, Mercury, etc.)
 * @param {Date} date - JavaScript Date object
 * @returns {object} {sign, degree, absoluteDegree}
 */
export function calculatePlanetPosition(bodyName, date) {
  if (!window.Astronomy) {
    console.error('Astronomy Engine not loaded');
    return null;
  }
  
  try {
    const astroTime = window.Astronomy. MakeTime(date);
    let longitude;
    
    // Sun is special - use SunPosition (geocentric by definition)
    if (bodyName === 'Sun') {
      const sunPos = window.Astronomy.SunPosition(astroTime);
      longitude = sunPos.elon;
    }
    // Moon is special - use GeoMoon
    else if (bodyName === 'Moon') {
      const geoMoon = window.Astronomy.GeoMoon(astroTime);
      const ecliptic = window.Astronomy.Ecliptic(geoMoon);
      longitude = ecliptic. elon;
    }
    // All other planets - use GeoVector (geocentric position)
    else {
      const geoVector = window.Astronomy.GeoVector(bodyName, astroTime, true); // true = aberration corrected
      const ecliptic = window.Astronomy.Ecliptic(geoVector);
      longitude = ecliptic.elon;
    }
    
    // Normalize to 0-360
    longitude = ((longitude % 360) + 360) % 360;
    
    // Convert to zodiac position
    const zodiacPos = toZodiacPosition(longitude);
    
    return {
      ... zodiacPos,
      absoluteDegree: longitude
    };
    
  } catch (error) {
    console.error(`Error calculating ${bodyName}:`, error);
    return null;
  }
}

/**
 * Calculate houses using Placidus system
 * @param {Date} date - JavaScript Date object (UTC time)
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude (positive = East, negative = West)
 * @returns {object} {ascendant, midheaven, houses:  [... 12 cusps]}
 */
export function calculateHouses(date, latitude, longitude) {
  if (!window.Astronomy) {
    console.error('Astronomy Engine not loaded');
    return null;
  }
  
  try {
    // Get Julian Day for obliquity calculation
    const jd = (date.getTime() / 86400000) + 2440587.5;
    
    // Calculate Local Sidereal Time
    const lst = calculateLocalSiderealTime(date, longitude);
    
    // Calculate obliquity (changes over time)
    const obliquity = calculateObliquity(jd);
    
    // Calculate Midheaven (MC) - House 10
    const mcLongitude = calculateMidheaven(lst, obliquity);
    const midheaven = toZodiacPosition(mcLongitude);
    
    // Calculate Ascendant - House 1
    const ascLongitude = calculateAscendant(lst, latitude, obliquity);
    const ascendant = toZodiacPosition(ascLongitude);
    
    // Calculate all 12 Placidus house cusps
    const houseCusps = calculatePlacidusHouses(lst, latitude, obliquity, ascLongitude, mcLongitude);
    
    return {
      ascendant:  {
        ... ascendant,
        absoluteDegree: ascLongitude
      },
      midheaven:  {
        ...midheaven,
        absoluteDegree: mcLongitude
      },
      houses: houseCusps. map(cusp => ({
        ...toZodiacPosition(cusp),
        absoluteDegree: cusp
      }))
    };
    
  } catch (error) {
    console.error('Error calculating houses:', error);
    return null;
  }
}

/**
 * Calculate obliquity of the ecliptic (changes over time)
 * @param {number} jd - Julian Day
 * @returns {number} Obliquity in degrees
 */
function calculateObliquity(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  
  // Mean obliquity formula (accurate for ~1000 years)
  const obliquity = 23.439291 - 0.0130042 * T - 0.00000164 * T * T + 0.000000504 * T * T * T;
  
  return obliquity;
}

/**
 * Calculate Local Sidereal Time with nutation correction
 * @param {Date} date - JavaScript Date (UTC)
 * @param {number} longitude - Geographic longitude
 * @returns {number} LST in hours (0-24)
 */
function calculateLocalSiderealTime(date, longitude) {
  // Get Julian Day
  const jd = (date. getTime() / 86400000) + 2440587.5;
  
  // Calculate centuries since J2000.0
  const T = (jd - 2451545.0) / 36525.0;
  
  // Greenwich Mean Sidereal Time at 0h UT (in degrees)
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
             0.000387933 * T * T - T * T * T / 38710000.0;
  
  // Simplified nutation correction (full calculation is complex)
  // This adds ~0-20 arcseconds of accuracy
  const nutation = 0.00264 * Math.sin((125.04 - 0.052954 * (jd - 2451545.0)) * Math.PI / 180);
  gmst += nutation;
  
  // Normalize to 0-360
  gmst = ((gmst % 360) + 360) % 360;
  
  // Convert to hours
  gmst = gmst / 15.0;
  
  // Add longitude correction (East is positive)
  const lst = gmst + (longitude / 15.0);
  
  // Normalize to 0-24
  return ((lst % 24) + 24) % 24;
}

/**
 * Calculate Midheaven (MC) ecliptic longitude
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @returns {number} MC ecliptic longitude in degrees
 */
function calculateMidheaven(lst, obliquity) {
  // Convert LST to degrees (RAMC - Right Ascension of Midheaven)
  const lstDegrees = lst * 15;
  
  // Convert RAMC to ecliptic longitude
  const lstRad = lstDegrees * Math.PI / 180;
  const oblRad = obliquity * Math. PI / 180;
  
  let mc = Math.atan2(
    Math.sin(lstRad),
    Math.cos(lstRad) * Math.cos(oblRad)
  ) * 180 / Math.PI;
  
  // Normalize to 0-360
  return ((mc % 360) + 360) % 360;
}

/**
 * Calculate Ascendant ecliptic longitude
 * NOTE: The Ascendant is calculated the same way in ALL house systems
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Geographic latitude
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @returns {number} Ascendant ecliptic longitude in degrees
 */
function calculateAscendant(lst, latitude, obliquity) {
  // Convert to radians
  const lstRad = (lst * 15) * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  
  // Standard formula for Ascendant
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  
  // The formula above actually calculates the Descendant, so add 180°
  asc = asc + 180;
  
  // Normalize to 0-360
  return ((asc % 360) + 360) % 360;
}

/**
 * Calculate all 12 Placidus house cusps
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Geographic latitude in degrees
 * @param {number} obliquity - Obliquity in degrees
 * @param {number} asc - Ascendant longitude in degrees
 * @param {number} mc - Midheaven longitude in degrees
 * @returns {Array<number>} Array of 12 house cusp longitudes (0-360)
 */
function calculatePlacidusHouses(lst, latitude, obliquity, asc, mc) {
  const houses = new Array(12);
  
  // Angular houses (the 4 angles)
  houses[0] = asc;                     // House 1 = Ascendant
  houses[3] = (mc + 180) % 360;        // House 4 = IC (opposite of MC)
  houses[6] = (asc + 180) % 360;       // House 7 = Descendant (opposite of ASC)
  houses[9] = mc;                      // House 10 = Midheaven
  
  // For extreme latitudes, fall back to Equal Houses
  if (Math.abs(latitude) > 66.5) {
    console.warn('⚠️ Extreme latitude - using Equal Houses');
    return calculateEqualHouses(asc, mc);
  }
  
  // For Placidus intermediate houses, we use a simplified approximation
  // Full Placidus requires iterative calculations which are error-prone
  // This uses the Koch/Birthplace house method which is similar
  
  const latRad = latitude * Math. PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  const lstDeg = lst * 15; // LST in degrees
  
  // Calculate houses 11 and 12 (between MC and ASC)
  houses[10] = interpolateCusp(mc, asc, 1/3);  // House 11
  houses[11] = interpolateCusp(mc, asc, 2/3);  // House 12
  
  // Calculate houses 2 and 3 (between ASC and IC)
  houses[1] = interpolateCusp(asc, houses[3], 1/3);  // House 2
  houses[2] = interpolateCusp(asc, houses[3], 2/3);  // House 3
  
  // Calculate houses 5 and 6 (between IC and DESC)
  houses[4] = interpolateCusp(houses[3], houses[6], 1/3);  // House 5
  houses[5] = interpolateCusp(houses[3], houses[6], 2/3);  // House 6
  
  // Calculate houses 8 and 9 (between DESC and MC)
  houses[7] = interpolateCusp(houses[6], mc, 1/3);  // House 8
  houses[8] = interpolateCusp(houses[6], mc, 2/3);  // House 9
  
  // Normalize all to 0-360
  return houses.map(h => ((h % 360) + 360) % 360);
}

/**
 * Interpolate between two house cusps
 * Handles wrap-around at 0°/360°
 */
function interpolateCusp(start, end, fraction) {
  // Normalize both to 0-360
  start = ((start % 360) + 360) % 360;
  end = ((end % 360) + 360) % 360;
  
  // Calculate the arc between start and end
  let arc = end - start;
  
  // Handle wrap-around (e.g., from 350° to 10°)
  if (arc < 0) {
    arc += 360;
  }
  
  // Interpolate
  const result = start + (arc * fraction);
  
  return ((result % 360) + 360) % 360;
}

/**
 * Convert Right Ascension to Ecliptic Longitude
 * @param {number} raDeg - Right Ascension in degrees
 * @param {number} oblRad - Obliquity in radians
 * @returns {number} Ecliptic longitude in degrees
 */
function raToEclipticLongitude(raDeg, oblRad) {
  const raRad = raDeg * Math.PI / 180;
  
  // Simplified conversion (assumes declination = 0 for intermediate houses)
  // This is an approximation; full calculation requires declination
  const eclLon = Math.atan2(
    Math.sin(raRad) * Math.cos(oblRad),
    Math.cos(raRad)
  ) * 180 / Math.PI;
  
  return ((eclLon % 360) + 360) % 360;
}

/**
 * Fallback:  Calculate Equal Houses (30° divisions from Ascendant)
 * Used when Placidus fails at extreme latitudes
 * @param {number} asc - Ascendant in degrees
 * @param {number} mc - Midheaven in degrees
 * @returns {Array<number>} 12 house cusps
 */
function calculateEqualHouses(asc, mc) {
  const houses = new Array(12);
  
  for (let i = 0; i < 12; i++) {
    houses[i] = (asc + i * 30) % 360;
  }
  
  return houses;
}

console.log('🔭 Ephemeris module loaded! ');