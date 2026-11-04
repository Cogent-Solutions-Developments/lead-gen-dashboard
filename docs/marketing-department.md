## Library presentation and interaction polish

The event selector and library controls share one compact toolbar. The current agenda uses a file-format icon, current-version badge, readable metadata, uploader identity and stronger View action. History stays secondary, with expandable rows and chevrons. Materials retains its title-first table, adds recognizable format icons, and opens previews from document titles as well as View buttons. Type filters and visible counts appear only when multiple file groups are present; filtering resets pagination. On phones, table rows stack so View and Download remain visible without horizontal scrolling.

Downloads show progress on the selected file. Hover/focus states and restrained transitions use the existing themes, with reduced-motion support. Fonts, Heavy dock, Light sidebar, upload/release permissions, native PDF previews and the libraries-only workflow boundary remain unchanged. These changes improve discoverability; no claim of measured engagement uplift is made.

## Simplified event libraries

Agenda emphasizes the latest upload in an accented card. A secondary paged timeline expands to show the same version, filename, uploader, date, size, title, source and status, with View/Download actions. History search and explanatory page subtitles are removed.

Materials shows an Event materials table only (no latest-files panel): upload title, filename beneath it, uploader, date, size and actions. Version and Metadata columns are removed. Existing draft visibility, manager release and upload permissions remain.

PDFs retain the native browser viewer. Images, text and common media display in the app. Modern Word (.docx), Excel (.xlsx/.xlsm/.xltx), PowerPoint (.pptx), and OpenDocument files have authenticated, read-only content previews from the backend `/library/{id}/content` endpoint. No third-party document viewer receives files. Office formatting, embedded objects and charts are not reproduced. Spreadsheets show up to 10 sheets, 200 rows and 30 columns; formulas use cached results and macros never execute. Other formats, including legacy .doc/.xls, can be downloaded to open in their native applications. Existing large agenda PDFs remain viewable/downloadable.

# Libraries-only release scope

Branch: `feat/imp/marketing-libraries-only`. Full workflow remains on `feat/marketing-department` awaiting CEO approval. Do not deploy or push without a separate request.

Marketing staff open on Marketing home and have three destinations: Landing page, Agenda and Materials. Other departments, including Sales, Delegates, Production and Delegate Sales, see only Agenda and Materials. Existing Manager/Designer upload permissions remain. No request creation/tracking, tasks, social queue, charts, team assignment or task-linked uploads are mounted. Existing fonts, Light sidebar and Heavy floating dock remain.

The matching backend exposes context and standalone library endpoints only, with no scheduled workflow automation. Upload limits, native PDF preview, legacy event agendas, version history, downloads and manager material release remain. Old workflow links normalize to Marketing home for staff or Agenda for other departments. Dormant workflow component/source files are retained for the future approved rollout and are not imported by the workspace.

---

# Historical full-workflow implementation (not this release)

# Marketing department

The independent workspace is `/marketing`. Requests and stage completion are separate from the Agenda and Marketing Materials upload libraries. Speaker flyer design is status-only: completing it unlocks Social Media, with no flyer upload.

Roles: `marketing_manager_user`, `marketing_designer_user`, `marketing_developer_user`. `marketing_social` is an additional responsibility configured in admin user management for Marketing users only. Legacy `marketing_user` accounts can retain their primary role while adding manager, designer or developer responsibilities in user management. Social responsibility is also available as an explicit checkbox in user management.

The backend owns authorization, assignments, workflow transitions, version conflicts, and audit records. UI controls do not confer permissions. Requests use client-generated IDs for retries and version numbers for optimistic concurrency. Notifications link to request or library views.

Uploads enforce a 10 MiB hard limit. Agenda PDFs recommend 3 MiB; other materials and speaker images recommend 5 MiB, with an explicit upload-anyway checkbox. The Heavy app reserves multipart overhead in its existing API proxy. Infrastructure request limits must allow at least 12 MiB; the backend still caps each file at 10 MiB.

Deploy the backend migration `20261006_marketing_department.sql` and API before this frontend. Restart default workers and beat for assignment recovery/reminders. Preserve the legacy tables and storage files during rollout. Both frontends can be deployed independently against the same API.

Validation: TypeScript, ESLint on changed code, production build, and browser checks using isolated backend data. Full backend rules and migration steps are documented in the backend repository's `docs/marketing-department.md`.

The workspace includes overview metrics, an actionable personal queue, recent activity, board/list/calendar views, request filtering and a dedicated social queue. Request drawers preserve the selected event, filters and view. Both legacy and additional Marketing roles survive saving and reopening the user editor; explicit removal revokes the responsibility. Six role-selection regression tests cover combined roles, social revocation, pipeline compatibility and unsupported combinations.

Marketing sections now use the existing application navigation: the Light sidebar and Heavy floating dock. The dock includes the existing sign-out action. The duplicate social-responsibility editor is removed from Team & activity; only accounts with a selected Marketing role can receive social responsibility through user management. Server validation enforces this restriction independently of UI visibility.

