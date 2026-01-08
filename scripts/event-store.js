import { isTheSameDay } from "./date.js";
import { getTransitEventsForDate } from "./transit-events.js";


export function initEventStore() {
  document.addEventListener("event-create", (event) => {
    const createdEvent = event.detail.event;
    const events = getEventsFromLocalStorage();
    events.push(createdEvent);
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("event-change", {
      bubbles: true
    }));
  });

  document.addEventListener("event-delete", (event) => {
    const deletedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().filter((event) => {
      return event.id !== deletedEvent.id;
    })
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("event-change", {
      bubbles: true
    }));
  });

  document.addEventListener("event-edit", (event) => {
    const editedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().map((event) => {
      if (event.id === editedEvent.id) {
        return editedEvent;
      }
      return event;
    });
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("event-change", {
      bubbles: true
    }));
  });


  return {
    getEventsByDate(date) {
      const events = getEventsFromLocalStorage();
      const filteredEvents = events.filter((event) => isTheSameDay(event.date, date));

      // Add generated transit-aspect events for this date
      const transitEvents = getTransitEventsForDate(date);

      // Make sure we do not duplicate if user created a custom event with same id
      const existingIds = new Set(filteredEvents.map(e => e.id));
      const merged = filteredEvents.concat(transitEvents.filter(te => !existingIds.has(te.id)));

      return merged;
    }
  };
}


function saveEventsIntoLocalStorage(events) {
  const safeToStringifyEvents = events.map((event) => ({
    ...event,
    date: event.date.toISOString(),
  }));
  
  let stringifiedEvents;
  try {
    stringifiedEvents = JSON.stringify(safeToStringifyEvents);
  } catch (error) {
    console.error("Stringify events failed", error);
  }

  localStorage.setItem("events", stringifiedEvents);

}

function getEventsFromLocalStorage() {
  const localStorageEvents = localStorage.getItem("events"); 
  if (localStorageEvents === null) {
    return [];
  }

  let parsedEvents;
  try {
    parsedEvents = JSON.parse(localStorageEvents);
  } catch (error) {
    console.error("Parse events failed", error);
    return [];
  }

  const events = parsedEvents.map((event) => ({
    ...event,
    date: new Date(event.date),
  }));

  return events;
};