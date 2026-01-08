// Generate transit-aspect "events" for the calendar.
// - Reads natal chart from localStorage ('birthChart')
// - Computes transit planet positions for a given date (local midday)
// - Compares transit positions to natal planet absolute degrees using simple aspect orbs
// - Returns an array of event objects compatible with event-store/event rendering

import { PLANETS as PLANET_KEYS, PLANET_SYMBOLS } from './astrology-core.js';
import { calculatePlanetPosition } from './ephemeris.js';
import { calculateAngle } from './astrology-core.js';

// Aspect definition (same convention used in birth-chart.js)
const ORBS = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 7,
  sextile: 6,
  inconjunct: 3
};

const ASPECTS = [
  { name: 'Conjunction', target: 0, maxOrb: ORBS.conjunction, symbol: '☌' },
  { name: 'Opposition', target: 180, maxOrb: ORBS.opposition, symbol: '☍' },
  { name: 'Trine', target: 120, maxOrb: ORBS.trine, symbol: '△' },
  { name: 'Square', target: 90, maxOrb: ORBS.square, symbol: '□' },
  { name: 'Sextile', target: 60, maxOrb: ORBS.sextile, symbol: '⚹' },
  { name: 'Inconjunct', target: 150, maxOrb: ORBS.inconjunct, symbol: '⚻' }
];

// Helper to choose color per aspect (simple)
function aspectColor(typeName) {
  switch (typeName) {
    case 'Conjunction': return '#7c3aed'; // purple
    case 'Opposition': return '#ef4444'; // red
    case 'Square': return '#f59e0b'; // orange
    case 'Trine': return '#10b981'; // green
    case 'Sextile': return '#3b82f6'; // blue
    case 'Inconjunct': return '#64748b'; // gray
    default: return '#6b7280';
  }
}

function determineAspect(angle) {
  for (const a of ASPECTS) {
    const orb = Math.abs(angle - a.target);
    if (orb <= a.maxOrb) {
      return {
        name: a.name,
        symbol: a.symbol,
        orb: parseFloat(orb.toFixed(2))
      };
    }
  }
  return null;
}

function capitalize(name) {
  if (!name) return name;
  return name[0].toUpperCase() + name.slice(1);
}

/**
 * Get natal chart from localStorage (same format produced by calculateBirthChart)
 */
function loadNatalChartFromStorage() {
  try {
    const raw = localStorage.getItem('birthChart');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn('Failed to load birthChart from localStorage', err);
    return null;
  }
}

/**
 * Compute transit events for a given Date (calendar day).
 * Returns an array of event objects:
 * { id, title, date: Date (local), startTime: 0, endTime: 1440, color, meta: {...} }
 */
export function getTransitEventsForDate(calendarDate) {
  const natal = loadNatalChartFromStorage();
  if (!natal) return [];

  // Use local-midday on the calendar day to evaluate planetary positions (avoids UTC shift)
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  const d = calendarDate.getDate();
  const transitSampleLocal = new Date(y, m, d, 12, 0, 0); // local midday

  // Build transit positions
  const transitPositions = {};
  for (const key of PLANET_KEYS) {
    const cap = capitalize(key);
    try {
      const pos = calculatePlanetPosition(cap, transitSampleLocal);
      transitPositions[key] = pos; // { sign, degree, absoluteDegree }
    } catch (err) {
      transitPositions[key] = null;
    }
  }

  const events = [];

  // Compare each transit planet to each natal planet
  for (const transitKey of PLANET_KEYS) {
    const transitPos = transitPositions[transitKey];
    if (!transitPos || transitPos.absoluteDegree == null) continue;

    for (const natalKey of PLANET_KEYS) {
      const natalData = natal[natalKey];
      if (!natalData || natalData.absoluteDegree == null) continue;

      const angle = calculateAngle(transitPos.absoluteDegree, natalData.absoluteDegree);
      const aspect = determineAspect(angle);
      if (!aspect) continue;

      const transitSymbol = PLANET_SYMBOLS[transitKey] || '';
      const natalSymbol = PLANET_SYMBOLS[natalKey] || '';

      // Title like: "☉ Sun ☌ natal ♀ Venus"
      const title = `${transitSymbol} ${capitalize(transitKey)} ${aspect.symbol} natal ${natalSymbol} ${capitalize(natalKey)}`;

      // Unique id for transit event (stable for a given date/aspect)
      const id = `transit-${y}${String(m+1).padStart(2,'0')}${String(d).padStart(2,'0')}-${transitKey}-${natalKey}-${aspect.name}`;

      // Use local date for the event date — this matches the calendar's date objects
      const localDateForEvent = new Date(y, m, d, 12, 0, 0);

      events.push({
        id,
        title,
        date: localDateForEvent,
        startTime: 0,
        endTime: 1440,
        color: aspectColor(aspect.name),
        meta: {
          transitPlanet: transitKey,
          natalPlanet: natalKey,
          aspect: aspect.name,
          orb: aspect.orb,
          angle: parseFloat(angle.toFixed(2)),
          transitPos,
          natalPos: natalData
        }
      });
    }
  }

  return events;
}