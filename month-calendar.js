import {generateMonthCalendarDays, today, isTheSameDay} from "./date.js";  
import {isEventAllDay, eventStartsBefore} from "./event.js"; 
import {initEventList} from "./event-list.js";


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
    initCalendarDay(calendarDayListElement, calendarDay, events);
  }


  parent.appendChild(calendarElement);
}

function initCalendarDay(parent, calendarDay, events) {
  const calendarDayContent = calendarDayTemplateElement.content.cloneNode(true);
  const calendarDayElement = calendarDayContent.querySelector('[data-month-calendar-day]');
  const calendarDayLabelElement = calendarDayContent.querySelector('[data-month-calendar-day-label]');
  const calendarEventListWrapper = calendarDayElement.querySelector('[data-month-calendar-event-list-wrapper]');


  if (isTheSameDay(today(), calendarDay)) {
    calendarDayLabelElement.classList.add('month-calendar__day--highlight');

  }

  calendarDayLabelElement.textContent = calendarDay.getDate();
  initEventList(calendarDayElement, events);

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

  calendarEventListWrapper.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent('event-create-request', {
      detail: {
        date: calendarDay,
        startTime: 600,
        endTime: 960
      },
      bubbles: true
    }));
  })

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