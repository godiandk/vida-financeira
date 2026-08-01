/* ============================================================
   Vida Financeira — lógica do painel

   Onde ficam os dados
   -------------------
   Sem conta iniciada, tudo fica no `localStorage` deste navegador —
   funciona offline e sem configurar nada. Com conta iniciada (Firebase),
   os mesmos movimentos são gravados também em
   `utilizadores/{uid}`, para aparecerem noutro telemóvel.

   O localStorage é sempre a cópia de trabalho: se o Firebase estiver em
   baixo, ou não estiver configurado, a app continua a funcionar na mesma.

   Como está organizado
   --------------------
   `calcular()` produz, uma vez por render, tudo o que os ecrãs precisam:
   totais do mês visível, medianas de vários meses, reserva acumulada e o
   modo (sem-dados / aperto / pouca-folga / normal). As funções `desenhar*`
   recebem esse resumo e não fazem contas nenhumas — deixou de haver um
   número que depende só do mês que está no ecrã.
   ============================================================ */

const CHAVE = 'vf:movimentos';
const MOEDA_CHAVE = 'vf:moeda';
const RESERVA_CHAVE = 'vf:reserva';
const ESSENCIAIS_CHAVE = 'vf:essenciais';
const ETIQUETAS_CHAVE = 'vf:etiquetas';

const CATEGORIAS = {
  saida: [
    { id: 'casa',      nome: 'Casa e rendas',   emoji: '🏠' },
    { id: 'mercado',   nome: 'Mercado',         emoji: '🛒' },
    { id: 'transporte',nome: 'Transporte',      emoji: '🚗' },
    { id: 'saude',     nome: 'Saúde',           emoji: '💊' },
    { id: 'educacao',  nome: 'Educação',        emoji: '📚' },
    { id: 'lazer',     nome: 'Lazer',           emoji: '🎬' },
    { id: 'contas',    nome: 'Contas e serviços',emoji: '🧾' },
    { id: 'dividas',   nome: 'Dívidas',         emoji: '💳' },
    { id: 'reserva',   nome: 'Guardei na reserva', emoji: '🔒' },
    { id: 'outros-s',  nome: 'Outros',          emoji: '📦' }
  ],
  entrada: [
    { id: 'salario',   nome: 'Salário',         emoji: '💼' },
    { id: 'extra',     nome: 'Trabalho extra',  emoji: '🛠️' },
    { id: 'vendas',    nome: 'Vendas',          emoji: '🏷️' },
    { id: 'juros',     nome: 'Juros e rendimentos', emoji: '📈' },
    { id: 'presente',  nome: 'Presente',        emoji: '🎁' },
    { id: 'reserva-tirei', nome: 'Tirei da reserva', emoji: '🔓' },
    { id: 'outros-e',  nome: 'Outros',          emoji: '📦' }
  ]
};

/* Categorias de entrada que são, por natureza, dinheiro que não é o
   salário normal do mês. */
const CATS_EXTRA = ['extra', 'vendas', 'presente', 'juros'];

/* Valor por omissão de "essencial" por categoria de saída. É só um ponto
   de partida: a pessoa muda com um toque e a app passa a lembrar-se. */
const PADRAO_ESS = {
  casa: true, contas: true, mercado: true, transporte: true,
  saude: true, educacao: true, dividas: true,
  lazer: false, 'outros-s': false
};

const MESES = ['janeiro','fevereiro','março','abril','maio','junho',
               'julho','agosto','setembro','outubro','novembro','dezembro'];

/* ---------- etiquetas de lançamento rápido ----------
   Uma etiqueta é um par (categoria, descrição). Nunca tem valor: o valor
   escreve-se sempre à mão, dígito a dígito, porque é aí que está o efeito
   de registar. Uma etiqueta com quantia fixa ("Café 1,20 €") destruía o
   produto e por isso não existe.

   Estas oito são só a sementeira — escolhidas para uma casa de baixo
   rendimento, não para um utilizador médio. A partir da 15.ª saída
   lançada, a barra passa a ser feita do que a própria pessoa lança.

   "Luz" e "Água" são as duas `contas`: nenhuma categoria nova é criada
   por causa de uma etiqueta. Quem quiser ver a água separada da luz vê-o
   em "Para onde foi o dinheiro", que abre por descrição. */
const SEMENTES = [
  { cat: 'mercado',    desc: '',            rotulo: 'Mercado' },
  { cat: 'contas',     desc: 'Luz',         rotulo: 'Luz',         emoji: '💡' },
  { cat: 'contas',     desc: 'Água',        rotulo: 'Água',        emoji: '🚿' },
  { cat: 'casa',       desc: 'Renda',       rotulo: 'Renda' },
  { cat: 'transporte', desc: 'Passe',       rotulo: 'Passe',       emoji: '🚌' },
  { cat: 'contas',     desc: 'Telemóvel',   rotulo: 'Telemóvel',   emoji: '📱' },
  { cat: 'saude',      desc: 'Farmácia',    rotulo: 'Farmácia' },
  { cat: 'transporte', desc: 'Combustível', rotulo: 'Combustível', emoji: '⛽' }
];

const ETQ_MINIMO_APRENDER = 15;   // saídas lançadas antes de deixar de semear
const ETQ_MINIMO_USOS = 3;        // usos antes de uma etiqueta nova entrar
const ETQ_JANELA_DIAS = 60;       // 60 e não 30: uma semana atípica não manda

/* ---------- estado ---------- */
let movimentos = [];
let tipoActual = 'saida';
let essActual = true;          // botão essencial/adiável do formulário
let filtro = 'todos';
let moeda = localStorage.getItem(MOEDA_CHAVE) || 'EUR';
const hoje = new Date();
let mesVisto = { ano: hoje.getFullYear(), mes: hoje.getMonth() };
let utilizador = null;   // preenchido pelo Firebase, se houver conta

/* Preferências. Ambas opcionais: ausentes = a app propõe em vez de
   recordar. Se o JSON estiver corrompido, trata-se como ausente. */
let reservaPrefs = { mensal: null, degrau: 1, verificado: null, dispensados: [], ts: 0 };
let essenciais = {};

/* Barra de etiquetas já calculada, com o mês em que o foi. Ausente = usar
   as sementes. Recalcula-se uma vez por mês e mais nada: uma barra que o
   polegar aprende vale mais do que uma barra óptima. */
let etiquetasCache = null;
let categoriaRevelada = false;  // o "＋ Outra" revela o menu de sempre
let catsAbertas = {};           // categorias abertas em "Para onde foi o dinheiro"

/* Qual a etiqueta acesa. Três estados, e a diferença entre dois deles é
   toda a correcção do lançamento às cegas:
     null   — ainda ninguém escolheu: acende-se a primeira da grelha
     ''     — a pessoa escolheu pelo menu: nenhuma acesa, e é de propósito
     chave  — a etiqueta acesa
   Nas saídas não pode existir "nenhuma acesa por acidente": com o menu
   escondido, escrever o valor e carregar em Lançar sem ter tocado em nada
   lançava para a primeira categoria da lista, que quase nunca é a certa. */
let etiquetaActiva = null;
let etiquetasNoEcra = [];       // a grelha tal como está desenhada
let descAutomatica = false;     // a descrição veio da etiqueta, não da pessoa

/* ---------- utilitários ---------- */
function dinheiro(v) {
  try {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency', currency: moeda, minimumFractionDigits: 2
    }).format(v || 0);
  } catch (e) {
    return (v || 0).toFixed(2) + ' ' + moeda;
  }
}

function catInfo(tipo, id) {
  const lista = CATEGORIAS[tipo] || [];
  // Este fallback é o que torna seguras as categorias novas: uma versão
  // antiga deste ficheiro, ainda em cache, mostra "Outros" em vez de
  // rebentar. Não o tire.
  return lista.find(c => c.id === id) || { nome: 'Outros', emoji: '📦' };
}

