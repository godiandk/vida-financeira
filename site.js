/* ============================================================
   Vida Financeira — comportamento partilhado por todas as páginas
   (menu, ano do rodapé, animações, estado da conta, PWA)
   ============================================================ */

/* ---------- menu do telemóvel ---------- */
(function menu() {
  const burger = document.getElementById('burger');
  const links = document.getElementById('menu');
  if (!burger || !links) return;

  burger.addEventListener('click', () => {
    const aberto = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(aberto));
  });

  // Tocar numa entrada fecha o painel — senão fica aberto por cima da página
  // seguinte durante a navegação.
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      links.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ---------- ano do rodapé ---------- */
(function ano() {
  document.querySelectorAll('#ano').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();

/* ---------- animação de entrada ---------- */
(function reveal() {
  const alvos = document.querySelectorAll('.reveal');
  if (!alvos.length) return;

  if (!('IntersectionObserver' in window)) {
    alvos.forEach(el => el.classList.add('in'));
    return;
  }

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  alvos.forEach(el => obs.observe(el));
})();

/* ---------- ficha da conta ----------

   Guarda em `perfis/{uid}` apenas o nome e o email — nunca movimentos. É o
   que permite ao painel listar as contas registadas e dar acesso com um
   toque, em vez de obrigar a escrever o email à mão e correr o risco de o
   dar a uma conta que não existe.

   A separação é de propósito: o dinheiro das pessoas vive em
   `utilizadores/{uid}`, e essa colecção o administrador não lê. A promessa
   de que ninguém vê as contas de ninguém continua inteira. */
(function ficha() {
  if (typeof firebase === 'undefined' || !window.auth || !window.db) return;

  auth.onAuthStateChanged(u => {
    if (!u) return;

    const doc = db.collection('perfis').doc(u.uid);

    doc.get().then(d => {
      const p = d.exists ? (d.data() || {}) : {};
      const campos = {
        email: u.email || '',
        nome: u.displayName || '',
        visto: new Date().toISOString()
      };

      /* O mês de experiência começa na primeira vez que esta conta aparece, e
         a data fica na nuvem. Se vivesse só no telemóvel, limpar os dados do
         navegador dava um mês novo — e quem soubesse disso nunca pagava.
         `teste` só se escreve quando ainda não existe: escrevê-lo sempre
         renovava o mês a cada sessão, que é o mesmo defeito ao contrário. */
      const inicio = (typeof p.teste === 'string' && p.teste) ? p.teste : new Date().toISOString();
      if (!p.teste) campos.teste = inicio;

      /* Cópia local para a aplicação saber a resposta sem internet. Quem manda
         é a da nuvem — esta é reescrita por ela a cada arranque com sessão. */
      try { localStorage.setItem('vf:teste', JSON.stringify({ uid: u.uid, inicio: inicio })); } catch (e) {}

      return doc.set(campos, { merge: true });
    }).catch(() => {});   // sem ficha, a app funciona na mesma
  });
})();

/* Sem sessão não há mês de experiência: a conta é a identificação, e sem ela
   o mês grátis era infinito para quem limpasse o navegador. Apagar a cópia
   local ao sair fecha essa porta. */
(function limparTesteAoSair() {
  if (typeof firebase === 'undefined' || !window.auth) return;
  auth.onAuthStateChanged(u => {
    if (u) return;
    try { localStorage.removeItem('vf:teste'); } catch (e) {}
  });
})();

/* ---------- "Entrar / Criar conta" passa a nome quando há sessão ----------

   Duas armadilhas, ambas já custaram caro:

   1. Dentro da aplicação (/app/) este link é um botão redondo de 38px na
      barra de cima. Enfiar-lhe o nome completo lá dentro fazia o texto
      transbordar para fora do ecrã. Nesse formato mostra-se só a inicial.

   2. O endereço não pode ser escrito à mão: `conta.html` a partir de /app/
      resolve para /app/conta.html, que não existe — e o clique dava 404. */
(function navConta() {
  const link = document.getElementById('nav-conta');
  if (!link || typeof firebase === 'undefined' || !window.auth) return;

  const compacto = link.classList.contains('topo-bt');
  const destino = (typeof raizDoSite === 'function' ? raizDoSite() : './') + 'conta.html';
  link.href = destino;

  auth.onAuthStateChanged(u => {
    link.href = destino;

    if (!u) {
      link.classList.remove('nav-account');
      link.textContent = compacto ? '👤' : 'Entrar / Criar conta';
      link.setAttribute('aria-label', 'Entrar ou criar conta');
      return;
    }

    const nome = u.displayName || (u.email || '').split('@')[0] || 'A minha conta';
    const inicial = nome.charAt(0).toUpperCase();
    link.setAttribute('aria-label', 'A conta de ' + nome);
    link.textContent = '';

    if (compacto) {
      // Só a inicial: é o que cabe num botão redondo sem rebentar a barra.
      link.classList.add('tem-conta');
      link.textContent = inicial;
      return;
    }

    link.classList.add('nav-account');
    const av = document.createElement('span');
    av.className = 'nav-avatar';
    av.textContent = inicial;
    const txt = document.createElement('span');
    txt.textContent = nome;
    link.append(av, txt);
  });
})();

/* Raiz do site, vista de qualquer profundidade.

   A aplicação vive em `/app/`, o resto das páginas na raiz. Um caminho
   relativo escrito à mão no JavaScript funciona num sítio e falha no outro —
   foi o que aconteceu com o `sw.js` e com o logótipo do modal, ambos a dar
   404 dentro de `/app/`.

   O `link rel="manifest"` de cada página já aponta correctamente para a raiz,
   e o navegador resolve-o em endereço absoluto. Serve de âncora e evita
   escrever o caminho do repositório à mão. */
function raizDoSite() {
  const man = document.querySelector('link[rel="manifest"]');
  return man ? man.href.replace(/manifest\.json(\?.*)?$/, '') : './';
}

/* ============================================================
   Moeda automática, pelo fuso horário

   Podia perguntar-se o país a um serviço de geolocalização por IP, mas isso
   obriga a chamar um servidor de terceiros em cada visita — que passa a saber
   quem entra e de onde. Este site promete não ter rastreadores, e essa
   promessa vale mais do que a diferença de precisão.

   O fuso horário do dispositivo dá o país com fiabilidade equivalente para
   este efeito, não sai do telemóvel, funciona offline e é instantâneo. A
   língua serve de rede quando o fuso não é reconhecido.

   Aplica-se uma vez. Se a pessoa escolher outra moeda no painel, essa
   escolha manda para sempre — o palpite nunca a contradiz.
   ============================================================ */
(function moeda() {
  const CHAVE = 'vf:moeda';
  try { if (localStorage.getItem(CHAVE)) return; } catch (e) { return; }

  const porFuso = {
    'Europe/Lisbon': 'EUR', 'Atlantic/Madeira': 'EUR', 'Atlantic/Azores': 'EUR',
    'Europe/Madrid': 'EUR', 'Europe/Paris': 'EUR', 'Europe/Brussels': 'EUR',
    'Europe/Berlin': 'EUR', 'Europe/Rome': 'EUR', 'Europe/Amsterdam': 'EUR',
    'Europe/Dublin': 'EUR', 'Europe/Luxembourg': 'EUR',
    'Europe/London': 'GBP',
    'Africa/Luanda': 'AOA',
    'Atlantic/Cape_Verde': 'CVE',
    'Africa/Maputo': 'EUR',   // sem metical na lista de moedas da aplicação
    'America/New_York': 'USD', 'America/Chicago': 'USD', 'America/Denver': 'USD',
    'America/Los_Angeles': 'USD', 'America/Phoenix': 'USD'
  };

  let escolha = null;
  try {
    const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (porFuso[fuso]) escolha = porFuso[fuso];
    // Todo o Brasil usa fusos America/… próprios; apanham-se todos de uma vez.
    else if (/^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe)/.test(fuso)) escolha = 'BRL';
    else if (/^Europe\//.test(fuso)) escolha = 'EUR';
  } catch (e) {}

  if (!escolha) {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('pt-br')) escolha = 'BRL';
    else if (lang.startsWith('pt')) escolha = 'EUR';
    else if (lang.startsWith('en-gb')) escolha = 'GBP';
    else if (lang.startsWith('en-us')) escolha = 'USD';
  }

  if (escolha) {
    try { localStorage.setItem(CHAVE, escolha); } catch (e) {}
  }
})();

/* ---------- o mês do cartão de exemplo ----------
   O exemplo da página inicial tinha a data escrita à mão e envelheceu. Num
   telemóvel é a primeira coisa que aparece, antes do próprio título — ou
   seja, a primeira impressão do site era um mês do ano passado. */
(function mesDoExemplo() {
  const el = document.getElementById('pv-mes');
  if (!el) return;
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = new Date();
  el.textContent = meses[d.getMonth()] + ' ' + d.getFullYear();
})();

/* ---------- PWA ---------- */
(function pwa() {
  if (!('serviceWorker' in navigator)) return;
  // Em `file://` o registo rebenta sempre — só faz sentido em http(s).
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  // O `sw.js` está na raiz do site, mas a aplicação vive em `/app/`. Um
  // caminho relativo simples procurava-o em `/app/sw.js` e dava 404 — e sem
  // service worker não há funcionamento offline nenhum.
  //
  // A raiz descobre-se pelo `link rel="manifest"`, que cada página já aponta
  // correctamente para a raiz. Assim isto funciona a qualquer profundidade e
  // sem escrever o caminho do repositório à mão.
  const raiz = raizDoSite();

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(raiz + 'sw.js', { scope: raiz }).catch(() => {});
  });
})();

