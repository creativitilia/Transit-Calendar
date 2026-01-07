#!/usr/bin/env node

const swisseph = require('swisseph');
const moment = require('moment-timezone');

// Set ephemeris path
swisseph.swe_set_ephe_path(__dirname + '/../ephe');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 5) {
  console.log('Usage: node birth-chart.js <date> <time> <timezone> <latitude> <longitude>');
  console.log('Example: node birth-chart.js "1990-01-15" "14:30" "America/New_York" 40.7128 -74.0060');
  process.exit(1);
}

const [dateStr, timeStr, timezone, latStr, lonStr] = args;
const latitude = parseFloat(latStr);
const longitude = parseFloat(lonStr);

// Validate inputs
if (isNaN(latitude) || isNaN(longitude)) {
  console.error('Error: Invalid latitude or longitude');
  process.exit(1);
}

// Parse date and time in the given timezone
const dateTime = moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', timezone);
if (!dateTime.isValid()) {
  console.error('Error: Invalid date or time format');
  process.exit(1);
}

// Convert to UTC for Swiss Ephemeris
const utcDateTime = dateTime.utc();
const year = utcDateTime.year();
const month = utcDateTime.month() + 1; // moment months are 0-indexed
const day = utcDateTime.date();
const hour = utcDateTime.hour() + utcDateTime.minute() / 60.0 + utcDateTime.second() / 3600.0;

// Calculate Julian Day
const julianDay = swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);

// Function to calculate planet position
function calculatePlanet(planetId) {
  const result = swisseph.swe_calc_ut(julianDay, planetId, swisseph.SEFLG_SWIEPH);
  if (result.flag < 0) {
    console.error(`Error calculating planet ${planetId}: ${result.error}`);
    return null;
  }
  
  const longitude = result.data[0];
  const signIndex = Math.floor(longitude / 30);
  const degree = (longitude % 30).toFixed(2);
  
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  return {
    absoluteDegree: longitude,
    sign: signs[signIndex],
    degree: degree
  };
}

// Helper function to determine which house a planet is in
function getPlanetHouse(planetDegree, houseCuspDegrees) {
  // Normalize planet degree to 0-360 range
  let normalizedPlanet = planetDegree % 360;
  if (normalizedPlanet < 0) normalizedPlanet += 360;
  
  // Find which house the planet falls into
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCuspDegrees[i];
    const nextCusp = houseCuspDegrees[(i + 1) % 12];
    
    // Handle the case where house crosses 0° Aries
    if (currentCusp > nextCusp) {
      if (normalizedPlanet >= currentCusp || normalizedPlanet < nextCusp) {
        return i + 1;
      }
    } else {
      if (normalizedPlanet >= currentCusp && normalizedPlanet < nextCusp) {
        return i + 1;
      }
    }
  }
  
  return 1; // Default to 1st house if something goes wrong
}

// Function to calculate houses
function calculateHouses(julianDay, latitude, longitude) {
  const houses = swisseph.swe_houses(julianDay, latitude, longitude, 'P'); // Placidus system
  
  if (!houses || houses.flag < 0) {
    console.error('Error calculating houses');
    return null;
  }
  
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  const houseData = [];
  for (let i = 0; i < 12; i++) {
    const cuspLongitude = houses.house[i];
    const signIndex = Math.floor(cuspLongitude / 30);
    const degree = (cuspLongitude % 30).toFixed(2);
    
    houseData.push({
      house: i + 1,
      absoluteDegree: cuspLongitude,
      sign: signs[signIndex],
      degree: degree
    });
  }
  
  // Also get Ascendant (AC), MC, and other angles
  const ascendant = houses.ascendant;
  const mc = houses.mc;
  const armc = houses.armc;
  const vertex = houses.vertex;
  
  return {
    houses: houseData,
    ascendant: {
      absoluteDegree: ascendant,
      sign: signs[Math.floor(ascendant / 30)],
      degree: (ascendant % 30).toFixed(2)
    },
    mc: {
      absoluteDegree: mc,
      sign: signs[Math.floor(mc / 30)],
      degree: (mc % 30).toFixed(2)
    }
  };
}

// Calculate planetary positions
const chart = {
  sun: calculatePlanet(swisseph.SE_SUN),
  moon: calculatePlanet(swisseph.SE_MOON),
  mercury: calculatePlanet(swisseph.SE_MERCURY),
  venus: calculatePlanet(swisseph.SE_VENUS),
  mars: calculatePlanet(swisseph.SE_MARS),
  jupiter: calculatePlanet(swisseph.SE_JUPITER),
  saturn: calculatePlanet(swisseph.SE_SATURN),
  uranus: calculatePlanet(swisseph.SE_URANUS),
  neptune: calculatePlanet(swisseph.SE_NEPTUNE),
  pluto: calculatePlanet(swisseph.SE_PLUTO)
};

