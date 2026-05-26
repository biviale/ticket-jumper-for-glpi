# Ticket Jumper for GLPI

**Ticket Jumper** is a lightweight browser extension compatible with Chromium (Chrome, Edge, Brave) and Firefox. It allows you to instantly navigate to GLPI tickets, changes, or problems by their ID without navigating through menus.
This project is heavily inspired by the extension [Go2Ticket by Clément](https://addons.mozilla.org/en-US/firefox/addon/go2ticket/). Since that extension was not updated to Manifest V3 and can no longer be used in Google Chrome, I decided to create a new one with a few additional features I thought would be useful.

## Features

- **Fast Navigation**: Type an ID and hit Enter (or click "Go!") to open the ticket in a new tab.
- **Multi-Type Support**: fast switch between **Tickets**, **Changes**, and **Problems**.
- **Smart Context Menu**: Select any number on any webpage, right-click, and choose "Open GLPI [type] #..." to jump straight to it.
  - *Dynamic type*: the menu respects your configured visible types (ticket, change, or problem).
  - *Non-intrusive*: The menu item only appears when you select a valid number.
- **Internationalization**: Localized in **English** and **French**. More languages can be added in the future.
- **Modern UI**:
  - Automatic **Dark Mode** support.
  - Responsive and keyboard-friendly interface.
  - Customizable visible ticket types.
- **Secure & Private**: Your GLPI URL is stored locally in your browser. No data is sent to external servers.

## Installation

This extension is currently available as an "unpacked" extension for developer or manual installation. Publication to Chrome Web Store and Mozilla Add-Ons to come.

### Chromium (Chrome, Edge, Brave)

1. Download or clone this repository.
2. Open your browser and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked**.
5. Select the folder containing the extension files.

### Firefox

#### Building for Firefox (Required)

Since Firefox uses a slightly different manifest format, you must first run the build script to generate the compatible files in `dist-firefox`:

```bash
npm run build
```

#### Loading the Extension

1. Open Firefox and navigate to `about:debugging`.
2. Click **This Firefox** on the left.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` file from the `dist-firefox` folder.

## Configuration

1. Click the extension icon in your browser toolbar.
2. If it's your first time, you will be prompted to configure the settings. Click **Open Options** (or through Options in the Manage Extensions menu).
3. **GLPI Base URL**: Enter the base URL of your GLPI instance (e.g., `https://glpi.yourcompany.com`).
4. **Language**: Auto-detects system language, or force English/French.
5. **Theme**: Auto-detects browser theme, or force Dark/Light mode.
6. **Visible Ticket Types**: Choose which buttons (Ticket, Change, Problem) you want to see in the popup.
7. Click **Save**.

## Usage

### Popup Navigation

1. Click the extension icon.
2. Select the type (Ticket, Change, or Problem).
3. Enter the ID.
4. Press **Enter** or click **Go!**.

### Smart Context Menu

1. Highlight any number on a webpage.
2. Right-click the selection.
3. Select **Open GLPI ticket #[Number]**.

### Omnibox (Address Bar)

1. Type `tj` (for ticket jump) in the address bar and press **Tab** or **Space**.
2. Type the ID (e.g., `123`).
    - Defaults to **Ticket**.
    - To specify type, use `c 123`, `change 123` (Change) or `p 123`, `problem 123` (Problem).
3. Press **Enter**.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Development & Testing

This project uses **Jest** for unit testing.

### Prerequisites

- Node.js and npm installed.

### Setup

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

   > **Note**: The `--legacy-peer-deps` flag is required because `jest-chrome` specifies an older version of Jest as a peer dependency, but works correctly with the newer version used in this project.

### Running Tests

Run all tests with coverage:

```bash
npm test
```

### Debugging in VS Code

A `.vscode/launch.json` is provided. You can debug tests by:

1. Opening the **Run and Debug** sidebar.
2. Selecting **Jest All** or **Jest Current File**.
3. Pressing **F5**.

## Acknowledgments

- Developed with the assistance of AI.
