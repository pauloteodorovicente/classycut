# Manual do ClassyCut — O que é e como usar cada funcionalidade

---

## O que é o ClassyCut?

O ClassyCut é um editor de vídeo que roda no navegador, sem instalar nada no seu computador. Você sobe um vídeo, edita, e baixa o resultado. Toda a "inteligência" (IA, processamento de vídeo) roda no servidor — sem custo de API, sem limite de uso.

**Para quem é?** Criadores de conteúdo, podcasters, professores, qualquer pessoa que precise editar vídeos com frequência sem querer aprender um editor profissional complexo.

---

## Tela inicial — Seus Projetos

Quando você abre o app, vê a lista de projetos. **Cada projeto = um vídeo ou conjunto de vídeos relacionados.**

- **Criar projeto:** Clique no botão "Novo Projeto", dê um nome (ex: "Podcast Ep 12")
- **Abrir projeto:** Clique no card do projeto para entrar no editor
- **Excluir projeto:** Clique no ícone de lixeira no card do projeto

---

## Dentro do Editor — A tela principal

A tela do editor tem três áreas:
- **Esquerda:** painel de ferramentas (você troca de ferramenta clicando nas abas no topo)
- **Centro:** player de vídeo onde você visualiza o resultado
- **Baixo:** linha do tempo (timeline)

No canto superior esquerdo tem o botão de voltar para a lista de projetos. No canto superior direito tem os botões "Compartilhar" e "Importar".

---

## Aba Media — Gerenciar seus arquivos

**O que é:** Aqui você vê todos os vídeos e áudios que importou para o projeto.

**Como usar:**
1. Clique em **"Importar"** (canto superior direito) para subir um arquivo do seu computador
2. Você também pode arrastar e soltar o arquivo direto na tela
3. Clique em qualquer arquivo da lista para **selecioná-lo** — ele aparece no player e fica disponível para edição
4. Para remover um arquivo, clique no ícone de lixeira ao lado do nome

**Formatos aceitos:** qualquer vídeo ou áudio (mp4, mov, mkv, mp3, wav, etc.)
**Limite:** até 2GB por arquivo

---

## Aba Auto-Corte — Remover silêncios automaticamente

**O que é:** O app analisa o áudio do vídeo e remove automaticamente os trechos onde não há fala — pausas longas, "eeeh", momentos de silêncio entre frases.

**Como usar:**
1. Selecione um vídeo na aba Media
2. Vá para a aba **Auto-Corte**
3. Ajuste os controles:
   - **Silêncio mínimo:** quanto tempo de silêncio precisa ter para ser cortado (padrão: 0.5 segundos — silêncios menores que isso são mantidos)
   - **Nível de silêncio:** o quão "quieto" precisa ser para considerar silêncio (padrão: -35dB — reduza se estiver cortando demais, aumente se estiver cortando de menos)
   - **Margem:** quantos milissegundos manter antes/depois de cada fala para soar natural
4. Clique em **"Detectar Silêncios"** — aguarde o processamento
5. Os silêncios aparecem destacados na timeline em vermelho
6. Clique em **"Aplicar Corte"** para gerar o vídeo sem silêncios
7. Baixe o resultado quando aparecer na lista

---

## Aba Corte Manual — Cortar partes específicas

**O que é:** Permite marcar partes do vídeo para manter ou remover com precisão, sem automação.

**Como usar:**
1. Use o player para navegar até o ponto onde quer cortar
2. Clique no botão de tesoura (ou pressione `C`) para dividir o vídeo naquele ponto
3. Na timeline, cada segmento aparece como um bloco colorido — verde = manter, vermelho = remover
4. Clique num segmento para alternar entre manter/remover
5. Quando estiver satisfeito, clique em **"Aplicar Cortes"**

**Undo/Redo:** Use `Ctrl+Z` para desfazer e `Ctrl+Y` para refazer qualquer ação (até 100 passos)

**Template de rede social:** Antes de aplicar o corte, você pode escolher uma rede social (Instagram Reels, TikTok, YouTube Shorts, WhatsApp, YouTube) — o vídeo final será ajustado para as dimensões corretas automaticamente.

---

## Aba Transcrição — Converter fala em texto

**O que é:** A IA do app "ouve" o vídeo e transcreve tudo que é falado, com timestamps. Roda 100% no servidor, sem custo.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Transcrição**
3. Escolha o **Modelo** de transcrição:
   - **Tiny:** rapidíssimo, menos preciso — bom para testes
   - **Base:** bom equilíbrio (padrão recomendado)
   - **Small / Medium:** mais preciso, mais lento
   - **Large v3:** máxima precisão, pode demorar vários minutos
4. Escolha o **Idioma** (ou deixe "Auto-detectar")
5. Clique em **"Transcrever"** — vai aparecer uma barra de progresso
6. Quando terminar, o texto aparece dividido em segmentos com timestamp

