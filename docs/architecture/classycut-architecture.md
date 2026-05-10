# ClassyCut — Documento de Arquitetura

**Version:** 1.0
**Date:** 2026-05-10
**Author:** Orion (AIOX Master) — retroactive documentation
**Status:** Approved

---

## 1. Visao Geral da Arquitetura

ClassyCut e uma aplicacao web com arquitetura cliente-servidor classica. O frontend e uma SPA (Single Page Application) em React que se comunica com um backend FastAPI via HTTP REST.

```
+------------------+        HTTP/REST        +-------------------+
|   Browser (SPA)  | <---------------------> |  FastAPI Backend  |
|   React 19       |    /api/v1/*            |  Python 3.12      |
|   TypeScript     |                         |                   |
|   Tailwind CSS   |                         |  SQLAlchemy ORM   |
|   Zustand        |                         |  SQLite (dev)     |
|   React Query    |                         |  PostgreSQL (prod)|
+------------------+                         |                   |
                                             |  FFmpeg (jobs)    |
                                             |  faster-whisper   |
                                             +-------------------+
                                                     |
                                             +-------------------+
                                             |  File Storage     |
                                             |  /storage/        |
                                             |  uploads/         |
                                             |  exports/         |
                                             |  temp/            |
                                             +-------------------+
```

---

## 2. Frontend

### 2.1 Stack

| Tecnologia | Versao | Funcao |
|-----------|--------|--------|
| React | 19.x | Framework UI |
| TypeScript | 5.9 | Type safety |
| Vite | 8.x | Build tool + dev server |
| Tailwind CSS | 4.x | Estilos (utility-first) |
| Zustand | 5.x | Estado global (client-side) |
| TanStack React Query | 5.x | Server state + cache + polling |
| React Router DOM | 7.x | Roteamento SPA |
| Axios | 1.x | Cliente HTTP |
| lucide-react | latest | Icones |
| react-dropzone | 15.x | Upload drag-and-drop |
| react-hot-toast | 2.x | Notificacoes |

### 2.2 Estrutura de Diretorios

```
frontend/src/
├── api/                  # Clientes HTTP por dominio
│   ├── client.ts         # Instancia Axios com baseURL
│   ├── projects.ts       # CRUD de projetos
│   ├── media.ts          # Upload, listagem, streaming
│   ├── silence.ts        # Deteccao e corte de silencio
│   ├── transcription.ts  # Transcricao e legendas
│   ├── export.ts         # Exportacao por plataforma
│   ├── zoom.ts           # Efeitos de zoom
│   ├── ai.ts             # Highlights, capitulos, resumo
│   ├── batch.ts          # Batch export e upscale
│   └── jobs.ts           # Polling de status de jobs
│
├── components/           # Componentes reutilizaveis
│   ├── layout/           # AppShell, ToolTabs, Sidebar
│   ├── player/           # VideoPlayer
│   ├── timeline/         # Timeline
│   ├── tools/            # Uma tool por feature
│   │   ├── MergeTool.tsx
│   │   ├── SilenceTool.tsx
│   │   ├── TranscriptionTool.tsx
│   │   ├── ExportTool.tsx
│   │   ├── ZoomTool.tsx
│   │   ├── AITool.tsx
│   │   └── BatchTool.tsx
│   └── shared/           # FileDropzone, etc.
│
├── pages/                # Paginas (rotas)
│   ├── HomePage.tsx      # Lista de projetos
│   └── EditorPage.tsx    # Editor principal
│
├── stores/               # Estado Zustand
│   ├── projectStore.ts   # Midia selecionada
│   ├── playerStore.ts    # Estado do player
│   ├── silenceStore.ts   # Segmentos de silencio
│   ├── uiStore.ts        # Tool ativa, sidebar
│   ├── transcriptionStore.ts
│   ├── zoomStore.ts
│   ├── exportStore.ts
│   ├── aiStore.ts
│   └── batchStore.ts
│
└── types/                # Tipos TypeScript por dominio
```

### 2.3 Gestao de Estado

O frontend usa dois sistemas de estado complementares:

