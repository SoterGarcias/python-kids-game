// Roda as 7 suítes em sequência e mostra o resultado final.
const { spawnSync } = require('child_process');
const path = require('path');
const suites = ['suite1_layout', 'suite2_mundo2', 'suite3_codigo', 'suite4_cliques', 'suite5_partida', 'suite6_interacao', 'suite7_largura'];
let falhas = 0;
for (const s of suites) {
  console.log(`\n################ ${s}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, s + '.js')], { stdio: 'inherit' });
  if (r.status !== 0) falhas++;
}
console.log(falhas ? `\n❌ ${falhas} suíte(s) com falha` : '\n✅ Todas as suítes passaram');
process.exit(falhas ? 1 : 0);
