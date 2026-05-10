# ClassyCut — Product Briefing

**Version:** 1.0
**Date:** 2026-05-10
**Author:** Orion (AIOX Master) — retroactive documentation
**Status:** Approved

---

## 1. Visao Geral do Produto

### O que e o ClassyCut?

ClassyCut e um editor de video baseado em navegador (web app) desenvolvido como parte do ecossistema Classyco. Permite que usuarios faca upload de videos, editem-nos diretamente no browser, e exportem o resultado em formatos otimizados para plataformas sociais — sem precisar instalar nenhum software pesado.

A proposta e simples: dar ao criador de conteudo uma ferramenta rapida e inteligente para as tarefas mais repetitivas da edicao de video, com suporte a IA local (sem custos de API externos).

### Problema que resolve

Criadores de conteudo perdem horas em tarefas mecanicas de edicao:
- Remover silêncios e pausas manualmente
- Transcrever falas para legendas
- Recortar e exportar para multiplas plataformas
- Aplicar efeitos de zoom e movimento

O ClassyCut automatiza essas tarefas com IA rodando localmente, sem dependencia de servicos pagos externos.

---

## 2. Publico-Alvo

### Perfil Primario
- **Criadores de conteudo independentes** (YouTubers, podcasters, professores online)
- Produzem videos regularmente (1-5 videos/semana)
- Nao possuem equipe de edicao
- Valorizam velocidade e automacao
- Nivel tecnico: basico a intermediario

### Perfil Secundario
- **Pequenas agencias de conteudo** com volume de producao medio
- **Profissionais de marketing** que precisam adaptar videos para multiplas plataformas

---

## 3. Proposta de Valor

| Para quem | O que oferece | Diferencial |
|-----------|---------------|-------------|
| Criador solo | Edicao automatizada de video | IA local — sem custo por uso |
| Marketing | Export multi-plataforma em batch | Preset por rede social |
| Educadores | Transcricao + legendas automaticas | Sem chave de API necessaria |

---

## 4. Funcionalidades Principais (v0.1 — Estado Atual)

### Core
1. **Gestao de Projetos** — criar, listar, arquivar projetos de edicao
2. **Upload de Midia** — suporte a video e audio, ate 2GB por arquivo
3. **Player de Video** — reproducao com seeking (HTTP range requests)
4. **Timeline** — visualizacao dos clipes em linha do tempo

### Ferramentas de Edicao
5. **Merge** — concatenacao de multiplos videos
6. **Corte de Silencio** — deteccao e remocao automatica de silêncios
7. **Transcricao** — voz para texto com faster-whisper (IA local)
8. **Geracao de Legendas** — export SRT e VTT
9. **Zoom/Pan** — efeitos de zoom com keyframes e easing
10. **Export por Plataforma** — presets para YouTube, TikTok, Instagram

### Automacao
11. **Batch Export** — exportar multiplos arquivos com mesmo preset
12. **Upscale** — aumentar resolucao 2x ou 4x (FFmpeg lanczos ou Real-ESRGAN)
13. **Deteccao de Highlights** — identificar momentos de alta energia no audio
14. **Capitulos Automaticos** — segmentar video por pausas na fala
15. **Resumo Automatico** — extracao de sentencas mais relevantes

---

## 5. Arquitetura de Alto Nivel

```
[Browser] ←→ [React 19 SPA] ←→ [FastAPI Backend] ←→ [FFmpeg]
                                        ↓
                                  [SQLite DB]
                                  [File Storage]
                                  [faster-whisper]
```

**Infraestrutura atual:** Local (desenvolvimento), Docker Compose (staging/producao local)

**Infraestrutura alvo (web):**
- Frontend: Vercel
- Backend: Railway ou Render
- Storage: Cloudflare R2 ou AWS S3

---

## 6. Restricoes e Dependencias

| Restricao | Descricao |
|-----------|-----------|
| FFmpeg obrigatorio | Deve estar instalado no servidor |
| Python 3.12+ | Requisito do backend |
| faster-whisper | Transcricao roda em CPU (sem GPU necessaria) |
| Real-ESRGAN | Opcional — requer binario externo |
| Sem autenticacao | Versao atual nao tem sistema de login |
| Sem storage em nuvem | Arquivos ficam no disco do servidor |

---

## 7. Metricas de Sucesso

- Tempo para processar corte de silencio em video de 10min: < 60s
- Precisao de transcricao em portugues (modelo base): > 85%
- Tempo de carregamento inicial do editor: < 2s
- Zero custo de API por operacao de IA

---

## 8. Roadmap de Alto Nivel

### Fase 1 — Estabilizacao (atual)
- Corrigir bug de configuracao (caminho hardcoded)
- Cobertura de testes
- Preparar para deploy web

### Fase 2 — Web Ready
- Autenticacao de usuarios
- Storage em nuvem
- Deploy Vercel + Railway

### Fase 3 — UX Critico
- Corte manual na timeline
- Burn-in de legendas no video
- Corte por clique na transcricao

### Fase 4 — Expansao
- Waveform na timeline
- Compressao inteligente
- Compartilhamento de projetos
- Historico de versoes (undo/redo)

---

## 9. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Performance de transcricao em CPU | Alta | Medio | Modelos menores (tiny/base) para preview |
| Sem autenticacao em producao | Alta | Alto | Implementar antes do deploy web |
| Jobs perdidos em reinicio do servidor | Media | Alto | Migrar para Celery + Redis em producao |
| Escalabilidade com SQLite | Media | Alto | Migrar para PostgreSQL em producao |
| Custo de storage em nuvem | Baixa | Medio | Implementar limites por usuario |

---

*Documento gerado pelo AIOX — retroativo ao desenvolvimento ja realizado*
