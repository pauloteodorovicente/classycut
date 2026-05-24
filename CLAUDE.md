# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Language Preferences

Always respond to the user in Brazilian Portuguese (pt-BR).
Keep all code, variable names, function names, code comments, and technical prompts in English.

# AIOX Workflow Rules

**Regra absoluta:** O fluxo AIOX SEMPRE deve ser seguido, mesmo que o usuário não mencione explicitamente. Toda solicitação de desenvolvimento passa pelo pipeline correto de agentes.

**Roteamento de agentes:**
- Se o usuário falar diretamente com o agente errado, passe o bastão para o agente correto e avise o usuário com: "Passando para @{agente} que é o responsável por isso."
- Nunca execute trabalho que pertence a outro agente sem avisar e delegar.

**Papel do Orion (aiox-master) — Coordenador, não executor:**
- Orion não implementa código, não cria stories, não faz push. Orion **coordena**.
- A cada handoff entre agentes, Orion DEVE informar o usuário: o que foi feito, para qual agente foi passado, e o que o próximo agente vai fazer.
- Formato padrão de atualização: "✅ [{agente-anterior}] concluiu {tarefa}. 🔄 Passando para [{próximo-agente}] para {próxima-tarefa}."
- Nunca avance para o próximo passo sem informar o usuário.

**Pipeline padrão (Story Development Cycle):**
@sm cria story → @po valida → @dev implementa → @qa revisa → @devops faz push

# Model Selection

At the start of each conversation, assess the task complexity and proactively recommend
the most appropriate model before proceeding:

* Simple tasks (file management, renaming, search, Q\&A): suggest `haiku` → /model haiku
* Everyday development (writing code, refactoring, debugging): `sonnet` is fine (default)
* Complex reasoning (system architecture, hard bugs, deep analysis): suggest `opus` → /model opus

Always remind the user if the current model seems over or under-qualified for the task at hand.

# currentDate

Today's date is 2026-03-13.

## Build \& Development Commands

### Frontend (React 19 + TypeScript + Vite)

```bash
cd frontend
npm install              # install dependencies
npm run dev              # dev server at localhost:5173 (HMR)
npm run build            # tsc type-check + vite production build → dist/
npm run lint             # ESLint
npm run preview          # preview production build
```

### Backend (Python 3.12+ / FastAPI)

```bash
cd backend
pip install -r requirements.txt   # install dependencies
uvicorn app.main:app --reload     # dev server at localhost:8000
pytest                            # run tests
pytest tests/test\_foo.py -k "test\_name"  # run single test
ruff check .                      # linting
ruff format .                     # formatting
alembic upgrade head              # run database migrations
```

### Storage

SQLite database and uploaded files live in `/storage/`. The DB file (`classycut.db`) and upload directories are gitignored.

## Architecture Overview

**ClassyCut** is a web-based video editor with a Python backend and React frontend.

### Monorepo Layout

* `frontend/` — React 19 SPA (Vite, TypeScript 5.9, Tailwind CSS 4)
* `backend/` — FastAPI REST API (SQLAlchemy, Alembic, FFmpeg)
* `storage/` — runtime data (uploads, projects, exports, SQLite DB)

### Frontend Architecture

**Routing:** React Router DOM — HomePage (`/`) lists projects; EditorPage (`/editor/:projectId`) is the main editor with player, timeline, and tool panels.

**State management:** Zustand (4 stores):

* `projectStore` — selected media tracking
* `playerStore` — playback state (time, volume, playing)
* `silenceStore` — detected silence segments, thresholds, job IDs
* `uiStore` — active tool, sidebar state

**Server state:** TanStack React Query for data fetching, caching, and invalidation.

**API client:** Axios with base URL proxy (`/api` → `localhost:8000` in dev via Vite config).

**Styling:** Tailwind CSS with dark theme using CSS custom properties defined in `src/index.css`.

### Backend Architecture

**Entry point:** `app/main.py` — FastAPI app factory with CORS middleware (allows `localhost:5173`).

**Layers:**

* `api/` — route handlers (projects, media, jobs, silence)
* `models/` — SQLAlchemy ORM (Project → MediaFile, Job with cascade delete)
* `schemas/` — Pydantic request/response models
* `services/` — file handling utilities
* `core/ffmpeg.py` — all FFmpeg operations (probe, metadata extraction, merge, silence detection, segment cutting)
* `tasks/` — background job execution

**Database:** SQLite via SQLAlchemy. Three models: Project, MediaFile, Job. Migrations managed by Alembic.

**Background jobs:** Long-running FFmpeg operations (merge, silence detection, silence cutting) run as background tasks. Frontend polls job status via `/jobs/{id}`.

**Media streaming:** Supports HTTP range requests for video seeking (`GET /media/{id}/stream`).

### API Routes (prefix: /api/v1)

* Projects CRUD: `POST/GET /projects`, `GET/PATCH/DELETE /projects/{id}`
* Media: `POST /projects/{id}/media` (upload), `GET /projects/{id}/media`, `GET /media/{id}/stream`, `DELETE /media/{id}`
* Processing: `POST /projects/{id}/merge`, `POST /projects/{id}/silence-detect`, `POST /projects/{id}/silence-cut`
* Jobs: `GET /jobs`, `GET /jobs/{id}`
* Health: `GET /api/health`

### Key Patterns

* Frontend uses polling (React Query `refetchInterval`) to track background job progress
* FFmpeg is the core engine for all media processing; paths are configurable via `backend/app/config.py`
* Max upload size: 2GB (configured in backend settings)
* UI text is in pt-BR; all code identifiers and comments are in English

