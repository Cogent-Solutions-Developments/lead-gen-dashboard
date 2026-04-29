# Backend Endpoint Catalog

Last verified: 2026-04-29

Source: `GET {NEXT_PUBLIC_API_BASE_URL}/openapi.json` returned `200 application/json`.

This is the backend-advertised API surface. Some routes are used by the current frontend, while others are legacy, backend-internal, webhook, or future/admin utility endpoints.

## Health And Callbacks

| Method | Endpoint | Summary |
|---|---|---|
| `GET` | `/health` | Health |
| `POST` | `/signalhire-callback` | Signalhire Callback |

## Auth

| Method | Endpoint | Summary |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Me |
| `GET` | `/api/auth/roles` | Roles |
| `POST` | `/api/auth/bootstrap-super-admin` | Bootstrap Super Admin |
| `GET` | `/api/auth/users` | List Users |
| `POST` | `/api/auth/users` | Create User |
| `GET` | `/api/auth/users/{user_id}` | Get User |
| `PUT` | `/api/auth/users/{user_id}` | Update User |
| `DELETE` | `/api/auth/users/{user_id}` | Delete User |
| `POST` | `/api/auth/users/{user_id}/password` | Update User Password |

## Admin Events

| Method | Endpoint | Summary |
|---|---|---|
| `GET` | `/api/admin/events` | List Admin Events |
| `POST` | `/api/admin/events` | Create Admin Event |
| `GET` | `/api/admin/events/{event_id}` | Get Admin Event |
| `PUT` | `/api/admin/events/{event_id}` | Update Admin Event |
| `GET` | `/api/event-registry/active` | List Active Event Registry |

## Sales Dashboard And Campaigns

| Method | Endpoint | Summary |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Dashboard Stats |
| `GET` | `/api/dashboard/distribution` | Dashboard Distribution |
| `GET` | `/api/campaigns/recent` | Recent Campaigns |
| `GET` | `/api/campaigns` | List Campaigns |
| `POST` | `/api/campaigns` | Create Campaign |
| `GET` | `/api/campaigns/{campaign_id}` | Campaign Detail |
| `DELETE` | `/api/campaigns/{campaign_id}` | Delete Campaign |
| `GET` | `/api/campaigns/{campaign_id}/export` | Export Campaign Csv |
| `PUT` | `/api/campaigns/{campaign_id}/approve-all` | Approve All |
| `POST` | `/api/campaigns/{campaign_id}/start-outreach` | Start Outreach |
| `GET` | `/api/campaigns/{campaign_id}/info` | Get Campaign Info |
| `POST` | `/api/campaigns/{campaign_id}/info` | Upsert Campaign Info |
| `GET` | `/api/campaigns/{campaign_id}/leads` | Campaign Leads |
| `POST` | `/api/campaigns/{campaign_id}/approve-selected-leads` | Approve Selected Leads |
| `POST` | `/api/campaigns/{campaign_id}/stop` | Stop Campaign |
| `POST` | `/api/campaigns/{campaign_id}/force-delete` | Force Delete Campaign |
| `POST` | `/api/campaigns/{campaign_id}/upload-common-attachment` | Upload Common Attachment |
| `GET` | `/api/campaigns/{campaign_id}/common-attachments` | List Common Attachments |
| `DELETE` | `/api/campaigns/{campaign_id}/common-attachment/{attachment_id}` | Delete Common Attachment |

## Sales Leads, Events, And Workflow

| Method | Endpoint | Summary |
|---|---|---|
| `GET` | `/api/all/leads` | All Leads |
| `GET` | `/api/leads/search` | Search Leads |
| `PUT` | `/api/leads/{lead_id}/approve` | Approve Lead |
| `PUT` | `/api/leads/{lead_id}/reject` | Reject Lead |
| `PUT` | `/api/leads/{lead_id}/content` | Update Lead Content |
| `PUT` | `/api/leads/{lead_id}/workflow-status` | Update Workflow Status |
| `POST` | `/api/leads/{lead_id}/attachments` | Upload Attachment |
| `GET` | `/api/leads/{lead_id}/attachments` | List Attachments |
| `DELETE` | `/api/leads/{lead_id}/attachments/{attachment_id}` | Delete Attachment |
| `GET` | `/api/events` | List Events |
| `GET` | `/api/events/{canonical_event_key}/leads` | Event Leads |
| `POST` | `/api/events/{canonical_event_key}/leads` | Add Event Lead |
| `GET` | `/api/workflow-statuses` | List Workflow Statuses |
| `POST` | `/api/workflow-statuses` | Create Workflow Status |

## Sales Sending

