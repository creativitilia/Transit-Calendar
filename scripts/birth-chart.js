import { initAstronomy, calculatePlanetPosition, calculateHouses } from './astronomy.js';
import { getTimezoneOffset } from './timezone-api.js';

// Constants
const ORBS = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 7,
  sextile: 6,
  inconjunct: 3
};

const HOUSE_KEYWORDS = {
  1: 'Self, Identity, Appearance',
  2: 'Money, Values, Possessions',
  3: 'Communication, Siblings, Short Trips',
  4: 'Home, Family, Roots',
  5: 'Creativity, Romance, Children',
  6: 'Health, Work, Service',
  7: 'Partnerships, Marriage, Others',
  8: 'Transformation, Shared Resources, Death',
  9: 'Philosophy, Travel, Higher Education',
  10: 'Career, Public Image, Reputation',
  11: 'Friends, Groups, Hopes',
  12: 'Spirituality, Secrets, Isolation'
};

// Helper function to determine which house a planet is in
function getPlanetHouse(planetAbsoluteDegree, houseCuspDegrees) {
  // houseCuspDegrees is array of 12 house cusp positions in absolute degrees
  // House 1 starts at houseCuspDegrees[0] (Ascendant)
  // A planet is in house N if it's between cusp N and cusp N+1
  
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCuspDegrees[i];
    const nextCusp = houseCuspDegrees[(i + 1) % 12];
    
    // Handle wrap-around at 360/0 degrees
    if (nextCusp > currentCusp) {
      // Normal case: cusp doesn't cross 0°
      if (planetAbsoluteDegree >= currentCusp && planetAbsoluteDegree < nextCusp) {
        return i + 1; // House numbers are 1-based
      }
    } else {
      // Wrap case: cusp crosses 0° (e.g., house 12 → house 1)
      if (planetAbsoluteDegree >= currentCusp || planetAbsoluteDegree < nextCusp) {
        return i + 1;
      }
    }
  }
  
  // Fallback (should not happen with valid data)
  return 1;
}

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
  const [hour, minute] = birthTime.split(':').map(Number);
  
  // Create UTC date by adjusting for timezone offset
  const utcHour = hour - timezoneOffset;
  const utcTimestamp = Date.UTC(year, month - 1, day, utcHour, minute, 0);
  const birthDateTimeUTC = new Date(utcTimestamp);
  
  console.log(`  Timezone offset: UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`);
  console.log(`  Local DateTime: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  console.log(`  UTC DateTime: ${birthDateTimeUTC.toISOString()}`);
  
  const chart = {
    metadata: {
      date: birthDate,
      time: birthTime,
      latitude: latitude,
      longitude: longitude,
      timezoneOffset: timezoneOffset,
      calculatedAt: new Date().toISOString(),
      localDateTime: `${birthDate}T${birthTime}:00`,
      utcDateTime: birthDateTimeUTC.toISOString()
    }
  };
  
  // Calculate planetary positions
  console.log('🪐 Calculating planetary positions...');
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
  if (!chart.sun || !chart.moon) {
    throw new Error('Failed to calculate planetary positions');
  }
  
  // Calculate houses (Placidus system)
  console.log('🏠 Calculating Placidus houses...');
  const houses = calculateHouses(birthDateTimeUTC, latitude, longitude);
  
  if (houses) {
    chart.ascendant = houses.ascendant;
    chart.midheaven = houses.midheaven;
    chart.houses = houses.houses;
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
    
    console.log('✅ Planet houses assigned!');
  } else {
    console.error('❌ House calculation failed');
    chart.ascendant = { sign: 'Aries', degree: '0.00', absoluteDegree: 0 };
    chart.midheaven = { sign: 'Capricorn', degree: '0.00', absoluteDegree: 270 };
    chart.houses = [];
    chart.houseSystem = 'Unknown';
  }
  
  console.log('✅ Birth chart calculated!');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('          🌟 BIRTH CHART 🌟');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('📅 Birth Data:');
  console.log(`   Date: ${chart.metadata.date}`);
  console.log(`   Time: ${chart.metadata.time} (Local)`);
  console.log(`   Timezone: UTC${chart.metadata.timezoneOffset >= 0 ? '+' : ''}${chart.metadata.timezoneOffset}`);
  console.log(`   Location: ${chart.metadata.latitude}°, ${chart.metadata.longitude}°`);
  console.log('');
  console.log('🪐 Planets:');
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
  console.log('');
  console.log('📐 Angles:');
  console.log(`   ⬆ Ascendant (ASC)  ${chart.ascendant.degree}° ${chart.ascendant.sign}`);
  console.log(`   ⬆ Midheaven (MC)   ${chart.midheaven.degree}° ${chart.midheaven.sign}`);
  console.log('');
  
  if (chart.houses.length === 12) {
    console.log('  🏠 All 12 house cusps calculated');
  }
  
  return chart;
}

// Calculate aspects between planets
export function calculateAspects(chart) {
  console.log('🔮 Calculating aspects...');
  
  const planets = [
    { name: 'Sun', data: chart.sun },
    { name: 'Moon', data: chart.moon },
    { name: 'Mercury', data: chart.mercury },
    { name: 'Venus', data: chart.venus },
    { name: 'Mars', data: chart.mars },
    { name: 'Jupiter', data: chart.jupiter },
    { name: 'Saturn', data: chart.saturn },
    { name: 'Uranus', data: chart.uranus },
    { name: 'Neptune', data: chart.neptune },
    { name: 'Pluto', data: chart.pluto }
  ];
  
  const aspects = [];
  
  // Compare each planet with every other planet
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i];
      const planet2 = planets[j];
      
      if (!planet1.data || !planet2.data) continue;
      
      const angle = calculateAspectAngle(
        planet1.data.absoluteDegree,
        planet2.data.absoluteDegree
      );
      
      const aspectType = determineAspectType(angle);
      
      if (aspectType) {
        aspects.push({
          planet1: planet1.name,
          planet2: planet2.name,
          type: aspectType.name,
          angle: angle.toFixed(2),
          orb: aspectType.orb.toFixed(2),
          symbol: aspectType.symbol
        });
        
        console.log(`  ${planet1.name} ${aspectType.symbol} ${planet2.name} (${angle.toFixed(1)}°, orb: ${aspectType.orb.toFixed(1)}°)`);
      }
    }
  }
  
  console.log(`✅ Found ${aspects.length} aspects`);
  return aspects;
}

// Calculate the smallest angle between two positions
function calculateAspectAngle(deg1, deg2) {
  let diff = Math.abs(deg1 - deg2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

// Determine what type of aspect exists (if any) given an angle
function determineAspectType(angle) {
  const aspects = [
    { name: 'Conjunction', target: 0, maxOrb: ORBS.conjunction, symbol: '☌' },
    { name: 'Opposition', target: 180, maxOrb: ORBS.opposition, symbol: '☍' },
    { name: 'Trine', target: 120, maxOrb: ORBS.trine, symbol: '△' },
    { name: 'Square', target: 90, maxOrb: ORBS.square, symbol: '□' },
    { name: 'Sextile', target: 60, maxOrb: ORBS.sextile, symbol: '⚹' },
    { name: 'Inconjunct', target: 150, maxOrb: ORBS.inconjunct, symbol: '⚻' }
  ];
  
  for (const aspect of aspects) {
    const orb = Math.abs(angle - aspect.target);
    if (orb <= aspect.maxOrb) {
      return {
        name: aspect.name,
        symbol: aspect.symbol,
        orb: orb
      };
    }
  }
  
  return null;
}

// Export chart as JSON
export function exportChartAsJSON(chart) {
  return JSON.stringify(chart, null, 2);
}

// Get house interpretation
export function getHouseInterpretation(houseNumber) {
  return HOUSE_KEYWORDS[houseNumber] || 'Unknown house';
}

