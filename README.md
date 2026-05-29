# supernizo Lead Generation Dashboard

Last reviewed: 2026-05-28  

## 1. Project Summary

`lead-gen-dashboard` is a Next.js 16 App Router frontend for the `supernizo` B2B lead generation platform. It supports campaign creation, campaign upload, event lead sheets, lead review, outreach sending, WhatsApp replies, opt-out management, admin operations, KPI dashboards, and a pipeline-user NizoAI chat/search experience.

The frontend does not own the core business data model. The primary source of truth is an external backend configured through environment variables. This app is responsible for:

- Authenticating users against the backend.
- Storing frontend session and persona state in browser storage.
- Routing users by role and selected persona.
- Rendering dashboards and operational workflows.
- Calling persona-aware backend endpoints through API wrapper modules.
- Providing a few local Next API routes for proxy/aggregation behavior.

## 2. Tech Stack

| Area | Current choice |
|---|---|
| Framework | Next.js `16.1.1` App Router |
| React | React `19.2.3` |
| Language | TypeScript `strict: true` |
| Styling | Tailwind CSS 4 plus custom global CSS tokens |
| UI primitives | Local `components/ui`, Radix primitives, lucide icons |
| Animation | Framer Motion |
| Charts | Recharts |
| HTTP | Axios for most backend calls, native `fetch` for auth/proxy routes |
| Toasts | Sonner |
| Theme | `next-themes`, default light mode |
| Optional helpers | Supabase client exists, but active app usage was not found in this review |

## 3. Required Environment

The app expects these environment variables:

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_API_KEY=
NEXT_PUBLIC_WA_DEBUG=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TEAMS_DEAL_BELL_WEBHOOK_URL=
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_KEY` are core requirements for most product features.
- `NEXT_PUBLIC_WA_DEBUG` enables WhatsApp debug logs in the browser when set to `1` or `true`.
- Supabase variables are only needed if protected storage/image flows are used.
- `TEAMS_DEAL_BELL_WEBHOOK_URL` is only used by `POST /api/ring-bell`.

## 4. Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npm run build
```

Current lint status from this review:

- `npm run lint` passes with `0` errors.
- It reports `7` warnings. The warnings are listed in the code review section below.

## 5. Runtime Architecture

The root runtime flow is:

1. `app/layout.tsx` loads global CSS, `ThemeProvider`, `AppShell`, and `Toaster`.
2. `components/layout/AppShell.tsx` validates the stored auth session and guards routes.
3. `app/sign-in/page.tsx` authenticates with the backend.
4. Auth session is stored under `leadgen.auth.session`.
5. Persona state is stored under `persona`.
6. Pipeline roles are forced into their matching persona.
7. Super admins can choose a workspace persona or enter admin tools.
8. Most product pages call `lib/apiRouter.ts`.
9. `apiRouter` chooses `lib/api.ts`, `lib/apidele.ts`, or `lib/apiproduction.ts` based on persona.

High-level flow:

```text
Browser
  -> Next.js App Router pages
  -> AppShell auth/persona guard
  -> Route component
  -> apiRouter
  -> persona API module
  -> external backend
```

Local proxy/aggregation routes:

```text
Browser
  -> app/api/* route
  -> external backend or Teams webhook
```

## 6. Role And Persona Model

There are two related concepts:

- Auth role: what the backend says the signed-in user is.
- Persona: which workspace/API namespace the frontend is currently using.

| Auth role | Persona behavior | Access behavior |
|---|---|---|
| `super_admin_user` | Can choose `sales`, `delegates`, or `production` | Can access admin routes and full campaign management |
| `sales_user` | Forced to `sales` | Pipeline surface only |
| `delegate_user` | Forced to `delegates` | Pipeline surface only |
| `production_user` | Forced to `production` | Pipeline surface only |

Persona-to-backend routing:

| Persona | API module | Backend prefix |
|---|---|---|
| `sales` | `lib/api.ts` | `/api/...` |
| `delegates` | `lib/apidele.ts` | `/api/delegates/...` |
| `production` | `lib/apiproduction.ts` | `/api/productions/...` |

