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
import { estimateTimezoneOffset } from './timezone-helper.js';

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
    timezoneOffset = estimateTimezoneOffset(latitude, longitude);
    console.warn(`⚠️ Using estimated timezone offset: ${timezoneOffset} hours`);
  }
  
  // Parse date and time
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime. split(':').map(Number);
  
  // Create UTC date by adjusting for timezone offset
  // If birth time is 13:20 in UTC+1, UTC time is 12:20
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
  console.log(`  ☉ Sun: ${chart.sun.degree}° ${chart.sun.sign}`);
  console.log(`  ☽ Moon: ${chart.moon. degree}° ${chart.moon. sign}`);
  console.log(`  ⬆ Ascendant: ${chart.ascendant.degree}° ${chart.ascendant.sign}`);
  console.log(`  ⬆ Midheaven: ${chart.midheaven. degree}° ${chart.midheaven.sign}`);
  
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
