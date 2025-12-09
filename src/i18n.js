const I18n = {
  // Load translations based on stored preference
  loadTranslations: async () => {
    return new Promise((resolve) => {
      // Timeout to prevent hanging if storage fails
      const timeout = setTimeout(() => {
        console.warn("Storage retrieval timed out, falling back to defaults.");
        resolve(null);
      }, 1000);

      try {
        chrome.storage.sync.get({ language: 'auto' }, async (items) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            console.error("Storage error:", chrome.runtime.lastError);
            resolve(null);
            return;
          }

          let lang = items.language;
          let messages = {};

          if (lang === 'auto') {
            resolve(null);
            return;
          }

          try {
            const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            messages = await response.json();
            resolve(messages);
          } catch (e) {
            console.warn("Failed to load custom locale, falling back:", e);
            resolve(null);
          }
        });
      } catch (e) {
        clearTimeout(timeout);
        console.error("Critical i18n error:", e);
        resolve(null);
      }
    });
  },

  // Translate page elements
  translatePage: async () => {
    try {
      const messages = await I18n.loadTranslations();

      const getMsg = (key) => {
        if (messages && messages[key]) {
          return messages[key].message;
        }
        return chrome.i18n.getMessage(key) || ""; // Fallback
      };

      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const msg = getMsg(key);
        if (msg) {
          if (el.tagName === 'INPUT' && el.type === 'submit') {
            el.value = msg;
          } else if (el.tagName === 'INPUT' && el.placeholder) {
            // checking if it's meant for placeholder not implemented here generally
          } else {
            el.innerText = msg;
          }
        }
      });
      return getMsg;
    } catch (err) {
      console.error("translatePage failed:", err);
      // Fallback function that just returns empty or chrome.i18n
      return (key) => chrome.i18n.getMessage(key) || "";
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = I18n;
}