// Calculate houses
const houses = calculateHouses(julianDay, latitude, longitude);

if (houses) {
  chart.houses = houses.houses;
  chart.ascendant = houses.ascendant;
  chart.mc = houses.mc;
  chart.houseSystem = 'Placidus';
  
  // Extract house cusp absolute degrees for planet-in-house calculation
  const houseCuspDegrees = houses.houses.map(h => h.absoluteDegree);
  
  // Assign house numbers to each planet
  chart.sun.house = getPlanetHouse(chart.sun.absoluteDegree, houseCuspDegrees);
  chart.moon.house = getPlanetHouse(chart.moon.absoluteDegree, houseCuspDegrees);
  chart.mercury.house = getPlanetHouse(chart.mercury.absoluteDegree, houseCuspDegrees);
  chart.venus.house = getPlanetHouse(chart.venus.absoluteDegree, houseCuspDegrees);
  chart.mars.house = getPlanetHouse(chart.mars.absoluteDegree, houseCuspDegrees);
  chart.jupiter.house = getPlanetHouse(chart.jupiter.absoluteDegree, houseCuspDegrees);
  chart.saturn.house = getPlanetHouse(chart.saturn.absoluteDegree, houseCuspDegrees);
  chart.uranus.house = getPlanetHouse(chart.uranus.absoluteDegree, houseCuspDegrees);
  chart.neptune.house = getPlanetHouse(chart.neptune.absoluteDegree, houseCuspDegrees);
  chart.pluto.house = getPlanetHouse(chart.pluto.absoluteDegree, houseCuspDegrees);
}

// Print results
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                        BIRTH CHART                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log(`\n📅 Birth Date: ${dateTime.format('MMMM D, YYYY')}`);
console.log(`🕐 Birth Time: ${dateTime.format('h:mm A')} ${timezone}`);
console.log(`📍 Location: ${latitude}°, ${longitude}°`);
console.log(`🌍 UTC Time: ${utcDateTime.format('YYYY-MM-DD HH:mm:ss')}`);

console.log('\n┌────────────────────────────────────────────────────────────────┐');
console.log('│ PLANETARY POSITIONS                                            │');
console.log('└────────────────────────────────────────────────────────────────┘');
console.log(`   ☉ Sun       ${chart.sun.degree}° ${chart.sun.sign.padEnd(11)} House ${chart.sun.house}`);
console.log(`   ☽ Moon      ${chart.moon.degree}° ${chart.moon.sign.padEnd(11)} House ${chart.moon.house}`);
console.log(`   ☿ Mercury   ${chart.mercury.degree}° ${chart.mercury.sign.padEnd(11)} House ${chart.mercury.house}`);
console.log(`   ♀ Venus     ${chart.venus.degree}° ${chart.venus.sign.padEnd(11)} House ${chart.venus.house}`);
console.log(`   ♂ Mars      ${chart.mars.degree}° ${chart.mars.sign.padEnd(11)} House ${chart.mars.house}`);
console.log(`   ♃ Jupiter   ${chart.jupiter.degree}° ${chart.jupiter.sign.padEnd(11)} House ${chart.jupiter.house}`);
console.log(`   ♄ Saturn    ${chart.saturn.degree}° ${chart.saturn.sign.padEnd(11)} House ${chart.saturn.house}`);
console.log(`   ♅ Uranus    ${chart.uranus.degree}° ${chart.uranus.sign.padEnd(11)} House ${chart.uranus.house}`);
console.log(`   ♆ Neptune   ${chart.neptune.degree}° ${chart.neptune.sign.padEnd(11)} House ${chart.neptune.house}`);
console.log(`   ♇ Pluto     ${chart.pluto.degree}° ${chart.pluto.sign.padEnd(11)} House ${chart.pluto.house}`);

if (houses) {
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ HOUSE CUSPS (Placidus)                                        │');
  console.log('└────────────────────────────────────────────────────────────────┘');
  console.log(`   🏠 1st (ASC) ${chart.ascendant.degree}° ${chart.ascendant.sign}`);
  for (let i = 1; i < 12; i++) {
    const house = chart.houses[i];
    console.log(`   🏠 ${(i + 1).toString().padStart(2)}th      ${house.degree}° ${house.sign}`);
  }
  console.log(`   ⭐ MC       ${chart.mc.degree}° ${chart.mc.sign}`);
}

console.log('\n');

// Close Swiss Ephemeris
swisseph.swe_close();