| Method | Endpoint | Summary |
|---|---|---|
| `POST` | `/api/leads/{lead_id}/send-email` | Send Lead Email |
| `POST` | `/api/leads/{lead_id}/send-whatsapp` | Send Lead Whatsapp |
| `POST` | `/api/leads/{lead_id}/send` | Send Lead |
| `POST` | `/api/campaigns/{campaign_id}/send-selected-email` | Send Selected Leads Email |
| `POST` | `/api/campaigns/{campaign_id}/send-selected-whatsapp` | Send Selected Leads Whatsapp |
| `POST` | `/api/campaigns/{campaign_id}/send-selected-leads` | Send Selected Leads |
| `POST` | `/api/campaigns/{campaign_id}/send-all-email` | Send All Pending Email |
| `POST` | `/api/campaigns/{campaign_id}/send-all-whatsapp` | Send All Pending Whatsapp |
| `POST` | `/api/campaigns/{campaign_id}/send-all` | Send All Pending |
| `POST` | `/api/make/send-status` | Make Send Status |

## Delegate Namespace

Delegate endpoints mirror the sales campaign, lead, event, workflow, attachment, and sending API under `/api/delegates`.

| Method | Endpoint pattern |
|---|---|
| `GET` | `/api/delegates/dashboard/stats` |
| `GET` | `/api/delegates/dashboard/distribution` |
| `GET`, `POST` | `/api/delegates/campaigns` |
| `GET` | `/api/delegates/campaigns/recent` |
| `GET`, `DELETE` | `/api/delegates/campaigns/{campaign_id}` |
| `GET` | `/api/delegates/campaigns/{campaign_id}/export` |
| `PUT` | `/api/delegates/campaigns/{campaign_id}/approve-all` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/start-outreach` |
| `GET`, `POST` | `/api/delegates/campaigns/{campaign_id}/info` |
| `GET` | `/api/delegates/campaigns/{campaign_id}/leads` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/approve-selected-leads` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/stop` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/force-delete` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/upload-common-attachment` |
| `GET` | `/api/delegates/campaigns/{campaign_id}/common-attachments` |
| `DELETE` | `/api/delegates/campaigns/{campaign_id}/common-attachment/{attachment_id}` |
| `GET` | `/api/delegates/all/leads` |
| `GET` | `/api/delegates/leads/search` |
| `PUT` | `/api/delegates/leads/{lead_id}/approve` |
| `PUT` | `/api/delegates/leads/{lead_id}/reject` |
| `PUT` | `/api/delegates/leads/{lead_id}/content` |
| `PUT` | `/api/delegates/leads/{lead_id}/workflow-status` |
| `POST`, `GET` | `/api/delegates/leads/{lead_id}/attachments` |
| `DELETE` | `/api/delegates/leads/{lead_id}/attachments/{attachment_id}` |
| `POST` | `/api/delegates/leads/{lead_id}/send-email` |
| `POST` | `/api/delegates/leads/{lead_id}/send-whatsapp` |
| `POST` | `/api/delegates/leads/{lead_id}/send` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-selected-email` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-selected-whatsapp` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-selected-leads` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-all-email` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-all-whatsapp` |
| `POST` | `/api/delegates/campaigns/{campaign_id}/send-all` |
| `GET` | `/api/delegates/events` |
| `GET`, `POST` | `/api/delegates/events/{canonical_event_key}/leads` |
| `GET`, `POST` | `/api/delegates/workflow-statuses` |

## Production Namespace

Production endpoints mirror the sales campaign, lead, event, workflow, attachment, and sending API under `/api/productions`.

