const { abrirApp, criarChecador } = require('./helpers');

async function rectDoBlocoMenu(page, tipo) {
  return page.evaluate((tipo) => {
    const b = workspace.getFlyout().getWorkspace().getTopBlocks(false).find(x => x.type === tipo);
    if (!b) return null;
    const r = b.getSvgRoot().getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, tipo);
}
async function arrastar(page, tipo, alvo) { // alvo = canto superior esquerdo onde o bloco deve ficar
  const r = await rectDoBlocoMenu(page, tipo);
  if (!r) throw new Error('bloco não está no menu: ' + tipo);
  const gx = r.left + 10, gy = r.top + r.height / 2;
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(gx + 30, gy + 12, { steps: 4 });
  await page.mouse.move(alvo.x + 10, alvo.y + r.height / 2, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(220);
}
const baseDaPilha = page => page.evaluate(() => {
  const r = workspace.getBlockById(workspace.inicioId).getSvgRoot().getBoundingClientRect(); // inclui a pilha toda
  return { x: r.left, y: r.bottom };
});

(async () => {
  const { estado, checar } = criarChecador();

  // ===== A) Arrastar do menu (mouse real) na fase 1, e executar =====
  {
    const { browser, page, erros } = await abrirApp();
    await page.evaluate(() => iniciarFase(1)); await page.waitForTimeout(250);
    for (const tipo of ['mover_frente', 'virar_direita', 'mover_frente']) await arrastar(page, tipo, await baseDaPilha(page));
    const cadeia = await page.evaluate(() => { const t = []; let b = workspace.getBlockById(workspace.inicioId).getNextBlock(); while (b) { t.push(b.type); b = b.getNextBlock(); } return t; });
    checar('Arrastar 3 blocos do menu com o mouse: encaixam em sequência embaixo de "Começar aqui"', JSON.stringify(cadeia) === JSON.stringify(['mover_frente', 'virar_direita', 'mover_frente']), cadeia);
    await page.click('#btn-executar');
    await page.waitForFunction(() => !executando, null, { timeout: 8000 });
    const pos = await page.evaluate(() => ({ l: robo.linha, c: robo.coluna, d: robo.direcao }));
    checar('Clique real em Executar: o robô andou (↑), virou à direita e andou de novo → célula (3,1) olhando pra direita', pos.l === 3 && pos.c === 1 && pos.d === 90, pos);
    checar('Sem erros de JavaScript no arrastar/executar', erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }

  // ===== B) Fase 4: bloco "se", menu "sim", blocos dentro do "então" (tudo com o mouse) =====
  {
    const { browser, page, erros } = await abrirApp();
    await page.evaluate(() => iniciarFase(4)); await page.waitForTimeout(250);
    await arrastar(page, 'se_entao_senao', await baseDaPilha(page));
    const seInfo = await page.evaluate(() => {
      const b = workspace.getBlockById(workspace.inicioId).getNextBlock();
      if (!b || b.type !== 'se_entao_senao') return { ok: false };
      const div = workspace.getInjectionDiv().getBoundingClientRect();
      const ent = b.getInput('ENTAO').connection;
      return { ok: true, id: b.id, divRight: div.right, divLeft: div.left, flyW: workspace.getFlyout().getWidth() };
    });
    checar('Fase 4: arrastar o bloco "se" com o mouse encaixa embaixo de "Começar aqui"', seInfo.ok, seInfo);

    // texto do bloco inteiro visível (reclamação "campo muito estreito")
    const larg = await page.evaluate((id) => {
      const b = workspace.getBlockById(id);
      const svgRect = b.getSvgRoot().getBoundingClientRect();
      const div = workspace.getInjectionDiv().getBoundingClientRect();
      const cabecalho = b.getInput('').connection ? 0 : 0;
      const campo = b.getField('CONDICAO').getSvgRoot().getBoundingClientRect();
      return { campoDireita: campo.right, divDireita: div.right, blocoDireita: svgRect.right, visivel: campo.right <= div.right - 14 && svgRect.right <= div.right - 14 && svgRect.left >= div.left + workspace.getFlyout().getWidth() - 2 };
    }, seInfo.id);
    checar('Fase 4: o bloco "se" e o campo "sim/não" aparecem INTEIROS dentro da área de blocos (nada cortado)', larg.visivel, larg);

    // clique real no campo e escolher "sim" no menu
    const campoRect = await page.evaluate((id) => { const r = workspace.getBlockById(id).getField('CONDICAO').getSvgRoot().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, seInfo.id);
    await page.mouse.click(campoRect.x, campoRect.y);
    await page.waitForSelector('.blocklyDropDownDiv .blocklyMenuItem', { timeout: 3000 });
    await page.locator('.blocklyDropDownDiv .blocklyMenuItem', { hasText: /^\s*sim\s*$/ }).first().click();
    await page.waitForTimeout(200);
    const valor = await page.evaluate((id) => workspace.getBlockById(id).getFieldValue('CONDICAO'), seInfo.id);
    checar('Fase 4: clicar no campo abre o menu e escolher "sim" muda a condição para SIM', valor === 'SIM', valor);

    // arrastar 2 "mover" para dentro do "então"
    for (let i = 0; i < 2; i++) {
      const alvo = await page.evaluate((id) => {
        const b = workspace.getBlockById(id);
        const con = b.getInput('ENTAO').connection;
        // pega o fim da pilha que já está dentro do "então" (se houver)
        let ultimo = con.targetBlock();
        if (ultimo) {
          while (ultimo.getNextBlock()) ultimo = ultimo.getNextBlock();
          const r = ultimo.getSvgRoot().getBoundingClientRect();
          return { x: r.left, y: r.bottom };
        }
        const o = workspace.getOriginOffsetInPixels();
        const d = workspace.getInjectionDiv().getBoundingClientRect();
        return { x: d.left + o.x + con.x * workspace.scale, y: d.top + o.y + con.y * workspace.scale };
      }, seInfo.id);
      await arrastar(page, 'mover_frente', alvo);
    }
    const dentro = await page.evaluate((id) => { const t = []; let b = workspace.getBlockById(id).getInput('ENTAO').connection.targetBlock(); while (b) { t.push(b.type); b = b.getNextBlock(); } return t; }, seInfo.id);
    checar('Fase 4: arrastar 2 blocos "mover" com o mouse para dentro do "então" — encaixam lá dentro', JSON.stringify(dentro) === JSON.stringify(['mover_frente', 'mover_frente']), dentro);

    await page.waitForTimeout(150);
    const cod = await page.evaluate(() => document.getElementById('codigo-python').textContent);
    await page.click('#btn-executar');
    await page.waitForFunction(() => !executando, null, { timeout: 8000 });
    const pos = await page.evaluate(() => ({ l: robo.linha, c: robo.coluna }));
    checar('Fase 4: Executar → o robô andou 2 casas pra cima (2,2) usando o "se" configurado com o mouse', pos.l === 2 && pos.c === 2, pos);
    checar('Fase 4: sem erros de JavaScript', erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }

  // ===== C) Digitar num campo de texto (fase 7) — código Python atualiza sozinho =====
  {
    const { browser, page, erros } = await abrirApp();
    await page.evaluate(() => iniciarFase(7)); await page.waitForTimeout(250);
    await arrastar(page, 'mostrar_texto', await baseDaPilha(page));
    const campo = await page.evaluate(() => { const b = workspace.getBlockById(workspace.inicioId).getNextBlock(); const r = b.getField('TEXTO').getSvgRoot().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(campo.x, campo.y);
    await page.waitForSelector('input.blocklyHtmlInput', { timeout: 3000 });
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Olá, mundo!');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const cod = await page.evaluate(() => document.getElementById('codigo-python').textContent);
    checar('Digitar no campo do bloco "mostrar": o código Python ao lado atualiza sozinho → print("Olá, mundo!")', cod === 'print("Olá, mundo!")', cod);
    await page.click('#btn-executar');
    await page.waitForFunction(() => !executando, null, { timeout: 8000 });
    const r = await page.evaluate(() => ({ fechou: !document.getElementById('tela-fechamento').classList.contains('escondida'), saida: linhasConsole.slice() }));
    checar('Fase 7 por completo com o mouse e o teclado: mensagem digitada aparece na saída e a fase conclui', r.fechou && r.saida[0] === 'Olá, mundo!', r);
    checar('Sem erros de JavaScript', erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }

  // ===== D) Rolagem: colocar blocos além da área visível e alcançá-los =====
  {
    const { browser, page, erros } = await abrirApp();
    await page.evaluate(() => iniciarFase(1)); await page.waitForTimeout(250);
    const antes = await page.evaluate(() => { const m = workspace.getMetrics(); return { sw: m.scrollWidth, vw: m.viewWidth }; });
    const id = await page.evaluate(() => { const b = window.__criar(workspace, { t: 'mover_frente' }); b.moveBy(1800, 1500); return b.id; });
    await page.waitForTimeout(250);
    const depois = await page.evaluate(() => { const m = workspace.getMetrics(); return { sw: m.scrollWidth, sh: m.scrollHeight, vw: m.viewWidth, vh: m.viewHeight }; });
    const barras = await page.evaluate(() => [...document.querySelectorAll('#blocklyDiv .blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle')].map(h => { const r = h.getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
    checar('Colocar um bloco bem longe (x=1800, y=1500): a área de trabalho cresce (rolagem ilimitada) e as barras de rolagem aparecem', depois.sw > antes.sw && depois.sw > depois.vw && depois.sh > depois.vh && barras.length >= 2 && barras.every(Boolean), { antes, depois, barras });

    // arrastar o fundo com o mouse para rolar
    const x0 = await page.evaluate(() => workspace.scrollX);
    const centro = await page.evaluate(() => { const d = workspace.getInjectionDiv().getBoundingClientRect(); return { x: d.left + d.width * 0.65, y: d.top + d.height * 0.5 }; });
    await page.mouse.move(centro.x, centro.y); await page.mouse.down();
    await page.mouse.move(centro.x - 150, centro.y - 100, { steps: 8 }); await page.mouse.up();
    const x1 = await page.evaluate(() => workspace.scrollX);
    checar('Arrastar o fundo da área de blocos com o mouse rola a área', Math.abs(x1 - x0) > 50, { x0, x1 });

    // roda do mouse
    const y0 = await page.evaluate(() => workspace.scrollY);
    await page.mouse.move(centro.x, centro.y); await page.mouse.wheel(0, 250); await page.waitForTimeout(150);
    const y1 = await page.evaluate(() => workspace.scrollY);
    checar('Girar a roda do mouse sobre a área de blocos rola na vertical', Math.abs(y1 - y0) > 20, { y0, y1 });

    // alcançar o bloco distante
    await page.evaluate((id) => workspace.centerOnBlock(id), id); await page.waitForTimeout(250);
    const vis = await page.evaluate((id) => { const r = workspace.getBlockById(id).getSvgRoot().getBoundingClientRect(); const d = workspace.getInjectionDiv().getBoundingClientRect(); return r.left >= d.left && r.right <= d.right && r.top >= d.top && r.bottom <= d.bottom; }, id);
    checar('Rolando, dá pra chegar no bloco distante e ele fica inteiro visível', vis);

    checar('Botões de zoom e lixeira existem na área de blocos', await page.evaluate(() => !!document.querySelector('#blocklyDiv .blocklyZoom') && !!document.querySelector('#blocklyDiv .blocklyTrash')));
    checar('Sem erros de JavaScript na rolagem', erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }

  // ===== E) "Limpar blocos" (clique real) com programa aninhado =====
  {
    const { browser, page, erros } = await abrirApp();
    await page.evaluate(() => { iniciarFase(23); window.__montar([{ t: 'criar_lista', f: { NOME: 'f', ITENS: 'a, b' } }, { t: 'repetir_n_vezes', f: { VEZES: 2 }, i: { DO: [{ t: 'chamar_funcao', f: { NOME: 'm' } }] } }], [{ t: 'definir_funcao', f: { NOME: 'm' }, i: { DO: [{ t: 'mostrar_texto' }] } }]); });
    await page.waitForTimeout(250);
    const antes = await page.evaluate(() => workspace.getAllBlocks(false).length);
    await page.click('#btn-limpar'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ blocos: workspace.getAllBlocks(false).length, inicio: !!workspace.getBlockById(workspace.inicioId), codigo: document.getElementById('codigo-python').textContent }));
    checar(`"Limpar blocos" (clique real): apaga os ${antes - 1} blocos (inclusive os aninhados e a função solta), mantém "Começar aqui" e limpa o código`, r.blocos === 1 && r.inicio && /seu código vai aparecer/.test(r.codigo), r);
    checar('Sem erros de JavaScript ao limpar', erros.length === 0, erros.slice(0, 2));
    await browser.close();
  }

  console.log(`\n=== SUITE 6: ${estado.total - estado.falhas}/${estado.total} OK ===`);
  process.exit(estado.falhas ? 1 : 0);
})().catch(e => { console.error('ERRO NO TESTE:', e.message); process.exit(2); });
