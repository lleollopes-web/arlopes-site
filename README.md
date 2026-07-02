# Site institucional — Sinalização Rodoviária (BR-LEGAL)

Protótipo de site estático (HTML/CSS/JS puro, sem build step) para empresa de
projetos de sinalização rodoviária atuante no Programa BR-LEGAL/DNIT.

## Estrutura

```
/
├── index.html                     → página única (hero, mapa, portfólio, sobre, contato)
├── assets/
│   ├── css/style.css              → sistema de design (cores, tipografia, componentes)
│   └── js/main.js                 → lógica do mapa, contadores, menu, cards
└── data/
    ├── rodovias.geojson           → malha de rodovias federais (SNV/DNIT), 167 rodovias, simplificada p/ web
    └── projetos-exemplo.json      → DADOS DE EXEMPLO dos projetos executados (trocar pela planilha real)
```

## O que ainda falta (conteúdo real do cliente)

1. **Planilha de projetos** → substituir `data/projetos-exemplo.json`. Estrutura sugerida
   por linha: `codigo_br, uf, trecho, extensao_km, periodo, empresa_contratada, tipo_servico, programa, status`.
   Basta manter essas mesmas chaves que o mapa e os cards do portfólio já funcionam.
2. **Texto "Sobre nós"** → substituir o bloco marcado `[ ESPAÇO RESERVADO ]` em `index.html` (seção `#sobre`).
3. **Logo/identidade visual** → hoje o cabeçalho usa um "logo" de texto (SINALTRACK, nome fictício).
   Trocar pelo nome real da empresa e, se tiver, um arquivo de logo em `assets/img/`.
4. **Dados de contato** → e-mail, telefone e endereço reais na seção `#contato`.
5. **Formulário de contato** → hoje é só visual (site estático não envia e-mail sozinho).
   Opções simples e gratuitas para ativar o envio: [Formspree](https://formspree.io),
   [Web3Forms](https://web3forms.com) ou [EmailJS](https://www.emailjs.com/). Depois eu ajudo a plugar.

## Rodando localmente

Como o JS usa `fetch()` para carregar os arquivos `.geojson`/`.json`, é preciso
servir os arquivos por HTTP (abrir o `index.html` direto com duplo clique não funciona
por causa de CORS do navegador). O jeito mais simples:

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
# depois acessar http://localhost:8000
```

## Deploy no GitHub

```bash
git init
git add .
git commit -m "Site institucional - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

## Deploy no Render (Static Site)

1. Acesse [render.com](https://render.com) → **New** → **Static Site**.
2. Conecte o repositório do GitHub que você acabou de criar.
3. Configurações de build:
   - **Build Command**: deixar em branco (não há build; é HTML puro).
   - **Publish Directory**: `.` (raiz do repositório).
4. Clique em **Create Static Site**. O Render já te dá uma URL tipo
   `https://seu-site.onrender.com`, e todo `git push` refaz o deploy automaticamente.

> Alternativa gratuita: como é um site 100% estático, também dá pra hospedar direto
> no **GitHub Pages** (Settings → Pages → Branch: main), sem precisar do Render.
> Fica a seu critério — o Render é mais flexível se um dia você quiser adicionar
> algo dinâmico (ex. formulário com backend próprio).

## Sobre o mapa

- O arquivo `rodovias.geojson` foi gerado a partir do shapefile `vw_snv_rod` (SNV/DNIT)
  que você enviou, simplificado e dissolvido por código de rodovia (BR-xxx) para
  ficar leve no navegador (167 feições, ~2,8 MB em vez dos 88 MB originais).
- O JS cruza o campo `Codigo_BR` do GeoJSON com `codigo_br` do `projetos-exemplo.json`
  para decidir quais rodovias aparecem destacadas em amarelo.
- Quando quiser mais detalhe por trecho (não só por BR inteira), dá pra gerar uma
  versão do GeoJSON no nível de segmento/SNV em vez de dissolvido — é só avisar
  quando a planilha chegar que a gente decide o nível de detalhe ideal.
