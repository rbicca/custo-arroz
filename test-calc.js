// Confere os cálculos contra os valores que o Excel mostra hoje na planilha.
// Uso: node test-calc.js
const Calc = require('./calc.js');

const taxas = { funrural: 1.5, comissao: 1, cdo: 0.89, frete: 4.5, custoQbr: 1.8, embalagem: 3.5, icms: 2.4, credito: 0, despesa: 0, freteFardo: 21, margem: 89 };

let falhas = 0;
function confere(nome, obtido, esperado) {
  const ok = Math.abs(obtido - esperado) < 1e-9;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'ERRO'} ${nome}: ${obtido} (planilha ${esperado})`);
}

const c = Calc.compra(taxas, { inteiro: 65, quebrado: 10, preco: 75, vendaQ: 1.2 });
confere('F8 Funrural', c.funrural, 1.1421319796954208);
confere('J8 Custo', c.custoSaco, 82.28213197969542);
confere('K8 Quebrado', c.vendaQuebrado, 6);
confere('L8 Custo líquido', c.liquido, 76.28213197969542);
confere('N8 Custo kg inteiro', c.custoKg, 2.3471425224521667);

const r = Calc.comparar(taxas, c.custoKg, 1.2, { inteiro: 60, quebrado: 12, frete: 3.4 });
confere('J10 Custo', r.bruto, 77.614275673565);
confere('D10 Preço máximo', r.preco, 71.51994012819877);

const esperados = [108.11234902096705, 107.19019870222743, 105.34589806474823, 100.12037959189044];
Calc.TIPOS.forEach((tipo, i) => confere(`K${20 + i} ${tipo.nome}`, Calc.fardo(taxas, c.custoKg, tipo).preco, esperados[i]));

console.log(falhas ? `\n${falhas} diferença(s)` : '\nTudo igual à planilha.');
process.exit(falhas ? 1 : 0);
