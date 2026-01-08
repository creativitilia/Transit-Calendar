// Day dropdown: absolute overlay panel that expands into available white space (prefers right)
// - Panel appended to document.body so it can overlay calendar white space (not in-flow)
// - Computes best placement (right/left), clamps width/height to available space
// - Smooth expand/collapse (max-height animation) and enables scrolling
// - Keeps filters (Planet & Aspect), prioritized top N, "Show all" link

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate, DEFAULT_TOP_N } from './transit-events.js';

const openPanels = new Set();

function closeAllPanels() {
  for (const info of Array.from(openPanels)) {
    try {
      const { button, panel } = info;
      if (button) button.setAttribute('aria-expanded', 'false');
      if (panel) {
        panel.style.maxHeight = '0px';
        panel.classList.remove('day-dropdown__panel--open');
        panel.classList.remove('day-dropdown__panel--fullscreen');
        panel.style.visibility = 'hidden';
      }
    } catch (e) {}
    openPanels.delete(info);
  }
}

function animatePanelToContent(panel) {
  if (!panel) return;
  panel.style.overflow = 'hidden';
  // apply the full height on next frames so CSS transition runs
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });

  // enable scrolling quickly so wheel events aren't lost
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

/**
 * Position overlay panel (absolute, appended to body).
 * Prefers placing to the right of the pill. If not enough width, tries left.
 * Top is set to align the panel near the top of the calendar white area (not anchored to pill row).
 * The panel width/height is clamped to available screen area.
 *
 * Inputs:
 *  - buttonEl: the pill button DOM element
 *  - panelEl: the panel DOM element (already attached to body)
 *  - desiredWidth: desired width in px
 *  - desiredMaxHeight: desired max height in px
 */
function positionOverlayPanel(buttonEl, panelEl, desiredWidth = 360, desiredMaxHeight = 420) {
  const calendarList = document.querySelector('.month-calendar__day-list') || document.querySelector('.month-calendar');
  const calendarRect = calendarList ? calendarList.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  const btnRect = buttonEl.getBoundingClientRect();

  // compute available space to the right and left within calendar area (with small margin)
  const margin = 12;
  const availableRight = Math.max(0, calendarRect.right - btnRect.right - margin);
  const availableLeft = Math.max(0, btnRect.left - calendarRect.left - margin);

  // choose width: prefer desiredWidth but clamp to available space or viewport width
  let width = Math.min(desiredWidth, window.innerWidth - 2 * margin);
  let placeRight = true;
  if (availableRight >= desiredWidth) {
    placeRight = true;
    width = Math.min(desiredWidth, availableRight);
  } else if (availableLeft >= desiredWidth) {
    placeRight = false;
    width = Math.min(desiredWidth, availableLeft);
  } else {
    // nowhere large enough for desiredWidth: pick the side with more room
    if (availableRight >= availableLeft) {
      placeRight = true;
      width = Math.max(Math.min(availableRight, width), 180);
    } else {
      placeRight = false;
      width = Math.max(Math.min(availableLeft, width), 180);
    }
  }

  // Determine top: place the panel near the top of the calendar list area so it sits on white space
  const topMargin = 12;
  const top = Math.max(calendarRect.top + topMargin, btnRect.top - 8);

  // Determine max available height below top within viewport and calendar
  const bottomLimit = Math.min(window.innerHeight - margin, calendarRect.bottom - margin);
  let maxHeight = Math.max(80, bottomLimit - top);
  maxHeight = Math.min(maxHeight, desiredMaxHeight);

  // set panel style positions
  panelEl.style.position = 'fixed';
  panelEl.style.width = width + 'px';
  panelEl.style.maxHeight = '0px'; // start collapsed
  panelEl.style.height = 'auto';
  panelEl.style.left = placeRight ? (btnRect.right + margin) + 'px' : 'auto';
  panelEl.style.right = placeRight ? 'auto' : (window.innerWidth - btnRect.left + margin) + 'px';
  panelEl.style.top = top + 'px';
  panelEl.dataset.desiredMaxHeight = String(maxHeight);
  // ensure visibility
  panelEl.style.visibility = 'visible';
}

