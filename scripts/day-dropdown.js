// Day dropdown that inserts a full-width panel-row after the week row
// - Panel-row spans entire calendar width (grid column 1 / -1), pushes rows down.
// - Per-day panels show the prioritized top-N transit aspects and a "Show all" link.
// - Filters removed from per-day panels; the right-side drawer still contains filters.

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate, DEFAULT_TOP_N } from './transit-events.js';

let activePanelRow = null; // the currently-open panel-row element
let openAllDrawer = null;  // the right-side drawer (if opened)

// Close any existing panel-row
function closeActivePanelRow() {
  if (activePanelRow && activePanelRow.parentNode) {
    activePanelRow.parentNode.removeChild(activePanelRow);
    activePanelRow = null;
  }
}

// Close right drawer if open
function closeAllDrawers() {
  if (!openAllDrawer) return;
  const { drawer } = openAllDrawer;
  try { drawer.parentNode.removeChild(drawer); } catch (e) {}
  openAllDrawer = null;
  document.removeEventListener('click', onDocClickForDrawer);
}

function onDocClickForDrawer(e) {
  if (!openAllDrawer) return;
  const { drawer } = openAllDrawer;
  if (!drawer.contains(e.target)) closeAllDrawers();
}

// Create the right-side drawer (full aspects with filters)
function createAllDrawerStructure() {
  const drawer = document.createElement('div');
  drawer.className = 'day-dropdown__all-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');

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

// Helper to render event items into a given UL element
function renderEventsIntoList(listEl, events) {
  listEl.innerHTML = '';
  if (!events || events.length === 0) {
    const li = document.createElement('li');
    li.className = 'day-dropdown__empty';
    li.textContent = 'No transit aspects';
    listEl.appendChild(li);
    return;
  }
  for (const ev of events) {
    const li = document.createElement('li');
    li.className = 'day-dropdown__event-list-item';
    initStaticEvent(li, ev);
    listEl.appendChild(li);
  }
}

/**
 * Main exported function
 * calendarDayElement: <li class="month-calendar__day"> for that date
 * calendarDay: Date object for that cell
 * eventStore: used previously (kept for parity)
 */
