/* ============================================================
   Vida Financeira — o banner que conta o que a aplicação faz

   Quem entra num site de contas não descobre sozinho que dá para escrever
   "gastei 30 no continente" e ficar lançado, nem que quem cria conta tem um
   mês aberto. Isso tem de ser dito — e dito onde a pessoa está, não numa
   página "funcionalidades" que ninguém abre.

   Quatro regras, e as três primeiras são sobre respeito:

   1. Nunca aparece o que já não se aplica. Quem tem chave não vê o convite
      para a assinatura; quem está no mês de experiência vê quantos dias lhe
      faltam, não um anúncio. Um banner que oferece o que a pessoa já comprou
      é a forma mais rápida de a irritar.

   2. Fecha-se, e volta na visita seguinte. Isto já foi ao contrário — fechado
      era fechado para sempre — e estava errado: quem fecha um aviso está a
      dizer "agora não", não "nunca mais". Fica escondido enquanto o separador
      estiver aberto e reaparece quando a pessoa volta, que é quando há outra
      vez espaço para o ler.

   3. Pára quando se lhe toca, e passa-se com o dedo para o lado. Um carrossel
      que só anda sozinho obriga a esperar sete segundos para ver a mensagem
      seguinte — ou a caçar um ponto de oito píxeis.

   4. Respeita quem pediu menos movimento no sistema (`prefers-reduced-motion`):
      aí não roda sozinho, e ficam os pontos e o dedo.
   ============================================================ */

/* `sessionStorage` e não `localStorage`, de propósito: dura o que durar o
   separador. É isso que faz o banner voltar amanhã sem voltar daqui a dois
   segundos. */
const BANNER_FECHADO = 'vf:banner-fechado';
const BANNER_INTERVALO = 7000;
const BANNER_ARRASTO = 45;   /* píxeis a partir dos quais é um gesto e não um toque */

let bannerAviso = [];
let bannerI = 0;
let bannerTimer = null;
let bannerParado = false;
let bannerDispensado = false;

/* ------------------------------------------------------------
   O estado do acesso, com e sem o ferramentas.js

   Dentro da aplicação existem `temPremium()` e `diasDeTeste()`, que são a
   verdade — validam o formato da chave, o dígito de controlo e o mês de
   validade. Na página de entrada esse ficheiro não está carregado, e carregá-lo
   só por causa do banner traria com ele todo o comportamento da página das
   ferramentas.

   Por isso há aqui uma leitura de recurso. Para o mês de experiência é a mesma
   conta (data de início mais trinta dias). Para a chave, o recurso limita-se a
   ver se existe alguma guardada, sem validar nada: a única decisão que daqui
   sai é se se mostra ou não um convite para assinar, e mostrar o convite a
   quem já pagou é pior erro do que o calar a quem tem uma chave caducada.
   ------------------------------------------------------------ */
function bannerTemChave() {
  if (typeof temPremium === 'function') return temPremium();
  try { return !!(localStorage.getItem('vf:chave') || '').trim(); } catch (e) { return false; }
}

function bannerDias() {
  if (typeof diasDeTeste === 'function') return diasDeTeste();
  try {
    const t = JSON.parse(localStorage.getItem('vf:teste') || 'null');
    if (!t || typeof t.inicio !== 'string') return 0;
    const d = new Date(t.inicio);
    if (isNaN(d)) return 0;
    const fim = new Date(d.getTime());
    fim.setDate(fim.getDate() + 30);
    return fim > new Date() ? Math.ceil((fim - new Date()) / 86400000) : 0;
  } catch (e) { return 0; }
}

/* As mensagens são montadas com o estado real: o que a pessoa já tem muda o
   que faz sentido dizer-lhe. */
/* O banner fala a língua da aplicação. Não a da mensagem, porque aqui não há
   mensagem nenhuma — é a app a dirigir-se a quem está a olhar. */
function bt(chave, vars) {
  return (typeof T === 'function') ? T(chave, vars) : chave;
}

