/**
 * Client-Side Anti-Theft & Security Shield
 * Prevents code stealing, DevTools inspection, clickjacking, and tampering.
 */
export function initSecurityShield() {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Block Inspection & DevTools Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.keyCode === 123 || e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 3. Disable Dragging & Unauthorized Copying of UI Code
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

  // 4. Clickjacking / Iframe Protection (Framebuster)
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch {
    // blocked cross-origin iframe
  }

  // 5. Neutralize & Clean Console in Production
  if (process.env.NODE_ENV === 'production') {
    const noop = () => {};
    window.console.log = noop;
    window.console.warn = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.table = noop;
    window.console.trace = noop;
  }
}
