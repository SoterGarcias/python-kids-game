const { abrirApp, criarChecador } = require('./helpers');
const M = n => Array.from({ length: n }, () => ({ t: 'mover_frente' }));
const T = t => ({ t });
const REP = (v, filhos) => ({ t: 'repetir_n_vezes', f: { VEZES: v }, i: { DO: filhos } });
const SE = (c, ent) => ({ t: 'se_entao_senao', f: { CONDICAO: c }, i: { ENTAO: ent } });

const VITORIA = {
  1: { principal: [...M(4), T('virar_direita'), ...M(3)] },
  2: { principal: [REP(4, [T('mover_frente')])] },
  3: { principal: M(4), soltos: [{ t: 'quando_sino', n: [T('abrir_portao')] }] },
  4: { principal: [SE('SIM', M(4))] },
  5: { principal: [T('mover_frente'), T('pegar_item'), T('mover_frente'), T('pegar_item'), T('mover_frente'), T('pegar_item'), T('mover_frente')] },
  6: { principal: [T('virar_direita'), REP(2, [T('mover_frente')]), T('virar_esquerda'), SE('SIM', M(4))] },
};

async function rodar(page, n, spec) {
  return page.evaluate(async ({ n, spec }) => {
    iniciarFase(n);
    window.__montar(spec.principal, spec.soltos);
    await executarPrograma();
    return {
      fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'),
      mensagem: document.getElementById('texto-missao').textContent,
      estrelas: document.getElementById('fechamento-estrelas').textContent,
      pos: { l: robo.linha, c: robo.coluna },
    };
  }, { n, spec });
}

