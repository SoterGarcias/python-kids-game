const { abrirApp, criarChecador } = require('./helpers');
const mostrar = t => ({ t: 'mostrar_texto', f: { TEXTO: t } });
const guardar = (nome, valor) => ({ t: 'guardar_variavel', f: { NOME: nome, VALOR: valor } });
const mv = nome => ({ t: 'mostrar_variavel', f: { NOME: nome } });
const perg = (pergunta, nome) => ({ t: 'perguntar_variavel', f: { PERGUNTA: pergunta, NOME: nome } });
const REP = (v, filhos) => ({ t: 'repetir_n_vezes', f: { VEZES: v }, i: { DO: filhos } });
const SE = (c, ent, sen) => ({ t: 'se_entao_senao', f: { CONDICAO: c }, i: { ENTAO: ent, ...(sen ? { SENAO: sen } : {}) } });
const ENQ = (c, filhos) => ({ t: 'enquanto_python', f: { CONDICAO: c }, i: { DO: filhos } });
const DEF = (nome, filhos) => ({ t: 'definir_funcao', f: { NOME: nome }, i: { DO: filhos } });
const CALL = nome => ({ t: 'chamar_funcao', f: { NOME: nome } });
const LISTA = (nome, itens) => ({ t: 'criar_lista', f: { NOME: nome, ITENS: itens } });
const PERC = nome => ({ t: 'percorrer_lista', f: { NOME: nome } });
const ADD = (nome, valor) => ({ t: 'adicionar_item_lista', f: { NOME: nome, VALOR: valor } });

// [fase, programa principal, blocos soltos, respostas da caixinha, código Python esperado]
const POS = [
  [7,  [mostrar('Oi pessoal!')], [], [], 'print("Oi pessoal!")'],
  [8,  [mostrar('Bom dia'), mostrar('Eu sou o Zig'), mostrar('Vamos programar?')], [], [], 'print("Bom dia")\nprint("Eu sou o Zig")\nprint("Vamos programar?")'],
  [9,  [guardar('nome', 'Zig'), mv('nome')], [], [], 'nome = "Zig"\nprint(nome)'],
  [10, [SE('SIM', [mostrar('Caminho livre!')])], [], [], 'if True:\n    print("Caminho livre!")\nelse:\n    pass'],
  [11, [REP(3, [mostrar('Oba')])], [], [], 'for i in range(3):\n    print("Oba")'],
  [12, [guardar('x', '5'), mv('x'), REP(1, [mostrar('oi')])], [], [], 'x = 5\nprint(x)\nfor i in range(1):\n    print("oi")'],
  [13, [guardar('idade', '8'), mv('idade')], [], [], 'idade = 8\nprint(idade)'],
  [14, [perg('Qual é o seu nome?', 'nome'), mv('nome')], [], ['Maria'], 'nome = input("Qual é o seu nome?")\nprint(nome)'],
  [15, [perg('Qual é o seu nome?', 'nome'), mostrar('Bem-vindo(a),'), mv('nome')], [], ['João'], 'nome = input("Qual é o seu nome?")\nprint("Bem-vindo(a),")\nprint(nome)'],
  [16, [ENQ('SIM', [mostrar('de novo!')])], [], [], 'while True:\n    print("de novo!")'],
  [17, [perg('Qual o seu nome?', 'nome'), mv('nome'), perg('Qual a sua cor favorita?', 'cor'), mv('cor')], [], ['Ana', 'Azul'], 'nome = input("Qual o seu nome?")\nprint(nome)\ncor = input("Qual a sua cor favorita?")\nprint(cor)'],
  [18, [perg('Qual é a sua cidade?', 'cidade'), mv('cidade'), SE('SIM', [mostrar('fim')])], [], ['Rio'], 'cidade = input("Qual é a sua cidade?")\nprint(cidade)\nif True:\n    print("fim")\nelse:\n    pass'],
  [19, [CALL('saudacao'), CALL('saudacao')], [DEF('saudacao', [mostrar('Oi')])], [], 'def saudacao():\n    print("Oi")\n\nsaudacao()\nsaudacao()'],
  [20, [REP(3, [CALL('saudacao')])], [DEF('saudacao', [mostrar('Oi')])], [], 'def saudacao():\n    print("Oi")\n\nfor i in range(3):\n    saudacao()'],
  [21, [LISTA('frutas', 'maçã, banana, uva'), PERC('frutas')], [], [], 'frutas = ["maçã", "banana", "uva"]\nfor item in frutas:\n    print(item)'],
  [22, [LISTA('frutas', 'maçã, banana'), ADD('frutas', 'uva'), ADD('frutas', 'manga'), PERC('frutas')], [], [], 'frutas = ["maçã", "banana"]\nfrutas.append("uva")\nfrutas.append("manga")\nfor item in frutas:\n    print(item)'],
  [23, [LISTA('frutas', 'maçã, uva'), REP(2, [CALL('mostra')]), PERC('frutas')], [DEF('mostra', [mostrar('Fruta:')])], [], 'def mostra():\n    print("Fruta:")\n\nfrutas = ["maçã", "uva"]\nfor i in range(2):\n    mostra()\nfor item in frutas:\n    print(item)'],
  [24, [perg('Qual é o seu nome?', 'nome'), CALL('mostra'), LISTA('frutas', 'maçã, uva, pera'), PERC('frutas')], [DEF('mostra', [mostrar('Olá!')])], ['Zé'], 'def mostra():\n    print("Olá!")\n\nnome = input("Qual é o seu nome?")\nmostra()\nfrutas = ["maçã", "uva", "pera"]\nfor item in frutas:\n    print(item)'],
];

