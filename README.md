# Supernizo Light

The Light frontend provides user and role administration and launches Autocall
through the Supernizo SSO handoff. Business data and authentication remain in
the LeadGen backend.

## Local development

Copy `.env.example` to `.env.local`, set the required values, then run:

```bash
npm ci
npm run dev
```

Run `npm run lint`, `npm run type-check`, `npm test`, and `npm run build`
before submitting a release.

## Deployment

Production deployments use the GitHub Actions workflow because `vercel.json`
disables Vercel's native Git deployment. See
[`docs/production-deployment.md`](docs/production-deployment.md) for the
required Vercel values, GitHub secrets, release process, and rollback
procedure. The Autocall handshake is documented in
[`docs/autocall-integration.md`](docs/autocall-integration.md).

.