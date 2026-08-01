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

/* ---------- "Entrar / Criar conta" passa a nome quando há sessão ---------- */
(function navConta() {
  const link = document.getElementById('nav-conta');
  if (!link || typeof firebase === 'undefined' || !window.auth) return;

  auth.onAuthStateChanged(u => {
    if (!u) {
      link.textContent = 'Entrar / Criar conta';
      link.className = link.className.replace('nav-account', '').trim();
      link.href = 'conta.html';
      return;
    }
    const nome = u.displayName || (u.email || '').split('@')[0] || 'A minha conta';
    link.href = 'conta.html';
    link.classList.add('nav-account');
    link.textContent = '';

    const av = document.createElement('span');
    av.className = 'nav-avatar';
    av.textContent = nome.charAt(0).toUpperCase();

    const txt = document.createElement('span');
    txt.textContent = nome;

    link.append(av, txt);
  });
})();

/* ---------- PWA ---------- */
(function pwa() {
  if (!('serviceWorker' in navigator)) return;
  // Em `file://` o registo rebenta sempre — só faz sentido em http(s).
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
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

  // Dentro da app instalada, um botão a dizer "Instalar app" não faz sentido.
  if (jaInstalada()) return;

  /* ---------- botão flutuante ---------- */
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'app-float';
  botao.setAttribute('aria-label', 'Instalar a aplicação Vida Financeira');
  botao.innerHTML = '<span class="af-ic">⬇</span> Instalar app';
  document.body.appendChild(botao);

  /* ---------- modal ---------- */
  const modal = document.createElement('div');
  modal.className = 'app-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="app-modal-box" role="dialog" aria-modal="true" aria-label="Instalar a aplicação">' +
      '<button class="app-modal-close" aria-label="Fechar">&times;</button>' +
      '<img class="app-modal-logo" src="img/logo-marca.png" alt="">' +
      '<h3>Levar consigo</h3>' +
      '<p>Fica com um ícone no ecrã inicial e abre sem barra do navegador. ' +
         'Não passa pela App Store nem pela Play Store.</p>' +
      '<a class="app-open-btn" href="app.html">Abrir o meu mês</a>' +
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
