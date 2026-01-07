// ============================================
// ASTROLOGY CORE - Shared Utilities
// Mathematical helpers and constants
// ============================================

// Planet symbols
export const PLANET_SYMBOLS = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇'
};

// Zodiac sign starting degrees
export const ZODIAC_SIGNS = {
  'Aries': 0,
  'Taurus': 30,
  'Gemini':  60,
  'Cancer':  90,
  'Leo':  120,
  'Virgo': 150,
  'Libra': 180,
  'Scorpio': 210,
  'Sagittarius': 240,
  'Capricorn': 270,
  'Aquarius': 300,
  'Pisces':  330
};

// Zodiac sign symbols
export const ZODIAC_SYMBOLS = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini':  '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra':  '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓'
};

// Planet list
export const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

// Angles/Points
export const ANGLES = ['ascendant', 'midheaven'];

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert zodiac sign + degree to absolute degrees (0-360)
 * @param {string} sign - Zodiac sign name
 * @param {number} degree - Degree within sign (0-30)
 * @returns {number} Absolute degrees (0-360)
 */
export function toAbsoluteDegrees(sign, degree) {
  return ZODIAC_SIGNS[sign] + parseFloat(degree);
}

/**
 * Convert absolute degrees to zodiac sign + degree
 * @param {number} absoluteDegrees - Degrees (0-360)
 * @returns {object} {sign: 'SignName', degree: '0. 00'}
 */
export function toZodiacPosition(absoluteDegrees) {
  const normalized = ((absoluteDegrees % 360) + 360) % 360;
  const signNames = Object. keys(ZODIAC_SIGNS);
  
  for (let i = 0; i < signNames.length; i++) {
    const signName = signNames[i];
    const nextSign = signNames[(i + 1) % 12];
    const signStart = ZODIAC_SIGNS[signName];
    const signEnd = ZODIAC_SIGNS[nextSign] || 360;
    
    if (normalized >= signStart && normalized < signEnd) {
      return {
        sign: signName,
        degree:  (normalized - signStart).toFixed(2)
      };
    }
  }
  
  // Fallback (should never reach)
  return { sign: 'Aries', degree: '0.00' };
}

/**
 * Calculate angle between two positions (shortest distance)
 * @param {number} degrees1 - First position in degrees
 * @param {number} degrees2 - Second position in degrees
 * @returns {number} Angle between them (0-180)
 */
export function calculateAngle(degrees1, degrees2) {
  let angle = Math.abs(degrees1 - degrees2);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * Calculate Julian Day from JavaScript Date
 * @param {Date} date - JavaScript Date object
 * @returns {number} Julian Day Number
 */
export function getJulianDay(date) {
  const time = date.getTime();
  return (time / 86400000) + 2440587.5;
}

/**
 * Calculate Local Sidereal Time
 * @param {Date} date - JavaScript Date object
 * @param {number} longitude - Geographic longitude
 * @returns {number} Local Sidereal Time in hours (0-24)
 */
export function getLocalSiderealTime(date, longitude) {
  const jd = getJulianDay(date);
  const T = (jd - 2451545.0) / 36525;
  
  // Greenwich Sidereal Time at 0h UT
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
            0.000387933 * T * T - T * T * T / 38710000;
  
  // Normalize to 0-360
  gst = ((gst % 360) + 360) % 360;
  
  // Convert to hours
  gst = gst / 15;
  
  // Add longitude to get Local Sidereal Time
  const lst = gst + (longitude / 15);
  
  return ((lst % 24) + 24) % 24;
}

/**
 * Calculate planetary position using simplified formulas
 * @param {string} planetName - Planet name (lowercase)
 * @param {Date} date - JavaScript Date object
 * @returns {object} {sign: 'SignName', degree: '0.00'}
 */
export function calculatePlanetPosition(planetName, date) {
  const jd = getJulianDay(date);
  const T = (jd - 2451545.0) / 36525; // centuries since J2000
  
  // Mean longitude formulas (simplified but accurate)
  let L;
  
  switch(planetName. toLowerCase()) {
    case 'sun':
      L = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
      break;
    case 'moon': 
      L = 218.3165 + 481267.8813 * T;
      break;
    case 'mercury': 
      L = 252.25 + 149472.68 * T;
      break;
    case 'venus':
      L = 181.98 + 58517.82 * T;
      break;
    case 'mars':
      L = 355.43 + 19140.30 * T;
      break;
    case 'jupiter':
      L = 34.35 + 3034.91 * T;
      break;
    case 'saturn': 
      L = 50.08 + 1222.11 * T;
      break;
    case 'uranus': 
      L = 314.05 + 428.49 * T;
      break;
    case 'neptune':
      L = 304.35 + 218.46 * T;
      break;
    case 'pluto':
      L = 238.96 + 144.96 * T;
      break;
    default:
      console.error(`Unknown planet: ${planetName}`);
      return null;
  }
  
  // Normalize to 0-360
  L = ((L % 360) + 360) % 360;
  
  return toZodiacPosition(L);
}

console.log('✨ Astrology Core loaded! ');