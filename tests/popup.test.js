const popupHtmlPath = '../src/popup.html';
const fs = require('fs');
const path = require('path');
const popupHtmlCode = fs.readFileSync(path.join(__dirname, popupHtmlPath), 'utf8');

describe('Popup Script', () => {
    let getMsgMock;

    beforeEach(() => {
        jest.resetModules();

        // Mock window.close to prevent jsdom from destroying the document object
        // (window.close() is spec-conformant in jsdom and kills the window
        // for the entire test suite)
        window.close = jest.fn();

        // Reset DOM
        document.documentElement.innerHTML = popupHtmlCode;

        // Mock I18n globally
        getMsgMock = jest.fn(key => key);
        global.I18n = {
            translatePage: jest.fn().mockResolvedValue(getMsgMock)
        };

        // Reset Chrome mocks
        jest.clearAllMocks();
        chrome.storage.sync.get.mockReset();
        chrome.tabs.create.mockReset();
        chrome.runtime.openOptionsPage.mockReset();
    });

    async function loadPopup() {
        jest.isolateModules(() => {
            require('../src/popup.js');
        });

        // Trigger DOMContentLoaded
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        // Wait for async translatePage
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    test('shows warning if GLPI URL is not configured', async () => {
        chrome.storage.sync.get.mockImplementation((_, callback) => {
            callback({ glpiUrl: '', theme: 'auto', showTicket: true, showChange: true, showProblem: true });
        });

        await loadPopup();

        const warning = document.getElementById('config-warning');
        const form = document.getElementById('navigate-form');

        expect(warning.style.display).toBe('block');
        expect(form.style.display).toBe('none');
    });

    test('shows form if GLPI URL is configured', async () => {
        chrome.storage.sync.get.mockImplementation((_, callback) => {
            callback({ glpiUrl: 'https://glpi.test', theme: 'auto', showTicket: true, showChange: true, showProblem: true });
        });

        await loadPopup();

        const form = document.getElementById('navigate-form');

        expect(form.style.display).not.toBe('none');
    });

    test('initializes toggles based on storage', async () => {
        chrome.storage.sync.get.mockImplementation((_, callback) => {
            callback({ glpiUrl: 'https://glpi.test', theme: 'auto', showTicket: true, showChange: false, showProblem: true });
        });

        await loadPopup();

        const container = document.getElementById('toggle-container');
        const labels = container.querySelectorAll('label');

        expect(labels.length).toBe(2); // Ticket and Problem
        expect(labels[0].id).toBe('label-ticket');
        expect(labels[1].id).toBe('label-problem');
    });

    test('submits form, opens tab, and closes popup', async () => {
        chrome.storage.sync.get.mockImplementation((_, callback) => {
            callback({ glpiUrl: 'https://glpi.test', theme: 'auto', showTicket: true, showChange: true, showProblem: true });
        });

        await loadPopup();

        // Fill input
        const input = document.getElementById('ticketId');
        input.value = '12345';

        // Submit
        const form = document.getElementById('navigate-form');
        form.dispatchEvent(new Event('submit'));

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.test/front/ticket.form.php?id=12345'
        });
        expect(window.close).toHaveBeenCalled();
    });

    describe('ticket ID validation', () => {
        beforeEach(() => {
            // Shared storage mock for all validation tests
            chrome.storage.sync.get.mockImplementation((_, callback) => {
                callback({ glpiUrl: 'https://glpi.test', theme: 'auto', showTicket: true, showChange: true, showProblem: true });
            });
        });

        test.each([
            ['', 'empty string'],
            ['0', 'zero'],
            ['-1', 'negative'],
            ['abc', 'non-numeric'],
            ['12.5', 'decimal'],
        ])('rejects invalid ticket ID: %s (%s)', async (value) => {
            await loadPopup();

            const input = document.getElementById('ticketId');
            input.value = value;

            const form = document.getElementById('navigate-form');
            form.dispatchEvent(new Event('submit'));

            expect(chrome.tabs.create).not.toHaveBeenCalled();
        });
    });
});
