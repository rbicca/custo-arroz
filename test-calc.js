// Confere os cálculos contra a planilha enviada em 24/09/2026 (imagem).
// Uso: node test-calc.js
const Calc = require('./calc.js');

const taxas = { funrural: 1.65, comissao: 1, cdo: 0.93, frete: 4.5, custoQbr: 1.3, embalagem: 4.5, icms: 2.5, credito: 1, despesa: 0, freteFardo: 14, margem: 88 };
const TIPOS = [
  { inteiro: 28, quebrado: 2 },
  { inteiro: 26.5, quebrado: 3.5 },
  { inteiro: 23.5, quebrado: 6.5 },
  { inteiro: 10.5, quebrado: 19.5 },
];

// A imagem mostra 4 casas decimais.
const TOL = 5e-5;
let falhas = 0;
function confere(nome, obtido, esperado) {
  const ok = Math.abs(obtido - esperado) < TOL;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'ERRO'} ${nome}: ${obtido.toFixed(4)} (planilha ${esperado.toFixed(4)})`);
}

const lote = { inteiro: 65, quebrado: 10, preco: 86.5, vendaQ: 0.3 };
const c = Calc.compra(taxas, lote);
confere('F8 Funrural 1,65% por dentro', c.funrural, 1.4512);
confere('G8 Comissão', c.comissao, 0.865);
confere('H8 CDO fixo', c.cdo, 0.93);
confere('J8 Custo do saco', c.custoSaco, 94.2462);
confere('K8 Venda do quebrado', c.vendaQuebrado, 1.5);
confere('L8 Custo líquido', c.liquido, 92.7462);
confere('N8 Custo kg inteiro', c.custoKg, 2.8537);

// Linha 10: lote 60% / 12%, frete 3,40.
const r = Calc.comparar(taxas, c.custoKg, lote.vendaQ, { inteiro: 60, quebrado: 12, frete: 3.4 });
confere('J10 Custo', r.bruto, 87.4119);
confere('D10 Preço máximo', r.preco, 80.9152);

// Ida e volta: o mesmo lote tem que devolver o mesmo preço.
confere('Ida e volta (86,50)', Calc.comparar(taxas, c.custoKg, lote.vendaQ, { inteiro: 65, quebrado: 10, frete: 4.5 }).preco, 86.5);

const esperados = [116.4823, 113.8339, 108.5371, 85.5843];
TIPOS.forEach((tipo, i) => confere(`K${20 + i} Tipo ${i + 1}`, Calc.fardo(taxas, c.custoKg, tipo).preco, esperados[i]));

// A versão do app e a do service worker precisam ser iguais, senão o celular
// não percebe a atualização ou mostra o número errado no rodapé.
const fs = require('fs');
const versao = (arq) => (fs.readFileSync(__dirname + '/' + arq, 'utf8').match(/const VERSAO = '([^']+)'/) || [])[1];
const vApp = versao('app.js'), vSw = versao('sw.js');
const vOk = Boolean(vApp) && vApp === vSw;
if (!vOk) falhas++;
console.log(`${vOk ? 'OK  ' : 'ERRO'} Versão: app.js ${vApp} / sw.js ${vSw}`);

console.log(falhas ? `\n${falhas} diferença(s)` : '\nTudo igual à planilha.');
process.exit(falhas ? 1 : 0);
