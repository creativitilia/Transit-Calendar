/* Replace the existing positionOverlay(panel, toggleBtn, calendarDayElement) with this improved implementation
   that prefers placing the overlay in the left whitespace (gutter) if large enough, then right gutter,
   then center under the pill as a fallback. Keeps clamping logic to avoid covering the next row. */
function positionOverlay(panel, toggleBtn, calendarDayElement) {
  const btnRect = toggleBtn.getBoundingClientRect();

  // Find the calendar grid bounding box
  const dayList = document.querySelector('.month-calendar__day-list');
  const calRect = dayList ? dayList.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };

  // All grid cells in order: used to compute next row top for height clamping
  const cells = dayList ? Array.from(dayList.querySelectorAll('.month-calendar__day')) : [];
  const idx = cells.indexOf(calendarDayElement);
  const row = idx >= 0 ? Math.floor(idx / 7) : 0;
  const nextRowStartIdx = (row + 1) * 7;
  let nextRowTop = window.innerHeight;
  if (cells[nextRowStartIdx]) nextRowTop = cells[nextRowStartIdx].getBoundingClientRect().top;

  const margin = 12;
  // Maximum overlay width to try to use
  const maxDesired = Math.min(DESIRED_MAX_WIDTH, window.innerWidth - 2 * margin);
  const width = Math.max(MIN_OVERLAY_WIDTH, Math.min(maxDesired, window.innerWidth - 2 * margin));
  panel.style.width = width + 'px';

  // Place off-screen to measure natural height
  panel.style.left = '0px';
  panel.style.top = '-9999px';
  panel.style.visibility = 'hidden';
  panel.style.maxHeight = 'none';
  panel.style.overflow = 'hidden';

  const naturalHeight = Math.max(80, panel.scrollHeight || COMFORTABLE_MIN_HEIGHT);

  // Compute available left/right gutter relative to the calendar grid
  const leftGutter = Math.max(0, btnRect.left - calRect.left);        // space from grid left edge to pill left
  const rightGutter = Math.max(0, calRect.right - (btnRect.right));  // space from pill right to grid right edge

  const availableBelow = Math.max(0, nextRowTop - btnRect.bottom - margin);
  const availableAbove = Math.max(0, btnRect.top - calRect.top - margin);

  let finalTop = btnRect.bottom + 8;
  let finalLeft = Math.round(btnRect.left + btnRect.width / 2 - width / 2);
  let finalMaxHeight = naturalHeight;

  // Prefer placing overlay in left gutter if it fits comfortably
  if (leftGutter >= width + margin) {
    // Align overlay's right edge just left of the pill (with small gap)
    finalLeft = Math.max(margin, btnRect.left - width - 8);
    // Try to place below if space, otherwise above or clamp
    if (availableBelow >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = btnRect.bottom + 8;
      finalMaxHeight = Math.min(naturalHeight, availableBelow);
    } else if (availableAbove >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = Math.max(calRect.top + margin, btnRect.top - Math.min(naturalHeight, availableAbove) - 8);
      finalMaxHeight = Math.min(naturalHeight, availableAbove);
    } else {
      const usable = Math.max(availableBelow, availableAbove, 80);
      finalTop = availableBelow >= availableAbove ? (btnRect.bottom + 8) : Math.max(calRect.top + margin, btnRect.top - usable - 8);
      finalMaxHeight = usable;
    }
  } else if (rightGutter >= width + margin) {
    // Place overlay in the right gutter (left edge right of pill)
    finalLeft = Math.min(window.innerWidth - margin - width, btnRect.right + 8);
    if (availableBelow >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = btnRect.bottom + 8;
      finalMaxHeight = Math.min(naturalHeight, availableBelow);
    } else if (availableAbove >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = Math.max(calRect.top + margin, btnRect.top - Math.min(naturalHeight, availableAbove) - 8);
      finalMaxHeight = Math.min(naturalHeight, availableAbove);
    } else {
      const usable = Math.max(availableBelow, availableAbove, 80);
      finalTop = availableBelow >= availableAbove ? (btnRect.bottom + 8) : Math.max(calRect.top + margin, btnRect.top - usable - 8);
      finalMaxHeight = usable;
    }
  } else {
    // Fallback: center under pill, but clamp height to not overlap next row
    if (availableBelow >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = btnRect.bottom + 8;
      finalMaxHeight = Math.min(naturalHeight, availableBelow);
    } else if (availableAbove >= Math.min(naturalHeight, COMFORTABLE_MIN_HEIGHT)) {
      finalTop = Math.max(calRect.top + margin, btnRect.top - Math.min(naturalHeight, availableAbove) - 8);
      finalMaxHeight = Math.min(naturalHeight, availableAbove);
    } else {
      const usable = Math.max(availableBelow, availableAbove, 80);
      finalTop = availableBelow >= availableAbove ? (btnRect.bottom + 8) : Math.max(calRect.top + margin, btnRect.top - usable - 8);
      finalMaxHeight = usable;
    }

    // center horizontally under the pill but keep within viewport
    finalLeft = Math.round(btnRect.left + btnRect.width / 2 - width / 2);
    finalLeft = Math.max(margin, Math.min(window.innerWidth - margin - width, finalLeft));
  }

  // Apply final placement and clamp/max-height
  panel.style.left = finalLeft + 'px';
  panel.style.top = finalTop + 'px';
  panel.style.visibility = 'visible';
  panel.style.overflow = 'hidden';
  panel.style.maxHeight = finalMaxHeight + 'px';
}