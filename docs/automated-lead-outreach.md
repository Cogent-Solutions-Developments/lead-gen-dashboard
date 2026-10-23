# Status Outreach

Super admins enter **Status Outreach** below Admin Panel on Choose Persona.
The dashboard summarizes sales, delegate and production lead sequences. The
dedicated sidebar opens department events, then event status clusters.

Event lists and lead sheets reuse the existing campaign presentation and status
controls. Compact rows retain profile, contact information, content review,
status, sent indicators and quick actions. View opens generated emails and
delivery timestamps; history opens on demand. Provider callbacks supply delivery,
open, click, reply, bounce and unsubscribe dates. Data refreshes every 30 seconds
while visible.

## Settings

- **Settings → Content Generation → Status Outreach** contains the
  model, reasoning effort, output token limit and editorial guidance in its own tab with usage, agent stages, gates, history and recovery. The existing
  Control Center has its own tab and remains unchanged. Delivery tracking and activity history appear after the Status Outreach runs and load when expanded.
- **Settings → Outreach Configuration → Mail webhook → Status Outreach** is
  the fourth mail group after Production, using the existing add, rename,
  activate/deactivate, delete, URL masking and rotation controls. The global delivery switch appears below its webhook list. Sender and callback
  settings are reused from the existing Make.com mail flow. There is no separate Status Outreach top-level delivery tab.
  Sales, Delegate, Production, WhatsApp and credentials retain their own controls.

Each form saves only its own fields through `/api/admin/automated-outreach/configuration/content`
or `/configuration/delivery`. Concurrent revision conflicts preserve the draft
until **Reload saved values** is selected. Delivery settings save only the enabled switch and revision. Webhooks use the existing mail manager API, independently of content settings. No separate Admin Panel outreach item is
added. The former `/admin/automated-outreach` URL redirects into Outreach Configuration.

Stop and opt-out are terminal; Pause can resume. Only generation failures before
provider handoff offer Retry content; uncertain deliveries require reconciliation.
All requests use the existing authenticated API client and the
`/api/admin/automated-outreach` namespace. The backend requires a human super-admin
session and owns discovery, status exclusions, schedules and send limits.
The client never schedules sends or creates messages.

The backend rollout guide is `docs/automated-lead-outreach.md` in
`lead-generation-tool`. Deploy its matching branch, migrate the six isolated tables and the mail-table department constraint, then start the dedicated worker/Beat before enabling delivery. The agent
reuses `AGENTIC_CONTENT_OPENAI_API_KEY`. There are no new outreach environment
variables. Eligible leads enroll automatically with three follow-ups at least
four days apart.

Validation: `npm test`, `npm run type-check`, `npm run lint`, `npm run build`.

Status Outreach uses a separate Planner → Writer → Reviewer pipeline. The status
agent tab reports its own measured tokens, request counts, per-stage usage and
saved checkpoints. Recover queues failed generation without resending uncertain
mail. Each event has an outreach switch, enabled by default; New-status leads
are excluded by the backend from this feature. Model and gate settings remain
in Content Generation; the dedicated webhook group remains in Outreach Configuration. The API and worker require the additive status_outreach_runs
table migration before rollout.


Status Outreach sends through active webhooks in the `status-outreach` mail
group only. Make receives the normal `person.email`, `messages.email_subject`
and `messages.email_body` fields, plus isolated callback and idempotency metadata.
The original lead department is supplied as `source_department`. Route selection
is recorded in activity history. Legacy per-department outreach JSON endpoints
are no longer used; add the intended endpoints to the new mail group explicitly.
Old `/settings?section=automated-outreach` bookmarks still open the new mail group.


The extra sender name/email, public callback URL and signing secret fields are
removed. Make controls the sender account. The payload reuses the platform's
existing callback URL and token; no new configuration is required. In the Status
Outreach Make scenario, include `status_outreach_message_id` and `lead_id` in its
existing `/api/make/send-status` callback. The shared callback queue dispatches
these targets to an isolated handler; campaign and manual follow-up callbacks
continue unchanged. Do not include a campaign `draft_id` or `follow_up_id` for
Status Outreach. Deploy the updated callback worker along with the API and
Status Outreach worker. The former separate HMAC callback endpoint is removed.

Opening View automatically requests saved content previews for all three outreach
steps. Preparation runs on the existing Status Outreach worker; the dialog polls
for subject/body updates and provides retry for failed preparation. The first
scheduler dispatch may take up to one minute. Saved previews are reused. Final
content is refreshed by the send worker using current status and confirmed prior
emails. Previews are labeled and do not send mail, count as sent, or alter dates.
Deploy the updated frontend, API, and dedicated outreach worker together.