Important frontend access rules in `AppShell`:

- Unauthenticated users are redirected to `/sign-in`.
- Pipeline users are redirected away from `/choose-persona`, `/admin/*`, `/settings`, `/replies`, and `/campaigns/new`.
- Super admins can access admin-only pages and can switch persona.
- Normal workspace pages require a selected persona.

## 7. Folder-By-Folder Review

### `app/`

This is the App Router layer. It contains pages, layouts, route handlers, and feature-specific route modules.

Important files:

| File/folder | Purpose |
|---|---|
| `app/layout.tsx` | Root layout, theme provider, app shell, toast provider |
| `app/page.tsx` | Entry alias to persona selection |
| `app/sign-in/page.tsx` | Login form and auth-session creation |
| `app/choose-persona/page.tsx` | Super-admin workspace chooser |
| `app/dashboard/page.tsx` | Main dashboard, KPI leaderboard, user greeting, event stats |
| `app/campaigns/page.tsx` | Super-admin campaign list or pipeline event list |
| `app/campaigns/new/page.tsx` | Super-admin generated campaign creation |
| `app/campaigns/upload/page.tsx` | Campaign/lead sheet upload |
| `app/campaigns/[id]/page.tsx` | Full campaign detail and outreach management |
| `app/leads/page.tsx` | Super-admin global lead search or pipeline lead sheet |
| `app/nizo-ai/page.tsx` | Pipeline NizoAI chat/search UI |
| `app/replies/page.tsx` | WhatsApp replies inbox |
| `app/settings/page.tsx` | Admin settings and opt-out management |
| `app/settings/system-monitor/page.tsx` | Backend/system health dashboard |
| `app/admin/*` | Admin tools for users, events, storage, categories, agendas, knowledge, operations |
| `app/api/*` | Local Next API proxy/aggregation routes |

Architecture notes:

- Most route components are client components because auth, persona, and many workflows depend on browser state.
- The route layer currently contains significant feature logic. The largest files are:
  - `app/campaigns/[id]/page.tsx` at about 3,434 lines.
  - `components/leads/NormalUserEventLeadSheet.tsx` at about 3,128 lines.
  - `app/leads/page.tsx` at about 1,664 lines.
- These large route/view files are the main maintainability risk.

### `components/`

Reusable React components live here.

| Folder | Purpose |
|---|---|
| `components/layout` | App shell, sidebar, admin shell |
| `components/ui` | Local reusable UI primitives and visual effects |
| `components/dashboard` | Dashboard cards and widgets |
| `components/events` | Pipeline event browsing and gesture controller |
| `components/leads` | Normal-user event lead sheet |
| `components/campaigns` | Campaign action dialog |
| `components/profile` | User avatar |
| `components/storage` | Protected image rendering |

Architecture notes:

- The UI primitive folder gives the project a consistent design base.
- The feature component split is useful, but some components still combine data fetching, state machines, table behavior, dialogs, and rendering in one file.
- A good next refactor would extract hooks and smaller table/dialog components from the largest feature files.

### `lib/`

This is the application service and integration layer.

| File/folder | Purpose |
|---|---|
| `lib/auth.ts` | Auth types, session storage, role checks, admin API calls, protected file download |
| `lib/persona.ts` | Persona storage and persona-change event |
| `lib/apiRouter.ts` | Persona-aware facade used by pages |
| `lib/api.ts` | Sales/default backend API wrapper |
| `lib/apidele.ts` | Delegate backend API wrapper |
| `lib/apiproduction.ts` | Production backend API wrapper |
| `lib/apiClient.ts` | Shared Axios client for default API calls |
| `lib/nizoAiSearch.ts` | Client-side search/ranking logic for NizoAI |
| `lib/campaignUploadSummary.ts` | Session storage helper for upload import summaries |
| `lib/devNgrok.ts` | Development-only ngrok warning bypass headers |
| `lib/sales-marathon/*` | Sales leaderboard service/policy/client |
| `lib/supabaseClient.ts` | Supabase browser client helper |
| `lib/utils.ts` | Shared utility helper |

