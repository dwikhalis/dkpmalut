# Production runbook

## Required before deployment

1. Apply every SQL migration in `supabase/sql`, including `add_api_rate_limits.sql`.
2. Configure all values from `.env.example` in the production deployment. Generate long random values for `RATE_LIMIT_SALT` and `CRON_SECRET`.
3. Run `npm run validate:production-env` in the deployment environment, then `npm run check`.
4. Confirm Midtrans production credentials and register `/api/midtrans/notification` as the HTTPS notification URL.

## Scheduled jobs

`vercel.json` runs draft cleanup daily at 02:15 UTC. Vercel supplies `Authorization: Bearer $CRON_SECRET`. On another platform, schedule an authenticated GET or POST to `/api/cron/cleanup-drafts` once per day.

## Monitoring and alerts

Configure the hosting platform to alert on:

- 5xx rate above 1% over five minutes;
- any repeated 503 from the rate-limit backend;
- failures from `/api/cron/cleanup-drafts`;
- Midtrans webhook failures and payment amount mismatches;
- ticket email status remaining `failed` or `sending`;
- uptime failure for `/` and the public ticket flow.

Do not forward request bodies, visitor identities, SMTP credentials, status tokens, or raw payment notifications to logs or third-party monitoring.

## Backup and recovery

- Enable Supabase point-in-time recovery or daily backups.
- Test a restore into a separate project before launch and every quarter.
- Record the production project IDs and secret owners outside this repository.
- Rotate Supabase service-role, Midtrans, SMTP, cron, and rate-limit secrets after any suspected exposure.

## Release procedure

1. Deploy to staging using sandbox Midtrans and staging Supabase.
2. Complete successful, pending, failed, duplicate-webhook, expired-ticket, and double-scan scenarios.
3. Confirm CSP in browser developer tools, including Midtrans Snap, Turnstile, maps, Supabase realtime, and analytics.
4. Deploy production, make one low-value real transaction, verify the email and scan it, then inspect payment and webhook records.
5. Keep the previous deployment available for immediate rollback.
