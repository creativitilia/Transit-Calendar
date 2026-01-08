// Day dropdown — overlay panel centered under the pill, showing the full scrollable list of transits
// Behavior:
// - Click a day pill -> overlay panel appended to body, centered below the pill.
// - Panel shows the FULL list of transits for that day (scrollable).
// - Panel is sized so it does not cover the next calendar row: it uses available space below the pill when possible,
//   otherwise it places above or clamps height so pills below stay visible.
// - Prevents click bubbling so month-grid create-event handler is not triggered.
// - Escape or outside click closes the panel.

import { initStaticEvent } from './event.js';
import { getTransitEventsForDate } from './transit-events.js';

let activeOverlay = null;
let activeDrawer = null; // kept for parity but not used by this exact layout

function closeOverlay() {
  if (!activeOverlay) return;
  const { panel, button } = activeOverlay;
  try {
    if (button) button.setAttribute('aria-expanded', 'false');
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    panel.style.visibility = 'hidden';
    panel.classList.remove('day-dropdown__panel--open');
  } catch (e) {}
  activeOverlay = null;
}

function animatePanelToContent(panel) {
  if (!panel) return;
  panel.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });
  const QUICK_ENABLE_MS = 100;
  const quickTimer = setTimeout(() => { panel.style.overflow = 'auto'; }, QUICK_ENABLE_MS);
  function onTransition(e) {
    if (e.propertyName === 'max-height') {
      clearTimeout(quickTimer);
      panel.style.overflow = 'auto';
      panel.removeEventListener('transitionend', onTransition);
    }
  }
  panel.addEventListener('transitionend', onTransition);
}

/* Create one overlay panel (appended to body). We'll reuse it for each pill. */
function createOverlayPanel() {
  const panel = document.createElement('div');
  panel.className = 'day-dropdown__panel overlay';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.visibility = 'hidden';
  panel.style.maxHeight = '0px';
  panel.style.overflow = 'hidden';
  panel.style.transition = 'max-height 200ms ease, width 120ms ease';
  panel.style.zIndex = 1400;

  const header = document.createElement('div');
  header.className = 'day-dropdown__panel-header';
  panel.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'day-dropdown__event-list';
  panel.appendChild(list);

  const loading = document.createElement('div');
  loading.className = 'day-dropdown__loading';
  loading.textContent = 'Loading...';
  loading.style.display = 'none';
  panel.appendChild(loading);

  document.body.appendChild(panel);
  return { panel, header, list, loading };
}

