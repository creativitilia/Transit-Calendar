// ============================================
// BIRTH CHART CALCULATOR
// Uses Astronomy Engine
// ============================================

import { PLANET_SYMBOLS } from './astrology-core.js';

import {
  initAstronomy,
  calculatePlanetPosition,
  calculateHouses
} from './ephemeris.js';

import { getTimezoneOffset } from './timezone-helper.js';

/**
 * Determine which house a planet is in
 * @param {number} planetLongitude - Planet's absolute ecliptic longitude (0-360)
 * @param {Array} houseCusps - Array of 12 house cusp absolute longitudes
 * @returns {number} House number (1-12)
 */
function getPlanetHouse(planetLongitude, houseCusps) {
  // Normalize planet longitude to 0-360
  planetLongitude = ((planetLongitude % 360) + 360) % 360;
  
  // Check each house
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[(i + 1) % 12]; // Wrap around to house 1 after house 12
    
    // Handle the case where house crosses 0° Aries (e.g., from Pisces to Aries)
    if (currentCusp > nextCusp) {
      // House crosses 0° boundary
      if (planetLongitude >= currentCusp || planetLongitude < nextCusp) {
        return i + 1; // Houses are numbered 1-12
      }
    } else {
      // Normal case
      if (planetLongitude >= currentCusp && planetLongitude < nextCusp) {
        return i + 1;
      }
    }
  }
  
  // Fallback (shouldn't happen, but just in case)
  return 1;
}

/**
 * Calculate complete birth chart
 * @param {string} birthDate - YYYY-MM-DD format
 * @param {string} birthTime - HH:MM format (local time)
 * @param {number} latitude - Birth location latitude
 * @param {number} longitude - Birth location longitude
 * @param {number} timezoneOffset - Optional:  timezone offset in hours from UTC
 * @returns {object} Complete birth chart
 */