/* ============================================================
   Instalar como app (PWA)

   O botão e o modal são criados aqui e injectados em todas as páginas, em
   vez de escritos no HTML de cada uma — assim não há hipótese de uma página
   ficar para trás quando os passos de instalação mudarem.

   Os passos são diferentes em cada sistema e há duas armadilhas conhecidas:
   o iPad moderno diz ao site que é um Mac, e o Firefox não instala de todo.
   Mostrar os passos errados é pior do que não mostrar nenhuns, por isso a
   detecção trata os dois casos.
   ============================================================ */
(function instalar() {
  if (!document.body) return;

  /* ---------- que dispositivo é este ---------- */
  function detectar() {
    const ua = navigator.userAgent || '';
    const plataforma = navigator.platform || '';
    const toques = navigator.maxTouchPoints || 0;

    // Desde o iPadOS 13 que o iPad se apresenta como Mac. O que o denuncia é
    // ter ecrã táctil: um Mac verdadeiro devolve 0 pontos de toque.
    const iPadDisfarcado = /Mac/.test(plataforma) && toques > 1;

    if (/iPad/.test(ua) || iPadDisfarcado) {
      return { sistema: 'ios', nome: 'iPad', icone: '📱' };
    }
    if (/iPhone|iPod/.test(ua)) {
      return { sistema: 'ios', nome: 'iPhone', icone: '📱' };
    }
    if (/Android/.test(ua)) {
      // Sem "Mobile" no user agent, é um tablet Android.
      const tablet = !/Mobile/.test(ua);
      return { sistema: 'android', nome: tablet ? 'tablet Android' : 'Android', icone: '🤖' };
    }
    if (/CrOS/.test(ua))    return { sistema: 'desktop', nome: 'Chromebook', icone: '💻' };
    if (/Windows/.test(ua)) return { sistema: 'desktop', nome: 'Windows',    icone: '💻' };
    if (/Mac/.test(ua))     return { sistema: 'desktop', nome: 'Mac',        icone: '💻' };
    if (/Linux|X11/.test(ua)) return { sistema: 'desktop', nome: 'Linux',    icone: '💻' };
    return { sistema: 'desktop', nome: 'computador', icone: '💻' };
  }

  function navegador() {
    const ua = navigator.userAgent || '';
    if (/Firefox|FxiOS/.test(ua)) return 'firefox';
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\/|Opera/.test(ua)) return 'opera';
    if (/Chrome|CriOS/.test(ua)) return 'chrome';
    if (/Safari/.test(ua)) return 'safari';
    return 'outro';
  }

  // Já instalada: a página corre fora do navegador.
  function jaInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  const eq = detectar();
  const nav = navegador();

  let pedidoNativo = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    pedidoNativo = e;
  });

  // Já dentro da app instalada não há nada a oferecer: nem abrir a aplicação
  // (é onde se está), nem instalar (já está).
  if (jaInstalada()) return;

  /* ---------- botão flutuante ----------
     Fora da aplicação, o botão leva à aplicação. É esse o seu trabalho, e é
     o que qualquer pessoa espera de um botão em destaque num site que tem
     uma aplicação lá dentro.

     Só na própria página da aplicação é que ele passa a oferecer o atalho
     para o ecrã do telemóvel — aí a pessoa já lá está, e pôr o ícone no
     telefone é a única coisa que ainda falta oferecer-lhe. */
  const naApp = /(^|\/)app\/?$|(^|\/)app\.html$/.test(location.pathname.replace(/index\.html$/, ''));

  let botao;
  if (!naApp) {
    botao = document.createElement('a');
    botao.href = raizDoSite() + 'app/';
    botao.className = 'app-float';
    botao.setAttribute('aria-label', 'Abrir a app Vida Financeira');
    botao.innerHTML = '<span><span class="af-ic">📱</span>APP</span>';
    document.body.appendChild(botao);
    return;   // sem modal: este botão navega, não abre nada
  }

  botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'app-float';
  botao.setAttribute('aria-label', 'Pôr a Vida Financeira no ecrã do telemóvel');
  botao.innerHTML = '<span><span class="af-ic">📲</span>INSTALAR</span>';
  document.body.appendChild(botao);

  /* ---------- modal ---------- */
  const modal = document.createElement('div');
  modal.className = 'app-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="app-modal-box" role="dialog" aria-modal="true" aria-label="Instalar a aplicação">' +
      '<button class="app-modal-close" aria-label="Fechar">&times;</button>' +
      '<img class="app-modal-logo" src="' + raizDoSite() + 'img/logo-marca.png" alt="">' +
      '<h3>Levar consigo</h3>' +
      '<p>Fica com um ícone no ecrã inicial e abre sem barra do navegador. ' +
         'Não passa pela App Store nem pela Play Store.</p>' +
      '<a class="app-open-btn" href="app/">Abrir o meu mês</a>' +
      '<div class="app-or"><span>ou instalar no ecrã</span></div>' +
      '<div class="app-detectado"></div>' +
      '<div class="app-steps"></div>' +
    '</div>';
  document.body.appendChild(modal);

  const caixaDetectado = modal.querySelector('.app-detectado');
  const passos = modal.querySelector('.app-steps');

  function mostrarPassos(html) {
    passos.innerHTML = html;
    passos.classList.add('show');
  }

  /* ---------- instruções, por dispositivo ---------- */
  function instrucoes() {
    if (eq.sistema === 'ios') {
      // No iOS só o Safari consegue adicionar ao ecrã principal. Mandar
      // alguém tentar no Chrome é mandá-lo procurar um botão que não existe.
      if (nav !== 'safari') {
        return '<div class="app-aviso">No ' + eq.nome + ', só o <b>Safari</b> consegue ' +
               'instalar. Abra este endereço no Safari e toque outra vez aqui.</div>';
      }
      return '<ol>' +
        '<li>Toque no botão <b>Partilhar</b> — o quadrado com uma seta para cima.</li>' +
        '<li>Deslize para baixo e escolha <b>Adicionar ao ecrã principal</b>.</li>' +
        '<li>Toque em <b>Adicionar</b>, no canto superior direito.</li>' +
        '</ol><p class="app-nota">A Apple não deixa instalar com um só toque — ' +
        'estes três passos fazem-se uma vez e ficam feitos.</p>';
    }

    if (nav === 'firefox') {
      return '<div class="app-aviso">O Firefox não instala aplicações web neste ' +
             'sistema. Abra o endereço no <b>Chrome</b> ou no <b>Edge</b> para ' +
             'instalar — ou continue a usar aqui, que funciona na mesma.</div>';
    }

    if (eq.sistema === 'android') {
      return '<ol>' +
        '<li>Abra o menu <b>⋮</b> do navegador.</li>' +
        '<li>Toque em <b>Instalar aplicação</b> (ou "Adicionar ao ecrã principal").</li>' +
        '<li>Confirme em <b>Instalar</b>.</li>' +
        '</ol>';
    }

    return '<ol>' +
      '<li>Na barra de endereço, clique no ícone de <b>instalar</b> — ' +
          'um monitor com uma seta, à direita.</li>' +
      '<li>Confirme em <b>Instalar</b>.</li>' +
      '</ol><p class="app-nota">Se não vir o ícone, o menu <b>⋮</b> tem a mesma ' +
      'opção. A app fica na área de trabalho como qualquer outra.</p>';
  }

  function abrirModal() {
    caixaDetectado.innerHTML =
      '<span class="app-eq-ic">' + eq.icone + '</span>' +
      '<span>Detectámos <b>' + eq.nome + '</b>. Os passos abaixo são para si.</span>';
    passos.className = 'app-steps';

    // No Android e no computador, o navegador pode instalar sozinho. Nesse
    // caso o botão vale mais do que qualquer lista de passos.
    if (pedidoNativo) {
      mostrarPassos(
        '<button class="btn btn-gold app-instalar-ja" type="button">Instalar agora</button>' +
        '<p class="app-nota">Um toque. O navegador trata do resto.</p>'
      );
      const b = passos.querySelector('.app-instalar-ja');
      b.addEventListener('click', () => {
        pedidoNativo.prompt();
        pedidoNativo.userChoice.then(r => {
          mostrarPassos(r.outcome === 'accepted'
            ? '<div class="app-ok">Instalada. Procure o ícone no seu ecrã.</div>'
            : '<div class="app-aviso">Sem problema — pode instalar quando quiser, ' +
              'voltando a tocar no botão.</div>');
          pedidoNativo = null;
        });
      });
    } else {
      mostrarPassos(instrucoes());
    }

    modal.hidden = false;
  }

  const fechar = () => { modal.hidden = true; };

  botao.addEventListener('click', abrirModal);
  modal.querySelector('.app-modal-close').addEventListener('click', fechar);
  modal.addEventListener('click', e => { if (e.target === modal) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  // Qualquer ligação com class="js-abrir-app" passa a abrir este modal.
  document.querySelectorAll('.js-abrir-app').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); abrirModal(); });
  });
})();
