# AGENTS.md Configuration

This file outlines the collaboration guidelines and architectural decisions for maintaining the GLPI Ticket Jumper extension (v1.1+).

## 🤝 Collaboration Style

*   **Concise & Direct:** All responses must be short, direct, and to the point. Avoid preamble, filler words, or unnecessary explanations unless a decision requires user input.
*   **Action-Oriented:** Lead with the code or action being taken, not the reasoning that led to it. If an explanation is needed, keep it minimal.
*   **High Autonomy (With Guardrails):** I trust my judgment on implementation details but require confirmation for high-risk actions (e.g., modifying shared configuration, pushing remote changes).

## ⚙️ Architectural Decisions & Best Practices

### Project Structure
*   **`src/utils.js`** — Shared utility functions (e.g., `isSafeUrl`). Loaded globally by Chrome via `importScripts` (through `background-entry.js`) and by Firefox via manifest `"scripts": [...]`. Also loaded in popup/options pages via `<script>` tags.
*   **`src/background-entry.js`** — Chrome-only entry point that calls `importScripts('utils.js', 'background.js')`. Excluded from the Firefox build by `build.js` (Firefox uses manifest `"scripts": [...]` instead).
*   **`build.js`** — Copies `src/` to `dist-firefox/`, excluding `manifest.json` and `background-entry.js`. Uses `path.resolve()` for Windows-safe path comparison.

### State Management
*   **Event-Driven Updates:** For state changes originating in `options.js` (language, themes), **NEVER** rely on a full page reload for the popup to reflect the change. Use `chrome.runtime.sendMessage()` to dispatch an event to `background.js`, which then broadcasts the new state to all content scripts.
*   **Service Abstraction:** All logic related to interacting with the GLPI external API (e.g., URL construction, ID fetching) must be isolated within a dedicated `GLPIService` module. This decouples UI/state logic from the specific GLPI structure.

### Code Quality & Robustness
*   **I18n Loading:** To reduce startup latency, common language packs should be **pre-bundled** rather than fetched asynchronously at runtime via network requests (even if local).
*   **DOM Interaction:** Use **event delegation** in `popup.js` for handling radio/toggle changes to minimize repetitive DOM querying.
*   **Error Handling:** All error paths must use `console.error()` — silent error suppression (`.catch(() => {})`, empty `catch` blocks) is **forbidden**. Every `catch` must log the error.
*   **I18n Closure Pattern:** Pages that need translated messages should pass the `getMsg` function returned by `I18n.translatePage()` as a closure parameter (e.g., `saveOptions(e, getMsg)`) rather than mutating a global `I18n.currentMsg` property.

## 🛡️ Security & Reliability

*   **URL Validation:** All user-provided or stored GLPI base URLs must pass `isSafeUrl()` (defined in `src/utils.js`) — both at input time (`options.js`) and at consumption time (`background.js`, `popup.js`). The function uses `new URL()` for RFC-compliant parsing and restricts schemes to `http:` and `https:`.
*   **Defense in Depth:** Even though URL validation happens at input time, every consumption point must also call `isSafeUrl()` before navigation to handle cases of corrupted or tampered storage.
*   **web_accessible_resources:** Locale files (`_locales/*/messages.json`) must be restricted to extension-only URLs (`chrome-extension://*/*` or `moz-extension://*/*`), not `<all_urls>`.
*   **Logging:** When debugging, do not suppress errors. Use `console.error()` for all unhandled exceptions to ensure the operational status of the extension is always visible during development.