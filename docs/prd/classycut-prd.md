# ClassyCut — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-05-10
**Status:** Approved
**Owner:** Classyco
**Document type:** Retroactive PRD (existing product)

---

## 1. Introducao e Contexto

### 1.1 Objetivo do Documento

Este PRD documenta formalmente os requisitos funcionais e nao-funcionais do ClassyCut v0.1 (estado atual) e estabelece os requisitos para as proximas versoes (v0.2 e v1.0).

### 1.2 Escopo

**Incluido neste PRD:**
- Requisitos funcionais de todas as features existentes
- Requisitos das proximas 3 fases de desenvolvimento
- Criterios de aceitacao por feature
- Requisitos nao-funcionais de performance e seguranca

**Excluido deste PRD:**
- App mobile nativo
- Edicao colaborativa em tempo real
- Processamento em GPU compartilhada

---

## 2. Requisitos Funcionais — Estado Atual (v0.1)

### FR-001 — Gestao de Projetos

**Descricao:** O sistema deve permitir ao usuario criar e gerenciar projetos de edicao de video.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-001.1 | Usuario pode criar novo projeto com nome | Projeto aparece na lista da HomePage |
| FR-001.2 | Usuario pode listar todos os projetos | Lista exibe nome e data de criacao |
| FR-001.3 | Usuario pode abrir um projeto | Editor carrega com midia do projeto |
| FR-001.4 | Usuario pode deletar um projeto | Projeto e midia sao removidos |
| FR-001.5 | Usuario pode renomear um projeto | Nome atualizado na lista e no editor |

### FR-002 — Upload e Gestao de Midia

**Descricao:** O sistema deve permitir upload de arquivos de video e audio.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-002.1 | Upload de video via botao | Arquivo aparece na sidebar do editor |
| FR-002.2 | Upload de video via drag-and-drop | Area de dropzone aceita arquivos |
| FR-002.3 | Upload multiplo simultaneo | Varios arquivos enviados de uma vez |
| FR-002.4 | Suporte a formatos: MP4, MOV, AVI, MKV, WebM | Backend aceita e processa todos |
| FR-002.5 | Suporte a audio: MP3, WAV, AAC | Upload e reproducao funcionam |
| FR-002.6 | Limite de 2GB por arquivo | Arquivos maiores sao rejeitados com erro claro |
| FR-002.7 | Usuario pode remover midia do projeto | Arquivo removido do servidor e da lista |
| FR-002.8 | Metadados extraidos automaticamente | Duracao, resolucao, codec visiveis |

### FR-003 — Player de Video

**Descricao:** O editor deve incluir um player de video funcional com controles basicos.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-003.1 | Reproducao e pausa | Controles funcionam corretamente |
| FR-003.2 | Seeking (pular para momento especifico) | Slider de posicao funcional |
| FR-003.3 | Controle de volume | Volume ajustavel pelo usuario |
| FR-003.4 | Suporte a HTTP range requests | Video pode ser buscado sem carregar tudo |
| FR-003.5 | Exibir tempo atual e duracao total | Formato MM:SS visivel |

### FR-004 — Timeline

**Descricao:** Visualizacao dos clipes em linha do tempo.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-004.1 | Exibir clipes na linha do tempo | Clipes aparecem proporcionalmente |
| FR-004.2 | Selecionar clipe na timeline | Clipe selecionado carrega no player |
| FR-004.3 | Indicador de posicao atual | Cursor de reproducao visivel |

### FR-005 — Merge de Videos

**Descricao:** Concatenacao de multiplos arquivos de video em um unico arquivo.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-005.1 | Selecionar multiplos videos para merge | Interface de selecao funcional |
| FR-005.2 | Definir ordem dos clipes | Drag-and-drop ou numeracao |
| FR-005.3 | Executar merge em background | Job criado e status acompanhado |
| FR-005.4 | Resultado disponivel na midia do projeto | Novo arquivo aparece apos conclusao |

### FR-006 — Corte de Silencio

**Descricao:** Detectar e remover silêncios automaticamente do video.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-006.1 | Configurar limiar de ruido (dB) | Slider de -60dB a -20dB |
| FR-006.2 | Configurar duracao minima do silencio | Campo numerico em segundos |
| FR-006.3 | Executar deteccao em background | Job com progresso visivel |
| FR-006.4 | Exibir lista de segmentos detectados | Separacao entre fala e silencio |
| FR-006.5 | Usuario pode marcar/desmarcar segmentos | Toggle por segmento |
| FR-006.6 | Executar corte com segmentos selecionados | Novo arquivo gerado sem silêncios |
| FR-006.7 | Resultado disponivel na midia | Arquivo aparece na lista pos-processamento |

### FR-007 — Transcricao