export async function calculateBirthChart(birthDate, birthTime, latitude, longitude, timezoneOffset = null) {
  console.log('📊 Calculating birth chart...');
  console.log(`  Date: ${birthDate}`);
  console.log(`  Time: ${birthTime} (local time)`);
  console.log(`  Location: ${latitude}°, ${longitude}°`);
  
  // Wait for Astronomy Engine to load
  const ready = await initAstronomy();
  if (!ready) {
    console.error('❌ Cannot calculate without Astronomy Engine');
    throw new Error('Astronomy Engine not available');
  }
  
  // Estimate timezone if not provided
  if (timezoneOffset === null) {
    timezoneOffset = await getTimezoneOffset(latitude, longitude, birthDate, birthTime);
    console.warn(`⚠️ Using estimated timezone offset: ${timezoneOffset} hours`);
  }
  
  // Parse date and time
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime. split(':').map(Number);
  
  // Create UTC date by adjusting for timezone offset
  // If birth time is 13:20 in UTC+1, UTC time is 12:20

  // Validate planetary calculations
if (! chart.sun || !chart.moon) {
  throw new Error('Failed to calculate planetary positions');
}

// Calculate houses (Placidus system)
console.log('🏠 Calculating Placidus houses...');
const houses = calculateHouses(birthDateTimeUTC, latitude, longitude);

if (houses) {
  chart.ascendant = houses. ascendant;
  chart. midheaven = houses.midheaven;
  chart.houses = houses.houses;
  chart.houseSystem = 'Placidus';
  
  // **ADD THIS NEW SECTION:**
  // Extract house cusp absolute degrees for planet-in-house calculation
  const houseCuspDegrees = houses.houses.map(h => h.absoluteDegree);
  
  // Assign house numbers to each planet
  chart.sun. house = getPlanetHouse(chart.sun.absoluteDegree, houseCuspDegrees);
  chart.moon.house = getPlanetHouse(chart.moon.absoluteDegree, houseCuspDegrees);
  chart.mercury.house = getPlanetHouse(chart.mercury.absoluteDegree, houseCuspDegrees);
  chart.venus.house = getPlanetHouse(chart.venus.absoluteDegree, houseCuspDegrees);
  chart.mars.house = getPlanetHouse(chart.mars.absoluteDegree, houseCuspDegrees);
  chart.jupiter.house = getPlanetHouse(chart.jupiter.absoluteDegree, houseCuspDegrees);
  chart.saturn.house = getPlanetHouse(chart.saturn.absoluteDegree, houseCuspDegrees);
  chart.uranus.house = getPlanetHouse(chart. uranus.absoluteDegree, houseCuspDegrees);
  chart.neptune.house = getPlanetHouse(chart. neptune.absoluteDegree, houseCuspDegrees);
  chart.pluto.house = getPlanetHouse(chart. pluto.absoluteDegree, houseCuspDegrees);
  
  console.log('✅ Planet houses assigned! ');
} else {
  // ...  existing fallback code
}

  console.log('🪐 Planets:  ');
console.log(`   ☉ Sun       ${chart.sun.degree}° ${chart.sun.sign. padEnd(11)} House ${chart.sun.house}`);
console.log(`   ☽ Moon      ${chart.moon.degree}° ${chart.moon.sign.padEnd(11)} House ${chart.moon.house}`);
console.log(`   ☿ Mercury   ${chart. mercury.degree}° ${chart. mercury.sign.padEnd(11)} House ${chart.mercury.house}`);
console.log(`   ♀ Venus     ${chart.venus.degree}° ${chart.venus.sign.padEnd(11)} House ${chart.venus.house}`);
console.log(`   ♂ Mars      ${chart.mars.degree}° ${chart.mars.sign. padEnd(11)} House ${chart.mars.house}`);
console.log(`   ♃ Jupiter   ${chart.jupiter.degree}° ${chart.jupiter.sign.padEnd(11)} House ${chart.jupiter.house}`);
console.log(`   ♄ Saturn    ${chart.saturn. degree}° ${chart.saturn. sign.padEnd(11)} House ${chart.saturn.house}`);
console.log(`   ♅ Uranus    ${chart.uranus.degree}° ${chart.uranus.sign.padEnd(11)} House ${chart.uranus.house}`);
console.log(`   ♆ Neptune   ${chart.neptune. degree}° ${chart.neptune.sign.padEnd(11)} House ${chart.neptune.house}`);
console.log(`   ♇ Pluto     ${chart.pluto.degree}° ${chart.pluto.sign.padEnd(11)} House ${chart.pluto.house}`);



  const utcHour = hour - timezoneOffset;
  const utcTimestamp = Date.UTC(year, month - 1, day, utcHour, minute, 0);
  const birthDateTimeUTC = new Date(utcTimestamp);
  
  console.log(`  Timezone offset: UTC${timezoneOffset >= 0 ? '+' :  ''}${timezoneOffset}`);
  console.log(`  Local DateTime: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  console.log(`  UTC DateTime: ${birthDateTimeUTC.toISOString()}`);
  
  const chart = {
    metadata: {
      date: birthDate,
      time:  birthTime,
      latitude: latitude,
      longitude: longitude,
      timezoneOffset: timezoneOffset,
      calculatedAt: new Date().toISOString(),
      localDateTime: `${birthDate}T${birthTime}: 00`,
      utcDateTime: birthDateTimeUTC.toISOString()
    }
  };
  
  // Calculate planetary positions
  console.log('🪐 Calculating planetary positions.. .');
  chart.sun = calculatePlanetPosition('Sun', birthDateTimeUTC);
  chart.moon = calculatePlanetPosition('Moon', birthDateTimeUTC);
  chart.mercury = calculatePlanetPosition('Mercury', birthDateTimeUTC);
  chart.venus = calculatePlanetPosition('Venus', birthDateTimeUTC);
  chart.mars = calculatePlanetPosition('Mars', birthDateTimeUTC);
  chart.jupiter = calculatePlanetPosition('Jupiter', birthDateTimeUTC);
  chart.saturn = calculatePlanetPosition('Saturn', birthDateTimeUTC);
  chart.uranus = calculatePlanetPosition('Uranus', birthDateTimeUTC);
  chart.neptune = calculatePlanetPosition('Neptune', birthDateTimeUTC);
  chart.pluto = calculatePlanetPosition('Pluto', birthDateTimeUTC);
  
  // Validate planetary calculations
  if (! chart.sun || !chart.moon) {
    throw new Error('Failed to calculate planetary positions');
  }
  
  // Calculate houses (Placidus system)
  console.log('🏠 Calculating Placidus houses...');
  const houses = calculateHouses(birthDateTimeUTC, latitude, longitude);
  
  if (houses) {
    chart.ascendant = houses. ascendant;
    chart. midheaven = houses.midheaven;
    chart.houses = houses.houses;
    chart. houseSystem = 'Placidus';
  } else {
    console.error('❌ House calculation failed');
    chart.ascendant = { sign: 'Aries', degree:  '0.00', absoluteDegree: 0 };
    chart.midheaven = { sign: 'Capricorn', degree: '0.00', absoluteDegree: 270 };
    chart.houses = [];
    chart. houseSystem = 'Unknown';
  }
  
  console.log('✅ Birth chart calculated! ');
console.log('');
console.log('═══════════════════════════════════════');
console.log('          🌟 BIRTH CHART 🌟');
console.log('═══════════════════════════════════════');
console.log('');
console.log('📅 Birth Data:');
console.log(`   Date: ${chart.metadata.date}`);
console.log(`   Time: ${chart.metadata.time} (Local)`);
console.log(`   Timezone: UTC${chart.metadata.timezoneOffset >= 0 ? '+' : ''}${chart.metadata.timezoneOffset}`);
console.log(`   Location: ${chart.metadata.latitude}°, ${chart.metadata. longitude}°`);
console.log('');
console.log('🪐 Planets: ');
console.log(`   ☉ Sun       ${chart.sun.degree}° ${chart.sun.sign}`);
console.log(`   ☽ Moon      ${chart.moon. degree}° ${chart.moon. sign}`);
console.log(`   ☿ Mercury   ${chart.mercury. degree}° ${chart.mercury. sign}`);
console.log(`   ♀ Venus     ${chart.venus. degree}° ${chart.venus. sign}`);
console.log(`   ♂ Mars      ${chart.mars.degree}° ${chart.mars.sign}`);
console.log(`   ♃ Jupiter   ${chart.jupiter. degree}° ${chart.jupiter. sign}`);
console.log(`   ♄ Saturn    ${chart.saturn.degree}° ${chart.saturn.sign}`);
console.log(`   ♅ Uranus   ${chart.uranus.degree}° ${chart.uranus.sign}`);
console.log(`   ♆ Neptune   ${chart.neptune.degree}° ${chart.neptune.sign}`);
console.log(`   ♇ Pluto     ${chart.pluto.degree}° ${chart.pluto.sign}`);
console.log('');
console.log('📐 Angles:');
console.log(`   ⬆ Ascendant (ASC)  ${chart.ascendant.degree}° ${chart. ascendant.sign}`);
console.log(`   ⬆ Midheaven (MC)   ${chart.midheaven.degree}° ${chart.midheaven.sign}`);
console.log('');
  
  if (chart.houses.length === 12) {
    console.log('  🏠 All 12 house cusps calculated');
  }
  
  return chart;
}

/**
 * Save birth chart to localStorage
 */
export function saveBirthChart(chart) {
  try {
    localStorage.setItem('birthChart', JSON.stringify(chart));
    console.log('💾 Birth chart saved to localStorage');
  } catch (error) {
    console.error('❌ Error saving birth chart:', error);
  }
}

/**
 * Load birth chart from localStorage
 */
export function loadBirthChart() {
  try {
    const stored = localStorage. getItem('birthChart');
    if (stored) {
      console.log('📂 Birth chart loaded from localStorage');
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('❌ Error loading birth chart:', error);
  }
  return null;
}

/**
 * Format birth chart as readable text
 */
export function formatBirthChart(chart) {
  if (!chart) return 'No birth chart available';
  
  let text = `🌟 Birth Chart\n\n`;
  text += `📅 Date: ${chart.metadata.date}\n`;
  text += `⏰ Time: ${chart.metadata. time} (Local)\n`;
  text += `📍 Location: ${chart.metadata.latitude}°, ${chart.metadata.longitude}°\n`;
  text += `🌍 Timezone: UTC${chart.metadata.timezoneOffset >= 0 ?  '+' : ''}${chart. metadata.timezoneOffset}\n\n`;
  
  text += `Planets:\n`;
  text += `☉ Sun: ${chart.sun.degree}° ${chart.sun.sign}\n`;
  text += `☽ Moon: ${chart.moon.degree}° ${chart.moon.sign}\n`;
  text += `☿ Mercury: ${chart.mercury.degree}° ${chart.mercury.sign}\n`;
  text += `♀ Venus: ${chart.venus. degree}° ${chart.venus. sign}\n`;
  text += `♂ Mars: ${chart.mars.degree}° ${chart.mars.sign}\n`;
  text += `♃ Jupiter: ${chart.jupiter.degree}° ${chart.jupiter.sign}\n`;
  text += `♄ Saturn: ${chart.saturn.degree}° ${chart.saturn.sign}\n`;
  text += `♅ Uranus: ${chart.uranus.degree}° ${chart.uranus. sign}\n`;
  text += `♆ Neptune: ${chart.neptune.degree}° ${chart.neptune.sign}\n`;
  text += `♇ Pluto: ${chart. pluto.degree}° ${chart.pluto.sign}\n\n`;
  
  text += `Angles:\n`;
  text += `⬆ Ascendant:  ${chart.ascendant.degree}° ${chart.ascendant.sign}\n`;
  text += `⬆ Midheaven: ${chart.midheaven.degree}° ${chart. midheaven.sign}\n`;
  
  if (chart. houses && chart.houses.length === 12) {
    text += `\n🏠 Houses (${chart.houseSystem}):\n`;
    chart.houses.forEach((house, i) => {
      text += `  House ${i + 1}: ${house.degree}° ${house.sign}\n`;
    });
  }
  
  return text;
}

console.log('🌟 Birth Chart module loaded! ');
