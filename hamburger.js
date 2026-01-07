export function initHamburger() {
  const hamburgerButtonElement  = document.querySelector('[data-hamburger-button]');

  hamburgerButtonElement.addEventListener('click', () => {
    hamburgerButtonElement.dispatchEvent(new CustomEvent('mobile-sidebar-open-request', {
      bubbles: true,
      }));
  });
}