### Event library visibility
Marketing Agenda includes existing Event Document Library agendas live, with their original files and history. Agenda uploads are immediately available to authorized event users, including previously drafted agendas. The newest upload across both sources is shown as latest; earlier uploads remain in history. Marketing materials retain manager release. Source labels keep each library's version numbers clear. Admin records and upload limits are unchanged. Agenda and Materials offer current files, searchable/paged upload history and upload dialogs; Marketing retains its 10MB maximum and 3MB/5MB recommendations.


### Library layout and previews
Marketing work pages use a centered 80% content width on desktop and responsive sizing below 1024px; the Heavy entry landing is unchanged. Agenda and Materials share the latest-file rows and paginated history table. View opens the browser's native PDF viewer using a short-lived, file-scoped link; the browser streams the PDF directly. Images and supported text formats also preview locally; other formats offer Download. No documents are sent to third-party viewers. No PDF.js worker generation is required.

### Heavy behavior parity (30 October 2026)

Light carries the current Heavy Marketing behavior while retaining its sidebar, native selects, API base configuration, existing font inheritance and Light theme:

- Task queues reload on focus and on new Marketing notifications. Social media navigation and direct URLs require the social responsibility; its team queue displays owners while backend-provided `canUpdate` controls who can edit.
- Task briefs open in a scrollable dialog. Status editors preserve drafts during refresh, prevent unchanged/duplicate saves, require blocker notes, support Escape/cancel focus return and show save feedback.
- Notification request links are read-only (including legacy links). Request mutation, upload, reassignment, review and comment controls are hidden/guarded in that viewing context; normal workspace links retain editing.
- Workspace context refreshes when account role/responsibility changes. Unnecessary overview/list fetches are avoided outside their sections.
- Automatic assignment uses explicit Save, event overrides/defaults, preserved failed drafts and readable paginated activity.
- Agenda uploads are immediately available; materials still require manager release. Existing history, upload limits and native previews remain.
- Calendar dates match both month and year, with a compact mobile deadline list. Request tables retain responsive labels and empty states.

Verification used adapted Heavy regression cases against Light's actual components with the existing Heavy Vitest runtime (no Light dependency additions), Light's native role/notification-link tests, type checking, lint and a production build. A browser check used disposable API data to confirm the task brief, status save and flyer-to-social handoff. It did not exercise deployed sign-in or production records.


### Speaker follow-ups and deferred social creation (2 November 2026)

- New speaker requests create website, flyer and agenda tasks. The social task is inserted and assigned only when the flyer is completed, within the same locked transaction. The handoff notification is persisted with that transaction and published after commit. Repeated completion cannot create duplicate tasks or handoffs. Legacy waiting social rows are preserved but hidden until their flyer is done; the assignment worker can recover a missed eligible handoff.
- Editing speaker fields creates a new request linked by `sourceRequestId`. Website and agenda tasks are created by default. The original details, status, revisions and completed tasks stay unchanged; its history records the follow-up link and its optimistic version advances to reject stale edits. Every follow-up has its own completion and manager review.
- Edit forms support No post changes, Update post, Delete post and Republish post. Update/republish adds flyer work and creates social work after design completion. Delete creates a social removal task directly, without requiring a new design. These are tracked work instructions; the system does not call external social-platform deletion/publishing APIs.
- `followUpId` is a client-generated idempotency key. Retries against the same source return the existing follow-up; stale edits with a different key fail. Links to the original and subsequent follow-ups remain available in request details.
- An initial image may attach to a new, untouched request using `initialUpload=true`; subsequent image replacements/removals create follow-ups too. Inherited images are authorized through the new request's server-controlled image reference; other storage IDs remain inaccessible. Newly uploaded images belong to their own follow-up.
- Heavy and Light retain their own controls, themes and fonts. Task briefs display the requested speaker-post action.

Deployment: `migrations/20261102_marketing_speaker_followups.sql` adds nullable request linkage and workflow metadata without deleting previous work. It is wired into the existing `python -m tools.run_schema_migration` / startup schema path. Deploy the backend/API and worker with that migration before the frontends. Existing non-speaker edits and manager correction/reopen actions retain their previous behavior.


### Upload and complete a task

Agenda and Marketing materials tasks offer **Upload & complete** from their existing status controls. The dialog preselects the task's event, preserves the task note and reuses the library upload validation and size warnings. A successful upload stores the version and completes that task in one backend transaction, then refreshes the task table. Failed uploads retain the selected file for retry; the upload UUID prevents duplicate versions when a successful response is lost.

Only authorized Manager/Designer accounts receive this action. Speaker flyer tasks remain status-only. Standalone library uploads do not change task status. Agendas are immediately available; materials still require manager release. Request completion still requires manager approval. Managers can create a custom Marketing materials task and configure its Designer owner through existing assignment controls.

Deploy the updated Marketing backend and worker before this frontend. No font, theme, navigation or other department changes are required.


### Speaker update subtasks