Architecture notes:

- `apiRouter` is the correct boundary for persona-aware frontend calls.
- `lib/api.ts`, `lib/apidele.ts`, and `lib/apiproduction.ts` duplicate a lot of endpoint logic with different URL prefixes.
- A future improvement is a single API factory that accepts a namespace prefix, reducing drift between persona modules.

Detailed usage status:

| File/folder | What it does | Still used? |
|---|---|---|
| `hooks/useAuth.ts` | React hook around stored auth session. Exposes current user, role checks, super-admin/pipeline booleans. | Yes. Used by layout, dashboard, campaigns, leads, admin pages, profile, sign-in-related flows. |
| `hooks/usePersona.ts` | React hook around current workspace persona. Listens for persona changes and lets UI switch persona. | Yes. Used by dashboard, sidebar, campaigns, leads, settings, chooser, and normal-user lead sheet. |
| `lib/api.ts` | Main Sales/default API wrapper. Defines most shared API types and functions. | Yes. Used directly by some admin pages and indirectly through `apiRouter`. |
| `lib/apiClient.ts` | Shared Axios instance for Sales/default API calls. Adds API key, auth token, ngrok headers, and common error handling. | Yes. Imported by `lib/api.ts`. |
| `lib/apidele.ts` | Delegate API wrapper. Mirrors `api.ts` but targets `/api/delegates/...`. | Yes. Used by `lib/apiRouter.ts` when persona is `delegates`. |
| `lib/apiproduction.ts` | Production API wrapper. Mirrors `api.ts` but targets `/api/productions/...`. | Yes. Used by `lib/apiRouter.ts` when persona is `production`. |
| `lib/apiRouter.ts` | Persona-aware facade. Pages call this so they do not manually choose Sales/Delegates/Production API modules. | Yes. Core active integration layer. |
| `lib/auth.ts` | Auth/session storage, role helpers, auth API calls, admin APIs, profile/storage helpers, system monitor/operations helpers. | Yes. Core active file. |
| `lib/campaignUploadSummary.ts` | Stores upload import summaries in `sessionStorage` so upload/detail/lead-sheet screens can show import results after redirect. | Yes. Used by campaign upload, campaign detail, and normal-user lead sheet. |
| `lib/dashboard-transition.ts` | Custom dashboard exit transition event and timing constants. | Yes. Used by dashboard and sidebar navigation transitions. |
| `lib/devNgrok.ts` | Adds `ngrok-skip-browser-warning` header in local development when backend URL is ngrok. | Yes. Used by API clients and auth/admin requests. |
| `lib/manifesto.ts` | Returns a deterministic daily dashboard message for a user. | Yes. Used by `app/dashboard/page.tsx`. |
| `lib/nizoAiSearch.ts` | Older/local NizoAI parsing and ranking helpers for leads/events. Current NizoAI page uses backend chat/mention APIs instead. | Not currently imported by app code. Cleanup candidate if local search mode is retired. |
| `lib/persona.ts` | Low-level persona storage helpers and `persona-change` event dispatcher. | Yes. Core active file used by `AppShell`, hooks, sidebar, chooser, and sign-in flow. |
| `lib/sales-marathon/*` | Service/policy/client for the old local sales marathon leaderboard route. | Only used by `app/api/sales-marathon/leaderboard/route.ts`; no current frontend caller found for that route. Legacy cleanup candidate. |
| `lib/supabaseClient.ts` | Creates a Supabase browser client from public Supabase env vars. | Not currently imported by app code. Cleanup candidate unless Supabase storage work is coming back. |
| `lib/utils.ts` | Shared `cn()` class-name helper for Tailwind/class merging. | Yes. Used across UI primitives and visual components. |

### `hooks/`

| File | Purpose |
|---|---|
| `hooks/useAuth.ts` | React hook for current auth state and role booleans |
| `hooks/usePersona.ts` | React hook for current persona state |

