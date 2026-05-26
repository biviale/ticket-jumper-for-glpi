// Debounce utility to prevent high CPU usage on every character selection
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

let lastStateWasVisible = false;

document.addEventListener('selectionchange', debounce(() => {
  try {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) return;

    const selection = window.getSelection().toString().trim();
    const numericRegex = /^\d+$/;

    if (selection && numericRegex.test(selection)) {
      // Always update if visible to ensure title is correct, or if it wasn't visible
      chrome.runtime.sendMessage({
        type: 'updateContextMenu',
        selectionText: selection,
        show: true
      }).catch((err) => { console.error('updateContextMenu (show) failed:', err); });
      lastStateWasVisible = true;
    } else {
      // Only send hide message if it was previously visible
      if (lastStateWasVisible) {
        chrome.runtime.sendMessage({
          type: 'updateContextMenu',
          show: false
        }).catch((err) => { console.error('updateContextMenu (hide) failed:', err); });
        lastStateWasVisible = false;
      }
    }
  } catch (e) {
    console.error('selectionchange handler error:', e);
  }
}, 150)); // 150ms delay