function idNovo() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function lerJSON(chave, omissao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave) || 'null');
    return (v && typeof v === 'object') ? v : omissao;
  } catch (e) {
    return omissao;
  }
}

function mediana(nums) {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const meio = Math.floor(a.length / 2);
  return a.length % 2 ? a[meio] : (a[meio - 1] + a[meio]) / 2;
}

function media(nums) {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function chaveMes(ano, mes) {
  return ano + '-' + String(mes + 1).padStart(2, '0');
}

function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

function num(v) {
  return v.toFixed(1).replace('.', ',');
}

/* ---------- essencial / adiável ---------- */
function padraoCategoria(cat) {
  if (Object.prototype.hasOwnProperty.call(essenciais, cat)) return !!essenciais[cat];
  if (Object.prototype.hasOwnProperty.call(PADRAO_ESS, cat)) return PADRAO_ESS[cat];
  return true;   // categoria desconhecida: contar como essencial é o lado seguro
}

function ehEssencial(m) {
  if (typeof m.ess === 'boolean') return m.ess;
  return padraoCategoria(m.categoria);
}

/* ---------- etiquetas ---------- */
function chaveEtiqueta(cat, desc) {
  return cat + '|' + (desc || '').trim().toLowerCase();
}

/* Rótulo e emoji são sempre derivados — nunca guardados. Assim uma
   categoria que mude de nome ou de emoji muda em todo o lado. */
function decorarEtiqueta(cat, desc) {
  const k = chaveEtiqueta(cat, desc);
  const s = SEMENTES.find(x => chaveEtiqueta(x.cat, x.desc) === k);
  const info = catInfo('saida', cat);
  return {
    chave: k,
    cat: cat,
    desc: (desc || '').trim(),
    emoji: (s && s.emoji) || info.emoji,
    rotulo: (s && s.rotulo) || ((desc || '').trim() || info.nome)
  };
}

/* Os 8 pares (categoria + descrição) mais usados nos últimos 60 dias.
   `anteriores` é a barra do mês passado: uma etiqueta já lá instalada
   sobrevive a um mês fraco, uma etiqueta nova precisa de 3 usos para
   entrar. Sem isto, a barra mudava todos os dias. */
function calcularEtiquetas(anteriores) {
  const limite = new Date(hoje.getTime() - ETQ_JANELA_DIAS * 864e5)
    .toISOString().slice(0, 10);

  const antes = {};
  (anteriores || []).forEach(e => { antes[chaveEtiqueta(e.c, e.d)] = true; });

  const conta = {};
  movimentos.forEach(m => {
    if (m.tipo !== 'saida' || m.categoria === 'reserva') return;
    if (m.data < limite) return;
    const desc = (m.descricao || '').trim();
    const k = chaveEtiqueta(m.categoria, desc);
    const e = conta[k] || (conta[k] = { c: m.categoria, d: desc, n: 0, ultimo: '' });
    e.n++;
    if (m.data >= e.ultimo) { e.ultimo = m.data; e.d = desc; }
  });

  const lista = Object.keys(conta).map(k => conta[k])
    .filter(e => e.n >= ETQ_MINIMO_USOS || antes[chaveEtiqueta(e.c, e.d)])
    .sort((a, b) => (b.n - a.n) || b.ultimo.localeCompare(a.ultimo))
    .slice(0, 8)
    .map(e => ({ c: e.c, d: e.d.slice(0, 40) }));

  /* Uma semente nunca usada cai — mas só quando há uma aprendida para lhe
     ocupar o lugar. A barra tem sempre 8; um buraco não ajuda ninguém. */
  const usadas = {};
  lista.forEach(e => { usadas[chaveEtiqueta(e.c, e.d)] = true; });
  SEMENTES.forEach(s => {
    if (lista.length >= 8) return;
    const k = chaveEtiqueta(s.cat, s.desc);
    if (usadas[k]) return;
    usadas[k] = true;
    lista.push({ c: s.cat, d: s.desc });
  });

  return lista;
}

function guardarEtiquetas() {
  try {
    localStorage.setItem(ETIQUETAS_CHAVE, JSON.stringify(etiquetasCache));
  } catch (e) { /* sem localStorage a barra é recalculada a cada abertura */ }
}

/* A barra que se mostra agora. Recalcula quando muda o mês — e na
   primeira vez que há dados que cheguem, senão a pessoa esperava pelo
   dia 1 para ver a app aprender fosse o que fosse. */
function etiquetasActuais(totalSaidas) {
  if (totalSaidas < ETQ_MINIMO_APRENDER) {
    return SEMENTES.map(s => decorarEtiqueta(s.cat, s.desc));
  }
  const mesK = chaveMes(hoje.getFullYear(), hoje.getMonth());
  if (!etiquetasCache || etiquetasCache.mes !== mesK ||
      !Array.isArray(etiquetasCache.calculadas) || !etiquetasCache.calculadas.length) {
    etiquetasCache = {
      mes: mesK,
      calculadas: calcularEtiquetas(etiquetasCache && etiquetasCache.calculadas)
    };
    guardarEtiquetas();
  }
  return etiquetasCache.calculadas.map(e => decorarEtiqueta(e.c, e.d));
}

/* ---------- gravar / carregar ---------- */
function guardar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(movimentos));
  } catch (e) {
    // Modo privado do Safari pode recusar a escrita. Não vale perder o
    // ecrã por causa disso — avisamos e seguimos só em memória.
    mostrarAviso('Não foi possível guardar neste navegador. Os movimentos ficam só até fechar a página.', 'erro');
  }
  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ movimentos, actualizado: new Date().toISOString() }, { merge: true })
      .catch(() => mostrarAviso('Gravado neste telemóvel, mas ainda não na nuvem.', 'info'));
  }
}

function guardarPrefs() {
  reservaPrefs.ts = Date.now();
  try {
    localStorage.setItem(RESERVA_CHAVE, JSON.stringify(reservaPrefs));
    localStorage.setItem(ESSENCIAIS_CHAVE, JSON.stringify(essenciais));
  } catch (e) { /* sem localStorage a app funciona na mesma, só não se lembra */ }

  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ preferencias: { reserva: reservaPrefs, essenciais } }, { merge: true })
      .catch(() => { /* silencioso: são duas preferências, não são dados */ });
  }
}

/* Mantém as chaves que não conhecemos (compatibilidade para a frente) e
   repara as que faltam (compatibilidade para trás). */
function normalizar(m) {
  if (!m || typeof m !== 'object') return null;
  const o = Object.assign({}, m);
  o.tipo = (o.tipo === 'entrada') ? 'entrada' : 'saida';
  const v = Number(o.valor);
  o.valor = isFinite(v) ? v : 0;
  if (typeof o.id !== 'string' || !o.id) o.id = idNovo();
  if (typeof o.categoria !== 'string' || !o.categoria) {
    o.categoria = o.tipo === 'saida' ? 'outros-s' : 'outros-e';
  }
  if (typeof o.descricao !== 'string') o.descricao = '';
  if (typeof o.data !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(o.data)) {
    o.data = new Date().toISOString().slice(0, 10);
  } else {
    o.data = o.data.slice(0, 10);
  }
  if (typeof o.ess !== 'boolean') delete o.ess;   // nunca inventamos `ess`
  return o;
}

