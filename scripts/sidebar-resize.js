const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;
const STORAGE_KEY = 'sidebarWidth';

function initSidebarResize() {
  const sidebar = document.querySelector('.sidebar');
  const handle = document.querySelector('[data-sidebar-resize-handle]');
  if (!sidebar || !handle) return;

  const savedWidth = localStorage.getItem(STORAGE_KEY);
  if (savedWidth) sidebar.style.width = savedWidth + 'px';

  let isResizing = false, startX = 0, startWidth = 0;

  handle.addEventListener('mousedown', e => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    let width = startWidth + (e.clientX - startX);
    width = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
    sidebar.style.width = width + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    localStorage.setItem(STORAGE_KEY, sidebar.offsetWidth);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarResize);
} else {
  initSidebarResize();
}
