const i18nPath = '../src/i18n.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('I18n', () => {
    let I18n;

    beforeEach(() => {
        jest.resetModules(); // Reset cache to re-require
        jest.clearAllMocks();

        // Mock Chrome API
        delete chrome.runtime.lastError;
        chrome.storage.sync.get.mockReset();
        chrome.runtime.getURL.mockReset();

        // Require the module
        I18n = require(i18nPath);
    });

    test('loadTranslations returns null if storage fails', async () => {
        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            chrome.runtime.lastError = { message: 'Error' };
            callback({});
        });

        const result = await I18n.loadTranslations();
        expect(result).toBeNull();
    });

    test('loadTranslations returns null if language is auto', async () => {
        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({ language: 'auto' });
        });

        const result = await I18n.loadTranslations();
        expect(result).toBeNull();
    });

    test('loadTranslations fetches messages for specific language', async () => {
        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({ language: 'fr' });
        });
        chrome.runtime.getURL.mockReturnValue('mock-url');

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ testKey: { message: 'Bonjour' } })
        });

        const result = await I18n.loadTranslations();
        expect(result).toEqual({ testKey: { message: 'Bonjour' } });
        expect(chrome.runtime.getURL).toHaveBeenCalledWith('_locales/fr/messages.json');
    });

    test('translatePage translates elements', async () => {
        // Setup DOM
        document.body.innerHTML = `
      <div data-i18n="hello"></div>
      <input type="submit" data-i18n="submitBtn" />
    `;

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({ language: 'en' });
        });
        chrome.runtime.getURL.mockReturnValue('mock-url');
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                hello: { message: 'Hello World' },
                submitBtn: { message: 'Go' }
            })
        });

        const getMsg = await I18n.translatePage();

        expect(document.querySelector('div').textContent).toBe('Hello World');
        expect(document.querySelector('input').value).toBe('Go');
        expect(getMsg('hello')).toBe('Hello World');
    });
});
