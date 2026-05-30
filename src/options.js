// Requires utils.js to be loaded first (provides isSafeUrl)

// Saves options to chrome.storage
const saveOptions = (e, getMsg) => {
  e.preventDefault();
  const glpiUrl = document.getElementById('glpiUrl').value;
  const language = document.getElementById('language').value;
  const theme = document.getElementById('theme').value;

  const showTicket = document.getElementById('showTicket').checked;
  const showChange = document.getElementById('showChange').checked;
  const showProblem = document.getElementById('showProblem').checked;

  if (!showTicket && !showChange && !showProblem) {
    const status = document.getElementById('status');
    status.textContent = getMsg('typeSelectionError');
    status.style.color = "red";
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 2000);
    return;
  }

  // Basic validation to remove trailing slash if present
  let formattedUrl = glpiUrl.trim();
  if (formattedUrl.endsWith('/')) {
    formattedUrl = formattedUrl.slice(0, -1);
  }

  // Validate URL scheme (prevent javascript:, file:, data:, etc.)
  if (!isSafeUrl(formattedUrl)) {
    const status = document.getElementById('status');
    status.textContent = getMsg('invalidUrlError');
    status.style.color = "red";
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 2000);
    return;
  }

  chrome.storage.sync.set(
    {
      glpiUrl: formattedUrl,
      language: language,
      theme: theme,
      showTicket: showTicket,
      showChange: showChange,
      showProblem: showProblem
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.style.color = '';
      status.textContent = getMsg('optionsSaved');
      status.classList.add('show');
      setTimeout(() => {
        status.classList.remove('show');
        // Reload page to apply language changes if any
        window.location.reload();
      }, 1000);
      document.getElementById('glpiUrl').value = formattedUrl;
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    {
      glpiUrl: '',
      language: 'auto',
      theme: 'auto',
      showTicket: true,
      showChange: true,
      showProblem: true
    },
    (items) => {
      document.getElementById('glpiUrl').value = items.glpiUrl;
      document.getElementById('language').value = items.language;
      document.getElementById('theme').value = items.theme;
      document.getElementById('showTicket').checked = items.showTicket;
      document.getElementById('showChange').checked = items.showChange;
      document.getElementById('showProblem').checked = items.showProblem;

      // Apply theme
      if (items.theme === 'dark') {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      } else if (items.theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-dark', 'theme-light');
      }
    }
  );
};

document.addEventListener('DOMContentLoaded', async () => {
  restoreOptions();
  const getMsg = await I18n.translatePage();

  const form = document.getElementById('options-form');
  if (form) {
    form.addEventListener('submit', (e) => saveOptions(e, getMsg));
  }
});
