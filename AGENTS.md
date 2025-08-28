# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript app code.
  - `components/`: UI components (PascalCase files, e.g., `AddPromptModal.tsx`).
  - `hooks/`: Reusable state logic (`use*.ts`).
  - `services/`: API/proxy and model services (e.g., `llmService.ts`, `proxyApiService.ts`).
  - `utils/`: Evaluation, metrics, and export helpers.
  - `types/`, `constants/`: Shared types and constants.
- `data/datasets/`: Sample datasets and docs.
- Tooling: `vite.config.ts`, `tsconfig.json`, `.env.local` (untracked), `package.json` scripts.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server with API proxies (`/api/anthropic`, `/api/openai`, `/api/google`).
- `npm run build`: Type-check then build production bundle.
- `npm run preview`: Serve the built app locally.
- `npm run lint`: Run ESLint on `ts/tsx` sources.

Quick start:
- `cp .env.local.example .env.local` and set API keys.
- `npm install` then `npm run dev`.

## Coding Style & Naming Conventions
- Language: TypeScript, React functional components, hooks for state.
- Indentation: 2 spaces; use semicolons; prefer `const`.
- Files: components in PascalCase (`ComponentName.tsx`), hooks `useX.ts`, utilities/services `camelCase.ts`.
- Types: colocate in `types/` or near usage; enable strict typing.
- Linting: ESLint (`@typescript-eslint`); fix warnings before committing (`npm run lint`).

## Testing Guidelines
- Current status: No test runner configured in `package.json`.
- Manual verification: run `npm run dev` and validate flows (upload datasets, run evaluation, inspect results/export).
- If adding tests: place beside sources as `*.test.ts(x)` and consider Vitest + React Testing Library.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject (e.g., "Add persistent storage for results"). Group related changes.
- PRs: include purpose, screenshots for UI, steps to reproduce, and environment notes (models, dataset). Link issues.
- Checks: PRs should pass build and lint. Avoid committing secrets or large datasets.

## Security & Configuration Tips
- Secrets: keep API keys in `.env.local`; never commit them. Proxies read from env in dev via Vite.
- Data: verify datasets contain no sensitive information; prefer small, anonymized samples for docs.
