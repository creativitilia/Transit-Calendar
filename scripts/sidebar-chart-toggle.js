// Sidebar toggle: add Birth / Current buttons and handle switching
// Requires: displayBirthChart, displayCurrentChart, getLastBirthChart and calculateCurrentChart

import { displayBirthChart, displayCurrentChart, getLastBirthChart } from './birth-chart-display.js';
import { calculateCurrentChart } from './current-chart.js';

export function initSidebarChartToggle() {
  const header = document.querySelector('.birth-chart-display__header');
  if (!header) return;

  // create a small control group if not already present
  let controls = header.querySelector('.birth-chart-display__controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'birth-chart-display__controls';
    controls.style.marginLeft = 'auto';
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    header.appendChild(controls);
  }

  // Add buttons (if they don't already exist)
  if (!controls.querySelector('[data-chart-toggle="birth"]')) {
    const birthBtn = document.createElement('button');
    birthBtn.type = 'button';
    birthBtn.className = 'button button--sm button--secondary';
    birthBtn.dataset.chartToggle = 'birth';
    birthBtn.textContent = 'Birth';
    controls.appendChild(birthBtn);

    const currentBtn = document.createElement('button');
    currentBtn.type = 'button';
    currentBtn.className = 'button button--sm';
    currentBtn.dataset.chartToggle = 'current';
    currentBtn.textContent = 'Current';
    controls.appendChild(currentBtn);

    // initial active style
    setActive('birth');

    // listeners
    birthBtn.addEventListener('click', () => {
      setActive('birth');
      const natal = getLastBirthChart();
      if (natal) {
        displayBirthChart(natal);
      } else {
        // nothing to show
        console.warn('No birth chart available to display.');
      }
    });

    currentBtn.addEventListener('click', async () => {
      setActive('current');
      const natal = getLastBirthChart();
      if (!natal) {
        // show message in sidebar
        const container = document.querySelector('[data-birth-chart-content]');
        if (container) container.innerHTML = '<p class="birth-chart-display__empty">No birth chart available — create one first to compute current chart for a person.</p>';
        return;
      }

      // Use natal latitude/longitude to compute current chart for the same person
      const lat = natal.metadata?.latitude;
      const lon = natal.metadata?.longitude;
      if (lat == null || lon == null) {
        const container = document.querySelector('[data-birth-chart-content]');
        if (container) container.innerHTML = '<p class="birth-chart-display__empty">No location available for this person to compute the current chart.</p>';
        return;
      }

      try {
        const currentChart = await calculateCurrentChart(lat, lon, new Date());
        displayCurrentChart(currentChart, 'Current Chart');
      } catch (err) {
        console.error('Failed to calculate current chart:', err);
        const container = document.querySelector('[data-birth-chart-content]');
        if (container) container.innerHTML = '<p class="birth-chart-display__empty">Failed to calculate current chart.</p>';
      }
    });
  }

  function setActive(which) {
    const b = controls.querySelector('[data-chart-toggle="birth"]');
    const c = controls.querySelector('[data-chart-toggle="current"]');
    if (b) {
      b.classList.toggle('button--secondary', which === 'birth');
      b.classList.toggle('button--primary', which === 'birth');
    }
    if (c) {
      c.classList.toggle('button--secondary', which === 'current');
      c.classList.toggle('button--primary', which === 'current');
    }
  }
}

console.log('🧭 Sidebar chart toggle module loaded');