/* Render list of events into a UL (uses initStaticEvent to build each .event element) */
function renderIntoList(listEl, events) {
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

/* Helper: compute safe position centered under the pill, and clamp height so next row's pills are not covered */
function positionPanelBelowOrAbove(panel, buttonEl, calendarListSelector = '.month-calendar__day-list') {
  const btnRect = buttonEl.getBoundingClientRect();
  const dayList = document.querySelector(calendarListSelector);
  const calRect = dayList ? dayList.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
  // find top of next row if any
  const cells = dayList ? Array.from(dayList.querySelectorAll('.month-calendar__day')) : [];
  const idx = cells.indexOf(buttonEl.closest('.month-calendar__day'));
  const row = idx >= 0 ? Math.floor(idx / 7) : 0;
  const nextRowStartIdx = (row + 1) * 7;
  let nextRowTop = window.innerHeight;
  if (cells[nextRowStartIdx]) nextRowTop = cells[nextRowStartIdx].getBoundingClientRect().top;

  const margin = 10;
  const desiredWidth = 320;
  const width = Math.min(desiredWidth, Math.max(200, window.innerWidth - 2 * margin));
  panel.style.width = width + 'px';

  // Measure natural height quickly: temporarily show (hidden off-screen) to measure
  panel.style.visibility = 'hidden';
  panel.style.maxHeight = 'none';
  panel.style.position = 'fixed';
  panel.style.left = '0px';
  panel.style.top = '-9999px';
  panel.style.overflow = 'hidden';
  const naturalHeight = Math.max(80, panel.scrollHeight || 200);

  const availableBelow = Math.max(0, nextRowTop - btnRect.bottom - margin);
  const availableAbove = Math.max(0, btnRect.top - calRect.top - margin);

  // prefer below if there's space
  if (availableBelow >= Math.min(naturalHeight, 120)) {
    const left = Math.max(margin, Math.min(window.innerWidth - margin - width, btnRect.left + btnRect.width / 2 - width / 2));
    panel.style.left = left + 'px';
    panel.style.top = (btnRect.bottom + 8) + 'px';
    panel.style.maxHeight = Math.min(naturalHeight, availableBelow) + 'px';
  } else if (availableAbove >= Math.min(naturalHeight, 120)) {
    // place above
    const left = Math.max(margin, Math.min(window.innerWidth - margin - width, btnRect.left + btnRect.width / 2 - width / 2));
    const top = Math.max(calRect.top + margin, btnRect.top - Math.min(naturalHeight, availableAbove) - 8);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.maxHeight = Math.min(naturalHeight, availableAbove) + 'px';
  } else {
    // not enough room either side -> place below but clamp to availableBelow (or availableAbove whichever larger)
    const usable = Math.max(availableBelow, availableAbove, 100); // always allow at least 100px
    const left = Math.max(margin, Math.min(window.innerWidth - margin - width, btnRect.left + btnRect.width / 2 - width / 2));
    if (availableBelow >= availableAbove) {
      panel.style.left = left + 'px';
      panel.style.top = (btnRect.bottom + 8) + 'px';
    } else {
      panel.style.left = left + 'px';
      panel.style.top = Math.max(calRect.top + margin, btnRect.top - usable - 8) + 'px';
    }
    panel.style.maxHeight = usable + 'px';
  }

  panel.style.visibility = 'visible';
  panel.style.overflow = 'hidden';
  panel.style.position = 'fixed';
}

/* Exported function used by month-calendar to attach behavior to each day cell */
export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  // Remove default in-cell list if present
  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // Create the pill button (date)
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');
  wrapper.appendChild(toggleBtn);

  // create overlay panel singleton (reused)
  const { panel, header, list, loading } = createOverlayPanel();

  // state
  let loaded = false;
  let allTransits = [];

  async function openPanel() {
    // close other UI
    closeOverlay();

    toggleBtn.setAttribute('aria-expanded', 'true');
    header.textContent = calendarDay.toDateString();
    panel.setAttribute('aria-hidden', 'false');

    // initial placeholder
    list.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'day-dropdown__empty';
    li.textContent = 'Loading...';
    list.appendChild(li);
    panel.classList.add('day-dropdown__panel--open');

    // position once with placeholder so it doesn't jump
    positionPanelBelowOrAbove(panel, toggleBtn);

    animatePanelToContent(panel);

    if (!loaded) {
      loading.style.display = 'block';
      try {
        allTransits = await Promise.resolve(getTransitEventsForDate(calendarDay));
        loaded = true;
      } catch (err) {
        console.error('Error loading transits', err);
        allTransits = [];
      } finally {
        loading.style.display = 'none';
      }
    }

    // render full list (scrollable)
    renderIntoList(list, allTransits);

    // recompute placement so final height is respected and the panel does not cover pills below
    positionPanelBelowOrAbove(panel, toggleBtn);

    // animate to final height
    animatePanelToContent(panel);

    activeOverlay = { panel, button: toggleBtn };
  }

  function closeDrawer() { /* kept for parity, no-op here */ }

  // Handlers
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeOverlay && activeOverlay.button === toggleBtn) closeOverlay(); else openPanel();
  });
  // avoid triggering parent create-event flows
  toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // ensure clicks inside panel don't bubble
  panel.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  // clicking outside closes overlay
  document.addEventListener('click', (e) => {
    if (activeOverlay && activeOverlay.panel && !activeOverlay.panel.contains(e.target) && e.target !== toggleBtn) {
      closeOverlay();
    }
  });

  // Escape to close
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });
}