function carregarLocal() {
  let brutos;
  try {
    brutos = JSON.parse(localStorage.getItem(CHAVE) || '[]');
  } catch (e) {
    brutos = [];
  }
  if (!Array.isArray(brutos)) brutos = [];
  movimentos = brutos.map(normalizar).filter(Boolean);

  const r = lerJSON(RESERVA_CHAVE, null);
  if (r) {
    reservaPrefs = {
      mensal: (typeof r.mensal === 'number' && isFinite(r.mensal) && r.mensal > 0) ? r.mensal : null,
      degrau: (r.degrau === 2 || r.degrau === 3) ? r.degrau : 1,
      verificado: typeof r.verificado === 'string' ? r.verificado : null,
      dispensados: Array.isArray(r.dispensados) ? r.dispensados.slice(-60) : [],
      ts: typeof r.ts === 'number' ? r.ts : 0
    };
  }
  const e = lerJSON(ESSENCIAIS_CHAVE, null);
  if (e) {
    essenciais = {};
    Object.keys(e).forEach(k => { if (typeof e[k] === 'boolean') essenciais[k] = e[k]; });
  }

  /* A barra guardada é um atalho, não um dado: se vier estragada,
     deita-se fora e recalcula-se. Nunca vale um ecrã em branco. */
  const et = lerJSON(ETIQUETAS_CHAVE, null);
  if (et && Array.isArray(et.calculadas) && typeof et.mes === 'string' &&
      /^\d{4}-\d{2}$/.test(et.mes)) {
    const limpas = et.calculadas
      .filter(x => x && typeof x.c === 'string' && x.c)
      .slice(0, 8)
      .map(x => ({ c: x.c, d: typeof x.d === 'string' ? x.d.trim().slice(0, 40) : '' }));
    if (limpas.length) etiquetasCache = { mes: et.mes, calculadas: limpas };
  }
}

function mostrarAviso(texto, tipo) {
  const el = document.getElementById('aviso');
  if (!el) return;
  el.textContent = texto;
  el.className = 'aviso ' + (tipo || 'info');
  el.hidden = false;
  clearTimeout(mostrarAviso._t);
  mostrarAviso._t = setTimeout(() => { el.hidden = true; }, 6000);
}

/* ============================================================
   O CÁLCULO — corre uma vez por render, fora das funções de desenho
   ============================================================ */
function calcular() {
  const r = {};

  /* --- moedas --------------------------------------------------- */
  const usadas = {};
  movimentos.forEach(m => { usadas[m.moeda || moeda] = true; });
  r.moedas = Object.keys(usadas);
  r.moedaMista = r.moedas.length > 1;

  /* --- agregar por mês ------------------------------------------ */
  const meses = {};
  let totalSaidas = 0;
  movimentos.forEach(m => {
    const k = m.data.slice(0, 7);
    const a = meses[k] || (meses[k] = {
      rendimento: 0, essenciais: 0, naoEssenciais: 0, guardado: 0,
      porCatEss: {}, porCat: {}, porCatDesc: {}
    });
    if (m.tipo === 'entrada') {
      if (m.categoria === 'reserva-tirei') a.guardado -= m.valor;
      else a.rendimento += m.valor;
    } else {
      if (m.categoria === 'reserva') {
        a.guardado += m.valor;
      } else {
        totalSaidas++;
        a.porCat[m.categoria] = (a.porCat[m.categoria] || 0) + m.valor;

        /* Somar também por descrição: é o que permite ver a água separada
           da luz sem inventar uma categoria e sem tocar em nada do que já
           está gravado. Funciona para trás, sobre movimentos antigos. */
        const desc = (m.descricao || '').trim();
        const dd = a.porCatDesc[m.categoria] || (a.porCatDesc[m.categoria] = {});
        const kd = desc.toLowerCase();
        const ed = dd[kd] || (dd[kd] = { rotulo: desc, valor: 0 });
        ed.valor += m.valor;
        if (desc) ed.rotulo = desc;

        if (ehEssencial(m)) {
          a.essenciais += m.valor;
          a.porCatEss[m.categoria] = (a.porCatEss[m.categoria] || 0) + m.valor;
        } else {
          a.naoEssenciais += m.valor;
        }
      }
    }
  });
  r.meses = meses;
  r.totalSaidas = totalSaidas;
  r.etiquetas = etiquetasActuais(totalSaidas);

  const chaveHoje = chaveMes(hoje.getFullYear(), hoje.getMonth());
  const completos = Object.keys(meses).filter(k => k < chaveHoje).sort();
  r.completos = completos;

  const ultimos = n => completos.slice(-n).map(k => meses[k]);

  /* --- medianas -------------------------------------------------- */
  r.R = mediana(ultimos(6).map(a => a.rendimento));
  r.E = mediana(ultimos(3).map(a => a.essenciais));
  r.folga = (r.R !== null && r.E !== null) ? r.R - r.E : null;

  /* --- reserva acumulada, de sempre ------------------------------ */
  r.reserva = Object.keys(meses).reduce((s, k) => s + meses[k].guardado, 0);
  r.reserva = Math.round(r.reserva * 100) / 100;
  r.mesesDeReserva = (!r.moedaMista && r.E && r.E > 0) ? r.reserva / r.E : null;

  /* --- modo ------------------------------------------------------ */
  if (completos.length < 2 || totalSaidas < 8) r.modo = 'sem-dados';
  else if (r.folga === null) r.modo = 'sem-dados';
  else if (r.folga <= 0) r.modo = 'aperto';
  else if (r.folga < 0.10 * r.R) r.modo = 'pouca-folga';
  else r.modo = 'normal';

  /* --- quantia mensal proposta ----------------------------------- */
  r.proposta = null;
  if (r.modo === 'normal') {
    r.proposta = Math.floor((0.5 * r.folga) / 5) * 5;
  } else if (r.modo === 'pouca-folga') {
    r.proposta = Math.max(5, Math.floor(0.5 * r.folga));
  }
  if (r.proposta !== null && r.proposta <= 0) r.proposta = null;
  r.mensal = reservaPrefs.mensal || r.proposta;

  /* --- degraus, derivados de E ----------------------------------- */
  r.degraus = null;
  r.degrauSeguinte = null;
  r.acimaDeTudo = false;
  if (!r.moedaMista && r.E && r.E > 0) {
    r.degraus = [
      { valor: Math.ceil((0.25 * r.E) / 10) * 10, rotulo: 'uma semana de despesas essenciais' },
      { valor: r.E,     rotulo: '1 mês de despesas essenciais' },
      { valor: 3 * r.E, rotulo: '3 meses de despesas essenciais' }
    ];
    r.degrauSeguinte = r.degraus.find(d => d.valor > r.reserva) || null;
    r.acimaDeTudo = !r.degrauSeguinte;
  }

  /* --- ritmo e projecção ----------------------------------------- */
  r.ritmo = completos.length ? media(ultimos(6).map(a => a.guardado)) : null;
  r.projeccao = null;   // { meses, data } | { longe:true }
  if ((r.modo === 'normal' || r.modo === 'pouca-folga') &&
      completos.length >= 3 && r.ritmo && r.ritmo > 0 && r.degrauSeguinte) {
    const falta = r.degrauSeguinte.valor - r.reserva;
    const n = Math.ceil(falta / r.ritmo);
    if (n > 60) r.projeccao = { longe: true };
    else {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + n, 1);
      r.projeccao = { meses: n, texto: MESES[d.getMonth()] + ' de ' + d.getFullYear() };
    }
  }

  /* --- mês visível ------------------------------------------------ */
  const kVisto = chaveMes(mesVisto.ano, mesVisto.mes);
  const a = meses[kVisto] || { rendimento: 0, essenciais: 0, naoEssenciais: 0, guardado: 0, porCat: {}, porCatEss: {}, porCatDesc: {} };
  r.mesVisivel = {
    chave: kVisto,
    entrou: a.rendimento,
    saiu: a.essenciais + a.naoEssenciais,
    essenciais: a.essenciais,
    naoEssenciais: a.naoEssenciais,
    guardado: a.guardado,
    porCat: a.porCat,
    porCatDesc: a.porCatDesc,
    vazio: !meses[kVisto]
  };
  r.mesVisivel.livre = a.rendimento - (a.essenciais + a.naoEssenciais) - a.guardado;
  r.ehMesCorrente = kVisto === chaveHoje;
  r.ehFuturo = kVisto > chaveHoje;

  r.porDia = null;
  if (r.ehMesCorrente && r.mesVisivel.livre > 0) {
    const restam = diasNoMes(hoje.getFullYear(), hoje.getMonth()) - hoje.getDate() + 1;
    if (restam > 0) r.porDia = { dias: restam, valor: r.mesVisivel.livre / restam };
  }

  r.movimentosDoMes = movimentos.filter(m => m.data.slice(0, 7) === kVisto);

  /* --- modo aperto: maiores essenciais e dívidas a crescer -------- */
  r.maioresEssenciais = [];
  r.dividasASubir = null;
  if (completos.length) {
    const janela = completos.slice(-3);
    const cats = {};
    janela.forEach(k => {
      Object.keys(meses[k].porCatEss).forEach(c => { cats[c] = true; });
    });
    r.maioresEssenciais = Object.keys(cats).map(c => ({
      id: c,
      valor: mediana(janela.map(k => meses[k].porCatEss[c] || 0)) || 0
    })).filter(x => x.valor > 0).sort((x, y) => y.valor - x.valor).slice(0, 3);

    if (janela.length === 3) {
      const d = janela.map(k => meses[k].porCat['dividas'] || 0);
      if (d[0] > 0 && d[1] > d[0] && d[2] > d[1]) r.dividasASubir = d;
    }
  }

  /* --- dia habitual do salário ------------------------------------ */
  r.lembreteSalario = null;
  const salarios = movimentos.filter(m => m.tipo === 'entrada' && m.categoria === 'salario')
                             .sort((x, y) => x.data.localeCompare(y.data));
  if (r.ehMesCorrente && salarios.length >= 2) {
    const jaEsteMes = salarios.some(m => m.data.slice(0, 7) === chaveHoje);
    if (!jaEsteMes) {
      const dias = salarios.slice(-3).map(m => parseInt(m.data.slice(8, 10), 10));
      const dia = Math.round(mediana(dias));
      if (dia && hoje.getDate() > dia) r.lembreteSalario = dia;
    }
  }

  /* --- acerto trimestral ------------------------------------------ */
  r.pedirAcerto = false;
  if (r.reserva > 0 && !r.moedaMista) {
    const v = reservaPrefs.verificado ? new Date(reservaPrefs.verificado + 'T00:00:00') : null;
    const dias90 = 90 * 24 * 3600 * 1000;
    if (!v || isNaN(v.getTime()) || (hoje - v) > dias90) r.pedirAcerto = true;
  }

  return r;
}

