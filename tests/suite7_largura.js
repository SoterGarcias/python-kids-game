const { abrirApp, criarChecador } = require('./helpers');

(async () => {
  const { estado, checar } = criarChecador();
  for (const vp of [{ w: 1366, h: 768 }, { w: 1200, h: 700 }, { w: 800, h: 600 }]) {
    const { browser, page, erros } = await abrirApp({ viewport: { width: vp.w, height: vp.h } });
    const resultado = await page.evaluate(async () => {
      const problemas = [], larguras = {};
      let medidos = 0;
      for (let n = 1; n <= 24; n++) {
        iniciarFase(n);
        await new Promise(r => setTimeout(r, 60));
        const cfg = FASES_CONTEUDO[n];
        const div = workspace.getInjectionDiv().getBoundingClientRect();
        const flyW = workspace.getFlyout().getWidth();
        const limiteDir = div.right - 16;    // descontando a barra de rolagem
        const limiteEsq = div.left + flyW - 2; // o menu de blocos cobre a esquerda
        const inicio = workspace.getBlockById(workspace.inicioId);
        const contenedor = cfg.toolbox.includes('repetir_n_vezes') ? 'repetir_n_vezes' : (cfg.toolbox.includes('se_entao_senao') ? 'se_entao_senao' : null);

        for (const tipo of cfg.toolbox) {
          // 1) o bloco sozinho (sob "Começar aqui", ou solto se for uma "raiz")
          limparBlocos();
          const b = window.__criar(workspace, { t: tipo });
          if (b.previousConnection) inicio.nextConnection.connect(b.previousConnection); else b.moveBy(24, 150);
          await new Promise(r => setTimeout(r, 30));
          // largura só do bloco (sem a pilha abaixo): usa a caixa do primeiro "path" do próprio bloco
          const path = b.getSvgRoot().querySelector(':scope > .blocklyPath');
          const r = (path || b.getSvgRoot()).getBoundingClientRect();
          larguras[tipo] = Math.round(r.width);
          medidos++;
          if (r.right > limiteDir) problemas.push(`fase ${n}: "${tipo}" passa da borda direita em ${Math.round(r.right - limiteDir)}px (bloco ${Math.round(r.width)}px, espaço ${Math.round(limiteDir - r.left)}px)`);
          if (r.left < limiteEsq - 20) problemas.push(`fase ${n}: "${tipo}" escondido atrás do menu`);

          // 2) o mesmo bloco aninhado dentro de repetição / "se" (recuo maior)
          if (contenedor && tipo !== contenedor && b.previousConnection) {
            limparBlocos();
            const c = window.__criar(workspace, { t: contenedor });
            inicio.nextConnection.connect(c.previousConnection);
            const filho = window.__criar(workspace, { t: tipo });
            c.getInput(contenedor === 'repetir_n_vezes' ? 'DO' : 'ENTAO').connection.connect(filho.previousConnection);
            await new Promise(r => setTimeout(r, 30));
            const p2 = filho.getSvgRoot().querySelector(':scope > .blocklyPath');
            const r2 = (p2 || filho.getSvgRoot()).getBoundingClientRect();
            medidos++;
            if (r2.right > limiteDir) problemas.push(`fase ${n}: "${tipo}" DENTRO de "${contenedor}" passa da borda em ${Math.round(r2.right - limiteDir)}px`);
          }
        }
        limparBlocos();
      }
      return { problemas, larguras, medidos };
    });
    checar(`[${vp.w}x${vp.h}] todos os blocos (sozinhos e aninhados) cabem inteiros na área de blocos — ${resultado.medidos} medições`, resultado.problemas.length === 0, resultado.problemas.slice(0, 10));
    if (vp.w === 1366) {
      const ord = Object.entries(resultado.larguras).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}=${v}px`).join(', ');
      console.log('   (blocos mais largos: ' + ord + ')');
    }
    checar(`[${vp.w}x${vp.h}] sem erros de JavaScript`, erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }
  console.log(`\n=== SUITE 7: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})();
