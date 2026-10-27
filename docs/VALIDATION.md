# Validation record

Local validation performed on **27 October 2026 (Asia/Jakarta)**. Environment: Windows x64, Node.js 24.18, Next.js 16.4.3, native PostgreSQL 17, Redis 7.4.11 and RustFS 1.0.4 as a private S3-compatible test endpoint.

## Executed checks

| Check | Result / scope |
|---|---|
| Prisma migration deploy | Initial SQL migration applied successfully to real PostgreSQL. |
| TypeScript strict check | Passed; also run by the production build. |
| ESLint | Passed on authored source/config/tests; generated reports and dependencies excluded. |
| Unit and infrastructure tests | 14 passed: grade arithmetic/topic accuracy/unanswered states, answer shuffling, schema validation, route intent, upload validation, valid DOCX/PDF/PPTX/XLSX/EPUB, and real Redis/worker deadline notifications without duplicates. |
| Browser/API E2E | 4 passed: authenticated registration/login and all 18 routes; task/project persistence and mobile width/menu; account/role/origin isolation and exam key protection; private object upload/download/deletion and spoof rejection; interactive ABCDE answers, submit, and score/review. These checks are grouped in four Playwright tests. |
| Production build | Passed, with dedicated App Router pages for the 18 tools and shared/auth/API routes. |
| Dependency audit | `npm audit`: 0 known vulnerabilities at validation time. A clean audit is not a security certification. |
| Live academic metadata | Real Crossref request returned 20 metadata records with original DOI/source URLs. No model-created bibliographic records used. |
| Worker startup | BullMQ worker started against real Redis; maintenance job processed actual test tasks and notifications. |
| Storage initialization | Private bucket created through S3 API; signed URL download worked, unsigned access returned 403, another account received 404 from the application. |

Initial browser validation exposed a port collision with an existing unrelated application. HOLYAI QA was moved to `http://127.0.0.1:3217`. A task checkbox was updated to reflect a successful action immediately while saving to the server. These were corrected before the final pass.

## Reproduce

Configure a test-only database, Redis, private S3 endpoint and running web/worker processes. Do not run E2E against production data.

```sh
npm ci
npm run db:migrate
npm run storage:init
npm run typecheck
npm run lint
RUN_INFRA_TESTS=true npm test
npm run build
npm start
# Separate process: npm run worker
# Separate terminal, same APP_URL/DATABASE_URL/S3_ENDPOINT environment:
npm run test:e2e
npm audit
```

In PowerShell set `$env:RUN_INFRA_TESTS='true'`. Unit tests ordinarily skip the worker integration check unless explicitly enabled. The upload E2E check skips if no `S3_ENDPOINT` is provided to the test process. The committed CI config provisions database, Redis, S3-compatible storage and worker before checking the app.

## Public navigation revision

The public homepage was shortened and the full capability catalogue, workflow explanation, and privacy information moved to `/features`, `/how-it-works`, and `/privacy`. Three additional Playwright checks passed for real page navigation, all 18 catalogue entries/search/category filters, mobile navigation/current-page labels, and overflow checks at 1440px, 988px, and 390px in light/dark themes. A fresh production build, strict type check and lint check passed for this revision. These are additional to the original four workspace/storage/exam E2E checks above.

## Verification limits

- OpenAI/Anthropic generation, Tavily research, Google login, Resend email delivery and Canva OAuth/import/export were **not exercised against paid or personal accounts**, because their credentials were not supplied. Their adapters compile and validate inputs/outputs, but real account access, scopes, limits and provider behavior still require smoke tests.
- No load test, independent penetration test, full assistive-technology audit, production restore drill or hosted production deployment was performed. Responsive checks covered desktop and 390px mobile width; they do not certify every device.
- No CI completion result is claimed merely because the workflow file exists. GitHub Actions must run after pushing.
- Fixture questions and task records exist only in tests. The shipped UI has no seeded generated answers, citations, job postings, usage statistics or media assets.
- Functional boundaries and unfinished advanced capabilities are itemized in FEATURE_STATUS.md. The full master prompt's production acceptance criteria are not all certified by this initial implementation.