/* ============================================================
   DESENHAR — só apresentação, sem contas
   ============================================================ */
function desenharMes() {
  document.getElementById('mes-nome').textContent =
    MESES[mesVisto.mes] + ' ' + mesVisto.ano;
}

function desenharTopo(r) {
  const v = r.mesVisivel;
  const elLivre = document.getElementById('v-livre');
  const elSub = document.getElementById('v-livre-sub');

  if (v.vazio) {
    elLivre.textContent = '—';
    elLivre.classList.remove('neg');
    elSub.textContent = 'Ainda não lançou nada neste mês.';
  } else if (v.livre < 0) {
    elLivre.textContent = dinheiro(v.livre);
    elLivre.classList.add('neg');
    elSub.textContent = 'Saiu mais ' + dinheiro(Math.abs(v.livre)) + ' do que entrou este mês.';
  } else {
    elLivre.textContent = dinheiro(v.livre);
    elLivre.classList.remove('neg');
    elSub.textContent = r.porDia
      ? ('faltam ' + r.porDia.dias + (r.porDia.dias === 1 ? ' dia' : ' dias') +
         ' · ' + dinheiro(r.porDia.valor) + ' por dia')
      : '';
  }

  document.getElementById('v-guardado').textContent = dinheiro(v.guardado);

  const elMeses = document.getElementById('v-reserva-meses');
  const elEuros = document.getElementById('v-reserva-eur');
  if (r.moedaMista) {
    elMeses.textContent = dinheiro(r.reserva);
    elMeses.classList.add('pequeno');
    elEuros.textContent = 'Há movimentos em mais do que uma moeda. Não dá para somar em meses.';
  } else if (r.mesesDeReserva !== null) {
    elMeses.textContent = num(r.mesesDeReserva) + (Math.abs(r.mesesDeReserva - 1) < 0.05 ? ' mês' : ' meses');
    elMeses.classList.remove('pequeno');
    elEuros.textContent = dinheiro(r.reserva);
  } else {
    elMeses.textContent = dinheiro(r.reserva);
    elMeses.classList.remove('pequeno');
    elEuros.textContent = 'ainda não dá para converter em meses';
  }

  document.getElementById('resumo-linha').textContent =
    'Entrou ' + dinheiro(v.entrou) + '  ·  Saiu ' + dinheiro(v.saiu) +
    '  ·  Guardou ' + dinheiro(v.guardado);
}

function desenharLembrete(r) {
  const el = document.getElementById('lembrete-salario');
  if (!r.lembreteSalario) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = '';
  const sp = document.createElement('span');
  sp.textContent = 'Costuma receber por volta do dia ' + r.lembreteSalario +
                   '. Ainda não lançou o salário deste mês.';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link-btn';
  b.textContent = 'Lançar';
  b.addEventListener('click', () => {
    trocarTipo('entrada');
    document.getElementById('f-categoria').value = 'salario';
    irParaFormulario();
  });
  el.append(sp, b);
}

/* ---------- etiquetas de lançamento rápido ---------- */

/* A barra só existe nas saídas. Nas entradas, o menu de sempre volta a
   estar à vista — são poucas e não têm padrão diário nenhum. */
function actualizarZonaEtiquetas() {
  const zona = document.getElementById('etiquetas');
  const campo = document.getElementById('campo-categoria');
  const saida = tipoActual === 'saida';
  if (zona) zona.hidden = !saida;
  if (campo) campo.hidden = saida && !categoriaRevelada;
}

function pintarEtiquetas() {
  document.querySelectorAll('#etiquetas .etq').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.chave === etiquetaActiva));
  });
}

function revelarCategoria(focar) {
  categoriaRevelada = true;
  actualizarZonaEtiquetas();
  const sel = document.getElementById('f-categoria');
  const b = document.querySelector('.etq-outra');
  if (b) b.setAttribute('aria-expanded', 'true');
  if (focar && sel) sel.focus();
}

/* A descrição escrita pela etiqueta é da app e pode ser substituída; a
   escrita pela pessoa é dela e não se toca. */
function limparDescricaoAutomatica() {
  if (!descAutomatica) return;
  const d = document.getElementById('f-descricao');
  if (d) d.value = '';
  descAutomatica = false;
}

/* O toque faz a classificação toda — e pára aí. Não escreve o valor, não
   submete nada: deixa o cursor no campo do valor, que é o número que a
   pessoa tem de confrontar.

   `focar` é falso quando é a app a acender a etiqueta por omissão: aí o
   estado tem de ficar certo sem abrir o teclado a ninguém. */
function usarEtiqueta(e, focar) {
  const sel = document.getElementById('f-categoria');
  if (sel && CATEGORIAS.saida.some(c => c.id === e.cat)) sel.value = e.cat;
  sincronizarEss();

  const d = document.getElementById('f-descricao');
  if (d && (descAutomatica || !d.value.trim())) {
    d.value = e.desc;
    descAutomatica = !!e.desc;
  }

  etiquetaActiva = e.chave;
  pintarEtiquetas();

  if (focar === false) return;
  const v = document.getElementById('f-valor');
  if (v) { v.focus(); v.select(); }
}

/* Nas saídas, a primeira da grelha fica acesa: ao abrir e depois de cada
   lançamento. Deixa de haver estado invisível, e o palpite por omissão
   passa a ser a categoria mais usada pela própria pessoa (quando a barra
   já é aprendida, a primeira posição é a mais usada de todas) em vez da
   primeira da lista. A posição é estável, por isso o polegar aprende-a. */
