# Custo do Arroz

App (PWA) de simulação da planilha `custoArroz.xlsx`: custo da compra de arroz em casca e preço de venda dos fardos. HTML + CSS + JS puro, sem build.

Publicado em https://rbicca.github.io/custo-arroz/

## Instalar no celular

Depois de instalado, o app funciona **sem internet**.

- **iPhone:** abra o endereço no **Safari** → Compartilhar → **Adicionar à Tela de Início**. Use sempre pelo ícone: no iPhone, o app instalado e o Safari guardam os valores separados.
- **Android:** abra no **Chrome** → menu (⋮) → **Instalar app** (ou toque no aviso de instalação).

## Rodar no computador

Abra `index.html` no navegador (duplo clique). Aberto como arquivo, o app funciona, mas sem o modo offline. Para testar o modo offline, sirva a pasta por HTTP, por exemplo `python -m http.server 8765`, e abra `http://localhost:8765`.

Para testar como celular: no Chrome/Edge, F12 → ícone de celular → "iPhone 14 Pro Max" (mesmo tamanho do 15 Pro Max, 430×932).

No teclado grande dá para usar o teclado do computador: números, vírgula, Backspace, Enter (Pronto) e Esc (Cancelar).

## Testar

```bash
node test-calc.js
```

Confere as contas contra os valores da planilha e se a versão do `app.js` e do `sw.js` são iguais.

## Publicar uma versão nova

1. Aumente `VERSAO` em **`app.js` e `sw.js`** (os dois iguais) e rode `node test-calc.js`.
2. Envie os arquivos alterados ao repositório (branch `master`). Arquivo novo que o app precise offline também entra na lista `ARQUIVOS` do `sw.js`.
3. Em até uns 10 minutos, quem abrir o app vê o aviso **"Nova versão disponível — toque aqui para atualizar"**. O número novo aparece no rodapé do Início.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `calc.js` | Fórmulas da planilha, funções puras |
| `app.js` | Telas, navegação, teclado grande, valores salvos no aparelho, aviso de versão nova |
| `sw.js` | Service worker: guarda o app no aparelho para funcionar sem internet |
| `styles.css` | Visual (tamanhos grandes para leitura fácil) |
| `fonts/` | Fonte Atkinson Hyperlegible (licença SIL OFL em `fonts/OFL.txt`) |
| `manifest.webmanifest`, `icon-*.png` | Nome, ícones e modo tela cheia do app instalado |
| `test-calc.js` | Conferência das contas e da versão |

## Dados

Os valores digitados ficam guardados **só naquele aparelho** (localStorage): não passam para outro celular e não têm cópia de segurança. Apagar os dados do site nos ajustes do celular apaga os valores.
