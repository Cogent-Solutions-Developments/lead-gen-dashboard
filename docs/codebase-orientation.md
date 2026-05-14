# supernizo Codebase Orientation

Last reviewed: 2026-05-14

This document is a working map of the current `lead-gen-dashboard` codebase. It focuses on the logic that matters before making more changes: auth, personas, UI differences, admin-only behavior, API routing, and the main product workflows.

## What This App Is

`supernizo` is a Next.js App Router frontend for B2B lead generation, event lead sheets, campaign review, outreach sending, WhatsApp replies, opt-outs, and admin operations.

The frontend does not own the main business data model. It stores auth/persona state in the browser and talks to an external backend through:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_KEY`
- `TEAMS_DEAL_BELL_WEBHOOK_URL` for the local deal-bell proxy route
- `NEXT_PUBLIC_WA_DEBUG` for WhatsApp debug logging

Important entry points:

- `app/layout.tsx`: wraps all pages in `AppShell` and the global `Toaster`.
- `components/layout/AppShell.tsx`: auth/persona guard, redirect logic, normal sidebar layout.
- `components/layout/Sidebar.tsx`: normal workspace navigation.
- `components/layout/AdminPanelShell.tsx`: admin navigation/layout.
- `lib/auth.ts`: roles, session storage, auth API calls, admin API calls, system monitor/operations calls.
- `lib/persona.ts`: browser persona storage and persona-change event.
- `lib/apiRouter.ts`: persona-aware API facade used by most product pages.

## Mental Model

There are two related but different concepts:

- Auth role: what the backend says the signed-in user is.
- Persona: which workspace/API namespace the frontend is currently using.

Roles are authoritative for access. Persona chooses the workspace data source.

Role to persona mapping:

| Auth role | Forced persona | Notes |
|---|---|---|
| `super_admin_user` | none | Can choose any workspace and can access admin-only routes. |
| `sales_user` | `sales` | Forced into Sales. Cannot use chooser/admin-only screens. |
| `delegate_user` | `delegates` | Forced into Delegates. Cannot use chooser/admin-only screens. |
| `production_user` | `production` | Forced into Production. Cannot use chooser/admin-only screens. |

Persona values:

- `sales`: uses the sales/default backend namespace.
- `delegates`: uses the delegate backend namespace.
- `production`: uses the production backend namespace.

The persona is stored in local storage under `persona`. The auth session is stored under `leadgen.auth.session`.

## Auth And Routing Logic

`AppShell` is the central route gate.

Boot sequence:

1. Read `leadgen.auth.session` from local storage.
2. If missing, redirect everything except `/sign-in` to `/sign-in`.
3. If present, call `/api/auth/me` through `fetchCurrentAuthUser`.
4. If `/api/auth/me` fails, clear auth and persona, then return to sign-in.
5. If role is a pipeline role, force the mapped persona into local storage.
6. If role is super admin, allow `/choose-persona` and admin screens.

Super-admin-only paths enforced by `AppShell`:

- `/settings`
- `/settings/*`
- `/replies`
- `/campaigns/new`
- `/admin/*`

Important behavior:

- Super admins land on `/choose-persona` after sign-in.
- Pipeline users land on `/dashboard` after sign-in.
- Pipeline users are redirected away from `/choose-persona`, `/admin/*`, `/settings`, `/replies`, and `/campaigns/new`.
- Normal workspace pages require a selected persona, unless the user is in the admin area.

## API Routing

Most product pages import from `@/lib/apiRouter`, not directly from `lib/api.ts`.

`lib/apiRouter.ts` selects an implementation based on the current persona:

| Persona | API module | Backend prefix |
|---|---|---|
| `sales` | `lib/api.ts` | `/api/...` |
| `delegates` | `lib/apidele.ts` | `/api/delegates/...` |
| `production` | `lib/apiproduction.ts` | `/api/productions/...` |

Examples:

- `listCampaigns()` becomes `/api/campaigns`, `/api/delegates/campaigns`, or `/api/productions/campaigns`.
- `listEvents()` becomes `/api/events`, `/api/delegates/events`, or `/api/productions/events`.
- `searchLeads()` becomes `/api/leads/search`, `/api/delegates/leads/search`, or `/api/productions/leads/search`.

Shared endpoints that are not persona-prefixed include:

- Auth/admin endpoints in `lib/auth.ts`.
- WhatsApp notifications/messages.
- Marketing opt-outs.
- Some local Next routes under `app/api`.

Axios clients attach:

- `Authorization: Bearer <token>` from `lib/auth.ts`.
- `x-api-key` from `NEXT_PUBLIC_API_KEY`.
- `ngrok-skip-browser-warning: true` in local development if the backend is an ngrok host.

## Persona UI Differences

### Super Admin

Super admin is special because it can both impersonate workspace context and access admin-only operations.

Super-admin capabilities:

- Choose Sales, Delegates, or Production from `/choose-persona`.
- See an additional Admin Panel card on `/choose-persona`.
- Use normal workspace screens under the currently selected persona.
- Access `/admin`, `/admin/users`, `/admin/events`, `/admin/system-operations`.
- Access `/settings`, `/settings/system-monitor`, and `/replies`.
- Access `/campaigns/new`.
- See campaign management actions such as stop, delete, and force delete.
- Enter full campaign detail pages at `/campaigns/[id]`.
- Use global lead search view on `/leads`.

Super-admin navigation differences:

- Normal sidebar shows `Campaigns`, `New Campaign`, `Upload Campaign`, `Nizo Finder`, `NizoAI`, and `Admin Panel`.
- Admin screens use `AdminPanelShell`, a separate fixed admin sidebar with admin task tabs.

### Sales User

Sales users are forced into the `sales` persona.

Sales UI differences:

- Sidebar label changes from `Campaigns` to `Events`.
- Sidebar label changes from `Upload Campaign` to `Upload Leads`.
- Sidebar label changes from `Nizo Finder` to `Lead Sheet`.
- No `New Campaign` link.
- No `Admin Panel` link.
- The deal bell button is visible only for non-admin Sales persona users.
- `/campaigns` renders `NormalUserEventsPage`, not the super-admin campaign list.
- `/leads` renders `NormalUserEventLeadSheet`, not global lead search.
- `/campaigns/[id]` redirects back to `/campaigns`.
- Upload success redirects to the event lead sheet when possible.

Sales can work event-first: browse events, upload leads into an event, and manage event lead workflow states.

### Delegate User

Delegate users are forced into the `delegates` persona.

Delegate UI is mostly the same normal-user surface as Sales:

- Events list instead of campaign management.
- Upload Leads instead of Upload Campaign.
- Lead Sheet instead of Nizo Finder.
- No admin routes.
- No new generated campaign page.
- No direct campaign detail page.

Backend data is different because calls are routed through `/api/delegates/...`.

The deal bell is not shown for Delegates because the current condition is `!isSuperAdmin && persona === "sales"`.

### Production User

Production users are forced into the `production` persona.

Production UI is also mostly the normal-user surface:

- Events list.
- Upload Leads.
- Lead Sheet.
- NizoAI against production data.
- No admin routes.
- No new generated campaign page.
- No direct campaign detail page.

Backend data is routed through `/api/productions/...`.

## Main Product Flows

### Sign In

Files:

- `app/sign-in/page.tsx`
- `lib/auth.ts`

Flow:

1. User submits username/password.
2. `loginWithPassword()` posts to `/api/auth/login`.
3. Session is normalized and stored in local storage.
4. Pipeline roles get a forced persona immediately.
5. User redirects to `/choose-persona` for super admin or `/dashboard` for pipeline roles.

### Persona Selection

Files:

- `app/page.tsx`
- `app/choose-persona/page.tsx`
- `lib/persona.ts`
- `hooks/usePersona.ts`

`/` is an alias to the persona chooser.

Super admins can choose:

- Sales Workspace
- Delegate Workspace
- Production Workspace
- Admin Panel

Pipeline users generally do not get to choose. `AppShell` forces their persona and redirects them to `/dashboard`.

### Dashboard

File:

- `app/dashboard/page.tsx`

Current dashboard is intentionally simple. It loads event summaries through `listEvents()` and adjusts text by persona:

- `Sales Workspace`
- `Delegates Workspace`
- `Production Workspace`

It greets the current user using full name, cached display name, or username.

There are older dashboard components under `components/dashboard/*` for stats, quick actions, replies overview, priority queue, and recent events. Some are not wired into the current dashboard page.

### Campaigns And Events

Files:

- `app/campaigns/page.tsx`
- `components/events/NormalUserEventsPage.tsx`

This route is split by auth role:

- Super admin: `SuperAdminCampaignsPage`
- Pipeline users: `NormalUserEventsPage`

Super-admin campaign list:

- Loads campaigns across pages using `listCampaigns({ status: "all", limit, offset })`.
- Refetches periodically while the document is visible.
- Filters by status, category, and search.
- Supports stop/delete/force-delete actions through `CampaignActionDialog`.
- Reacts to persona changes by reloading data from the selected workspace namespace.

Normal-user events list:

- Loads `listEvents()` for the forced persona.
- Shows active event count and total prospect reach.
- Searches event names, event keys, and related campaign names.
- Links each event to `/leads?event=<canonicalEventKey>`.

### New Campaign

File:

- `app/campaigns/new/page.tsx`

This is super-admin-only.

It loads admin events through `listAdminEvents(false)` and creates a generated campaign through `createCampaign()`. Since it imports from `apiRouter`, the new campaign is created in the currently selected persona namespace.

### Upload Leads / Campaign Upload

File:

- `app/campaigns/upload/page.tsx`

Shared route, different wording/redirects:

- Super admin sees `Campaign Upload`.
- Pipeline users see `Upload Leads`.

Flow:

1. Load active event registry through `listActiveEventRegistry()`.
2. User selects event.
3. User optionally adds category/notes.
4. User uploads `.csv` or `.xlsx`.
5. `createCampaignFromUpload()` posts multipart form data to the persona-aware campaign endpoint.
6. Upload summary is persisted locally by campaign ID.
7. Super admin redirects to `/campaigns/<id>`.
8. Pipeline users redirect to `/leads?event=<canonicalEventKey>` when available, otherwise `/campaigns`.

### Campaign Detail

File:

- `app/campaigns/[id]/page.tsx`

This route is super-admin-only in practice:

- Super admin gets the full campaign detail and lead-review surface.
- Pipeline users are redirected back to `/campaigns`.

Notable detail logic:

- Uses `getApiKeyClient(persona)` for some direct Axios calls.
- Loads campaign details, leads, campaign info, templates, attachments, and opt-outs.
- Supports approval/rejection, content edits, email template save/delete, common attachments, selected send, send all, WhatsApp disable/suppression, and lead-level send actions.
- `canManageLeadActions` is currently tied to `isSuperAdmin`.

Important caveat:

Some direct calls in this file use generic paths such as `/api/leads/...` through the selected Axios client. The selected client only changes base URL and headers, not path rewriting. When changing this page, verify whether direct paths should be persona-prefixed for delegate/production contexts.

### Leads

Files:

- `app/leads/page.tsx`
- `components/leads/NormalUserEventLeadSheet.tsx`

This route is split by role:

- Super admin: global lead search / total leads view.
- Pipeline users: event lead sheet.

Normal event lead sheet:

- Reads `event`, `lead`, and `search` from URL query params.
- Loads events and workflow status definitions.
- Ensures fixed workflow statuses exist by creating missing ones.
- Loads event leads with pagination, search, and filters.
- Allows manual lead creation.
- Allows workflow status updates with optional comments.
- Can show workflow history for a lead.

### NizoAI

Files:

- `app/nizo-ai/page.tsx`
- `lib/nizoAiSearch.ts`

NizoAI is client-side ranking/search logic over backend lead/event data.

Flow:

1. Parse the user query into intent: titles, locations, industries, companies, keywords.
2. Fuzzy-correct known title/location/industry terms.
3. Load workspace events with `listEvents()`.
4. Score events and choose event-scoped searches when possible.
5. Probe event lead endpoints or global lead search.
6. Deduplicate candidate leads.
7. Score/rank leads using title, company, industry/location text, seniority, reachability, and freshness signals.
8. Present ranked results with copy/download actions.

NizoAI changes by persona because all event/lead loading goes through `apiRouter`.

### Replies

File:

- `app/replies/page.tsx`

Admin-only route wrapped in `AdminPanelShell`.

It uses WhatsApp notification and message APIs from `apiRouter`:

- `fetchWhatsAppNotifications`
- `fetchMessages`
- `fetchUnreadCount`
- `markRead`

This is a shared WhatsApp stream, not persona-prefixed in `apiRouter`.

### Settings And Opt-Outs

File:

- `app/settings/page.tsx`

Admin-only route wrapped in `AdminPanelShell`.

Main real behavior is opt-out/suppression management:

- List opt-outs through `listWhatsAppOptOuts`.
- Upload CSV through `uploadWhatsAppOptOutCsv`.
- Add manual suppression through `createWhatsAppOptOut`.

There are also profile/API-key-looking cards that are currently mostly static UI and toast-only save behavior.

### Admin Users

File:

- `app/admin/users/page.tsx`

Super-admin user management:

- List users.
- Create users.
- Edit username/full name/role/active state.
- Rotate password.
- Delete users.

Self-edit protection:

- When editing self, role and active state are not sent in the update payload.
- Updated self is pushed back into stored auth session.

### Admin Events

File:

- `app/admin/events/page.tsx`

Event registry management:

- List active/inactive admin events.
- Create event.
- Edit event details.
- Toggle active state.
- Optional linked campaign sync support via `syncLinkedCampaigns`.

This registry feeds upload flow through `listActiveEventRegistry()`.

### Admin Dashboard, Monitor, And Operations

Files:

- `app/admin/page.tsx`
- `app/settings/system-monitor/page.tsx`
- `app/admin/system-operations/page.tsx`
- `lib/auth.ts`

Admin dashboard is a task launcher for user management, event registry, replies, settings, system monitor, and system operations.

System monitor:

- Calls `/api/admin/system-monitor`.
- Displays database/Redis/Celery checks, runtime pipeline/job/progress/send queue/provider/log warnings.
- Supports auto-refresh.

System operations:

- Lists Docker-backed log services.
- Fetches service logs.
- Lists incidents.
- Loads recovery guide.
- Runs confirmed recovery actions against campaign IDs.

Recovery actions require a reason and support dry-run behavior through the backend payload.

### Local Next API Routes

Local API routes live under `app/api`.

| Local route | Purpose |
|---|---|
| `POST /api/ring-bell` | Sends a Microsoft Teams MessageCard to `TEAMS_DEAL_BELL_WEBHOOK_URL`. Used by Sales deal-bell UI. |
| `GET /api/whatsapp/inbound` | Proxies backend WhatsApp inbound history. |
| `GET /api/whatsapp/events` | Proxies backend WhatsApp SSE event stream. |

Current note:

- The WhatsApp proxy routes exist, but most active WhatsApp UI calls go directly through backend API wrappers, not these local routes.

## Admin Specialty

Super admin is not just another persona. It is an access layer above personas.

Admin specialty includes:

- Persona switching for workspace context.
- User lifecycle management.
- Role assignment and active/inactive control.
- Event registry ownership.
- Campaign lifecycle controls such as stop, delete, and force-delete.
- Full campaign detail review/send operations.
- Global lead view.
- Shared replies inbox.
- Opt-out/suppression management.
- System health visibility.
- Recovery/log operations for backend incidents.

Design implication:

When adding features, first decide whether the feature belongs to:

- All personas through `apiRouter`.
- Only normal pipeline users.
- Only super admins inside a selected persona.
- Only super admins outside persona context, via `lib/auth.ts` admin endpoints.

## Current UI Language

The app uses a polished internal-tool style:

- Light page backgrounds with zinc/white surfaces.
- Blue glass/noise sidebar through `.sidebar-modern`.
- Google Sans as primary font.
- Lucide icons.
- Framer Motion for page/sidebar transitions.
- Sonner toasts.

Normal workspace layout:

- Expandable/pinnable sidebar.
- Main content margin changes between collapsed and expanded widths.
- `/nizo-ai` is treated as a flush content route with no standard page padding.

Admin layout:

- Always-fixed 72-width admin sidebar.
- Separate navigation labels and admin task language.

## Known Friction Points To Keep In Mind

- There is some duplication between `lib/api.ts`, `lib/apidele.ts`, and `lib/apiproduction.ts`. They mirror the same surface with different path prefixes.
- `apiRouter` is the intended abstraction for persona-aware calls. Direct Axios calls need careful review because paths may not be automatically rewritten.
- `AdminPanelShell` is applied by `app/admin/layout.tsx`, but some non-`/admin` admin pages such as `/settings`, `/settings/system-monitor`, and `/replies` wrap themselves manually.
- Existing docs were last verified on 2026-04-29; this orientation document reflects the current local code scan on 2026-05-14.
- `README.md` is still the default Next.js README and does not describe this app.
- Some dashboard components and mock pages exist but are not central to the current runtime flow.
- Supabase client exists, but no active app usage was found in this pass.

## Fast File Map

| Area | Files |
|---|---|
| App shell and navigation | `components/layout/AppShell.tsx`, `components/layout/Sidebar.tsx`, `components/layout/AdminPanelShell.tsx` |
| Auth/session/admin API | `lib/auth.ts`, `hooks/useAuth.ts` |
| Persona state | `lib/persona.ts`, `hooks/usePersona.ts` |
| Persona API facade | `lib/apiRouter.ts` |
| Sales API client | `lib/api.ts`, `lib/apiClient.ts` |
| Delegate API client | `lib/apidele.ts` |
| Production API client | `lib/apiproduction.ts` |
| Sign-in and persona chooser | `app/sign-in/page.tsx`, `app/choose-persona/page.tsx`, `app/page.tsx` |
| Dashboard | `app/dashboard/page.tsx`, `components/dashboard/*` |
| Campaign/event list | `app/campaigns/page.tsx`, `components/events/NormalUserEventsPage.tsx` |
| Campaign upload | `app/campaigns/upload/page.tsx`, `lib/campaignUploadSummary.ts` |
| Campaign detail | `app/campaigns/[id]/page.tsx`, `app/campaigns/[id]/CampaignInfoCard.tsx`, `components/campaigns/CampaignActionDialog.tsx` |
| Leads and lead sheet | `app/leads/page.tsx`, `components/leads/NormalUserEventLeadSheet.tsx` |
| NizoAI | `app/nizo-ai/page.tsx`, `lib/nizoAiSearch.ts` |
| Replies | `app/replies/page.tsx` |
| Settings and opt-outs | `app/settings/page.tsx` |
| System monitor | `app/settings/system-monitor/page.tsx` |
| System operations | `app/admin/system-operations/page.tsx` |
| Admin users | `app/admin/users/page.tsx` |
| Admin events | `app/admin/events/page.tsx` |
| Local Next proxies | `app/api/ring-bell/route.ts`, `app/api/whatsapp/inbound/route.ts`, `app/api/whatsapp/events/route.ts` |

## Recommended Change Strategy

Before changing behavior:

1. Identify the user class: super admin, Sales, Delegate, Production, or all.
2. Identify the data namespace: sales/default, delegates, production, or shared admin/WhatsApp.
3. Prefer `apiRouter` for workspace data.
4. Prefer `lib/auth.ts` for auth/admin/system APIs.
5. Check `AppShell` if the route should be accessible or blocked.
6. Check the sidebar labels if the route appears in normal navigation.
7. For normal users, verify both `/campaigns` and `/leads` because those routes intentionally render different components by role.
8. For admin screens outside `/admin`, remember they need manual `AdminPanelShell` wrapping.
