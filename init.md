# EstiForge — Master Coding Agent Specification

## 1. Project Overview

Build **EstiForge**, a generic AI-assisted engineering estimation platform for independent engineers and small contractors.

The platform converts user requirements into structured estimates, calculations, a Bill of Quantities (BOQ), and professional quotations.

### Primary goal

Deliver a working Electrical estimation MVP for Hacktoberfest Week 2. Civil estimation is a stretch goal.

### Core principles
- Open-weight AI with local inference as the default.
- Optional hosted LLM through environment configuration.
- Local-first privacy and persistent storage.
- Engineering calculations must be deterministic, traceable, and validated.
- Do not invent unsupported formulas, material rates, standards, or engineering results.
- Prefer a small, complete MVP over a large collection of unfinished features.

## 2. Mandatory Technology Stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui and Radix UI
- Lucide React icons
- React Hook Form + Zod
- MongoDB + Mongoose
- Pino structured logging
- llama.cpp `llama-server` for local LLM inference
- OpenAI-compatible hosted LLM API adapter
- `whisper.cpp` + Whisper Tiny multilingual for local STT
- Optional local TTS through a compatible lightweight engine
- Vitest for unit tests
- PDF and CSV export

Do not introduce Express as a separate server unless there is a demonstrated technical need. Use Next.js route handlers for the application API.

## 3. Frontend Design Specification

Create a professional engineering SaaS interface. Use a neutral background, restrained accent colors, readable typography, consistent spacing, responsive layouts, and accessible components.

Centralize theme tokens and support light/dark mode.

### Main application layout

Desktop:
- Left sidebar: navigation
- Top bar: project selector, search, user menu
- Main content: responsive dashboard and data tables

Mobile:
- Collapsible navigation
- Stacked forms and cards
- Horizontally scrollable BOQ tables where needed

### Required pages

#### A. Authentication
- Login
- Registration
- Logout
- Password validation
- Secure session cookies
- Protected project and estimate routes

Use a standard secure authentication implementation. Never store plaintext passwords or expose session secrets.

#### B. Dashboard
Display:
- Total projects
- Recent estimates
- Recent quotations
- Draft and completed status
- Quick action: New Estimate

Include an empty state for first-time users.

#### C. Projects
- Create and edit projects
- Client name and contact details
- Project location
- Engineering discipline
- Project description
- List, search and open saved projects

#### D. New Estimate Wizard

Implement a step-by-step flow:

1. Select discipline.
2. Enter project details.
3. Describe the work in text or use voice input.
4. Let the AI extract structured inputs.
5. Review and correct extracted values.
6. Select calculation methods and required parameters.
7. Generate the BOQ.
8. Review quantities, rates and totals.
9. Save the estimate or generate a quotation.

Do not automatically accept AI-generated inputs without user review.

#### E. Estimate Workspace

Include:
- Project information
- Calculation inputs
- Formula/method reference
- Quantity breakdown
- BOQ table
- Editable quantities and rates
- Validation warnings
- Save and recalculate actions

Clearly distinguish user-entered values, AI-suggested values, and calculated outputs.

#### F. Rate Book

Allow users to:
- Add and edit items
- Set units and material rates
- Set labour rates
- Configure wastage allowances where applicable
- Search and filter items
- Import/export CSV

Do not scrape live prices in the MVP.

#### G. Quotation Builder

Include:
- Business and client details
- Quotation number and date
- Item-wise description, unit, quantity, rate and amount
- Subtotal and configurable adjustments
- Applicable tax configuration
- Exclusions, terms and validity
- PDF export
- CSV BOQ export

Preserve the approved quotation snapshot so future rate changes do not alter historical quotations.

#### H. Settings

Include:
- Profile
- Preferred engineering discipline
- Theme preference
- AI provider status
- Voice input status
- Application version and health information

Provider selection should be environment-driven for the MVP. Never display API secrets.

## 4. AI and Voice Architecture

### Local LLM
Use llama.cpp `llama-server` with an OpenAI-compatible API.

