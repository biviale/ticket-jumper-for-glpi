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
      chrome.storage.sync.get(
        { glpiUrl: '', showTicket: true, showChange: true, showProblem: true },
        (result) => {
          if (result.glpiUrl) {
            // Validate URL scheme before navigation
            if (!isSafeUrl(result.glpiUrl)) {
              chrome.runtime.openOptionsPage();
              return;
            }
            // Pick the first enabled type (ordered: ticket, change, problem)
            const type = result.showTicket ? 'ticket' :
                         result.showChange ? 'change' :
                         result.showProblem ? 'problem' : 'ticket';
            const targetUrl = `${result.glpiUrl}/front/${type}.form.php?id=${ticketId}`;
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

    // Validate URL scheme before navigation
    if (!isSafeUrl(result.glpiUrl)) {
      chrome.runtime.openOptionsPage();
      return;
    }

    const lowerText = text.toLowerCase();
    const typeMap = [
      { type: 'change',  match: t => t.startsWith('change ') || t.startsWith('c ') },
      { type: 'problem', match: t => t.startsWith('problem ') || t.startsWith('p ') },
    ];
    const matchEntry = typeMap.find(({ match }) => match(lowerText));
    const type = matchEntry?.type ?? 'ticket';

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
