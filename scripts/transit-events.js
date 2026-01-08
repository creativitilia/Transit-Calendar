// Updated transit events generator with scoring/prioritization
import { PLANETS as PLANET_KEYS, PLANET_SYMBOLS } from './astrology-core.js';
import { calculatePlanetPosition } from './ephemeris.js';
import { calculateAngle } from './astrology-core.js';

// Aspect definition (same as before)
const ORBS = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 7,
  sextile: 6,
  inconjunct: 3
};

const ASPECTS = [
  { name: 'Conjunction', target: 0, maxOrb: ORBS.conjunction, symbol: '☌', weight: 1.00 },
  { name: 'Opposition', target: 180, maxOrb: ORBS.opposition, symbol: '☍', weight: 0.95 },
  { name: 'Trine', target: 120, maxOrb: ORBS.trine, symbol: '△', weight: 0.85 },
  { name: 'Square', target: 90, maxOrb: ORBS.square, symbol: '□', weight: 0.90 },
  { name: 'Sextile', target: 60, maxOrb: ORBS.sextile, symbol: '⚹', weight: 0.65 },
  { name: 'Inconjunct', target: 150, maxOrb: ORBS.inconjunct, symbol: '⚻', weight: 0.55 }
];

// Planet importance map (0-10)
const PLANET_IMPORTANCE = {
  sun: 9, moon: 10, mercury: 5, venus: 7, mars: 8, jupiter: 8, saturn: 9, uranus: 6, neptune: 6, pluto: 7
};

// Config: how many top aspects to show per day (changeable)
const TOP_N = 6;

// Small helper functions
function capitalize(s){ return s && s[0].toUpperCase() + s.slice(1); }

function loadNatalChart() {
  try {
    const raw = localStorage.getItem('birthChart');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse birthChart', e);
    return null;
  }
}

function determineAspect(angle) {
  for (const a of ASPECTS) {
    const orb = Math.abs(angle - a.target);
    if (orb <= a.maxOrb) {
      return { ...a, orb: parseFloat(orb.toFixed(2)) };
    }
  }
  return null;
}

// Determine if applying (small delta hour)
function isApplying(transitPlanetName, natalAbsolute, date) {
  try {
    const cap = capitalize(transitPlanetName);
    const t0 = calculatePlanetPosition(cap, date);
    const later = new Date(date.getTime() + 60 * 60 * 1000); // +1 hour
    const t1 = calculatePlanetPosition(cap, later);
    if (!t0 || !t1 || t0.absoluteDegree == null || t1.absoluteDegree == null) return false;
    const angleNow = calculateAngle(t0.absoluteDegree, natalAbsolute);
    const angleLater = calculateAngle(t1.absoluteDegree, natalAbsolute);
    return angleLater < angleNow; // decreasing -> applying
  } catch (e) {
    return false;
  }
}

/**
 * Get transit events for a calendar day, but prioritize and return the top N by score
 */
export function getTransitEventsForDate(calendarDate) {
  const natal = loadNatalChart();
  if (!natal) return [];

  // Evaluate at noon UTC for the day
  const y = calendarDate.getUTCFullYear();
  const m = calendarDate.getUTCMonth();
  const d = calendarDate.getUTCDate();
  const transitTimeUTC = new Date(Date.UTC(y, m, d, 12, 0, 0));

  // Build transit positions
  const transitPositions = {};
  for (const key of PLANET_KEYS) {
    const cap = capitalize(key);
    try {
      transitPositions[key] = calculatePlanetPosition(cap, transitTimeUTC);
    } catch (err) {
      transitPositions[key] = null;
    }
  }

  const scoredEvents = [];

  for (const transitKey of PLANET_KEYS) {
    const transitPos = transitPositions[transitKey];
    if (!transitPos || transitPos.absoluteDegree == null) continue;

    for (const natalKey of PLANET_KEYS) {
      const natalData = natal[natalKey];
      if (!natalData || natalData.absoluteDegree == null) continue;

      const angle = calculateAngle(transitPos.absoluteDegree, natalData.absoluteDegree);
      const aspect = determineAspect(angle);
      if (!aspect) continue;

      // closenessScore (0..1)
      const closenessScore = (aspect.maxOrb - aspect.orb) / aspect.maxOrb;

      // aspect weight
      const aspectWeight = aspect.weight || 0.7;

      // planet importance (average of transit + natal), normalized 0..1
      const impTransit = PLANET_IMPORTANCE[transitKey] || 5;
      const impNatal = PLANET_IMPORTANCE[natalKey] || 5;
      const planetImportanceScore = (impTransit + impNatal) / 20; // /20 -> 0..1

      // angularBoost if natal planet in angle house (1/4/7/10)
      let angularBoost = 0;
      if (natalData.house && [1,4,7,10].includes(Number(natalData.house))) {
        angularBoost = 0.12;
      }

      // applying boost
      let applyingBoost = 0;
      try {
        if (isApplying(transitKey, natalData.absoluteDegree, transitTimeUTC)) {
          applyingBoost = 0.05;
        }
      } catch (e) {
        applyingBoost = 0;
      }

      // Moon damping: reduce Moon transit weight unless orb small
      let moonMultiplier = 1.0;
      if (transitKey === 'moon') {
        moonMultiplier = (aspect.orb <= 3) ? 1.0 : 0.5;
      }

      // Combine into a final score
      // weights: closeness 0.5, aspect type 0.2, planet importance 0.15, angular 0.1, applying 0.05
      const scoreBase = (closenessScore * 0.5) + (aspectWeight * 0.2) + (planetImportanceScore * 0.15) + angularBoost + applyingBoost;
      const finalScore = Math.min(1.0, scoreBase) * moonMultiplier;

      // prepare event data
      const transitSymbol = PLANET_SYMBOLS[transitKey] || '';
      const natalSymbol = PLANET_SYMBOLS[natalKey] || '';
      const title = `${transitSymbol} ${capitalize(transitKey)} ${aspect.symbol} natal ${natalSymbol} ${capitalize(natalKey)}`;

      const id = `transit-${y}${String(m+1).padStart(2,'0')}${String(d).padStart(2,'0')}-${transitKey}-${natalKey}-${aspect.name}`;

      scoredEvents.push({
        id,
        title,
        date: new Date(Date.UTC(y, m, d, 0, 0, 0)),
        startTime: 0,
        endTime: 1440,
        color: '#6b7280',
        meta: {
          transitPlanet: transitKey,
          natalPlanet: natalKey,
          aspect: aspect.name,
          orb: aspect.orb,
          angle: parseFloat(angle.toFixed(2)),
          transitPos,
          natalPos: natalData,
          score: parseFloat(finalScore.toFixed(4))
        }
      });
    }
  }

  // Sort by score descending and return top N
  scoredEvents.sort((a, b) => (b.meta.score || 0) - (a.meta.score || 0));

  // Option: return all but keep only top N displayed OR return top N and expose a method to fetch all.
  return scoredEvents.slice(0, TOP_N);
}
