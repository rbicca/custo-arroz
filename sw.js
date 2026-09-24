/*
 * Service worker: guarda o app no aparelho para funcionar sem internet.
 *
 * A cada publicação, aumente VERSAO aqui e em app.js (o test-calc.js confere
 * que são iguais). Mudar este arquivo é o que faz o celular baixar a versão
 * nova; o app então mostra "Nova versão disponível".
 */
const VERSAO = '1.2';
const CACHE = 'custo-arroz-' + VERSAO;

const ARQUIVOS = [
  './',
  'index.html',
  'styles.css',
  'calc.js',
  'dados.js',
  'app.js',
  'manifest.webmanifest',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
];

// Instala: baixa todos os arquivos direto do servidor (sem cache do navegador,
// para não guardar uma versão velha) e espera o app pedir para ativar.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ARQUIVOS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

// Ativa: apaga as cópias de versões anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n.startsWith('custo-arroz-') && n !== CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// O app pede para ativar a versão nova quando a pessoa toca no aviso.
self.addEventListener('message', (event) => {
  if (event.data === 'ativar') self.skipWaiting();
});

// Responde sempre com a cópia guardada; só vai à internet para o que não estiver nela.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((r) => r || fetch(req))
  );
});
