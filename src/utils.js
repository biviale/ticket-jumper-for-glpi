/**
 * Validates that a URL uses http: or https: protocol.
 * Used both at input time (options.js) and consumption time (background.js, popup.js)
 * to prevent injection of dangerous schemes like javascript:, file:, data:, etc.
 *
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { isSafeUrl };
}
