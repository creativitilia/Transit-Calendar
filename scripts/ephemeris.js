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
 * Calculate planet ecliptic longitude
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
    // MakeTime expects a JavaScript Date object directly
    const astroTime = window.Astronomy.MakeTime(date);
    
    // Get ecliptic coordinates
    const ecliptic = window.Astronomy. Ecliptic(bodyName, astroTime);
    
    // ecliptic. elon is ecliptic longitude (0-360)
    let longitude = ecliptic.elon;
    
    // Normalize to 0-360
    longitude = ((longitude % 360) + 360) % 360;
    
    // Convert to zodiac position
    const zodiacPos = toZodiacPosition(longitude);
    
    return {
      ... zodiacPos,
      absoluteDegree: longitude
    };
    
  } catch (error) {
    console.error(`Error calculating ${bodyName}: `, error);
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
  
  // Standard formula for Ascendant (works for all house systems)
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  
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
  
  // Houses 1, 4, 7, 10 are the angles (fixed points)
  houses[0] = asc;                           // House 1 (Ascendant)
  houses[3] = (mc + 180) % 360;              // House 4 (IC - opposite of MC)
  houses[6] = (asc + 180) % 360;             // House 7 (Descendant - opposite of ASC)
  houses[9] = mc;                            // House 10 (Midheaven)
  
  // Check for extreme latitudes where Placidus fails
  if (Math.abs(latitude) > 66.5) {
    console.warn('⚠️ Extreme latitude detected.  Placidus may be inaccurate.  Using equal house divisions.');
    return calculateEqualHouses(asc, mc);
  }
  
  const latRad = latitude * Math. PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  const ramc = lst * 15; // Right Ascension of MC in degrees
  
  // Calculate houses 11, 12, 2, 3 using Placidus formula
  // These houses divide the semi-arc between MC and ASC
  
  for (let i = 0; i < 3; i++) {
    // Houses 11, 12 (between MC and ASC in the upper hemisphere)
    const fraction = (i + 1) / 3; // 1/3, 2/3, 3/3
    const houseRA = calculatePlacidusRA(ramc, fraction, latRad, oblRad, true);
    houses[10 + i] = raToEclipticLongitude(houseRA, oblRad);
    
    // Houses 2, 3 (between IC and DESC in the lower hemisphere)
    const houseRA2 = calculatePlacidusRA(ramc + 180, fraction, latRad, oblRad, false);
    houses[1 + i] = raToEclipticLongitude(houseRA2, oblRad);
  }
  
  // Houses 5, 6, 8, 9 are opposites of 11, 12, 2, 3
  houses[4] = (houses[10] + 180) % 360;  // House 5 (opposite of 11)
  houses[5] = (houses[11] + 180) % 360;  // House 6 (opposite of 12)
  houses[7] = (houses[1] + 180) % 360;   // House 8 (opposite of 2)
  houses[8] = (houses[2] + 180) % 360;   // House 9 (opposite of 3)
  
  return houses. map(h => ((h % 360) + 360) % 360);
}

/**
 * Calculate Placidus Right Ascension for intermediate houses
 * @param {number} ramcDeg - Right Ascension of MC in degrees
 * @param {number} fraction - Fraction of semi-arc (1/3, 2/3)
 * @param {number} latRad - Latitude in radians
 * @param {number} oblRad - Obliquity in radians
 * @param {boolean} isUpper - True for upper hemisphere (11,12), false for lower (2,3)
 * @returns {number} Right Ascension in degrees
 */
function calculatePlacidusRA(ramcDeg, fraction, latRad, oblRad, isUpper) {
  const ramcRad = ramcDeg * Math.PI / 180;
  
  // Calculate declination of MC
  const declMC = Math.asin(Math.sin(ramcRad) * Math.sin(oblRad));
  
  // Calculate semi-arc
  const cosH = -Math.tan(latRad) * Math.tan(declMC);
  
  // Check if the point is circumpolar or never rises
  if (cosH > 1 || cosH < -1) {
    // Fallback to equal division
    return ramcDeg + (fraction * 30);
  }
  
  const semiArc = Math.acos(cosH);
  const houseSemiArc = semiArc * fraction;
  
  // Calculate the RA of the house cusp
  let ra;
  if (isUpper) {
    ra = ramcRad + houseSemiArc;
  } else {
    ra = ramcRad - houseSemiArc;
  }
  
  return (ra * 180 / Math.PI) % 360;
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