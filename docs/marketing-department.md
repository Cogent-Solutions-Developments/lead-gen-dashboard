# Marketing department

The independent workspace is `/marketing`. Requests and stage completion are separate from the Agenda and Marketing Materials upload libraries. Speaker flyer design is status-only: completing it unlocks Social Media, with no flyer upload.

Roles: `marketing_manager_user`, `marketing_designer_user`, `marketing_developer_user`. `marketing_social` is an additional responsibility configured in admin user management for Marketing users only. Legacy `marketing_user` accounts can retain their primary role while adding manager, designer or developer responsibilities in user management. Social responsibility is also available as an explicit checkbox in user management.

The backend owns authorization, assignments, workflow transitions, version conflicts, and audit records. UI controls do not confer permissions. Requests use client-generated IDs for retries and version numbers for optimistic concurrency. Notifications link to request or library views.

Uploads enforce a 10 MiB hard limit. Agenda PDFs recommend 3 MiB; other materials and speaker images recommend 5 MiB, with an explicit upload-anyway checkbox. The Heavy app reserves multipart overhead in its existing API proxy. Infrastructure request limits must allow at least 12 MiB; the backend still caps each file at 10 MiB.

Deploy the backend migration `20261006_marketing_department.sql` and API before this frontend. Restart default workers and beat for assignment recovery/reminders. Preserve the legacy tables and storage files during rollout. Both frontends can be deployed independently against the same API.

Validation: TypeScript, ESLint on changed code, production build, and browser checks using isolated backend data. Full backend rules and migration steps are documented in the backend repository's `docs/marketing-department.md`.

The workspace includes overview metrics, an actionable personal queue, recent activity, board/list/calendar views, request filtering and a dedicated social queue. Request drawers preserve the selected event, filters and view. Both legacy and additional Marketing roles survive saving and reopening the user editor; explicit removal revokes the responsibility. Six role-selection regression tests cover combined roles, social revocation, pipeline compatibility and unsupported combinations.

Marketing sections now use the existing application navigation: the Light sidebar and Heavy floating dock. The dock includes the existing sign-out action. The duplicate social-responsibility editor is removed from Team & activity; only accounts with a selected Marketing role can receive social responsibility through user management. Server validation enforces this restriction independently of UI visibility.
