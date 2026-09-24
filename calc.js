/*
 * Cálculos do app — reproduzem as fórmulas da planilha custoArroz.xlsx.
 * Funções puras: não dependem da tela, então podem ser testadas no Node
 * (node test-calc.js) e servem de referência para a versão em SwiftUI.
 */
(function (root) {
  'use strict';

  const SACO_KG = 50;

  // Linha 8 — custo do kg de arroz inteiro de um lote.
  // t: taxas (funrural R$/saco, comissao %, cdo R$/saco, frete R$/saco)
  // c: { inteiro %, quebrado %, preco R$/saco, vendaQ R$/kg }
  function compra(t, c) {
    const funrural = t.funrural; // F8 — valor fixo por saco
    const comissao = c.preco * (t.comissao / 100); // G8
    const custoSaco = c.preco + funrural + comissao + t.cdo + t.frete; // J8
    const kgQuebrado = SACO_KG * (c.quebrado / 100);
    const vendaQuebrado = kgQuebrado * c.vendaQ; // K8
    const liquido = custoSaco - vendaQuebrado; // L8
    const kgInteiro = SACO_KG * (c.inteiro / 100); // M8
    const custoKg = kgInteiro > 0 ? liquido / kgInteiro : NaN; // N8
    return { funrural, comissao, cdo: t.cdo, frete: t.frete, custoSaco, kgQuebrado, vendaQuebrado, liquido, kgInteiro, custoKg };
  }

  // Linha 10 (colunas O6–O9) — quanto pagar pelo saco de outro lote
  // para manter o mesmo custo do kg inteiro do lote de referência.
  function comparar(t, custoKg, vendaQ, l) {
    const kgInteiro = SACO_KG * (l.inteiro / 100); // M10
    const kgQuebrado = SACO_KG * (l.quebrado / 100);
    const valorInteiro = kgInteiro * custoKg; // L10
    const valorQuebrado = kgQuebrado * vendaQ; // K10
    const bruto = valorInteiro + valorQuebrado; // J10
    // Custo = preço + funrural + comissão + CDO + frete, então
    // preço = (custo − funrural − CDO − frete) ÷ (1 + comissão).
    const semFixos = bruto - l.frete - t.cdo - t.funrural; // O7
    const divisor = 1 + t.comissao / 100; // O8
    const preco = semFixos / divisor; // O9 → D10
    return { kgInteiro, kgQuebrado, valorInteiro, valorQuebrado, bruto, semFixos, divisor, preco };
  }

  // Linhas 20–23 — preço de venda de um fardo.
  // tipo: { inteiro kg, quebrado kg }
  function fardo(t, custoKg, tipo) {
    const valorInteiro = custoKg * tipo.inteiro;
    const valorQuebrado = t.custoQbr * tipo.quebrado;
    const base = valorInteiro + valorQuebrado + t.embalagem + t.icms; // G
    const custo = base - t.credito + t.despesa + t.freteFardo; // J
    const preco = custo / (t.margem / 100); // K
    return { valorInteiro, valorQuebrado, custo, preco };
  }

  const api = { SACO_KG, compra, comparar, fardo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