function bannerMensagens() {
  const temChave = bannerTemChave();
  const dias = bannerDias();
  const naApp = /\/app\/?$/.test(location.pathname) || /\/app\//.test(location.pathname);

  const m = [];

  /* --- o estado da assinatura, primeiro --- */
  if (temChave) {
    /* Quem já pagou não leva anúncios. Fica só o que lhe é útil. */
  } else if (dias > 0) {
    m.push({
      etiqueta: bt('bn.mes.t'),
      texto: dias === 1 ? bt('bn.mes.1') : bt('bn.mes.n', { d: dias }),
      accao: null
    });
  } else {
    m.push({
      etiqueta: bt('bn.gratis.t'),
      texto: bt('bn.gratis'),
      accao: { texto: bt('bn.gratis.b'), href: 'conta.html' }
    });
  }

  /* --- o que a aplicação faz, e que ninguém adivinha ---

     Cada uma leva a pessoa ao sítio de que fala. Fora da aplicação por
     endereço (o `#nome` é lido no arranque e abre logo esse ecrã); lá dentro
     por `irEcra`, que troca de separador sem recarregar nada. */
  const leva = (texto, ecra) => naApp
    ? { texto: texto, ecra: ecra }
    : { texto: texto, href: 'app/#' + ecra };

  m.push({ etiqueta: bt('bn.escrever.t'), texto: bt('bn.escrever'),
           accao: leva(bt('bn.experimentar'), 'wesley') });
  m.push({ etiqueta: bt('bn.talao.t'), texto: bt('bn.talao'),
           accao: leva(bt('bn.experimentar'), 'wesley') });
  m.push({ etiqueta: bt('bn.contas.t'), texto: bt('bn.contas'),
           accao: leva(bt('bn.chat'), 'wesley') });
  m.push({ etiqueta: bt('bn.vence.t'), texto: bt('bn.vence'),
           accao: leva(bt('bn.vercontas'), 'contas') });
  m.push({ etiqueta: bt('bn.divida.t'), texto: bt('bn.divida'),
           accao: leva(bt('bn.verconta'), 'divida') });
  m.push({ etiqueta: bt('bn.seu.t'), texto: bt('bn.seu'), accao: null });

  return m;
}

function bannerDesenhar() {
  const zona = document.getElementById('banner-corpo');
  const pontos = document.getElementById('banner-pontos');
  if (!zona || !bannerAviso.length) return;

  const m = bannerAviso[bannerI];
  zona.innerHTML = '';

  const et = document.createElement('span');
  et.className = 'bn-etiqueta';
  et.textContent = m.etiqueta;

  const tx = document.createElement('p');
  tx.className = 'bn-texto';
  tx.textContent = m.texto;

  zona.append(et, tx);

  if (m.accao && m.accao.ecra) {
    /* Dentro da aplicação não se navega: troca-se de separador. Um <a> com
       `#wesley` mudava o endereço sem mudar o ecrã, porque o `hash` só é lido
       no arranque — e o resultado era um botão que parecia avariado. */
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bn-accao';
    b.textContent = m.accao.texto + ' ›';
    b.addEventListener('click', () => {
      if (typeof window.irEcra === 'function') window.irEcra(m.accao.ecra);
    });
    zona.appendChild(b);
  } else if (m.accao) {
    const a = document.createElement('a');
    a.className = 'bn-accao';
    a.href = (typeof raizDoSite === 'function' ? raizDoSite() : './') + m.accao.href;
    a.textContent = m.accao.texto + ' ›';
    zona.appendChild(a);
  }

  /* Os leitores de ecrã anunciam a mudança uma vez, sem interromper: é uma
     zona de aviso educado e não um alarme. */
  zona.setAttribute('aria-live', 'polite');

  if (pontos) {
    Array.prototype.forEach.call(pontos.children, (b, i) => {
      b.setAttribute('aria-selected', String(i === bannerI));
      b.setAttribute('aria-label', 'Mensagem ' + (i + 1) + ' de ' + bannerAviso.length);
    });
  }
}

function bannerIr(i) {
  bannerI = (i + bannerAviso.length) % bannerAviso.length;
  bannerDesenhar();
}

function bannerAndar() {
  if (bannerParado) return;
  bannerIr(bannerI + 1);
}

function bannerComecar() {
  bannerParar();
  const menosMovimento = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (menosMovimento || bannerAviso.length < 2) return;
  bannerTimer = setInterval(bannerAndar, BANNER_INTERVALO);
}

function bannerParar() {
  if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
}

function bannerFechar() {
  const el = document.getElementById('banner');
  bannerDispensado = true;
  if (el) el.hidden = true;
  document.body.classList.remove('com-banner');
  bannerVisivelAgora = false;
  bannerParar();
  try { sessionStorage.setItem(BANNER_FECHADO, '1'); } catch (e) {}
}

/* ------------------------------------------------------------
   No ecrã do chat, cala-se

   O chat mede-se em fracções do ecrã (`max-height:62vh`) e já tem, escrita à
   cabeça, a mesma coisa que o banner diria — que se pode escrever «gastei 30
   no continente» e que ele faz as contas. Um banner de 190px por cima disso
   empurrava a caixa de escrever para longe do fundo do ecrã, e repetia o que
   estava logo abaixo.

   É esconder, não é dispensar: nos outros ecrãs volta, e nada fica guardado. */
function bannerNesteEcra() {
  const a = document.querySelector('.ecra.activo');
  return !a || a.id !== 'ecra-wesley';
}

/* `null` = ainda não se decidiu nada. Guardar a última decisão é o que impede
   o observador de reiniciar o relógio a cada classe que muda algures na
   página — sem isto, o banner parecia parado, porque os sete segundos nunca
   chegavam ao fim. */