**Descricao:** Converter fala em texto usando IA local (faster-whisper).

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-007.1 | Selecionar modelo de transcricao | Opcoes: tiny, base, small, medium |
| FR-007.2 | Opcao de especificar idioma | Campo de idioma (auto-detect se vazio) |
| FR-007.3 | Executar transcricao em background | Job com status visivel |
| FR-007.4 | Exibir transcricao segmentada | Cada segmento com timestamp |
| FR-007.5 | Timestamps por palavra disponiveis | Dados de word-level timestamps no resultado |
| FR-007.6 | Exibir idioma detectado | Informacao visivel apos transcricao |

### FR-008 — Legendas

**Descricao:** Gerar e exportar arquivos de legenda a partir da transcricao.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-008.1 | Exportar transcricao como SRT | Arquivo .srt com formatacao correta |
| FR-008.2 | Exportar transcricao como VTT | Arquivo .vtt com formatacao correta |
| FR-008.3 | Download direto do arquivo | Browser inicia download automaticamente |

### FR-009 — Zoom e Pan

**Descricao:** Aplicar efeitos de zoom e movimento de camera com keyframes.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-009.1 | Selecionar preset de efeito | Opcoes: punch in, pan left/right, ken burns |
| FR-009.2 | Adicionar keyframes customizados | Posicao (x,y), escala, easing configuravel |
| FR-009.3 | Executar zoom em background | Job processado com FFmpeg |
| FR-009.4 | Suporte a easing: linear, ease in/out | Animacao suave entre keyframes |
| FR-009.5 | Resultado disponivel na midia | Novo arquivo com efeito aplicado |

### FR-010 — Exportacao

**Descricao:** Exportar video com presets por plataforma.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-010.1 | Preset YouTube (1920x1080, 16:9) | Video redimensionado com letterbox |
| FR-010.2 | Preset TikTok (1080x1920, 9:16) | Video recortado centralizado |
| FR-010.3 | Preset Instagram Portrait (1080x1350, 4:5) | Video recortado centralizado |
| FR-010.4 | Preset Instagram Square (1080x1080, 1:1) | Video recortado centralizado |
| FR-010.5 | Preset Original (sem reprocessamento) | Copia exata com faststart |
| FR-010.6 | Download do arquivo exportado | Link de download disponivel |

### FR-011 — Batch Export

**Descricao:** Exportar multiplos videos com o mesmo preset em uma operacao.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-011.1 | Selecionar multiplos arquivos | Interface de selecao multipla |
| FR-011.2 | Selecionar preset de destino | Mesmo preset aplicado a todos |
| FR-011.3 | Job pai com progresso total | Percentual total visivel (ex: 2/5) |
| FR-011.4 | Jobs filhos por arquivo | Status individual por arquivo |
| FR-011.5 | Falha parcial nao cancela o batch | Continua com proximos mesmo com erro |

### FR-012 — Upscale

**Descricao:** Aumentar resolucao do video.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-012.1 | Upscale 2x via FFmpeg lanczos | Sempre disponivel |
| FR-012.2 | Upscale 4x via FFmpeg lanczos | Sempre disponivel |
| FR-012.3 | Upscale via Real-ESRGAN (se instalado) | Condicional ao binario disponivel |
| FR-012.4 | Indicacao clara se Real-ESRGAN nao disponivel | Erro explicativo, nao crash |

### FR-013 — Deteccao de Highlights

**Descricao:** Identificar momentos de maior energia no audio.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-013.1 | Configurar sensibilidade (0.0 a 1.0) | Slider de sensibilidade |
| FR-013.2 | Configurar duracao minima | Campo em segundos |
| FR-013.3 | Executar analise em background | Job de processamento |
| FR-013.4 | Exibir lista de highlights com energia | Ordenado por energia (maior primeiro) |
| FR-013.5 | Navegar para highlight no player | Clique no item leva ao timestamp |

### FR-014 — Capitulos Automaticos

**Descricao:** Segmentar video em capitulos com base na transcricao.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-014.1 | Requer transcricao previa | Erro claro se nao ha transcricao |
| FR-014.2 | Configurar duracao minima de capitulo | Campo em segundos |
| FR-014.3 | Gerar lista de capitulos com titulos | Titulos derivados do conteudo falado |
| FR-014.4 | Navegar para capitulo no player | Clique leva ao timestamp do capitulo |

### FR-015 — Resumo Automatico

**Descricao:** Gerar resumo textual do conteudo do video.

| ID | Requisito | Criterio de Aceitacao |
|----|-----------|----------------------|
| FR-015.1 | Requer transcricao previa | Erro claro se nao ha transcricao |
| FR-015.2 | Configurar numero maximo de sentencas | Campo numerico (padrao: 5) |
| FR-015.3 | Exibir resumo gerado | Texto legivel na interface |
| FR-015.4 | Copiar resumo para area de transferencia | Botao de copia funcional |

