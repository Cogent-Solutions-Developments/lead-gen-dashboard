# Overall Outreach graphs and stationary downloads ? 10 November 2026

Application commit: `ce5f0dae6c0ae44fe95d36880be34214e752c6f5`.

Status Outreach opens with overall counts across all dates. Date inputs and presets update the draft selection; Apply changes the graph, lead details, and Excel scope. All dates restores the overall view. Download feedback appears below the controls, and the preparing label retains the button width.

Application files in the included fix:
- `components/automated-outreach/StatusActivityChart.tsx`
- `components/automated-outreach/StatusActivityChart.module.css`
- `components/automated-outreach/StatusActivityReportDownload.tsx`
- `lib/statusOutreachActivity.ts`
- `lib/statusOutreachReport.ts`
- `lib/statusOutreachWorkbook.ts`
- `tests/status-outreach-activity.test.mjs`
- `tests/status-outreach-report.test.mjs`
- `docs/automated-lead-outreach.md`

Validation: 300 frontend tests passed, along with lint, TypeScript checks, and the production build. An additional 52 headless layout checks passed across 13 viewport widths.

Deploy only after the backend supports date-less report requests. The existing GitHub Actions pipeline validates the application, stages a production Vercel deployment, checks its configuration, and promotes the staged build. No workflow configuration is changed by this release note.
