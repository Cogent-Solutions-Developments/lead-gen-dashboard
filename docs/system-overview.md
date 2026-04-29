# supernizo System Overview

Last reviewed: 2026-04-29

## Executive Summary

This repository is a Next.js 16 App Router frontend for the `supernizo` B2B lead generation dashboard. It does not own the core backend data model or business processes. Instead, it authenticates users against an external API, stores session/persona state in browser storage, and calls backend endpoints through a small set of client wrapper modules.

The configured backend also exposes OpenAPI at `/openapi.json`. The full backend-advertised endpoint catalog is captured in `docs/backend-endpoints.md`; this file focuses on how the current frontend is wired.

The app has three operating personas:

- `sales`: default API namespace, e.g. `/api/campaigns`.
- `delegates`: delegated namespace, e.g. `/api/delegates/campaigns`.
- `production`: production namespace, e.g. `/api/productions/campaigns`.

Most pages import from `@/lib/apiRouter`, which selects the correct API module based on the current browser `persona`. Auth and admin endpoints live in `@/lib/auth` and are shared.

## Tech Stack

- Framework: Next.js `16.1.1` App Router with React `19.2.3`.
- Language: TypeScript with `strict: true`.
- Styling: Tailwind CSS 4, custom CSS tokens in `app/globals.css`.
- UI primitives: local components in `components/ui`, Radix primitives, lucide icons.
- Charts: Recharts.
- HTTP clients: Axios for most backend calls, native `fetch` for auth and WhatsApp polling.
- Notifications: Sonner.
- External backend config:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_API_KEY`
  - `NEXT_PUBLIC_WA_DEBUG`
- Supabase helper exists in `lib/supabaseClient.ts`, but no current app usage was found.

## Runtime Flow

1. `app/layout.tsx` wraps every page in `AppShell`.
2. `AppShell` validates local auth session from `localStorage`, calls `/api/auth/me`, and redirects unauthenticated users to `/sign-in`.
3. `sign-in` calls `/api/auth/login`, stores `leadgen.auth.session`, and sets persona automatically for non-super-admin roles.
4. Super admins can choose a persona from `/choose-persona`; pipeline users are forced into the persona mapped by their role.
5. Main pages call `@/lib/apiRouter`, which dispatches to:
   - `lib/api.ts` for sales.
   - `lib/apidele.ts` for delegates.
   - `lib/apiproduction.ts` for production.
6. Axios request interceptors attach `Authorization: Bearer <token>`. Most clients also include `x-api-key`.

## Auth And Roles

Auth state is stored in browser `localStorage` under `leadgen.auth.session`. Persona state is stored under `persona`.

Roles:

- `super_admin_user`: can choose any persona and access super-admin-only routes.
- `sales_user`: forced to `sales`.
- `delegate_user`: forced to `delegates`.
- `production_user`: forced to `production`.

Super-admin-only paths enforced by `AppShell`:

- `/settings`
- `/replies`
- `/campaigns/new`
- `/admin/*`

`/campaigns/upload`, `/campaigns`, `/dashboard`, and `/leads` are available to pipeline users, but the UI changes based on role.

## App Routes

| Route | Component | Purpose | API usage |
|---|---|---|---|
| `/` | `app/page.tsx` | Alias to persona chooser | local persona/auth state |
| `/sign-in` | `app/sign-in/page.tsx` | Login form | `/api/auth/login` |
| `/choose-persona` | `app/choose-persona/page.tsx` | Super-admin workspace picker | local persona/auth state |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard shell | stats, recent campaigns/events, replies |
| `/campaigns` | `app/campaigns/page.tsx` | Super-admin campaign list; normal users see events list | campaigns, stop/delete/force-delete |
| `/campaigns/new` | `app/campaigns/new/page.tsx` | Generated campaign creation | event registry, create campaign |
| `/campaigns/upload` | `app/campaigns/upload/page.tsx` | CSV campaign upload | active event registry, upload campaign |
| `/campaigns/[id]` | `app/campaigns/[id]/page.tsx` | Campaign detail, lead review, approval, send, attachments | campaign/leads/attachments/outreach/opt-outs |
| `/leads` | `app/leads/page.tsx` | Global lead search for super admins; event lead sheet for normal users | lead search, events, disable WhatsApp |
| `/replies` | `app/replies/page.tsx` | WhatsApp notifications and conversation polling | WhatsApp notifications/messages/unread/mark-read |
| `/settings` | `app/settings/page.tsx` | Profile placeholder plus opt-out management | marketing opt-outs |
| `/admin/users` | `app/admin/users/page.tsx` | User/role management | auth users CRUD |
| `/admin/events` | `app/admin/events/page.tsx` | Event registry management | admin events CRUD |
| `/analytics` | `app/analytics/page.tsx` | Mock/preview analytics dashboard | no backend calls |
| `/completed` | `app/completed/page.tsx` | Static completed campaign mock list | no backend calls |

## Local Next API Routes

These are frontend proxy routes under `app/api`. They forward to `NEXT_PUBLIC_API_BASE_URL`.

| Method | Local route | Upstream route | Notes |
|---|---|---|---|
| `GET` | `/api/whatsapp/inbound?person_id=<id>&limit=50` | `/api/whatsapp/inbound` | Requires env base URL and API key. Currently no in-app caller found. |
| `GET` | `/api/whatsapp/events` | `/api/whatsapp/events` | SSE proxy. Currently no `EventSource` caller found. |

## External Backend Endpoint Catalog

The frontend expects all external endpoints under `NEXT_PUBLIC_API_BASE_URL`.

### Auth And Admin

Defined in `lib/auth.ts`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Login with username/password. |
| `GET` | `/api/auth/me` | Validate current token and refresh stored user. |
| `GET` | `/api/auth/roles` | Backend-advertised roles endpoint. Not currently used by frontend. |
| `POST` | `/api/auth/bootstrap-super-admin` | Backend-advertised bootstrap endpoint. Not currently used by frontend. |
| `GET` | `/api/auth/users` | List users. |
| `POST` | `/api/auth/users` | Create user. |
| `GET` | `/api/auth/users/{userId}` | Backend-advertised single-user read. Not currently used by frontend. |
| `PUT` | `/api/auth/users/{userId}` | Update username, role, full name, active state. |
| `POST` | `/api/auth/users/{userId}/password` | Rotate user password. |
| `DELETE` | `/api/auth/users/{userId}` | Delete user. |
| `GET` | `/api/admin/events?includeInactive=true` | List event registry entries. |
| `POST` | `/api/admin/events` | Create event registry entry. |
| `GET` | `/api/admin/events/{eventId}` | Backend-advertised single-event read. Not currently used by frontend. |
| `PUT` | `/api/admin/events/{eventId}` | Update event registry entry. Supports `syncLinkedCampaigns`. |
| `GET` | `/api/event-registry/active` | List active events for campaign upload. |

### Persona-Aware Core Endpoints

These endpoints use namespace variants:

- Sales: `/api/...`
- Delegates: `/api/delegates/...`
- Production: `/api/productions/...`

The table below shows the sales path. For delegates/production, insert `/delegates` or `/productions` after `/api`.

| Method | Sales endpoint | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Dashboard metrics. |
| `GET` | `/api/dashboard/distribution` | Lead/contact distribution chart data. |
| `GET` | `/api/campaigns/recent?limit=n` | Recent campaigns. |
| `GET` | `/api/campaigns?status=all&limit=n&offset=n` | Paginated campaign list. |
| `POST` | `/api/campaigns` | Create generated campaign from JSON or manual campaign from multipart CSV upload. |
| `GET` | `/api/campaigns/{campaignId}` | Campaign detail. |
| `DELETE` | `/api/campaigns/{campaignId}` | Delete campaign if safe. Returns structured `409` blocker details. |
| `GET` | `/api/campaigns/{campaignId}/info` | Campaign event/info snapshot. |
| `POST` | `/api/campaigns/{campaignId}/info` | Upsert campaign info. Backend-advertised; not currently used by frontend. |
| `GET` | `/api/campaigns/{campaignId}/leads?status=all` | Campaign leads. |
| `PUT` | `/api/campaigns/{campaignId}/approve-all` | Approve all campaign leads. |
| `POST` | `/api/campaigns/{campaignId}/start-outreach` | Start campaign outreach. |
| `GET` | `/api/campaigns/{campaignId}/export` | CSV export URL. |
| `POST` | `/api/campaigns/{campaignId}/stop` | Stop/cancel campaign work. |
| `POST` | `/api/campaigns/{campaignId}/force-delete` | Force-delete blocked campaign with `{ confirm: true, mode: "force" }`. |
| `POST` | `/api/campaigns/{campaignId}/send-all?channels=email\|whatsapp\|both` | Approve/send all eligible campaign leads, optional attachment. |
| `POST` | `/api/campaigns/{campaignId}/send-all-email` | Backend-advertised email-only send-all endpoint. |
| `POST` | `/api/campaigns/{campaignId}/send-all-whatsapp` | Backend-advertised WhatsApp-only send-all endpoint. |
| `POST` | `/api/campaigns/{campaignId}/upload-common-attachment` | Upload campaign-level common attachment. |
| `GET` | `/api/campaigns/{campaignId}/common-attachments` | List common attachments. Used directly in campaign detail page. |
| `DELETE` | `/api/campaigns/{campaignId}/common-attachment/{attachmentId}` | Delete common attachment. Used directly in campaign detail page. |
| `POST` | `/api/campaigns/{campaignId}/approve-selected-leads` | Approve selected leads. Body is `leadIds` array. |
| `POST` | `/api/campaigns/{campaignId}/send-selected-leads?attachment_id=id` | Send selected leads. Body is `leadIds` array. |
| `POST` | `/api/campaigns/{campaignId}/send-selected-email` | Backend-advertised email-only selected-send endpoint. |
| `POST` | `/api/campaigns/{campaignId}/send-selected-whatsapp` | Backend-advertised WhatsApp-only selected-send endpoint. |
| `GET` | `/api/all/leads` | List all leads. Currently wrapped but not directly used by pages. |
| `GET` | `/api/leads/search` | Global lead search with filters. |
| `PUT` | `/api/leads/{leadId}/approve` | Approve one lead. |
| `PUT` | `/api/leads/{leadId}/reject` | Reject one lead. |
| `PUT` | `/api/leads/{leadId}/content` | Update generated outreach content. |
| `PUT` | `/api/leads/{leadId}/workflow-status` | Update Nizo Finder workflow status. |
| `POST` | `/api/leads/{leadId}/attachments?channel=email` | Upload lead attachment. UI blocks WhatsApp attachments for now. |
| `DELETE` | `/api/leads/{leadId}/attachments/{attachmentId}` | Delete lead attachment. |
| `POST` | `/api/leads/{leadId}/send-email?attachment_id=id` | Send email to one lead. |
| `POST` | `/api/leads/{leadId}/send-whatsapp` | Send WhatsApp to one lead. |
| `POST` | `/api/leads/{leadId}/send` | Backend-advertised combined lead send endpoint. |
| `GET` | `/api/events` | Event summary list. |
| `GET` | `/api/events/{canonicalEventKey}/leads` | Event lead list with pagination, search, workflow filters. |
| `POST` | `/api/events/{canonicalEventKey}/leads` | Add manual lead to event. |
| `GET` | `/api/workflow-statuses` | List Nizo Finder workflow statuses. |
| `POST` | `/api/workflow-statuses` | Create workflow status by label. |

### Shared Marketing And WhatsApp Endpoints

These are shared in the wrapper modules, not persona-prefixed, unless a direct `getApiKeyClient` call rewrites a generic `/api/...` URL.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/marketing/opt-outs?limit=n&active_only=true` | List WhatsApp/marketing suppression records. |
| `POST` | `/api/marketing/opt-outs/upload` | Upload suppression CSV. |
| `POST` | `/api/marketing/opt-outs` | Create/update suppression by phone/email/lead ID. |
| `POST` | `/api/leads/{leadId}/marketing/disable?reason=text` | Disable WhatsApp/marketing for one lead. |
| `POST` | `/api/leads/{leadId}/whatsapp/disable?reason=text` | Legacy/alias disable endpoint advertised by backend. |
| `GET` | `/api/whatsapp/notifications?limit=n&unread_only=true` | WhatsApp reply notifications. |
| `GET` | `/api/whatsapp/messages?person_id=id&since=iso&limit=50` | WhatsApp message history/incremental polling. |
| `GET` | `/api/whatsapp/unread-count?person_id=id` | Unread message count. |
| `POST` | `/api/whatsapp/mark-read?person_id=id&up_to=iso` | Mark messages read. |
| `GET` | `/api/whatsapp/inbound?person_id=id&limit=50` | Legacy inbound alias/proxy expectation. |
| `GET` | `/api/whatsapp/events` | SSE stream expected by local proxy, but not currently consumed. |
| `POST` | `/api/whatsapp/d360/webhook` | Provider webhook endpoint. Not called by frontend. |
| `POST` | `/api/whatsapp/twilio/inbound` | Provider inbound webhook endpoint. Not called by frontend. |
| `POST` | `/api/whatsapp/twilio/status` | Provider status webhook endpoint. Not called by frontend. |
| `GET`/`POST` | `/api/whatsapp/opt-outs` and `/api/whatsapp/opt-outs/upload` | Legacy/alias opt-out endpoints advertised by backend. Frontend uses `/api/marketing/opt-outs`. |

### Backend-Advertised Lower-Level Endpoints

OpenAPI also advertises lower-level routes that are not part of the current primary Next.js UI flow:

- `/api/v1/icp/start`
- `/api/v1/icp/{icp_run_id}`
- `/api/v1/icp/{icp_run_id}/keyword-config`
- `/api/v1/icp/{icp_run_id}/scrape/results`
- `/api/v1/icp/{icp_run_id}/content/generate`
- `/api/v1/icp/{icp_run_id}/content/generate-step5`
- `/api/v1/icp/{icp_run_id}/drafts`
- `/api/v1/icp/{icp_run_id}/people`
- `/api/v1/jobs/{job_id}`
- `/api/v1/jobs/{job_id}/cancel`
- `/api/v1/drafts/{draft_id}/approve`
- `/api/v1/drafts/{draft_id}/reject`
- `/api/v1/drafts/{draft_id}/send`
- `/api/v1/drafts/{draft_id}/send-email`
- `/api/v1/drafts/{draft_id}/send-whatsapp`
- `/api/v1/dev/seed-dummy`
- `/api/make/send-status`
- `/health`
- `/signalhire-callback`

## Main Feature Areas

### Campaigns

Campaigns can be generated or manually uploaded.

- Generated campaigns are created from an event registry entry, category, and ICP.
- Uploaded campaigns submit multipart form data with a CSV `leadSheet`.
- Manual uploads store an import summary temporarily in `sessionStorage` for the detail page.
- Campaign list polls every 30 seconds.
- Deletion has a safe-delete flow with blocker details and a force-delete fallback.

Important files:

- `app/campaigns/page.tsx`
- `app/campaigns/new/page.tsx`
- `app/campaigns/upload/page.tsx`
- `app/campaigns/[id]/page.tsx`
- `components/campaigns/CampaignActionDialog.tsx`

### Campaign Detail And Outreach

The campaign detail page is the largest and highest-risk module. It owns:

- Campaign and leads fetch.
- Lead normalization.
- Approval/rejection.
- Content editing.
- Per-lead email/WhatsApp sending.
- Bulk approve/send.
- Common attachment upload/delete.
- Lead attachment upload/delete.
- Opt-out awareness and marketing disable flow.
- Polling after send actions to refresh outreach state.

Important implementation detail: it uses `getApiKeyClient(persona)`, so direct `/api/...` calls are automatically rewritten for delegates/production by `lib/apidele.ts` and `lib/apiproduction.ts`.

### Nizo Finder / Leads

Super admins use `app/leads/page.tsx` for global lead search. Normal users use `NormalUserEventLeadSheet`, which centers on event leads, workflow statuses, and manual lead creation.

Important files:

- `app/leads/page.tsx`
- `components/leads/NormalUserEventLeadSheet.tsx`
- `components/events/NormalUserEventsPage.tsx`

### Replies

WhatsApp reply handling uses polling, not the local SSE proxy.

- Notifications poll every 10 seconds.
- Unread count polls every 10 seconds per active person.
- Conversation polling runs every 2 seconds through `startWhatsAppPolling`.

Important files:

- `app/replies/page.tsx`
- `components/dashboard/RepliesOverviewCard.tsx`
- WhatsApp helpers in `lib/api.ts`

### Admin

Super admins can manage:

- Users and roles in `/admin/users`.
- Event registry entries in `/admin/events`.

Event registry entries drive new generated campaigns and upload flows. Updates can request linked campaign snapshot synchronization through `syncLinkedCampaigns`.

## Data Shapes The UI Relies On

Key frontend types live in `lib/api.ts` and are re-exported through `lib/apiRouter.ts`.

The most important contracts:

- `CampaignListItem`
- `CampaignDetail`
- `CampaignInfoResponse`
- `LeadItem`
- `EventSummaryItem`
- `EventLeadListItem`
- `WorkflowStatusDefinitionItem`
- `WhatsAppOptOutItem`
- `WhatsAppInbound`
- `DeleteBlockedDetail`

Lead fields have substantial normalization in the UI because the backend may return alternative names like `companyName`, `company_name`, `companyUrl`, or `company_url`.

## Known Architectural Notes

- `lib/api.ts`, `lib/apidele.ts`, and `lib/apiproduction.ts` are mostly duplicated. Feature changes to one persona frequently need parallel changes in all three.
- `apiRouter` does not pass an explicit persona to most calls; it reads browser `localStorage` through `getPersona()`. This is client-only by design.
- `apiClient.ts` is the base sales client. Delegate and production modules create their own axios clients.
- Delegate/production `api` exports rewrite generic direct URLs by replacing `/api/` with `/api/delegates/` or `/api/productions/`.
- `listMessageStatuses` and `markReplyAsRead` are currently stubs in API modules.
- Analytics and completed campaign pages are mock/static, not production data.
- Local WhatsApp proxy routes exist, but current WhatsApp UI calls the external API base URL directly.
- `lib/supabaseClient.ts` exists but appears unused.

## Risk Areas For Future Work

- Campaign detail page is over 3,000 lines and mixes data fetching, normalization, view state, and many mutations. Changes here need focused regression checks.
- Endpoint duplication across personas can drift. A shared namespace helper would reduce future maintenance risk.
- Auth and persona are local-storage based; any server-rendered or server-action feature must avoid relying on these helpers directly.
- Several backend contracts are inferred from frontend calls only. Before removing endpoints, confirm backend usage and external integrations.
- Some endpoints are shared while others are persona-prefixed. Marketing opt-outs and WhatsApp endpoints are intentionally shared in wrapper functions.
- Uploads and attachments depend on multipart behavior and file size/type limits in the UI. Backend limits should be confirmed before changing UX.

## Useful Commands

```bash
npm run lint
npm run build
npm run dev
```

## Recommended Next Steps

1. Before adding features, decide whether they are persona-aware or globally shared.
2. Prefer adding API functions to `apiRouter` and all persona modules instead of direct page-level axios calls.
3. For campaign detail changes, extract or test normalization helpers before broad UI edits.
4. Replace mock analytics/completed pages with backend-backed data only when corresponding backend contracts exist.
5. Consider consolidating the three API modules into one namespace-aware client before large endpoint additions.
