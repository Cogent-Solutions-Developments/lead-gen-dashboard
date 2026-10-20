# Lead intelligence and automated follow-ups

Super admins enter **Lead Intelligence** below Admin Panel on Choose Persona.
The dashboard summarizes sales, delegate and production lead sequences. The
dedicated sidebar opens department events, then event status clusters.

Event lists and lead sheets reuse the existing campaign presentation and status
controls. Compact rows retain profile, contact information, content review,
status, sent indicators and quick actions. Review opens generated emails and
delivery timestamps; history opens on demand. Provider callbacks supply delivery,
open, click, reply, bounce and unsubscribe dates. Data refreshes every 30 seconds
while visible.

## Settings

- **Settings → Content Generation → Automated follow-up content** contains the
  model, reasoning effort, output token limit and editorial guidance in its own
  expandable section. The existing Content Generation Control Center is retained.
- **Settings → Outreach Configuration → Automated follow-up mail** contains
  delivery enablement, sender, dedicated department webhooks, callback URL and
  encrypted signing secret, with optional delivery tracking and activity history.
  Existing mail webhooks, WhatsApp and credentials retain their own controls.

Each form saves only its own fields through `/api/admin/automated-outreach/configuration/content`
or `/configuration/delivery`. Concurrent revision conflicts preserve the draft
until **Reload saved values** is selected. Blank webhook and secret fields keep
saved values; removal must be explicit. No separate Admin Panel outreach item is
added. The former `/admin/automated-outreach` URL redirects into Outreach Configuration.

Stop and opt-out are terminal; Pause can resume. Only generation failures before
provider handoff offer Retry content; uncertain deliveries require reconciliation.
All requests use the existing authenticated API client and the
`/api/admin/automated-outreach` namespace. The backend requires a human super-admin
session and owns discovery, status exclusions, schedules and send limits.
The client never schedules sends or creates messages.

The backend rollout guide is `docs/automated-lead-outreach.md` in
`lead-generation-tool`. Deploy its matching branch, migrate the five isolated
tables and start the dedicated worker/Beat before enabling delivery. The agent
reuses `AGENTIC_CONTENT_OPENAI_API_KEY`. There are no new outreach environment
variables. Eligible leads enroll automatically with three follow-ups at least
four days apart.

Validation: `npm test`, `npm run type-check`, `npm run lint`, `npm run build`.