function aplicarEtiquetaPorOmissao() {
  if (tipoActual !== 'saida' || etiquetaActiva !== null || !etiquetasNoEcra.length) {
    pintarEtiquetas();
    return;
  }
  usarEtiqueta(etiquetasNoEcra[0], false);
}

function desenharEtiquetas(r) {
  const zona = document.getElementById('etiquetas');
  if (!zona) return;
  zona.innerHTML = '';
  etiquetasNoEcra = r.etiquetas;

  r.etiquetas.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'etq';
    b.dataset.chave = e.chave;
    b.setAttribute('aria-pressed', String(e.chave === etiquetaActiva));
    b.setAttribute('aria-label', e.rotulo + ' — ' + catInfo('saida', e.cat).nome);

    const em = document.createElement('span');
    em.className = 'etq-em';
    em.setAttribute('aria-hidden', 'true');
    em.textContent = e.emoji;

    const t = document.createElement('span');
    t.className = 'etq-txt';
    t.textContent = e.rotulo;

    b.append(em, t);
    b.addEventListener('click', () => usarEtiqueta(e, true));
    zona.appendChild(b);
  });

  const outra = document.createElement('button');
  outra.type = 'button';
  outra.className = 'etq etq-outra';
  outra.setAttribute('aria-expanded', String(categoriaRevelada));
  outra.setAttribute('aria-controls', 'campo-categoria');
  const oe = document.createElement('span');
  oe.className = 'etq-em';
  oe.setAttribute('aria-hidden', 'true');
  oe.textContent = '＋';
  const ot = document.createElement('span');
  ot.className = 'etq-txt';
  ot.textContent = 'Outra';
  outra.append(oe, ot);
  outra.addEventListener('click', () => {
    /* Ir pelo menu é uma escolha, não um esquecimento: aqui o estado
       "nenhuma acesa" é legítimo e a omissão não volta a acender nada. */
    etiquetaActiva = '';
    pintarEtiquetas();
    revelarCategoria(true);
  });
  zona.appendChild(outra);

  actualizarZonaEtiquetas();
  aplicarEtiquetaPorOmissao();
}

function desenharLista(r) {
  const ul = document.getElementById('lista');
  const vazio = document.getElementById('vazio');

  let visiveis = r.movimentosDoMes;
  if (filtro !== 'todos') visiveis = visiveis.filter(m => m.tipo === filtro);
  visiveis = visiveis.slice().sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));

  ul.innerHTML = '';
  vazio.hidden = visiveis.length > 0;

  visiveis.forEach(m => {
    const info = catInfo(m.tipo, m.categoria);
    const li = document.createElement('li');

    const ic = document.createElement('div');
    ic.className = 'mv-ic';
    ic.textContent = info.emoji;

    const txt = document.createElement('div');
    txt.className = 'mv-txt';
    const b = document.createElement('b');
    b.textContent = m.descricao || info.nome;
    const sp = document.createElement('span');
    const d = new Date(m.data + 'T00:00:00');
    let legenda = info.nome + ' · ' + d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    if (m.tipo === 'saida' && m.categoria !== 'reserva' && !ehEssencial(m)) legenda += ' · dá para adiar';
    sp.textContent = legenda;
    txt.append(b, sp);

    const val = document.createElement('div');
    val.className = 'mv-val ' + m.tipo;
    val.textContent = (m.tipo === 'saida' ? '−' : '+') + ' ' + dinheiro(m.valor);

    const del = document.createElement('button');
    del.className = 'mv-del';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Apagar ' + (m.descricao || info.nome));
    del.addEventListener('click', () => apagar(m.id));

    li.append(ic, txt, val, del);
    ul.appendChild(li);
  });
}

function desenharCategorias(r) {
  const v = r.mesVisivel;
  const ul = document.getElementById('cats');
  const nada = document.getElementById('cats-vazio');
  const rep = document.getElementById('reparticao');
  const total = v.saiu;

  ul.innerHTML = '';
  rep.innerHTML = '';
  nada.hidden = total > 0;
  rep.hidden = total <= 0;
  if (total <= 0) return;

  /* Duas barras acima da lista: quanto do que entra está preso no essencial. */
  const base = v.entrou > 0 ? v.entrou : total;
  const sufixo = v.entrou > 0 ? '% do que entrou' : '% das saídas';
  [
    { nome: 'Essencial', valor: v.essenciais, cls: 'ess' },
    { nome: 'Dá para adiar', valor: v.naoEssenciais, cls: 'adi' }
  ].forEach(p => {
    const pct = Math.round(p.valor / base * 100);
    const li = document.createElement('div');
    li.className = 'rep-item';
    const linha = document.createElement('div');
    linha.className = 'cat-linha';
    const b = document.createElement('b');
    b.textContent = p.nome;
    const sp = document.createElement('span');
    sp.textContent = dinheiro(p.valor) + ' · ' + pct + sufixo;
    linha.append(b, sp);
    const barra = document.createElement('div');
    barra.className = 'barra ' + p.cls;
    const i = document.createElement('i');
    i.style.width = Math.min(100, pct) + '%';
    barra.appendChild(i);
    li.append(linha, barra);
    rep.appendChild(li);
  });

  Object.entries(v.porCat)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, soma]) => {
      const info = catInfo('saida', id);
      const pct = total ? Math.round(soma / total * 100) : 0;

      /* Três ou mais descrições distintas: vale a pena poder abrir. Duas
         não valem — é a lista outra vez, com mais um toque pelo meio. */
      const det = (v.porCatDesc && v.porCatDesc[id]) || {};
      const nomeadas = Object.keys(det).filter(k => k !== '');
      const abrivel = nomeadas.length >= 3;
      const aberta = abrivel && !!catsAbertas[id];

      const li = document.createElement('li');
      const linha = document.createElement(abrivel ? 'button' : 'div');
      linha.className = 'cat-linha' + (abrivel ? ' cat-abre' : '');
      const b = document.createElement('b');
      b.textContent = info.emoji + ' ' + info.nome;
      const sp = document.createElement('span');
      sp.textContent = dinheiro(soma) + ' · ' + pct + '%';
      linha.append(b, sp);

      if (abrivel) {
        linha.type = 'button';
        linha.setAttribute('aria-expanded', String(aberta));
        const car = document.createElement('span');
        car.className = 'cat-caret';
        car.setAttribute('aria-hidden', 'true');
        car.textContent = '▸';
        sp.append(' ', car);
      }

      const barra = document.createElement('div');
      barra.className = 'barra';
      const i = document.createElement('i');
      i.style.width = pct + '%';
      barra.appendChild(i);

      li.append(linha, barra);

      if (abrivel) {
        const sub = document.createElement('ul');
        sub.className = 'cat-det';
        sub.hidden = !aberta;
        Object.keys(det)
          .sort((x, y) => det[y].valor - det[x].valor)
          .forEach(k => {
            const it = document.createElement('li');
            const nb = document.createElement('b');
            nb.textContent = k === '' ? 'Sem descrição' : det[k].rotulo;
            const nv = document.createElement('span');
            nv.textContent = dinheiro(det[k].valor);
            it.append(nb, nv);
            sub.appendChild(it);
          });
        li.appendChild(sub);
        linha.addEventListener('click', () => {
          catsAbertas[id] = !catsAbertas[id];
          sub.hidden = !catsAbertas[id];
          linha.setAttribute('aria-expanded', String(!!catsAbertas[id]));
        });
      }

      ul.appendChild(li);
    });
}

/* ---------- bloco "A minha reserva" ---------- */
function p(texto, cls) {
  const el = document.createElement('p');
  el.textContent = texto;
  if (cls) el.className = cls;
  return el;
}

function botao(texto, cls, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = texto;
  b.addEventListener('click', aoClicar);
  return b;
}

