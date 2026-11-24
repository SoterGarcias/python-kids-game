const { chromium } = require('playwright');
const fs = require('fs');

const path = require('path');
const { pathToFileURL } = require('url');
const RAIZ = path.resolve(__dirname, '..');
const BLOCKLY_DIR = path.join(__dirname, 'node_modules', 'blockly');
const APP_REAL = path.join(__dirname, '.app_real.html');

// Gera uma cópia do site que carrega o Blockly instalado via npm (em vez do CDN),
// para os testes rodarem com o Blockly de verdade, sem depender de internet.
function gerarCopiaReal() {
  let html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  html = html
    .replace(/https:\/\/unpkg\.com\/blockly@[^/]+\/blockly_compressed\.js/, pathToFileURL(path.join(BLOCKLY_DIR, 'blockly_compressed.js')).href)
    .replace(/https:\/\/unpkg\.com\/blockly@[^/]+\/msg\/en\.js/, pathToFileURL(path.join(BLOCKLY_DIR, 'msg', 'en.js')).href);
  if (html.includes('unpkg.com')) throw new Error('o site ainda referencia o CDN do Blockly');
  fs.writeFileSync(APP_REAL, html);
}

async function abrirApp(opts = {}) {
  gerarCopiaReal();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1366, height: 768 } });
  const erros = [];
  page.on('pageerror', e => { if (!/no supported source was found/.test(e.message)) erros.push(e.message + '\n' + (e.stack || '')); }); // (som de clique do Blockly não carrega sem internet)
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|no supported source was found/.test(m.text()))  /* recursos externos (fontes, sons) não carregam no sandbox sem internet */ erros.push('[console.error] ' + m.text());
  });
  await page.goto(pathToFileURL(APP_REAL).href, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__criar = function (ws, spec) {
      const b = ws.newBlock(spec.t);
      b.initSvg(); b.render();
      if (spec.f) for (const k in spec.f) b.setFieldValue(String(spec.f[k]), k);
      if (spec.i) for (const nome in spec.i) {
        const first = window.__cadeia(ws, spec.i[nome]);
        if (first) b.getInput(nome).connection.connect(first.previousConnection);
      }
      if (spec.n) { // blocos encadeados logo abaixo (ex.: "quando tocar o sino" -> "abrir portão")
        const first = window.__cadeia(ws, spec.n);
        if (first) b.nextConnection.connect(first.previousConnection);
      }
      return b;
    };
    window.__cadeia = function (ws, lista) {
      if (!lista || !lista.length) return null;
      const blocos = lista.map(s => window.__criar(ws, s));
      for (let i = 0; i < blocos.length - 1; i++) blocos[i].nextConnection.connect(blocos[i + 1].previousConnection);
      return blocos[0];
    };
    // principal: cadeia sob "Começar aqui"; soltos: blocos independentes (função, sino...)
    window.__montar = function (principal, soltos) {
      const ws = workspace;
      const inicio = ws.getBlockById(ws.inicioId);
      const first = window.__cadeia(ws, principal);
      if (first) inicio.nextConnection.connect(first.previousConnection);
      (soltos || []).forEach((spec, idx) => { const b = window.__criar(ws, spec); b.moveBy(320, 40 + idx * 150); });
    };
  });
  return { browser, page, erros };
}

function criarChecador() {
  const estado = { falhas: 0, total: 0 };
  const checar = (nome, cond, detalhe) => {
    estado.total++;
    console.log((cond ? 'OK     ' : 'FALHOU ') + nome + (!cond && detalhe !== undefined ? '  -> ' + JSON.stringify(detalhe) : ''));
    if (!cond) estado.falhas++;
  };
  return { estado, checar };
}

module.exports = { abrirApp, criarChecador };
