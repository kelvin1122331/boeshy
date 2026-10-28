# HOLYAI Admin Control Center

Control Center lives at `/admin` (redirects to `/admin/overview`). It uses the existing Next.js, Better Auth, Prisma/PostgreSQL, private S3-compatible storage and BullMQ worker. The user workspace keeps its own layout. All 26 admin menu entries have dedicated routes.

## Current state

No real AI/provider keys were added and no external provider connection was tested during implementation. Keyed providers start disabled and not configured. Public metadata/job sources can be available without credentials; **available/untested does not mean connected**. Usage and system cards read actual persisted data. Unknown historical request outcomes, generated-file storage totals and provider prices remain unknown rather than fabricated.

Ready adapters: Gemini text/JSON/vision; OpenAI Responses text/vision, image generation and asynchronous video; Anthropic text; Tavily/Brave web search; Crossref/OpenAlex/Semantic Scholar academic metadata; Arbeitnow/Adzuna job discovery. Model access, formats, quotas and subscriptions still depend on the real provider account. Tests use mocked provider responses and disabled temporary credentials, never billable generation.

Canva uses the existing per-user OAuth/PKCE and supported Canva export flow; internal PPTX generation stays separate. Google provides per-user OAuth/PKCE connection/status/disconnect groundwork, not Calendar synchronization or Drive/Docs/Slides operations yet. Social platforms and custom providers have isolated configuration definitions and explicitly unavailable adapters; entering a key alone cannot implement a new protocol. Image editing, audio, embeddings and tool calling remain unavailable in the model form until implemented. There are no fake search results, assets, progress or completed jobs.

## First administrator

An existing user's role must be changed by a trusted operator, not through public registration:

```powershell
node --env-file=.env scripts/bootstrap-admin.mjs --email your-existing-account@example.com
```

The explicitly approved local account `kelvin` was promoted to Super Admin. Password and existing workspace data were retained. Roles are checked freshly in PostgreSQL for every protected request; a stale sign-in cookie cannot retain revoked privileges.

| Role | Access |
| --- | --- |
| Super Admin | All administrative capabilities, including role changes |
| Admin | Provider/model/feature configuration, monitoring, accounts, quotas, settings; cannot change roles |
| Support | Monitoring and user lookup; no provider/credential access or mutations |
| User | No admin pages or endpoints |

Role changes revoke the target's sessions. Self role changes and removing the final Super Admin are refused. Browser visibility is supplementary; the backend enforces permissions independently. All admin responses use `no-store` and mutations require the exact application origin.

## Configure a provider later

1. Open **API Credentials**, choose **Configure**, and enter the provider's matching authentication fields. Saving does not call an external API.
2. Save. The form clears and GET returns masks, dates and version only. Existing secrets cannot be revealed. Blank fields preserve stored values; Rotate requires a new secret; Delete disables the provider.
3. Choose **Test Connection** explicitly. This probes a known official endpoint, with bounded timeout and no redirects. A models-list success verifies that endpoint only, not successful generation or access to every model. OAuth requires a separate per-user approval; unsupported probes show Verification Unavailable.
4. In **Model Management**, add an exact model identifier, supported capabilities and media constraints. Prices are optional estimates per million tokens in USD; they are not billing data. Only supported adapter capabilities may be enabled.
5. Enable the provider and assign the model in **AI Routing / Feature Management**. Dependencies show what remains missing. Feature flags and limits are enforced again by server/worker code.

The admin can swap models within implemented adapters without source changes. Official endpoints are fixed. A future custom adapter also requires an exact HTTPS endpoint in server-side `AI_ENDPOINT_ALLOWLIST`; its generic outbound adapter is deliberately unavailable.

Text fallback requires a configured compatible secondary model **and explicit data-transfer consent**. Retries are bounded by both feature and provider settings (maximum two). Chat with retry/fallback enabled buffers a validated response before emitting text; native streaming does not switch providers after partial output. Image/video generation does not automatically retry or fall back to another billable generation. Video polling retains the original model identifier. Search uses the explicitly selected primary service; alternatives may be configured but are not automatically invoked. Failed attempts count toward usage limits.

## Encryption, sessions and MFA

`CREDENTIAL_ENCRYPTION_KEY` is a randomly generated **64-character hexadecimal** server-only key. It must be identical for web and worker. The local ignored `.env` has been initialized; deployments must supply their own key. It is never a `NEXT_PUBLIC_*` value and is never stored in PostgreSQL. Provider secrets and MFA seeds use AES-256-GCM with random nonces and context-specific authenticated data. OAuth tokens retain the existing separate `TOKEN_ENCRYPTION_KEY`.

