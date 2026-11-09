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

Lint tooling uses pinned ESLint and patched `minimatch` 11.0.1 dependencies.
`npm install` and `npm ci` run `scripts/prepare-minimatch.mjs` to preserve the
callable CommonJS API expected by older lint plugins without changing the
patched matching implementation. Keep that hook with the package files; it
skips production installs that omit development dependencies.

The existing Next.js lint preset and React Hooks rules are retained. The React
version setting in `eslint.config.mjs` keeps that preset compatible with ESLint
10. `tests/minimatch-compat.test.mjs` verifies glob matching and lint behavior.

`allowScripts` approves only the reviewed `unrs-resolver@1.11.1` installer,
which checks its platform-specific native binding. Review a new version before
changing that approval. `npm approve-scripts --allow-scripts-pending` lists
unreviewed dependency install scripts without changing the project policy.

## Deployment

Production deployments use the GitHub Actions workflow because `vercel.json`
disables Vercel's native Git deployment. See
[`docs/production-deployment.md`](docs/production-deployment.md) for the
required Vercel values, GitHub secrets, release process, and rollback
procedure. The Autocall handshake is documented in
[`docs/autocall-integration.md`](docs/autocall-integration.md).

.