Architecture notes:

- These hooks keep auth/persona reads consistent.
- They depend on browser storage and custom window events, so they must remain client-side only.

### `docs/`

Existing documentation:

| File | Purpose |
|---|---|
| `docs/system-overview.md` | System overview and endpoint inventory |
| `docs/codebase-orientation.md` | Current codebase map and workflow notes |
| `docs/backend-endpoints.md` | Backend endpoint catalog |

This README should be treated as the top-level review document. The `docs/` files are useful supporting references for deeper endpoint and workflow detail.

### `public/`

Contains static assets such as SVGs and videos. No major architecture concern found in this review.

## 8. Main Product Workflows

### Sign In

Files:

- `app/sign-in/page.tsx`
- `lib/auth.ts`
- `components/layout/AppShell.tsx`

Flow:

1. User submits username and password.
2. Frontend calls `/api/auth/login`.
3. Auth response is normalized into `AuthSession`.
4. Session is stored in `localStorage`.
5. Pipeline users get a forced persona.
6. Super admins go to `/choose-persona`; pipeline users go to `/dashboard`.

Review note:

- This is simple and works for a frontend-only session model, but localStorage token storage has higher XSS exposure than HttpOnly cookie sessions.

### Persona Selection

Files:

- `app/choose-persona/page.tsx`
- `lib/persona.ts`
- `hooks/usePersona.ts`

Flow:

- Super admins choose a workspace.
- Pipeline users do not choose; `AppShell` forces their persona based on role.

Review note:

- The role/persona split is clear and useful.
- Any future feature must decide whether it is role-scoped, persona-scoped, or admin-only.

### Dashboard

File:

- `app/dashboard/page.tsx`

Responsibilities:

- User greeting.
- KPI leaderboard.
- Event/workflow heads-up.
- Session-storage caching for dashboard data.
- Dashboard transition animation behavior.

Review note:

- The dashboard is visually polished but mixes UI, caching, KPI fetching, animation, and persona display logic in one route file.

### Campaigns And Events

Files:

- `app/campaigns/page.tsx`
- `components/events/NormalUserEventsPage.tsx`

Behavior:

- Super admins see campaign management.
- Pipeline users see conference/event browsing.
- Campaign list supports polling, filtering, stop/delete/force-delete actions.
- Event list links users into `leads?event=<canonicalEventKey>`.

Review note:

- The split by role is correct.
- This route is an important place to test persona switching because super admins can view the same route under different backend namespaces.

### Campaign Upload

File:

- `app/campaigns/upload/page.tsx`

Behavior:

- Super admin language: campaign upload.
- Pipeline language: lead upload.
- Loads active event registry.
- Posts multipart upload through persona-aware API.
- Stores import summary in session storage.
- Redirects super admins to campaign detail and pipeline users to event lead sheet.

Review note:

- This flow has a clear user journey and a pragmatic session-storage summary handoff.

### Campaign Detail

File:

- `app/campaigns/[id]/page.tsx`

Responsibilities:

- Campaign detail fetch.
- Lead list fetch and normalization.
- Filtering, pagination, and bulk selection.
- Approval/rejection.
- Outreach content editing.
- Email/WhatsApp send actions.
- Campaign-level attachments.
- Lead-level attachments.
- Email templates.
- Opt-out awareness and disable flow.

Review note:

- This is the highest-risk frontend module because it owns many workflows in one file.
- It should be the first candidate for modularization.

### Leads

Files:

- `app/leads/page.tsx`
- `components/leads/NormalUserEventLeadSheet.tsx`

Behavior:

- Super admins get global lead search.
- Pipeline users get event-scoped lead management.
- Event lead sheet supports workflow statuses, history, manual lead creation, email generation, and filters.

Review note:

- Similar to campaign detail, this area is feature-rich but too large to review comfortably as a single component.

### NizoAI

Files:

- `app/nizo-ai/page.tsx`
- `lib/nizoAiSearch.ts`

Behavior:

- Pipeline-only chat interface.
- Mention search.
- Backend chat call through `apiRouter`.
- Lead/event ranking logic exists in `lib/nizoAiSearch.ts`.

Review note:

- Good separation exists between chat UI and ranking/search helpers.
- Small lint warnings show some unused UI helpers/variables.

### Admin

Files:

- `app/admin/*`
- `components/layout/AdminPanelShell.tsx`
- `lib/auth.ts`

Admin areas:

- User management.
- Event registry.
- Storage.
- Categories.
- Agendas.
- Knowledge.
- System operations.
- System monitor.
- Replies.
- Settings and opt-outs.

Review note:

- Admin pages are correctly protected by `AppShell`.
- Some admin pages are outside `/admin` and wrap themselves manually in admin shell patterns, which is workable but worth documenting and keeping consistent.

## 9. Local Next API Routes

| Route | Purpose |
|---|---|
| `POST /api/ring-bell` | Sends a Teams MessageCard to `TEAMS_DEAL_BELL_WEBHOOK_URL` |
| `GET /api/whatsapp/inbound` | Proxies WhatsApp inbound history from backend |
| `GET /api/whatsapp/events` | Proxies WhatsApp SSE stream |
| `GET /api/sales-marathon/users` | Returns active sales users from backend auth users |
| `GET /api/sales-marathon/leaderboard` | Aggregates sales KPI leaderboard |
| `GET /api/delegate-kpi/leaderboard` | Aggregates delegate KPI leaderboard |
| `GET /api/production-kpi/leaderboard` | Aggregates production KPI leaderboard |

Review note:

- These routes are useful backend-for-frontend endpoints.
- They depend on `NEXT_PUBLIC_API_KEY`, which is named public but also used server-side. Consider separating server-only secrets from browser-exposed values if the backend supports it.

## 10. Frontend Architecture Strengths

1. Clear role/persona concept.

The app has a practical model for super admins versus pipeline users. Forced persona routing reduces accidental cross-workspace access for normal users.

2. Central route guard.

`AppShell` is the single most important frontend security/control boundary. It validates auth, forces personas, and redirects unauthorized users.

3. Persona-aware API facade.

Most pages can call `apiRouter` without knowing the backend namespace.

4. Strong TypeScript baseline.

The project has `strict: true`, App Router types, and many explicit API response types.

5. Feature coverage is broad.

The app covers campaign generation, uploads, events, leads, WhatsApp, opt-outs, admin tools, and operations dashboards.

6. Existing documentation exists.

The `docs/` folder already has useful system and endpoint references. This README now provides the top-level review narrative.

## 11. Code Review Findings

### Finding 1: Very large route/component files increase review and regression risk

Examples:

- `app/campaigns/[id]/page.tsx`: about 3,434 lines.
- `components/leads/NormalUserEventLeadSheet.tsx`: about 3,128 lines.
- `app/leads/page.tsx`: about 1,664 lines.
- `app/campaigns/page.tsx`: about 971 lines.

Risk:

- Harder to review.
- Harder to test.
- Higher chance of hook dependency mistakes.
- UI, API calls, normalization, dialog state, and workflow rules are coupled together.

Recommended direction:

- Extract feature hooks such as `useCampaignDetail`, `useLeadFilters`, `useBulkLeadSelection`, `useLeadAttachments`, and `useLeadOutreachActions`.
- Extract table, toolbar, dialog, and status components.
- Keep route files responsible for page composition and route-level decisions.

### Finding 2: Persona API modules duplicate endpoint logic

Files:

- `lib/api.ts`
- `lib/apidele.ts`
- `lib/apiproduction.ts`
- `lib/apiRouter.ts`

Risk:

- A fix in one persona can be missed in the others.
- Endpoint behavior can drift.
- Type exports and response normalization are repeated.

Recommended direction:

- Create one API factory that accepts a namespace prefix:

```ts
createWorkspaceApi({ prefix: "/api" })
createWorkspaceApi({ prefix: "/api/delegates" })
createWorkspaceApi({ prefix: "/api/productions" })
```

