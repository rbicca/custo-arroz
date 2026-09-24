// Confere os cálculos. Uso: node test-calc.js
// Valores de referência: planilha enviada em 24/09/2026 (imagem), com uma
// diferença combinada: o Funrural é valor fixo em R$ por saco (a planilha
// ainda calcula 1,65 como %).
const Calc = require('./calc.js');

const taxas = { funrural: 1.65, comissao: 1, cdo: 0.93, frete: 4.5, custoQbr: 1.3, embalagem: 4.5, icms: 2.5, credito: 1, despesa: 0, freteFardo: 14, margem: 88 };
const TIPOS = [
  { inteiro: 28, quebrado: 2 },
  { inteiro: 26.5, quebrado: 3.5 },
  { inteiro: 23.5, quebrado: 6.5 },
  { inteiro: 10.5, quebrado: 19.5 },
];

let falhas = 0;
function confere(nome, obtido, esperado, tol = 1e-9) {
  const ok = Math.abs(obtido - esperado) < tol;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'ERRO'} ${nome}: ${obtido.toFixed(4)} (esperado ${esperado.toFixed(4)})`);
}

// Compra, linha 8: 86,50 + 1,65 + 0,865 + 0,93 + 4,50 = 94,445; − 5 kg × 0,30 = 92,945; ÷ 32,5 kg
const lote = { inteiro: 65, quebrado: 10, preco: 86.5, vendaQ: 0.3 };
const c = Calc.compra(taxas, lote);
confere('F8 Funrural (fixo)', c.funrural, 1.65);
confere('G8 Comissão', c.comissao, 0.865);
confere('J8 Custo do saco', c.custoSaco, 94.445);
confere('K8 Venda do quebrado', c.vendaQuebrado, 1.5);
confere('L8 Custo líquido', c.liquido, 92.945);
confere('N8 Custo kg inteiro', c.custoKg, 92.945 / 32.5);

// Conta ao contrário: o mesmo lote tem que dar o mesmo preço de volta.
const volta = Calc.comparar(taxas, c.custoKg, lote.vendaQ, { inteiro: 65, quebrado: 10, frete: 4.5 });
confere('Ida e volta (preço 86,50)', volta.preco, 86.5);

// Linha 10: lote 60% / 12%, frete 3,40.
const r = Calc.comparar(taxas, c.custoKg, lote.vendaQ, { inteiro: 60, quebrado: 12, frete: 3.4 });
confere('D10 Preço máximo', r.preco, (30 * c.custoKg + 6 * 0.3 - 3.4 - 0.93 - 1.65) / 1.01);

// Fardos: com o custo do kg da imagem (2,8537…) os preços têm que bater com a imagem.
const custoKgImagem = 92.7462 / 32.5;
const esperados = [116.4823, 113.8339, 108.5371, 85.5843];
TIPOS.forEach((tipo, i) => confere(`K${20 + i} Tipo ${i + 1}`, Calc.fardo(taxas, custoKgImagem, tipo).preco, esperados[i], 5e-4));

console.log(falhas ? `\n${falhas} diferença(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
