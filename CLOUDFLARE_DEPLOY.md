# 🚀 Guia de Publicação no Cloudflare Pages

Este projeto está 100% preparado para ser publicado no **Cloudflare Pages** através do repositório no **GitHub**.

---

## 📋 Configurações no Painel da Cloudflare

Ao conectar seu repositório no Cloudflare Pages:

1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/)
2. No menu lateral esquerdo, vá em **Workers & Pages**
3. Clique em **Create** (ou **Create application**) e selecione a aba **Pages**
4. Escolha **Connect to Git**
5. Selecione a sua conta do GitHub e o repositório sincronizado
6. Preencha os campos exatamente assim:

| Campo | Valor Recomendado |
| :--- | :--- |
| **Project name** | `cast-quote` (ou o nome desejado) |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build:pages` *(ou `npm run build`)* |
| **Build output directory** | `dist` |
| **Node.js Version** | `20` *(automático via `.nvmrc`)* |

7. Clique em **Save and Deploy** (Salvar e Implantar).

---

## ⚙️ O que já está configurado no repositório:

- **`public/_redirects`**: Configuração nativa do Cloudflare Pages para Single-Page Applications (SPA), garantindo que ao atualizar a página (F5) ou acessar links diretos não ocorra erro 404.
- **`public/_headers`**: Otimização de cache para assets estáticos e segurança.
- **`.nvmrc`**: Define Node.js 20 para o container de build da Cloudflare.
- **`firebase-applet-config.json`**: Conexão com Firebase Firestore, Auth e Storage já integrada para persistência na nuvem em produção.
- **`package.json`**: Script `build:pages` apontando diretamente para `vite build`.

---

## 🌐 Domínio Personalizado (Opcional)

Após a primeira publicação:
1. Dentro do projeto no Cloudflare Pages, acesse a aba **Custom domains**
2. Clique em **Set up a custom domain**
3. Digite seu domínio (ex: `app.suaempresa.com.br`) e siga as instruções para ativação automática com SSL gratuito.