function desenharReserva(r) {
  const c = document.getElementById('reserva-corpo');
  c.innerHTML = '';

  /* Cabeça: o número, sempre. */
  const cab = document.createElement('div');
  cab.className = 'res-topo';
  const grande = document.createElement('b');
  grande.textContent = dinheiro(r.reserva);
  cab.appendChild(grande);

  if (r.moedaMista) {
    c.appendChild(cab);
    c.appendChild(p('Há movimentos em mais do que uma moeda. Não dá para somar em meses.', 'res-nota'));
  } else if (r.modo === 'sem-dados') {
    c.appendChild(cab);
    c.appendChild(p('Ainda não há registos suficientes para dizer quanto sobra. Lance as despesas de um mês inteiro e este quadro passa a fazer sentido.', 'res-nota'));
  } else if (r.modo === 'aperto') {
    desenharAperto(r, c);
  } else {
    /* normal / pouca-folga */
    if (r.degrauSeguinte) {
      const sp = document.createElement('span');
      sp.textContent = num(r.mesesDeReserva) + ' de ' + r.degrauSeguinte.rotulo;
      cab.appendChild(sp);
    }
    c.appendChild(cab);

    if (r.degrauSeguinte) {
      const barra = document.createElement('div');
      barra.className = 'barra res-barra';
      const i = document.createElement('i');
      i.style.width = Math.min(100, Math.round(r.reserva / r.degrauSeguinte.valor * 100)) + '%';
      barra.appendChild(i);
      c.appendChild(barra);

      c.appendChild(p('Próximo degrau: ' + r.degrauSeguinte.rotulo +
        ' (' + dinheiro(r.degrauSeguinte.valor) + ')', 'res-degrau'));
    } else if (r.acimaDeTudo) {
      c.appendChild(p('Acima de três meses de despesas, a pergunta deixa de ser quanto guardar e passa a ser onde. Isso não se decide numa aplicação de contas.', 'res-nota'));
    }

    if (r.mensal) {
      c.appendChild(p('Com o que entra e o que é essencial, dá para guardar cerca de ' +
        dinheiro(r.mensal) + ' por mês.', 'res-mensal'));
      if (r.modo === 'pouca-folga') {
        c.appendChild(p('É pouco de propósito. Vinte euros todos os meses valem mais do que cem uma vez.', 'res-nota'));
      }
    }

    if (r.projeccao && r.degrauSeguinte) {
      if (r.projeccao.longe) {
        c.appendChild(p('Ao ritmo dos últimos meses, a este ritmo, mais de cinco anos.', 'res-nota'));
      } else {
        c.appendChild(p('Ao ritmo dos últimos 6 meses (' + dinheiro(r.ritmo) +
          ' por mês), chega lá por volta de ' + r.projeccao.texto +
          '. É uma conta feita com o que já lançou, não é uma promessa — muda assim que o ritmo mudar.', 'res-nota'));
      }
    }

    if (r.mesVisivel.guardado === 0 && r.reserva > 0 && !r.mesVisivel.vazio) {
      c.appendChild(p('Neste mês não guardou nada. A reserva continua nos ' + dinheiro(r.reserva) + '.', 'res-nota'));
    }
  }

  /* Botões e nota permanente: em todos os modos, incluindo o aperto. */
  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Guardar agora', 'btn btn-gold btn-peq', () => prepararGuardar(r.mensal)));
  if (r.reserva > 0) {
    acoes.appendChild(botao('Tirei da reserva', 'btn btn-line btn-peq', () => prepararTirar()));
  }
  c.appendChild(acoes);

  if (r.pedirAcerto) {
    const acerto = document.createElement('div');
    acerto.className = 'res-acerto';
    acerto.appendChild(p('A reserva aqui diz ' + dinheiro(r.reserva) + '. Bate certo com o sítio onde guarda?'));
    const bs = document.createElement('div');
    bs.className = 'res-acoes';
    bs.appendChild(botao('Bate certo', 'mini-btn', () => {
      reservaPrefs.verificado = new Date().toISOString().slice(0, 10);
      guardarPrefs();
      desenhar();
      mostrarAviso('Conferido.', 'ok');
    }));
    bs.appendChild(botao('Corrigir', 'mini-btn', () => corrigirReserva(r.reserva)));
    acerto.appendChild(bs);
    c.appendChild(acerto);
  }

  c.appendChild(p('A aplicação não mexe em dinheiro nenhum. Isto é o registo do que passou para onde guarda.', 'res-rodape'));
}

function desenharAperto(r, c) {
  c.appendChild(p('Este mês, o essencial já leva tudo o que entra.', 'res-titulo'));
  c.appendChild(p('Não é falta de disciplina. Com estas despesas e este rendimento, não há método de orçamento que faça sobrar dinheiro. Enquanto for assim, a aplicação não lhe pede para guardar.', 'res-nota'));

  const t = document.createElement('dl');
  t.className = 'res-tabela';
  [
    ['Entra por mês (mediana)', dinheiro(r.R)],
    ['Essencial por mês (mediana)', dinheiro(r.E)],
    ['Falta', dinheiro(r.folga)]
  ].forEach(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    t.append(dt, dd);
  });
  c.appendChild(t);

  if (r.maioresEssenciais.length) {
    c.appendChild(p('As suas três despesas essenciais maiores', 'res-subtitulo'));
    const ul = document.createElement('ul');
    ul.className = 'res-maiores';
    r.maioresEssenciais.forEach(x => {
      const info = catInfo('saida', x.id);
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = info.emoji + ' ' + info.nome;
      const sp = document.createElement('span');
      const pct = r.R > 0 ? Math.round(x.valor / r.R * 100) : null;
      sp.textContent = dinheiro(x.valor) + (pct !== null ? ' · ' + pct + '% do que entra' : '');
      li.append(b, sp);
      ul.appendChild(li);
    });
    c.appendChild(ul);
  }

  c.appendChild(p('Quando o rendimento chega ao limite, a única alavanca com tamanho é o rendimento ou uma despesa fixa. Não são os cafés.', 'res-nota'));

  if (r.dividasASubir) {
    c.appendChild(p('As saídas em Dívidas subiram nos últimos três meses: ' +
      r.dividasASubir.map(v => dinheiro(v)).join(' → ') + '.', 'res-nota'));
  }
}

/* ---------- render ---------- */
function desenhar() {
  const r = calcular();
  desenharMes();
  desenharTopo(r);
  desenharLembrete(r);
  desenharEtiquetas(r);
  desenharLista(r);
  desenharCategorias(r);
  desenharReserva(r);
}

/* ============================================================
   ACÇÕES
   ============================================================ */
function preencherCategorias() {
  const sel = document.getElementById('f-categoria');
  const anterior = sel.value;
  sel.innerHTML = '';
  CATEGORIAS[tipoActual].forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.emoji + '  ' + c.nome;
    sel.appendChild(o);
  });
  if (anterior && CATEGORIAS[tipoActual].some(c => c.id === anterior)) sel.value = anterior;
  sincronizarEss();
}

/* A tira essencial/adiável só faz sentido em saídas, e não faz sentido
   nenhum na categoria da reserva (que não é despesa). */
function sincronizarEss() {
  const campo = document.getElementById('campo-ess');
  const cat = document.getElementById('f-categoria').value;
  const mostrar = tipoActual === 'saida' && cat !== 'reserva';
  campo.hidden = !mostrar;
  if (!mostrar) return;
  essActual = padraoCategoria(cat);
  pintarEss();
}

function pintarEss() {
  document.querySelectorAll('#campo-ess button').forEach(b => {
    b.setAttribute('aria-pressed', String((b.dataset.ess === '1') === essActual));
  });
}

