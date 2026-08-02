/* ============================================================
   Vida Financeira — o que a dívida está a custar

   A aplicação já registava prestações e já dizia quanto estava comprometido.
   O que nunca dizia era o preço: quanto é que aquilo custa a mais, e quanto
   tempo falta a pagar. E é esse o número que muda alguma coisa — porque
   ninguém decide sobre uma percentagem, decide sobre "isto vai levar-me
   quatro anos e mais mil euros".

   Duas regras que este ficheiro não quebra:

   1. A taxa que a aplicação sugere é uma referência publicada, com fonte e
      data escritas no ecrã, e nunca "a sua taxa". A taxa de cada pessoa está
      no contrato dela e pode ser outra. Apresentar uma média como se fosse a
      dela seria dar-lhe um número errado com ar de certeza.

   2. Não se diz a ninguém o que fazer com a dívida. Mostra-se a conta e diz-se
      onde há ajuda gratuita. Recomendar consolidação, transferência de saldo
      ou seja o que for é aconselhamento de crédito, e isso não se faz numa
      aplicação de contas.
   ============================================================ */

/* Referências por país. Números publicados, com a data — e é a data que os
   torna honestos: uma taxa sem data envelhece em silêncio e um dia está a
   mentir sem ninguém dar por isso. */
const REF_JURO = {
  EUR: {
    anual: 18.5,
    rotulo: 'Cartão de crédito em Portugal',
    fonte: 'Máximo legal de 18,5% TAEG para cartões de crédito, linhas de crédito e descobertos — Banco de Portugal, 3.º trimestre de 2026.',
    ajuda: 'Em Portugal há apoio gratuito e confidencial na RACE, a rede de apoio ao consumidor endividado.',
    ajudaLigacao: 'https://clientebancario.bportugal.pt/pt-pt/entidades-da-race'
  },
  BRL: {
    anual: 430,
    rotulo: 'Rotativo do cartão no Brasil',
    fonte: 'O rotativo do cartão cobrou entre 428% e 451% ao ano nas medições de 2025. É a dívida mais cara que existe à venda ao público.',
    ajuda: 'No Brasil dá para renegociar directamente com o banco, e há mutirões de renegociação com desconto.',
    ajudaLigacao: ''
  }
};

function refJuro() {
  return REF_JURO[typeof moeda !== 'undefined' ? moeda : 'EUR'] || REF_JURO.EUR;
}

/* Estado do ecrã. `juroAnual` a null quer dizer "ainda não escolheu". */
let divJuro = null;
let divFonteEscolhida = 'ref';   // 'ref' ou 'meu'

/* ---------- o que a aplicação já sabe ----------
   Quem tem prestações lançadas já disse à aplicação quanto deve e quanto
   paga: não faz sentido perguntar-lho outra vez. */
function dividaLancada() {
  if (typeof movimentos === 'undefined') return null;
  const hoje = (typeof HOJE === 'string') ? HOJE : new Date().toISOString().slice(0, 10);

  let porPagar = 0, porMes = 0;
  const gruposVistos = {};

  movimentos.forEach(m => {
    if (m.tipo !== 'saida' || !m.parc) return;
    if (m.data > hoje) porPagar += m.valor;           // prestações ainda por vencer
    /* O que sai por mês conta-se uma vez por compra parcelada, não uma vez
       por prestação — senão uma compra em 24 vezes aparecia 24 vezes. */
    if (!gruposVistos[m.parc.g] && m.data > hoje) {
      gruposVistos[m.parc.g] = true;
      porMes += m.valor;
    }
  });

  if (porPagar <= 0) return null;
  return {
    porPagar: Math.round(porPagar * 100) / 100,
    porMes: Math.round(porMes * 100) / 100
  };
}

/* ---------- a conta ----------
   Mês a mês: o juro soma-se ao saldo e o pagamento tira-se. É assim que
   funciona um cartão a sério, e é por isso que pagar o mínimo não chega. */
function simularDivida(deve, paga, jurAnual) {
  const i = Math.pow(1 + jurAnual / 100, 1 / 12) - 1;   // juro mensal equivalente
  const juroPrimeiroMes = deve * i;

  if (paga <= juroPrimeiroMes) {
    return { cresce: true, i: i, juroMes: juroPrimeiroMes, deve: deve, paga: paga };
  }

  let saldo = deve, meses = 0, juroTotal = 0;
  while (saldo > 0.005 && meses < 600) {
    const j = saldo * i;
    juroTotal += j;
    saldo = saldo + j - paga;
    meses++;
  }
  /* O último pagamento é menor do que os outros: sem isto, o total pago dava
     mais do que a pessoa vai mesmo pagar. */
  const pagoTotal = deve + juroTotal;

  return {
    cresce: false, i: i, meses: meses,
    juroTotal: Math.round(juroTotal * 100) / 100,
    pagoTotal: Math.round(pagoTotal * 100) / 100,
    deve: deve, paga: paga
  };
}

