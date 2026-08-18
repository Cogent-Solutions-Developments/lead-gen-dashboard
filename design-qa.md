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
