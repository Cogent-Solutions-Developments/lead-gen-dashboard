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
