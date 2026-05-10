# ClassyCut

Editor de video baseado em navegador com automacao por IA local. Sem instalacao de software, sem custos de API — tudo roda no seu proprio servidor.

## Funcionalidades

- **Corte de Silencio** — detecta e remove silêncios automaticamente com FFmpeg
- **Transcricao** — converte fala em texto usando faster-whisper (IA local, sem custo)
- **Legendas** — gera arquivos SRT e VTT a partir da transcricao
- **Zoom e Pan** — efeitos de zoom com keyframes e easing (punch in, ken burns, pan)
- **Merge** — concatena multiplos videos em um unico arquivo
- **Exportacao** — presets prontos para YouTube, TikTok, Instagram Portrait e Square
- **Batch Export** — exporta varios videos com o mesmo preset de uma vez
- **Upscale** — aumenta resolucao 2x ou 4x (FFmpeg lanczos ou Real-ESRGAN)
- **Highlights** — detecta momentos de alta energia no audio
- **Capitulos Automaticos** — segmenta video em capitulos pela transcricao
- **Resumo Automatico** — extrai as sentencas mais relevantes do conteudo falado

## Pre-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12+
- [FFmpeg](https://ffmpeg.org/download.html) instalado e disponivel no PATH
- [Docker](https://www.docker.com/) (opcional, para rodar com Docker Compose)

### Verificar se FFmpeg esta instalado

```bash
ffmpeg -version
```

Se nao estiver, instale pelo site oficial ou via gerenciador de pacotes:
- **Windows:** `winget install ffmpeg` ou baixar em https://ffmpeg.org/download.html
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

## Instalacao e Desenvolvimento Local

### Backend (FastAPI)

```bash
cd backend

# Criar ambiente virtual
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Instalar dependencias
pip install -e ".[dev]"

# Configurar variaveis de ambiente (opcional — SQLite e configurado automaticamente)
cp .env.example .env

# Criar banco de dados e rodar migracoes
alembic upgrade head

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload
# API disponivel em: http://localhost:8000
# Documentacao: http://localhost:8000/api/docs
```

### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev
# App disponivel em: http://localhost:5173
```

Abra http://localhost:5173 no browser. O frontend ja esta configurado para se comunicar com o backend em localhost:8000.

## Rodando com Docker

```bash
# Na raiz do projeto (onde esta o docker-compose.yml)
docker compose up --build

# App disponivel em: http://localhost
# API disponivel em: http://localhost:8000
```

Os dados (videos, banco de dados) ficam no volume `classycut-data` e persistem entre reinicios.

## Estrutura do Projeto

```
classycut/
├── frontend/          # React 19 SPA (Vite, TypeScript, Tailwind CSS)
│   └── src/
│       ├── api/       # Clientes HTTP por dominio
│       ├── components/# Componentes reutilizaveis
│       ├── pages/     # HomePage e EditorPage
│       ├── stores/    # Estado Zustand
│       └── types/     # Tipos TypeScript
│
├── backend/           # FastAPI REST API (Python 3.12)
│   └── app/
│       ├── api/       # Routers HTTP por funcionalidade
│       ├── core/      # Logica de processamento (FFmpeg, Whisper)
│       ├── models/    # ORM SQLAlchemy
│       └── schemas/   # Pydantic (request/response)
│
├── storage/           # Dados locais (gitignored)
│   ├── uploads/       # Arquivos enviados pelo usuario
│   ├── exports/       # Videos exportados
│   └── temp/          # Temporarios de processamento
│
└── docs/              # Documentacao AIOX
    ├── briefing/      # Produto e proposta de valor
    ├── prd/           # Requisitos funcionais
    ├── architecture/  # Decisoes de arquitetura
    └── stories/       # Stories de desenvolvimento
```

## Stack Tecnico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Estado | Zustand + TanStack React Query |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Banco de dados | SQLite (dev) / PostgreSQL (producao) |
| ORM | SQLAlchemy 2 + Alembic |
| Processamento | FFmpeg, faster-whisper |
| Containers | Docker + Docker Compose |

## Comandos Uteis

```bash
# Backend
ruff check .          # linting
ruff format .         # formatacao
pytest                # testes
alembic upgrade head  # migracoes

# Frontend
npm run lint          # linting
npm run build         # build de producao
npm run preview       # preview do build
```

## Problemas Comuns

**FFmpeg nao encontrado:**
Verifique se o FFmpeg esta no PATH do sistema. No Windows, pode ser necessario reiniciar o terminal apos a instalacao.

**Transcricao muito lenta:**
O modelo `base` e o padrao e requer ~1GB de RAM. Use `tiny` para testes rapidos. A transcricao roda em CPU — nao e necessaria GPU.

**Porta ja em uso:**
- Backend: `uvicorn app.main:app --reload --port 8001`
- Frontend: `npm run dev -- --port 5174`

## Documentacao

Consulte a pasta `docs/` para documentacao completa:
- [Briefing do produto](./docs/briefing/classycut-briefing.md)
- [Requisitos (PRD)](./docs/prd/classycut-prd.md)
- [Arquitetura](./docs/architecture/classycut-architecture.md)
- [Roadmap e stories](./docs/README.md)

---

Parte do ecossistema [Classyco](https://github.com/pauloteodorovicente).
