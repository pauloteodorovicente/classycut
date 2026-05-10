# ClassyCut — Epicos de Desenvolvimento

**Ultima atualizacao:** 2026-05-10
**Total de stories estimadas:** ~18
**Stories criadas:** 6
**Stories pendentes de criacao:** ~12

---

## Epic 1 — Estabilizacao e Qualidade

**Objetivo:** Corrigir bugs criticos e adicionar documentacao minima para o projeto ter uma base solida.
**Status:** Em andamento

| Story | Titulo | Status | Prioridade |
|-------|--------|--------|-----------|
| 1.1 | Corrigir configuracao hardcoded no backend | Ready | CRITICAL |
| 1.2 | Adicionar README completo ao projeto | Ready | High |
| 1.3 | Cobertura de testes basica (backend) | Pendente de criacao | Medium |

**Criterio de conclusao do Epic:** Bug de config corrigido + README existente + testes passando no CI.

---

## Epic 2 — Web Ready

**Objetivo:** Tornar o ClassyCut acessivel pela internet com seguranca e infraestrutura adequada.
**Status:** Planejado (bloqueado por Epic 1)

| Story | Titulo | Status | Prioridade |
|-------|--------|--------|-----------|
| 2.1 | Autenticacao de usuarios (JWT) | Draft | High |
| 2.2 | Deploy: Frontend Vercel + Backend Railway | Draft | High |
| 2.3 | Storage em nuvem (Cloudflare R2 ou AWS S3) | Pendente de criacao | Medium |
| 2.4 | Migrar SQLite para PostgreSQL | Pendente de criacao | Medium |

**Criterio de conclusao do Epic:** App acessivel por URL publica, com login, sem dados no disco do servidor.

---

## Epic 3 — UX Critico

**Objetivo:** Implementar as funcionalidades de edicao que estao faltando e que os usuarios mais esperam.
**Status:** Planejado (bloqueado por Epic 1)

| Story | Titulo | Status | Prioridade |
|-------|--------|--------|-----------|
| 3.1 | Corte manual de clipes na timeline | Draft | High |
| 3.2 | Burn-in de legendas no video exportado | Draft | Medium |
| 3.3 | Navegar no video clicando na transcricao | Pendente de criacao | Medium |

**Criterio de conclusao do Epic:** Usuario pode editar video visualmente sem depender so de automacao.

---

## Epic 4 — Expansao de Features

**Objetivo:** Adicionar funcionalidades que elevam o ClassyCut de ferramenta basica para produto completo.
**Status:** Futuro (apos Epic 2 e 3)

| Story | Titulo | Status | Prioridade |
|-------|--------|--------|-----------|
| 4.1 | Waveform (onda de audio) na timeline | Pendente de criacao | Medium |
| 4.2 | Undo/Redo — historico de operacoes | Pendente de criacao | Medium |
| 4.3 | Compartilhamento de projeto (link publico) | Pendente de criacao | Low |
| 4.4 | Compressao inteligente de video | Pendente de criacao | Low |
| 4.5 | Templates de formato por rede social | Pendente de criacao | Low |

**Criterio de conclusao do Epic:** ClassyCut compete com ferramentas pagas de edicao web.

---

## Epic 5 — Qualidade e CI/CD

**Objetivo:** Garantir que o codigo tem cobertura de testes e que deploys sao automatizados e seguros.
**Status:** Futuro (paralelo ao Epic 4)

| Story | Titulo | Status | Prioridade |
|-------|--------|--------|-----------|
| 5.1 | Testes automatizados do backend (pytest) | Pendente de criacao | Medium |
| 5.2 | Testes automatizados do frontend (Vitest) | Pendente de criacao | Medium |
| 5.3 | Pipeline CI/CD com GitHub Actions | Pendente de criacao | Medium |

**Criterio de conclusao do Epic:** Todo PR e validado automaticamente antes de ser merged.

---

## Resumo Visual do Roadmap

```
[AGORA]
  Epic 1 — Estabilizacao
    1.1 Bug config (CRITICAL) ──→ 1.2 README ──→ 1.3 Testes basicos

[PROXIMO]
  Epic 2 — Web Ready
    2.1 Autenticacao ──→ 2.2 Deploy ──→ 2.3 Storage nuvem ──→ 2.4 PostgreSQL

[DEPOIS]
  Epic 3 — UX Critico
    3.1 Corte manual ──→ 3.2 Burn-in legendas ──→ 3.3 Navegar por transcricao

[FUTURO]
  Epic 4 — Expansao          Epic 5 — Qualidade
    4.1 Waveform               5.1 Testes backend
    4.2 Undo/Redo              5.2 Testes frontend
    4.3 Compartilhar           5.3 CI/CD
    4.4 Compressao
    4.5 Templates sociais
```

---

## Notas sobre Criacao de Stories

Stories dos Epics 4 e 5 serao criadas apos:
- Epic 2 estar concluido (decisoes de infraestrutura tomadas)
- Epic 3 estar em andamento (padrao de edicao definido)

Isso evita re-trabalho de documentacao por mudancas de decisao tecnica.

---

*Documento mantido pelo AIOX — atualizar ao criar novas stories ou concluir epicos*
