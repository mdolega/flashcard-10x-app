# Flashcards AI  
*(Fiszki AI)*

A web application for AI-assisted generation, creation, and management of educational flashcards, with integrated spaced-repetition scheduling (SM-2), Markdown support, and user authentication.

---

## Table of Contents

1. [Tech Stack](#tech-stack)  
2. [Getting Started Locally](#getting-started-locally)  
3. [Available Scripts](#available-scripts)  
4. [Testing](#testing)  
5. [Project Scope](#project-scope)  
6. [Project Status](#project-status)  
7. [License](#license)  

---

## Tech Stack

- **Frontend**
  - Astro 5
  - React 19
  - TypeScript 5
  - Tailwind 4
  - Shadcn/ui
- **Backend**
  - Supabase (PostgreSQL + `@supabase/supabase-js`)
- **AI Integration**
  - Openrouter.ai (access via `openrouter.service.ts`)
- **CI/CD & Hosting**
  - GitHub Actions (tests + production build)
  - Docker on DigitalOcean
- **Runtime**
  - Node.js v22.x (recommended v22.14.0)

---

## Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v22.x (use nvm: `nvm use`)  
- A Supabase project with credentials:  
  - `SUPABASE_URL`  
  - `SUPABASE_KEY`  
- An Openrouter.ai API key: `OPENROUTER_API_KEY`  
- (Optional) Environment settings:  
  - `MAX_FLASHCARDS` (default: 20)  
  - `RETRY_ATTEMPTS` for AI calls  
- Create a `.env` file in the project root:

  ```bash
  SUPABASE_URL=<your_supabase_url>
  SUPABASE_KEY=<your_supabase_anon_key>
  OPENROUTER_API_KEY=<your_openrouter_api_key>
  MAX_FLASHCARDS=20
  RETRY_ATTEMPTS=3
  ```

### Installation & Run

```bash
git clone https://github.com/<your-username>/flashcard-10x-app.git
cd flashcard-10x-app
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Available Scripts

- `npm run dev`  
  Start Astro development server with live reload.

- `npm run build`  
  Build the production site to `dist/`.

- `npm run preview`  
  Preview the production build locally.

- `npm run astro`  
  Run Astro CLI.

- `npm run lint`  
  Run ESLint on all `.ts`, `.tsx`, and `.astro` files.

- `npm run lint:fix`  
  Auto-fix lint errors.

- `npm run format`  
  Format files with Prettier.

- `npm test`  
  Run unit tests once with Vitest.

- `npm run test:watch`  
  Run tests in watch mode.

- `npm run coverage`  
  Generate coverage report (v8 provider).

---

## Project Structure

Source code lives under `src/` and follows a simple, predictable layout:

```
src/
  assets/               # static internal assets (if any)
  components/           # UI components (Astro static + React dynamic)
    ui/                 # Shadcn/ui components
  db/                   # Supabase clients and types
  layouts/              # Astro layouts
  lib/                  # Services and helpers
    schemas/            # Validation schemas
    services/           # Domain services (AI, SRS, flashcards)
  middleware/           # Astro middleware
  pages/                # Astro pages and API routes
    api/                # API endpoints
  styles/               # Global styles
  test/                 # Test setup utilities
  types.ts              # Shared types
```

Additional top-level directories/files:

- `public/` - public assets
- `supabase/` - local configuration and SQL migrations
- `.github/workflows/ci.yml` - CI pipeline (tests + build)

---

## Testing

This project follows a multi-layer testing strategy (see `.ai/test-plan.md`).

- **Unit Testing**: business logic, schemas, utilities, React components
  - Tools: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `happy-dom`
- **Integration Testing**: module interactions and external services
  - Tools: `MSW`, `@supabase/supabase-js` mocks, Supabase Local, `Testcontainers`, `Nock`, `@astrojs/test-utils`
- **Functional/E2E Testing**: end-to-end user scenarios (planned)
  - Tools: `Playwright`, `Cucumber`
- **Coverage**: `v8`/`c8`

Vitest is configured in `vitest.config.ts` with:

- `happy-dom` environment
- global assertions
- setup file: `src/test/setup.ts`
- alias: `@` -> `./src`

Run tests:

```bash
npm test           # run once
npm run test:watch # watch mode
npm run coverage   # coverage report (./coverage)
```

---

## CI

GitHub Actions pipeline runs on pushes and PRs to `master` in `.github/workflows/ci.yml`:

- Install dependencies with `npm ci` (Node 22.x; npm cache enabled)
- Run unit tests with `npm test`
- Build production bundle with `npm run build`
- Upload the `dist/` artifact

---

## Project Scope

### Core Features

- **User Authentication**  
  - Register, login (email/password)  
  - JWT-based auth, change password, delete account  

- **AI-Powered Flashcard Generation**  
  - Input text (500–10 000 chars), choose 1–20 cards  
  - Receive Markdown-formatted Q&A pairs  

- **Manual Flashcard CRUD**  
  - Create, edit (Markdown), delete flashcards  
  - Status transitions (e.g. “edited”)  

- **Flashcard Management**  
  - List and filter by status & difficulty  
  - Accept or reject AI-generated cards  

- **SRS Scheduling**  
  - SM-2 algorithm integration for review scheduling  

- **Additional**  
  - Difficulty tagging (easy/medium/hard)  
  - Detailed AI prompt logging  

### Boundaries (MVP)

- No file imports (PDF, DOCX)  
- No sharing between users  
- No mobile app  
- No undo or bulk restore  
- No email-based password reset  
- Basic SRS only (no custom algorithm)

---

## Project Status

🚧 **In Development (MVP)**  
This project is under active development. Core features are being built and tested. Contributions and feedback are welcome!

---

## License

**No license specified.**  
Please add a `LICENSE` file to this repository to define usage and distribution terms.