/* ============================================================
   Vida Financeira — painel de administração

   Gera chaves de assinatura e mostra o facturado. Só abre para os emails
   em ADMIN_EMAILS, e as regras do Firestore verificam o mesmo email do lado
   do servidor — mudar a lista no navegador não dá acesso a dados nenhuns.

   As vendas ficam em `vendas/{id}`, uma colecção que só o administrador lê e
   escreve. Não guarda nada sobre quem usa a aplicação: os movimentos das
   pessoas continuam onde sempre estiveram, no dispositivo delas e na sua
   própria área privada.
   ============================================================ */

const PRECOS = {
  EUR: { valor: 9.89,  simbolo: '€',   pais: 'Portugal / Europa' },
  BRL: { valor: 29.00, simbolo: 'R$',  pais: 'Brasil' },
  AOA: { valor: 4900,  simbolo: 'Kz',  pais: 'Angola' },
  CVE: { valor: 490,   simbolo: '$',   pais: 'Cabo Verde' },
  GBP: { valor: 8.49,  simbolo: '£',   pais: 'Reino Unido' },
  USD: { valor: 10.90, simbolo: '$',   pais: 'Estados Unidos' }
};

let vendas = [];
let admin = null;
let admins = [];

/* O dono é sempre administrador e não se retira. É o que impede alguém —
   incluindo o próprio — de ficar de fora do painel por engano. */
const DONO = 'wly.vianna@gmail.com';

/* ---------- gerar a chave ---------- */
function digito(corpo) {
  let s = 0;
  for (let i = 0; i < corpo.length; i++) s += corpo.charCodeAt(i) * (i + 2);
  return s % 10;
}

/* A validade vai escrita na própria chave (AAMM = mês em que deixa de
   valer), por isso não se contorna reinstalando a aplicação. */
function gerarChave(meses) {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + Number(meses || 12), 1);
  const aamm = String(fim.getFullYear() % 100).padStart(2, '0') +
               String(fim.getMonth() + 1).padStart(2, '0');

  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // sem I, O, 0 e 1
  let livre = '';
  const aleatorio = new Uint32Array(4);
  (window.crypto || window.msCrypto).getRandomValues(aleatorio);
  for (let i = 0; i < 4; i++) livre += alfabeto[aleatorio[i] % alfabeto.length];

  const corpo = aamm + livre;
  const chave = 'VF-' + aamm + '-' + livre + '-' + digito(corpo);
  return { chave, expira: fim };
}

/* ---------- dinheiro ---------- */
function fmt(valor, moeda) {
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
  } catch (e) {
    return valor.toFixed(2) + ' ' + moeda;
  }
}

/* ---------- Firestore ---------- */
function carregarVendas() {
  if (!window.db) return Promise.resolve([]);
  return db.collection('vendas').orderBy('criada', 'desc').limit(500).get()
    .then(s => s.docs.map(d => Object.assign({ id: d.id }, d.data())))
    .catch(e => { aviso('Não foi possível ler as vendas: ' + e.message, 'erro'); return []; });
}

function gravarVenda(v) {
  if (!window.db) return Promise.reject(new Error('Firestore indisponível'));
  return db.collection('vendas').add(v);
}

/* ---------- administradores ----------
   A lista vive em `config/admins`, no Firestore, para se poder mudar sem
   tocar no código. As regras lêem esse mesmo documento, por isso é ele que
   manda de verdade. */
function carregarAdmins() {
  if (!window.db) return Promise.resolve([DONO]);
  return db.collection('config').doc('admins').get()
    .then(d => {
      const e = (d.exists && Array.isArray(d.data().emails)) ? d.data().emails : [];
      return [DONO].concat(e.filter(x => x.toLowerCase() !== DONO)).filter((v, i, a) => a.indexOf(v) === i);
    })
    .catch(() => [DONO]);
}

