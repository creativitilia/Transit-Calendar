// Transit events generator with scoring for prioritization
// Exports getTransitEventsForDate(date) -> returns ALL transit events for that day (scored, descending)
// Uses Astronomy Engine wrapper calculatePlanetPosition from ephemeris.js

import { PLANET_SYMBOLS } from './astrology-core.js';
import { calculatePlanetPosition } from './ephemeris.js';
import { calculateAngle } from './astrology-core.js';

// Planet keys (lowercase) used consistently
const PLANETS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];

// Aspect definitions and weights
const ASPECTS = [
  { name: 'Conjunction', target: 0, maxOrb: 8, symbol: '☌', weight: 1.00 },
  { name: 'Opposition', target: 180, maxOrb: 8, symbol: '☍', weight: 0.95 },
  { name: 'Trine', target: 120, maxOrb: 8, symbol: '△', weight: 0.85 },
  { name: 'Square', target: 90, maxOrb: 7, symbol: '□', weight: 0.90 },
  { name: 'Sextile', target: 60, maxOrb: 6, symbol: '⚹', weight: 0.65 },
  { name: 'Inconjunct', target: 150, maxOrb: 3, symbol: '⚻', weight: 0.55 }
];

// Planet importance (0..10)
const PLANET_IMPORTANCE = {
  sun: 9, moon: 10, mercury: 5, venus: 7, mars: 8, jupiter: 8, saturn: 9, uranus: 6, neptune: 6, pluto: 7
};

// Default top N to show in compact view
export const DEFAULT_TOP_N = 6;

/**
 * Determine which aspect object applies for a given angle (0..180).
 * Returns { name, symbol, maxOrb, orb, weight } or null.
 */
function determineAspect(angle) {
  for (const a of ASPECTS) {
    const orb = Math.abs(angle - a.target);
    if (orb <= a.maxOrb) {
      return { ...a, orb: parseFloat(orb.toFixed(2)) };
    }
  }
  return null;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/**
 * Check if transit planet is applying to natal (small +1h test)
 * date: JS Date (local)
 */
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
 * Calculate transit events (all candidates) for a given calendarDate (local date).
 * Returns an array of events with meta.score, sorted descending (highest score first).
 *
 * Event format (compatible with rendering):
 * {
 *   id: 'transit-YYYYMMDD-transit-natal-aspect',
 *   title: '☉ Sun ☌ natal ♀ Venus',
 *   date: Date (local),
 *   startTime: 0,
 *   endTime: 1440,
 *   color: '#...', // color by aspect
 *   meta: { transitPlanet, natalPlanet, aspect, orb, angle, transitPos, natalPos, score }
 * }
 */
export function getTransitEventsForDate(calendarDate) {
  // load natal chart
  let natal = null;
  try {
    const raw = localStorage.getItem('birthChart');
    if (!raw) return [];
    natal = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse birthChart from localStorage', e);
    return [];
  }

  // sample transit positions at local midday to avoid UTC date shifts
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  const d = calendarDate.getDate();
  const sampleLocal = new Date(y, m, d, 12, 0, 0);

  // compute transit absolute positions for each planet
  const transitPositions = {};
  for (const p of PLANETS) {
    try {
      const pos = calculatePlanetPosition(capitalize(p), sampleLocal);
      transitPositions[p] = pos;
    } catch (e) {
      transitPositions[p] = null;
    }
  }

  const scored = [];

  for (const transitKey of PLANETS) {
    const transitPos = transitPositions[transitKey];
    if (!transitPos || transitPos.absoluteDegree == null) continue;

    for (const natalKey of PLANETS) {
      const natalData = natal[natalKey];
      if (!natalData || natalData.absoluteDegree == null) continue;

      const angle = calculateAngle(transitPos.absoluteDegree, natalData.absoluteDegree);
      const aspect = determineAspect(angle);
      if (!aspect) continue;

      // Scoring components
      const closenessScore = (aspect.maxOrb - aspect.orb) / aspect.maxOrb; // 0..1
      const aspectWeight = aspect.weight || 0.7;
      const impTransit = PLANET_IMPORTANCE[transitKey] || 5;
      const impNatal = PLANET_IMPORTANCE[natalKey] || 5;
      const planetImportanceScore = (impTransit + impNatal) / 20; // 0..1
      const angularBoost = natalData.house && [1,4,7,10].includes(Number(natalData.house)) ? 0.12 : 0;
      const applyingBoost = isApplying(transitKey, natalData.absoluteDegree, sampleLocal) ? 0.05 : 0;

      // Moon damping (reduce prominence for non-exact moon transits)
      const moonMultiplier = (transitKey === 'moon' && aspect.orb > 3) ? 0.5 : 1.0;

      const base = (closenessScore * 0.5) + (aspectWeight * 0.2) + (planetImportanceScore * 0.15) + angularBoost + applyingBoost;
      const finalScore = Math.min(1.0, base) * moonMultiplier;

      const transitSymbol = PLANET_SYMBOLS[transitKey] || '';
      const natalSymbol = PLANET_SYMBOLS[natalKey] || '';
      const title = `${transitSymbol} ${capitalize(transitKey)} ${aspect.symbol} natal ${natalSymbol} ${capitalize(natalKey)}`;

      const id = `transit-${y}${String(m+1).padStart(2,'0')}${String(d).padStart(2,'0')}-${transitKey}-${natalKey}-${aspect.name}`;

      scored.push({
        id,
        title,
        date: new Date(y, m, d, 12, 0, 0),
        startTime: 0,
        endTime: 1440,
        color: aspectColor(aspect.name),
        meta: {
          transitPlanet: transitKey,
          natalPlanet: natalKey,
          aspect: aspect.name,
          symbol: aspect.symbol,
          orb: aspect.orb,
          angle: parseFloat(angle.toFixed(2)),
          transitPos,
          natalPos: natalData,
          score: parseFloat(finalScore.toFixed(4))
        }
      });
    }
  }

  // sort by score desc then by closeness (lower orb)
  scored.sort((a,b) => {
    const sa = a.meta.score || 0;
    const sb = b.meta.score || 0;
    if (sb !== sa) return sb - sa;
    return (a.meta.orb || 0) - (b.meta.orb || 0);
  });

  return scored;
}

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