**O que você pode fazer com a transcrição:**
- Clicar em qualquer timestamp para ir para aquele ponto no vídeo
- Clicar no texto de um segmento para editar (corrigir erros)
- Baixar como arquivo **SRT** (para legendas no YouTube/Vimeo) ou **VTT**
- Ativar/desativar a exibição de legendas no player

---

## Aba Transcrição → Seção "Editar por transcrição"

**O que é:** Depois de transcrever, cada palavra aparece como um elemento clicável. Você edita o vídeo **escolhendo as palavras** que quer remover — como editar um documento de texto.

**Como usar:**
1. Transcreva o vídeo primeiro
2. Role para baixo na aba Transcrição até ver a seção **"Editar por transcrição"**
3. As palavras aparecem em fluxo contínuo
4. **Clique em qualquer palavra** para o player pular para aquele momento
5. **Durante a reprodução**, a palavra atual fica em negrito automaticamente
6. Para marcar um trecho para remover:
   - Clique e segure na primeira palavra do trecho
   - Arraste até a última palavra
   - Um popover aparece com dois botões: **"Remover"** (vermelho) e **"Manter"** (verde)
7. Trechos marcados ficam coloridos (vermelho = será removido, verde = será mantido)
8. Clique em **"Aplicar cortes"** para enviar os cortes para a aba de Corte Manual
9. Use `Ctrl+Z` para desfazer marcações

---

## Aba Legendas — Embutir legendas no vídeo

**O que é:** Diferente de apenas baixar um arquivo SRT, aqui as legendas são "queimadas" diretamente nos frames do vídeo — ideal para Instagram e TikTok, onde a legenda precisa aparecer mesmo sem o usuário ativar.

**Requisito:** Precisa ter transcrito o vídeo primeiro.

**Como usar:**
1. Transcreva o vídeo
2. Vá para a aba **Legendas** (ou role para baixo na aba Transcrição)
3. Escolha o **tamanho** da fonte (Pequeno, Médio, Grande)
4. Escolha a **posição** (Inferior — padrão, ou Superior)
5. Clique em **"Embutir legendas no vídeo"**
6. Aguarde o processamento — um novo arquivo é gerado com as legendas gravadas

---

## Aba Capítulos — Dividir o vídeo em capítulos

**O que é:** Analisa a transcrição e identifica automaticamente os momentos onde o assunto muda, criando capítulos com títulos e timestamps no formato do YouTube.

**Requisito:** Precisa ter transcrito o vídeo primeiro.

**Como usar:**
1. Transcreva o vídeo
2. Vá para a aba **Capítulos**
3. Configure a **duração mínima por capítulo** em segundos (padrão: 60 segundos — um capítulo não pode ter menos que isso)
4. Clique em **"Gerar Capítulos"**
5. A lista de capítulos aparece com:
   - Botão ▶ para pular para aquele capítulo no player
   - Timestamp no formato YouTube (0:00, 1:23, etc.)
   - Duração do capítulo
   - Título gerado automaticamente (editável — clique no título para editar)
6. Uma prévia no formato YouTube aparece embaixo
7. Clique em **"Copiar para YouTube"** para copiar tudo para a área de transferência e colar na descrição do seu vídeo

---

## Aba Resumo — Gerar resumo automático do conteúdo

**O que é:** Extrai as frases mais importantes da transcrição e gera um resumo pronto para usar na descrição do YouTube, legenda do Instagram ou e-mail de divulgação.

**Requisito:** Precisa ter transcrito o vídeo primeiro.

**Como usar:**
1. Transcreva o vídeo
2. Vá para a aba **Resumo**
3. Defina o **Número de sentenças** do resumo (padrão: 5, máximo: 20)
4. Clique em **"Gerar Resumo"**
5. O resumo aparece numa caixa de texto editável — você pode ajustar antes de copiar
6. Clique em **"Copiar"** para copiar o texto
7. Para gerar uma versão diferente, altere o número de sentenças e clique no botão de **Regenerar** (ícone de seta circular)

---

## Aba Highlights — Encontrar os melhores momentos

**O que é:** Analisa o áudio do vídeo e encontra automaticamente os momentos de maior energia — picos de empolgação, risadas, reações, momentos mais intensos — sem precisar assistir o vídeo todo.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Highlights**
3. Configure:
   - **Sensibilidade** (0 a 1): quanto maior, mais seletivo — só detecta picos extremos. Quanto menor, detecta mais momentos
   - **Duração mínima em segundos**: um highlight precisa ter pelo menos X segundos para aparecer
4. Clique em **"Detectar Highlights"** — o processamento acontece em segundo plano
5. Os highlights aparecem em ordem do mais energético para o menos, com:
   - Barra de energia (amarela, proporcional à intensidade)
   - Timestamp de início e duração
   - Checkbox para selecionar
6. Clique no ▶ de qualquer highlight para ir ao player naquele momento
7. Selecione os highlights que quer manter (checkbox) e clique em **"Exportar selecionados"** para gerar um novo vídeo só com aqueles trechos

---

## Aba Zoom — Efeitos de zoom e movimento