function gravarAdmins(lista) {
  const outros = lista.filter(x => x.toLowerCase() !== DONO);
  return db.collection('config').doc('admins')
           .set({ emails: outros, actualizado: new Date().toISOString() }, { merge: true });
}

function desenharAdmins() {
  const ul = document.getElementById('lista-admins');
  if (!ul) return;
  ul.innerHTML = '';
  admins.forEach(em => {
    const li = document.createElement('li');
    const nome = document.createElement('span');
    nome.textContent = em;
    li.appendChild(nome);

    if (em.toLowerCase() === DONO) {
      const tag = document.createElement('span');
      tag.className = 'dono';
      tag.textContent = 'dono';
      li.appendChild(tag);
    } else {
      const bt = document.createElement('button');
      bt.className = 'mini-btn danger';
      bt.type = 'button';
      bt.textContent = 'Retirar';
      bt.addEventListener('click', async () => {
        if (!confirm('Retirar o acesso de ' + em + '?')) return;
        admins = admins.filter(x => x !== em);
        try { await gravarAdmins(admins); aviso('Acesso retirado.', 'ok'); }
        catch (e) { aviso('Não foi possível gravar: ' + e.message, 'erro'); }
        desenharAdmins();
      });
      li.appendChild(bt);
    }
    ul.appendChild(li);
  });
}

/* ---------- avisos ---------- */
function aviso(txt, tipo) {
  const el = document.getElementById('aviso');
  if (!el) return;
  el.textContent = txt;
  el.className = 'aviso ' + (tipo || 'info');
  el.hidden = false;
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => { el.hidden = true; }, 6000);
}

/* ============================================================
   Facturação
   ============================================================ */
function desenharFacturacao() {
  const agora = new Date();
  const mes = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0');
  const ano = String(agora.getFullYear());

  const pagas = vendas.filter(v => !v.oferecida);
  const soma = (lista) => {
    const por = {};
    lista.forEach(v => { por[v.moeda] = (por[v.moeda] || 0) + Number(v.valor || 0); });
    return por;
  };

  const doMes = pagas.filter(v => String(v.criada || '').startsWith(mes));
  const doAno = pagas.filter(v => String(v.criada || '').startsWith(ano));

  const linha = (por) => {
    const e = Object.entries(por);
    if (!e.length) return '<span class="zero">—</span>';
    return e.map(([m, v]) => fmt(v, m)).join('<br>');
  };

  document.getElementById('f-mes').innerHTML = linha(soma(doMes));
  document.getElementById('f-ano').innerHTML = linha(soma(doAno));
  document.getElementById('f-total').innerHTML = linha(soma(pagas));

  document.getElementById('f-n-mes').textContent = doMes.length + (doMes.length === 1 ? ' chave' : ' chaves');
  document.getElementById('f-n-ano').textContent = doAno.length + (doAno.length === 1 ? ' chave' : ' chaves');
  document.getElementById('f-n-total').textContent = pagas.length + (pagas.length === 1 ? ' chave' : ' chaves');

  const ofer = vendas.filter(v => v.oferecida).length;
  document.getElementById('f-oferecidas').textContent =
    ofer === 0 ? 'Nenhuma chave oferecida ainda.'
               : ofer + (ofer === 1 ? ' chave oferecida' : ' chaves oferecidas') +
                 ' — não entram no facturado, e é assim que deve ser.';

  // Activas contra caducadas
  const activas = vendas.filter(v => v.expira && new Date(v.expira) > agora).length;
  document.getElementById('f-activas').textContent =
    activas + (activas === 1 ? ' chave activa' : ' chaves activas') +
    ' de ' + vendas.length + ' emitidas.';
}