function trocarTipo(tipo) {
  tipoActual = tipo;
  document.querySelectorAll('.tipo-sel button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.tipo === tipo));
  });
  preencherCategorias();
  if (tipo === 'entrada') {
    /* Nas entradas não há etiquetas nenhumas e o menu está sempre à
       vista — não há aqui nada de invisível para corrigir. */
    etiquetaActiva = '';
    limparDescricaoAutomatica();
    pintarEtiquetas();
  } else {
    etiquetaActiva = null;
    aplicarEtiquetaPorOmissao();
  }
  actualizarZonaEtiquetas();
}

function irParaFormulario() {
  const el = document.getElementById('f-valor');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.focus(), 250);
}

function prepararGuardar(valor) {
  trocarTipo('saida');
  document.getElementById('f-categoria').value = 'reserva';
  /* Aqui a categoria é escolhida pela app, não pela pessoa. Mostrá-la é o
     mínimo — senão ela lança para a reserva sem ver onde está a lançar. */
  etiquetaActiva = '';
  limparDescricaoAutomatica();
  pintarEtiquetas();
  revelarCategoria(false);
  sincronizarEss();
  document.getElementById('f-valor').value = valor ? String(Math.round(valor * 100) / 100).replace('.', ',') : '';
  document.getElementById('f-data').value = new Date().toISOString().slice(0, 10);
  irParaFormulario();
}

function prepararTirar() {
  trocarTipo('entrada');
  document.getElementById('f-categoria').value = 'reserva-tirei';
  etiquetaActiva = '';
  limparDescricaoAutomatica();
  pintarEtiquetas();
  sincronizarEss();
  document.getElementById('f-valor').value = '';
  document.getElementById('f-data').value = new Date().toISOString().slice(0, 10);
  irParaFormulario();
}

function reservaActual() {
  return movimentos.reduce((s, m) => {
    if (m.tipo === 'saida' && m.categoria === 'reserva') return s + m.valor;
    if (m.tipo === 'entrada' && m.categoria === 'reserva-tirei') return s - m.valor;
    return s;
  }, 0);
}

function lancar(dados) {
  const m = {
    id: idNovo(),
    tipo: dados.tipo,
    valor: Math.round(dados.valor * 100) / 100,
    categoria: dados.categoria,
    descricao: (dados.descricao || '').slice(0, 120),
    data: dados.data,
    moeda: moeda
  };
  if (typeof dados.ess === 'boolean') m.ess = dados.ess;
  movimentos.push(m);
  guardar();
  return m;
}

function adicionar(ev) {
  ev.preventDefault();
  esconderProposta();

  const valorBruto = document.getElementById('f-valor').value.replace(',', '.');
  const valor = parseFloat(valorBruto);

  if (!isFinite(valor) || valor <= 0) {
    mostrarAviso('Escreva um valor maior do que zero.', 'erro');
    return;
  }

  const categoria = document.getElementById('f-categoria').value;
  const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
  const antes = reservaActual();

  const dados = {
    tipo: tipoActual,
    valor: valor,
    categoria: categoria,
    descricao: document.getElementById('f-descricao').value.trim(),
    data: data
  };

  /* `ess` só se grava quando a pessoa contraria o valor por omissão
     daquela categoria — e esse desacordo passa a ser o novo padrão. */
  if (tipoActual === 'saida' && categoria !== 'reserva') {
    if (essActual !== padraoCategoria(categoria)) {
      dados.ess = essActual;
      essenciais[categoria] = essActual;
      guardarPrefs();
    }
  }

  const m = lancar(dados);

  // Saltar para o mês do movimento que acabou de ser lançado, senão ele
  // é gravado mas não aparece — e parece que se perdeu.
  const d = new Date(data + 'T00:00:00');
  mesVisto = { ano: d.getFullYear(), mes: d.getMonth() };

  document.getElementById('f-valor').value = '';
  document.getElementById('f-descricao').value = '';
  descAutomatica = false;
  /* O estado de partida é sempre o mesmo: a primeira da grelha acesa —
     não a que acabou de ser usada. */
  etiquetaActiva = null;

  const depois = reservaActual();
  desenhar();

  /* Tirou tudo da reserva. Uma frase e mais nada. */
  if (m.categoria === 'reserva-tirei' && antes > 0 && depois <= 0) {
    reservaPrefs.degrau = 1;
    guardarPrefs();
    mostrarAviso('Foi para isso que ela existe. Recomeça no primeiro degrau. Já lá chegou uma vez.', 'info');
    return;
  }
  if (m.categoria === 'reserva') {
    mostrarAviso('Guardado. Agora passe os ' + dinheiro(m.valor) +
                 ' para onde os guarda — outra conta, um envelope, o que for.', 'ok');
    return;
  }

  /* A confirmação nomeia o que foi lançado. Com a barra de etiquetas, um
     toque errado escolheria uma categoria em silêncio — o menu obrigava a
     olhar, isto devolve o olhar ao sítio onde a pessoa já está. */
  if (!proporMomento(m)) {
    mostrarAviso('Lançado: ' + (m.descricao || catInfo(m.tipo, m.categoria).nome) +
                 ' · ' + dinheiro(m.valor), 'ok');
  }
}

function apagar(id) {
  const m = movimentos.find(x => x.id === id);
  if (!m) return;
  if (!confirm('Apagar "' + (m.descricao || catInfo(m.tipo, m.categoria).nome) + '"?')) return;
  movimentos = movimentos.filter(x => x.id !== id);
  guardar();
  desenhar();
}

function mudarMes(passo) {
  let mes = mesVisto.mes + passo;
  let ano = mesVisto.ano;
  if (mes < 0) { mes = 11; ano--; }
  if (mes > 11) { mes = 0; ano++; }
  mesVisto = { ano, mes };
  desenhar();
}

function corrigirReserva(actual) {
  const resp = prompt('Quanto tem, de facto, guardado?', String(Math.round(actual * 100) / 100).replace('.', ','));
  if (resp === null) return;
  const real = parseFloat(String(resp).replace(',', '.'));
  if (!isFinite(real) || real < 0) { mostrarAviso('Escreva um valor válido.', 'erro'); return; }
  const dif = Math.round((real - actual) * 100) / 100;
  reservaPrefs.verificado = new Date().toISOString().slice(0, 10);
  guardarPrefs();
  if (dif === 0) { desenhar(); mostrarAviso('Conferido.', 'ok'); return; }
  lancar({
    tipo: dif > 0 ? 'saida' : 'entrada',
    valor: Math.abs(dif),
    categoria: dif > 0 ? 'reserva' : 'reserva-tirei',
    descricao: 'Acerto da reserva',
    data: new Date().toISOString().slice(0, 10)
  });
  desenhar();
  mostrarAviso('Acerto lançado. Fica na lista, como qualquer movimento.', 'ok');
}

/* ============================================================
   OS MOMENTOS — mês bom (F5) e dia do salário (F6)
   ============================================================ */
function esconderProposta() {
  const el = document.getElementById('proposta');
  if (el) { el.hidden = true; el.innerHTML = ''; }
}

function dispensar(idMov) {
  reservaPrefs.dispensados.push(idMov);
  if (reservaPrefs.dispensados.length > 60) {
    reservaPrefs.dispensados = reservaPrefs.dispensados.slice(-60);
  }
  guardarPrefs();
  esconderProposta();
}

function guardarProposto(valor, idMov, comoMensal) {
  lancar({
    tipo: 'saida',
    valor: valor,
    categoria: 'reserva',
    descricao: '',
    data: new Date().toISOString().slice(0, 10)
  });
  if (comoMensal) { reservaPrefs.mensal = Math.round(valor * 100) / 100; }
  dispensar(idMov);
  desenhar();
  mostrarAviso('Guardado. Agora passe os ' + dinheiro(valor) +
               ' para onde os guarda — outra conta, um envelope, o que for.', 'ok');
}