Add speaker update opens a native popup over the existing request. Choose Website, Agenda, Website & agenda, Update post, Republish post or Delete post. The operation and speaker generate the subtask name, and the original task name remains visible as its parent. New request forms use Task name rather than Title.

Each operation creates only its required Marketing work. Website goes to Developer; Agenda goes to Designer; post updates/republication go to Designer and then Social after design completion; deletion goes directly to Social. Every update retains separate status, history and manager approval. Parent request details show named children and progress links; task tables and manager work views show the parent name. Existing completed work and request titles remain intact.

Deploy the updated backend before the frontend because the edit API now accepts `operation` and returns structured subtask summaries. No new schema migration or font changes are needed.


### Speaker before/after comparison

View changes opens a saved comparison in an assigned speaker-update task's brief. Request details also have a Changes tab. The shared comparison supports side-by-side and unified layouts, word-level added/removed highlighting, and optional unchanged fields. Full current details are collapsed for updates to keep the focus on changes. Initial request briefs, fonts and themes retain their existing presentation.

Task comparisons load only when opening a brief and are aborted on close. The backend exposes the saved creation-time values through the authorized task; the UI does not need full parent history. Previous/current image downloads use the child request's authorized image route. Missing historical baselines and operation-only updates have distinct states. Long biography comparisons use a bounded algorithm and preserve the exact original/requested text. Deploy the comparison-enabled backend before this frontend; no new dependency or migration is required.


### Compact request popups and Other requests

New request and request details open in centred native popups. Short requests shrink to their content; long forms scroll under the fixed close header. Mobile screens retain viewport margins. Existing edit, speaker-update and upload popups remain available, and Escape closes only the active inner popup. New requests cannot close during submission. Existing fonts, themes, navigation and page widths are preserved.

Department requesters can choose Other, then select one or more checkboxes: Website update (Developer), Marketing materials (Designer), and Agenda update (Designer). The server creates a separate task for every selected option using existing event/default assignments. Managers additionally retain Custom workflow for selecting delivery stages. Existing task updates, task-linked uploads, version history, notifications, requester tracking and manager approval apply; materials still need manager release.

Deploy the updated backend before this frontend: creation sends `kind=other` with an `operations` array containing one or more of `website`, `materials`, and `agenda`. The server keeps legacy single-operation clients compatible, rejects empty/invalid lists and mixed operation/custom-stage payloads and prevents department requesters from choosing arbitrary task kinds. Manager custom payloads remain compatible. No new schema migration or dependency is required.


Combined choices stay under one request with independent task owners and statuses; every selected task must finish before manager approval. The form prevents submitting with no choice selected. Selecting the manager-only Custom workflow clears preset choices; selecting a preset clears Custom workflow, preventing ambiguous mixed submissions.


### Active-event defaults

Marketing event pickers default to the first event in the API's active-event list when no event has been selected. An explicit event selection or event-specific link takes precedence. Agenda and Materials omit All events and immediately fetch the selected event's files; incoming aggregate links also resolve to an active event on these pages. Their upload dialogs inherit that event. If no active events are available, the event picker is disabled and no library read is sent.

Other Marketing views retain an explicit All events option using `event=all`, while starting with an active event by default. Fonts, themes, navigation and other departments are unchanged. This is a frontend-only change and requires no API deployment or migration.

Validation: Heavy Marketing workspace/library/request tests passed 74 checks; actual Light Marketing components passed 105 checks through the parity harness. Both frontend full lint checks and production builds passed. Coverage includes default library reads, explicit event preservation, aggregate library links, empty active-event lists, and explicit aggregate request views.


### Visual manager overview

Request progress replaces the redundant My work queue with a status ring and clickable status counts. Team activity replaces the text timeline with seven daily stacked bars; selecting a day shows a compact task/request/review/other breakdown. My tasks, Agenda and Materials remain in the existing navigation; their duplicate overview shortcuts are removed. The overview avoids its unused assigned-queue and request-list reads. Switching events does not display another event's cached overview.

Activity totals cover all authorized updates in the selected event over seven UTC days, rather than the old latest-12 entry sample. Zero days remain visible, and missing activity data is shown as unavailable. Detailed history remains in the existing activity log. Marketing keeps its megaphone icon; Social media uses Share2. Existing fonts, themes, navigation, role permissions and other departments are preserved.

Deploy the updated backend API before this frontend to provide `overview.activitySummary`. No schema migration or new dependency is required. Both production builds and full lint passed; Heavy chart/workspace/navigation checks passed 40 tests, and actual Light Marketing components passed 111 checks across the main run and focused chart rerun.


### Compact request activity

Request activity shows five updates per page, newest first, with explicit page and item counts. Each update expands on demand, and nested before/after fields render as readable labels and values instead of object placeholders. The comment editor is collapsed by default. Request section tabs stay sticky within the popup so users can switch sections without scrolling back to the top. Existing fonts, themes, task controls, uploads and read-only permissions are preserved. No backend change is required.