/* ---------- lista ---------- */
function desenharLista() {
  const ul = document.getElementById('lista-vendas');
  const vazio = document.getElementById('vendas-vazio');
  const filtro = (document.getElementById('procura').value || '').toLowerCase().trim();

  const vis = vendas.filter(v => !filtro ||
    (v.chave || '').toLowerCase().includes(filtro) ||
    (v.cliente || '').toLowerCase().includes(filtro) ||
    (v.nota || '').toLowerCase().includes(filtro));

  ul.innerHTML = '';
  vazio.hidden = vis.length > 0;

  const agora = new Date();
  vis.forEach(v => {
    const activa = v.expira && new Date(v.expira) > agora;
    const li = document.createElement('li');
    li.className = 'venda' + (activa ? '' : ' morta');

    const d = v.criada ? new Date(v.criada) : null;
    li.innerHTML =
      '<div class="v-topo">' +
        '<code>' + (v.chave || '—') + '</code>' +
        '<span class="v-estado">' + (activa ? 'activa' : 'caducada') + '</span>' +
      '</div>' +
      '<div class="v-meta">' +
        (v.oferecida ? '<b class="ofer">oferecida</b>' : '<b>' + fmt(Number(v.valor || 0), v.moeda || 'EUR') + '</b>') +
        (v.cliente ? ' · ' + v.cliente : '') +
        (d ? ' · ' + d.toLocaleDateString('pt-PT') : '') +
        (v.expira ? ' · vale até ' + new Date(v.expira).toLocaleDateString('pt-PT') : '') +
      '</div>' +
      (v.nota ? '<div class="v-nota">' + v.nota + '</div>' : '');

    const copiar = document.createElement('button');
    copiar.className = 'mini-btn';
    copiar.type = 'button';
    copiar.textContent = 'Copiar chave';
    copiar.addEventListener('click', () => {
      navigator.clipboard.writeText(v.chave).then(() => aviso('Chave copiada.', 'ok'));
    });
    li.appendChild(copiar);

    ul.appendChild(li);
  });
}

