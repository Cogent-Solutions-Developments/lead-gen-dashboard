# Marketing department

The independent workspace is `/marketing`. Requests and stage completion are separate from the Agenda and Marketing Materials upload libraries. Speaker flyer design is status-only: completing it unlocks Social Media, with no flyer upload.

Roles: `marketing_manager_user`, `marketing_designer_user`, `marketing_developer_user`. `marketing_social` is an additional responsibility configured by managers in Team & History. Legacy `marketing_user` accounts require explicit role assignment by an administrator.

The backend owns authorization, assignments, workflow transitions, version conflicts, and audit records. UI controls do not confer permissions. Requests use client-generated IDs for retries and version numbers for optimistic concurrency. Notifications link to request or library views.

Uploads enforce a 10 MiB hard limit. Agenda PDFs recommend 3 MiB; other materials and speaker images recommend 5 MiB, with an explicit upload-anyway checkbox. The Heavy app reserves multipart overhead in its existing API proxy. Infrastructure request limits must allow at least 12 MiB; the backend still caps each file at 10 MiB.

Deploy the backend migration `20261006_marketing_department.sql` and API before this frontend. Restart default workers and beat for assignment recovery/reminders. Preserve the legacy tables and storage files during rollout. Both frontends can be deployed independently against the same API.

Validation: TypeScript, ESLint on changed code, production build, and browser checks using isolated backend data. Full backend rules and migration steps are documented in the backend repository's `docs/marketing-department.md`.