function mesesPorExtenso(n) {
  if (n < 12) return n + (n === 1 ? ' mês' : ' meses');
  const anos = Math.floor(n / 12), resto = n % 12;
  const a = anos + (anos === 1 ? ' ano' : ' anos');
  return resto ? a + ' e ' + resto + (resto === 1 ? ' mês' : ' meses') : a;
}

/* ---------- desenhar ---------- */
function desenharDivida() {
  const corpo = document.getElementById('divida-corpo');
  if (!corpo) return;
  corpo.innerHTML = '';

  const ref = refJuro();
  const campoDeve = document.getElementById('dv-deve');
  const campoPaga = document.getElementById('dv-paga');

  /* Preencher com o que já foi lançado, uma vez só — depois disso mandam os
     números que a pessoa escreveu. */
  const lancada = dividaLancada();
  if (lancada && campoDeve && !campoDeve.dataset.tocado) {
    campoDeve.value = String(lancada.porPagar).replace('.', ',');
    campoPaga.value = String(lancada.porMes).replace('.', ',');
    const nota = document.getElementById('divida-lancada');
    if (nota) {
      nota.hidden = false;
      nota.textContent = 'Preenchido com as prestações que já lançou: falta pagar ' +
        dinheiro(lancada.porPagar) + ', a ' + dinheiro(lancada.porMes) + ' por mês. Corrija se quiser.';
    }
  }

  if (divJuro === null) {
    const p = document.createElement('p');
    p.className = 'dv-espera';
    p.textContent = 'Escolha em cima que juro é que essa dívida cobra, e eu faço a conta.';
    corpo.appendChild(p);
    return;
  }

  const deve = valorCampo('dv-deve');
  const paga = valorCampo('dv-paga');

  if (!(deve > 0)) {
    corpo.appendChild(linhaSimples('Escreva quanto ainda deve.'));
    return;
  }
  if (!(paga > 0)) {
    corpo.appendChild(linhaSimples('Escreva quanto paga por mês.'));
    return;
  }

  const r = simularDivida(deve, paga, divJuro);
  const jm = (r.i * 100).toFixed(2).replace('.', ',');

  /* --- o caso que interessa mesmo: pagar não chega para o juro --- */
  if (r.cresce) {
    corpo.appendChild(destaque(
      'Esta dívida está a crescer',
      dinheiro(Math.round(r.juroMes * 100) / 100) + ' por mês',
      'É o juro que se soma todos os meses. Está a pagar ' + dinheiro(paga) +
      ', ou seja menos do que isso — por isso o que deve aumenta mesmo pagando a horas. ' +
      'A esta taxa, nunca acaba.',
      true
    ));
    corpo.appendChild(linhaValor('Juro por mês', jm + '%'));
    corpo.appendChild(linhaValor('O que deve', dinheiro(deve)));
    corpo.appendChild(linhaValor('O que paga', dinheiro(paga)));

    /* Quanto seria preciso para começar a descer. Um facto, não um conselho:
       é a conta que ela não consegue fazer de cabeça. */
    const minimo = Math.ceil((r.juroMes + 1) * 100) / 100;
    corpo.appendChild(nota('Para o valor começar a descer era preciso pagar mais do que ' +
      dinheiro(minimo) + ' por mês. Não é dizer-lhe que consegue — é dizer-lhe onde está a linha.'));
    corpo.appendChild(notaAjuda(ref));
    return;
  }

  /* --- o caso normal --- */
  corpo.appendChild(destaque(
    'Vai pagar ao todo',
    dinheiro(r.pagoTotal),
    'Levou ' + dinheiro(deve) + ' emprestados e devolve ' + dinheiro(r.pagoTotal) +
    '. A diferença — ' + dinheiro(r.juroTotal) + ' — é o preço de pagar aos poucos.'
  ));
  corpo.appendChild(linhaValor('Só de juro', dinheiro(r.juroTotal)));
  corpo.appendChild(linhaValor('Tempo até acabar', mesesPorExtenso(r.meses)));
  corpo.appendChild(linhaValor('Juro por mês', jm + '%'));

  /* O que aconteceria pagando um pouco mais. É o número que faz alguém mexer,
     porque mostra que a diferença não é pequena nem distante. */
  const maisUm = simularDivida(deve, paga * 1.2, divJuro);
  if (!maisUm.cresce && maisUm.juroTotal < r.juroTotal) {
    const poupa = Math.round((r.juroTotal - maisUm.juroTotal) * 100) / 100;
    if (poupa > 1) {
      corpo.appendChild(nota('Pagando ' + dinheiro(Math.round(paga * 1.2 * 100) / 100) +
        ' por mês em vez de ' + dinheiro(paga) + ', acabava em ' + mesesPorExtenso(maisUm.meses) +
        ' e pagava menos ' + dinheiro(poupa) + ' de juro.'));
    }
  }

  corpo.appendChild(notaAjuda(ref));
}

