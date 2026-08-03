/* ============================================================
   Vida Financeira — a casa partilhada

   Um casal tem uma casa e duas pessoas. A aplicação já sabia separar de quem
   era o dinheiro — a conta dele, a dela, a de emergência — mas cada pessoa
   tinha a sua cópia dos movimentos, e as duas cópias não se falavam. Quem
   lançava o mercado era quem se lembrava; o outro via um mês incompleto e
   deixava de confiar no número.

   Isto liga as duas contas a **uma casa**: um sítio só onde os movimentos
   vivem, com as duas pessoas lá dentro, e cada lançamento a aparecer no
   telemóvel do outro em segundos.

   ---- Uma casa, e não duas cópias a espelharem-se ----

   A tentação é cada telemóvel manter a sua cópia e mandá-la ao outro. É onde
   estes sistemas se partem: duas cópias a tentarem acertar uma pela outra
   discordam mais depressa do que se corrigem, e ninguém sabe qual delas está
   certa. Aqui há um documento e duas pessoas com a chave dele.

   ---- O código é um convite, não uma chave ----

   Um código permanente que dá acesso às finanças de alguém acaba escrito num
   papel, num print, num grupo de família. Este vale **24 horas e uma vez só**.
   Depois de usado, morre — e quem quiser entrar outra vez precisa de um novo,
   pedido a quem já lá está.

   ---- Sair é tão importante como entrar ----

   Isto não é um pormenor de arrumação: uma aplicação de dinheiro usada por
   casais tem de deixar uma pessoa sair **hoje**, sozinha, sem pedir licença, e
   levar uma cópia de tudo. Uma relação que acaba mal não pode deixar ninguém a
   ver as contas do outro nem a ficar sem as suas. É a única funcionalidade
   deste ficheiro que não pode falhar.

   ---- O que acontece quando os dois lançam ao mesmo tempo ----

   Os movimentos têm `id`. Juntam-se pelo `id` e nunca se somam duas vezes,
   mesmo que os dois telemóveis estejam sem rede a lançar o mesmo mês. Apagar
   é o caso difícil: sem memória do que foi apagado, o movimento volta na
   sincronização seguinte, mandado pelo telemóvel que não soube. Por isso o que
   se apaga deixa marca — e a marca ganha sempre à cópia antiga.
   ============================================================ */

const CASA_CHAVE = 'vf:casa';
const CASA_APAGADOS = 'vf:casa-apagados';

/* Sem I, O, 0 e 1: um código lê-se em voz alta, de um telemóvel para o outro,
   muitas vezes por uma pessoa que não vê bem ao perto. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODIGO_HORAS = 24;
const APAGADOS_DIAS = 180;

/* ============================================================
   A parte que decide o que sobrevive — sem Firebase, sem ecrã,
   e por isso testável.
   ============================================================ */

function casaCodigoNovo(aleatorio) {
  const sorteia = aleatorio || (() => {
    const b = new Uint8Array(8);
    (typeof crypto !== 'undefined' ? crypto : { getRandomValues: a => a })
      .getRandomValues(b);
    return b;
  });
  const bytes = sorteia();
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[bytes[i] % ALFABETO.length];
  return 'VF-CASA-' + s.slice(0, 4) + '-' + s.slice(4);
}

/* Aceita-se o código escrito como sair: com espaços, sem traços, em
   minúsculas. Quem o está a escrever tem o outro telemóvel na mão. */
function casaLimparCodigo(txt) {
  const cru = String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const corpo = cru.replace(/^VFCASA/, '');
  if (corpo.length !== 8) return null;
  for (let i = 0; i < corpo.length; i++) {
    if (ALFABETO.indexOf(corpo[i]) === -1) return null;
  }
  return 'VF-CASA-' + corpo.slice(0, 4) + '-' + corpo.slice(4);
}

/* Marcas do que foi apagado. Guarda-se o id e quando — o valor não, que já
   não é da conta de ninguém. Ao fim de seis meses a marca sai: um movimento
   apagado há meio ano não volta de telemóvel nenhum. */
