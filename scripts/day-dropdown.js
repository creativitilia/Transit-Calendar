// Attach an expandable dropdown/panel to a calendar day element.
// Usage: attachDayDropdown(calendarDayElement, calendarDay, eventStore)
// - calendarDayElement: the <li> element for the month cell created in month-calendar.js
// - calendarDay: Date object for the cell
// - eventStore: the object returned by initEventStore() so we can call eventStore.getEventsByDate(date)

import { initStaticEvent } from './event.js';

const openPanels = new Set();

// Close any open panels (used to ensure single open panel)
function closeAllPanels() {
  for (const panelInfo of Array.from(openPanels)) {
    const { button, panel } = panelInfo;
    button.setAttribute('aria-expanded', 'false');
    panel.classList.remove('day-dropdown__panel--open');
    openPanels.delete(panelInfo);
  }
}

/**
 * Attach dropdown UI to calendar day element.
 */
export function attachDayDropdown(calendarDayElement, calendarDay, eventStore) {
  // Find existing wrapper provided by template
  const wrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');
  if (!wrapper) return;

  // Remove default event list to avoid duplicate rendering
  const defaultEventList = wrapper.querySelector('[data-event-list]');
  if (defaultEventList) defaultEventList.remove();

  // Create button (pill) that opens dropdown
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'day-dropdown__button';
  toggleBtn.textContent = String(calendarDay.getDate());
  toggleBtn.setAttribute('aria-expanded', 'false');

  // Create panel container (hidden by default)
  const panel = document.createElement('div');
  panel.className = 'day-dropdown__panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-hidden', 'true');

  // Header inside panel (optional)
  const header = document.createElement('div');
  header.className = 'day-dropdown__panel-header';
  header.textContent = calendarDay.toDateString();
  panel.appendChild(header);

  // Scrollable list container
  const list = document.createElement('ul');
  list.className = 'day-dropdown__event-list';
  panel.appendChild(list);

  // "loading" state element
  const loading = document.createElement('div');
  loading.className = 'day-dropdown__loading';
  loading.textContent = 'Loading...';
  loading.style.display = 'none';
  panel.appendChild(loading);

  // Append to DOM (preferably inside wrapper)
  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(panel);

  // Lazy-load flag
  let loaded = false;

  // Build event rendering function
  function renderEvents(events) {
    // Clear
    list.innerHTML = '';
    if (!events || events.length === 0) {
      const li = document.createElement('li');
      li.className = 'day-dropdown__empty';
      li.textContent = 'No events';
      list.appendChild(li);
      return;
    }

    for (const ev of events) {
      const item = document.createElement('li');
      item.className = 'day-dropdown__event-list-item';
      // reuse initStaticEvent which expects a parent and an event
      // but initStaticEvent will append a proper event element into our list item
      initStaticEvent(item, ev);
      list.appendChild(item);
    }
  }

  async function openPanel() {
    // Close others (optional)
    closeAllPanels();

    toggleBtn.setAttribute('aria-expanded', 'true');
    panel.classList.add('day-dropdown__panel--open');
    panel.setAttribute('aria-hidden', 'false');

    // register open panel
    openPanels.add({ button: toggleBtn, panel });

    if (!loaded) {
      loading.style.display = 'block';

      // Lazy fetch events for this date
      try {
        // eventStore.getEventsByDate may be synchronous; wrap in Promise.resolve for safety
        const events = await Promise.resolve(eventStore.getEventsByDate(calendarDay));
        renderEvents(events);
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
      }
    }

    // focus first event for accessibility if present
    const firstEventButton = list.querySelector('button[data-event]');
    if (firstEventButton) firstEventButton.focus();
  }

  function closePanel() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('day-dropdown__panel--open');
    panel.setAttribute('aria-hidden', 'true');

    // remove from openPanels
    for (const info of Array.from(openPanels)) {
      if (info.panel === panel) openPanels.delete(info);
    }
  }

  // Toggle handler
  toggleBtn.addEventListener('click', (e) => {
    const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closePanel();
    else openPanel();
  });

  // Close when clicking outside
  document.addEventListener('click', (event) => {
    if (!panel.contains(event.target) && event.target !== toggleBtn) {
      if (panel.classList.contains('day-dropdown__panel--open')) closePanel();
    }
  });

  // Close on Escape key when focused inside
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
      toggleBtn.focus();
    }
  });
}
