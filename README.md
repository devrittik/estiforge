# EstiForge

Local-first electrical estimation for independent engineers and small contractors. A signed-in user can save a project, enter point counts and measured lengths, price them from an owned rate book, and export a quotation PDF and CSV. Quantities and money are calculated in code. The language model may only suggest catalogue lines, and only after those lines pass validation.

Civil calculations, cable sizing, and text-to-speech are not part of this version. See `init.md` for the specification and `IMPLEMENTATION_STATUS.md` for what has been verified.

## Status

The electrical workflow below was exercised against a local MongoDB on 18 October 2026. `npx tsc --noEmit` and `npx eslint src tests --max-warnings 0` completed with no errors. `npx vitest run` reported 8 files and 35 tests passed.

No demo video has been recorded, and this repository has not been published.

## Requirements

- Node.js 22 (verified with Node 22.23.2 and npm 12)
- A local MongoDB listening on `127.0.0.1:27017` when `MONGODB_MODE=local`
- Optional: [llama.cpp](https://github.com/ggml-org/llama.cpp) `llama-server` for quantity suggestions
- Optional: whisper.cpp `whisper-server` for speech-to-text

The app still registers, calculates, and exports when the model servers are stopped. Those two actions then tell the user to type the quantities.

## Setup

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the printed value in `.env` as `SESSION_SECRET`. It must be at least 32 characters. `.env` is gitignored. Commit `.env.example` only, and do not put a real session secret, MongoDB URI, or API key in the README or in a screenshot.

```powershell
npm run dev
```

Open http://127.0.0.1:3000. Health is http://127.0.0.1:3000/api/health and reports provider and database mode without secrets.

On macOS or Linux, use `cp .env.example .env` instead of `Copy-Item`.

### Vercel

`.env` is not uploaded. In the Vercel project settings, add the same names as `.env.example`. `SESSION_SECRET` must be at least 32 characters. Use `MONGODB_MODE=atlas` and `MONGODB_ATLAS_URI` there. A `127.0.0.1` MongoDB URI points at the Vercel machine, not your computer.

Set `VOICE_STT_ENABLED=false` on Vercel unless a public whisper.cpp URL is available. Leave `LLM_API_KEY` empty only when `LLM_PROVIDER=local`.

`npm run build` is the Vercel build command. TypeScript, the Tailwind loader, and the React compiler plugin are dependencies so a production install can still compile.

### MongoDB

With `MONGODB_MODE=local`, EstiForge uses only `MONGODB_LOCAL_URI`. A failed local connection is reported as a connection error and is not sent to Atlas. Set `MONGODB_MODE=atlas` and `MONGODB_ATLAS_URI` only when you intend to use Atlas.

The checked local URI is `mongodb://127.0.0.1:27017/estiforge`.

### Quantity suggestions

`LLM_PROVIDER=local` posts to `LLM_BASE_URL` (default `http://127.0.0.1:8080/v1`) using the OpenAI-compatible `/chat/completions` route. Leave `LLM_API_KEY` empty for a local server. A hosted provider requires a key, and that key stays on the server.

Example:

```powershell
llama-server -m .\models\your-model.gguf --port 8080
```

Keep weights in `models/`. That directory, `*.gguf`, and `*.bin` are gitignored.

### Speech-to-text

Set `VOICE_STT_ENABLED=true` and `VOICE_STT_ENGINE=whisper.cpp`. The browser records 16 kHz mono WAV and the server forwards it to `VOICE_STT_URL` (default `http://127.0.0.1:8178`).

```powershell
whisper-server -m .\models\whisper-tiny -l auto --port 8178
```

English, Hindi, Bengali, and mixed-language recordings have not been checked. The estimate page says so. The transcript is editable before it is used.

## Workflow

1. Register at http://127.0.0.1:3000/register. The password needs 8 characters, a letter, a number, and a symbol.
2. Create a project. An empty account shows “No projects yet”.
3. Add rate-book items in nos or m. CSV import and export are on the Rate book page.
4. Create an electrical estimate, enter counts or measured lengths, and calculate. The bill of quantities stores a new version.
5. Create a quotation from that estimate. The snapshot is repriced on the server and does not change when the rate book changes later.
6. Download the quotation PDF and CSV from the quotation page.

An unsigned call to `/api/projects` returns 401. Another account receives 404 for a project it does not own.

Checked path on 18 October 2026: a new account, an empty dashboard, one light-point rate (material 100, labour 25), 10 points, stored total 1250.00, quotation `Q-P7-181104` at 18% tax (subtotal 1250.00, tax 225.00, total 1475.00), CSV containing those amounts, and a PDF beginning with `%PDF-` (`application/pdf`, 1993 bytes). Signing in again still returned the project. With llama-server stopped, extraction returned “The local model could not be reached. Enter the quantities manually.” A transcribe call with no audio returned “Record a clip before transcribing.”

## Scripts

- `npm run dev` — Next.js development server
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run format` — Prettier

## Secret handling

Logs record module, operation, user id, and whether an AI or transcription call was accepted. They do not record passwords, password hashes, `SESSION_SECRET`, MongoDB URIs, API keys, cookies, work descriptions, or audio. Pino censors those fields as `[Redacted]`. The health response contains status, version, provider, database mode, and voice flags only.

## Known limitations

- Speech-to-text languages are unverified.
- Civil methods, cable sizing, protection, earthing, and load certification are refused.
- Text-to-speech is off (`VOICE_TTS_ENABLED=false`).
- No end-to-end demo has been recorded.
- The repository has not been published.