Keep `apiRouter` as the public facade so pages do not change.

### Finding 3: Some direct Axios calls bypass typed API wrapper functions

Example:

- `app/campaigns/[id]/page.tsx` uses `api.get("/api/campaigns/...")` directly in `fetchAll`.

Risk:

- Direct paths need special care under delegate/production personas.
- The selected Axios client does not automatically rewrite arbitrary `/api/...` paths unless the module itself uses prefixed paths.
- Some calls are typed loosely and normalize `any` payloads in the component.

Recommended direction:

- Move campaign detail data loading into typed API wrapper functions.
- Return normalized `Lead` and `CampaignDetailViewModel` shapes from a service/helper.
- Keep direct Axios usage only for truly exceptional calls.

### Finding 4: Lint passes, but current warnings should be cleaned before review

`npm run lint` result:

- `0` errors.
- `7` warnings.

Warnings:

| File | Warning |
|---|---|
| `app/campaigns/[id]/page.tsx:684` | `uploadLeadAttachment` is defined but never used |
| `app/campaigns/[id]/page.tsx:797` | `useMemo` missing dependencies `isLeadInNewBucket` and `isLeadInSentBucket` |
| `app/campaigns/[id]/page.tsx:1020` | `useMemo` missing dependencies `isLeadInNewBucket` and `isLeadInSentBucket` |
| `app/dashboard/page.tsx:190` | Raw `<img>` usage instead of `next/image` |
| `app/nizo-ai/page.tsx:61` | `sourceTitle` is defined but never used |
| `app/nizo-ai/page.tsx:267` | `index` is defined but never used |
| `lib/sales-marathon/salesMarathonService.ts:2` | `SalesUser` import is unused |

Recommended direction:

- Fix unused symbols.
- Either include missing hook dependencies or make the helper functions stable.
- Decide whether the DiceBear identicon should stay as raw `<img>` or move to `next/image` with configured remote patterns.

### Finding 5: Auth session is stored in localStorage

Files:

- `lib/auth.ts`
- `components/layout/AppShell.tsx`

Risk:

- If XSS occurs, access tokens in localStorage are exposed.

Current mitigation:

- Route gating is centralized.
- Tokens expire based on `expiresAt`.
- Backend validation through `/api/auth/me` happens at app boot.

Recommended direction:

- If backend changes are possible, move toward HttpOnly secure cookies or a refresh/session endpoint.
- Keep strict sanitization and avoid unsafe HTML injection in product components.

### Finding 6: Browser-exposed API key is used broadly

Files:

- `lib/apiClient.ts`
- `lib/api.ts`
- `lib/apidele.ts`
- `lib/apiproduction.ts`
- `app/api/*`

Risk:

- Any `NEXT_PUBLIC_*` value is available to browser code.
- If `NEXT_PUBLIC_API_KEY` grants privileged backend access by itself, it should not be public.

Recommended direction:

- Treat the public API key as an application identifier only.
- Put sensitive backend secrets in server-only env vars.
- Keep authorization decisions based on user tokens and backend roles.

### Finding 7: Debug logging is enabled in development

Files:

- `lib/api.ts`
- `app/replies/page.tsx`
- `components/dashboard/*`

Risk:

- Logs can expose message payloads during demos or screen shares.

Recommended direction:

- Keep `NEXT_PUBLIC_WA_DEBUG` off during supervisor demos.
- Consider replacing raw `console.log` with a small debug logger that redacts sensitive fields.

### Finding 8: Local generated/system files are present in the tree

Observed:

- `.DS_Store` files under the repo.
- `tsconfig.tsbuildinfo`.
- `.next/` and `node_modules/` are present locally.

Review note:

- These are ignored in normal workflows, but `.DS_Store` files should not be committed.
- Confirm `git status` stays clean before the review.

## 12. Files And Folders That Look Unused Or Legacy

This section is based on a static import/reference scan on 2026-05-28. Treat these as cleanup candidates, not automatic delete targets. Before removing anything, confirm with product intent, route usage, and a production build.

