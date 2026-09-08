# Light frontend production configuration

The Light frontend is a Next.js application hosted on Vercel. Its current
GitHub workflow is `.github/workflows/vercel-deploy.yml`; it deploys a preview
after a merge to `development` and a production release after a merge to
`main`.

## Vercel production variables

Set these in the Light Vercel project for **Production**. Keep server-only
values sensitive. Values with `NEXT_PUBLIC_` are deliberately embedded in
browser assets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Canonical HTTPS LeadGen backend origin, without `/api`. |
| `BACKEND_SERVICE_API_KEY` | Yes | Server-only service credential for KPI proxy routes. Use the backend `RUN_TOKEN`; never expose it with `NEXT_PUBLIC_`. |
| `TEAMS_DEAL_BELL_WEBHOOK_URL` | Yes | Server-only Teams deal-bell webhook URL. |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | Yes | EmailJS browser public key. |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | Yes | EmailJS service ID. |
| `NEXT_PUBLIC_EMAILJS_FEEDBACK_TEMPLATE_ID` | Yes | EmailJS feedback template ID. |
| `NEXT_PUBLIC_EMAILJS_MEETING_TEMPLATE_ID` | Yes | EmailJS meeting template ID. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Yes | reCAPTCHA browser site key, allow-listed for the Light domain. |
| `AUTOCALL_PUBLIC_URL` | Yes | Canonical HTTPS Autocall URL ending in `/autocall-db`. This is server runtime configuration. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL if the Supabase helper is enabled. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anonymous browser key. Require Row Level Security before enabling it. |

Do not set `RUN_TOKEN`, database credentials, provider secrets, or the
Autocall SSO client secret as a `NEXT_PUBLIC_` value.

## GitHub and release checklist

The current workflow requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID` as GitHub Actions secrets. Pull the existing project with
`vercel link` and copy `orgId` and `projectId` from `.vercel/project.json`;
they start with `team_` and `prj_`.

Before merging, run `npm ci`, `npm run lint`, `npm run type-check`, `npm test`,
and `npm run build`. Confirm Vercel Production has every required variable,
that the backend login endpoint returns a normal invalid-login response, and
that the reCAPTCHA site key allows the production hostname.

After deployment, verify sign-in, Autocall launch, an Autocall-disabled user,
and the deal-bell route. If a release fails, use Vercel **Instant Rollback**
or `npx vercel@59.5.0 rollback` with an authorized production token.
