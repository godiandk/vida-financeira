/* ============================================================
   Vida Financeira — service worker

   Objectivo: a app abrir sem internet. Guardamos os ficheiros do
   próprio site em cache e servimo-los de lá.

   Estratégia:
   - páginas (navegação): rede primeiro, cache se falhar
     (para uma versão nova chegar assim que houver rede)
   - resto (css, js, ícones): cache primeiro, rede em segundo plano
     (para abrir instantaneamente)

   O Firebase e as fontes do Google NÃO são postos em cache: são de
   outro domínio e têm de ir sempre à rede.
   ============================================================ */

const VERSAO = 'vida-financeira-v56';

/* O motor de leitura de talões vive numa cache à parte, e de propósito sem a
   versão do site no nome. São 4 MB que a pessoa autorizou descarregar uma vez;
   se ficassem na cache da versão, cada publicação minha deitava-os fora e
   obrigava-a a descarregá-los outra vez. Isso não é uma limpeza, é uma factura
   de dados que eu mandava a quem não pediu nada. */
const CACHE_OCR = 'vida-financeira-ocr-v1';

const FICHEIROS = [
  './',
  './index.html',
  './app/',
  './app.html',
  './conta.html',
  './sobre.html',
  './metodo.html',
  './ferramentas.html',
  './premium.html',
  './ferramentas.css',
  './ferramentas.js',
  './app-shell.css',
  './assistente.css',
  './assistente.js',
  './interpretar.js',
  './excel.js',
  './partilha.js',
  './casa.js',
  './irs.js',
  './divida.js',
  './banner.js',
  './talao.js',
  './idiomas.js',
  './respostas.js',
  './ia.js',
  './investir.js',
  './estilo.css',
  './app-financas.css',
  './app-financas.js',
  './site.js',
  './firebase-config.js',
  './manifest.json',
  './img/logo-marca.png',
  './img/wesley.jpg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSAO)
      // `addAll` falha inteiro se um único ficheiro faltar. Guardamos
      // um a um para uma falha isolada não deixar a app sem cache.
      .then(cache => Promise.all(
        FICHEIROS.map(f => cache.add(f).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(
        chaves.filter(c => c !== VERSAO && c !== CACHE_OCR).map(c => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;

  if (req.method !== 'GET') return;

  // Outro domínio (Firebase, fontes): passa directo para a rede.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Páginas: rede primeiro.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(VERSAO).then(c => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./app.html')))
    );
    return;
  }

  // ----------------------------------------------------------
  // Código do site (js e css): REDE primeiro, cache se falhar.
  //
  // Isto era cache primeiro, com `ignoreSearch: true`. E o `ignoreSearch` —
  // que existia para uma app instalada sem rede não ficar sem ficheiros —
  // anulava por completo o `?v=` que serve para obrigar o navegador a largar
  // a versão antiga: um pedido de `app-financas.js?v=43` encontrava o
  // `app-financas.js` guardado na versão anterior e era ESSE que era servido.
  // O novo só ia para a cache para a vez seguinte.
  //
  // O resultado, no telemóvel de quem já tinha a aplicação: HTML novo com
  // JavaScript velho. Ou seja, publicava-se uma coisa e via-se outra — e nada
  // do que se corrigia chegava a quem já usava a app, que são precisamente as
  // pessoas a quem importa chegar.
  //
  // Rede primeiro custa uns milissegundos com ligação e não custa nada sem
  // ela: falhando a rede, serve-se a cache exactamente como antes. Para
  // ficheiros de dezenas de kilobytes é uma troca óbvia.
  const caminho = new URL(req.url).pathname;

  // ----------------------------------------------------------
  // O motor de leitura de talões (`vendor/ocr`) é a excepção: são 4 MB que a
  // pessoa autorizou descarregar UMA vez. Ir à rede confirmar se mudaram —
  // que é o que a regra de baixo faz — desfazia essa promessa em cada talão
  // lido. Estes ficheiros não mudam sem mudarem de versão, por isso cache
  // primeiro, e só se lá não estiverem é que se vai buscá-los.
  if (caminho.indexOf('/vendor/') !== -1) {
    ev.respondWith(
      caches.open(CACHE_OCR).then(c => c.match(req, { ignoreSearch: true }).then(
        guardado => guardado || fetch(req).then(res => {
          c.put(req, res.clone());
          return res;
        })
      ))
    );
    return;
  }

  const ehCodigo = /\.(js|css)$/i.test(caminho);

  if (ehCodigo) {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          const semQuery = new URL(req.url);
          semQuery.search = '';
          caches.open(VERSAO).then(c => c.put(semQuery.toString(), copia));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // ----------------------------------------------------------
  // Tudo o resto (ícones, imagens, manifesto): cache primeiro.
  // Estes não mudam de conteúdo sem mudarem de nome, por isso servi-los da
  // cache é sempre certo — e é o que faz a app abrir de imediato.
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(guardado => {
      const daRede = fetch(req)
        .then(res => {
          const copia = res.clone();
          const semQuery = new URL(req.url);
          semQuery.search = '';
          caches.open(VERSAO).then(c => c.put(semQuery.toString(), copia));
          return res;
        })
        .catch(() => guardado);
      return guardado || daRede;
    })
  );
});
