document.addEventListener('DOMContentLoaded', async () => {
  // Initialize translations
  const getMsg = await I18n.translatePage();

  const form = document.getElementById('navigate-form');
  const ticketIdInput = document.getElementById('ticketId');
  const configWarning = document.getElementById('config-warning');
  const openOptionsBtn = document.getElementById('open-options');

  // Check if URL is configured
  chrome.storage.sync.get(['glpiUrl', 'theme'], (result) => {
    if (!result.glpiUrl) {
      configWarning.style.display = 'block';
      form.style.display = 'none';
      openOptionsBtn.style.display = 'inline-block'; // Ensure button is shown
    }

    // Apply theme
    if (result.theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else if (result.theme === 'light') {
      document.documentElement.classList.add('theme-light');
    }
  });

  // Open options page
  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  // Handle toggle logic
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

  // Load enabled types from storage
  chrome.storage.sync.get(
    { showTicket: true, showChange: true, showProblem: true },
    (items) => {
      const available = {
        'ticket': items.showTicket,
        'change': items.showChange,
        'problem': items.showProblem
      };
      setupToggles(available);
    }
  );

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ticketId = ticketIdInput.value;

    // Get selected type (safely)
    const selectedInput = form.querySelector('input[name="type"]:checked');
    if (!selectedInput) return; // Should not happen

    const type = selectedInput.value;

    chrome.storage.sync.get(['glpiUrl'], (result) => {
      if (result.glpiUrl) {
        let targetUrl = `${result.glpiUrl}/front/${type}.form.php?id=${ticketId}`;

        if (targetUrl) {
          chrome.tabs.create({ url: targetUrl });
          window.close();
        }
      } else {
        // Should not happen if we hid the form, but just in case
        configWarning.style.display = 'block';
        form.style.display = 'none';
      }
    });
  });
});

if (typeof module !== 'undefined') {
  module.exports = {};
}
