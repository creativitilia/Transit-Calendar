// Day dropdown — in-cell expandable pill with top-3 preview and "Show all" opening the right drawer
// - Expand in-flow inside the day cell (does not overlay other pills)
// - Shows top 3 aspects, scrollable. "Show all" opens right drawer with full list + filters.

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate } from './transit-events.js';

const TOP_IN_PILL = 3;

let currentOpen = null; // {cellEl, panelEl, toggleBtn}
let openDrawer = null;

/* Create the right drawer that shows the full list + filters */
function createRightDrawer() {
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

/* Render events into a UL using initStaticEvent */
function renderEvents(listEl, events) {
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

/* Close open in-cell panel if any */
function closeCurrentInCell() {
  if (!currentOpen) return;
  const { panelEl, toggleBtn } = currentOpen;
  try {
    panelEl.style.maxHeight = '0px';
    panelEl.style.overflow = 'hidden';
    panelEl.classList.remove('day-dropdown__panel--open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    // remove after animation
    setTimeout(() => {
      if (panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    }, 220);
  } catch (e) {}
  currentOpen = null;
}

/* Open right drawer for that day with filters and full list */
function openRightDrawer(calendarDay, allTransits) {
  // close existing drawer
  if (openDrawer) {
    try { openDrawer.drawer.parentNode.removeChild(openDrawer.drawer); } catch (e) {}
    openDrawer = null;
  }

  const { drawer, closeBtn, transitSelect, aspectSelect, clearBtn, list, title } = createRightDrawer();
  openDrawer = { drawer, closeBtn, transitSelect, aspectSelect, clearBtn, list, title };

  title.textContent = `All aspects — ${calendarDay.toDateString()}`;

  // populate select options
  const transitSet = new Set();
  const aspectMap = new Map();
  for (const ev of allTransits) {
    const m = ev.meta || {};
    if (m.transitPlanet) transitSet.add(m.transitPlanet);
    if (m.aspect) aspectMap.set(m.aspect, m.symbol || m.aspect);
  }

  transitSelect.innerHTML = '';
  const allP = document.createElement('option'); allP.value = 'all'; allP.textContent = 'All'; transitSelect.appendChild(allP);
  Array.from(transitSet).sort().forEach(val => {
    const o = document.createElement('option'); o.value = val; o.textContent = val[0].toUpperCase() + val.slice(1); transitSelect.appendChild(o);
  });

  aspectSelect.innerHTML = '';
  const allA = document.createElement('option'); allA.value = 'all'; allA.textContent = 'All'; aspectSelect.appendChild(allA);
  Array.from(aspectMap.keys()).sort().forEach(name => {
    const o = document.createElement('option'); o.value = name; o.textContent = `${aspectMap.get(name) || ''} ${name}`; aspectSelect.appendChild(o);
  });

  function render() {
    const tVal = transitSelect.value;
    const aVal = aspectSelect.value;
    const filtered = (allTransits || []).filter(ev => {
      const m = ev.meta || {};
      if (tVal && tVal !== 'all' && m.transitPlanet !== tVal) return false;
      if (aVal && aVal !== 'all' && m.aspect !== aVal) return false;
      return true;
    });
    renderEvents(list, filtered);
  }

  render();

  closeBtn.addEventListener('click', () => {
    try { drawer.parentNode.removeChild(drawer); } catch (e) {}
    openDrawer = null;
    document.removeEventListener('click', onDocClickForDrawer);
  });
  transitSelect.addEventListener('change', render);
  aspectSelect.addEventListener('change', render);
  clearBtn.addEventListener('click', () => { transitSelect.value = 'all'; aspectSelect.value = 'all'; render(); });

  // click outside closes
  setTimeout(() => document.addEventListener('click', onDocClickForDrawer), 0);

  function onDocClickForDrawer(e) {
    if (!openDrawer) return;
    if (!openDrawer.drawer.contains(e.target)) {
      try { openDrawer.drawer.parentNode.removeChild(openDrawer.drawer); } catch (err) {}
      openDrawer = null;
      document.removeEventListener('click', onDocClickForDrawer);
    }
  }
}

/* Export: attach behavior to each day cell */
export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  // remove default inside list if present
  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // create pill button inside cell
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(toggleBtn);

  let panelEl = null;
  let loaded = false;
  let allTransits = [];

  async function openInCell() {
    // close any other open in-cell
    if (currentOpen && currentOpen.toggleBtn !== toggleBtn) closeCurrentInCell();

    // if already open, close
    if (panelEl && panelEl.parentNode) {
      closeCurrentInCell();
      return;
    }

    // create panel element inside wrapper (in-flow)
    panelEl = document.createElement('div');
    panelEl.className = 'day-dropdown__panel in-cell';
    panelEl.style.maxHeight = '0px';
    panelEl.style.overflow = 'hidden';
    panelEl.style.transition = 'max-height 220ms ease';
    // header (small)
    const header = document.createElement('div');
    header.className = 'day-dropdown__panel-header';
    header.textContent = calendarDay.toDateString();
    panelEl.appendChild(header);

    // list
    const list = document.createElement('ul');
    list.className = 'day-dropdown__event-list';
    panelEl.appendChild(list);

    // show all link
    const showAll = document.createElement('div');
    showAll.className = 'day-dropdown__show-all-link';
    showAll.style.display = 'none';
    showAll.textContent = 'Show all';
    panelEl.appendChild(showAll);

    // append to wrapper (below the pill)
    wrapper.appendChild(panelEl);

    // small loading placeholder
    list.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'day-dropdown__empty';
    li.textContent = 'Loading...';
    list.appendChild(li);

    // measure and expand
    requestAnimationFrame(() => {
      panelEl.classList.add('day-dropdown__panel--open');
      panelEl.style.maxHeight = '160px'; // open to default small height immediately (will adjust after load)
    });

    if (!loaded) {
      try {
        allTransits = await Promise.resolve(getTransitEventsForDate(calendarDay));
        loaded = true;
      } catch (err) {
        console.error('Error fetching transits', err);
        allTransits = [];
      }
    }

    // render top 3 only inside pill
    const toShow = (allTransits || []).slice(0, TOP_IN_PILL);
    list.innerHTML = '';
    renderEvents(list, toShow);

    // showShowAll if more than TOP_IN_PILL
    if (allTransits && allTransits.length > TOP_IN_PILL) {
      showAll.style.display = 'block';
      showAll.textContent = `Show all (${allTransits.length})`;
      showAll.addEventListener('click', (e) => {
        e.stopPropagation();
        // open right drawer with full list
        openRightDrawer(calendarDay, allTransits);
      });
    } else showAll.style.display = 'none';

    // clamp panel height and enable scroll
    requestAnimationFrame(() => {
      panelEl.style.maxHeight = Math.min(panelEl.scrollHeight, 160) + 'px';
      panelEl.style.overflow = 'auto';
    });

    // store current open
    currentOpen = { panelEl, toggleBtn, wrapper };
    toggleBtn.setAttribute('aria-expanded', 'true');

    // click outside behaviour: close when clicking elsewhere
    setTimeout(() => {
      const onDocClick = (ev) => {
        if (!panelEl) return;
        if (!panelEl.contains(ev.target) && ev.target !== toggleBtn) {
          closeCurrentInCell();
          document.removeEventListener('click', onDocClick);
        }
      };
      document.addEventListener('click', onDocClick);
    }, 0);
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // toggle
    if (panelEl && panelEl.parentNode) closeCurrentInCell();
    else openInCell();
  });

  // prevent parent handlers
  toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());
}