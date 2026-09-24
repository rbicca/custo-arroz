# Custo do Arroz — protótipo web

Protótipo em HTML + CSS + JS puro (sem build) do app de simulação da planilha `custoArroz.xlsx`.

## Rodar no computador

Abra `index.html` no navegador (duplo clique). Tudo funciona direto do arquivo.

Para testar como celular: no Chrome/Edge, F12 → ícone de celular → escolha "iPhone 14 Pro Max" (mesmo tamanho do 15 Pro Max, 430×932).

No teclado grande dá para usar o teclado do computador: números, vírgula, Backspace, Enter (Pronto) e Esc (Cancelar).

## Testar os cálculos

```bash
node test-calc.js
```

Compara as contas com os valores que o Excel mostra hoje na planilha.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `calc.js` | Fórmulas da planilha, funções puras (base para o SwiftUI) |
| `app.js` | Telas, navegação, teclado grande, valores salvos no aparelho |
| `styles.css` | Visual (fonte Atkinson Hyperlegible, tamanhos grandes) |
| `test-calc.js` | Conferência das contas contra a planilha |

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie o conteúdo desta pasta.
2. No repositório: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. O endereço fica `https://<usuario>.github.io/<repositorio>/`.
4. No iPhone, abra o endereço no Safari → Compartilhar → **Adicionar à Tela de Início**. O app abre em tela cheia, com ícone próprio.

Os valores digitados ficam guardados só naquele aparelho (localStorage).
