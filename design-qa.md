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
# Design QA — event document cards

## Reference

- Supplied crop: `C:\Users\SASAN-~1\AppData\Local\Temp\codex-clipboard-54ced570-a577-40a8-858c-d2452e3880c0.png`
- Target: the agenda area on the lead sheet, with equivalent speaker-list and delegate-list cards beneath it.

## Implementation checks

- The existing agenda section and its View / Download latest actions remain unchanged.
- The speaker and delegate documents render as separate, bordered sections rather than compact download rows.
- Each section has its own people icon, loading state, unavailable state, empty state, filename metadata, View action, and Download latest action.
- Normal users and manager/department views share this implementation through `NormalUserEventLeadSheet`.

## Automated comparison

Blocked on 2026-08-18: the Codex in-app browser runtime could not establish its trusted local connection, so a same-viewport prototype screenshot could not be captured or combined with the supplied reference. Static regression tests, full lint, TypeScript, and the production build passed.
