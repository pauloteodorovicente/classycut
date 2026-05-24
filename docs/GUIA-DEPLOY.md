# Guia de Deploy — ClassyCut

> Tudo que você precisa fazer manualmente para o projeto rodar na web.

---

## Visão geral

O ClassyCut tem duas partes que precisam ir para a internet separadamente:
- **Backend** (o "servidor") → vai para o **Railway**
- **Frontend** (o "app visual") → vai para o **Vercel**

Ambos são gratuitos para começar. Você vai precisar de aproximadamente **40 minutos** na primeira vez.

---

## Bloco 1 — Criar as contas (se ainda não tiver)

**Passo 1.1 — Conta no GitHub**
Se você ainda não tem, vá em `github.com` e crie uma conta gratuita. O repositório do ClassyCut já está lá (`pauloteodorovicente/classycut`).

**Passo 1.2 — Conta no Railway**
- Acesse `railway.app`
- Clique em **"Start a New Project"**
- Escolha **"Login with GitHub"** — isso conecta automaticamente ao seu GitHub
- Railway vai te dar um plano gratuito com US$ 5 de crédito/mês (suficiente para testes e uso pessoal leve)

**Passo 1.3 — Conta no Vercel**
- Acesse `vercel.com`
- Clique em **"Sign Up"** → escolha **"Continue with GitHub"**
- Autorize o acesso quando pedir

---

## Bloco 2 — Subir o Backend no Railway

**Passo 2.1 — Criar o projeto no Railway**
1. No Railway, clique em **"New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Selecione o repositório `classycut`
4. Railway vai detectar o arquivo `railway.toml` automaticamente e saber que deve usar o `backend/Dockerfile`

**Passo 2.2 — Adicionar um volume de armazenamento**
Os vídeos que você enviar precisam de um lugar para ficar. No Railway:
1. Clique no serviço que acabou de aparecer
2. Vá na aba **"Volumes"**
3. Clique em **"New Volume"**
4. Em **"Mount Path"** (onde o volume vai ser montado), coloque exatamente: `/data`
5. Clique em **"Create"**

Isso garante que seus vídeos, banco de dados e arquivos exportados não se percam quando o servidor reiniciar.

**Passo 2.3 — Configurar as variáveis de ambiente do backend**
No serviço do Railway, vá na aba **"Variables"** e adicione estas variáveis uma por uma:

| Nome da variável | Valor |
|---|---|
| `CLASSYCUT_DATABASE_URL` | `sqlite:////data/classycut.db` |
| `CLASSYCUT_UPLOAD_DIR` | `/data/uploads` |
| `CLASSYCUT_PROJECT_DIR` | `/data/projects` |
| `CLASSYCUT_EXPORT_DIR` | `/data/exports` |
| `CLASSYCUT_TEMP_DIR` | `/data/temp` |
| `CLASSYCUT_DEBUG` | `false` |
| `CLASSYCUT_JWT_SECRET_KEY` | *(veja o passo abaixo)* |
| `CLASSYCUT_CORS_ORIGINS` | *(veja o passo abaixo)* |

**Gerando o JWT Secret Key:**
Esse é uma senha secreta que protege os logins. Para gerar um valor seguro:
- Abra qualquer terminal no seu computador e execute:
  ```
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- Copie o resultado (vai ser algo como `a3f8c2d1...`) e coloque como valor de `CLASSYCUT_JWT_SECRET_KEY`
- **Guarde esse valor em algum lugar seguro** — se perder, todos os usuários precisarão fazer login novamente

**O valor de CORS_ORIGINS** você vai preencher depois do Passo 3, porque precisa da URL do Vercel primeiro. Por enquanto, coloque: `["http://localhost"]`

**Passo 2.4 — Pegar a URL do seu backend**
Após o deploy terminar (Railway mostra uma barra de progresso):
1. Vá na aba **"Settings"** do serviço
2. Em **"Networking"** → **"Public Networking"**, clique em **"Generate Domain"**
3. Vai aparecer uma URL tipo: `classycut-production-abc123.up.railway.app`
4. **Anote essa URL** — você vai precisar dela nos próximos passos

**Passo 2.5 — Verificar se o backend está funcionando**
Abra no seu navegador: `https://[SUA-URL-DO-RAILWAY]/api/health`

Se aparecer `{"status":"ok","app":"ClassyCut"}`, o backend está no ar.

---

## Bloco 3 — Subir o Frontend no Vercel

**Passo 3.1 — Criar o projeto no Vercel**
1. No painel do Vercel, clique em **"Add New Project"**
2. Clique em **"Import Git Repository"**
3. Selecione o repositório `classycut`
4. Vercel vai perguntar sobre a configuração. Preencha:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` ← **importante, clique em "Edit" para mudar**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

**Passo 3.2 — Configurar a variável de ambiente do frontend**
Ainda na tela de configuração do Vercel (antes de clicar em Deploy), vá em **"Environment Variables"** e adicione:

| Nome | Valor |
|---|---|
| `VITE_API_URL` | `https://[SUA-URL-DO-RAILWAY]` (sem barra no final) |

Exemplo: `https://classycut-production-abc123.up.railway.app`

**Passo 3.3 — Fazer o deploy**
Clique em **"Deploy"**. Aguarde 2-3 minutos. Vai aparecer uma URL do tipo: `classycut-abc.vercel.app`

---

## Bloco 4 — Conectar os dois (etapa final)

Agora o backend precisa saber que pode aceitar requisições vindas do seu endereço do Vercel.

**Passo 4.1 — Atualizar o CORS no Railway**
1. Volte ao Railway, aba **"Variables"**
2. Edite a variável `CLASSYCUT_CORS_ORIGINS`
3. Coloque o valor com a URL do Vercel:
   ```
   ["https://classycut-abc.vercel.app"]
   ```
   (use exatamente o endereço que o Vercel te deu, com aspas e colchetes)
4. Salve — o Railway vai reiniciar o servidor automaticamente

**Passo 4.2 — Testar tudo junto**
1. Abra a URL do Vercel no navegador
2. Você vai ver a tela de login do ClassyCut
3. Clique em **"Criar conta"** e cadastre-se
4. Pronto — crie seu primeiro projeto e comece a usar

---

## Opcional: Usar um domínio próprio

Se quiser usar um endereço como `classycut.seusite.com.br`:
1. No Vercel → **"Settings"** → **"Domains"** → adicione seu domínio
2. Vercel vai te dar instruções para apontar o DNS no seu provedor de domínio (Registro.br, GoDaddy, etc.)
3. Depois que o domínio estiver apontado, atualize `CLASSYCUT_CORS_ORIGINS` no Railway com o novo endereço

---

## Mantendo o app atualizado no futuro

Toda vez que você (ou eu) fizermos um `git push` para o repositório no GitHub, o Railway e o Vercel vão detectar automaticamente e fazer um novo deploy. Você não precisa fazer nada — as atualizações vão ao ar sozinhas em alguns minutos.
