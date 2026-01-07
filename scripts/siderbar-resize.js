// ============================================
// SIDEBAR RESIZE
// Drag to resize sidebar width
// ============================================

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;
const STORAGE_KEY = 'sidebarWidth';

function initSidebarResize() {
  const sidebar = document.querySelector('.sidebar');
  const resizeHandle = document.querySelector('[data-sidebar-resize-handle]');
  
  if (!sidebar || !resizeHandle) {
    console.warn('⚠️ Sidebar or resize handle not found');
    return;
  }
  
  // Load saved width from localStorage
  const savedWidth = localStorage.getItem(STORAGE_KEY);
  if (savedWidth) {
    const width = parseInt(savedWidth);
    if (width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH) {
      sidebar.style.width = `${width}px`;
    }
  }
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  // Mouse down on resize handle
  resizeHandle. addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    
    resizeHandle.classList.add('is-resizing');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  // Mouse move - resize sidebar
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;
    
    // Clamp width between min and max
    newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, newWidth));
    
    sidebar.style.width = `${newWidth}px`;
  });
  
  // Mouse up - stop resizing
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    
    isResizing = false;
    resizeHandle.classList.remove('is-resizing');
    document.body.style.cursor = '';
    document.body.style. userSelect = '';
    
    // Save width to localStorage
    const currentWidth = sidebar.offsetWidth;
    localStorage.setItem(STORAGE_KEY, currentWidth. toString());
    
    console.log(`📏 Sidebar width saved: ${currentWidth}px`);
  });
  
  console.log('📏 Sidebar resize initialized');
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarResize);
} else {
  initSidebarResize();
}