(async () => {
  const { browser, page, erros } = await abrirApp();
  const { estado, checar } = criarChecador();

  // ---------- 1) Alinhamento: robô sempre no centro da célula (inclusive na maçã) ----------
  for (let n = 1; n <= 6; n++) {
    const r = await page.evaluate(async ({ n, spec }) => {
      iniciarFase(n);
      const centro = el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const roboEl = document.getElementById('robo');
      const dIni = dist(centro(roboEl), centro(celulasEl[INICIO_POS.linha][INICIO_POS.coluna]));
      window.__montar(spec.principal, spec.soltos);
      const orig = window.concluirFase; window.concluirFase = () => {};
      await executarPrograma();
      await new Promise(r => setTimeout(r, 450));
      const roboFinal = document.getElementById('robo'); // "Executar" recria a grade: pega o robô atual
      const dFim = dist(centro(roboFinal), centro(celulasEl[CHEGADA_POS.linha][CHEGADA_POS.coluna]));
      const grade = document.getElementById('grade').getBoundingClientRect();
      const rr = roboFinal.getBoundingClientRect();
      const dentro = rr.left >= grade.left && rr.right <= grade.right && rr.top >= grade.top && rr.bottom <= grade.bottom;
      window.concluirFase = orig;
      return { dIni, dFim, dentro };
    }, { n, spec: VITORIA[n] });
    checar(`Fase ${n}: robô centrado na célula inicial (${r.dIni.toFixed(1)}px) e na maçã ao chegar (${r.dFim.toFixed(1)}px), dentro da grade`, r.dIni < 1.5 && r.dFim < 1.5 && r.dentro, r);
  }

  // ---------- 2) Solução correta conclui (todas as fases do Mundo 2) ----------
  for (let n = 1; n <= 6; n++) {
    const r = await rodar(page, n, VITORIA[n]);
    checar(`Fase ${n}: solução correta conclui (${r.estrelas})`, r.fechou, r);
  }

  // ---------- 3) Casos que NÃO podem passar ----------
  const NEG = [
    [1, '3 movimentos só (não chega)', { principal: M(3) }, null],
    [2, 'chega só com "mover" simples, sem repetição', { principal: M(4) }, /repeti/i],
    [3, 'contorna o portão pela coluna ao lado', { principal: [T('virar_direita'), T('mover_frente'), T('virar_esquerda'), ...M(4), T('virar_esquerda'), T('mover_frente')] }, null],
    [3, 'abre o portão SEM o bloco de evento', { principal: [T('abrir_portao'), ...M(4)] }, /evento|sino/i],
    [3, 'bloco de evento vazio (portão fecha)', { principal: M(4), soltos: [{ t: 'quando_sino' }] }, null],
    [4, 'chega só com "mover", sem usar o "se"', { principal: M(4) }, /\bse\b/i],
    [4, '"se" em NÃO (o ramo do então não roda)', { principal: [SE('NAO', M(4))] }, null],
    [5, 'chega sem pegar nenhuma uva', { principal: M(4) }, /uva/i],
    [5, 'pega só 2 das 3 uvas', { principal: [T('mover_frente'), T('pegar_item'), T('mover_frente'), T('pegar_item'), T('mover_frente'), T('mover_frente')] }, /uva/i],
    [6, 'chega sem repetição nem decisão', { principal: [T('virar_direita'), ...M(2), T('virar_esquerda'), ...M(4)] }, /repeti|decis/i],
    [6, 'chega só com repetição (sem decisão)', { principal: [T('virar_direita'), REP(2, [T('mover_frente')]), T('virar_esquerda'), ...M(4)] }, /repeti|decis/i],
    [6, 'chega só com decisão (sem repetição)', { principal: [T('virar_direita'), ...M(2), T('virar_esquerda'), SE('SIM', M(4))] }, /repeti|decis/i],
  ];
  for (const [n, nome, spec, msg] of NEG) {
    const r = await rodar(page, n, spec);
    const okMsg = msg ? msg.test(r.mensagem) : true;
    checar(`Fase ${n} NÃO conclui: ${nome}`, !r.fechou && okMsg, r);
  }

  // ---------- 4) "Jogar de novo": reinicia o mundo, mantém os blocos, funciona de novo ----------
  for (const n of [1, 3, 5]) {
    const r = await page.evaluate(async ({ n, spec }) => {
      iniciarFase(n); window.__montar(spec.principal, spec.soltos);
      await executarPrograma();
      const antes = contarBlocosUsados();
      document.getElementById('btn-jogar-de-novo').click();
      await new Promise(r => setTimeout(r, 120));
      const centro = el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const telaVisivel = !document.getElementById('tela-fase').classList.contains('escondida');
      const dIni = dist(centro(document.getElementById('robo')), centro(celulasEl[INICIO_POS.linha][INICIO_POS.coluna]));
      const portaoFechado = !PORTAO || (!celulasEl[PORTAO.linha][PORTAO.coluna].classList.contains('aberto') && celulasEl[PORTAO.linha][PORTAO.coluna].textContent === '🚪');
      const uvas = document.querySelectorAll('#grade .celula.item').length;
      const missaoOk = document.getElementById('texto-missao').textContent === FASES_CONTEUDO[n].missao;
      const mesmosBlocos = contarBlocosUsados() === antes;
      await executarPrograma();
      const concluiuDeNovo = !document.getElementById('tela-fechamento').classList.contains('escondida');
      return { telaVisivel, dIni, portaoFechado, uvas, missaoOk, mesmosBlocos, concluiuDeNovo, itens: itensColetados };
    }, { n, spec: VITORIA[n] });
    const esperaUvas = n === 5 ? 3 : 0;
    checar(`Fase ${n}: "Jogar de novo" reinicia tudo (robô no início, portão fechado, uvas de volta), mantém blocos e conclui de novo`,
      r.telaVisivel && r.dIni < 1.5 && r.portaoFechado && r.uvas === esperaUvas && r.missaoOk && r.mesmosBlocos && r.concluiuDeNovo, r);
  }

  await browser.close();

  // ---------- 5) Regra do XP (app novo, para começar do zero) ----------
  {
    const { browser: b2, page: p2 } = await abrirApp();
    const par = [{ t: 'virar_direita' }, { t: 'virar_esquerda' }];
    const sol = (pares) => ({ principal: [...Array(pares).fill(par).flat(), ...VITORIA[1].principal] });
    const tentar = (spec) => p2.evaluate(async (spec) => {
      iniciarFase(1); window.__montar(spec.principal);
      await executarPrograma();
      return {
        xp: jogador.xp, recorde: melhorEstrelasPorFase[1],
        textoXP: document.getElementById('fechamento-xp').textContent,
        nota: document.getElementById('fechamento-nota-recorde').textContent,
        hud: document.getElementById('hud-xp').textContent,
      };
    }, spec);
    const a = await tentar(sol(2)); // 12 blocos -> 1 estrela
    checar('XP: 1ª vez com 1 estrela = 20 XP', a.xp === 20 && a.recorde === 1 && a.textoXP === '+20 XP', a);
    const b = await tentar(sol(1)); // 10 blocos -> 2 estrelas
    checar('XP: melhorou para 2 estrelas = soma só a diferença (40 XP)', b.xp === 40 && b.recorde === 2 && b.textoXP === '+20 XP', b);
    const mapaB = await p2.evaluate(() => document.querySelectorAll('.rotulo-fase')[0].textContent);
    checar('Mapa mostra as estrelas ATUAIS da fase 1 depois de melhorar (2 estrelas), mesmo com a fase 2 já liberada', /⭐⭐(?!⭐)/.test(mapaB), mapaB);
    const c = await tentar(sol(0)); // 8 blocos -> 3 estrelas
    checar('XP: melhorou para 3 estrelas (60 XP) e HUD atualizado', c.xp === 60 && c.recorde === 3 && c.hud === '60', c);
    const d = await tentar(sol(2)); // pior de novo
    checar('XP: repetir com resultado PIOR não muda os pontos (continua 60, "+0 XP")', d.xp === 60 && d.recorde === 3 && d.textoXP === '+0 XP' && /recorde/i.test(d.nota), d);
    const e = await tentar(sol(0)); // igual
    checar('XP: repetir com resultado IGUAL não muda os pontos', e.xp === 60 && e.textoXP === '+0 XP', e);

    // ---------- 6) Desbloqueio + botão "Próxima fase" ----------
    const u = await p2.evaluate(async () => {
      const fase2Liberada = FASES.find(f => f.numero === 2).disponivel;
      const btn = document.getElementById('btn-proxima-fase');
      const visivel = !btn.classList.contains('escondida');
      mostrarTela('tela-fechamento'); // garante a tela de fechamento visível para clicar
      btn.click();
      await new Promise(r => setTimeout(r, 150));
      const centro = el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      return {
        fase2Liberada, visivel, faseAtual,
        objetivo: document.getElementById('objetivo-texto').textContent === FASES_CONTEUDO[2].objetivo,
        telaFase: !document.getElementById('tela-fase').classList.contains('escondida'),
        robo: dist(centro(document.getElementById('robo')), centro(celulasEl[INICIO_POS.linha][INICIO_POS.coluna])) < 1.5,
      };
    });
    checar('Concluir a fase 1 libera a fase 2, mostra "Próxima fase →" e o clique abre a fase 2 certinha', u.fase2Liberada && u.visivel && u.faseAtual === 2 && u.objetivo && u.telaFase && u.robo, u);
    await b2.close();
  }

  console.log('\nErros JS:', erros.length ? erros.slice(0, 3) : '(nenhum)');
  if (erros.length) { estado.falhas++; estado.total++; }
  console.log(`\n=== SUITE 2: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