### Hosted LLM
Implement an interchangeable provider adapter selected through environment variables.

The LLM must:
- Interpret natural-language work descriptions
- Extract structured requirements
- Identify missing fields
- Explain supported calculations
- Return validated JSON

The LLM must not:
- Invent engineering standards or material prices
- Silently assume missing dimensions
- Authoritatively calculate final BOQ totals
- Claim an unimplemented engineering capability is supported

### Speech-to-text

Use `whisper.cpp` with a multilingual Whisper Tiny model.

Voice workflow:
1. Capture microphone audio.
2. Send audio to the local STT service.
3. Display the transcript.
4. Allow editing.
5. Send approved text to the estimate workflow.

Test Hindi, English, Bengali and mixed-language speech separately. Support must be based on actual testing, not assumptions.

### Text-to-speech

Optional for the MVP. Add a speech playback button for the estimate summary only after the core estimation workflow works.

Keep STT/TTS model files outside Git.

## 5. Formula Registry and Reference Library

Do not hardcode every possible electrical engineering formula.

Create a modular calculation architecture.

Each registered calculation should define:
- Stable calculation ID
- Name and description
- Discipline and category
- Required input schema
- Units
- Calculation handler or validated template
- Output schema
- Assumptions and limitations
- Reference/source
- Formula or calculation version
- Test cases

### Calculation categories

1. Basic deterministic calculations: implement and test in TypeScript.
2. Configurable parameters: store user-editable rates and allowances in MongoDB.
3. Complex engineering calculations: implement only when the method, inputs, tables and validation requirements are available.
4. Unsupported calculations: explicitly report that they are not supported.

PDF/DOCX engineering references may be maintained as documentation or a future retrieval library. Do not treat a document upload as an executable calculation engine.

For safety-critical calculations, require appropriate engineering validation and clearly show assumptions.

## 6. Electrical MVP

Start with a limited, clearly documented scope:
- Point-based quantity estimation
- Cable and conduit lengths from user-entered routes and specifications
- Switches, sockets, lights, fans and distribution-board item catalogues
- Editable material and labour rates
- Wastage configuration
- BOQ generation
- Quotation generation

Do not claim full electrical design, cable-sizing compliance, protection coordination, earthing design or load certification unless those capabilities have been implemented and validated.

Civil is a separate future module. Keep discipline-specific formulas isolated from shared project, BOQ, rate-book and quotation logic.

## 7. Database Architecture

Support both local MongoDB and MongoDB Atlas through environment variables.

Collections:
- Users
- Projects
- RateItems
- Estimates
- Quotations

Requirements:
- Mongoose schemas
- Zod validation at API boundaries
- Cached MongoDB connection
- Proper indexes
- User ownership and authorization checks
- Persistent saved estimates
- Versioned calculation outputs
- Quotation snapshots
- Clear database connection errors

Never silently switch from local MongoDB to Atlas when a local connection fails.

## 8. Logging and Theme

Use a centralized Pino logger throughout the codebase.

Logs should include:
- Timestamp
- Log level
- Module and operation
- Request ID
- Error details where appropriate

Support DEBUG_LOGS and LOG_LEVEL environment variables.

Never log passwords, API keys, database credentials, or raw customer documents by default.

Centralize design tokens and use them consistently across every page. Avoid hardcoded colors and duplicated UI components.

## 9. Suggested Project Structure

src/
- app/
  - login/
  - register/
  - dashboard/
  - projects/
  - estimates/
  - quotations/
  - rate-book/
  - settings/
  - api/
- components/
  - ui/
  - layout/
  - forms/
  - boq/
  - quotation/
- modules/
  - electrical/
  - civil/
- lib/
  - ai/
  - voice/
  - db/
  - auth/
  - logging/
  - calculations/
  - validation/
  - config/
- types/

tests/

Adjust this structure when appropriate. Avoid unnecessary abstractions and empty placeholder files.

## 10. Environment Variables

