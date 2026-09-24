# Design QA

- Source visual truth:
  - `C:\Users\SASAN-~1\AppData\Local\Temp\codex-clipboard-7965f944-d52a-4294-8f7e-206f47a295ce.png`
  - `C:\Users\SASAN-~1\AppData\Local\Temp\codex-clipboard-15d9b0d2-a348-4ccd-986c-4e9f5d7e675b.png`
- Source pixels: 1920 x 1080 for each screenshot
- Implementation URL: `http://localhost:3001/campaigns/6e7265c0-9ee5-4d28-bf45-9c8e391ebaa7`
- Implementation screenshot: unavailable; the local in-app browser redirected to `http://localhost:3001/sign-in`
- Intended viewport: desktop, matching the supplied 1920 x 1080 screenshots
- Implementation CSS size / density: unavailable because the authenticated campaign state could not be opened
- State: approved campaign leads with initial-email and manual follow-up delivery history

## Full-view comparison evidence

Both supplied source screenshots were opened at their original resolution. The campaign lead sheet uses a compact badge plus subtitle in the Status column, while the Manual Follow-ups modal uses a five-step horizontal delivery timeline. The protected post-change campaign screen could not be captured because the available local browser session redirected to sign-in.

## Focused-region comparison evidence

The Status column and follow-up timeline are legible in the source screenshots and were used as the focused visual targets. A matching rendered implementation capture is unavailable behind authentication, so no side-by-side visual comparison can be completed.

## Required fidelity surfaces

- Fonts and typography: the existing badge, subtitle, and compact timeline text classes are reused; visual comparison is blocked.
- Spacing and layout rhythm: the existing Status-column structure is retained. Timeline connectors are aligned to the top of the step nodes so optional date captions do not shift the line.
- Colors and visual tokens: existing blue, violet, emerald, and red semantic tokens are reused for ready, queued, sent, and failed delivery states.
- Image quality and asset fidelity: no raster assets, logos, illustrations, or custom SVG approximations were added.
- Copy and content: before approval the approval status remains visible; after approval the same column shows mail delivery state and a local-time subtitle. The modal shows confirmed timestamps beneath the initial and follow-up stages.

## Findings

- [P2] Authenticated post-change capture unavailable
  - Location: local campaign lead sheet and Manual Follow-ups modal.
  - Evidence: the in-app browser rendered `/sign-in` instead of the authenticated campaign route.
  - Impact: badge wrapping, date-caption density, and modal connector alignment cannot be visually compared at the requested state.
  - Fix: sign in to the local preview, open a campaign with confirmed initial and follow-up sends, and capture both the table and modal at 1920 x 1080.

## Comparison history

1. Source inspection: confirmed that the lead table currently shows approval state after approval and the follow-up timeline omits send dates.
2. Implementation update: added confirmed per-lead delivery history, switched approved email leads to delivery-state badges with dated subtitles, and added initial/follow-up timestamps to the modal timeline.
3. Post-change capture attempt: the local app was reachable, but the protected campaign route redirected to sign-in. No visual pass was claimed from code alone.

## Primary interactions tested

- Browser reachability: passed; the local app rendered its sign-in screen.
- Authenticated campaign table: not testable without an authenticated session.
- Manual Follow-ups modal: not testable without an authenticated session.
- Console errors: not checked in the protected target state because it could not be opened.

## Implementation checklist

- Sign in to the local preview.
- Open a campaign containing an approved lead with confirmed send history.
- Confirm pending/rejected leads still show approval status.
- Confirm approved unsent leads show `Ready to send`.
- Confirm sent leads show the latest email stage and localized confirmed send date.
- Open Manual Follow-ups and confirm initial and sent follow-up dates remain readable without horizontal clipping.

## Follow-up polish

None identified from the source artifacts. A browser-rendered authenticated comparison is still required.

final result: blocked
