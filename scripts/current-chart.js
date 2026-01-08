// Calculate the current chart (planets + houses + planet-in-house) for a given location
// Uses ephemeris.js (Astronomy Engine wrapper) already present in the repo.

import { initAstronomy, calculatePlanetPosition, calculateHouses } from './ephemeris.js';

// Planet list (same order used elsewhere)
const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

/**
 * Helper: find which house a planet is in given house cusp array (absolute degrees)
 * Copied logic compatible with birth-chart.js
 */
function getPlanetHouse(planetAbsoluteDegree, houseCuspDegrees) {
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCuspDegrees[i];
    const nextCusp = houseCuspDegrees[(i + 1) % 12];

    if (nextCusp > currentCusp) {
      if (planetAbsoluteDegree >= currentCusp && planetAbsoluteDegree < nextCusp) {
        return i + 1;
      }
    } else {
      // wrap-around
      if (planetAbsoluteDegree >= currentCusp || planetAbsoluteDegree < nextCusp) {
        return i + 1;
      }
    }
  }
  return 1;
}

/**
 * Calculate current chart for a location (latitude, longitude).
 * date parameter is optional; defaults to new Date() (current instant).
 *
 * Returns an object shaped similarly to the calculateBirthChart() output:
 * { metadata: {...}, sun: {...}, moon: {...}, ... , ascendant, midheaven, houses: [...] }
 */
export async function calculateCurrentChart(latitude, longitude, date = new Date()) {
  const ready = await initAstronomy();
  if (!ready) throw new Error('Astronomy Engine not available');

  const chartDate = (date instanceof Date) ? date : new Date(date);

  const chart = {
    metadata: {
      transitDate: chartDate.toISOString(),
      latitude,
      longitude,
      calculatedAt: new Date().toISOString()
    }
  };

  // Compute planetary positions (calculatePlanetPosition from ephemeris returns {sign, degree, absoluteDegree})
  for (const planet of PLANETS) {
    const key = planet.toLowerCase();
    try {
      chart[key] = calculatePlanetPosition(planet, chartDate);
    } catch (err) {
      console.warn(`Failed to calculate ${planet}:`, err);
      chart[key] = null;
    }
  }

  // Calculate houses (Placidus or fallback) for the given datetime & location
  try {
    const housesData = calculateHouses(chartDate, latitude, longitude);
    if (housesData) {
      chart.ascendant = housesData.ascendant;
      chart.midheaven = housesData.midheaven;
      chart.houses = housesData.houses;
    } else {
      chart.houses = [];
    }

    // assign house numbers to planets if possible
    if (chart.houses && chart.houses.length === 12) {
      const houseCuspDegrees = chart.houses.map(h => h.absoluteDegree || h);
      for (const planet of PLANETS) {
        const key = planet.toLowerCase();
        if (chart[key] && chart[key].absoluteDegree != null) {
          chart[key].house = getPlanetHouse(chart[key].absoluteDegree, houseCuspDegrees);
        }
      }
    }
  } catch (err) {
    console.warn('House calculation failed for current chart:', err);
  }

  return chart;
}

console.log('🛰️ Current Chart module loaded');
