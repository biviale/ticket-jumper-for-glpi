// Chrome service worker entry point.
// Loads shared utilities before the main background script.
// Firefox uses manifest "scripts": [...] instead — see dist-firefox/manifest.json.
importScripts('utils.js', 'background.js');
