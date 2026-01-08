// Day dropdown: absolute overlay panel + "All aspects" right-side drawer.
// - Click pill to open overlay (small prioritized list).
// - Click "Show all" to open the right-side drawer showing the full list with same filters.

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate, DEFAULT_TOP_N } from './transit-events.js';

const openPanels = new Set();
let openAllDrawer = null; // reference to currently open right drawer (only one allowed)

/* Utility to close any open pill overlay panels */
function closeAllPanels() {
  for (const info of Array.from(openPanels)) {
    try {
      const { button, panel } = info;
      if (button) button.setAttribute('aria-expanded', 'false');
      if (panel) {
        panel.style.maxHeight = '0px';
        panel.classList.remove('day-dropdown__panel--open');
        panel.style.visibility = 'hidden';
      }
    } catch (e) {}
    openPanels.delete(info);
  }
}

/* Animate panel to content; enable quick scrolling */
function animatePanelToContent(panel) {
  if (!panel) return;
  panel.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });
  const QUICK_ENABLE_MS = 120;
  const quickTimer = setTimeout(() => {
    panel.style.overflow = 'auto';
  }, QUICK_ENABLE_MS);
  const onTransition = (e) => {
    if (e.propertyName === 'max-height') {
      clearTimeout(quickTimer);
      panel.style.overflow = 'auto';
      panel.removeEventListener('transitionend', onTransition);
    }
  };
  panel.addEventListener('transitionend', onTransition);
}

/* Create overlay panel structure (attached to body) */
function createOverlayPanelStructure() {
  const panel = document.createElement('div');
  panel.className = 'day-dropdown__panel overlay';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.visibility = 'hidden';
  panel.style.maxHeight = '0px';
  panel.style.overflow = 'hidden';
  panel.style.transition = 'max-height 220ms ease, width 120ms ease';
  panel.style.zIndex = 1400;

  const header = document.createElement('div');
  header.className = 'day-dropdown__panel-header';
  panel.appendChild(header);

  const filterBar = document.createElement('div');
  filterBar.className = 'day-dropdown__filter-bar';

  const planetWrapper = document.createElement('div');
  planetWrapper.className = 'day-dropdown__filter-wrapper';
  const planetLabel = document.createElement('div');
  planetLabel.className = 'day-dropdown__filter-label';
  planetLabel.textContent = 'Planet';
  const transitSelect = document.createElement('select');
  transitSelect.className = 'day-dropdown__filter';
  planetWrapper.appendChild(planetLabel);
  planetWrapper.appendChild(transitSelect);

  const aspectWrapper = document.createElement('div');
  aspectWrapper.className = 'day-dropdown__filter-wrapper';
  const aspectLabel = document.createElement('div');
  aspectLabel.className = 'day-dropdown__filter-label';
  aspectLabel.textContent = 'Aspect';
  const aspectSelect = document.createElement('select');
  aspectSelect.className = 'day-dropdown__filter';
  aspectWrapper.appendChild(aspectLabel);
  aspectWrapper.appendChild(aspectSelect);

  const controls = document.createElement('div');
  controls.className = 'day-dropdown__controls-small';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'day-dropdown__clear-filters';
  clearBtn.textContent = 'Clear';
  controls.appendChild(clearBtn);

  filterBar.appendChild(planetWrapper);
  filterBar.appendChild(aspectWrapper);
  filterBar.appendChild(controls);
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

  document.body.appendChild(panel);
  return { panel, header, list, transitSelect, aspectSelect, showAllLink, loading, clearBtn };
}

