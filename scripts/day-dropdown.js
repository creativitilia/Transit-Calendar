// Day dropdown with prioritized transit list, filters and smooth animation
// Fixes: allow immediate scrolling after open + defer heavy computation so UI stays responsive

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate, DEFAULT_TOP_N } from './transit-events.js';

const openPanels = new Set();

function closeAllPanels() {
  for (const panelInfo of Array.from(openPanels)) {
    const { button, panel, container } = panelInfo;
    try {
      if (button) button.setAttribute('aria-expanded', 'false');
      if (panel) {
        panel.style.overflow = 'hidden';
        panel.style.maxHeight = '0px';
        panel.classList.remove('day-dropdown__panel--open');
      }
      if (container) container.classList.remove('day-dropdown__container--open');
    } catch (e) {}
    openPanels.delete(panelInfo);
  }
}

/**
 * Animate panel to its content height and enable scrolling quickly.
 * We:
 *  - hide overflow while adjusting maxHeight to avoid jump
 *  - set maxHeight to scrollHeight
 *  - after a small timeout enable overflow:auto so wheel events work immediately
 *  - as a fallback we also listen for transitionend to ensure overflow is auto
 */
function animatePanelToContent(panel) {
  if (!panel) return;

  // prefer animating max-height
  panel.style.overflow = 'hidden';
  // force reflow and set new height in next frame(s)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });

  // After a short delay (smaller than transition duration) allow scrolling so the user can scroll immediately.
  // This avoids the first wheel being "lost".
  const QUICK_ENABLE_MS = 120; // tuned value (transition is 220ms)
  const enableOverflow = () => {
    try {
      panel.style.overflow = 'auto';
    } catch (e) {}
  };
  const quickTimer = setTimeout(enableOverflow, QUICK_ENABLE_MS);

  // As a robust fallback, ensure overflow:auto after transitionend and clear the quick timer
  function onTransitionEnd(e) {
    if (e.propertyName === 'max-height') {
      clearTimeout(quickTimer);
      enableOverflow();
      panel.removeEventListener('transitionend', onTransitionEnd);
    }
  }
  panel.addEventListener('transitionend', onTransitionEnd);
}