/* ---------- exportar ---------- */
function exportarVendas() {
  const cab = ['chave', 'criada', 'expira', 'valor', 'moeda', 'cliente', 'meio', 'oferecida', 'nota'];
  const linhas = [cab].concat(vendas.map(v => cab.map(c => String(v[c] === undefined ? '' : v[c]).replace(/"/g, '""'))));
  const csv = linhas.map(l => l.map(c => '"' + c + '"').join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vida-financeira-vendas.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================
   Arranque
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const zonaLogin = document.getElementById('zona-login');
  const zonaPainel = document.getElementById('zona-painel');
  const zonaOff = document.getElementById('zona-off');

  if (typeof firebase === 'undefined' || !window.auth || !window.db) {
    zonaLogin.hidden = true;
    zonaOff.hidden = false;
    return;
  }

  /* ---------- preços por moeda ---------- */
  const selMoeda = document.getElementById('g-moeda');
  Object.entries(PRECOS).forEach(([m, p]) => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = p.simbolo + ' ' + m + ' — ' + p.pais;
    selMoeda.appendChild(o);
  });
  function actualizarPreco() {
    const p = PRECOS[selMoeda.value] || PRECOS.EUR;
    document.getElementById('g-valor').value = String(p.valor).replace('.', ',');
  }
  selMoeda.addEventListener('change', actualizarPreco);
  actualizarPreco();

  /* ---------- entrar ---------- */
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const em = document.getElementById('a-email').value.trim();
    const pw = document.getElementById('a-pass').value;
    const msg = document.getElementById('login-msg');
    msg.hidden = true;
    try {
      await auth.signInWithEmailAndPassword(em, pw);
    } catch (err) {
      msg.className = 'aviso erro';
      msg.textContent = err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password'
        ? 'Email ou palavra-passe errados.' : 'Não foi possível entrar.';
      msg.hidden = false;
    }
  });

  document.getElementById('sair').addEventListener('click', () => auth.signOut());

  /* ---------- gerar ---------- */
  document.getElementById('form-gerar').addEventListener('submit', async e => {
    e.preventDefault();
    const meses = Number(document.getElementById('g-meses').value) || 12;
    const oferecida = document.getElementById('g-oferecida').checked;
    const moeda = selMoeda.value;
    const valor = oferecida ? 0 : parseFloat(String(document.getElementById('g-valor').value).replace(',', '.')) || 0;

    const { chave, expira } = gerarChave(meses);
    const venda = {
      chave,
      criada: new Date().toISOString(),
      expira: expira.toISOString(),
      valor, moeda,
      cliente: document.getElementById('g-cliente').value.trim(),
      meio: document.getElementById('g-meio').value,
      oferecida,
      nota: document.getElementById('g-nota').value.trim(),
      porEmail: admin ? admin.email : ''
    };

    const caixa = document.getElementById('chave-gerada');
    const txt = document.getElementById('chave-txt');
    txt.textContent = chave;
    caixa.hidden = false;

    try {
      await gravarVenda(venda);
      vendas.unshift(venda);
      desenharFacturacao();
      desenharLista();
      aviso('Chave gerada e registada.', 'ok');
      document.getElementById('g-cliente').value = '';
      document.getElementById('g-nota').value = '';
    } catch (err) {
      aviso('A chave está gerada e é válida, mas não ficou registada: ' + err.message, 'erro');
    }
  });

  document.getElementById('copiar-gerada').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('chave-txt').textContent)
      .then(() => aviso('Chave copiada.', 'ok'));
  });

  document.getElementById('whatsapp-gerada').addEventListener('click', () => {
    const c = document.getElementById('chave-txt').textContent;
    const t = encodeURIComponent(
      'Aqui está a sua chave da Vida Financeira:\n\n' + c +
      '\n\nAbra godiandk.github.io/vida-financeira/ferramentas.html, toque em Desbloquear e escreva a chave. Vale um ano.');
    window.open('https://wa.me/?text=' + t, '_blank');
  });

  document.getElementById('form-admin').addEventListener('submit', async e => {
    e.preventDefault();
    const campo = document.getElementById('novo-admin');
    const em = campo.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { aviso('Esse email não parece válido.', 'erro'); return; }
    if (admins.map(x => x.toLowerCase()).includes(em)) { aviso('Essa conta já tem acesso.', 'info'); return; }
    admins.push(em);
    try {
      await gravarAdmins(admins);
      aviso('Acesso dado a ' + em + '. A pessoa precisa de ter conta criada com esse email.', 'ok');
      campo.value = '';
    } catch (err) {
      admins = admins.filter(x => x !== em);
      aviso('Não foi possível gravar: ' + err.message, 'erro');
    }
    desenharAdmins();
  });

  document.getElementById('procura').addEventListener('input', desenharLista);
  document.getElementById('exportar-vendas').addEventListener('click', exportarVendas);

  /* ---------- estado da sessão ---------- */
  auth.onAuthStateChanged(async u => {
    let eAdmin = false;
    if (u) {
      const doFicheiro = Array.isArray(window.ADMIN_EMAILS) ? ADMIN_EMAILS : [];
      const naNuvem = await carregarAdmins();
      eAdmin = doFicheiro.concat(naNuvem).map(x => x.toLowerCase())
                         .includes((u.email || '').toLowerCase());
    }

    if (!u) {
      admin = null;
      zonaPainel.hidden = true;
      zonaLogin.hidden = false;
      return;
    }
    if (!eAdmin) {
      const msg = document.getElementById('login-msg');
      msg.className = 'aviso erro';
      msg.textContent = 'A conta ' + u.email + ' não tem acesso a este painel.';
      msg.hidden = false;
      zonaPainel.hidden = true;
      zonaLogin.hidden = false;
      return;
    }

    admin = u;
    zonaLogin.hidden = true;
    zonaPainel.hidden = false;
    document.getElementById('quem').textContent = u.email;

    admins = await carregarAdmins();
    desenharAdmins();

    vendas = await carregarVendas();
    desenharFacturacao();
    desenharLista();
  });
});
