const { abrirApp, criarChecador } = require('./helpers');
const M = n => Array.from({ length: n }, () => ({ t: 'mover_frente' }));
const T = t => ({ t });
const mostrar = t => ({ t: 'mostrar_texto', f: { TEXTO: t } });
const guardar = (nome, valor) => ({ t: 'guardar_variavel', f: { NOME: nome, VALOR: valor } });
const mv = nome => ({ t: 'mostrar_variavel', f: { NOME: nome } });
const perg = (p, nome) => ({ t: 'perguntar_variavel', f: { PERGUNTA: p, NOME: nome } });
const REP = (v, f) => ({ t: 'repetir_n_vezes', f: { VEZES: v }, i: { DO: f } });
const SE = (c, e) => ({ t: 'se_entao_senao', f: { CONDICAO: c }, i: { ENTAO: e } });
const ENQ = (c, f) => ({ t: 'enquanto_python', f: { CONDICAO: c }, i: { DO: f } });
const DEF = (n, f) => ({ t: 'definir_funcao', f: { NOME: n }, i: { DO: f } });
const CALL = n => ({ t: 'chamar_funcao', f: { NOME: n } });
const LISTA = (n, i) => ({ t: 'criar_lista', f: { NOME: n, ITENS: i } });
const PERC = n => ({ t: 'percorrer_lista', f: { NOME: n } });
const ADD = (n, v) => ({ t: 'adicionar_item_lista', f: { NOME: n, VALOR: v } });

const SOL = {
  1: [[...M(4), T('virar_direita'), ...M(3)], []],
  2: [[REP(4, [T('mover_frente')])], []],
  3: [M(4), [{ t: 'quando_sino', n: [T('abrir_portao')] }]],
  4: [[SE('SIM', M(4))], []],
  5: [[T('mover_frente'), T('pegar_item'), T('mover_frente'), T('pegar_item'), T('mover_frente'), T('pegar_item'), T('mover_frente')], []],
  6: [[T('virar_direita'), REP(2, [T('mover_frente')]), T('virar_esquerda'), SE('SIM', M(4))], []],
  7: [[mostrar('Oi')], []],
  8: [[mostrar('a'), mostrar('b'), mostrar('c')], []],
  9: [[guardar('nome', 'Zig'), mv('nome')], []],
  10: [[SE('SIM', [mostrar('livre')])], []],
  11: [[REP(3, [mostrar('Oba')])], []],
  12: [[guardar('x', '5'), mv('x'), REP(1, [mostrar('oi')])], []],
  13: [[guardar('idade', '8'), mv('idade')], []],
  14: [[perg('Nome?', 'nome'), mv('nome')], []],
  15: [[perg('Nome?', 'nome'), mostrar('Bem-vindo(a),'), mv('nome')], []],
  16: [[ENQ('SIM', [mostrar('de novo')])], []],
  17: [[perg('Nome?', 'nome'), mv('nome'), perg('Cor?', 'cor'), mv('cor')], []],
  18: [[perg('Cidade?', 'c'), mv('c'), SE('SIM', [mostrar('fim')])], []],
  19: [[CALL('s'), CALL('s')], [DEF('s', [mostrar('Oi')])]],
  20: [[REP(3, [CALL('s')])], [DEF('s', [mostrar('Oi')])]],
  21: [[LISTA('f', 'a, b, c'), PERC('f')], []],
  22: [[LISTA('f', 'a, b'), ADD('f', 'c'), ADD('f', 'd'), PERC('f')], []],
  23: [[LISTA('f', 'a, b'), REP(2, [CALL('m')]), PERC('f')], [DEF('m', [mostrar('Fruta:')])]],
  24: [[perg('Nome?', 'n'), CALL('m'), LISTA('f', 'a, b, c'), PERC('f')], [DEF('m', [mostrar('Olá!')])]],
};

