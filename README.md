# URL Cleaner - Remove UTM

Chrome extension that strips `utm_*` tracking query parameters as soon as you navigate to a page.

## Install (unpacked)
- Open Chrome and go to `chrome://extensions/`.
- Enable **Developer mode** (top right).
- Click **Load unpacked** and choose this folder.

## How it works
- A background service worker watches tab navigations.
- If the URL contains any query parameter starting with `utm_`, the extension reloads the tab with a cleaned URL (no utm params), avoiding redirect loops.

## Development notes
- Manifest V3 extension using `tabs` and `<all_urls>` host permissions.
- Main logic lives in `background.js`.
