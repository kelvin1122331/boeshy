# Feature status and limitations

All 18 features have dedicated routes, validated requests, persistent output/history where applicable, and explicit configuration states. No integration result is mocked in the shipped application.

| Feature | Implemented workflow | Requires / boundaries |
|---|---|---|
| AI Chat | Streaming OpenAI/Anthropic, model choice, history, rename/delete/edit, regeneration, attachments, Markdown/tables/code/math, optional web sources | AI key; Redis for request limits/stream lease; S3 for files. Voice input is not implemented. Attachments are bounded to 60k characters of conversation context; older messages are limited to the latest 30. |
| Image Generator | Text-to-image worker, style presets, supported ratios, private gallery/history, original-file download | OpenAI image access, S3, Redis/worker. Image editing, image-to-image, negative prompt and extra ratios are not exposed. |
| Video Generator | Official provider create/retrieve/download, asynchronous polling, actual queued/processing/failed/completed states | OpenAI video access, S3, Redis/worker. No fabricated percentage progress. Initial-frame upload and in-progress cancellation are not implemented. |
| Presentation Studio | Brief → outline → reviewed draft, slide navigator, editable slide bullets and notes, valid PPTX/PDF/DOCX export | Text key. Canva OAuth PKCE, URL import and async export adapters require configured OAuth app and permitted scopes; no live account was connected during implementation. Template browsing/autofill is not implemented. |
| Deep Search | Search planning, multi-query retrieval, deduplication, source list, structured cited report, date filter | Tavily + text key + worker. Uses returned search excerpts, not unrestricted full-page extraction or social media scraping. Domain credibility is explicitly not independently verified. |
| Book Creator | Concept/TOC outline, review, chapter drafts, per-section editor, version history, DOCX/PDF/EPUB | Text key + worker. Single generation has token/output limits; long books need chapter-by-chapter extension. Cover generation is available through the separate Image Generator, not an automatic book-cover step. |
| Academic Research | Crossref metadata search/year/license filters, DOI links, saved searches, citation drafts | Public internet + Redis rate limit. OpenAlex/Semantic Scholar/PubMed and automatic research-gap analysis are not implemented. Citation drafts lack full volume/issue/page handling and require source verification. |
| Auto Note-Taker | PDF/DOCX/TXT/image material, summary depth, source page markers, structured notes/flashcards through AI, editable export | Text key + worker + S3. PDF OCR is not provided; unreadable pages produce warnings. Image OCR uses configured OpenAI vision. Original file download is in the library; embedded full-PDF split-view reader is not implemented. |
| Paraphrase & Tone | Original text and revised structured result, tone selection, explanations, editable result | Text key + worker. No plagiarism-clearance claim. Fine-grained word-diff highlights and accept/reject per suggestion are not implemented. |
| Study with AI | Material/configuration, ABCDE questions, one best answer schema, optional timer, shuffling, saved answers, server grading, topic accuracy, review, retry incorrect, history | Text key for generating real exams; core attempt/grading works without another model call. Generation count is checked. Learning recommendations derive from incorrect topics and are not a separate AI diagnosis. |
| Academic Document | Type-specific outline/draft prompts, missing-data labels, section editor, versions, valid export | Text key + worker. Markdown editing/preview rather than a full WYSIWYG academic typesetting system; advanced automatic TOC/citation fields are not implemented. |
| Task Manager | Add/edit/delete, category, priority, deadlines, completion, list/kanban/calendar, AI extraction with confirmation, actual worker notifications | Base CRUD needs database only; AI extraction needs text key + Redis. Time display/input uses device timezone; user timezone is stored for AI extraction. Google Calendar sync is not implemented. |
| Defense Simulator | Material/topic, session question, submitted answer evaluation, transparent criterion scores and stronger-answer structure after answering | Text key + worker. Text only, no audio assessment, speech recognition or emotion inference. |
| Career Matcher | Real Arbeitnow jobs, location/remote filter, source URL, AI skills match, gaps and eligibility notes | Public source + text key + worker. Coverage mainly European tech jobs; no global job-board aggregation or automated applications. |
| Journal Matrix | 2–20 source documents, evidence-linked extracted fields, missing-data labels, editable/filterable/sortable table, XLSX/PDF/DOCX | Text key + worker + private storage. Long inputs are summarized in chunks, so extraction requires source review. |
| Methodology Checker | Context-grounded strengths, weaknesses, missing components, methods alignment, bias/ethics and improvement questions | Text key + worker. An advisory review, not scientific certification. |
| Rubric Assessment | Explicit rubric input, extracted criteria, normalized weights validated to 100, evidence/reasons, weighted score, spreadsheet export | Text key + worker. Score is an estimate; rubric must be supplied as text, not inferred silently from arbitrary second-file order. |
| Originality Review | Citation/attribution review, repeated phrases, clarity and academic style suggestions | Text key + worker. No comparison database or exhaustive similarity scan; no plagiarism percentage. |

## Shared boundaries

- Accounts use Better Auth. Email verification/recovery require real mail delivery. Google login is optional and not exercised without credentials.
- Admin sees users, jobs, usage and configuration flags. Provider secrets and default models are changed through deployment environment, not a database secret-editing UI. Role elevation is an administrator database operation.
- Uploads go through the authenticated server for validation; browser-direct signed uploads, antivirus scanning and full content-disarm/reconstruction are not implemented. Downloads use short-lived signed URLs. Limit: 10 MB/file and 200 MB/account; database and reverse-proxy limits must also be enforced in deployment.
- PostgreSQL migrations include ownership indexes and cascades. Large-scale load, row-level security policies, distributed auth throttling and long-running-worker recovery under every crash condition have not been certified.
- Task reminders are in-app notifications from the worker. They do not send email or push notifications.
- The interface defaults to Indonesian. English can be selected for generated documents and stored as AI language preference; complete English UI translation is not implemented.
- PDF embeds Noto Sans. It covers Latin/Indonesian text; complex mathematical layout, CJK glyph coverage and perfect Markdown typesetting are not guaranteed in exports.
- Source authenticity is preserved; models can still misinterpret evidence. Users must review outputs and sources.

These boundaries are documented instead of labelling unsupported integrations as working.