(async () => {
  const { browser, page, erros } = await abrirApp();
  const { estado, checar } = criarChecador();
  page.on('dialog', d => d.accept('resposta'));

  // ---- mapa inicial ----
  const mapa0 = await page.evaluate(() => ({
    titulo: document.querySelector('.cabecalho-mundo h1').textContent,
    nos: document.querySelectorAll('.fase-no').length,
    liberados: document.querySelectorAll('.fase-no.disponivel').length,
    divisores: [...document.querySelectorAll('.divisor-mundo')].map(d => d.textContent),
    overflowTrilha: getComputedStyle(document.getElementById('trilha')).overflowY,
  }));
  checar('Mapa inicial: 24 fases, só a 1 liberada, 4 divisores de mundo e trilha rolável', mapa0.nos === 24 && mapa0.liberados === 1 && mapa0.divisores.length === 4 && mapa0.overflowTrilha === 'auto', mapa0);

  // clique REAL na fase 1 do mapa (rolando a trilha até ela)
  await page.click('.fase-no.disponivel', { timeout: 4000 });
  await page.waitForTimeout(200);
  checar('Clique real na fase 1 do mapa abre a fase 1', await page.evaluate(() => faseAtual === 1 && !document.getElementById('tela-fase').classList.contains('escondida')));

  // ---- partida completa ----
  const log = [];
  for (let n = 1; n <= 24; n++) {
    const [principal, soltos] = SOL[n];
    const antes = await page.evaluate(() => jogador.xp);
    const r = await page.evaluate(async ({ n, principal, soltos }) => {
      const ok = faseAtual === n;
      const objetivoOk = document.getElementById('objetivo-texto').textContent === FASES_CONTEUDO[n].objetivo;
      const limpa = workspace.getAllBlocks(false).length === 1; // só o "Começar aqui"
      window.__montar(principal, soltos);
      await executarPrograma();
      return {
        ok, objetivoOk, limpa,
        fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'),
        estrelas: document.getElementById('fechamento-estrelas').textContent,
        proxLiberada: n < 24 ? FASES.find(f => f.numero === n + 1).disponivel : true,
        temProxBtn: !document.getElementById('btn-proxima-fase').classList.contains('escondida'),
      };
    }, { n, principal, soltos });
    const depois = await page.evaluate(() => jogador.xp);
    const certo = r.ok && r.objetivoOk && r.limpa && r.fechou && r.estrelas === '⭐⭐⭐' && depois - antes === 60 && r.proxLiberada && r.temProxBtn === (n < 24);
    if (!certo) log.push({ n, r, ganhou: depois - antes });
    if (n < 24) {
      try { await page.click('#btn-proxima-fase', { timeout: 4000 }); } catch (e) { log.push({ n, erroClique: e.message.split('\n')[0] }); break; }
      await page.waitForTimeout(120);
    }
  }
  checar('Partida 1→24 só com "Próxima fase →": cada fase abre limpa, conclui com 3 estrelas, +60 XP, libera a seguinte', log.length === 0, log.slice(0, 3));

  const fim = await page.evaluate(() => ({
    xp: jogador.xp, liberadas: FASES.filter(f => f.disponivel).length,
    emblemas: jogador.badges.length, fita: document.getElementById('fechamento-fita').textContent,
    recordes: Object.keys(melhorEstrelasPorFase).length,
  }));
  checar('Fim da partida: 1440 XP (24 × 60), 24 fases liberadas, 24 emblemas, 24 recordes, "MUNDO CONCLUÍDO"', fim.xp === 1440 && fim.liberadas === 24 && fim.emblemas === 24 && fim.recordes === 24 && fim.fita === 'MUNDO CONCLUÍDO', fim);

  // ---- mapa depois da partida ----
  await page.click('#btn-voltar-mapa-2', { timeout: 4000 });
  const mapa1 = await page.evaluate(() => ({
    liberados: document.querySelectorAll('.fase-no.disponivel').length,
    bloqueados: document.querySelectorAll('.fase-no.bloqueada').length,
    comEstrelas: [...document.querySelectorAll('.rotulo-fase')].filter(r => r.textContent.includes('⭐⭐⭐')).length,
    xpHud: document.getElementById('hud-xp').textContent,
  }));
  checar('Mapa final: 24 liberadas, 0 bloqueadas, 24 com ⭐⭐⭐, HUD com 1440', mapa1.liberados === 24 && mapa1.bloqueados === 0 && mapa1.comEstrelas === 24 && mapa1.xpHud === '1440', mapa1);

  // clique real numa fase do meio (13) com a trilha rolável: abre limpa
  const nos = await page.$$('.fase-no');
  await nos[12].scrollIntoViewIfNeeded();
  await nos[12].click({ timeout: 4000 });
  await page.waitForTimeout(200);
  const f13 = await page.evaluate(() => ({ fase: faseAtual, limpa: workspace.getAllBlocks(false).length === 1, painelCodigo: !document.getElementById('painel-codigo').classList.contains('escondida') }));
  checar('Clique real na fase 13 (Mundo 4) no mapa: abre limpa, com o painel de código', f13.fase === 13 && f13.limpa && f13.painelCodigo, f13);

  console.log('\nErros JS:', erros.length ? erros.slice(0, 3) : '(nenhum)');
  if (erros.length) { estado.falhas++; estado.total++; }
  await browser.close();
  console.log(`\n=== SUITE 5: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
