# Deployment and operations

## Processes and infrastructure

1. Provision PostgreSQL 17 with TLS, Redis 7 with persistence/TLS, and a private S3-compatible bucket. Use distinct credentials and network access rules. Do not expose Compose development ports publicly.
2. Configure all environment values from `.env.example` through your host's secret manager. Set `APP_URL` and `BETTER_AUTH_URL` to the same canonical HTTPS origin. Use a strong random authentication secret and a different 32-byte encryption key for Canva tokens. Keys must never have a `NEXT_PUBLIC_` prefix.
3. Install Node.js 24 LTS dependencies with `npm ci`. Run `npm run db:migrate` in a release job before starting the new app. Run `npm run build`.
4. Start `npm start` as the web process and `npm run worker` as a separate supervised process. Both need database, Redis, storage and matching server encryption environment values. Provider credentials and model assignments are stored through the encrypted Admin Control Center. Preserve the `public/fonts` directory for PDF export. The worker requires source files, `tsx`, and dependencies; do not prune dev dependencies from a worker image without building an equivalent compiled worker artifact.
5. Place a TLS reverse proxy/load balancer in front of Next.js. Stream `/api/chat` without buffering and permit a two-minute stream. Enforce upload body limits of approximately 11 MB, reasonable request timeouts and request-rate limits at the edge.
6. Enable Resend with a verified sending domain. Keep `REQUIRE_EMAIL_VERIFICATION=true` in production. Configure Google login callbacks only when using Google OAuth.
7. Configure Canva redirect URL exactly and grant only the scopes used by import/export. Test with the actual account/package. A valid PKCE exchange does not establish permission to every Canva API.

## First administrator

Register and verify a normal account. Using a privileged database console, promote the intended account:

```sql
UPDATE "User" SET role = 'super_admin' WHERE email = 'your-verified-email@example.com';
```

Only trusted operators should have database access. Ordinary users cannot change role through the auth API. The admin screen does not expose API secrets.

## Storage and privacy

- Bucket public access must be blocked. Enable server-side encryption, versioning and audit logging as appropriate to the host. Set a lifecycle policy for abandoned temporary import objects and noncurrent versions.
- Application downloads are owner-checked before issuing a 60-second signed URL. Treat these URLs as temporary bearer credentials. Configure logging to avoid storing signed query parameters.
- Document uploads are validated by type, signature, size, and decompressed DOCX limit. Add malware scanning and parser process isolation before accepting high-risk/public workloads.
- Account deletion removes owned upload/generated/import objects before deleting relational data. A storage failure blocks deletion instead of falsely reporting all files deleted. Data in independent backups requires the separate retention policy below.
- Generated text/documents remain until the owner deletes them; ephemeral OAuth state and verification tokens are cleaned by the maintenance worker. Implement a documented backup-retention and audit-retention policy appropriate to the deployment. No claim of regulatory certification is made.

## Backup and restore

- Schedule encrypted daily PostgreSQL backups and enable point-in-time recovery when supported. Use `pg_dump --format=custom` for portable snapshots; store them outside the database host.
- Back up S3 data and object versions consistently with database identifiers. Redis queue persistence is operational recovery, not the authoritative backup of generated files.
- Example restore procedure: provision isolated empty PostgreSQL → `pg_restore --no-owner` into the test database → apply any later migrations → restore/access corresponding private objects → verify owner login, document retrieval and export → record recovery time and data-loss interval.
- Regularly test restores. Rotate encryption/authentication keys with a migration strategy; changing the Canva encryption key without re-encryption invalidates existing integration tokens.

## Monitoring and recovery

Monitor app/worker liveness, database connectivity, queue age, failed jobs, provider error rate, usage limits and storage errors. Configuration flags are not live health checks. Capture only sanitized errors; do not log prompts, private documents, passwords or provider tokens.

BullMQ provides worker leases/stall detection. A provider create request can be uncertain during a network failure. Do not automatically retry a chargeable media creation without checking the provider dashboard/job ID. Video polling uses persisted provider IDs so normal polls do not create another video. Failed jobs are visible; the user may submit a new attempt.

Current monthly limits count provider calls, including document chunks. Requests are not a price quote. Billing reconciliation, organizational tenancy, payment plans and actual invoice reconciliation are outside this release. Configured token prices produce estimates only. See [Admin Control Center](ADMIN_CONTROL_CENTER.md) for the current adapter matrix, MFA, limits, key handling and Supabase migration boundaries.

## Release checklist

Run the checks in VALIDATION, perform an actual provider-backed smoke test for every enabled integration, test email delivery and account recovery, review security headers/CSP for your hosting setup, test at least one backup restore, and conduct an independent security/load review before public availability.