**Zustand (estado local/sessao):**
- `projectStore` — qual midia esta selecionada
- `playerStore` — tempo atual, volume, reproducao
- `silenceStore` — segmentos detectados, configuracoes
- `uiStore` — qual tool esta ativa no painel

**TanStack React Query (estado do servidor):**
- Cache de dados da API com invalidacao automatica
- Polling de jobs em background via `refetchInterval`
- Mutations com `onSuccess` para invalidar queries relacionadas

### 2.4 Padrao de Polling para Jobs

Jobs longos (FFmpeg, transcricao) seguem este fluxo:

```
1. Mutation POST /api/v1/projects/{id}/silence-detect
   → Retorna { job_id, status: "queued" }

2. Query GET /api/v1/jobs/{job_id}
   → refetchInterval: 2000ms
   → Para quando status == "done" | "error"

3. onSuccess → invalidateQueries(['media', projectId])
   → Lista de midia atualizada com novo arquivo
```

### 2.5 Roteamento

```
/                     → HomePage (lista de projetos)
/editor/:projectId    → EditorPage (editor completo)
```

---

## 3. Backend

### 3.1 Stack

| Tecnologia | Versao | Funcao |
|-----------|--------|--------|
| Python | 3.12+ | Linguagem |
| FastAPI | 0.115+ | Framework web REST |
| Uvicorn | 0.32+ | ASGI server |
| SQLAlchemy | 2.x | ORM |
| Alembic | 1.14+ | Migracoes de banco |
| Pydantic | 2.x | Validacao de dados |
| pydantic-settings | 2.x | Configuracao via env vars |
| ffmpeg-python | 0.2+ | Wrapper FFmpeg (probe) |
| faster-whisper | 1.1+ | Transcricao IA local |

### 3.2 Estrutura de Diretorios

```
backend/app/
├── main.py               # FastAPI factory + registro de routers
├── config.py             # Settings (pydantic-settings, env vars)
├── database.py           # Engine SQLAlchemy + SessionLocal
│
├── api/                  # Routers (handlers HTTP)
│   ├── deps.py           # DbSession (dependency injection)
│   ├── projects.py       # CRUD /projects
│   ├── media.py          # Upload, stream, delete /media
│   ├── jobs.py           # Status /jobs
│   ├── silence.py        # Deteccao e corte
│   ├── transcription.py  # Transcricao e legendas
│   ├── export.py         # Exportacao por preset
│   ├── zoom.py           # Efeitos de zoom
│   ├── ai.py             # Highlights, capitulos, resumo
│   └── batch.py          # Batch export e upscale
│
├── models/               # ORM SQLAlchemy
│   ├── project.py        # Project
│   ├── media.py          # MediaFile
│   └── job.py            # Job
│
├── schemas/              # Pydantic (request/response)
│   ├── silence.py
│   ├── transcription.py
│   ├── export.py
│   ├── zoom.py
│   ├── ai.py
│   └── batch.py
│
├── core/                 # Logica de processamento
│   ├── ffmpeg.py         # Probe, merge, silence detect, cut
│   ├── transcription.py  # faster-whisper wrapper
│   ├── export.py         # Presets de exportacao
│   ├── zoom.py           # Logica de keyframes e filtros FFmpeg
│   ├── highlights.py     # Analise de energia de audio
│   ├── chapters.py       # Geracao de capitulos e resumo
│   └── upscale.py        # FFmpeg lanczos + Real-ESRGAN
│
├── tasks/                # Background task runners
├── services/             # Utilitarios de arquivo
├── utils/                # Utilitarios gerais
└── alembic/              # Migracoes de banco
```

### 3.3 Modelos de Dados

