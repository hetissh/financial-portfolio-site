# Pattern appearance and profile alignment — 27 September 2026

The Hero Patterns picker now displays all 87 bundled designs by default, with a name filter. The selected preview, word and appearance controls are above the catalogue. Choosing a pattern returns to that preview. Foreground colour, background colour and foreground opacity are independent and update immediately. Captions keep automatic contrast against the background. New selections start with black foreground and 40% opacity; older covers without these fields retain their automatic ink and 18% opacity.

The profile monogram field now uses “Up to 3 characters” as its placeholder. Its help paragraph was removed. Name and monogram inputs align with equal heights on desktop and stack with aligned left edges on mobile.

Verification in an isolated copy using Node 24.19 and Playwright 1.63:

- 52 unit checks passed, including safe hex/opacity validation, cover serialisation, zero/full opacity, custom static SVG colours, and legacy appearance.
- All 18 distinct admin browser cases passed across Chromium, Firefox and mobile WebKit. The profile case was rerun on mobile after correcting its assertion to account for stacked fields. Verified all 87 choices, last catalogue entry availability, custom colours and opacity after save/reload/reset, article rendering, profile geometry, existing admin/sheet/image workflows, narrow-screen fit and automated accessibility.
- 10 targeted public checks passed across desktop Chromium/Firefox/WebKit and mobile Chromium/WebKit. A disposable custom pattern fixture retained its foreground colour and opacity in the static export, including with JavaScript disabled. Existing cover rendering also passed.
- Build/type checks and lint passed. Desktop and mobile controls plus profile identity fields were inspected visually. No screenshot baseline exists, so automated visual regression remains inconclusive. Physical-device and screen-reader checks remain manual.

Only implementation, tests and documentation are installed in the original project. The temporary fixture and test content are excluded. The user's profile and research content are preserved.
