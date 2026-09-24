// Confere como os valores guardados são carregados e convertidos.
// Uso: node test-dados.js
const Dados = require('./dados.js');

const PADRAO = {
  taxas: { funrural: 1.65, comissao: 1, cdo: 0.93, frete: 4.5 },
  compra: { inteiro: 65, preco: 86.5 },
  venda: { custoKg: null },
  tipos: [{ inteiro: 28, quebrado: 2 }, { inteiro: 10.5, quebrado: 19.5 }],
};

let falhas = 0;
function confere(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'ERRO'} ${nome}${ok ? '' : `\n     obtido:   ${JSON.stringify(obtido)}\n     esperado: ${JSON.stringify(esperado)}`}`);
}
// Simula o localStorage do aparelho.
const aparelho = (guardado) => (chave) => (chave in guardado ? guardado[chave] : null);

// 1. Aparelho novo: valores iniciais.
let r = Dados.carregar(aparelho({}), PADRAO);
confere('Aparelho novo usa os valores iniciais', r.origem, 'inicial');
confere('  e os valores são os iniciais', r.dados.compra, PADRAO.compra);

// 2. Quem já usa a versão publicada (chave custoArroz.v4) não perde nada.
const v4 = { taxas: { funrural: 2, comissao: 1.5, cdo: 1.1, frete: 5 }, compra: { inteiro: 60, preco: 90 }, venda: { custoKg: 3.1 }, tipos: [{ inteiro: 27, quebrado: 3 }, { inteiro: 12, quebrado: 18 }] };
r = Dados.carregar(aparelho({ 'custoArroz.v4': JSON.stringify(v4) }), PADRAO);
confere('Valores da versão 1.1 (v4) são aproveitados', r.origem, 'v4');
confere('  taxas mantidas', r.dados.taxas, v4.taxas);
confere('  compra mantida', r.dados.compra, v4.compra);
confere('  custo do kg digitado mantido', r.dados.venda.custoKg, 3.1);
confere('  fardos mantidos', r.dados.tipos, v4.tipos);
confere('  marcados com o formato atual', r.dados.formato, Dados.FORMATO);

// 3. Chaves de antes da v4 (significado diferente) são ignoradas.
r = Dados.carregar(aparelho({ 'custoArroz.v3': JSON.stringify({ taxas: { funrural: 0.93, cdo: 1.65 } }) }), PADRAO);
confere('Chave v3 (Funrural/CDO trocados) é ignorada', r.origem, 'inicial');

// 4. A chave nova tem prioridade sobre a antiga.
const atual = { formato: 1, taxas: { funrural: 3 } };
r = Dados.carregar(aparelho({ custoArroz: JSON.stringify(atual), 'custoArroz.v4': JSON.stringify(v4) }), PADRAO);
confere('Chave nova tem prioridade', [r.origem, r.dados.taxas.funrural], ['atual', 3]);

// 5. Campo novo numa versão futura recebe o valor inicial; os outros ficam.
confere('Campo que falta recebe o valor inicial', r.dados.taxas, { funrural: 3, comissao: 1, cdo: 0.93, frete: 4.5 });

// 6. Valores estragados voltam ao inicial só naquele campo.
const estragado = { formato: 1, taxas: { funrural: 'abc', comissao: null, cdo: 2 }, compra: { inteiro: NaN }, venda: { custoKg: 'x' }, tipos: 'lixo' };
r = Dados.carregar(aparelho({ custoArroz: JSON.stringify(estragado) }), PADRAO);
confere('Texto no lugar de número volta ao inicial', r.dados.taxas, { funrural: 1.65, comissao: 1, cdo: 2, frete: 4.5 });
confere('Custo do kg inválido volta a "usar o da compra"', r.dados.venda.custoKg, null);
confere('Lista de fardos estragada volta à inicial', r.dados.tipos, PADRAO.tipos);

// 7. Texto guardado corrompido não trava o app.
r = Dados.carregar(aparelho({ custoArroz: '{isto não é json' }), PADRAO);
confere('JSON corrompido usa os valores iniciais', r.origem, 'inicial');

// 8. Conversão entre formatos (exemplo: formato 2 renomeia um campo).
const conversoes = { 1: (d) => { d.taxas.cdoFixo = d.taxas.cdo; delete d.taxas.cdo; return d; } };
const PADRAO2 = { ...PADRAO, taxas: { funrural: 1.65, comissao: 1, cdoFixo: 0.93, frete: 4.5 } };
r = Dados.carregar(aparelho({ custoArroz: JSON.stringify({ formato: 1, taxas: { funrural: 2, comissao: 1, cdo: 1.2, frete: 5 } }) }), PADRAO2, { formato: 2, conversoes });
confere('Conversão 1 → 2 mantém o valor digitado', r.dados.taxas, { funrural: 2, comissao: 1, cdoFixo: 1.2, frete: 5 });
confere('  e marca o formato 2', r.dados.formato, 2);

// 9. Sem conversão para um passo: usa os valores iniciais em vez de dados errados.
r = Dados.carregar(aparelho({ custoArroz: JSON.stringify({ formato: 1, taxas: { cdo: 1.2 } }) }), PADRAO2, { formato: 2, conversoes: {} });
confere('Formato sem conversão usa os valores iniciais', r.origem, 'inicial');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
