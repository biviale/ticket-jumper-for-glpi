const backgroundPath = '../src/background.js';


describe('Background Script', () => {
    let onClickedListener;

    beforeEach(() => {
        jest.resetModules();
        delete chrome.runtime.lastError;

        // Clear listeners for runtime.onMessage (handled by jest-chrome)
        chrome.runtime.onMessage.clearListeners();

        // Manually mock contextMenus.onClicked
        onClickedListener = null;
        chrome.contextMenus.onClicked = {
            addListener: jest.fn((cb) => { onClickedListener = cb; }),
            hasListeners: jest.fn(() => !!onClickedListener),
            removeListener: jest.fn(),
            clearListeners: jest.fn() // Add this just in case
        };

        chrome.contextMenus.create.mockReset();
        chrome.contextMenus.update.mockReset();
        chrome.contextMenus.remove.mockReset();
        chrome.tabs.create.mockReset();
        chrome.storage.sync.get.mockReset();
    });

    function loadBackground() {
        jest.isolateModules(() => {
            require(backgroundPath);
        });
    }

    test('registers message listener', () => {
        loadBackground();
        expect(chrome.runtime.onMessage.hasListeners()).toBe(true);
    });

    test('registers context menu listener', () => {
        loadBackground();
        expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalled();
    });

    test('handles updateContextMenu message - show', () => {
        loadBackground();
        const message = { type: 'updateContextMenu', show: true, selectionText: '123' };
        chrome.i18n.getMessage.mockReturnValue('Open Ticket 123');

        // Dispatch message
        chrome.runtime.onMessage.callListeners(message);

        expect(chrome.contextMenus.update).toHaveBeenCalledWith(
            'open-glpi-ticket',
            expect.objectContaining({
                visible: true,
                title: 'Open Ticket 123'
            })
        );
    });

    test('handles updateContextMenu message - hide', () => {
        loadBackground();
        const message = { type: 'updateContextMenu', show: false };

        chrome.runtime.onMessage.callListeners(message);

        expect(chrome.contextMenus.update).toHaveBeenCalledWith(
            'open-glpi-ticket',
            expect.objectContaining({
                visible: false
            })
        );
    });

    test('handles context menu click with valid ticket ID', () => {
        loadBackground();
        const info = { menuItemId: 'open-glpi-ticket', selectionText: ' 12345 ' };

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({ glpiUrl: 'https://glpi.example.com' });
        });

        // Manually call listener
        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.example.com/front/ticket.form.php?id=12345'
        });
    });

    test('handles context menu click with missing GLPI URL', () => {
        loadBackground();
        const info = { menuItemId: 'open-glpi-ticket', selectionText: '12345' };

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({}); // No URL
        });

        // Manually call listener
        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    describe('Omnibox', () => {
        let onInputChangedListener;
        let onInputEnteredListener;

        beforeEach(() => {
            // Mock chrome.omnibox structure if it doesn't exist
            chrome.omnibox = {
                onInputChanged: { addListener: jest.fn() },
                onInputEntered: { addListener: jest.fn() }
            };

            chrome.omnibox.onInputChanged.addListener.mockImplementation((cb) => { onInputChangedListener = cb; });
            chrome.omnibox.onInputEntered.addListener.mockImplementation((cb) => { onInputEnteredListener = cb; });
        });

        test('provides suggestions for valid input', () => {
            loadBackground();
            expect(onInputChangedListener).toBeDefined();

            const suggest = jest.fn();
            chrome.i18n.getMessage.mockImplementation((key) => key.toUpperCase()); // Mock i18n

            onInputChangedListener('123', suggest);

            expect(suggest).toHaveBeenCalledWith([
                { content: 'ticket 123', description: expect.stringContaining('TICKET') },
                { content: 'change 123', description: expect.stringContaining('CHANGE') },
                { content: 'problem 123', description: expect.stringContaining('PROBLEM') }
            ]);
        });

        test('ignores empty input for suggestions', () => {
            loadBackground();
            const suggest = jest.fn();
            onInputChangedListener('   ', suggest);
            expect(suggest).not.toHaveBeenCalled();
        });

        test('navigates to ticket by default', () => {
            loadBackground();
            expect(onInputEnteredListener).toBeDefined();

            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: 'https://glpi.example.com' });
            });

            onInputEnteredListener('123', 'currentTab');

            expect(chrome.tabs.update).toHaveBeenCalledWith({
                url: 'https://glpi.example.com/front/ticket.form.php?id=123'
            });
        });

        test('navigates to change when specified', () => {
            loadBackground();
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: 'https://glpi.example.com' });
            });

            onInputEnteredListener('c 456', 'newForegroundTab');

            expect(chrome.tabs.create).toHaveBeenCalledWith({
                url: 'https://glpi.example.com/front/change.form.php?id=456',
                active: true
            });
        });

        test('opens options if URL not configured', () => {
            loadBackground();
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({});
            });

            onInputEnteredListener('123', 'currentTab');

            expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
        });
    });
});
