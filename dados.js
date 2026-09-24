/*
 * Valores guardados no aparelho: carregar, validar e converter entre versões.
 *
 * Os dados ficam numa chave fixa, com o número do formato (`formato`). Quando
 * o significado ou o nome de um campo mudar, NÃO zere os valores: aumente
 * FORMATO e escreva em CONVERSOES a função que leva do formato anterior ao
 * novo. Exemplo (se um dia o CDO virasse percentual):
 *
 *   const FORMATO = 2;
 *   const CONVERSOES = {
 *     1: (d) => { d.taxas.cdo = d.taxas.cdo / 86.5 * 100; return d; }, // 1 → 2
 *   };
 *
 * Funções puras (sem tela nem localStorage), testadas em test-dados.js.
 */
(function (root) {
  'use strict';

  const CHAVE = 'custoArroz';
  const FORMATO = 1;
  const CONVERSOES = {};

  // Chaves usadas antes do controle de formato. A v4 tem exatamente o formato 1;
  // as anteriores tinham campos com outro significado e são descartadas.
  const CHAVE_V4 = 'custoArroz.v4';
  const CHAVES_ANTIGAS = ['custoArroz.v1', 'custoArroz.v2', 'custoArroz.v3', CHAVE_V4];

  // Leva os dados salvos até o formato atual. Devolve null se não houver
  // conversão para algum passo (os valores iniciais são usados no lugar).
  function converter(salvo, formato = FORMATO, conversoes = CONVERSOES) {
    let d = salvo;
    let v = Number(d.formato) || 1;
    while (v < formato) {
      const passo = conversoes[v];
      if (!passo) return null;
      d = passo(d);
      v++;
    }
    d.formato = v;
    return d;
  }

  const numero = (x) => typeof x === 'number' && isFinite(x);

  // Junta os valores salvos aos iniciais, campo a campo: o que faltar ou vier
  // estragado (texto, vazio, NaN) fica com o valor inicial daquele campo.
  function mesclar(padrao, salvo) {
    if (Array.isArray(padrao)) {
      const lista = Array.isArray(salvo) ? salvo : [];
      return padrao.map((p, i) => mesclar(p, lista[i]));
    }
    if (padrao && typeof padrao === 'object') {
      const origem = salvo && typeof salvo === 'object' ? salvo : {};
      const out = {};
      for (const k of Object.keys(padrao)) out[k] = mesclar(padrao[k], origem[k]);
      return out;
    }
    if (padrao === null) return numero(salvo) ? salvo : null; // campo opcional (ex.: custo do kg digitado)
    return numero(salvo) ? salvo : padrao;
  }

  // ler(chave) → texto guardado ou null. Devolve os dados prontos para uso e
  // de onde vieram: 'atual', 'v4' (versão antiga aproveitada) ou 'inicial'.
  function carregar(ler, padrao, opcoes = {}) {
    const formato = opcoes.formato || FORMATO;
    const conversoes = opcoes.conversoes || CONVERSOES;
    const tentar = (chave) => {
      try { return JSON.parse(ler(chave) || 'null'); } catch (e) { return null; }
    };

    let salvo = tentar(CHAVE);
    let origem = 'atual';
    if (!salvo) {
      salvo = tentar(CHAVE_V4);
      origem = 'v4';
      if (salvo) salvo.formato = 1;
    }
    if (salvo && typeof salvo === 'object') salvo = converter(salvo, formato, conversoes);
    else salvo = null;

    const dados = mesclar(padrao, salvo || {});
    dados.formato = formato;
    return { dados, origem: salvo ? origem : 'inicial' };
  }

  const api = { CHAVE, FORMATO, CHAVES_ANTIGAS, converter, mesclar, carregar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Dados = api;
})(this);