---

## 3. Requisitos Nao-Funcionais (NFR)

### NFR-001 — Performance

| ID | Requisito | Meta |
|----|-----------|------|
| NFR-001.1 | Tempo de carregamento inicial do editor | < 2 segundos |
| NFR-001.2 | Upload de arquivo de 100MB | < 30 segundos em conexao local |
| NFR-001.3 | Deteccao de silencio em video de 10min | < 60 segundos |
| NFR-001.4 | Transcricao de 10min (modelo base, CPU) | < 5 minutos |
| NFR-001.5 | Polling de status de jobs | Intervalo de 2 segundos |

### NFR-002 — Confiabilidade

| ID | Requisito | Meta |
|----|-----------|------|
| NFR-002.1 | Jobs falhos nao crasham o servidor | Excecoes capturadas, status "error" salvo |
| NFR-002.2 | Upload com interrupcao nao corrompe DB | Transacao atomica |
| NFR-002.3 | Health check disponivel | GET /api/health retorna 200 |

### NFR-003 — Seguranca

| ID | Requisito | Prioridade |
|----|-----------|-----------|
| NFR-003.1 | Autenticacao de usuarios (fase 2) | Alta |
| NFR-003.2 | Validacao de tipo de arquivo no upload | Media |
| NFR-003.3 | Limite de tamanho de upload configuravel | Implementado (2GB) |
| NFR-003.4 | CORS configurado por ambiente | Implementado |

### NFR-004 — Escalabilidade

| ID | Requisito | Nota |
|----|-----------|------|
| NFR-004.1 | SQLite adequado para uso solo | Atual — OK |
| NFR-004.2 | PostgreSQL para multi-usuario | Fase 2 |
| NFR-004.3 | Fila de jobs (Celery/Redis) para producao | Fase 2 |

### NFR-005 — Usabilidade

| ID | Requisito | Meta |
|----|-----------|------|
| NFR-005.1 | Interface em portugues (pt-BR) | Todos os textos de UI |
| NFR-005.2 | Feedback visual de operacoes em andamento | Spinner/progresso visivel |
| NFR-005.3 | Mensagens de erro compreensivas | Toast com contexto do erro |
| NFR-005.4 | Tema escuro como padrao | Dark theme CSS |

---

## 4. Restricoes Tecnicas (CON)

| ID | Restricao |
|----|-----------|
| CON-001 | FFmpeg deve estar instalado no servidor host |
| CON-002 | Python 3.12+ obrigatorio no backend |
| CON-003 | faster-whisper corre em CPU (sem necessidade de GPU) |
| CON-004 | Real-ESRGAN e dependencia opcional — nao obrigatoria |
| CON-005 | Frontend e SPA (Single Page Application) — sem SSR |
| CON-006 | API RESTful com prefixo /api/v1 |
| CON-007 | Comunicacao frontend-backend via proxy /api em dev |

---

## 5. Requisitos Futuros — Fase 2 (v0.2)

### FR-F2-001 — Autenticacao

| ID | Requisito |
|----|-----------|
| FR-F2-001.1 | Cadastro de usuario (email + senha) |
| FR-F2-001.2 | Login com JWT token |
| FR-F2-001.3 | Projetos e midia isolados por usuario |
| FR-F2-001.4 | Logout e invalidacao de sessao |

### FR-F2-002 — Storage em Nuvem

| ID | Requisito |
|----|-----------|
| FR-F2-002.1 | Upload direto para S3/R2 (bypass servidor) |
| FR-F2-002.2 | URLs assinadas para reproducao segura |
| FR-F2-002.3 | Quota de storage por usuario configuravel |

### FR-F2-003 — Corte Manual na Timeline

| ID | Requisito |
|----|-----------|
| FR-F2-003.1 | Marcar ponto de corte na timeline com clique |
| FR-F2-003.2 | Selecionar e deletar segmento da timeline |
| FR-F2-003.3 | Preview do corte antes de processar |

---

## 6. Requisitos Futuros — Fase 3 (v1.0)

| ID | Feature | Descricao |
|----|---------|-----------|
| FR-F3-001 | Burn-in de legendas | Embutir legendas diretamente no video exportado |
| FR-F3-002 | Corte por transcricao | Clicar em palavra na transcricao pula para aquele ponto |
| FR-F3-003 | Waveform na timeline | Onda de audio visivel para cortes precisos |
| FR-F3-004 | Compressao inteligente | Reduzir tamanho mantendo qualidade percebida |
| FR-F3-005 | Compartilhamento de projeto | Link publico de visualizacao |
| FR-F3-006 | Undo/Redo | Historico de operacoes reversivel |

---

*PRD gerado pelo AIOX — ClassyCut v0.1 — retroativo ao desenvolvimento existente*