let bannerVisivelAgora = null;

function bannerAoEcra() {
  const el = document.getElementById('banner');
  if (!el || bannerDispensado || !bannerAviso.length) return;
  const mostrar = bannerNesteEcra();
  if (mostrar === bannerVisivelAgora) return;
  bannerVisivelAgora = mostrar;
  /* A casca da aplicação precisa de saber: com o banner à frente, os ecrãs
     deixam de guardar espaço para a barra de cima, senão ficam os dois. */
  document.body.classList.toggle('com-banner', mostrar);
  if (mostrar) { el.hidden = false; bannerComecar(); }
  else { el.hidden = true; bannerParar(); }
}

function bannerLigar() {
  const el = document.getElementById('banner');
  if (!el) return;

  try {
    if (sessionStorage.getItem(BANNER_FECHADO) === '1') { el.hidden = true; return; }
    /* Quem tinha o banner fechado para sempre pela versão anterior volta a
       vê-lo: a marca antiga é apagada em vez de respeitada. */
    localStorage.removeItem(BANNER_FECHADO);
  } catch (e) {}

  bannerAviso = bannerMensagens();
  if (!bannerAviso.length) { el.hidden = true; return; }

  const pontos = document.getElementById('banner-pontos');
  if (pontos) {
    pontos.innerHTML = '';
    bannerAviso.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bn-ponto';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { bannerIr(i); bannerComecar(); });
      pontos.appendChild(b);
    });
  }

  const fechar = document.getElementById('banner-fechar');
  if (fechar) fechar.addEventListener('click', bannerFechar);

  /* Parar enquanto se lê, e retomar ao sair. Rodar por baixo do dedo de quem
     está a ler é tirar-lhe a frase a meio. */
  ['mouseenter', 'focusin'].forEach(ev =>
    el.addEventListener(ev, () => { bannerParado = true; }, { passive: true }));
  ['mouseleave', 'focusout'].forEach(ev =>
    el.addEventListener(ev, () => { bannerParado = false; }, { passive: true }));

  /* ---- passar com o dedo ----
     O que faltava e que dava a sensação de estar avariado: os pontos são
     alvos de oito píxeis, e ninguém acerta neles a andar na rua. Arrastar
     para a esquerda vai à mensagem seguinte, para a direita à anterior. */
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', e => {
    bannerParado = true;
    const t = e.touches && e.touches[0];
    if (t) { x0 = t.clientX; y0 = t.clientY; }
  }, { passive: true });

  el.addEventListener('touchend', e => {
    bannerParado = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || x0 === null) { x0 = null; return; }
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    /* Só conta como gesto lateral se andou mais para o lado do que para
       cima ou para baixo — senão, rolar a página trocava de mensagem. */
    if (Math.abs(dx) < BANNER_ARRASTO || Math.abs(dx) < Math.abs(dy)) return;
    bannerIr(bannerI + (dx < 0 ? 1 : -1));
    bannerComecar();
  }, { passive: true });

  /* Com rato, e para quem usa o teclado. */
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { bannerIr(bannerI - 1); bannerComecar(); }
    if (e.key === 'ArrowRight') { bannerIr(bannerI + 1); bannerComecar(); }
  });

  /* Um separador escondido não deve consumir tempo nem bateria. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) bannerParar();
    else if (!el.hidden) bannerComecar();
  });

  bannerI = 0;
  bannerDesenhar();
  bannerAoEcra();

  /* Quem manda nos separadores é o app/index.html, e o que ele faz é trocar a
     classe `.activo`. Ficar à escuta dessa troca é o que dispensa o banner de
     saber como a navegação funciona — se amanhã houver mais ecrãs, isto
     continua a valer sem se lhe mexer. */
  if (window.MutationObserver && document.querySelector('.ecra')) {
    new MutationObserver(bannerAoEcra).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class']
    });
  }

  /* Se o acesso mudar (alguém acabou de criar conta, ou escreveu a chave), as
     mensagens deixam de fazer sentido — refazem-se. */
  /* Mudar de língua refaz as mensagens: um banner meio em inglês e meio em
     português é pior do que qualquer um dos dois. */
  window.addEventListener('vf:lingua-mudou', () => {
    bannerAviso = bannerMensagens();
    bannerDesenhar();
  });

  window.addEventListener('vf:acesso-mudou', () => {
    const antes = bannerAviso.length;
    bannerAviso = bannerMensagens();
    if (bannerAviso.length !== antes) bannerI = 0;
    bannerDesenhar();
    bannerAoEcra();
  });
}

document.addEventListener('DOMContentLoaded', bannerLigar);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bannerMensagens, bannerDias, bannerTemChave, bannerNesteEcra };
}