```
Project
  id          UUID (PK)
  name        String
  created_at  DateTime
  updated_at  DateTime
  ↓ 1:N
  MediaFile
    id            UUID (PK)
    project_id    UUID (FK → Project)
    filename      String
    file_path     String
    media_type    String (video|audio)
    duration_ms   Integer
    width         Integer (nullable)
    height        Integer (nullable)
    fps           Float (nullable)
    codec         String (nullable)
    file_size     Integer
    has_audio     Boolean
    created_at    DateTime

  Job
    id              UUID (PK)
    project_id      UUID (FK → Project)
    job_type        String (silence_detect|silence_cut|merge|transcribe|
                           export|zoom|highlights|chapters|summary|
                           batch_export|upscale)
    status          String (queued|processing|done|error)
    progress        Float (0.0 a 1.0)
    params_json     JSON
    result_json     JSON
    error_message   String (nullable)
    created_at      DateTime
    started_at      DateTime (nullable)
    completed_at    DateTime (nullable)
```

### 3.4 Rotas da API

**Prefixo:** `/api/v1`

```
Projects
  POST   /projects                         criar projeto
  GET    /projects                         listar projetos
  GET    /projects/{id}                    buscar projeto
  PATCH  /projects/{id}                    atualizar projeto
  DELETE /projects/{id}                    deletar projeto

Media
  POST   /projects/{id}/media              upload de midia
  GET    /projects/{id}/media              listar midia do projeto
  GET    /media/{id}/stream                streaming com range requests
  DELETE /media/{id}                       remover midia

Jobs
  GET    /jobs                             listar jobs
  GET    /jobs/{id}                        status de job especifico

Silence
  POST   /projects/{id}/silence-detect     detectar silencio (async)
  POST   /projects/{id}/silence-cut        cortar silencio (async)

Transcription
  POST   /projects/{id}/transcribe         transcrever audio (async)
  GET    /projects/{id}/transcription/{id}/srt    download SRT
  GET    /projects/{id}/transcription/{id}/vtt    download VTT

Export
  POST   /projects/{id}/export             exportar video (async)

Zoom
  POST   /projects/{id}/zoom               aplicar zoom (async)

AI
  POST   /projects/{id}/highlights         detectar highlights (async)
  POST   /projects/{id}/chapters           gerar capitulos (async)
  POST   /projects/{id}/summary            gerar resumo (async)

Batch
  POST   /projects/{id}/batch-export       exportar em lote (async)
  POST   /projects/{id}/upscale            upscale de video (async)

Health
  GET    /api/health                       status do servidor
```

### 3.5 Padrao de Jobs Assincronos

Todas as operacoes pesadas (FFmpeg, transcricao) seguem este padrao:

```python
# 1. Handler cria Job no DB com status "queued"
# 2. Handler adiciona background_task
# 3. Handler retorna { job_id, status: "queued" } imediatamente (202)

# Background task:
# 4. Atualiza Job.status = "processing"
# 5. Executa operacao (FFmpeg/whisper)
# 6. Em caso de sucesso: Job.status = "done", Job.result_json = {...}
# 7. Em caso de erro: Job.status = "error", Job.error_message = str(e)
```

**Limitacao atual:** FastAPI BackgroundTasks nao persiste entre reinicios do servidor. Jobs em andamento sao perdidos se o servidor for reiniciado.

**Solucao para producao:** Migrar para Celery + Redis.

---

## 4. Configuracao

### 4.1 Variaveis de Ambiente (Backend)

| Variavel | Padrao | Descricao |
|---------|--------|-----------|
| CLASSYCUT_APP_NAME | ClassyCut | Nome da aplicacao |
| CLASSYCUT_DEBUG | true | Modo debug |
| CLASSYCUT_DATABASE_URL | sqlite:///... | URL do banco de dados |
| CLASSYCUT_UPLOAD_DIR | storage/uploads | Diretorio de uploads |
| CLASSYCUT_PROJECT_DIR | storage/projects | Diretorio de projetos |
| CLASSYCUT_EXPORT_DIR | storage/exports | Diretorio de exportacoes |
| CLASSYCUT_TEMP_DIR | storage/temp | Diretorio temporario |
| CLASSYCUT_FFMPEG_PATH | ffmpeg | Caminho do binario FFmpeg |
| CLASSYCUT_FFPROBE_PATH | ffprobe | Caminho do binario FFProbe |
| CLASSYCUT_REALESRGAN_PATH | realesrgan-ncnn-vulkan | Caminho Real-ESRGAN (opcional) |
| CLASSYCUT_MAX_UPLOAD_SIZE_MB | 2048 | Limite de upload em MB |
| CLASSYCUT_CORS_ORIGINS | ["http://localhost:5173"] | Origens permitidas |

