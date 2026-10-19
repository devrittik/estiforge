# Implementation status

## Completed

- Phase 1 foundation
  - Next.js App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, Vitest
  - shadcn/ui with the Radix Nova preset and centralized CSS theme tokens
  - Light, dark, and system theme through `next-themes`
  - Pino logger with timestamp, level, module, operation, request id, and secret redaction
  - Zod environment validation, including local versus Atlas and local versus hosted selection
  - Health route that reports provider status without secrets
  - `.env.example`
- Phase 2 authentication and persistence
  - Registration, login, and logout with bcrypt password hashes and an httpOnly session cookie
  - Proxy redirects for protected pages, plus 401 responses on project and estimate APIs
  - Cached Mongoose connection that uses only the database selected by `MONGODB_MODE`
  - User, project, rate item, estimate, and quotation schemas with indexes
  - Owned projects, estimate drafts with a versioned calculation record, and quotation snapshots
- Phase 3 estimation core
  - Versioned formula registry for point quantities, route lengths, BOQ line prices, and quotation totals
  - Electrical catalogue for lights, fans, switches, sockets, distribution boards, cable, and conduit
  - Integer minor-unit pricing with explicit wastage and half-away-from-zero rounding
  - Owned rate book with search, edit, and CSV import/export
  - Estimate calculation that stores a new versioned output and refuses unsupported methods
- Phase 4 manual workflow
  - Estimate workspace for point counts, measured lengths, rate overrides, and recalculation
  - Editable bill of quantities with method, trace, and totals
  - Quotation editor that stores a repriced snapshot
  - PDF and CSV export of the saved snapshot
- Phase 5 AI extraction
  - OpenAI-compatible adapter for the local llama-server and an optional hosted provider
  - Zod validation of suggested catalogue lines, with one retry and a manual fallback
  - Review step that copies suggested counts into the estimate without calculating totals
- Phase 6 voice input
  - Browser recording saved as 16 kHz mono WAV
  - Local whisper.cpp HTTP service at `VOICE_STT_URL`, one transcription at a time
  - Editable transcript placed in the work description before any suggestion or calculation

- Phase 7 hardening
  - Full workflow checked over HTTP against local MongoDB: register, empty dashboard, project, rate, estimate, calculate, quotation, CSV, and PDF
  - A second sign-in still loaded the owned project. Another account received 404. An unsigned project list received 401
  - Stopped llama-server and a missing recording returned the manual-entry messages
  - Dev-server logs for that walk contained ids and status only: no password, URI, description, or audio
  - README setup covers Node 22, `.env.example`, `SESSION_SECRET`, MongoDB, llama-server, and whisper-server
  - `npx tsc --noEmit` and `npx eslint src tests --max-warnings 0` passed
  - `npx vitest run`: 8 files, 35 tests passed

## Current blockers

- English, Hindi, Bengali, and mixed-language speech have not been verified with real recordings.
- Suggestions need a model at `LLM_BASE_URL`. Transcription needs whisper-server at `VOICE_STT_URL`.
- Civil calculations, cable sizing, protection, earthing, and load certification are intentionally unsupported.
- No 2–3 minute demo has been recorded.
- The repository and challenge submission have not been published.

## Next steps

- Record the demo and publish only when asked.
