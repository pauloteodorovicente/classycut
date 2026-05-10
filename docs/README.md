# ClassyCut — Documentacao do Projeto

Documentacao gerada pelo AIOX em 2026-05-10. Retroativa ao desenvolvimento existente.

---

## Indice

### Briefing
- [classycut-briefing.md](./briefing/classycut-briefing.md) — O que e o produto, publico-alvo, proposta de valor

### PRD (Requisitos)
- [classycut-prd.md](./prd/classycut-prd.md) — Todos os requisitos funcionais e nao-funcionais

### Arquitetura
- [classycut-architecture.md](./architecture/classycut-architecture.md) — Stack, estrutura, modelos de dados, rotas

### Stories

| ID | Titulo | Epic | Status | Prioridade |
|----|--------|------|--------|-----------|
| [1.1](./stories/1.1.story.md) | Corrigir configuracao hardcoded | 1 - Estabilizacao | Ready | CRITICAL |
| [1.2](./stories/1.2.story.md) | Adicionar README completo | 1 - Estabilizacao | Ready | High |
| [2.1](./stories/2.1.story.md) | Autenticacao de usuarios | 2 - Web Ready | Draft | High |
| [2.2](./stories/2.2.story.md) | Deploy Vercel + Railway | 2 - Web Ready | Draft | High |
| [3.1](./stories/3.1.story.md) | Corte manual na timeline | 3 - UX Critico | Draft | High |
| [3.2](./stories/3.2.story.md) | Burn-in de legendas | 3 - UX Critico | Draft | Medium |

---

## Epics

| # | Nome | Objetivo | Status |
|---|------|---------|--------|
| 1 | Estabilizacao e Qualidade | Corrigir bugs, adicionar documentacao basica | Em andamento |
| 2 | Web Ready | Autenticacao + deploy na internet | Planejado |
| 3 | UX Critico | Features de edicao que faltam | Planejado |
| 4 | Expansao | Features avancadas (waveform, compartilhamento, undo) | Futuro |

---

## Ordem de Execucao Recomendada

```
Story 1.1 (bug critico) → Story 1.2 (README)
    ↓
Story 2.1 (autenticacao) → Story 2.2 (deploy web)
    ↓
Story 3.1 (corte manual) → Story 3.2 (burn-in legendas)
```