export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  // Remove any default event list inside cell
  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // Create pill button and append into wrapper
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(toggleBtn);

  // Panel row state (will be created on open)
  let panelRow = null;
  let panelList = null;
  let panelHeader = null;
  let panelShowAllLink = null;
  let transitFull = [];
  let loaded = false;
  const topN = DEFAULT_TOP_N;

  // Create & insert panel-row after the week row of this day
  function insertPanelRow() {
    // locate month grid list and find index
    const dayList = document.querySelector('.month-calendar__day-list');
    const cells = Array.from(dayList.querySelectorAll('.month-calendar__day'));
    const idx = cells.indexOf(calendarDayElement);
    if (idx === -1) return;

    const row = Math.floor(idx / 7);
    const insertIndex = (row + 1) * 7; // place panel-row after that week

    // Create the panel-row (li) that spans full grid width
    panelRow = document.createElement('li');
    panelRow.className = 'month-calendar__panel-row';
    panelRow.style.gridColumn = '1 / -1';

    // create inner panel container (visual card)
    const panel = document.createElement('div');
    panel.className = 'day-dropdown__panel panel-row';
    // header
    panelHeader = document.createElement('div');
    panelHeader.className = 'day-dropdown__panel-header';
    panelHeader.textContent = calendarDay.toDateString();
    panel.appendChild(panelHeader);

    // list (where events will be rendered)
    panelList = document.createElement('ul');
    panelList.className = 'day-dropdown__event-list';
    panel.appendChild(panelList);

    // show all link
    panelShowAllLink = document.createElement('div');
    panelShowAllLink.className = 'day-dropdown__show-all-link';
    panelShowAllLink.style.display = 'none';
    panelShowAllLink.textContent = 'Show all';
    panel.appendChild(panelShowAllLink);

    panelRow.appendChild(panel);

    const dayListChildren = dayList.children;
    if (insertIndex >= dayListChildren.length) dayList.appendChild(panelRow);
    else dayList.insertBefore(panelRow, dayListChildren[insertIndex]);
  }

  function removePanelRow() {
    if (panelRow && panelRow.parentNode) {
      panelRow.parentNode.removeChild(panelRow);
      panelRow = null;
      panelList = null;
      panelHeader = null;
      panelShowAllLink = null;
    }
  }

  // animate in-flow panel: open/close using max-height
  function animatePanelOpen() {
    if (!panelRow) return;
    const panel = panelRow.querySelector('.day-dropdown__panel.panel-row');
    if (!panel) return;
    panel.style.maxHeight = '0px';
    panel.style.overflow = 'hidden';
    // Wait a frame then set to scrollHeight so CSS transitions run
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.maxHeight = Math.min(panel.scrollHeight, 520) + 'px';
      });
    });
    // enable scrolling after a short delay
    setTimeout(() => { panel.style.overflow = 'auto'; }, 140);
  }

  function animatePanelClose() {
    if (!panelRow) return;
    const panel = panelRow.querySelector('.day-dropdown__panel.panel-row');
    if (!panel) return;
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
  }

  // apply simple rendering: topN preview or all (no filters here)
  function renderPanelContent() {
    if (!panelList) return;
    const toShow = transitFull ? transitFull.slice(0, topN) : [];
    renderEventsIntoList(panelList, toShow);
    if (!transitFull || transitFull.length <= topN) panelShowAllLink.style.display = 'none';
    else {
      panelShowAllLink.style.display = 'block';
      panelShowAllLink.textContent = `Show all (${transitFull.length})`;
    }
  }

  async function openPanel() {
    // close other panels/drawers first
    closeActivePanelRow();
    closeAllDrawers();

    toggleBtn.setAttribute('aria-expanded', 'true');
    insertPanelRow();

    // show preview immediately
    if (panelList) {
      // quick preview (empty while loading)
      panelList.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'day-dropdown__empty';
      li.textContent = 'Loading...';
      panelList.appendChild(li);
    }

    animatePanelOpen();

    // fetch transits (defer slightly)
    setTimeout(async () => {
      try {
        transitFull = await Promise.resolve(getTransitEventsForDate(calendarDay));
        loaded = true;
        // render the top items
        renderPanelContent();
        // ensure panel height fits up to a limit
        const panel = panelRow.querySelector('.day-dropdown__panel.panel-row');
        if (panel) {
          const maxH = 520;
          if (panel.scrollHeight > maxH) {
            panel.style.maxHeight = maxH + 'px';
            panel.style.overflow = 'auto';
          } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            panel.style.overflow = 'auto';
          }
        }
      } catch (err) {
        panelList.innerHTML = '';
        const li = document.createElement('li');
        li.className = 'day-dropdown__error';
        li.textContent = 'Error loading events';
        panelList.appendChild(li);
        console.error(err);
      }
    }, 40);
  }

  function closePanel() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (panelRow) {
      animatePanelClose();
      // remove after transition time
      setTimeout(removePanelRow, 250);
    }
  }

  // RIGHT-DRAWER (Show all behavior)
  function openAllDrawerForDay() {
    // ensure transits loaded
    const ensure = loaded ? Promise.resolve(transitFull) : getTransitEventsForDate(calendarDay).then(r => { transitFull = r || []; loaded = true; return transitFull; });

    ensure.then(() => {
      // create drawer
      const { drawer, closeBtn, transitSelect, aspectSelect, clearBtn, list, title } = createAllDrawerStructure();
      openAllDrawer = { drawer, closeBtn, transitSelect, aspectSelect, clearBtn, list, title };

      title.textContent = `All aspects — ${calendarDay.toDateString()}`;

      // populate selects
      const transitSet = new Set();
      const aspectMap = new Map();
      for (const ev of transitFull) {
        const m = ev.meta || {};
        if (m.transitPlanet) transitSet.add(m.transitPlanet);
        if (m.aspect) aspectMap.set(m.aspect, m.symbol || m.aspect);
      }

      transitSelect.innerHTML = '';
      const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'All'; transitSelect.appendChild(allOpt);
      Array.from(transitSet).sort().forEach(val => {
        const o = document.createElement('option'); o.value = val; o.textContent = val[0].toUpperCase()+val.slice(1); transitSelect.appendChild(o);
      });

      aspectSelect.innerHTML = '';
      const allA = document.createElement('option'); allA.value = 'all'; allA.textContent = 'All'; aspectSelect.appendChild(allA);
      Array.from(aspectMap.keys()).sort().forEach(name => {
        const o = document.createElement('option'); o.value = name; o.textContent = `${aspectMap.get(name) || ''} ${name}`; aspectSelect.appendChild(o);
      });

      // render initial full list
      renderDrawerList(list, transitFull, transitSelect.value, aspectSelect.value);

      // handlers
      closeBtn.addEventListener('click', closeAllDrawers);
      transitSelect.addEventListener('change', () => renderDrawerList(list, transitFull, transitSelect.value, aspectSelect.value));
      aspectSelect.addEventListener('change', () => renderDrawerList(list, transitFull, transitSelect.value, aspectSelect.value));
      clearBtn.addEventListener('click', () => {
        transitSelect.value = 'all'; aspectSelect.value = 'all';
        renderDrawerList(list, transitFull, 'all', 'all');
      });

      // click outside closes drawer
      setTimeout(() => document.addEventListener('click', onDocClickForDrawer), 0);
    }).catch(err => console.error(err));
  }

  function renderDrawerList(listEl, allEvents, transitVal, aspectVal) {
    const filtered = (allEvents || []).filter(ev => {
      const m = ev.meta || {};
      if (transitVal && transitVal !== 'all' && m.transitPlanet !== transitVal) return false;
      if (aspectVal && aspectVal !== 'all' && m.aspect !== aspectVal) return false;
      return true;
    });
    listEl.innerHTML = '';
    if (!filtered.length) {
      const li = document.createElement('li'); li.className = 'day-dropdown__empty'; li.textContent = 'No transit aspects'; listEl.appendChild(li);
    } else {
      for (const ev of filtered) {
        const li = document.createElement('li'); li.className = 'day-dropdown__event-list-item'; initStaticEvent(li, ev); listEl.appendChild(li);
      }
    }
  }

  // handlers for pill and panel
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closePanel(); else openPanel();
  });
  toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // clicking the in-cell panel should not bubble up
  document.addEventListener('click', (e) => {
    // if clicked outside the active panel-row, close it
    if (!panelRow) return;
    if (!panelRow.contains(e.target) && e.target !== toggleBtn) {
      closePanel();
    }
  });

  // attach showAll handler will be set per-panel row after it exists
  // Because panelRow is created dynamically, delegate a short interval to attach handler after insertion
  const showAllAttachInterval = setInterval(() => {
    if (panelShowAllLink) {
      panelShowAllLink.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openAllDrawerForDay();
      });
      clearInterval(showAllAttachInterval);
    }
  }, 80);
}