/**
 * Create a reusable panel element appended to document.body
 * Returns { panel, headerEl, listEl, transitSelect, aspectSelect, showAllLink, loadingEl }
 */
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

  // header
  const header = document.createElement('div');
  header.className = 'day-dropdown__panel-header';
  panel.appendChild(header);

  // filter bar
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

  // list
  const list = document.createElement('ul');
  list.className = 'day-dropdown__event-list';
  panel.appendChild(list);

  // show all link
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

export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  // remove default event list in-cell
  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // pill button inside cell
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');
  // attach pill into wrapper
  wrapper.appendChild(toggleBtn);

  // create overlay panel (appended to body)
  const {
    panel, header, list, transitSelect, aspectSelect, showAllLink, loading, clearBtn
  } = createOverlayPanelStructure();

  // State
  let loaded = false;
  let transitFull = [];
  let transitFiltered = [];
  let showingAll = false;
  const topN = DEFAULT_TOP_N;

  // event rendering
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

    // transit select
    transitSelect.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'All';
    transitSelect.appendChild(optAll);
    Array.from(transitSet).sort().forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val[0].toUpperCase() + val.slice(1);
      transitSelect.appendChild(o);
    });

    // aspect select
    aspectSelect.innerHTML = '';
    const aAll = document.createElement('option');
    aAll.value = 'all';
    aAll.textContent = 'All';
    aspectSelect.appendChild(aAll);
    Array.from(aspectMap.keys()).sort().forEach(name => {
      const o = document.createElement('option');
      o.value = name;
      const sym = aspectMap.get(name) || '';
      o.textContent = `${sym} ${name}`;
      aspectSelect.appendChild(o);
    });
  }

  // Render quick preview (empty or cached) and show immediate open animation
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

    // position panel relative to button + calendar
    positionOverlayPanel(toggleBtn, panel);

    // show immediate preview & animation
    renderFastPreviewAndAnimate();
    animatePanelToContent(panel);

    // defer heavy compute slightly to let animation start
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
        // clamp panel height to available max (dataset set by positionOverlayPanel)
        const maxH = parseInt(panel.dataset.desiredMaxHeight || '420', 10);
        if (panel.scrollHeight > maxH) {
          panel.style.maxHeight = maxH + 'px';
          panel.style.overflow = 'auto';
        } else {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          panel.style.overflow = 'auto';
        }
        // ensure panel visible (in case positioning changed)
        panel.style.visibility = 'visible';
        openPanels.add({ button: toggleBtn, panel });
      }
    }, 40);
  }

  function closePanel() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    panel.classList.remove('day-dropdown__panel--open');
    panel.classList.remove('day-dropdown__panel--fullscreen');
    panel.style.visibility = 'hidden';
    panel.setAttribute('aria-hidden', 'true');

    for (const info of Array.from(openPanels)) {
      if (info.panel === panel) openPanels.delete(info);
    }
  }

  // handlers
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closePanel();
    else openPanel();
  });

  // stop clicks propagating to parent wrapper (which creates events)
  toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // panel-level event handling (stop propagation so clicks don't create event)
  panel.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  // outside click closes panel
  document.addEventListener('click', (event) => {
    if (panel && !panel.contains(event.target) && event.target !== toggleBtn) {
      if (panel.classList.contains('day-dropdown__panel--open')) closePanel();
    }
  });

  transitSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    // animate to new height if needed
    animatePanelToContent(panel);
  });
  aspectSelect.addEventListener('change', () => {
    showingAll = false;
    applyFiltersAndRender();
    animatePanelToContent(panel);
  });

  showAllLink.addEventListener('click', () => {
    showingAll = !showingAll;
    applyFiltersAndRender();
    // after changing content, ensure panel height available and animate
    animatePanelToContent(panel);
  });

  clearBtn.addEventListener('click', () => {
    transitSelect.value = 'all';
    aspectSelect.value = 'all';
    showingAll = false;
    applyFiltersAndRender();
    animatePanelToContent(panel);
  });

  // keyboard
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
}