// [fase, descrição, principal, soltos, respostas, regex da mensagem esperada (opcional)]
const NEG = [
  [7, 'programa vazio', [], [], []],
  [8, '3 mensagens IGUAIS', [mostrar('Oi!'), mostrar('Oi!'), mostrar('Oi!')], [], [], /diferentes/i],
  [8, 'só 2 mensagens diferentes', [mostrar('a'), mostrar('b')], [], []],
  [9, 'guarda mas mostra um texto qualquer (não a caixinha)', [guardar('x', '5'), mostrar('oi')], [], []],
  [9, 'mostra caixinha com nome ERRADO', [guardar('x', '5'), mv('y')], [], []],
  [10, 'mostra sem usar o "se"', [mostrar('x')], [], []],
  [10, '"se" em NÃO e sem "senão" (nada roda)', [SE('NAO', [mostrar('x')])], [], []],
  [10, '"se" em SIM mas vazio por dentro', [SE('SIM', [])], [], []],
  [11, '3 "mostrar" soltos, sem repetição', [mostrar('a'), mostrar('a'), mostrar('a')], [], []],
  [11, 'repetição só 2 vezes', [REP(2, [mostrar('a')])], [], []],
  [13, 'guarda o número mas não mostra', [guardar('idade', '8')], [], []],
  [14, 'pergunta e não mostra a resposta', [perg('Qual é o seu nome?', 'nome')], [], ['Maria']],
  [14, 'cancela a caixinha (sem resposta)', [perg('Qual é o seu nome?', 'nome'), mv('nome')], [], ['__CANCELAR__']],
  [14, 'responde só com espaços', [perg('Qual é o seu nome?', 'nome'), mv('nome')], [], ['   ']],
  [15, 'só 1 linha (falta a mensagem de boas-vindas)', [perg('Nome?', 'nome'), mv('nome')], [], ['João']],
  [15, 'mensagem sem mostrar a caixinha do nome', [perg('Nome?', 'nome'), mostrar('Oi'), mostrar('Tchau')], [], ['João']],
  [16, '"enquanto" em NÃO (nunca roda)', [ENQ('NAO', [mostrar('x')])], [], []],
  [16, 'só "mostrar", sem usar o "enquanto"', [mostrar('x')], [], []],
  [17, 'só uma pergunta', [perg('Nome?', 'nome'), mv('nome')], [], ['Ana']],
  [17, 'duas perguntas com o MESMO nome de caixinha', [perg('Nome?', 'nome'), mv('nome'), perg('Cor?', 'nome'), mv('nome')], [], ['Ana', 'Azul']],
  [18, 'sem pergunta', [mostrar('a'), mostrar('b'), REP(1, [mostrar('c')])], [], []],
  [18, 'com pergunta mas sem repetição/decisão/enquanto', [perg('Cidade?', 'c'), mv('c'), mostrar('fim')], [], ['Rio']],
  [18, 'com "enquanto" em NÃO (não roda) e sem repetição/decisão', [perg('Cidade?', 'c'), mv('c'), ENQ('NAO', [mostrar('x')])], [], ['Rio']],
  [12, 'só uma mensagem', [mostrar('só isso')], [], []],
  [12, 'variável + 2 linhas mas sem repetição/decisão', [guardar('x', '5'), mv('x'), mostrar('oi')], [], []],
  [19, 'função com nome DIFERENTE da chamada', [CALL('saudacao'), CALL('saudacao')], [DEF('outra', [mostrar('Oi')])], [], /função|criada|nome/i],
  [19, 'chama sem ter criado função', [CALL('saudacao'), CALL('saudacao')], [], []],
  [19, 'função criada e chamada só 1 vez', [CALL('saudacao')], [DEF('saudacao', [mostrar('Oi')])], []],
  [19, 'função criada mas nunca chamada', [mostrar('x'), mostrar('y')], [DEF('saudacao', [mostrar('Oi')])], []],
  [20, '3 chamadas soltas, sem repetição', [CALL('s'), CALL('s'), CALL('s')], [DEF('s', [mostrar('Oi')])], []],
  [20, 'repetição de só 2 chamadas', [REP(2, [CALL('s')])], [DEF('s', [mostrar('Oi')])], []],
  [21, 'lista com só 2 itens', [LISTA('frutas', 'maçã, uva'), PERC('frutas')], [], []],
  [21, 'cria a lista mas não mostra', [LISTA('frutas', 'a, b, c')], [], []],
  [21, 'mostra uma lista com outro nome (vazia)', [LISTA('frutas', 'a, b, c'), PERC('legumes')], [], []],
  [22, 'só 1 "adicionar"', [LISTA('f', 'a, b, c'), ADD('f', 'd'), PERC('f')], [], []],
  [22, '"adicionar" em outra lista (nome diferente)', [LISTA('f', 'a, b'), ADD('g', 'c'), ADD('g', 'd'), PERC('f')], [], []],
  [23, 'função + repetição, mas sem lista', [REP(2, [CALL('s')]), mostrar('a'), mostrar('b')], [DEF('s', [mostrar('Oi')])], []],
  [23, 'lista + repetição, mas a função nunca é chamada', [LISTA('f', 'a, b, c'), REP(1, [mostrar('x')]), PERC('f')], [DEF('s', [mostrar('Oi')])], []],
  [24, 'falta a pergunta', [CALL('m'), LISTA('f', 'a, b, c'), PERC('f')], [DEF('m', [mostrar('Oi')])], []],
  [24, 'falta mostrar a lista', [perg('Nome?', 'n'), CALL('m'), LISTA('f', 'a, b, c'), mostrar('x'), mostrar('y')], [DEF('m', [mostrar('Oi')])], ['Zé']],
  [24, 'função nunca chamada', [perg('Nome?', 'n'), LISTA('f', 'a, b, c'), PERC('f'), mostrar('x')], [DEF('m', [mostrar('Oi')])], ['Zé']],
];