/* Create right-side drawer structure (full list) */
function createAllDrawerStructure() {
  const drawer = document.createElement('div');
  drawer.className = 'day-dropdown__all-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.style.zIndex = 1500;

  const inner = document.createElement('div');
  inner.className = 'day-dropdown__all-drawer-inner';

  const header = document.createElement('div');
  header.className = 'day-dropdown__all-drawer-header';

  const title = document.createElement('div');
  title.className = 'day-dropdown__all-drawer-title';
  title.textContent = 'All aspects';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'day-dropdown__all-drawer-close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Filters area (reuse same small UI)
  const filterBar = document.createElement('div');
  filterBar.className = 'day-dropdown__filter-bar day-dropdown__filter-bar--drawer';

  const planetWrapper = document.createElement('div');
  planetWrapper.className = 'day-dropdown__filter-wrapper';
  const planetLabel = document.createElement('div');
  planetLabel.className = 'day-dropdown__filter-label';
  planetLabel.textContent = 'Planet';
  const transitSelect = document.createElement('select');
  transitSelect.className = 'day-dropdown__filter';
  planetWrapper.appendChild(planetLabel);
  planetWrapper.appendChild(transitSelect);

  const aspectWrapper = document.createElement('div');
  aspectWrapper.className = 'day-dropdown__filter-wrapper';
  const aspectLabel = document.createElement('div');
  aspectLabel.className = 'day-dropdown__filter-label';
  aspectLabel.textContent = 'Aspect';
  const aspectSelect = document.createElement('select');
  aspectSelect.className = 'day-dropdown__filter';
  aspectWrapper.appendChild(aspectLabel);
  aspectWrapper.appendChild(aspectSelect);

  const controls = document.createElement('div');
  controls.className = 'day-dropdown__controls-small';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'day-dropdown__clear-filters';
  clearBtn.textContent = 'Clear';
  controls.appendChild(clearBtn);

  filterBar.appendChild(planetWrapper);
  filterBar.appendChild(aspectWrapper);
  filterBar.appendChild(controls);

  const list = document.createElement('ul');
  list.className = 'day-dropdown__all-list';

  inner.appendChild(header);
  inner.appendChild(filterBar);
  inner.appendChild(list);
  drawer.appendChild(inner);

  document.body.appendChild(drawer);
  return { drawer, closeBtn, transitSelect, aspectSelect, clearBtn, list, title };
}

/* Position overlay next to pill; prefer right if space */
function positionOverlayPanel(buttonEl, panelEl, desiredWidth = 360, desiredMaxHeight = 420) {
  const calendarList = document.querySelector('.month-calendar__day-list') || document.querySelector('.month-calendar');
  const calendarRect = calendarList ? calendarList.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  const btnRect = buttonEl.getBoundingClientRect();
  const margin = 12;
  const availableRight = Math.max(0, calendarRect.right - btnRect.right - margin);
  const availableLeft = Math.max(0, btnRect.left - calendarRect.left - margin);

  let width = Math.min(desiredWidth, window.innerWidth - 2 * margin);
  let placeRight = true;
  if (availableRight >= desiredWidth) {
    placeRight = true;
    width = Math.min(desiredWidth, availableRight);
  } else if (availableLeft >= desiredWidth) {
    placeRight = false;
    width = Math.min(desiredWidth, availableLeft);
  } else {
    if (availableRight >= availableLeft) {
      placeRight = true;
      width = Math.max(Math.min(availableRight, width), 180);
    } else {
      placeRight = false;
      width = Math.max(Math.min(availableLeft, width), 180);
    }
  }

  const topMargin = 12;
  const top = Math.max(calendarRect.top + topMargin, btnRect.top - 8);
  const bottomLimit = Math.min(window.innerHeight - margin, calendarRect.bottom - margin);
  let maxHeight = Math.max(80, bottomLimit - top);
  maxHeight = Math.min(maxHeight, desiredMaxHeight);

  panelEl.style.position = 'fixed';
  panelEl.style.width = width + 'px';
  panelEl.style.maxHeight = '0px';
  panelEl.style.height = 'auto';
  panelEl.style.left = placeRight ? (btnRect.right + margin) + 'px' : 'auto';
  panelEl.style.right = placeRight ? 'auto' : (window.innerWidth - btnRect.left + margin) + 'px';
  panelEl.style.top = top + 'px';
  panelEl.dataset.desiredMaxHeight = String(maxHeight);
  panelEl.style.visibility = 'visible';
}