function casaMarcarApagados(marcas, ids, agora) {
  const t = agora || Date.now();
  const fora = Array.isArray(marcas) ? marcas.slice() : [];
  const tenho = {};
  fora.forEach(x => { if (x && x.id) tenho[x.id] = true; });
  (ids || []).forEach(id => {
    if (typeof id === 'string' && id && !tenho[id]) fora.push({ id: id, em: t });
  });
  const limite = t - APAGADOS_DIAS * 86400000;
  return fora.filter(x => x && x.id && Number(x.em) > limite).slice(-500);
}

/* Juntar dois lados. Pelo `id`, e o que estiver marcado como apagado sai —
   mesmo que o outro lado ainda o tenha.

   A regra quando os dois mexeram no mesmo movimento é: apagar ganha. Entre
   ressuscitar um gasto que alguém apagou de propósito e perder uma correcção
   feita ao mesmo gasto, prefere-se perder a correcção. Um movimento a mais
   nas contas de uma casa é uma discussão; um número desactualizado é uma
   correcção repetida. */
function casaFundirMovimentos(deLa, daqui, marcas, normaliza) {
  const nrm = normaliza || (m => m);
  const fora = {};
  (marcas || []).forEach(x => { if (x && x.id) fora[x.id] = true; });

  const porId = {};
  [].concat(deLa || [], daqui || []).forEach(m => {
    const n = nrm(m);
    if (!n || !n.id || fora[n.id]) return;
    porId[n.id] = n;
  });
  return Object.keys(porId).map(k => porId[k]);
}

/* Um retrato — o saldo de uma carteira, a dívida — não se junta: escolhe-se.
   De dois retratos do mesmo instante vale o mais recente, venha de quem vier. */
function casaMaisRecente(a, b) {
  const va = a && isFinite(Number(a.valor)) ? Number(a.em) || 0 : -1;
  const vb = b && isFinite(Number(b.valor)) ? Number(b.em) || 0 : -1;
  if (va < 0 && vb < 0) return null;
  return vb > va ? b : a;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    casaCodigoNovo, casaLimparCodigo, casaMarcarApagados,
    casaFundirMovimentos, casaMaisRecente, ALFABETO
  };
}

/* ============================================================
   Daqui para baixo é o que fala com o Firebase e com o ecrã.
   Sem Firebase configurado, nada disto corre e a aplicação não
   dá por nada — como o resto da nuvem nesta aplicação.
   ============================================================ */

let casa = null;            /* { id, membros, nomes } quando há casa */
let casaEscuta = null;      /* a subscrição do onSnapshot, para se poder largar */
let casaEscutaMembros = null;
let casaAEscrever = false;  /* trava o eco: o que eu escrevo volta pelo snapshot */

function casaId() {
  try { return localStorage.getItem(CASA_CHAVE) || null; } catch (e) { return null; }
}

function casaDefinir(id) {
  try {
    if (id) localStorage.setItem(CASA_CHAVE, id);
    else localStorage.removeItem(CASA_CHAVE);
  } catch (e) {}
}