(async () => {
  const { browser, page, erros } = await abrirApp();
  const { estado, checar } = criarChecador();

  const fila = [];
  page.on('dialog', async d => {
    const r = fila.shift();
    if (r === '__CANCELAR__') await d.dismiss(); else await d.accept(r === undefined ? '' : r);
  });

  async function montarERodar(n, principal, soltos, respostas, { botao, esperaMs } = {}) {
    fila.length = 0; fila.push(...(respostas || []));
    await page.evaluate(({ n, principal, soltos }) => { iniciarFase(n); window.__montar(principal, soltos); }, { n, principal, soltos });
    await page.waitForTimeout(160); // dá tempo do Blockly avisar a mudança (painel de código ao vivo)
    const codigo = await page.evaluate(() => document.getElementById('codigo-python').textContent);
    let r;
    if (botao) {
      await page.evaluate(() => document.getElementById('btn-terminar-criacao').click());
      await page.waitForTimeout(esperaMs || 3500);
      r = await page.evaluate(() => ({}));
    } else {
      r = await page.evaluate(async () => { await executarPrograma(); return {}; });
    }
    const estadoFinal = await page.evaluate(() => ({
      fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'),
      mensagem: document.getElementById('texto-missao').textContent,
      linhas: linhasConsole.slice(), avisos: saidaConsole.filter(l => l.aviso).length,
      consoleTexto: document.getElementById('console-saida').textContent,
    }));
    return { ...r, ...estadoFinal, codigo };
  }

  // ---------- 1) Soluções corretas: concluem e o código Python aparece certinho (ao vivo) ----------
  for (const [n, principal, soltos, resp, esperado] of POS) {
    const r = await montarERodar(n, principal, soltos, resp);
    checar(`Fase ${n}: solução correta conclui e o código Python ao vivo está certo`, r.fechou && r.codigo === esperado,
      { fechou: r.fechou, codigo: r.codigo, esperado, msg: r.mensagem.slice(0, 80) });
  }

  // ---------- 2) Casos que NÃO podem passar ----------
  for (const [n, nome, principal, soltos, resp, msg] of NEG) {
    const r = await montarERodar(n, principal, soltos, resp);
    const okMsg = msg ? msg.test(r.mensagem) : true;
    checar(`Fase ${n} NÃO conclui: ${nome}`, !r.fechou && okMsg, { fechou: r.fechou, msg: r.mensagem.slice(0, 90), linhas: r.linhas });
  }

  // ---------- 3) Detalhes de comportamento ----------
  {
    // while True: 15 voltas de saída real + 1 aviso, sem travar
    const t0 = Date.now();
    const r = await montarERodar(16, [ENQ('SIM', [mostrar('de novo!')])], [], []);
    checar('Fase 16: "enquanto sim" para sozinho em 15 voltas com aviso (não conta como saída) e não trava', r.linhas.length === 15 && r.avisos === 1 && /para sempre/.test(r.consoleTexto) && Date.now() - t0 < 20000, { n: r.linhas.length, avisos: r.avisos });
  }
  {
    const r = await montarERodar(19, [CALL('saudacao'), CALL('saudacao')], [DEF('outra', [mostrar('Oi')])], []);
    checar('Fase 19 (nome errado): o console avisa "função não foi criada" (como aviso, sem contar como saída)', r.avisos === 2 && r.linhas.length === 0 && /não foi criada/.test(r.consoleTexto), { avisos: r.avisos, linhas: r.linhas });
  }
  {
    // executar duas vezes seguidas não acumula saída
    const r = await page.evaluate(async () => {
      iniciarFase(9); window.__montar([{ t: 'guardar_variavel', f: { NOME: 'a', VALOR: 'x' } }, { t: 'mostrar_variavel', f: { NOME: 'a' } }]);
      await executarPrograma(); mostrarTela('tela-fase');
      await executarPrograma();
      return { linhas: linhasConsole.length };
    });
    checar('Executar 2x seguidas não acumula a saída (reinicia do zero)', r.linhas === 1, r);
  }

  // ---------- 4) Botão "Terminar minha criação" (fases 12, 18 e 24) ----------
  for (const [n, principal, soltos, resp] of POS.filter(p => [12, 18, 24].includes(p[0])).map(p => [p[0], p[1], p[2], p[3]])) {
    const r = await montarERodar(n, principal, soltos, resp, { botao: true, esperaMs: 5000 });
    checar(`Fase ${n}: o botão "Terminar minha criação" confere os requisitos e conclui`, r.fechou, { msg: r.mensagem.slice(0, 80) });
  }
  for (const n of [12, 18, 24]) {
    const r = await montarERodar(n, [mostrar('só uma')], [], [], { botao: true, esperaMs: 1500 });
    checar(`Fase ${n}: "Terminar minha criação" com programa incompleto NÃO conclui e explica o que falta`, !r.fechou && /Quase lá|Confira/.test(r.mensagem), { msg: r.mensagem.slice(0, 80) });
  }
  const visBotao = await page.evaluate(() => {
    const out = {};
    [6, 7, 12, 13, 18, 19, 24].forEach(n => { iniciarFase(n); out[n] = !document.getElementById('btn-terminar-criacao').classList.contains('escondida'); });
    return out;
  });
  checar('"Terminar minha criação" só aparece nas fases 12, 18 e 24', visBotao[12] && visBotao[18] && visBotao[24] && !visBotao[6] && !visBotao[7] && !visBotao[13] && !visBotao[19], visBotao);

  // ---------- 5) Clique duplo e saída no meio da execução ----------
  {
    const r = await page.evaluate(async () => {
      iniciarFase(11); window.__montar([{ t: 'repetir_n_vezes', f: { VEZES: 2 }, i: { DO: [{ t: 'mostrar_texto', f: { TEXTO: 'a' } }] } }]);
      const btn = document.getElementById('btn-executar');
      btn.click(); btn.click(); btn.click(); // criança clicando várias vezes rápido
      const desabilitado = btn.disabled;
      const rotulo = btn.textContent;
      await new Promise(r => setTimeout(r, 2500));
      return {
        desabilitado, rotulo, repeticoes: execucao.repeticoes, linhas: linhasConsole.length,
        fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'),
        reabilitado: !btn.disabled, rotuloFinal: btn.textContent,
      };
    });
    checar('Clique duplo em Executar: roda UMA vez só (2 repetições, não 4), botão fica desabilitado "Rodando..." e depois volta ao normal',
      r.desabilitado && /Rodando/.test(r.rotulo) && r.repeticoes === 2 && r.linhas === 2 && !r.fechou && r.reabilitado && r.rotuloFinal === '▶ Executar', r);
  }
  {
    const r = await page.evaluate(async () => {
      const xpAntes = jogador.xp;
      iniciarFase(1);
      window.__montar([...Array(4).fill({ t: 'mover_frente' }), { t: 'virar_direita' }, ...Array(3).fill({ t: 'mover_frente' })]);
      document.getElementById('btn-executar').click();
      await new Promise(r => setTimeout(r, 700));         // robô ainda andando...
      document.getElementById('btn-voltar-mapa').click();  // ...e a criança volta pro mapa
      await new Promise(r => setTimeout(r, 5000));         // espera passar o tempo em que a fase teria terminado
      return {
        mapaVisivel: !document.getElementById('tela-mapa').classList.contains('escondida'),
        fechamentoSurgiu: !document.getElementById('tela-fechamento').classList.contains('escondida'),
        botaoOk: !document.getElementById('btn-executar').disabled, xpMudou: jogador.xp !== xpAntes,
      };
    });
    checar('Sair pro mapa no meio da execução cancela tudo: nada de "fase concluída" surgindo depois, nem XP', r.mapaVisivel && !r.fechamentoSurgiu && r.botaoOk && !r.xpMudou, r);
  }
  {
    const r = await page.evaluate(async () => {
      iniciarFase(1);
      window.__montar([...Array(4).fill({ t: 'mover_frente' }), { t: 'virar_direita' }, ...Array(3).fill({ t: 'mover_frente' })]);
      document.getElementById('btn-executar').click();
      await new Promise(r => setTimeout(r, 600));
      document.getElementById('btn-ajuda-blocos').click(); // abre a ajuda com o robô andando
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('btn-fechar-ajuda').click();
      await new Promise(r => setTimeout(r, 400));
      const centro = el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      const d = Math.hypot(...['x', 'y'].map(k => centro(document.getElementById('robo'))[k] - centro(celulasEl[INICIO_POS.linha][INICIO_POS.coluna])[k]));
      return { distanciaDoInicio: d, botaoOk: !document.getElementById('btn-executar').disabled };
    });
    checar('Abrir a ajuda com o robô andando: ao voltar, o robô está de volta no início (não "perdido" fora da grade)', r.distanciaDoInicio < 1.5 && r.botaoOk, r);
  }

  console.log('\nErros JS:', erros.length ? erros.slice(0, 3) : '(nenhum)');
  if (erros.length) { estado.falhas++; estado.total++; }
  await browser.close();
  console.log(`\n=== SUITE 3: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
