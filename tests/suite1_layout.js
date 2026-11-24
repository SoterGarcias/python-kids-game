const { abrirApp, criarChecador } = require('./helpers');
(async () => {
  const { estado, checar } = criarChecador();
  const viewports = [
    { w: 1366, h: 768 }, { w: 1366, h: 650 }, { w: 1024, h: 600 }, { w: 800, h: 600 }, { w: 390, h: 740 },
  ];

  for (const vp of viewports) {
    // página nova em cada tamanho: o app precisa iniciar JÁ com a janela daquele tamanho
    const { browser, page, erros } = await abrirApp({ viewport: { width: vp.w, height: vp.h } });
    const problemas = [];
    for (let n = 1; n <= 24; n++) {
      erros.length = 0;
      await page.evaluate((num) => { iniciarFase(num); }, n);
      await page.waitForTimeout(90);
      const r = await page.evaluate((num) => {
        const rect = el => el.getBoundingClientRect();
        const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        const tela = document.getElementById('tela-fase');
        const hud = rect(document.querySelector('.hud'));
        const div = rect(document.getElementById('blocklyDiv'));
        const out = { n: num, p: [] };

        // 1) objetivo presente
        const obj = document.getElementById('objetivo-texto').textContent.trim();
        if (!obj) out.p.push('objetivo vazio');
        const missao = document.getElementById('texto-missao').textContent.trim();
        if (!missao) out.p.push('missão vazia');

        // 2) nenhum botão/chip sobreposto ao HUD de XP (com a tela rolada para o topo)
        tela.scrollTop = 0;
        const hud2 = rect(document.querySelector('.hud'));
        tela.querySelectorAll('button, .objetivo-chip').forEach(el => {
          if (el.offsetParent === null) return;
          if (inter(rect(el), hud2)) out.p.push('sobrepõe HUD: ' + (el.id || el.className));
        });

        // 3) Blockly: não pode estar com overflow hidden (cortaria a barra de rolagem) e precisa ter tamanho útil
        if (getComputedStyle(document.getElementById('blocklyDiv')).overflow === 'hidden') out.p.push('blocklyDiv com overflow hidden');
        if (div.height < 250) out.p.push('blocklyDiv baixo: ' + Math.round(div.height));
        if (div.width < 300) out.p.push('blocklyDiv estreito: ' + Math.round(div.width));
        const sbs = document.querySelectorAll('#blocklyDiv .blocklyScrollbarHandle').length;
        if (sbs < 2) out.p.push('sem barras de rolagem do Blockly (' + sbs + ')');

        // 4) Flyout: blocos do menu inteiros dentro da área do Blockly (horizontalmente) e sobra espaço de trabalho
        const fly = workspace.getFlyout();
        const flyW = fly.getWidth();
        const minEspaco = window.innerWidth < 600 ? 100 : 200;
        if (div.width - flyW < minEspaco) out.p.push('pouco espaço de trabalho: ' + Math.round(div.width - flyW));
        document.querySelectorAll('#blocklyDiv .blocklyFlyout .blocklyDraggable').forEach(el => {
          const r = rect(el);
          if (r.right > div.right + 1 || r.left < div.left - 1) out.p.push('bloco do menu cortado');
        });

        // 5) painel direito: grade/código inteiro dentro da tela, sem estourar a coluna
        const cfg = FASES_CONTEUDO[num];
        const pd = rect(document.querySelector('.painel-direita'));
        if (cfg.modo === 'codigo') {
          const pc = rect(document.getElementById('painel-codigo'));
          if (pc.width < 200 || pc.height < 150) out.p.push('painel de código pequeno');
        } else {
          const g = rect(document.getElementById('grade'));
          if (g.right > pd.right + 1 || g.left < pd.left - 1) out.p.push('grade estoura o painel (' + Math.round(g.width) + ' > ' + Math.round(pd.width) + ')');
        }

        // 6) sem rolagem horizontal "escondida"
        if (tela.scrollWidth > tela.clientWidth + 1) out.p.push('rolagem horizontal: ' + tela.scrollWidth + ' > ' + tela.clientWidth);

        // 7) alcançar os botões com a rolagem vertical
        tela.scrollTop = tela.scrollHeight;
        const ex = rect(document.getElementById('btn-executar'));
        if (ex.top < -1 || ex.bottom > window.innerHeight + 1) out.p.push('Executar inalcançável');
        tela.scrollTop = 0;
        const vm = rect(document.getElementById('btn-voltar-mapa'));
        if (vm.top < -1 || vm.bottom > window.innerHeight + 1) out.p.push('Voltar ao mapa inalcançável');
        return out;
      }, n);
      if (erros.length) r.p.push('erro JS: ' + erros[0].split('\n')[0]);
      if (r.p.length) problemas.push('fase ' + n + ': ' + [...new Set(r.p)].join('; '));
    }
    checar(`Layout ${vp.w}x${vp.h} (24 fases)`, problemas.length === 0, problemas.slice(0, 8));
    if (problemas.length > 8) console.log('   ... e mais ' + (problemas.length - 8) + ' fases com problemas');
    await browser.close();
  }
  console.log(`\n=== SUITE 1: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