function casaApagados() {
  try {
    const v = JSON.parse(localStorage.getItem(CASA_APAGADOS) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

function casaGuardarApagados(lista) {
  try { localStorage.setItem(CASA_APAGADOS, JSON.stringify(lista)); } catch (e) {}
}

/* Chamado pelo `app-financas.js` sempre que se apaga alguma coisa. Sem isto,
   o que se apaga num telemóvel volta pelo outro. */
function casaRegistarApagados(ids) {
  if (!ids || !ids.length) return;
  casaGuardarApagados(casaMarcarApagados(casaApagados(), ids));
}

function casaPronta() {
  return !!(casaId() && typeof firebase !== 'undefined' && window.db &&
            window.auth && auth.currentUser);
}

/* ---------- escrever ----------
   Numa transacção, e não num `set` directo: dois telemóveis a lançar no mesmo
   segundo, com um `set`, apagam-se um ao outro — o segundo escreve por cima da
   lista que o primeiro acabou de gravar, e um lançamento desaparece sem
   ninguém dar por isso. A transacção relê, junta pelo id, e volta a tentar. */
function casaGuardar() {
  if (!casaPronta()) return Promise.resolve(false);
  const ref = db.collection('lares').doc(casaId());
  const marcas = casaApagados();
  casaAEscrever = true;

  return db.runTransaction(t => t.get(ref).then(doc => {
    const la = doc.exists ? (doc.data() || {}) : {};
    const juntos = casaFundirMovimentos(
      Array.isArray(la.movimentos) ? la.movimentos : [],
      movimentos, marcas,
      typeof normalizar === 'function' ? normalizar : null);

    const marcasJuntas = casaMarcarApagados(
      [].concat(Array.isArray(la.apagados) ? la.apagados : [], marcas), []);

    const carteirasJuntas = Object.assign({}, la.carteiras || {});
    (typeof CARTEIRAS !== 'undefined' ? CARTEIRAS : []).forEach(id => {
      const melhor = casaMaisRecente(la.carteiras && la.carteiras[id], carteiras[id]);
      if (melhor) carteirasJuntas[id] = melhor;
    });

    t.set(ref, {
      movimentos: juntos,
      apagados: marcasJuntas,
      carteiras: carteirasJuntas,
      lar: lar,
      dividaTotal: casaMaisRecente(la.dividaTotal, dividaTotal),
      contasFixas: { contas: contasFixas, pagas: contasPagas },
      actualizado: new Date().toISOString(),
      porQuem: auth.currentUser.uid
    }, { merge: true });
  })).then(() => {
    casaAEscrever = false;
    return true;
  }).catch(() => {
    casaAEscrever = false;
    if (typeof mostrarAviso === 'function') {
      mostrarAviso('Gravado neste telemóvel, mas ainda não na casa.', 'info');
    }
    return false;
  });
}

/* ---------- ouvir ----------
   Isto é o "tempo real": o Firestore avisa quando o documento muda, e o
   lançamento que a outra pessoa acabou de fazer aparece aqui sem se tocar em
   nada. Não se escreve de volta a partir daqui — seria um eco a dois. */
function casaOuvir() {
  casaLargar();
  if (!casaPronta()) return;

  const ref = db.collection('lares').doc(casaId());

  /* Quem está nesta casa. É uma subcolecção e não uma lista dentro do
     documento por uma razão de regras: quem está a entrar ainda não é membro,
     logo não pode ler o documento para se acrescentar a uma lista. Cada um
     cria o seu próprio papel, e é esse papel que lhe abre a porta. */
  casaEscutaMembros = ref.collection('membros').onSnapshot(qs => {
    const membros = [], nomes = {};
    qs.forEach(d => {
      membros.push(d.id);
      nomes[d.id] = (d.data() || {}).email || '';
    });
    casa = { id: ref.id, membros: membros, nomes: nomes };
    casaDesenharCartao();
  }, () => {});

  casaEscuta = ref.onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data() || {};
    if (casaAEscrever) return;      /* é o meu próprio eco */

    const marcas = casaMarcarApagados(
      [].concat(casaApagados(), Array.isArray(d.apagados) ? d.apagados : []), []);
    casaGuardarApagados(marcas);

    const antes = movimentos.length;
    movimentos = casaFundirMovimentos(
      Array.isArray(d.movimentos) ? d.movimentos : [], movimentos, marcas,
      typeof normalizar === 'function' ? normalizar : null);
    if (typeof desduplicarGrupos === 'function') movimentos = desduplicarGrupos(movimentos);

    if (d.carteiras && typeof CARTEIRAS !== 'undefined') {
      CARTEIRAS.forEach(id => {
        const melhor = casaMaisRecente(carteiras[id], d.carteiras[id]);
        if (melhor) carteiras[id] = melhor;
      });
    }
    if (d.lar && typeof d.lar.comQuem === 'string') lar = { comQuem: d.lar.comQuem };
    const dv = casaMaisRecente(dividaTotal, d.dividaTotal);
    if (dv) dividaTotal = dv;

    try {
      localStorage.setItem('vf:movimentos', JSON.stringify(movimentos));
      localStorage.setItem('vf:carteiras', JSON.stringify(carteiras));
      localStorage.setItem('vf:lar', JSON.stringify(lar));
    } catch (e) {}

    if (typeof desenhar === 'function') desenhar();

    const novos = movimentos.length - antes;
    if (novos > 0 && typeof mostrarAviso === 'function') {
      mostrarAviso(novos === 1 ? 'Chegou um lançamento da outra pessoa.'
                               : 'Chegaram ' + novos + ' lançamentos da outra pessoa.', 'ok');
    }
  }, () => {
    /* Deixar de poder ler é o que acontece a quem sai — ou a quem saiu no
       outro telemóvel. Fica-se com tudo o que já cá estava e volta-se a ser
       uma conta sozinha, sem perder um movimento. */
    casaSairLocal();
    if (typeof mostrarAviso === 'function') {
      mostrarAviso('Esta conta já não faz parte da casa. Os movimentos ficaram todos neste telemóvel.', 'info');
    }
  });
}

function casaLargar() {
  if (casaEscuta) { casaEscuta(); casaEscuta = null; }
  if (casaEscutaMembros) { casaEscutaMembros(); casaEscutaMembros = null; }
}

/* ---------- criar a casa e convidar ---------- */
function casaCriarConvite() {
  if (typeof firebase === 'undefined' || !window.db || !window.auth || !auth.currentUser) {
    return Promise.reject(new Error('sem-conta'));
  }
  const eu = auth.currentUser;
  const codigo = casaCodigoNovo();
  const expira = Date.now() + CODIGO_HORAS * 3600000;

  const criarLar = casaId()
    ? Promise.resolve(casaId())
    : (() => {
        const ref = db.collection('lares').doc();
        /* O `dono` fica escrito porque é o que permite a quem criou a casa ser
           o primeiro membro dela: não há convite nenhum para si próprio. */
        return ref.set({
          dono: eu.uid,
          criado: new Date().toISOString(),
          movimentos: movimentos,
          apagados: casaApagados(),
          carteiras: carteiras, lar: lar, dividaTotal: dividaTotal,
          contasFixas: { contas: contasFixas, pagas: contasPagas }
        })
        .then(() => ref.collection('membros').doc(eu.uid)
          .set({ email: eu.email || '', entrou: Date.now() }))
        .then(() => { casaDefinir(ref.id); return ref.id; });
      })();

  return criarLar.then(larId =>
    db.collection('convites').doc(codigo).set({
      lar: larId, de: eu.uid, criado: Date.now(), expira: expira, usado: false
    }).then(() => { casaOuvir(); return { codigo, expira }; })
  );
}

/* ---------- entrar com um código ---------- */
function casaEntrar(texto) {
  const codigo = casaLimparCodigo(texto);
  if (!codigo) return Promise.reject(new Error('formato'));
  if (typeof firebase === 'undefined' || !window.db || !window.auth || !auth.currentUser) {
    return Promise.reject(new Error('sem-conta'));
  }
  const eu = auth.currentUser;
  const cRef = db.collection('convites').doc(codigo);

  return cRef.get().then(doc => {
    if (!doc.exists) throw new Error('nao-existe');
    const c = doc.data() || {};
    if (c.usado) throw new Error('usado');
    if (Number(c.expira) < Date.now()) throw new Error('expirado');
    if (c.de === eu.uid) throw new Error('proprio');

    /* Não se lê o documento da casa antes de entrar — nem se podia: só os
       membros o lêem, e ainda não sou um. Cria-se o próprio papel de membro,
       com o código lá dentro, e é o Firestore que confirma que ele vale. */
    return db.collection('lares').doc(c.lar).collection('membros').doc(eu.uid)
      .set({ email: eu.email || '', entrou: Date.now(), convite: codigo })
      .then(() => cRef.set({ usado: true, usadoPor: eu.uid }, { merge: true }))
      .then(() => {
        casaDefinir(c.lar);
        casaOuvir();
        /* O que já estava neste telemóvel vai para a casa: quem entra leva o
           que tem, em vez de começar do zero na conta do outro. */
        return casaGuardar().then(() => c.lar);
      });
  });
}

/* ---------- sair ----------
   Sai-se sozinho e agora. Os movimentos ficam todos neste telemóvel — a saída
   nunca é uma perda de dados, é uma separação de caminhos. */
function casaSair() {
  const id = casaId();
  if (!id || !window.db || !auth.currentUser) { casaSairLocal(); return Promise.resolve(); }
  const eu = auth.currentUser.uid;

  /* Sai-se apagando o próprio papel de membro, e mais nada. Ninguém expulsa
     ninguém, e os movimentos ficam todos neste telemóvel: a saída é uma
     separação de caminhos, nunca uma perda de dados. */
  return db.collection('lares').doc(id).collection('membros').doc(eu).delete()
    .catch(() => {})
    .then(() => {
      casaSairLocal();
      if (typeof guardar === 'function') guardar();
    });
}

function casaSairLocal() {
  casaLargar();
  casa = null;
  casaDefinir(null);
  casaDesenharCartao();
}

/* ============================================================
   O ecrã
   ============================================================ */
function casaTexto(chave, omissao) {
  const v = (typeof T === 'function') ? T(chave) : chave;
  return (v && v !== chave) ? v : omissao;
}

function casaDesenharCartao() {
  const zona = document.getElementById('casa-corpo');
  if (!zona) return;
  zona.innerHTML = '';

  const semConta = typeof firebase === 'undefined' || !window.auth || !auth.currentUser;
  if (semConta) {
    zona.appendChild(casaLinha('p', casaTexto('casa.semconta',
      'Para partilhar as contas com quem vive consigo, cada um precisa da sua conta. É grátis e leva um minuto.')));
    const a = document.createElement('a');
    a.className = 'btn btn-gold';
    a.href = (typeof raizDoSite === 'function' ? raizDoSite() : '../') + 'conta.html';
    a.textContent = casaTexto('casa.criarconta', 'Criar conta ou entrar');
    zona.appendChild(a);
    return;
  }

  if (casa && casa.membros && casa.membros.length > 1) {
    zona.appendChild(casaLinha('p', casaTexto('casa.ligada',
      'Esta casa está a ser partilhada. Tudo o que um lança aparece no telemóvel do outro em segundos.')));
    const ul = document.createElement('ul');
    ul.className = 'casa-membros';
    casa.membros.forEach(uid => {
      const li = document.createElement('li');
      const eu = auth.currentUser.uid === uid;
      li.textContent = (casa.nomes && casa.nomes[uid]) || casaTexto('casa.alguem', 'outra pessoa');
      if (eu) li.textContent += ' · ' + casaTexto('casa.voce', 'você');
      ul.appendChild(li);
    });
    zona.appendChild(ul);
  } else if (casa) {
    zona.appendChild(casaLinha('p', casaTexto('casa.aespera',
      'A casa está criada e ainda é só sua. Dê o código à outra pessoa para ela entrar.')));
  } else {
    zona.appendChild(casaLinha('p', casaTexto('casa.oque',
      'Duas contas, as mesmas contas de casa. Um cria o código, o outro escreve-o, e a partir daí o que um lança aparece no telemóvel do outro.')));
  }

  /* --- criar código --- */
  const bt = document.createElement('button');
  bt.className = 'btn btn-gold';
  bt.type = 'button';
  bt.textContent = casaTexto('casa.gerar', 'Criar o código da nossa casa');
  bt.addEventListener('click', () => {
    bt.disabled = true;
    bt.textContent = casaTexto('casa.agerar', 'A criar…');
    casaCriarConvite().then(({ codigo }) => {
      casaDesenharCartao();
      const caixa = document.getElementById('casa-corpo');
      const cx = document.createElement('div');
      cx.className = 'casa-codigo';
      cx.innerHTML = '<b>' + codigo + '</b><span>' +
        casaTexto('casa.validade', 'Vale 24 horas e serve uma vez. Depois disso, faz-se outro.') +
        '</span>';
      caixa.insertBefore(cx, caixa.firstChild);
    }).catch(() => {
      bt.disabled = false;
      bt.textContent = casaTexto('casa.gerar', 'Criar o código da nossa casa');
      if (typeof mostrarAviso === 'function') {
        mostrarAviso(casaTexto('casa.erro', 'Não foi possível criar o código agora. Tente daqui a pouco.'), 'erro');
      }
    });
  });
  zona.appendChild(bt);

  /* --- entrar com código --- */
  const form = document.createElement('form');
  form.className = 'casa-entrar';
  form.innerHTML =
    '<label for="casa-codigo">' + casaTexto('casa.jatenho', 'Já tenho um código') + '</label>' +
    '<input id="casa-codigo" type="text" autocomplete="off" spellcheck="false" placeholder="VF-CASA-XXXX-XXXX">' +
    '<button class="btn" type="submit">' + casaTexto('casa.entrar', 'Entrar nesta casa') + '</button>' +
    '<div class="aviso" id="casa-aviso" hidden></div>';
  form.addEventListener('submit', e => {
    e.preventDefault();
    const campo = document.getElementById('casa-codigo');
    const aviso = document.getElementById('casa-aviso');
    const diz = (texto, tipo) => {
      aviso.hidden = false;
      aviso.className = 'aviso ' + tipo;
      aviso.textContent = texto;
    };
    casaEntrar(campo.value).then(() => {
      diz(casaTexto('casa.entrou', 'Entrou. As contas passam a ser as mesmas nos dois telemóveis.'), 'ok');
      setTimeout(casaDesenharCartao, 1200);
    }).catch(err => {
      const m = {
        formato: casaTexto('casa.errofmt', 'Esse código não tem o formato certo. São oito letras e números, como VF-CASA-4K7P-9RTM.'),
        'nao-existe': casaTexto('casa.erronao', 'Não encontrei esse código. Confirme se o copiou inteiro.'),
        usado: casaTexto('casa.errousado', 'Esse código já foi usado. Peça outro a quem o criou.'),
        expirado: casaTexto('casa.erroexp', 'Esse código já passou das 24 horas. Peça um novo.'),
        proprio: casaTexto('casa.erroproprio', 'Esse código é seu. É a outra pessoa que o tem de escrever.'),
        'sem-conta': casaTexto('casa.semsessao', 'Inicie sessão primeiro.')
      }[err && err.message] || casaTexto('casa.erro', 'Não foi possível agora. Tente daqui a pouco.');
      diz(m, 'erro');
    });
  });
  zona.appendChild(form);

  /* --- sair --- */
  if (casa) {
    const sair = document.createElement('button');
    sair.className = 'remover';
    sair.type = 'button';
    sair.textContent = casaTexto('casa.sair', 'Sair desta casa');
    sair.addEventListener('click', () => {
      if (!confirm(casaTexto('casa.sairconfirma',
        'Sair da casa? Os movimentos ficam todos neste telemóvel — não se perde nada. A outra pessoa deixa de ver o que lançar a partir de agora.'))) return;
      casaSair().then(() => {
        if (typeof mostrarAviso === 'function') {
          mostrarAviso(casaTexto('casa.saiu', 'Saiu da casa. Os movimentos ficaram consigo.'), 'ok');
        }
      });
    });
    zona.appendChild(sair);
  }
}

function casaLinha(tag, texto) {
  const e = document.createElement(tag);
  e.textContent = texto;
  return e;
}

document.addEventListener('DOMContentLoaded', () => {
  casaDesenharCartao();
  if (typeof firebase !== 'undefined' && window.auth) {
    auth.onAuthStateChanged(() => {
      if (casaId()) casaOuvir(); else casaSairLocal();
      casaDesenharCartao();
    });
  }
});
