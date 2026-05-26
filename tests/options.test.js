const optionsHtmlPath = '../src/options.html';
const fs = require('fs');
const path = require('path');
const optionsHtmlCode = fs.readFileSync(path.join(__dirname, optionsHtmlPath), 'utf8');

describe('Options Script', () => {
    let getMsgMock;

    beforeEach(() => {
        jest.resetModules();

        // Reset DOM with options form
        document.documentElement.innerHTML = optionsHtmlCode;

        // Mock I18n globally
        getMsgMock = jest.fn(key => key);
        global.I18n = {
            translatePage: jest.fn().mockResolvedValue(getMsgMock)
        };

        // Reset Chrome mocks
        jest.clearAllMocks();
        chrome.storage.sync.get.mockReset();
        chrome.storage.sync.set.mockReset();

        // Default isSafeUrl returns true (valid URL)
        global.isSafeUrl = jest.fn().mockReturnValue(true);

        // Spy on reload
        Object.defineProperty(window, 'location', {
            value: { reload: jest.fn() },
            writable: true
        });
    });

    async function loadOptions() {
        jest.isolateModules(() => {
            require('../src/options.js');
        });

        // Trigger DOMContentLoaded
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        // Wait for async translatePage (real timers needed here)
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    function submitForm() {
        const form = document.getElementById('options-form');
        form.dispatchEvent(new Event('submit'));
    }

    describe('saveOptions - validation', () => {
        test('rejects if no type is selected', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: 'https://glpi.example.com',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            // Uncheck all types
            document.getElementById('showTicket').checked = false;
            document.getElementById('showChange').checked = false;
            document.getElementById('showProblem').checked = false;

            submitForm();

            const status = document.getElementById('status');
            expect(status.textContent).toBe('typeSelectionError');
            expect(status.style.color).toBe('red');
            expect(chrome.storage.sync.set).not.toHaveBeenCalled();
        });

        test('rejects unsafe URL schemes', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            // Override isSafeUrl to reject
            global.isSafeUrl = jest.fn().mockReturnValue(false);

            document.getElementById('glpiUrl').value = 'javascript:alert(1)';

            submitForm();

            const status = document.getElementById('status');
            expect(status.textContent).toBe('invalidUrlError');
            expect(status.style.color).toBe('red');
            expect(chrome.storage.sync.set).not.toHaveBeenCalled();

            // Restore isSafeUrl
            global.isSafeUrl = jest.fn().mockReturnValue(true);
        });

        test('type selection error auto-hides after 2 seconds', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: 'https://glpi.example.com',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            jest.useFakeTimers();

            document.getElementById('showTicket').checked = false;
            document.getElementById('showChange').checked = false;
            document.getElementById('showProblem').checked = false;

            submitForm();

            const status = document.getElementById('status');
            expect(status.classList.contains('show')).toBe(true);

            jest.advanceTimersByTime(2000);
            expect(status.classList.contains('show')).toBe(false);

            jest.useRealTimers();
        });
    });

    describe('saveOptions - success', () => {
        test('saves valid URL and displays success message', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            chrome.storage.sync.set.mockImplementation((_, callback) => {
                callback();
            });

            await loadOptions();

            document.getElementById('glpiUrl').value = 'https://glpi.example.com';

            submitForm();

            expect(chrome.storage.sync.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    glpiUrl: 'https://glpi.example.com'
                }),
                expect.any(Function)
            );

            const status = document.getElementById('status');
            expect(status.textContent).toBe('optionsSaved');
            expect(status.style.color).toBe('');
        });

        test('reloads page after save timeout', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            chrome.storage.sync.set.mockImplementation((_, callback) => {
                callback();
            });

            await loadOptions();

            jest.useFakeTimers();

            document.getElementById('glpiUrl').value = 'https://glpi.example.com';

            submitForm();

            // After save callback + 1000ms timeout
            jest.advanceTimersByTime(1000);
            expect(window.location.reload).toHaveBeenCalled();

            jest.useRealTimers();
        });

        test('strips trailing slash from URL', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            chrome.storage.sync.set.mockImplementation((_, callback) => {
                callback();
            });

            await loadOptions();

            document.getElementById('glpiUrl').value = 'https://glpi.example.com/';

            submitForm();

            expect(chrome.storage.sync.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    glpiUrl: 'https://glpi.example.com'
                }),
                expect.any(Function)
            );
        });

        test('trims whitespace from URL', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            chrome.storage.sync.set.mockImplementation((_, callback) => {
                callback();
            });

            await loadOptions();

            document.getElementById('glpiUrl').value = '   https://glpi.example.com   ';

            submitForm();

            expect(chrome.storage.sync.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    glpiUrl: 'https://glpi.example.com'
                }),
                expect.any(Function)
            );
        });
    });

    describe('restoreOptions', () => {
        test('fills form fields from storage', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: 'https://glpi.mycompany.com',
                    language: 'fr',
                    theme: 'dark',
                    showTicket: true,
                    showChange: false,
                    showProblem: true
                });
            });

            await loadOptions();

            expect(document.getElementById('glpiUrl').value).toBe('https://glpi.mycompany.com');
            expect(document.getElementById('language').value).toBe('fr');
            expect(document.getElementById('theme').value).toBe('dark');
            expect(document.getElementById('showTicket').checked).toBe(true);
            expect(document.getElementById('showChange').checked).toBe(false);
            expect(document.getElementById('showProblem').checked).toBe(true);
        });

        test('applies dark theme', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'dark',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
            expect(document.documentElement.classList.contains('theme-light')).toBe(false);
        });

        test('applies light theme', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'light',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            expect(document.documentElement.classList.contains('theme-light')).toBe(true);
            expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
        });

        test('removes theme classes for auto', async () => {
            document.documentElement.classList.add('theme-dark', 'theme-light');

            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
            expect(document.documentElement.classList.contains('theme-light')).toBe(false);
        });
    });

    describe('DOMContentLoaded', () => {
        test('attaches submit handler using closure getMsg', async () => {
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({
                    glpiUrl: '',
                    language: 'auto',
                    theme: 'auto',
                    showTicket: true,
                    showChange: true,
                    showProblem: true
                });
            });

            await loadOptions();

            expect(I18n.translatePage).toHaveBeenCalled();

            // Verify saveOptions uses the getMsg from closure
            getMsgMock.mockImplementation(key => {
                if (key === 'typeSelectionError') return 'CUSTOM ERROR';
                return key;
            });

            document.getElementById('showTicket').checked = false;
            document.getElementById('showChange').checked = false;
            document.getElementById('showProblem').checked = false;

            submitForm();

            const status = document.getElementById('status');
            expect(status.textContent).toBe('CUSTOM ERROR');
        });
    });
});
