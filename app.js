(function () {
  'use strict';

  // v4: Funrural é % por dentro e CDO é R$ fixo por saco — valores antigos não servem.
  const STORAGE_KEY = 'custoArroz.v4';

  // Valores iniciais = os da planilha (versão de 24/09/2026).
  const DEFAULTS = {
    taxas: { funrural: 1.65, comissao: 1, cdo: 0.93, frete: 4.5, custoQbr: 1.3, embalagem: 4.5, icms: 2.5, credito: 1, despesa: 0, freteFardo: 14, margem: 88 },
    compra: { inteiro: 65, quebrado: 10, preco: 86.5, vendaQ: 0.3 },
    comparar: { inteiro: 60, quebrado: 12, frete: 3.4 },
    venda: { custoKg: null }, // null = usa o custo calculado na compra
    tipos: [
      { inteiro: 28, quebrado: 2 },
      { inteiro: 26.5, quebrado: 3.5 },
      { inteiro: 23.5, quebrado: 6.5 },
      { inteiro: 10.5, quebrado: 19.5 },
    ],
  };

  // Como cada número é mostrado e ajustado.
  const PCT = { unit: '%', dec: 2, step: 0.5, min: 0, max: 100 };
  const RS = { unit: 'R$', dec: 2, step: 0.1, min: 0, max: 9999 };
  const KG = { unit: 'kg', dec: 2, step: 0.5, min: 0, max: 100 };
  const tipoFields = {};
  DEFAULTS.tipos.forEach((_, i) => {
    tipoFields[`tipos.${i}.inteiro`] = { ...KG, label: `Tipo ${i + 1}: inteiro`, help: 'quilos de arroz inteiro no fardo' };
    tipoFields[`tipos.${i}.quebrado`] = { ...KG, label: `Tipo ${i + 1}: quebrado`, help: 'quilos de arroz quebrado no fardo' };
  });
  const FIELDS = {
    ...tipoFields,
    'compra.inteiro': { ...PCT, label: 'Inteiro' },
    'compra.quebrado': { ...PCT, label: 'Quebrado' },
    'compra.preco': { ...RS, step: 0.5, label: 'Preço do saco', help: 'em reais, saco de 50 kg' },
    'compra.vendaQ': { ...RS, step: 0.05, label: 'Venda do quebrado', help: 'em reais, por kg' },
    'comparar.inteiro': { ...PCT, label: 'Inteiro' },
    'comparar.quebrado': { ...PCT, label: 'Quebrado' },
    'comparar.frete': { ...RS, label: 'Frete', help: 'em reais, por saco' },
    'venda.custoKg': { ...RS, dec: 4, step: 0.01, label: 'Custo do kg inteiro', help: 'em reais, por kg' },
    'taxas.funrural': { ...PCT, step: 0.1, max: 99, label: 'Funrural', sub: 'em %, calculado por dentro' },
    'taxas.comissao': { ...PCT, step: 0.1, label: 'Comissão', sub: 'em % do preço do saco' },
    'taxas.cdo': { ...RS, label: 'CDO', sub: 'R$ por saco' },
    'taxas.frete': { ...RS, label: 'Frete', sub: 'R$ por saco' },
    'taxas.custoQbr': { ...RS, label: 'Custo do quebrado', sub: 'R$ por kg' },
    'taxas.embalagem': { ...RS, label: 'Embalagem', sub: 'R$ por fardo' },
    'taxas.icms': { ...RS, label: 'ICMS', sub: 'R$ por fardo' },
    'taxas.credito': { ...RS, label: 'Crédito', sub: 'R$ por fardo (desconta)' },
    'taxas.despesa': { ...RS, label: 'Despesa', sub: 'R$ por fardo' },
    'taxas.freteFardo': { ...RS, label: 'Frete', sub: 'R$ por fardo' },
    'taxas.margem': { ...PCT, min: 1, label: 'Margem', sub: 'divide o custo por' },
  };

  // ---------- estado ----------
  let state = load();
  let ajustesTab = 'compra';
  let kp = null; // teclado aberto: { path, txt, fresh }

  function load() {
    const s = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) for (const k of Object.keys(s)) Object.assign(s[k], saved[k] || {});
    } catch (e) { /* sem armazenamento: segue com os valores da planilha */ }
    return s;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
  }
  // Caminhos como 'compra.preco' ou 'tipos.3.inteiro'.
  function parent(path) {
    const keys = path.split('.');
    const last = keys.pop();
    return [keys.reduce((o, k) => o[k], state), last];
  }
  function get(path) { const [o, k] = parent(path); return o[k]; }
  function set(path, v) { const [o, k] = parent(path); o[k] = v; save(); }

  // ---------- contas ----------
  function calcCompra() { return Calc.compra(state.taxas, state.compra); }
  function custoKgVenda() {
    return state.venda.custoKg != null ? state.venda.custoKg : calcCompra().custoKg;
  }
  function valueOf(path) { return path === 'venda.custoKg' ? custoKgVenda() : get(path); }

  // ---------- formatação ----------
  function fmt(n, max, min) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: min == null ? max : min, maximumFractionDigits: max });
  }
  const money = (n) => 'R$ ' + fmt(n, 2);
  const money4 = (n) => 'R$ ' + fmt(n, 4);
  function fieldText(path, v) {
    const f = FIELDS[path];
    return f.unit === 'R$' ? fmt(v, f.dec) : fmt(v, f.dec, 0);
  }
  const unitWords = { '%': 'por cento', 'R$': 'reais', kg: 'quilos' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- ícones ----------
  const icon = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>',
  };

  // ---------- pedaços de tela ----------
  const back = (to, label) => `<div class="top"><a class="back" href="#/${to}">${icon.left}${label}</a></div>`;

  function stepper(path, hint) {
    const f = FIELDS[path];
    const txt = fieldText(path, valueOf(path));
    return `<div class="field">
      <div class="field-head">
        <span class="field-label">${f.label} <small>(${f.unit})</small></span>
        <span class="field-hint">${hint || ''}</span>
      </div>
      <div class="stepper">
        <button class="round minus" data-act="dec" data-path="${path}" data-id="dec-${path}" aria-label="Diminuir ${f.label}">−</button>
        <button class="value" data-act="edit" data-path="${path}" data-id="edit-${path}" aria-label="${f.label}: ${txt} ${unitWords[f.unit]}. Toque para digitar">${txt}</button>
        <button class="round plus" data-act="inc" data-path="${path}" data-id="inc-${path}" aria-label="Aumentar ${f.label}">+</button>
      </div>
    </div>`;
  }

  function rows(list) {
    return `<div class="rows">${list.map((r) => `
      <div class="row${r.total ? ' total' : ''}">
        <div class="row-text"><span class="row-label">${r.label}</span>${r.sub ? `<span class="row-sub">${r.sub}</span>` : ''}</div>
        <span class="row-value">${r.value}</span>
      </div>`).join('')}</div>`;
  }

  const kgHint = (pct) => '= ' + fmt(50 * pct / 100, 2, 0) + ' kg no saco';
  const kg = (v) => fmt(v, 2, 0) + ' kg';
  const tipoNome = (i) => 'Tipo ' + (i + 1);
  const composicao = (tipo) => `${kg(tipo.inteiro)} inteiro + ${kg(tipo.quebrado)} quebrado`;

  // ---------- telas ----------
  const screens = {
    home() {
      return `
        <div class="hello">Olá!</div>
        <h1 class="home-title">O que vamos calcular hoje?</h1>
        <a class="big" href="#/compra"><span class="big-text"><span class="big-title">Comprar arroz em casca</span><span class="big-sub">Saber o custo do kg de arroz inteiro</span></span>${icon.right}</a>
        <a class="big outline" href="#/comparar"><span class="big-text"><span class="big-title">Quanto pagar por outro lote</span><span class="big-sub">Comparar pela qualidade do arroz</span></span>${icon.right}</a>
        <a class="big brown" href="#/venda"><span class="big-text"><span class="big-title">Vender fardos</span><span class="big-sub">Preço de venda de cada tipo de fardo</span></span>${icon.right}</a>
        <a class="plain push" href="#/ajustes">${icon.gear}Taxas e ajustes</a>`;
    },

    compra() {
      const c = state.compra;
      const r = calcCompra();
      const soma = c.inteiro + c.quebrado;
      return `${back('', 'Início')}
        <h1>Comprar arroz em casca</h1>
        ${stepper('compra.inteiro', kgHint(c.inteiro))}
        ${stepper('compra.quebrado', kgHint(c.quebrado))}
        ${soma > 100 ? `<div class="warn" role="alert">Inteiro + quebrado passa de 100% (${fmt(soma, 2, 0)}%). Confira os valores.</div>` : ''}
        ${stepper('compra.preco', '50 kg')}
        ${stepper('compra.vendaQ', 'por kg')}
        <div class="result" aria-live="polite">
          <span class="result-label">Custo do kg de arroz inteiro</span>
          ${isFinite(r.custoKg)
            ? `<span class="result-value">R$ ${fmt(r.custoKg, 4)}</span>`
            : '<span class="result-value bad">Informe o % de inteiro</span>'}
          <div class="result-foot"><span>Saco sai por ${money(r.liquido)}</span><a href="#/compra-conta">Ver a conta${icon.right}</a></div>
        </div>
        <a class="plain" href="#/ajustes/compra">${icon.gear}Mudar custos da compra</a>`;
    },

    'compra-conta'() {
      const c = state.compra, t = state.taxas;
      const r = calcCompra();
      return `${back('compra', 'Voltar')}
        <h1>Como chegamos no custo</h1>
        ${rows([
          { label: 'Preço do saco', sub: '50 kg de arroz em casca', value: money(c.preco) },
          { label: '+ Funrural', sub: fmt(t.funrural, 2, 0) + '% por dentro', value: money4(r.funrural) },
          { label: '+ Comissão', sub: fmt(t.comissao, 2, 0) + '% do preço', value: money4(r.comissao) },
          { label: '+ CDO', sub: 'valor fixo por saco', value: money(r.cdo) },
          { label: '+ Frete', sub: 'valor por saco', value: money(t.frete) },
          { label: '= Custo do saco', value: money4(r.custoSaco), total: true },
          { label: '− Venda do quebrado', sub: fmt(r.kgQuebrado, 2, 0) + ' kg × ' + money(c.vendaQ), value: money(r.vendaQuebrado) },
          { label: '= Custo líquido', value: money4(r.liquido), total: true },
          { label: '÷ Arroz inteiro', sub: fmt(c.inteiro, 2, 0) + '% de 50 kg', value: fmt(r.kgInteiro, 2, 0) + ' kg' },
        ])}
        <div class="result">
          <span class="result-label">Custo do kg de arroz inteiro</span>
          <span class="result-value">R$ ${fmt(r.custoKg, 4)}</span>
        </div>`;
    },

    comparar() {
      const l = state.comparar;
      const base = calcCompra();
      const r = Calc.comparar(state.taxas, base.custoKg, state.compra.vendaQ, l);
      const d = r.preco - state.compra.preco;
      const soma = l.inteiro + l.quebrado;
      const ok = isFinite(r.preco);
      return `${back('', 'Início')}
        <h1>Quanto pagar por outro lote</h1>
        <div class="info"><span>Para manter o custo de<br><strong>R$ ${fmt(base.custoKg, 4)}</strong> por kg inteiro</span><a class="link-btn" href="#/compra">Mudar</a></div>
        ${stepper('comparar.inteiro', kgHint(l.inteiro))}
        ${stepper('comparar.quebrado', kgHint(l.quebrado))}
        ${soma > 100 ? `<div class="warn" role="alert">Inteiro + quebrado passa de 100% (${fmt(soma, 2, 0)}%). Confira os valores.</div>` : ''}
        ${stepper('comparar.frete', 'por saco')}
        <div class="result" aria-live="polite">
          <span class="result-label">Pode pagar até</span>
          <span class="result-value${r.preco >= 1000 ? ' long' : ''}">${ok ? money4(r.preco) : '—'}</span>
          <span class="result-note">por saco de 50 kg${ok ? `<br>${money(Math.abs(d))} ${d < 0 ? 'a menos' : 'a mais'} que o lote comprado` : ''}</span>
        </div>`;
    },

    venda() {
      const custo = custoKgVenda();
      const manual = state.venda.custoKg != null;
      const tipos = state.tipos.map((tipo, i) => {
        const p = Calc.fardo(state.taxas, custo, tipo).preco;
        return `<a class="tipo" href="#/fardo/${i}" aria-label="${tipoNome(i)}: ${money(p)} por fardo. Ver a conta">
          <span class="tipo-text"><span class="tipo-nome">${tipoNome(i)}</span><span class="tipo-comp">${composicao(tipo)}</span></span>
          <span class="tipo-preco">${money(p)}</span>${icon.right}</a>`;
      }).join('');
      return `${back('', 'Início')}
        <h1>Vender fardos</h1>
        <div class="brown-theme">${stepper('venda.custoKg', manual ? 'digitado' : 'da compra')}</div>
        ${manual ? `<div class="info brown-info"><span>Na compra deu <strong>R$ ${fmt(calcCompra().custoKg, 4)}</strong></span><button class="link-btn" data-act="usar-compra" data-id="usar-compra">Usar este</button></div>` : ''}
        <h2>Preço de venda por fardo</h2>
        ${tipos}
        <a class="plain push" href="#/ajustes/venda">${icon.gear}Mudar custos do fardo</a>`;
    },

    fardo(i) {
      const idx = state.tipos[+i] ? +i : 0;
      const tipo = state.tipos[idx];
      const t = state.taxas;
      const c = custoKgVenda();
      const r = Calc.fardo(t, c, tipo);
      return `${back('venda', 'Voltar')}
        <h1>${tipoNome(idx)} · conta do fardo</h1>
        <p class="sub">${composicao(tipo)}</p>
        ${rows([
          { label: 'Arroz inteiro', sub: kg(tipo.inteiro) + ' × R$ ' + fmt(c, 4), value: money(r.valorInteiro) },
          { label: '+ Arroz quebrado', sub: kg(tipo.quebrado) + ' × ' + money(t.custoQbr), value: money(r.valorQuebrado) },
          { label: '+ Embalagem', sub: 'por fardo', value: money(t.embalagem) },
          { label: '+ ICMS', sub: 'por fardo', value: money(t.icms) },
          { label: '− Crédito', sub: 'por fardo', value: money(t.credito) },
          { label: '+ Despesa', sub: 'por fardo', value: money(t.despesa) },
          { label: '+ Frete', sub: 'por fardo', value: money(t.freteFardo) },
          { label: '= Custo do fardo', value: money(r.custo), total: true },
          { label: '÷ Margem', sub: 'dividido por ' + fmt(t.margem, 2, 0) + '%', value: '' },
        ])}
        <div class="result brown">
          <span class="result-label">Preço de venda do fardo</span>
          <span class="result-value">${money(r.preco)}</span>
        </div>`;
    },

    ajustes(tab) {
      if (['compra', 'venda', 'fardos'].includes(tab)) ajustesTab = tab;
      const valueBtn = (path, label) => {
        const f = FIELDS[path];
        const txt = fieldText(path, get(path)) + (f.unit === 'R$' ? '' : ' ' + f.unit);
        return `<button class="value" data-act="edit" data-path="${path}" data-id="edit-${path}" aria-label="${label || f.label}: ${txt}. Toque para digitar">${txt}</button>`;
      };
      let list;
      if (ajustesTab === 'fardos') {
        list = state.tipos.map((tipo, i) => `<div class="setting tipo-setting">
          <div class="row-text"><span class="field-label">${tipoNome(i)}</span><span class="row-sub">total ${kg(tipo.inteiro + tipo.quebrado)}</span></div>
          <div class="kg-pair">
            <span class="kg-label">Inteiro</span>${valueBtn(`tipos.${i}.inteiro`)}
            <span class="kg-label">Quebrado</span>${valueBtn(`tipos.${i}.quebrado`)}
          </div>
        </div>`).join('');
      } else {
        const keys = ajustesTab === 'compra'
          ? ['funrural', 'comissao', 'cdo', 'frete']
          : ['custoQbr', 'embalagem', 'icms', 'credito', 'despesa', 'freteFardo', 'margem'];
        list = keys.map((k) => {
          const path = 'taxas.' + k, f = FIELDS[path];
          return `<div class="setting">
            <div class="row-text"><span class="field-label">${f.label}</span><span class="row-sub">${f.sub}</span></div>
            ${valueBtn(path)}
          </div>`;
        }).join('');
      }
      const tabBtn = (t, label) => `<button class="tab" role="tab" aria-selected="${ajustesTab === t}" data-act="tab" data-tab="${t}" data-id="tab-${t}">${label}</button>`;
      return `${back('', 'Início')}
        <h1>Taxas e ajustes</h1>
        <div class="tabs" role="tablist">${tabBtn('compra', 'Compra')}${tabBtn('venda', 'Venda')}${tabBtn('fardos', 'Fardos')}</div>
        ${list}
        <p class="note">${ajustesTab === 'fardos' ? 'Quilos de arroz inteiro e quebrado em cada tipo de fardo.' : 'Estes valores ficam guardados neste aparelho. Só precisa mudar quando as taxas mudarem.'}</p>
        <button class="plain danger-btn push" data-act="reset" data-id="reset">Voltar aos valores da planilha</button>`;
    },
  };

  // ---------- desenho ----------
  const appEl = document.getElementById('app');
  const kpEl = document.getElementById('kp');

  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    const name = screens[parts[0]] ? parts[0] : 'home';
    return { name, arg: parts[1] };
  }

  function render(keepFocus) {
    const focusId = keepFocus && document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.id : null;
    const { name, arg } = route();
    appEl.innerHTML = screens[name](arg);
    document.title = name === 'home' ? 'Custo do Arroz' : (appEl.querySelector('h1')?.textContent || '') + ' · Custo do Arroz';
    if (focusId) appEl.querySelector(`[data-id="${CSS.escape(focusId)}"]`)?.focus();
  }

  window.addEventListener('hashchange', () => { closeKeypad(false); render(); window.scrollTo(0, 0); });

  appEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const path = b.dataset.path;
    switch (b.dataset.act) {
      case 'dec':
      case 'inc': {
        const f = FIELDS[path];
        const dir = b.dataset.act === 'inc' ? 1 : -1;
        const pow = Math.pow(10, f.dec);
        const v = Math.round((valueOf(path) + dir * f.step) * pow) / pow;
        set(path, Math.min(f.max, Math.max(f.min, v)));
        render(true);
        break;
      }
      case 'edit': openKeypad(path); break;
      case 'tab': ajustesTab = b.dataset.tab; render(true); break;
      case 'usar-compra': state.venda.custoKg = null; save(); render(); break;
      case 'reset':
        if (confirm('Voltar todos os valores para os da planilha?')) {
          state = JSON.parse(JSON.stringify(DEFAULTS)); save(); render();
        }
        break;
    }
  });

  // ---------- teclado grande ----------
  function openKeypad(path) {
    kp = { path, txt: fieldText(path, valueOf(path)).replace(/\./g, ''), fresh: true, from: document.activeElement?.dataset?.id };
    document.body.classList.add('kp-open');
    appEl.setAttribute('aria-hidden', 'true');
    kpEl.hidden = false;
    renderKeypad();
    kpEl.querySelector('.key')?.focus();
  }

  function closeKeypad(restoreFocus) {
    if (!kp) return;
    const from = kp.from;
    kp = null;
    kpEl.hidden = true;
    kpEl.innerHTML = '';
    document.body.classList.remove('kp-open');
    appEl.removeAttribute('aria-hidden');
    if (restoreFocus && from) appEl.querySelector(`[data-id="${CSS.escape(from)}"]`)?.focus();
  }

  function kpNumber() { return parseFloat(kp.txt.replace(',', '.')); }
  function kpError() {
    const f = FIELDS[kp.path], n = kpNumber();
    if (kp.txt === '' || !isFinite(n)) return 'Digite um número';
    if (n < f.min) return 'O menor valor é ' + fmt(f.min, f.dec, 0);
    if (n > f.max) return 'O maior valor é ' + fmt(f.max, f.dec, 0);
    return '';
  }

  function renderKeypad() {
    const f = FIELDS[kp.path];
    const err = kpError();
    const help = err && !kp.fresh ? err : (kp.fresh ? 'Digite o novo valor' : '');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) => {
      const alt = k === ',' || k === 'del';
      const label = k === 'del' ? icon.del : k;
      const aria = k === 'del' ? 'Apagar' : k === ',' ? 'Vírgula' : k;
      return `<button class="key${alt ? ' alt' : ''}" data-key="${k}" aria-label="${aria}"${k === ',' && f.dec === 0 ? ' disabled' : ''}>${label}</button>`;
    }).join('');
    kpEl.innerHTML = `<div class="kp-inner" role="dialog" aria-modal="true" aria-label="Digitar ${esc(f.label)}">
      <div class="top"><button class="back" data-kp="cancel" style="padding: 0 22px">Cancelar</button></div>
      <div><h1>${f.label}</h1><p class="sub" style="margin-top:2px">${f.help || (f.unit === '%' ? 'em porcentagem (%)' : f.sub || '')}</p></div>
      <div class="kp-display" role="status" aria-live="polite">
        ${f.unit === 'R$' ? '<span class="unit">R$</span>' : ''}
        <span class="num${kp.fresh ? ' fresh' : ''}">${esc(kp.txt || '0')}</span>
        ${f.unit !== 'R$' ? `<span class="unit">${f.unit}</span>` : ''}
      </div>
      <div class="kp-help${err && !kp.fresh ? ' err' : ''}">${help}</div>
      <div class="keys">${keys}</div>
      <button class="done push" data-kp="ok"${err ? ' disabled' : ''}>Pronto</button>
    </div>`;
  }

  function press(k) {
    const f = FIELDS[kp.path];
    let t = kp.fresh ? '' : kp.txt;
    if (k === 'del') {
      t = kp.fresh ? '' : t.slice(0, -1);
    } else if (k === ',') {
      if (t.indexOf(',') < 0) t = (t || '0') + ',';
    } else {
      const comma = t.indexOf(',');
      if (comma >= 0 && t.length - comma > f.dec) return; // casas decimais cheias
      if (t.replace(',', '').length >= 8) return;
      t = t === '0' ? k : t + k;
    }
    kp.txt = t;
    kp.fresh = false;
    renderKeypad();
    kpEl.querySelector(`[data-key="${CSS.escape(k)}"]`)?.focus();
  }

  function confirmKeypad() {
    if (kpError()) return;
    const from = kp.from;
    set(kp.path, kpNumber());
    closeKeypad(false);
    render();
    if (from) appEl.querySelector(`[data-id="${CSS.escape(from)}"]`)?.focus();
  }

  kpEl.addEventListener('click', (e) => {
    const key = e.target.closest('[data-key]');
    if (key) return press(key.dataset.key);
    const act = e.target.closest('[data-kp]');
    if (!act) return;
    if (act.dataset.kp === 'ok') confirmKeypad();
    else closeKeypad(true);
  });

  // Teclado físico (útil para testar no computador).
  document.addEventListener('keydown', (e) => {
    if (!kp) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === ',' || e.key === '.') press(',');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') confirmKeypad();
    else if (e.key === 'Escape') closeKeypad(true);
    else return;
    e.preventDefault();
  });

  render();
})();
