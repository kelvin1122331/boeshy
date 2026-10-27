# Architecture and milestones

## Design

HOLYAI uses a single Next.js application and a separate long-running worker. Route pages are real App Router entries. Shared controls and editor primitives provide a consistent system; chat, academic search, exams, media canvas, slides, comparison tables, rubric feedback, career results, and task views use domain-specific interfaces.

Requests pass through session validation, origin checks for mutations, Zod validation and ownership-scoped queries. A client-supplied project, conversation, file, exam, attempt or item ID is never sufficient authorization. Non-admin access to the admin UI returns not-found; the admin API independently returns forbidden.

Domain services live under `features/` and `server/services/`. Typed JSON payloads preserve the shape of evolving generated documents without creating dozens of nearly identical tables. Persistent entities requiring relational integrity—sessions, projects, files, messages, jobs, assets, exams, questions, attempts, answers, tasks and notifications—have dedicated models. Document edits write the old JSON to a version table before updating the current item.

## Workflows

- **Chat:** persist user message → bound history and attachment context → provider stream → SSE deltas → persist final/partial assistant response. A Redis lease blocks concurrent generation within a conversation.
- **Documents:** collect brief and private source files → queue job → extract/bound source context → generate outline → user reviews and edits → request expanded draft → autosave/version → valid binary export.
- **Study:** parse material → schema-validated five-option questions → private server-side keys → timestamped attempt → serialize answer updates and submit using row locks → calculate grade on server → expose review only after submit. Practice mode can return immediate feedback. Retry creates a new practice exam from incorrect/unanswered questions.
- **Research:** generate focused search questions → retrieve real Tavily excerpts → deduplicate → synthesize with numbered source IDs → store source URLs beside report. Search excerpts are not represented as full-page retrieval.
- **Academic:** Crossref query → validate metadata → keep missing fields explicit → source links/citation drafts → save search. No model creates bibliographic metadata.
- **Image/video:** provider request → private S3 object → asset row → completed notification. Video jobs poll asynchronously every 15 seconds; a pending provider job never produces a completed UI.
- **Tasks:** user-authored or AI-suggested candidate → user confirmation in editor → CRUD → list/kanban/calendar → minute-based worker notification for upcoming due dates.
- **Canva:** PKCE + one-use database state tied to logged-in owner → encrypted access/refresh tokens → upload internal PPTX to private S3 → official URL import job → poll owner-scoped job → optional official export job. No blank Canva design is represented as a generated slide deck.

## Milestones delivered in source

1. Foundation: design system, auth, schema/migration, dashboard, 18 routes, projects, settings, storage.
2. Core AI: streaming chat, provider selection, capability flags, image/video jobs, usage records.
3. Research/learning: Crossref, web research, notes, secure exams and grading, journal matrix.
4. Creative/academic: slides/PPTX, books/EPUB, academic documents, writing tools, Canva OAuth/import/export adapter.
5. Academic intelligence: defense question/answer feedback, methodology review, rubric scoring, originality/style review.
6. Productivity/career: tasks and reminders, sourced Arbeitnow jobs, notifications, saved history.
7. QA: strict types, lint, export/file/grading unit tests, browser and API E2E, responsive checks, dependency audit, CI.

## Remaining operational work

Milestones describe the implemented source, not a claim that paid integrations were exercised. Credentials, real infrastructure, provider contract tests, capacity testing and a production security review remain prerequisites for public operation. See FEATURE_STATUS and VALIDATION for specific gaps.
