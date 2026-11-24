# 🤖 Python para Crianças — aprenda a programar com blocos

Jogo web para crianças (a partir de ~8 anos) aprenderem a programar. Começa com **blocos** (Blockly) e, fase a fase, mostra o **código Python de verdade** ao lado, até a criança montar programas com variáveis, `input()`, `if`, `for`, `while`, funções e listas.

- **24 fases** em 4 mundos — cada uma com um objetivo claro e **verificável** (o jogo confere o que o programa realmente fez; não aceita "qualquer coisa")
- Toda fase termina explicando **o que foi ensinado**
- Botão **"❓ O que cada bloco faz?"** com explicações para criança de 8 anos
- XP e estrelas (o XP só sobe quando a criança bate o próprio recorde na fase)
- Sem cadastro, sem backend, sem coleta de dados — é um site estático

## Mundos e fases

| Mundo | Fases | O que a criança aprende |
|---|---|---|
| 🏘️ Mundo 2 — Vila dos Blocos | 1–6 | sequência, repetição, evento, condicional, variável (contador), projeto |
| 🌉 Mundo 3 — Ponte Híbrida | 7–12 | `print()`, variáveis, `if/else`, `for`, projeto — blocos e Python lado a lado |
| 🌲 Mundo 4 — Floresta do Código | 13–18 | tipos (número/texto), `input()`, `while` (com limite de segurança), projeto |
| 🗼 Mundo 5 — Torre das Funções | 19–24 | `def`, funções + repetição, listas, `append`, projeto |

> O Mundo 1 do currículo (Ilha da Lógica, atividades sem código) ainda não foi construído — veja `docs/curriculo-python-kids.md`.

## Estrutura

```
public/index.html   # o jogo inteiro (HTML + CSS + JS em um arquivo)
vercel.json         # configuração do deploy (site estático, sem build)
tests/              # testes automatizados (Playwright + Blockly real)
docs/               # currículo e pesquisa pedagógica
```

## Rodar localmente

```bash
python3 -m http.server 8000 --directory public
# abra http://localhost:8000
```

Precisa de internet (o Blockly e as fontes vêm de CDN).

## Testes automatizados

```bash
cd tests
npm install
npx playwright install chromium
npm test            # roda as 7 suítes (~5 min)
```

178 verificações com o **Blockly de verdade** num Chromium automatizado:

| Suíte | O que cobre |
|---|---|
| `suite1_layout` | layout em 5 tamanhos de janela × 24 fases (sem sobreposição, barras de rolagem, botões alcançáveis) |
| `suite2_mundo2` | robô alinhado na célula/maçã, soluções válidas, casos que **não** podem passar, "Jogar de novo", regra do XP, desbloqueio |
| `suite3_codigo` | fases 7–24: código Python ao vivo, soluções, ~45 casos que não podem passar, clique duplo, sair no meio da execução |
| `suite4_cliques` | cliques reais em "Próxima fase", "Jogar de novo", "Voltar ao mapa", ajuda — em 5 tamanhos de janela |
| `suite5_partida` | partida completa 1→24 só com "Próxima fase →", XP total, mapa |
| `suite6_interacao` | arrastar blocos com o mouse, menu "sim/não", digitar em campos, rolagem, lixeira |
| `suite7_largura` | cada bloco cabe inteiro na área de blocos (sozinho e aninhado) |

**Rode os testes a cada mudança** — vários bugs só apareceram com o Blockly real e cliques reais.

## Publicar

### 1) GitHub

**Opção A — terminal**

1. Crie o repositório **vazio** em <https://github.com/new> (nome sugerido: `python-kids-game`; **não** marque README, .gitignore nem license).
2. Na pasta do projeto:

```bash
git init -b main
git add .
git commit -m "Primeira versão: 24 fases em 4 mundos"
git remote add origin https://github.com/SEU_USUARIO/python-kids-game.git
git push -u origin main
```

3. Autenticação: o GitHub **não aceita a senha da conta**. Quando o Git pedir *Password*, use um **Personal Access Token**
   (GitHub → Settings → Developer settings → Personal access tokens → *Fine-grained*, permissão **Contents: Read and write**, só nesse repositório):

   ```
   Username: SEU_USUARIO
   Password: SENHAAQUI      # ← cole aqui o seu token (nunca em chats, arquivos ou commits)
   ```

   Alternativa sem token manual: instale o [GitHub CLI](https://cli.github.com) e rode
   `gh auth login` e depois `gh repo create python-kids-game --public --source=. --push`.

**Opção B — pelo site (sem terminal):** crie o repositório → *uploading an existing file* → arraste o **conteúdo** da pasta (não o .zip) → *Commit changes*.

### 2) Vercel (acesso pela internet)

1. Abra <https://vercel.com/new> e entre com **Continue with GitHub**.
2. Em *Import Git Repository*, instale/autorize o app da Vercel no GitHub e escolha `python-kids-game`.
3. Em *Configure Project*:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./`
   - **Build Command:** deixe vazio
   - **Install Command:** deixe vazio
   - **Output Directory:** `public` (já definido no `vercel.json`)
4. Clique em **Deploy**. Em ~30 segundos o site fica em `https://python-kids-game.vercel.app` (o nome pode variar).
5. A partir daí, **cada `git push` na branch `main` publica de novo automaticamente**.

Se a URL pedir login da Vercel para abrir: *Project → Settings → Deployment Protection* → desative a proteção para **Production**.
Domínio próprio: *Project → Settings → Domains*.

**Alternativa pela linha de comando:**

```bash
npm i -g vercel
vercel login
vercel --prod     # na raiz do projeto
```

## Limitações conhecidas / próximos passos

- **O progresso não é salvo:** recarregar a página volta ao início (XP, estrelas e fases liberadas ficam só na memória). Próximo passo natural: salvar no `localStorage`.
- **Depende de serviços externos:** Blockly 10.4.3 (unpkg.com), Google Fonts e os ícones/sons do próprio Blockly (carregados de um servidor externo). Para uso offline ou para evitar requisições a terceiros, hospede esses arquivos junto com o site.
- **Celular em pé** funciona, mas fica apertado nas fases com blocos longos; prefira tablet, notebook ou celular deitado.
- **Simplificações deliberadas:** a condição do "se/enquanto" é escolhida no bloco (sim/não), não calculada; funções não têm parâmetros; listas são digitadas separadas por vírgula.
- Testado em **Chromium**. Falta testar Safari, Firefox e toque em dispositivos reais.

## Privacidade

O jogo não coleta dados pessoais, não usa cookies nem analytics. Porém, ao abrir o site, o navegador faz requisições a serviços de terceiros (CDN do Blockly, Google Fonts), que podem ver o endereço IP. Por ser um site para crianças, avalie hospedar esses arquivos localmente (LGPD).