### Dashboard Components Not Used By The Current Dashboard

The current dashboard in `app/dashboard/page.tsx` imports `CampaignHeadsUp`, `UserAvatar`, `TypingText`, and `VariableProximity`. It does not import the older dashboard widgets below.

| File | Evidence | Recommendation |
|---|---|---|
| `components/dashboard/StatsCards.tsx` | Not imported by current app code | Remove or keep only if a dashboard redesign will reuse it |
| `components/dashboard/QuickActions.tsx` | Not imported by current app code | Remove or move to an archive branch |
| `components/dashboard/RecentEvents.tsx` | Not imported by current app code | Remove if the current event heads-up fully replaces it |
| `components/dashboard/LeadsBreakdown.tsx` | Not imported by current app code | Remove together with `components/ui/chart.tsx` if no other chart usage is planned |
| `components/dashboard/PriorityQueue.tsx` | Not imported by current app code | Remove unless priority queue is returning soon |
| `components/dashboard/DashboardSearch.tsx` | Not imported by current app code | Remove if global dashboard search is no longer planned |
| `components/dashboard/RepliesOverviewCard.tsx` | Not imported by current app code | Remove if replies are only handled through `/replies` |

Folder-level note:

- `components/dashboard/` is still partially active because `components/dashboard/CampaignHeadsUp.tsx` is used by `app/dashboard/page.tsx`.
- Do not delete the whole folder unless `CampaignHeadsUp` is moved or removed.

### UI Helpers Not Currently Imported

| File | Evidence | Recommendation |
|---|---|---|
| `components/ui/encrypted-text.tsx` | Exports `EncryptedText`, but no current imports found | Remove if the encrypted text effect is no longer part of the UI direction |
| `components/ui/progress.tsx` | Exports `Progress`, but no current imports found | Remove unless planned for progress bars |
| `components/ui/tabs.tsx` | Exports tabs primitives, but no current imports found | Remove if tabs are not used in near-term admin/dashboard work |
| `components/ui/chart.tsx` | Only referenced by unused `components/dashboard/LeadsBreakdown.tsx` | Remove if `LeadsBreakdown` is removed |

### Route Files That Look Mock, Preview, Or Not Linked From Current Navigation

These are valid pages, but the current sidebar/admin navigation does not link to them.

| File/folder | Evidence | Recommendation |
|---|---|---|
| `app/analytics/page.tsx` | Page text says it is an early look/upcoming analytics feature; no current sidebar link found | Keep only if demo/preview route is intentional |
| `app/completed/page.tsx` | Static completed campaign mock data; no current sidebar link found | Remove or replace with backend-backed completed campaign view |

### Local Next API Routes With No Current In-App Caller

These route handlers may still be useful for external/manual testing, but current app code does not appear to call them.

| File/folder | Evidence | Recommendation |
|---|---|---|
| `app/api/sales-marathon/users/route.ts` | No current frontend fetch/import reference found | Remove if old dashboard leaderboard implementation is retired |
| `app/api/sales-marathon/leaderboard/route.ts` | No current frontend fetch/import reference found; dashboard uses `getDashboardKpiLeaderboard` through `apiRouter` | Remove if backend KPI endpoint fully replaced it |
| `app/api/delegate-kpi/leaderboard/route.ts` | No current frontend fetch/import reference found | Remove if backend KPI endpoint fully replaced it |
| `app/api/production-kpi/leaderboard/route.ts` | No current frontend fetch/import reference found | Remove if backend KPI endpoint fully replaced it |
| `app/api/whatsapp/inbound/route.ts` | Replies UI calls WhatsApp wrappers in `apiRouter`, not this local route | Keep only if needed as a legacy proxy |
| `app/api/whatsapp/events/route.ts` | No current `EventSource` or frontend caller found | Keep only if SSE push is planned |

Active local route:

- `app/api/ring-bell/route.ts` is active. It is called by `components/layout/Sidebar.tsx` for the Sales deal-bell action.

