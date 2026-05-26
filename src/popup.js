document.addEventListener('DOMContentLoaded', async () => {
  // Initialize translations
  const getMsg = await I18n.translatePage();

  const form = document.getElementById('navigate-form');
  const ticketIdInput = document.getElementById('ticketId');
  const configWarning = document.getElementById('config-warning');
  const openOptionsBtn = document.getElementById('open-options');

  // Handle toggle logic (define before storage callback which calls it)
  const toggleContainer = document.getElementById('toggle-container');

  const setupToggles = (availableTypes) => {
    toggleContainer.innerHTML = '';

    // Config: key -> { labelI18n, placeholderI18n, formType }
    // formType is used for redirection URL construction
    const typeConfig = {
      'ticket': { labelI18n: 'ticket', placeholderI18n: 'ticketPlaceholder', formType: 'ticket' },
      'change': { labelI18n: 'change', placeholderI18n: 'changePlaceholder', formType: 'change' },
      'problem': { labelI18n: 'problem', placeholderI18n: 'problemPlaceholder', formType: 'problem' }
    };

    let firstSelected = false;

    // Ordered list of types to maintain check order
    const orderedTypes = ['ticket', 'change', 'problem'];

    orderedTypes.forEach(typeKey => {
      if (availableTypes[typeKey]) {
        const config = typeConfig[typeKey];

        // Create label/button wrapper
        const label = document.createElement('label');
        label.className = 'toggle-option';
        label.id = `label-${typeKey}`;

        // Radio input
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'type';
        input.value = config.formType;

        // Select first available by default
        if (!firstSelected) {
          input.checked = true;
          label.classList.add('active');
          ticketIdInput.placeholder = getMsg(config.placeholderI18n);
          firstSelected = true;
        }

        // Label Text
        const span = document.createElement('span');
        span.innerText = getMsg(config.labelI18n);

        label.appendChild(input);
        label.appendChild(span);
        toggleContainer.appendChild(label);

        // Event Listener
        input.addEventListener('change', () => {
          // Update active classes
          document.querySelectorAll('.toggle-option').forEach(l => l.classList.remove('active'));
          label.classList.add('active');
          ticketIdInput.placeholder = getMsg(config.placeholderI18n);
          ticketIdInput.focus();
          ticketIdInput.select();
        });
      }
    });
  };

  // Cache GLPI URL to avoid redundant storage reads on submit
  let cachedGlpiUrl = '';

  // Load configuration and apply theme + toggles
  chrome.storage.sync.get(
    { glpiUrl: '', theme: 'auto', showTicket: true, showChange: true, showProblem: true },
    (result) => {
      cachedGlpiUrl = result.glpiUrl || '';

      if (!result.glpiUrl) {
        configWarning.style.display = 'block';
        form.style.display = 'none';
        openOptionsBtn.style.display = 'inline-block';
      }

      // Apply theme
      if (result.theme === 'dark') {
        document.documentElement.classList.add('theme-dark');
      } else if (result.theme === 'light') {
        document.documentElement.classList.add('theme-light');
      }

      // Setup toggle buttons based on enabled types
      const available = {
        'ticket': result.showTicket,
        'change': result.showChange,
        'problem': result.showProblem
      };
      setupToggles(available);
    }
  );

  // Open options page
  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ticketId = ticketIdInput.value;

    // Validate ticket ID (same regex as background.js context menu)
    const trimmedId = ticketId.trim();
    if (!/^\d+$/.test(trimmedId) || parseInt(trimmedId, 10) < 1) return;

    // Get selected type (safely)
    const selectedInput = form.querySelector('input[name="type"]:checked');
    if (!selectedInput) return; // Should not happen

    const type = selectedInput.value;

    // Use cached URL instead of another storage call
    if (cachedGlpiUrl) {
      // Validate URL scheme before navigation
      if (!isSafeUrl(cachedGlpiUrl)) {
        configWarning.style.display = 'block';
        form.style.display = 'none';
        return;
      }

      const targetUrl = `${cachedGlpiUrl}/front/${type}.form.php?id=${trimmedId}`;
      chrome.tabs.create({ url: targetUrl });
      window.close();
    } else {
      // Should not happen if we hid the form, but just in case
      configWarning.style.display = 'block';
      form.style.display = 'none';
    }
  });
});

if (typeof module !== 'undefined') {
  module.exports = {};
}