| Method | Endpoint pattern |
|---|---|
| `GET` | `/api/productions/dashboard/stats` |
| `GET` | `/api/productions/dashboard/distribution` |
| `GET`, `POST` | `/api/productions/campaigns` |
| `GET` | `/api/productions/campaigns/recent` |
| `GET`, `DELETE` | `/api/productions/campaigns/{campaign_id}` |
| `GET` | `/api/productions/campaigns/{campaign_id}/export` |
| `PUT` | `/api/productions/campaigns/{campaign_id}/approve-all` |
| `POST` | `/api/productions/campaigns/{campaign_id}/start-outreach` |
| `GET`, `POST` | `/api/productions/campaigns/{campaign_id}/info` |
| `GET` | `/api/productions/campaigns/{campaign_id}/leads` |
| `POST` | `/api/productions/campaigns/{campaign_id}/approve-selected-leads` |
| `POST` | `/api/productions/campaigns/{campaign_id}/stop` |
| `POST` | `/api/productions/campaigns/{campaign_id}/force-delete` |
| `POST` | `/api/productions/campaigns/{campaign_id}/upload-common-attachment` |
| `GET` | `/api/productions/campaigns/{campaign_id}/common-attachments` |
| `DELETE` | `/api/productions/campaigns/{campaign_id}/common-attachment/{attachment_id}` |
| `GET` | `/api/productions/all/leads` |
| `GET` | `/api/productions/leads/search` |
| `PUT` | `/api/productions/leads/{lead_id}/approve` |
| `PUT` | `/api/productions/leads/{lead_id}/reject` |
| `PUT` | `/api/productions/leads/{lead_id}/content` |
| `PUT` | `/api/productions/leads/{lead_id}/workflow-status` |
| `POST`, `GET` | `/api/productions/leads/{lead_id}/attachments` |
| `DELETE` | `/api/productions/leads/{lead_id}/attachments/{attachment_id}` |
| `POST` | `/api/productions/leads/{lead_id}/send-email` |
| `POST` | `/api/productions/leads/{lead_id}/send-whatsapp` |
| `POST` | `/api/productions/leads/{lead_id}/send` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-selected-email` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-selected-whatsapp` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-selected-leads` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-all-email` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-all-whatsapp` |
| `POST` | `/api/productions/campaigns/{campaign_id}/send-all` |
| `GET` | `/api/productions/events` |
| `GET`, `POST` | `/api/productions/events/{canonical_event_key}/leads` |
| `GET`, `POST` | `/api/productions/workflow-statuses` |

## WhatsApp And Opt-Outs

| Method | Endpoint | Summary |
|---|---|---|
| `POST` | `/api/whatsapp/d360/webhook` | D360 Webhook |
| `POST` | `/api/whatsapp/twilio/inbound` | Twilio Inbound Webhook |
| `POST` | `/api/whatsapp/twilio/status` | Twilio Status Webhook |
| `GET` | `/api/whatsapp/messages` | Get Messages |
| `GET` | `/api/whatsapp/unread-count` | Unread Count |
| `POST` | `/api/whatsapp/mark-read` | Mark Read |
| `GET` | `/api/whatsapp/notifications` | Whatsapp Notifications |
| `GET` | `/api/whatsapp/inbound` | List Inbound |
| `GET` | `/api/whatsapp/events` | Whatsapp Events |
| `POST` | `/api/marketing/opt-outs/upload` | Upload Opt Out Numbers Csv |
| `POST` | `/api/whatsapp/opt-outs/upload` | Upload Opt Out Numbers Csv |
| `POST` | `/api/marketing/opt-outs` | Create Marketing Opt Out |
| `GET` | `/api/marketing/opt-outs` | List Whatsapp Opt Outs |
| `POST` | `/api/whatsapp/opt-outs` | Create Marketing Opt Out |
| `GET` | `/api/whatsapp/opt-outs` | List Whatsapp Opt Outs |
| `POST` | `/api/leads/{lead_id}/whatsapp/disable` | Disable Marketing For Lead |
| `POST` | `/api/leads/{lead_id}/marketing/disable` | Disable Marketing For Lead |

## Legacy / Lower-Level ICP, Jobs, And Drafts

These are advertised by the backend but are not the primary API used by the current Next.js UI.

| Method | Endpoint | Summary |
|---|---|---|
| `POST` | `/api/v1/icp/start` | Start Icp |
| `GET` | `/api/v1/jobs/{job_id}` | Get Job |
| `POST` | `/api/v1/jobs/{job_id}/cancel` | Cancel Job |
| `GET` | `/api/v1/icp/{icp_run_id}` | Get Icp Run |
| `GET` | `/api/v1/icp/{icp_run_id}/keyword-config` | Get Keyword Config |
| `GET` | `/api/v1/icp/{icp_run_id}/scrape/results` | Get Scrape Results |
| `POST` | `/api/v1/icp/{icp_run_id}/content/generate` | Start Content Gen |
| `POST` | `/api/v1/icp/{icp_run_id}/content/generate-step5` | Generate Step5 Now |
| `GET` | `/api/v1/icp/{icp_run_id}/drafts` | List Drafts |
| `GET` | `/api/v1/icp/{icp_run_id}/people` | Get People |
| `POST` | `/api/v1/drafts/{draft_id}/approve` | Approve Draft |
| `POST` | `/api/v1/drafts/{draft_id}/reject` | Reject Draft |
| `POST` | `/api/v1/drafts/{draft_id}/send-email` | Send Draft Email |
| `POST` | `/api/v1/drafts/{draft_id}/send-whatsapp` | Send Draft Whatsapp |
| `POST` | `/api/v1/drafts/{draft_id}/send` | Send Draft |
| `POST` | `/api/v1/dev/seed-dummy` | Seed Dummy |
