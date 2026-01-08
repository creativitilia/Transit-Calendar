import { generateMonthCalendarDays, today, isTheSameDay } from "./date.js";
import { isEventAllDay, eventStartsBefore } from "./event.js";
import { attachDayDropdown } from "./day-dropdown.js";

const calendarTemplateElement = document.querySelector("[data-template ='month-calendar']");
const calendarDayTemplateElement = document.querySelector('[data-template="month-calendar-day"]');
const calendarWeekClasses = {
  4: "four-week",
  5: "five-week",
  6: "six-week"
}

export function initMonthCalendar(parent, selectedDate, eventStore) {
  const calendarContent = calendarTemplateElement.content.cloneNode(true);
  const calendarElement = calendarContent.querySelector('[data-month-calendar]');
  const calendarDayListElement = calendarContent.querySelector('[data-month-calendar-day-list]');

  const calendarDays = generateMonthCalendarDays(selectedDate);
  const calendarWeeks = calendarDays.length / 7;
  const calendarWeekClass = calendarWeekClasses[calendarWeeks];
  calendarElement.classList.add(calendarWeekClass);

  for (const calendarDay of calendarDays) {
    const events = eventStore.getEventsByDate(calendarDay);
    sortCalendarDayEvents(events);
    // Pass eventStore down so day-dropdown can lazy-load events on open
    initCalendarDay(calendarDayListElement, calendarDay, events, eventStore);
  }

  parent.appendChild(calendarElement);
}

function initCalendarDay(parent, calendarDay, events, eventStore) {
  const calendarDayContent = calendarDayTemplateElement.content.cloneNode(true);
  const calendarDayElement = calendarDayContent.querySelector('[data-month-calendar-day]');
  const calendarDayLabelElement = calendarDayContent.querySelector('[data-month-calendar-day-label]');
  const calendarEventListWrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');

  if (isTheSameDay(today(), calendarDay)) {
    calendarDayLabelElement.classList.add('month-calendar__day--highlight');
  }

  calendarDayLabelElement.textContent = calendarDay.getDate();
  // Use eventStore so the dropdown can call eventStore.getEventsByDate(date) lazily
  attachDayDropdown(calendarDayElement, calendarDay, eventStore);

  // navigate to day view when the date label is clicked (keep this behavior)
  calendarDayLabelElement.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('date-change', {
      detail: {
        date: calendarDay
      },
      bubbles: true
    }));

    document.dispatchEvent(new CustomEvent('view-change', {
      detail: {
        view: 'day'
      },
      bubbles: true
    }));
  });

  // NOTE: removed the calendarEventListWrapper click handler that previously fired
  // event-create-request when clicking inside the empty area of a day cell.
  // This prevents creating events by clicking between pills. Creation still works
  // via the main "Create event" button which dispatches 'event-create-request'.

  parent.appendChild(calendarDayElement);
}

function sortCalendarDayEvents(events) {
  events.sort((eventA, eventB) => {
    if (isEventAllDay(eventA)) {
      return -1;
    }

    if (isEventAllDay(eventB)) {
      return 1;
    }

    return eventStartsBefore(eventA, eventB) ? -1 : 1;
  });
}