> PROBLEMA IDENTIFICADO: O config.py tem database_url com caminho hardcoded
> `sqlite:///C:/Users/HP/video-editor/storage/classycut.db`
> DEVE ser substituido por variavel de ambiente apenas.

### 4.2 Proxy de Desenvolvimento (Frontend)

```typescript
// vite.config.ts — proxy /api para o backend local
'/api' → 'http://localhost:8000'
```

---

## 5. Infraestrutura

### 5.1 Desenvolvimento Local

```bash
# Backend
cd backend
uvicorn app.main:app --reload  # porta 8000

# Frontend
cd frontend
npm run dev  # porta 5173
```

### 5.2 Docker (Staging/Producao Local)

```yaml
services:
  backend:  porta 8000, volume classycut-data:/data
  frontend: porta 80, depende do backend healthy
```

### 5.3 Arquitetura Alvo para Web (Producao)

```
Internet
    |
[Vercel CDN]
    | (frontend static assets)
[React SPA]
    |
    | /api/* (HTTPS)
[Railway / Render]
    | (FastAPI + FFmpeg)
[Cloudflare R2 / AWS S3]
    | (arquivos de video)
[PostgreSQL]
    | (Railway managed DB)
```

**Passos para deploy web:**
1. Corrigir config hardcoded (bug imediato)
2. Adicionar autenticacao
3. Migrar storage para S3/R2
4. Deploy backend no Railway (suporta Docker + FFmpeg)
5. Deploy frontend no Vercel apontando para URL do Railway
6. Configurar CORS no backend com dominio do Vercel
7. Migrar SQLite para PostgreSQL (Railway Postgres)

---

## 6. Decisoes de Arquitetura (ADRs)

### ADR-001: SQLite como banco de dados inicial
**Decisao:** Usar SQLite para desenvolvimento e uso pessoal
**Motivo:** Zero configuracao, arquivo unico, suficiente para uso solo
**Trade-off:** Nao suporta concorrencia pesada, nao escala para multi-usuario
**Quando revisar:** Ao implementar autenticacao multi-usuario

### ADR-002: FFmpeg BackgroundTasks (nao Celery)
**Decisao:** Usar FastAPI BackgroundTasks para jobs assincronos
**Motivo:** Sem dependencias externas (Redis), simples de configurar
**Trade-off:** Jobs perdidos em reinicio; sem retry automatico; sem fila persistente
**Quando revisar:** Ao deploy em producao com volume de usuarios

### ADR-003: faster-whisper local (sem OpenAI API)
**Decisao:** Rodar transcricao localmente com faster-whisper
**Motivo:** Zero custo por uso; privacidade dos dados; sem dependencia de API externa
**Trade-off:** Mais lento que API na cloud; requer RAM do servidor
**Quando revisar:** Nunca — esta e a proposta de valor central do produto

### ADR-004: Zustand + React Query (sem Redux)
**Decisao:** Separar estado de UI (Zustand) de estado do servidor (React Query)
**Motivo:** Cada biblioteca especializada no seu caso de uso; menos boilerplate
**Trade-off:** Dois sistemas para aprender
**Quando revisar:** Quando o estado global crescer muito

---

## 7. Problemas Tecnicos Conhecidos

| ID | Problema | Severidade | Status |
|----|---------|-----------|--------|
| BUG-001 | Caminho hardcoded no config.py (C:/Users/HP/...) | Alta | Pendente |
| BUG-002 | Jobs perdidos em reinicio do servidor | Media | Aceito para v0.1 |
| BUG-003 | Sem autenticacao — projetos acessiveis por qualquer um | Alta | Roadmap Fase 2 |
| BUG-004 | Real-ESRGAN sem documentacao de instalacao | Baixa | Pendente |

---

*Documento gerado pelo AIOX — ClassyCut v0.1 — retroativo ao desenvolvimento existente*
