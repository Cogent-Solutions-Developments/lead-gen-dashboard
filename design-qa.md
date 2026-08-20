# Design QA reports

## Campaign outreach setup

**Comparison Target**

- Source visual truth: user-provided campaign settings screenshot in this conversation (no filesystem path available).
- Intended implementation: `app/campaigns/[id]/page.tsx`, campaign outreach setup area.
- Intended viewport/state: desktop campaign detail page; LinkedIn setup card selected.

**Evidence Status**

- Production build: passed (`npm run build`).
- Lint: passed with pre-existing warnings only (`npm run lint`).
- The LinkedIn setup now includes a campaign-level message template; a lead-specific LinkedIn message takes precedence, and the campaign template is used as the delivery fallback.
- Rendered implementation screenshot: unavailable. The in-app preview browser could not establish its required sandbox connection, so no browser-rendered screenshot, viewport pixels, CSS size, density normalization, interaction test, or console check could be captured.
- Focused-region comparison: blocked for the same reason.

**Findings**

- [P1] Visual comparison is not yet possible.
  Location: local campaign detail preview.
  Evidence: the required in-app browser connection failed before a rendered page could be captured.
  Impact: responsive layout, visual hierarchy, and the three editable states cannot be visually validated against the source screenshot.
  Fix: open the campaign detail page in the in-app browser, capture the LinkedIn, Email, and Follow-up selected states, then compare against the source visual.

**Required Fidelity Surfaces**

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: blocked pending rendered capture.
- Colors and visual tokens: blocked pending rendered capture.
- Image quality and asset fidelity: no new raster image assets; icon rendering remains blocked pending rendered capture.
- Copy and content: code review confirms the three channel labels, setup descriptions, status labels, and action labels are present.

**Implementation Checklist**

1. Restore in-app browser preview access.
2. Capture the selected LinkedIn, Email, and Follow-up states at the same desktop viewport.
3. Check card selection, save/delete/clear controls, and responsive stacking.
4. Update this report with comparison evidence and a final pass/fail result.

final result: blocked

## Lead request dialog

- Source visual truth: `C:\Users\SASAN-~1\AppData\Local\Temp\codex-clipboard-cdba767b-2340-47b4-8ebd-ff0a31720bf5.png`
- Implementation screenshot: unavailable; `/my-leads` redirected to `/sign-in` in the available browser session.
- Viewport: intended 1920 × 1080 CSS px.
- Pixels/density: source 1920 × 1080 px at 1×; implementation unavailable.
- State: light theme, request dialog open, empty recent list.

## Comparison

- Full view: blocked because the authenticated implementation could not be captured.
- Focused form region: blocked for the same reason.
- Fonts, spacing, colors, assets, and copy could not be visually compared. Source-code review confirms the existing dialog tokens remain unchanged; only the requested textarea and concise copy changed.

## Findings

- [P2] Visual fidelity remains unverified behind authentication.
  Fix: sign in, open **Request leads**, then capture and compare at 1920 × 1080.

## Comparison history

- 2026-08-20: capture attempt reached `/sign-in`; no visual fixes were inferred without rendered evidence.

final result: blocked
