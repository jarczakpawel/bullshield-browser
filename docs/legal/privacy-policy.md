# Bullshield Privacy Policy

Last updated: 2026-04-10

Bullshield is a browser extension that applies anti-fingerprinting protections inside the browser.

## Single purpose

Bullshield has one purpose: reducing browser fingerprint inconsistencies by replacing exposed browser and device identity surfaces with one coherent generated profile.

## How Bullshield operates

Bullshield modifies selected browser-visible values and selected outgoing request headers so websites receive one coherent generated profile instead of the real browser and device fingerprint.

Bullshield is designed to operate locally inside the browser extension runtime. Bullshield does not require a user account for its core functionality.

## What Bullshield handles

To provide its user-facing feature, Bullshield handles current-site and browser context such as active tab URLs, domains, site access state, and temporary in-browser payload handoff data used to apply the active generated profile before site scripts execute.

Bullshield does not transmit browsing activity or page content to a developer backend for its core local operation.

## Data stored by the extension

Bullshield stores the following extension data in browser extension storage:

- settings
- the currently active generated profile
- profile history explicitly saved by the user
- onboarding and disclosure state

Storage locations used by the extension:

- `chrome.storage.sync` for settings, when available
- `chrome.storage.local` for the active profile, history, and onboarding state

Bullshield does not operate a backend account system and does not need a developer server for its core runtime.

## Data transfer and sharing

Bullshield does not sell browsing data.

Bullshield does not share browsing data with advertisers or data brokers.

Bullshield does not inject ads, sponsored content, or hidden tracking beacons.

Bullshield does not execute remotely hosted code as part of its core runtime.

Bullshield ships bundled browser-version and profile data inside the extension build. Core runtime operation does not depend on remote browser-version fetching.

## Permissions used

- `<all_urls>` - applies coherent protection on sites where Bullshield is active
- `scripting` - injects runtime protection at `document_start`
- `declarativeNetRequest` - aligns outgoing request headers with the active profile
- `debugger` - applies early browser-level overrides and worker-related overrides
- `cookies` - passes the active profile payload into the page before site scripts execute
- `webNavigation` - prepares the page payload before navigation starts
- `storage` - stores settings, the active profile, history, and onboarding state
- `tabs` - reads active-tab context for popup state, current-domain state, and refresh actions
- `alarms` - schedules profile refresh timers

## Limited Use disclosure

Bullshield uses extension access only to provide its single purpose: anti-fingerprinting protection and coherent browser-profile spoofing inside the browser.

Bullshield does not use or transfer user data for:

- advertising
- sale to data brokers
- creditworthiness or lending decisions
- unrelated analytics
- unrelated profiling

## Contact

Developer: Paweł Jarczak
Project homepage: https://github.com/jarczakpawel/bullshield-browser
Support: https://github.com/jarczakpawel/bullshield-browser/issues
