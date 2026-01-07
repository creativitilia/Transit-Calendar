const eventTemplateElement = document.querySelector('[data-template="event"]');

const dateFormatter = new Intl.DateTimeFormat('en-us', {
  hour: 'numeric',
  minute: 'numeric',
});


export function initStaticEvent(parent, event) {
  const eventElement = initEvent(event);

  if (isEventAllDay(event)) {
    eventElement.classList.add('event--filled');
  }

  parent.appendChild(eventElement); 
}

export function initDynamicEvent(parent, event, dynamicStyles) {
  const eventElement = initEvent(event);

  eventElement.classList.add("event--filled");
  eventElement.classList.add("event--dynamic");

  eventElement.style.top = dynamicStyles.top;
  eventElement.style.left = dynamicStyles.left;
  eventElement.style.bottom = dynamicStyles.bottom;
  eventElement.style.right = dynamicStyles.right; 

  eventElement.dataset.eventDynamic = true;

  parent.appendChild(eventElement);
}

function initEvent(event) {
  const eventContent = eventTemplateElement.content.cloneNode(true);
  const eventElement = eventContent.querySelector('[data-event]');
  const eventTitleElement = eventElement.querySelector('[data-event-title]');
  const eventStartTimeElement = eventElement.querySelector('[data-event-start-time]');
  const eventEndTimeElement = eventElement.querySelector('[data-event-end-time]');

  eventElement.style.setProperty("--event-color", event.color);
  const startDate = eventTimeToDate(event, event.startTime);
  const endDate = eventTimeToDate(event, event.endTime);
  eventStartTimeElement.textContent = dateFormatter.format(startDate);
  eventEndTimeElement.textContent = dateFormatter.format(endDate);

  eventElement.addEventListener('click', (e) => {
    eventElement.dispatchEvent(new CustomEvent('event-click', {
      detail: {
        event,
      },
      bubbles: true
    }));
  });
  

  eventTitleElement.textContent = event.title;
  return eventElement;
}

export function isEventAllDay(event) {
  return event.startTime === 0 && event.endTime === 1440;
}

export function eventStartsBefore(eventA, eventB) {
  return eventA.startTime < eventB.startTime;
}

export function eventEndsBefore(eventA, eventB) {
  return eventA.endTime < eventB.endTime;
}

export function eventCollidesWith(eventA, eventB) {
  const maxStarTime = Math.max(eventA.startTime, eventB.startTime); 
  const minEndTime = Math.min(eventA.endTime, eventB.endTime);
  return maxStarTime < minEndTime;
}

export function eventTimeToDate(event, eventTime) {
  return new Date (
    event.date.getFullYear(),
    event.date.getMonth(),
    event.date.getDate(),
    0,
    eventTime
  );
}

export function validateEvent(event) {
  if (event.startTime >= event.endTime) {
    return "Event end time must be after start time";
  }

  return null;

}

export function adjustDynamicEventMaxLines(dynamicEventElement) {
  const availableHeight = dynamicEventElement.offsetHeight;
  const lineHeight = 16;
  const padding =  8;
  const maxLines = Math.floor((availableHeight - lineHeight - padding) / lineHeight);
  const maxTitleLines = Math.max(1, maxLines);

  dynamicEventElement.style.setProperty("--event-title-max-lines", maxTitleLines);
}


export function generateEventId() {
  return Date.now();
}