**O que é:** Adiciona efeitos de câmera ao vídeo — zoom in, zoom out, movimento panorâmico — sem precisar regravá-lo.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Zoom**
3. Defina os pontos de zoom na timeline:
   - **Início:** posição e escala no começo do efeito
   - **Fim:** posição e escala no final do efeito
4. Escolha o tipo de easing (como o movimento acelera/desacelera):
   - **Linear:** velocidade constante
   - **Punch In:** entra rápido e para
   - **Ken Burns:** lento e suave (clássico de documentário)
   - **Pan:** move horizontalmente
5. Clique em **"Aplicar Zoom"** para processar

---

## Aba Merge — Juntar vídeos

**O que é:** Concatena múltiplos vídeos em um único arquivo, na ordem que você quiser.

**Como usar:**
1. Importe todos os vídeos que quer juntar (aba Media)
2. Vá para a aba **Merge**
3. Os vídeos aparecem na lista — arraste para reordenar
4. Clique em **"Juntar Vídeos"**
5. O arquivo resultante aparece como um novo arquivo de mídia no projeto

---

## Aba Comprimir — Reduzir o tamanho do arquivo

**O que é:** Reduz o tamanho do arquivo de vídeo para um limite específico, mantendo a melhor qualidade possível dentro desse limite.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Comprimir**
3. Escolha um preset rápido: **8MB** (WhatsApp), **25MB**, **50MB**, **100MB** — ou defina um valor personalizado
4. Se o alvo for menor que 20% do tamanho original, aparece um aviso de qualidade baixa
5. Clique em **"Comprimir"**
6. Ao terminar, aparece um card com o tamanho original, tamanho final e a redução percentual

---

## Aba Upscale — Aumentar a resolução do vídeo

**O que é:** Aumenta a resolução do vídeo de forma inteligente, melhorando a nitidez. Útil para vídeos gravados em qualidade baixa ou para adaptar conteúdo antigo para telas modernas.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Upscale**
3. Escolha o **Fator de aumento:**
   - **2x:** dobra a resolução (ex: 720p → 1440p)
   - **4x:** quadruplica (ex: 720p → 2880p)
4. Escolha o **Método:**
   - **Lanczos:** rápido, resultado sólido — disponível sempre
   - **Real-ESRGAN:** IA especializada em upscale, resultado superior — só aparece se instalado no servidor
5. Clique em **"Fazer Upscale"**
6. Ao terminar, aparece o card com as resoluções antes e depois

---

## Aba Exportar — Formatos prontos para publicação

**O que é:** Exporta o vídeo com configurações otimizadas para cada plataforma, sem precisar ajustar nada manualmente.

**Como usar:**
1. Selecione o vídeo
2. Vá para a aba **Exportar**
3. Escolha o preset:
   - **YouTube:** 1080p, alta qualidade
   - **TikTok / Instagram Reels:** vertical 9:16
   - **Instagram Square:** quadrado 1:1
   - **WhatsApp:** tamanho reduzido para envio
4. Clique em **"Exportar"**
5. Baixe o arquivo quando o processamento terminar

---

## Aba Batch — Exportar vários vídeos de uma vez

**O que é:** Aplica o mesmo preset de exportação a vários vídeos simultaneamente.

**Como usar:**
1. Importe todos os vídeos que quer processar
2. Vá para a aba **Batch**
3. Selecione os vídeos (checkbox)
4. Escolha o preset de exportação
5. Clique em **"Exportar Todos"**
6. Os arquivos são processados em fila — você pode ver o progresso de cada um

---

## Aba AI — Ferramentas de IA adicionais

**O que é:** Funcionalidades experimentais de inteligência artificial para análise de conteúdo.

---

## Compartilhamento de projetos

No canto superior direito do editor há o botão **"Compartilhar"**. Ele gera um link público que qualquer pessoa pode abrir (sem precisar de conta) para **visualizar** o projeto — ver os arquivos de mídia, mas sem conseguir editar.

**Como usar:**
1. Clique em **"Compartilhar"**
2. Clique em **"Gerar link"**
3. O link é copiado automaticamente — compartilhe com quem quiser
4. Para revogar o acesso, clique em **"Revogar link"** — o link antigo para de funcionar imediatamente

---

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` | Refazer |
| `C` | Cortar na posição atual (aba Corte Manual) |
| `Espaço` | Play/Pause |

---

## Dicas importantes

- **A transcrição é a base de tudo:** As abas Capítulos, Resumo e Editar por Transcrição só funcionam depois de você transcrever o vídeo. Faça isso primeiro.
- **Os arquivos ficam no servidor:** Você não precisa manter o vídeo original no computador. Ele fica salvo no projeto.
- **Processamentos demorados aparecem com barra de progresso:** Transcrição, upscale e detecção de highlights podem demorar alguns minutos. Você pode deixar a aba aberta e o processamento continua no servidor.
- **Cada operação gera um novo arquivo:** Comprimir, exportar, fazer upscale, aplicar cortes — o vídeo original nunca é apagado. Você sempre pode voltar a ele.
