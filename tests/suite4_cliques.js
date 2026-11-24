const { abrirApp, criarChecador } = require('./helpers');
const M = n => Array.from({ length: n }, () => ({ t: 'mover_frente' }));
const F1 = [...M(4), { t: 'virar_direita' }, ...M(3)];

(async () => {
  const { estado, checar } = criarChecador();
  const viewports = [{ w: 1366, h: 768 }, { w: 1366, h: 650 }, { w: 1024, h: 600 }, { w: 800, h: 600 }, { w: 390, h: 740 }];

  for (const vp of viewports) {
    const { browser, page, erros } = await abrirApp({ viewport: { width: vp.w, height: vp.h } });
    const rot = `${vp.w}x${vp.h}`;

    // --- tela de "fase concluída" ---
    await page.evaluate(async (f1) => { iniciarFase(1); window.__montar(f1); await executarPrograma(); }, F1);
    await page.waitForTimeout(150);
    const geo = await page.evaluate(() => {
      const card = document.querySelector('#tela-fechamento .cartao-fechamento');
      const r = card.getBoundingClientRect();
      const botoes = [...card.querySelectorAll('.acoes-fechamento button')].filter(b => !b.classList.contains('escondida'));
      const dentroH = botoes.every(b => { const x = b.getBoundingClientRect(); return x.left >= r.left - 1 && x.right <= r.right + 1; });
      return { cartaoDentroDaTela: r.left >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
        overflowY: getComputedStyle(card).overflowY, botoesDentroDoCartao: dentroH, qtdBotoes: botoes.length };
    });
    checar(`[${rot}] fase concluída: cartão cabe na tela, rola se precisar, 3 botões dentro do cartão`, geo.cartaoDentroDaTela && geo.overflowY === 'auto' && geo.botoesDentroDoCartao && geo.qtdBotoes === 3, geo);

    // clique REAL em "Próxima fase →" (o Playwright rola até o botão e falha se algo estiver por cima)
    let cliqueOk = true, motivo = '';
    try { await page.click('#btn-proxima-fase', { timeout: 4000 }); } catch (e) { cliqueOk = false; motivo = e.message.split('\n')[0]; }
    await page.waitForTimeout(200);
    const aposProx = await page.evaluate(() => ({ fase: faseAtual, telaFase: !document.getElementById('tela-fase').classList.contains('escondida') }));
    checar(`[${rot}] clique real em "Próxima fase →" abre a fase 2`, cliqueOk && aposProx.fase === 2 && aposProx.telaFase, { motivo, aposProx });

    // volta na fase 1, conclui, e testa "Jogar de novo" e "Voltar ao mapa" com cliques reais
    await page.evaluate(async (f1) => { iniciarFase(1); window.__montar(f1); await executarPrograma(); }, F1);
    let ok2 = true, m2 = '';
    try { await page.click('#btn-jogar-de-novo', { timeout: 4000 }); } catch (e) { ok2 = false; m2 = e.message.split('\n')[0]; }
    await page.waitForTimeout(200);
    const aposJogar = await page.evaluate(() => !document.getElementById('tela-fase').classList.contains('escondida'));
    checar(`[${rot}] clique real em "Jogar de novo" volta pra fase`, ok2 && aposJogar, m2);

    await page.evaluate(async () => { await executarPrograma(); });
    let ok3 = true, m3 = '';
    try { await page.click('#btn-voltar-mapa-2', { timeout: 4000 }); } catch (e) { ok3 = false; m3 = e.message.split('\n')[0]; }
    const noMapa = await page.evaluate(() => !document.getElementById('tela-mapa').classList.contains('escondida'));
    checar(`[${rot}] clique real em "Voltar ao mapa" abre o mapa`, ok3 && noMapa, m3);

    // --- ajuda (fase 24 = a que mais tem blocos) ---
    await page.evaluate(() => { iniciarFase(24); });
    await page.waitForTimeout(150);
    let ok4 = true, m4 = '';
    try { await page.click('#btn-ajuda-blocos', { timeout: 4000 }); } catch (e) { ok4 = false; m4 = e.message.split('\n')[0]; }
    const aj = await page.evaluate(() => {
      const card = document.querySelector('#modal-ajuda .cartao-fechamento');
      const r = card.getBoundingClientRect();
      return { itens: document.querySelectorAll('.item-ajuda-bloco').length, dentro: r.left >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1, overflowY: getComputedStyle(card).overflowY, esperado: FASES_CONTEUDO[24].toolbox.length + 1 };
    });
    checar(`[${rot}] ajuda da fase 24: abre por clique real, lista ${aj.itens}/${aj.esperado} blocos, cabe na tela com rolagem`, ok4 && aj.itens === aj.esperado && aj.dentro && aj.overflowY === 'auto', { m4, aj });
    let ok5 = true, m5 = '';
    try { await page.click('#btn-fechar-ajuda', { timeout: 4000 }); } catch (e) { ok5 = false; m5 = e.message.split('\n')[0]; }
    const volta = await page.evaluate(() => !document.getElementById('tela-fase').classList.contains('escondida'));
    checar(`[${rot}] "Entendi!" alcançável (rolando) e fecha a ajuda`, ok5 && volta, m5);

    // --- fase 24 concluída: sem "Próxima fase" ---
    const ultima = await page.evaluate(async () => {
      window.__montar([{ t: 'perguntar_variavel', f: { PERGUNTA: 'n?', NOME: 'n' } }, { t: 'chamar_funcao', f: { NOME: 'm' } }, { t: 'criar_lista', f: { NOME: 'f', ITENS: 'a, b, c' } }, { t: 'percorrer_lista', f: { NOME: 'f' } }],
        [{ t: 'definir_funcao', f: { NOME: 'm' }, i: { DO: [{ t: 'mostrar_texto', f: { TEXTO: 'Oi' } }] } }]);
      return 1;
    });
    page.once('dialog', d => d.accept('Zé'));
    await page.evaluate(async () => { await executarPrograma(); });
    const fim = await page.evaluate(() => ({ fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'), semProxima: document.getElementById('btn-proxima-fase').classList.contains('escondida'), fita: document.getElementById('fechamento-fita').textContent }));
    checar(`[${rot}] última fase (24): mostra MUNDO CONCLUÍDO e esconde "Próxima fase"`, fim.fechou && fim.semProxima && fim.fita === 'MUNDO CONCLUÍDO', fim);

    if (erros.length) { checar(`[${rot}] sem erros de JavaScript`, false, erros.slice(0, 2)); }
    await browser.close();
  }
  console.log(`\n=== SUITE 4: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
