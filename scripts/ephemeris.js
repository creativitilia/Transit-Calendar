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
    if (window.Astronomy && window.Astronomy.AstroTime) {
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
    // Create AstroTime from Date components
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JS months are 0-indexed
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    
    // Create AstroTime object properly
    const astroTime = new window. Astronomy.AstroTime(
      new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    );
    
    // Get ecliptic coordinates
    const ecliptic = window.Astronomy.Ecliptic(bodyName, astroTime);
    
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
    console.error(`Error calculating ${bodyName}:`, error);
    return null;
  }
}

/**
 * Calculate houses using Placidus system
 * @param {Date} date - JavaScript Date object (local time)
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude (positive = East, negative = West)
 * @returns {object} {ascendant, midheaven}
 */
export function calculateHouses(date, latitude, longitude) {
  if (!window.Astronomy) {
    console.error('Astronomy Engine not loaded');
    return null;
  }
  
  try {
    // Calculate Local Sidereal Time
    const lst = calculateLocalSiderealTime(date, longitude);
    
    // Calculate Midheaven (MC)
    const mcLongitude = calculateMidheaven(lst);
    const midheaven = toZodiacPosition(mcLongitude);
    
    // Calculate Ascendant
    const ascLongitude = calculateAscendant(lst, latitude);
    const ascendant = toZodiacPosition(ascLongitude);
    
    return {
      ascendant:  {
        ...ascendant,
        absoluteDegree: ascLongitude
      },
      midheaven: {
        ... midheaven,
        absoluteDegree: mcLongitude
      }
    };
    
  } catch (error) {
    console.error('Error calculating houses:', error);
    return null;
  }
}

/**
 * Calculate Local Sidereal Time
 * @param {Date} date - JavaScript Date
 * @param {number} longitude - Geographic longitude
 * @returns {number} LST in hours (0-24)
 */
function calculateLocalSiderealTime(date, longitude) {
  // Get Julian Day
  const jd = (date.getTime() / 86400000) + 2440587.5;
  
  // Calculate centuries since J2000.0
  const T = (jd - 2451545.0) / 36525.0;
  
  // Greenwich Mean Sidereal Time at 0h UT (in degrees)
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
             0.000387933 * T * T - T * T * T / 38710000.0;
  
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
 * @returns {number} MC ecliptic longitude in degrees
 */
function calculateMidheaven(lst) {
  // Convert LST to degrees
  const lstDegrees = lst * 15;
  
  // Obliquity of ecliptic
  const obliquity = 23.4397;
  
  // Convert RAMC to ecliptic longitude
  const lstRad = lstDegrees * Math. PI / 180;
  const oblRad = obliquity * Math. PI / 180;
  
  let mc = Math.atan2(
    Math.sin(lstRad),
    Math.cos(lstRad) * Math.cos(oblRad)
  ) * 180 / Math.PI;
  
  // Normalize to 0-360
  return ((mc % 360) + 360) % 360;
}

/**
 * Calculate Ascendant ecliptic longitude (Placidus)
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Geographic latitude
 * @returns {number} Ascendant ecliptic longitude in degrees
 */
function calculateAscendant(lst, latitude) {
  // Convert to radians
  const lstRad = (lst * 15) * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const obliquity = 23.4397;
  const oblRad = obliquity * Math.PI / 180;
  
  // Ascendant formula (Placidus)
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  
  // Normalize to 0-360
  return ((asc % 360) + 360) % 360;
}

console.log('🔭 Ephemeris module loaded!');