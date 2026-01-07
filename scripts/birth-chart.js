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

/**
 * Calculate complete birth chart
 */
export async function calculateBirthChart(birthDate, birthTime, latitude, longitude) {
  console.log('📊 Calculating birth chart...');
  console.log(`  Date: ${birthDate}`);
  console.log(`  Time: ${birthTime}`);
  console.log(`  Location: ${latitude}°, ${longitude}°`);
  
  // Wait for Astronomy Engine to load
  const ready = await initAstronomy();
  if (!ready) {
    console.error('❌ Cannot calculate without Astronomy Engine');
    throw new Error('Astronomy Engine not available');
  }
  
  // Parse date and time
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime. split(':').map(Number);
  
  // Create date object (local time)
  const birthDateTime = new Date(year, month - 1, day, hour, minute, 0);
  
  console.log(`  Local DateTime: ${birthDateTime.toISOString()}`);
  
  const chart = {
    metadata: {
      date: birthDate,
      time: birthTime,
      latitude: latitude,
      longitude: longitude,
      calculatedAt: new Date().toISOString(),
      localDateTime: birthDateTime.toISOString()
    }
  };
  
  // Calculate planetary positions
  chart.sun = calculatePlanetPosition('Sun', birthDateTime);
  chart.moon = calculatePlanetPosition('Moon', birthDateTime);
  chart.mercury = calculatePlanetPosition('Mercury', birthDateTime);
  chart.venus = calculatePlanetPosition('Venus', birthDateTime);
  chart.mars = calculatePlanetPosition('Mars', birthDateTime);
  chart.jupiter = calculatePlanetPosition('Jupiter', birthDateTime);
  chart.saturn = calculatePlanetPosition('Saturn', birthDateTime);
  chart.uranus = calculatePlanetPosition('Uranus', birthDateTime);
  chart.neptune = calculatePlanetPosition('Neptune', birthDateTime);
  chart.pluto = calculatePlanetPosition('Pluto', birthDateTime);
  
  // Calculate houses
  const houses = calculateHouses(birthDateTime, latitude, longitude);
  
  if (houses) {
    chart.ascendant = houses.ascendant;
    chart.midheaven = houses.midheaven;
  } else {
    console.error('❌ House calculation failed');
    chart.ascendant = { sign: 'Aries', degree: '0. 00' };
    chart.midheaven = { sign: 'Capricorn', degree: '0.00' };
  }
  
  console.log('✅ Birth chart calculated!');
  console.log(`  ☉ Sun: ${chart.sun.degree}° ${chart.sun.sign}`);
  console.log(`  ☽ Moon: ${chart. moon.degree}° ${chart. moon.sign}`);
  console.log(`  ⬆ Ascendant: ${chart.ascendant.degree}° ${chart.ascendant.sign}`);
  
  return chart;
}

export function saveBirthChart(chart) {
  try {
    localStorage.setItem('birthChart', JSON.stringify(chart));
    console.log('💾 Birth chart saved to localStorage');
  } catch (error) {
    console.error('❌ Error saving birth chart:', error);
  }
}

export function loadBirthChart() {
  try {
    const stored = localStorage.getItem('birthChart');
    if (stored) {
      console.log('📂 Birth chart loaded from localStorage');
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('❌ Error loading birth chart:', error);
  }
  return null;
}

console.log('🌟 Birth Chart module loaded!');
