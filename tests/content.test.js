const contentPath = '../src/content.js';

// Override only the chrome.runtime APIs needed, keeping jest-chrome's other APIs
global.chrome = {
    ...global.chrome,
    runtime: {
        ...global.chrome?.runtime,
        id: 'test-extension-id',
        sendMessage: jest.fn(() => Promise.resolve()),
    }
};

describe('Content Script', () => {
    let selectionChangeHandler;

    beforeEach(() => {
        jest.resetModules();

        // Reset sendMessage mock
        chrome.runtime.sendMessage.mockReset();
        chrome.runtime.sendMessage.mockResolvedValue(undefined);
        chrome.runtime.id = 'test-extension-id';

        // Capture the selectionchange handler
        selectionChangeHandler = null;
        document.addEventListener = jest.fn((event, handler) => {
            if (event === 'selectionchange') {
                selectionChangeHandler = handler;
            }
        });

        // Default selection: empty
        window.getSelection = jest.fn(() => ({
            toString: () => '',
            trim: function () { return this.toString().trim(); }
        }));
    });

    function loadContent() {
        jest.isolateModules(() => {
            require(contentPath);
        });
    }

    // Helper: fire selectionchange and advance debounce timer
    function fireSelectionChange() {
        selectionChangeHandler();
        jest.advanceTimersByTime(150);
    }

    describe('debounce behavior', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('calls handler after debounce delay', () => {
            loadContent();
            expect(selectionChangeHandler).not.toBeNull();

            window.getSelection.mockReturnValue({
                toString: () => '12345',
                trim: function () { return this.toString().trim(); }
            });

            // Trigger selection change
            selectionChangeHandler();

            // Should NOT have been called immediately (debounce)
            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();

            // Fast-forward past the 150ms debounce
            jest.advanceTimersByTime(150);

            // Now it should have been called
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'updateContextMenu',
                selectionText: '12345',
                show: true
            });
        });

        test('debounces multiple rapid calls', () => {
            loadContent();

            window.getSelection.mockReturnValue({
                toString: () => '12345',
                trim: function () { return this.toString().trim(); }
            });

            // Fire multiple times rapidly
            selectionChangeHandler();
            selectionChangeHandler();
            selectionChangeHandler();

            // Only advance partially
            jest.advanceTimersByTime(100);
            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();

            // Change selection before first fires
            window.getSelection.mockReturnValue({
                toString: () => '999',
                trim: function () { return this.toString().trim(); }
            });
            selectionChangeHandler();

            // Advance past the full delay from the last call
            jest.advanceTimersByTime(150);

            // Should only fire once with the latest value
            expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'updateContextMenu',
                selectionText: '999',
                show: true
            });
        });
    });

    describe('selectionchange handler', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('sends show message for numeric selection', () => {
            loadContent();

            window.getSelection.mockReturnValue({
                toString: () => '42',
                trim: function () { return this.toString().trim(); }
            });

            fireSelectionChange();

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'updateContextMenu',
                selectionText: '42',
                show: true
            });
        });

        test('sends hide message when selection changes from numeric to non-numeric', () => {
            loadContent();

            // First: show a numeric selection
            window.getSelection.mockReturnValue({
                toString: () => '123',
                trim: function () { return this.toString().trim(); }
            });
            fireSelectionChange();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ show: true })
            );

            // Clear call history
            chrome.runtime.sendMessage.mockClear();

            // Then: switch to non-numeric
            window.getSelection.mockReturnValue({
                toString: () => 'not a number',
                trim: function () { return this.toString().trim(); }
            });
            fireSelectionChange();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ show: false })
            );
        });

        test('does not send hide if already hidden', () => {
            loadContent();

            // First selection: non-numeric, lastStateWasVisible starts false
            window.getSelection.mockReturnValue({
                toString: () => 'abc',
                trim: function () { return this.toString().trim(); }
            });
            fireSelectionChange();

            // No message should be sent (not visible, nothing to hide)
            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        });

        test('trims selection text', () => {
            loadContent();

            window.getSelection.mockReturnValue({
                toString: () => '  007  ',
                trim: function () { return this.toString().trim(); }
            });

            fireSelectionChange();

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'updateContextMenu',
                selectionText: '007',
                show: true
            });
        });

        test('does nothing if extension context is invalidated', () => {
            loadContent();

            chrome.runtime.id = undefined;

            window.getSelection.mockReturnValue({
                toString: () => '12345',
                trim: function () { return this.toString().trim(); }
            });

            fireSelectionChange();

            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        });

        test('logs error on sendMessage rejection', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            chrome.runtime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));

            loadContent();

            window.getSelection.mockReturnValue({
                toString: () => '12345',
                trim: function () { return this.toString().trim(); }
            });

            fireSelectionChange();

            // Wait for microtask queue to flush
            await Promise.resolve();
            await Promise.resolve();

            expect(consoleSpy).toHaveBeenCalledWith(
                'updateContextMenu (show) failed:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        test('catches synchronous errors in handler', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Make getSelection throw BEFORE calling loadContent
            window.getSelection = jest.fn(() => {
                throw new Error('DOM error');
            });

            loadContent();

            // Call the handler, should not throw
            expect(() => selectionChangeHandler()).not.toThrow();

            // The debounce wraps the handler, so the actual try/catch is inside
            // the debounced function. We need to flush the timer for the error to appear.
            jest.advanceTimersByTime(150);

            expect(consoleSpy).toHaveBeenCalledWith(
                'selectionchange handler error:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('document.addEventListener registration', () => {
        test('registers selectionchange listener', () => {
            loadContent();
            expect(document.addEventListener).toHaveBeenCalledWith(
                'selectionchange',
                expect.any(Function)
            );
        });
    });
});
