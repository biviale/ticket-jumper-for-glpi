// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-glpi-ticket",
    title: "Open GLPI Ticket",
    contexts: ["selection"],
    visible: false
  });
});

// Stateless handling of context menu updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateContextMenu') {
    chrome.contextMenus.update("open-glpi-ticket", {
      visible: message.show,
      title: message.show ? chrome.i18n.getMessage("contextMenuTitle", [message.selectionText]) : undefined
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-glpi-ticket") {
    const ticketId = info.selectionText.trim();
    if (/^\d+$/.test(ticketId)) {
      chrome.storage.sync.get(['glpiUrl'], (result) => {
        if (result.glpiUrl) {
          // Default to ticket type for context menu actions
          const targetUrl = `${result.glpiUrl}/front/ticket.form.php?id=${ticketId}`;
          chrome.tabs.create({ url: targetUrl });
        } else {
          chrome.runtime.openOptionsPage();
        }
      });
    }
  }
});

// Omnibox handling
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  text = text.trim();
  if (!text) return;

  const idMatch = text.match(/\d+/);
  const id = idMatch ? idMatch[0] : '';

  if (id) {
    const suggestions = [
      {
        content: `ticket ${id}`,
        description: `Open GLPI <match>${chrome.i18n.getMessage("ticket")}</match> #${id}`
      },
      {
        content: `change ${id}`,
        description: `Open GLPI <match>${chrome.i18n.getMessage("change")}</match> #${id}`
      },
      {
        content: `problem ${id}`,
        description: `Open GLPI <match>${chrome.i18n.getMessage("problem")}</match> #${id}`
      }
    ];
    suggest(suggestions);
  }
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  chrome.storage.sync.get(['glpiUrl'], (result) => {
    if (!result.glpiUrl) {
      chrome.runtime.openOptionsPage();
      return;
    }

    let type = 'ticket';
    const lowerText = text.toLowerCase();

    if (lowerText.includes('change') || lowerText.startsWith('c ')) {
      type = 'change';
    } else if (lowerText.includes('problem') || lowerText.startsWith('p ')) {
      type = 'problem';
    }

    const idMatch = text.match(/\d+/);
    if (idMatch) {
      const id = idMatch[0];
      const targetUrl = `${result.glpiUrl}/front/${type}.form.php?id=${id}`;

      if (disposition === 'currentTab') {
        chrome.tabs.update({ url: targetUrl });
      } else {
        chrome.tabs.create({ url: targetUrl, active: disposition === 'newForegroundTab' });
      }
    }
  });
});

if (typeof module !== 'undefined') {
  module.exports = {};
}