### Other Single Files That Look Unused

| File | Evidence | Recommendation |
|---|---|---|
| `app/campaigns/[id]/CampaignInfoCard.tsx` | Exports a card component, but no current imports found | Remove or integrate into campaign detail if still needed |
| `lib/supabaseClient.ts` | Existing docs and current scan show no active app usage | Keep only if Supabase-backed storage/profile work still depends on it soon |

### Generated Or Local System Files

These are not application source and should not be part of a clean commit:

| File/folder | Status |
|---|---|
| `app/.DS_Store` | Local macOS metadata |
| `app/campaigns/.DS_Store` | Local macOS metadata |
| `components/.DS_Store` | Local macOS metadata |
| `.next/` | Local build output |
| `node_modules/` | Installed dependencies |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache |

## 13. Suggested Refactor Roadmap

### Short-term cleanup before supervisor review

1. Fix the 7 lint warnings.
2. Remove unused helper/imports.
3. Confirm `npm run build` passes.
4. Prepare a short walkthrough of auth, persona, and API routing.
5. Be ready to explain why some files are large and how they can be modularized.

### Medium-term architecture improvements

1. Replace the three duplicated API modules with a workspace API factory.
2. Extract campaign detail logic into hooks/services/components.
3. Extract event lead sheet logic into hooks/services/components.
4. Move response normalization out of route components.
5. Add focused tests around role/persona routing and API prefix selection.

### Longer-term improvements

1. Revisit token storage model with backend support.
2. Split server-only secrets from public frontend config.
3. Add integration/e2e coverage for critical workflows:
   - sign in
   - persona selection
   - campaign upload
   - event lead sheet update
   - campaign detail send flow
   - admin user/event management
4. Add lightweight observability for frontend API failures.

## 14. Suggested Supervisor Walkthrough

Use this order during the review:

1. Start with the product purpose.
   - "This is the frontend for supernizo lead generation and outreach operations."

2. Explain the role/persona model.
   - "Role controls access. Persona controls backend workspace namespace."

3. Show the runtime boundary.
   - `app/layout.tsx`
   - `components/layout/AppShell.tsx`
   - `lib/auth.ts`
   - `lib/persona.ts`

4. Show API routing.
   - `lib/apiRouter.ts`
   - `lib/api.ts`
   - `lib/apidele.ts`
   - `lib/apiproduction.ts`

5. Show main workflows.
   - Sign in.
   - Dashboard.
   - Campaigns/events.
   - Upload.
   - Leads.
   - Admin.

6. Acknowledge technical debt directly.
   - Large page files.
   - Duplicated API modules.
   - Direct Axios calls in campaign detail.
   - localStorage token tradeoff.

7. Close with the roadmap.
   - Short-term lint/build cleanup.
   - Medium-term API factory and component extraction.
   - Longer-term auth hardening and test coverage.

## 15. Review Talking Points

Strong points to highlight:

- Centralized auth/persona guard in `AppShell`.
- Clear role-to-persona mapping.
- Persona-aware API facade.
- Good TypeScript coverage and lint passing with no errors.
- Admin and pipeline surfaces are separated.
- Existing docs already map backend endpoints and workflows.

Tradeoffs to acknowledge:

- The frontend is client-heavy because auth/persona state is browser-side.
- The largest workflows grew inside route components.
- API modules are duplicated across personas.
- Some sensitive configuration is currently browser-exposed by naming/usage.

Practical next steps:

- Clean lint warnings.
- Run build before the meeting.
- Modularize campaign detail first.
- Refactor API modules behind a shared factory.

## 16. Command Results From This Review

```text
npm run lint
```

Result:

```text
0 errors
7 warnings
```

Warnings are documented in section 11.

```text
npm run build
```

Result:

```text
Compiled successfully
Generated 27 app routes
```

## 17. Supporting Documentation

For deeper details, read:

- `docs/codebase-orientation.md`
- `docs/system-overview.md`
- `docs/backend-endpoints.md`
