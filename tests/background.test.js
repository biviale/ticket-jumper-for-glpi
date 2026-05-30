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
            callback({
                glpiUrl: 'https://glpi.example.com',
                showTicket: true,
                showChange: true,
                showProblem: true
            });
        });

        // Manually call listener
        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.example.com/front/ticket.form.php?id=12345'
        });
    });

    test('context menu respects first enabled type (change)', () => {
        loadBackground();
        const info = { menuItemId: 'open-glpi-ticket', selectionText: '42' };

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({
                glpiUrl: 'https://glpi.example.com',
                showTicket: false,
                showChange: true,
                showProblem: true
            });
        });

        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.example.com/front/change.form.php?id=42'
        });
    });

    test('context menu respects first enabled type (problem)', () => {
        loadBackground();
        const info = { menuItemId: 'open-glpi-ticket', selectionText: '99' };

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({
                glpiUrl: 'https://glpi.example.com',
                showTicket: false,
                showChange: false,
                showProblem: true
            });
        });

        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.example.com/front/problem.form.php?id=99'
        });
    });

    test('context menu falls back to ticket when all disabled', () => {
        loadBackground();
        const info = { menuItemId: 'open-glpi-ticket', selectionText: '7' };

        chrome.storage.sync.get.mockImplementation((keys, callback) => {
            callback({
                glpiUrl: 'https://glpi.example.com',
                showTicket: false,
                showChange: false,
                showProblem: false
            });
        });

        expect(onClickedListener).toBeDefined();
        onClickedListener(info);

        expect(chrome.tabs.create).toHaveBeenCalledWith({
            url: 'https://glpi.example.com/front/ticket.form.php?id=7'
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

    describe('Content Script Registration', () => {
        beforeEach(() => {
            // Mock chrome.scripting APIs (not provided by jest-chrome).
            // Use thenable objects that execute synchronously to avoid
            // microtask timing issues with real Promises.
            chrome.scripting = {
                registerContentScripts: jest.fn(() => ({
                    catch: jest.fn()  // fire-and-forget: .catch chains but never called
                })),
                unregisterContentScripts: jest.fn(() => ({
                    catch: jest.fn().mockReturnValue({
                        finally: jest.fn(fn => fn())  // execute .finally synchronously
                    })
                }))
            };
        });

        // --- Recovery path: top-level registration on service worker startup ---

        test('registers content script on startup when GLPI URL is configured', () => {
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: 'https://glpi.example.com' });
            });

            loadBackground();

            expect(chrome.storage.sync.get).toHaveBeenCalledWith(
                { glpiUrl: '' },
                expect.any(Function)
            );
            expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
                ids: ['ticket-jumper-content']
            });
            expect(chrome.scripting.registerContentScripts).toHaveBeenCalledWith([{
                id: 'ticket-jumper-content',
                matches: ['https://glpi.example.com/*'],
                js: ['content.js'],
                runAt: 'document_idle'
            }]);
        });

        test('does not register content script when GLPI URL is empty', () => {
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: '' });
            });

            loadBackground();

            expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
                ids: ['ticket-jumper-content']
            });
            // No matches → registerContentScripts should not be called
            expect(chrome.scripting.registerContentScripts).not.toHaveBeenCalled();
        });

        test('does not register content script when GLPI URL is unsafe', () => {
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: 'javascript:alert(1)' });
            });

            loadBackground();

            expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
                ids: ['ticket-jumper-content']
            });
            expect(chrome.scripting.registerContentScripts).not.toHaveBeenCalled();
        });

        // --- storage.onChanged listener ---

        test('re-registers content script when glpiUrl changes', () => {
            // Override storage.onChanged to capture the listener
            let onChangedListener;
            chrome.storage.onChanged = {
                addListener: jest.fn(cb => { onChangedListener = cb; })
            };

            // Mock the top-level storage.get to return empty URL (don't register initially)
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: '' });
            });

            loadBackground();

            expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();

            // Clear scripting mocks to isolate the onChanged call
            chrome.scripting.registerContentScripts.mockClear();
            chrome.scripting.unregisterContentScripts.mockClear();

            // Simulate glpiUrl change
            expect(onChangedListener).toBeDefined();
            onChangedListener(
                { glpiUrl: { newValue: 'https://new-glpi.example.com' } },
                'sync'
            );

            expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith({
                ids: ['ticket-jumper-content']
            });
            expect(chrome.scripting.registerContentScripts).toHaveBeenCalledWith([{
                id: 'ticket-jumper-content',
                matches: ['https://new-glpi.example.com/*'],
                js: ['content.js'],
                runAt: 'document_idle'
            }]);
        });

        test('does not re-register for non-glpiUrl storage changes', () => {
            let onChangedListener;
            chrome.storage.onChanged = {
                addListener: jest.fn(cb => { onChangedListener = cb; })
            };

            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: '' });
            });

            loadBackground();

            chrome.scripting.registerContentScripts.mockClear();
            chrome.scripting.unregisterContentScripts.mockClear();

            // Simulate theme change (not glpiUrl)
            onChangedListener(
                { theme: { newValue: 'dark' } },
                'sync'
            );

            // Neither register nor unregister should be called
            expect(chrome.scripting.unregisterContentScripts).not.toHaveBeenCalled();
            expect(chrome.scripting.registerContentScripts).not.toHaveBeenCalled();
        });

        test('ignores changes from non-sync storage areas', () => {
            let onChangedListener;
            chrome.storage.onChanged = {
                addListener: jest.fn(cb => { onChangedListener = cb; })
            };

            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: '' });
            });

            loadBackground();

            chrome.scripting.registerContentScripts.mockClear();
            chrome.scripting.unregisterContentScripts.mockClear();

            // Simulate glpiUrl change from local storage (not sync)
            onChangedListener(
                { glpiUrl: { newValue: 'https://evil.example.com' } },
                'local'
            );

            expect(chrome.scripting.unregisterContentScripts).not.toHaveBeenCalled();
            expect(chrome.scripting.registerContentScripts).not.toHaveBeenCalled();
        });

        test('handles registerContentScripts failure gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Override the registerContentScripts mock to simulate failure
            // The .catch callback must be invoked synchronously
            chrome.scripting.registerContentScripts = jest.fn(() => ({
                catch: jest.fn(fn => fn(new Error('Permission denied')))
            }));

            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ glpiUrl: 'https://glpi.example.com' });
            });

            // Should not throw
            expect(() => loadBackground()).not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to register content script:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
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