Create `.env.example` with:

NODE_ENV=development

LLM_PROVIDER=local
LLM_BASE_URL=http://127.0.0.1:8080/v1
LLM_API_KEY=
LLM_MODEL=your-model-alias

MONGODB_MODE=local
MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/estiforge
MONGODB_ATLAS_URI=

DEBUG_LOGS=true
LOG_LEVEL=debug

VOICE_STT_ENABLED=true
VOICE_STT_ENGINE=whisper.cpp
VOICE_STT_MODEL_PATH=./models/whisper-tiny

VOICE_TTS_ENABLED=false

Validate configuration at startup. Keep secrets server-side and exclude environment files and model weights from version control.

## 11. Ordered Implementation Roadmap

### Phase 1 — Foundation
- Initialize Next.js and TypeScript
- Configure Tailwind and shadcn/ui
- Create centralized theme and logger
- Add environment validation
- Establish linting, formatting and tests

Acceptance: application starts cleanly and the theme and logging work.

### Phase 2 — Authentication and persistence
- Implement registration, login and logout
- Protect application routes
- Configure local/Atlas MongoDB selection
- Create schemas and indexes
- Test persistence and authorization

Acceptance: a user can securely access and save their own project data.

### Phase 3 — Estimation core
- Create Formula Registry
- Implement supported electrical calculations
- Add unit validation
- Implement rate book and pricing engine
- Add calculation tests

Acceptance: supported quantities and totals are correct independently of AI.

### Phase 4 — Frontend workflow
- Build dashboard and project management
- Build estimate wizard
- Build editable BOQ
- Build quotation editor
- Implement PDF and CSV export

Acceptance: the complete manual estimation workflow works.

### Phase 5 — AI integration
- Implement local llama-server adapter
- Add hosted provider adapter
- Extract structured requirements
- Validate AI responses
- Add manual fallback and error handling

Acceptance: AI can populate an estimate draft without controlling authoritative calculations.

### Phase 6 — Voice input
- Integrate whisper.cpp through a local service
- Add microphone UI and transcription
- Allow transcript correction
- Test English, Hindi, Bengali and mixed-language samples

Acceptance: a user can speak a supported description and turn it into an editable estimate draft.

### Phase 7 — Hardening and submission
- Test the full workflow
- Verify local database persistence
- Validate error and empty states
- Check secret handling and logs
- Write README and setup instructions
- Record a 2–3 minute demo
- Publish the repository and challenge submission

Civil calculations and TTS are stretch goals after the required workflow is complete.

## 12. Definition of Done

The MVP is complete when:
- A user can register and log in.
- Projects and estimates persist in MongoDB.
- Local/Atlas selection is environment-driven.
- Local/hosted LLM selection is environment-driven.
- A user can create an Electrical estimate.
- Supported calculations are deterministic and tested.
- The BOQ can be edited and saved.
- A quotation PDF and BOQ CSV can be exported.
- Voice input works through the local STT engine, or its remaining limitation is documented honestly.
- Errors are logged without leaking secrets.
- README instructions enable another developer to reproduce the setup.
- The application has a working end-to-end demonstration.

## 13. Instructions to the Coding Agent

1. Inspect the existing repository before changing files.
2. Identify existing code that can be reused.
3. Implement one phase at a time.
4. Run relevant tests and lint checks after each phase.
5. Do not mark a feature complete until it has been tested.
6. Never fabricate successful commands, test results or integrations.
7. Keep a concise `IMPLEMENTATION_STATUS.md` with completed tasks, current blockers and next steps.
8. Prioritize a working Electrical workflow over optional Civil features or advanced voice functionality.
9. Ask for clarification only when an unresolved decision blocks implementation; otherwise use sensible defaults and document them.
10. Finish with setup instructions, environment configuration, known limitations and exact test results.

**Primary success criterion:** a reliable, privacy-conscious Electrical estimation MVP with local AI, editable BOQ and professional quotation export—not an unfinished all-in-one engineering suite.