/* attachDayDropdown: main entrypoint (used by month-calendar.js) */
export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // pill in-cell
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(toggleBtn);

  // overlay components
  const { panel, header, list, transitSelect, aspectSelect, showAllLink, loading, clearBtn } = createOverlayPanelStructure();

  // drawer will be created when needed (not per-pill)
  let drawerRef = null;

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

  function renderFastPreviewAndAnimate() {
    const preview = (transitFull && transitFull.length) ? transitFull.slice(0, topN) : [];
    list.innerHTML = '';
    if (!preview || preview.length === 0) {
      const li = document.createElement('li');
      li.className = 'day-dropdown__empty';
      li.textContent = 'Loading...';
      list.appendChild(li);
    } else {
      for (const ev of preview) {
        const li = document.createElement('li');
        li.className = 'day-dropdown__event-list-item';
        initStaticEvent(li, ev);
        list.appendChild(li);
      }
    }
    panel.classList.add('day-dropdown__panel--open');
  }

  async function openPanel() {
    closeAllPanels();
    toggleBtn.setAttribute('aria-expanded', 'true');
    header.textContent = calendarDay.toDateString();
    panel.setAttribute('aria-hidden', 'false');

    positionOverlayPanel(toggleBtn, panel);

    renderFastPreviewAndAnimate();
    animatePanelToContent(panel);

    // Defer heavy compute
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
        loaded = true;
        // clamp max height to available space if dataset set
        const maxH = parseInt(panel.dataset.desiredMaxHeight || '420', 10);
        if (panel.scrollHeight > maxH) {
          panel.style.maxHeight = maxH + 'px';
          panel.style.overflow = 'auto';
        } else {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          panel.style.overflow = 'auto';
        }
        openPanels.add({ button: toggleBtn, panel });
      }
    }, 40);
  }

  function closePanel() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    panel.classList.remove('day-dropdown__panel--open');
    panel.style.visibility = 'hidden';
    panel.setAttribute('aria-hidden', 'true');
    for (const info of Array.from(openPanels)) {
      if (info.panel === panel) openPanels.delete(info);
    }
  }

  // Open right-side drawer showing full list (with filters) when user clicks "Show all"
  function openAllDrawerForDay() {
    // if drawer already open, close it first
    if (openAllDrawer) {
      closeAllDrawers();
    }

    const { drawer, closeBtn, transitSelect: pSelect, aspectSelect: aSelect, clearBtn, list: allList, title } = createAllDrawerStructure();
    openAllDrawer = { drawer, closeBtn, pSelect, aSelect, clearBtn, allList, title };

    title.textContent = `All aspects — ${calendarDay.toDateString()}`;

    // populate filters in drawer from transitFull
    const transitSet = new Set();
    const aspectMap = new Map();
    for (const ev of transitFull) {
      const m = ev.meta || {};
      if (m.transitPlanet) transitSet.add(m.transitPlanet);
      if (m.aspect) aspectMap.set(m.aspect, m.symbol || m.aspect);
    }

    // fill selects
    pSelect.innerHTML = '';
    const allP = document.createElement('option'); allP.value = 'all'; allP.textContent = 'All'; pSelect.appendChild(allP);
    Array.from(transitSet).sort().forEach(val => {
      const o = document.createElement('option'); o.value = val; o.textContent = val[0].toUpperCase()+val.slice(1); pSelect.appendChild(o);
    });

    aSelect.innerHTML = '';
    const allA = document.createElement('option'); allA.value = 'all'; allA.textContent = 'All'; aSelect.appendChild(allA);
    Array.from(aspectMap.keys()).sort().forEach(name => {
      const o = document.createElement('option'); o.value = name; o.textContent = `${aspectMap.get(name) || ''} ${name}`; aSelect.appendChild(o);
    });

    // set selects initial values to mirror overlay selects if present
    try { pSelect.value = transitSelect.value || 'all'; } catch(e){}
    try { aSelect.value = aspectSelect.value || 'all'; } catch(e){}

    // function to apply drawer filters and render complete list
    function applyDrawerFiltersAndRender() {
      const tVal = pSelect.value;
      const aVal = aSelect.value;
      const filtered = transitFull.filter(ev => {
        const m = ev.meta || {};
        if (tVal && tVal !== 'all' && m.transitPlanet !== tVal) return false;
        if (aVal && aVal !== 'all' && m.aspect !== aVal) return false;
        return true;
      });
      // render all filtered items (full list)
      allList.innerHTML = '';
      if (!filtered || filtered.length === 0) {
        const li = document.createElement('li'); li.className = 'day-dropdown__empty'; li.textContent = 'No transit aspects'; allList.appendChild(li);
      } else {
        for (const ev of filtered) {
          const li = document.createElement('li'); li.className = 'day-dropdown__event-list-item'; initStaticEvent(li, ev); allList.appendChild(li);
        }
      }
    }

    // initial render
    applyDrawerFiltersAndRender();

    // show drawer by adding class
    drawer.classList.add('day-dropdown__all-drawer--open');

    // event handlers
    closeBtn.addEventListener('click', closeAllDrawers);
    pSelect.addEventListener('change', () => {
      // mirror selection back to overlay transitSelect
      try { transitSelect.value = pSelect.value; } catch(e){}
      applyDrawerFiltersAndRender();
    });
    aSelect.addEventListener('change', () => {
      try { aspectSelect.value = aSelect.value; } catch(e){}
      applyDrawerFiltersAndRender();
    });
    clearBtn.addEventListener('click', () => {
      pSelect.value = 'all'; aSelect.value = 'all';
      try { transitSelect.value = 'all'; aspectSelect.value = 'all'; } catch(e){}
      applyDrawerFiltersAndRender();
    });

    // ESC to close
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllDrawers();
    });

    // Add overlay close when clicking outside drawer area
    setTimeout(() => {
      document.addEventListener('click', handleDocClickForDrawer);
    }, 0);
  }

  function handleDocClickForDrawer(e) {
    if (!openAllDrawer) return;
    const { drawer } = openAllDrawer;
    if (!drawer.contains(e.target)) {
      closeAllDrawers();
    }
  }

  function closeAllDrawers() {
    if (!openAllDrawer) return;
    const { drawer } = openAllDrawer;
    try {
      drawer.parentNode.removeChild(drawer);
    } catch (e){}
    openAllDrawer = null;
    document.removeEventListener('click', handleDocClickForDrawer);
  }

  // handlers for overlay
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
    if (panel && !panel.contains(event.target) && event.target !== toggleBtn) {
      if (panel.classList.contains('day-dropdown__panel--open')) closePanel();
    }
  });

  transitSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    animatePanelToContent(panel);
  });
  aspectSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    animatePanelToContent(panel);
  });

  // Show all now opens the right-side drawer (not toggling inline)
  showAllLink.addEventListener('click', () => {
    // ensure transitFull is available (if not, compute quickly)
    if (!loaded) {
      // compute then open drawer
      loading.style.display = 'block';
      getTransitEventsForDate(calendarDay).then((res) => {
        transitFull = res || [];
        loading.style.display = 'none';
        loaded = true;
        populateFilterOptions();
        applyFiltersAndRender();
        openAllDrawerForDay();
      }).catch((err) => {
        loading.style.display = 'none';
        console.error(err);
      });
    } else {
      openAllDrawerForDay();
    }
  });

  clearBtn.addEventListener('click', () => {
    transitSelect.value = 'all';
    aspectSelect.value = 'all';
    showingAll = false;
    applyFiltersAndRender();
    animatePanelToContent(panel);
  });

  // keyboard escape for overlay panel
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
}