function mostrarProposta(titulo, valor, idMov, comoMensal, rotuloRecusa) {
  const el = document.getElementById('proposta');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = '';

  titulo.forEach(t => el.appendChild(p(t)));

  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Guardar ' + dinheiro(valor), 'btn btn-gold btn-peq',
    () => guardarProposto(valor, idMov, comoMensal)));
  acoes.appendChild(botao('Outro valor', 'mini-btn', () => {
    const resp = prompt('Quanto quer guardar?', String(valor).replace('.', ','));
    if (resp === null) return;
    const v = parseFloat(String(resp).replace(',', '.'));
    if (!isFinite(v) || v <= 0) { mostrarAviso('Escreva um valor maior do que zero.', 'erro'); return; }
    guardarProposto(Math.round(v * 100) / 100, idMov, comoMensal);
  }));
  acoes.appendChild(botao(rotuloRecusa, 'mini-btn', () => dispensar(idMov)));
  el.appendChild(acoes);
}

/* Devolve true se mostrou alguma proposta. */
function proporMomento(m) {
  if (m.tipo !== 'entrada') return false;
  if (m.categoria === 'reserva-tirei') return false;
  if (reservaPrefs.dispensados.indexOf(m.id) !== -1) return false;

  const r = calcular();
  const kMov = m.data.slice(0, 7);
  const doMes = r.meses[kMov];
  const entradasDoMes = doMes ? doMes.rendimento : m.valor;

  /* F5 — o mês bom. Tem prioridade: é o dinheiro maior. */
  const porCategoria = CATS_EXTRA.indexOf(m.categoria) !== -1;
  const porVolume = (r.R !== null && r.R > 0 && entradasDoMes > 1.15 * r.R);
  if (porCategoria || porVolume) {
    let excesso = (r.R !== null && r.R > 0) ? entradasDoMes - r.R : m.valor;
    if (excesso > 0) {
      const prop = Math.floor((0.3 * excesso) / 10) * 10;
      if (prop >= 10) {
        mostrarProposta([
          'Entrou ' + dinheiro(excesso) + ' mais do que num mês normal.',
          'Guardar ' + dinheiro(prop) + ' agora?'
        ], prop, m.id, false, 'Agora não');
        return true;
      }
    }
  }

  /* F6 — o dia do salário. */
  if (m.categoria === 'salario' && r.mensal && r.modo !== 'aperto') {
    mostrarProposta([
      'Guardar ' + dinheiro(r.mensal) + ' agora, antes de o mês começar?'
    ], r.mensal, m.id, true, 'Este mês não');
    return true;
  }

  return false;
}

/* ============================================================
   DADOS
   ============================================================ */
function exportarCSV() {
  const linhas = [['data', 'tipo', 'categoria', 'descricao', 'valor', 'essencial', 'moeda']];
  movimentos.slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .forEach(m => {
      const ess = (m.tipo === 'saida' && m.categoria !== 'reserva')
        ? (ehEssencial(m) ? 'essencial' : 'da para adiar') : '';
      linhas.push([
        m.data,
        m.tipo,
        catInfo(m.tipo, m.categoria).nome,
        (m.descricao || '').replace(/"/g, '""'),
        String(m.valor).replace('.', ','),
        ess,
        m.moeda || moeda
      ]);
    });

  const csv = linhas.map(l => l.map(c => '"' + c + '"').join(';')).join('\r\n');
  // O BOM faz o Excel abrir os acentos correctamente.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vida-financeira.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function apagarTudo() {
  if (!confirm('Isto apaga TODOS os movimentos, de todos os meses. Tem a certeza?')) return;
  if (!confirm('Última confirmação: apagar tudo?')) return;
  movimentos = [];
  guardar();
  desenhar();
  mostrarAviso('Todos os movimentos foram apagados.', 'info');
}

/* ---------- nuvem (opcional) ---------- */
function ligarNuvem() {
  if (typeof firebase === 'undefined' || !window.auth) return;

  auth.onAuthStateChanged(u => {
    utilizador = u;
    const nota = document.getElementById('nota-nuvem');
    if (!u) {
      if (nota) nota.textContent = 'Os movimentos estão guardados só neste dispositivo. Inicie sessão para os ter em qualquer telemóvel.';
      return;
    }
    if (nota) nota.textContent = 'Sessão iniciada como ' + (u.email || 'utilizador') + ' — os movimentos são sincronizados.';

    db.collection('utilizadores').doc(u.uid).get()
      .then(doc => {
        const dados = doc.exists ? (doc.data() || {}) : {};

        // Preferências: duas coisas pequenas, ganha a última escrita.
        const pref = dados.preferencias;
        if (pref && typeof pref === 'object') {
          if (pref.reserva && typeof pref.reserva === 'object' &&
              (pref.reserva.ts || 0) > (reservaPrefs.ts || 0)) {
            reservaPrefs = Object.assign({}, reservaPrefs, pref.reserva);
            if (!Array.isArray(reservaPrefs.dispensados)) reservaPrefs.dispensados = [];
          }
          if (pref.essenciais && typeof pref.essenciais === 'object') {
            Object.keys(pref.essenciais).forEach(k => {
              if (typeof essenciais[k] !== 'boolean' && typeof pref.essenciais[k] === 'boolean') {
                essenciais[k] = pref.essenciais[k];
              }
            });
          }
        }

        const naNuvem = Array.isArray(dados.movimentos) ? dados.movimentos : [];
        if (!naNuvem.length) {
          // Primeira vez nesta conta: enviamos o que já existe no telemóvel.
          if (movimentos.length) guardar();
          desenhar();
          return;
        }
        // Junta os dois lados pelo id, sem apagar nada de nenhum.
        const porId = {};
        naNuvem.concat(movimentos).forEach(m => {
          const n = normalizar(m);
          if (n) porId[n.id] = n;
        });
        movimentos = Object.values(porId);
        guardar();
        desenhar();
      })
      .catch(() => mostrarAviso('Não foi possível ler os movimentos da nuvem. A usar a cópia deste dispositivo.', 'info'));
  });
}

/* ---------- arranque ---------- */
document.addEventListener('DOMContentLoaded', () => {
  carregarLocal();

  document.getElementById('f-data').value = new Date().toISOString().slice(0, 10);
  document.getElementById('f-moeda').value = moeda;

  trocarTipo('saida');

  document.querySelectorAll('.tipo-sel button').forEach(b => {
    b.addEventListener('click', () => trocarTipo(b.dataset.tipo));
  });
  document.querySelectorAll('#campo-ess button').forEach(b => {
    b.addEventListener('click', () => { essActual = b.dataset.ess === '1'; pintarEss(); });
  });
  document.getElementById('f-categoria').addEventListener('change', () => {
    /* Escolher pelo menu contraria a etiqueta acesa: apagá-la, senão o
       ecrã diz uma coisa e o formulário lança outra. */
    etiquetaActiva = '';
    pintarEtiquetas();
    sincronizarEss();
  });
  document.getElementById('f-descricao').addEventListener('input', () => {
    descAutomatica = false;   // a partir daqui a descrição é da pessoa
  });
  document.querySelectorAll('.filtro button').forEach(b => {
    b.addEventListener('click', () => {
      filtro = b.dataset.filtro;
      document.querySelectorAll('.filtro button').forEach(x => {
        x.setAttribute('aria-pressed', String(x.dataset.filtro === filtro));
      });
      desenhar();
    });
  });

  document.getElementById('form').addEventListener('submit', adicionar);
  document.getElementById('mes-antes').addEventListener('click', () => mudarMes(-1));
  document.getElementById('mes-depois').addEventListener('click', () => mudarMes(1));
  document.getElementById('exportar').addEventListener('click', exportarCSV);
  document.getElementById('apagar-tudo').addEventListener('click', apagarTudo);
  document.getElementById('f-moeda').addEventListener('change', e => {
    moeda = e.target.value;
    try { localStorage.setItem(MOEDA_CHAVE, moeda); } catch (err) { /* ignora */ }
    desenhar();
  });

  desenhar();
  ligarNuvem();
});