/* ---------- peças ---------- */
function valorCampo(id) {
  const v = valorOuNada(id);
  return v === null ? 0 : v;
}

/* Distingue "escreveu zero" de "não escreveu nada", que o `|| null` não fazia:
   com juro 0 o resultado era falso e a aplicação achava que ninguém tinha
   escolhido taxa nenhuma. E 0% não é um caso de laboratório — é o "12x sem
   juros" que se vê em todas as lojas do Brasil. */
function valorOuNada(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const t = String(el.value).trim();
  if (!t) return null;
  const v = parseFloat(t.replace(',', '.'));
  return (isFinite(v) && v >= 0) ? v : null;
}

function linhaSimples(txt) {
  const p = document.createElement('p');
  p.className = 'dv-espera';
  p.textContent = txt;
  return p;
}

function destaque(rotulo, valor, explicacao, mau) {
  const d = document.createElement('div');
  d.className = 'dv-destaque' + (mau ? ' mau' : '');
  const r = document.createElement('div'); r.className = 'dv-rot'; r.textContent = rotulo;
  const v = document.createElement('div'); v.className = 'dv-val'; v.textContent = valor;
  const e = document.createElement('p'); e.className = 'dv-exp'; e.textContent = explicacao;
  d.append(r, v, e);
  return d;
}

function linhaValor(rotulo, valor) {
  const d = document.createElement('div');
  d.className = 'dv-linha';
  const a = document.createElement('span'); a.textContent = rotulo;
  const b = document.createElement('b'); b.textContent = valor;
  d.append(a, b);
  return d;
}

function nota(txt) {
  const p = document.createElement('p');
  p.className = 'dv-nota';
  p.textContent = txt;
  return p;
}

/* Onde há ajuda gratuita. Não é conselho de crédito — é dizer que existe uma
   porta, que é a informação que costuma faltar a quem está nisto. */
function notaAjuda(ref) {
  const p = document.createElement('p');
  p.className = 'dv-ajuda';
  p.textContent = ref.ajuda + ' ';
  if (ref.ajudaLigacao) {
    const a = document.createElement('a');
    a.href = ref.ajudaLigacao;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Ver as entidades da RACE';
    p.appendChild(a);
  }
  return p;
}

/* ---------- ligar ---------- */
function ligarDivida() {
  const ecra = document.getElementById('ecra-divida');
  if (!ecra) return;

  const ref = refJuro();

  const btRef = document.getElementById('dv-ref');
  const btMeu = document.getElementById('dv-meu');
  const zonaMeu = document.getElementById('dv-meu-zona');
  const campoMeu = document.getElementById('dv-taxa');
  const fonte = document.getElementById('dv-fonte');

  if (btRef) btRef.textContent = ref.rotulo;
  if (fonte) fonte.textContent = ref.fonte;

  const escolher = (qual) => {
    divFonteEscolhida = qual;
    if (btRef) btRef.setAttribute('aria-pressed', String(qual === 'ref'));
    if (btMeu) btMeu.setAttribute('aria-pressed', String(qual === 'meu'));
    if (zonaMeu) zonaMeu.hidden = qual !== 'meu';
    if (fonte) fonte.hidden = qual !== 'ref';
    divJuro = (qual === 'ref') ? ref.anual : valorOuNada('dv-taxa');
    desenharDivida();
  };

  if (btRef) btRef.addEventListener('click', () => escolher('ref'));
  if (btMeu) btMeu.addEventListener('click', () => { escolher('meu'); if (campoMeu) campoMeu.focus(); });
  if (campoMeu) campoMeu.addEventListener('input', () => {
    divJuro = valorOuNada('dv-taxa');
    desenharDivida();
  });

  ['dv-deve', 'dv-paga'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => { el.dataset.tocado = '1'; desenharDivida(); });
  });

  desenharDivida();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { simularDivida, mesesPorExtenso, REF_JURO };
}
