// ============================================
// BIRTH CHART DISPLAY (updated to support Current Chart display)
// Displays birth chart or current chart in the sidebar
// ============================================

import { PLANET_SYMBOLS, ZODIAC_SYMBOLS } from './astrology-core.js';

// Keep the last birth chart shown so the toggle can compute a "current chart" for the same person
let lastBirthChart = null;

/**
 * Display birth chart in the sidebar
 * @param {object} chart - Birth chart data from calculateBirthChart()
 */
export function displayBirthChart(chart) {
  lastBirthChart = chart; // save for later
  renderChartIntoSidebar(chart, 'Birth Chart');
}

/**
 * Display a current/transit-style chart in the same sidebar UI.
 * Reuses the same rendering code so the look matches the birth chart list.
 * @param {object} chart - Chart data produced by calculateCurrentChart()
 *                         (should include planet keys like chart.sun, chart.moon, etc.)
 * @param {string} title - Optional title (defaults to "Current Chart")
 */
export function displayCurrentChart(chart, title = 'Current Chart') {
  renderChartIntoSidebar(chart, title);
}

/**
 * Return the last saved birth chart (or null)
 */
export function getLastBirthChart() {
  return lastBirthChart;
}

/**
 * Core rendering function used by both displayBirthChart and displayCurrentChart.
 */
function renderChartIntoSidebar(chart, title) {
  const container = document.querySelector('[data-birth-chart-content]');
  const headerTitleElement = document.querySelector('.birth-chart-display__title');

  if (headerTitleElement) {
    headerTitleElement.textContent = title;
  }

  if (!container) {
    console.error('❌ Birth chart display container not found');
    return;
  }

  if (!chart || !chart.sun) {
    container.innerHTML = '<p class="birth-chart-display__empty">No chart data available</p>';
    return;
  }

  // Build the planet list
  const planets = [
    { name: 'Sun', symbol: PLANET_SYMBOLS.sun, data: chart.sun },
    { name: 'Moon', symbol: PLANET_SYMBOLS.moon, data: chart.moon },
    { name: 'Mercury', symbol: PLANET_SYMBOLS.mercury, data: chart.mercury },
    { name: 'Venus', symbol: PLANET_SYMBOLS.venus, data: chart.venus },
    { name: 'Mars', symbol: PLANET_SYMBOLS.mars, data: chart.mars },
    { name: 'Jupiter', symbol: PLANET_SYMBOLS.jupiter, data: chart.jupiter },
    { name: 'Saturn', symbol: PLANET_SYMBOLS.saturn, data: chart.saturn },
    { name: 'Uranus', symbol: PLANET_SYMBOLS.uranus, data: chart.uranus },
    { name: 'Neptune', symbol: PLANET_SYMBOLS.neptune, data: chart.neptune },
    { name: 'Pluto', symbol: PLANET_SYMBOLS.pluto, data: chart.pluto },
    { name: 'Ascendant', symbol: '⬆', data: chart.ascendant, isAngle: true },
    { name: 'Midheaven', symbol: '⬆', data: chart.midheaven, isAngle: true }
  ];

  // Generate HTML
  let html = '<ul class="birth-chart-list">';

  for (const planet of planets) {
    if (!planet.data) continue;

    const zodiacSymbol = ZODIAC_SYMBOLS[planet.data.sign] || '';
    const house = planet.data.house || (planet.isAngle ? '—' : '?');
    const houseText = planet.isAngle ? '' : `${house}${getOrdinalSuffix(house)}`;

    html += `
      <li class="birth-chart-list__item">
        <span class="birth-chart-list__symbol" title="${planet.name}">${planet.symbol}</span>
        <span class="birth-chart-list__name">${planet.name}</span>
        <span class="birth-chart-list__position">${planet.data.degree}° ${planet.data.sign}</span>
        <span class="birth-chart-list__house">${houseText}</span>
        <span class="birth-chart-list__zodiac">${zodiacSymbol}</span>
      </li>
    `;
  }

  html += '</ul>';

  container.innerHTML = html;
  console.log(`✨ ${title} displayed in sidebar`);
}

/**
 * Get ordinal suffix for house numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  if (num === '—' || num === '?') return '';

  const n = parseInt(num);
  if (isNaN(n)) return '';

  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

console.log('📊 Birth Chart Display module loaded! ');