export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'day-dropdown__panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-hidden', 'true');
  // start collapsed via max-height
  panel.style.maxHeight = '0px';
  panel.style.overflow = 'hidden';
  panel.style.transition = 'max-height 220ms ease';

  const header = document.createElement('div');
  header.className = 'day-dropdown__panel-header';
  header.textContent = calendarDay.toDateString();
  panel.appendChild(header);

  // Filters (Planet + Aspect)
  const filterBar = document.createElement('div');
  filterBar.className = 'day-dropdown__filter-bar';

  const planetFilterWrapper = document.createElement('div');
  planetFilterWrapper.className = 'day-dropdown__filter-wrapper';
  const planetLabel = document.createElement('div');
  planetLabel.className = 'day-dropdown__filter-label';
  planetLabel.textContent = 'Planet';
  const transitSelect = document.createElement('select');
  transitSelect.className = 'day-dropdown__filter';
  transitSelect.setAttribute('aria-label', 'Filter by transit planet');
  planetFilterWrapper.appendChild(planetLabel);
  planetFilterWrapper.appendChild(transitSelect);

  const aspectFilterWrapper = document.createElement('div');
  aspectFilterWrapper.className = 'day-dropdown__filter-wrapper';
  const aspectLabel = document.createElement('div');
  aspectLabel.className = 'day-dropdown__filter-label';
  aspectLabel.textContent = 'Aspect';
  const aspectSelect = document.createElement('select');
  aspectSelect.className = 'day-dropdown__filter';
  aspectSelect.setAttribute('aria-label', 'Filter by aspect');
  aspectFilterWrapper.appendChild(aspectLabel);
  aspectFilterWrapper.appendChild(aspectSelect);

  const controlsWrapper = document.createElement('div');
  controlsWrapper.className = 'day-dropdown__controls-small';
  const clearFiltersBtn = document.createElement('button');
  clearFiltersBtn.type = 'button';
  clearFiltersBtn.className = 'day-dropdown__clear-filters';
  clearFiltersBtn.textContent = 'Clear';
  controlsWrapper.appendChild(clearFiltersBtn);

  filterBar.appendChild(planetFilterWrapper);
  filterBar.appendChild(aspectFilterWrapper);
  filterBar.appendChild(controlsWrapper);
  panel.appendChild(filterBar);

  const list = document.createElement('ul');
  list.className = 'day-dropdown__event-list';
  panel.appendChild(list);

  const showAllLink = document.createElement('div');
  showAllLink.className = 'day-dropdown__show-all-link';
  showAllLink.style.display = 'none';
  showAllLink.textContent = 'Show all';
  panel.appendChild(showAllLink);

  const loading = document.createElement('div');
  loading.className = 'day-dropdown__loading';
  loading.textContent = 'Loading...';
  loading.style.display = 'none';
  panel.appendChild(loading);

  const container = document.createElement('div');
  container.className = 'day-dropdown__container';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', `Day ${calendarDay.toDateString()} events`);
  container.appendChild(toggleBtn);
  container.appendChild(panel);
  wrapper.appendChild(container);

  let loaded = false;
  let transitFull = [];
  let transitFiltered = [];
  let showingAll = false;
  const topN = DEFAULT_TOP_N;

  function renderListItems(eventsToShow) {
    list.innerHTML = '';
    if (!eventsToShow || eventsToShow.length === 0) {
      const li = document.createElement('li');
      li.className = 'day-dropdown__empty';
      li.textContent = 'No transit aspects';
      list.appendChild(li);
      return;
    }
    for (const ev of eventsToShow) {
      const li = document.createElement('li');
      li.className = 'day-dropdown__event-list-item';
      initStaticEvent(li, ev);
      list.appendChild(li);
    }
  }

  function applyFiltersAndRender() {
    const tVal = transitSelect.value;
    const aVal = aspectSelect.value;

    transitFiltered = transitFull.filter(ev => {
      const meta = ev.meta || {};
      if (tVal && tVal !== 'all' && meta.transitPlanet !== tVal) return false;
      if (aVal && aVal !== 'all' && meta.aspect !== aVal) return false;
      return true;
    });

    const toShow = showingAll ? transitFiltered : transitFiltered.slice(0, topN);
    renderListItems(toShow);

    if (transitFiltered.length <= topN) {
      showAllLink.style.display = 'none';
    } else {
      showAllLink.style.display = 'block';
      showAllLink.textContent = showingAll ? `Show top ${topN}` : `Show all (${transitFiltered.length})`;
    }
  }

  function populateFilterOptions() {
    const transitSet = new Set();
    const aspectMap = new Map();

    for (const ev of transitFull) {
      const m = ev.meta || {};
      if (m.transitPlanet) transitSet.add(m.transitPlanet);
      if (m.aspect) aspectMap.set(m.aspect, m.symbol || m.aspect);
    }

    transitSelect.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All';
    transitSelect.appendChild(allOpt);
    Array.from(transitSet).sort().forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val[0].toUpperCase() + val.slice(1);
      transitSelect.appendChild(o);
    });

    aspectSelect.innerHTML = '';
    const allA = document.createElement('option');
    allA.value = 'all';
    allA.textContent = 'All';
    aspectSelect.appendChild(allA);
    Array.from(aspectMap.keys()).sort().forEach(name => {
      const o = document.createElement('option');
      o.value = name;
      const sym = aspectMap.get(name) || '';
      o.textContent = `${sym} ${name}`;
      aspectSelect.appendChild(o);
    });
  }

  // Render a fast preview (topN) first and defer heavy full computation so UI remains responsive
  function renderFastPreviewAndAnimate() {
    // Attempt to compute a quick preview from any cached transitFull (if present) or show nothing
    const preview = (transitFull && transitFull.length) ? transitFull.slice(0, topN) : [];
    renderListItems(preview);
    // Animate open and enable scrolling quickly
    panel.classList.add('day-dropdown__panel--open');
    animatePanelToContent(panel);
  }

  async function openPanel() {
    closeAllPanels();

    toggleBtn.setAttribute('aria-expanded', 'true');
    container.classList.add('day-dropdown__container--open');
    openPanels.add({ button: toggleBtn, panel, container });

    if (!loaded) {
      loading.style.display = 'block';
      // We do deferred loading:
      // 1) Render empty/preview and animate so user sees immediate response
      renderFastPreviewAndAnimate();

      // 2) Defer heavy computation to next macrotask so browser can finish animation and process input
      setTimeout(async () => {
        try {
          transitFull = await Promise.resolve(getTransitEventsForDate(calendarDay));
          populateFilterOptions();
          showingAll = false;
          applyFiltersAndRender();
        } catch (err) {
          list.innerHTML = '';
          const li = document.createElement('li');
          li.className = 'day-dropdown__error';
          li.textContent = 'Error loading events';
          list.appendChild(li);
          console.error('Error loading events for day dropdown', err);
        } finally {
          loading.style.display = 'none';
          loaded = true;
          // Animate to final content height after list update (also enables scrolling)
          animatePanelToContent(panel);
        }
      }, 60); // small delay to yield to the browser (60ms)
    } else {
      applyFiltersAndRender();
      animatePanelToContent(panel);
    }

    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    panel.classList.remove('day-dropdown__panel--open');
    panel.setAttribute('aria-hidden', 'true');
    container.classList.remove('day-dropdown__container--open');

    for (const info of Array.from(openPanels)) {
      if (info.panel === panel) openPanels.delete(info);
    }
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  // Handlers
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closePanel();
    else openPanel();
  });

  toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  document.addEventListener('click', (event) => {
    if (!container.contains(event.target)) {
      if (panel.classList.contains('day-dropdown__panel--open')) closePanel();
    }
  });

  transitSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    // animate to new height
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = panel.scrollHeight + 'px';
    animatePanelToContent(panel);
  });

  aspectSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = panel.scrollHeight + 'px';
    animatePanelToContent(panel);
  });

  showAllLink.addEventListener('click', () => {
    showingAll = !showingAll;
    applyFiltersAndRender();
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = panel.scrollHeight + 'px';
    animatePanelToContent(panel);
  });

  clearFiltersBtn.addEventListener('click', () => {
    transitSelect.value = 'all';
    aspectSelect.value = 'all';
    showingAll = false;
    applyFiltersAndRender();
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = panel.scrollHeight + 'px';
    animatePanelToContent(panel);
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
      toggleBtn.focus();
    }
  });
}