Back up the encryption keys separately from encrypted database backups. Losing or replacing a master key makes existing ciphertext unreadable. There is no automatic master-key migration tool: retain the old key securely, plan a maintenance migration or re-enter credentials under the new key, and restart web/worker together. Credential rotation through the admin form is supported and invalidates prior connection-test status. Audit records contain action names/IDs and safe metadata, never key values or provider response bodies.

Security offers optional authenticator TOTP with encrypted seeds, replay prevention, eight one-use recovery codes, and a ten-minute verification grant scoped to one session. Seed/recovery codes are shown once during setup; no external QR service receives them. Disabling MFA requires a current verified admin session. Trusted operator recovery is available through `bootstrap-admin.mjs --email ... --reset-mfa`.

## Infrastructure and deployment

Run additive migrations before starting updated web/worker processes:

```text
npm run db:migrate
npm run build
npm start
npm run worker
```

See `.env.example` and the existing deployment documentation. Database URL, auth secrets, S3 credentials, encryption keys and OAuth redirect configuration belong in deployment environment variables/secret managers, never the live admin database form. The deployment page shows presence/readiness only. Explicit health checks touch the configured database/Redis/storage, not external AI providers. Backup status is unavailable until an actual backup monitor is connected.

Supabase PostgreSQL can be selected via `DATABASE_URL`; private Supabase S3-compatible storage can use the existing S3 environment settings. Supabase URL/service-role environment placeholders are documented, but **Supabase Auth migration has not been implemented**: existing accounts remain on Better Auth. Do not replace the authentication backend or claim Supabase is connected merely because a URL is present. Storage usage currently totals tracked uploads; generated-file accounting remains unknown.

Vercel can host the web process where its request/runtime limits permit. BullMQ requires a separate persistent worker host plus Redis and reachable PostgreSQL/storage; a serverless request is not a substitute for this worker. Redirect URIs and `APP_URL` must match the deployed HTTPS origin. Provider/network failures cannot be fully verified until real credentials are configured and explicit tests run.

## Validation

Unit tests cover encryption/randomization/tampering/context isolation, masks, permission separation, endpoint validation, bounded configuration, TOTP vectors and mocked safe provider probes. Browser tests cover every admin route, responsive layout, current-role enforcement, credential save/rotate/revoke without raw GET exposure, feature persistence, MFA challenge/replay/recovery, and cleanup of temporary fixtures. Existing workspace/auth/export/queue suites remain in place. CI includes a clearly test-only encryption key; no production keys belong in CI source.

## Official references

- [Gemini generateContent](https://ai.google.dev/api/generate-content)
- [OpenAI model listing](https://developers.openai.com/api/reference/resources/models/methods/list)
- [OpenAlex authentication and public access](https://help.openalex.org/api/authentication/)
- [Canva REST authentication](https://www.canva.dev/docs/apps/rest-apis/authentication/)
- [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Adzuna search API](https://developer.adzuna.com/docs/search)

## Hugging Face image adapter

The Image Generation admin page includes Hugging Face token configuration and a link to its official token manager. This adapter supports only black-forest-labs/FLUX.1-schnell, routed through Hugging Face to Nscale using the official @huggingface/inference client. The provider and prepared model start disabled. Enable only after saving a real token with Inference Providers permission and verifying access. The identity probe confirms token authentication, not image generation or credit eligibility.

Use a Free account with available trial credits for a free experiment. Credit amounts and eligibility are controlled by Hugging Face and may change. Existing paid balances on the account can also fund requests; HOLYAI does not purchase credits, enable billing, retry billable requests, or switch to OpenAI. HTTP 402/429 stops generation with an explanatory error. Real image generation is unverified until the account token is provided. No image is marked completed until valid PNG/JPEG bytes have been stored privately.

The adapter pins the provider, restricts authenticated outbound fetches to HTTPS Hugging Face hosts, disables redirects/retries, bounds timeout/output size, and validates image signatures. Unit tests exercise the actual SDK with mocked HTTP responses for returned image bytes, credit errors and credential rejection.

References: [HF text-to-image API](https://huggingface.co/docs/inference-providers/tasks/text-to-image), [token settings](https://huggingface.co/settings/tokens), [credit policy](https://huggingface.co/docs/inference-providers/pricing).
