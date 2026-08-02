/* ============================================================
   Vida Financeira — Ferramentas

   Calculadoras que respondem a perguntas concretas de dinheiro. Cada uma
   mostra os pressupostos, para o número poder ser conferido em vez de
   acreditado.

   As gratuitas são as que uma pessoa precisa para gerir o mês e construir
   uma reserva. As de assinatura são as que projectam vários anos e vários
   cenários — trabalho de planeamento, não de sobrevivência.

   Sobre o desbloqueio: isto é um site estático, sem servidor. A chave é
   verificada aqui, no navegador, e quem souber mexer nas ferramentas do
   browser contorna-a. Está escrito na página em vez de escondido: assenta
   em confiança, e quem paga está a apoiar o projecto, não a comprar um
   cadeado. Um cadeado a sério exigiria servidor e custo fixo mensal.
   ============================================================ */

/* ---------- moeda ---------- */
function moedaActual() {
  return localStorage.getItem('vf:moeda') || 'EUR';
}
function eur(v) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency', currency: moedaActual(), minimumFractionDigits: 2
  }).format(isFinite(v) ? v : 0);
}
function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(String(el.value).replace(',', '.'));
  return isFinite(v) ? v : 0;
}

/* ============================================================
   Chave de acesso — válida um ano

   Formato: VF-AAMM-XXXX-K
     AAMM  ano e mês em que a chave deixa de valer (ex.: 2708 = Agosto 2027)
     XXXX  quatro caracteres livres, para as chaves não se repetirem
     K     dígito de controlo, calculado a partir do resto

   O dígito não é segurança: serve para uma chave inventada ao acaso não
   funcionar. A validade vem escrita na própria chave, por isso não se
   contorna reinstalando a aplicação nem limpando os dados.

   Continua a ser verificado no navegador. Está dito na página de preços que
   quem percebe do assunto contorna isto — vale mais dizê-lo do que fingir um
   cadeado que não existe.
   ============================================================ */
const CHAVE_PREMIUM = 'vf:chave';

function limparChave(txt) {
  return String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function digitoChave(corpo) {
  let soma = 0;
  for (let i = 0; i < corpo.length; i++) soma += corpo.charCodeAt(i) * (i + 2);
  return soma % 10;
}

/* Devolve { ok, motivo, expira } — nunca só um booleano, para se poder dizer
   à pessoa se a chave está errada ou se apenas caducou. */
function lerChave(txt) {
  const s = limparChave(txt);
  if (!/^VF[0-9]{4}[A-Z0-9]{4}[0-9]$/.test(s)) {
    return { ok: false, motivo: 'formato' };
  }
  const corpo = s.slice(2, 10);
  if (digitoChave(corpo) !== Number(s.slice(10))) {
    return { ok: false, motivo: 'invalida' };
  }
  const ano = 2000 + Number(s.slice(2, 4));
  const mes = Number(s.slice(4, 6));
  if (mes < 1 || mes > 12) return { ok: false, motivo: 'invalida' };

  // Vale até ao último instante do mês indicado.
  const expira = new Date(ano, mes, 1);
  if (expira <= new Date()) return { ok: false, motivo: 'caducada', expira };
  return { ok: true, expira };
}

function chaveValida(txt) { return lerChave(txt).ok; }

function temPremium() {
  try { return lerChave(localStorage.getItem(CHAVE_PREMIUM)).ok; } catch (e) { return false; }
}

function validadeChave() {
  try {
    const r = lerChave(localStorage.getItem(CHAVE_PREMIUM));
    return r.ok ? r.expira : null;
  } catch (e) { return null; }
}

function guardarChave(txt) {
  const r = lerChave(txt);
  if (!r.ok) return r;
  try { localStorage.setItem(CHAVE_PREMIUM, limparChave(txt)); } catch (e) { return { ok: false, motivo: 'formato' }; }
  return r;
}

function removerChave() {
  try { localStorage.removeItem(CHAVE_PREMIUM); } catch (e) {}
}

/* ============================================================
   As ferramentas
   ============================================================ */

/* ---------- 1. Quanto rende guardar todos os meses ---------- */
function calcPoupanca() {
  const mensal = num('p-mensal');
  const anos = Math.max(1, Math.min(40, num('p-anos') || 1));
  const taxa = num('p-taxa') / 100;
  const meses = anos * 12;
  const i = taxa / 12;

  // Depósitos no fim de cada mês. Com taxa zero é só a soma, e a fórmula
  // de anuidade divide por zero — daí o caso à parte.
  const total = i === 0 ? mensal * meses
                        : mensal * ((Math.pow(1 + i, meses) - 1) / i);
  const posto = mensal * meses;
  const juro = total - posto;

  resultado('p-out', [
    ['Ao fim de ' + anos + (anos === 1 ? ' ano' : ' anos'), eur(total), true],
    ['Do seu bolso', eur(posto)],
    ['Do juro', eur(juro)]
  ], juro / (total || 1) < 0.15
      ? 'Repare: quase tudo veio do que <b>você</b> depositou, não do juro. É por isso que o valor mensal importa mais do que a taxa nos primeiros anos.'
      : 'A partir daqui o juro começa a pesar. Continua a ser o depósito que faz a maior parte do trabalho.');
}

/* ---------- 2. De quanto precisa a minha reserva ---------- */
function calcReserva() {
  const essenciais = num('r-essenciais');
  const meses = Math.max(1, Math.min(12, num('r-meses') || 3));
  const jaTem = num('r-tenho');
  const porMes = num('r-pormes');

  const alvo = essenciais * meses;
  const falta = Math.max(0, alvo - jaTem);
  const nMeses = porMes > 0 ? Math.ceil(falta / porMes) : null;

  const linhas = [
    ['Reserva de ' + meses + (meses === 1 ? ' mês' : ' meses'), eur(alvo), true],
    ['Já tem', eur(jaTem)],
    ['Falta', eur(falta)]
  ];
  if (nMeses !== null && falta > 0) {
    linhas.push(['Ao ritmo de ' + eur(porMes) + ' por mês', nMeses + (nMeses === 1 ? ' mês' : ' meses')]);
  }

  resultado('r-out', linhas, falta === 0
    ? 'Já lá está. A partir daqui o dinheiro que sobra pode ir para outra coisa.'
    : 'A reserva mede-se em <b>meses de despesa essencial</b> e não em euros: 1 000 € são dois meses para quem gasta 500 €, e menos de um para quem gasta 1 100 €.');
}

/* ---------- 3. Vale a pena parcelar ---------- */
function calcParcelar() {
  const pronto = num('q-pronto');
  const vezes = Math.max(1, Math.round(num('q-vezes') || 1));
  const prestacao = num('q-prestacao');

  const total = prestacao * vezes;
  const aMais = total - pronto;
  const pct = pronto > 0 ? (aMais / pronto) * 100 : 0;

  const linhas = [
    ['Total a pagar', eur(total), true],
    ['A pronto', eur(pronto)],
    ['Paga a mais', eur(aMais)]
  ];
  if (pronto > 0) linhas.push(['Ou seja', pct.toFixed(1).replace('.', ',') + '% acima do preço']);

  let nota;
  if (aMais <= 0) {
    nota = 'Sem juro nenhum. Se o dinheiro fizer falta este mês, parcelar sem custo não tem problema.';
  } else {
    const porMes = pronto > 0 && vezes > 0 ? pronto / vezes : 0;
    nota = 'Guardando <b>' + eur(porMes) + '</b> por mês durante ' + vezes +
           ' meses tinha o preço a pronto e poupava ' + eur(aMais) + '.' +
           ' Nem sempre dá para esperar — uma máquina de lavar avariada não espera. A decisão é sua; a conta é esta.';
  }
  resultado('q-out', linhas, nota);
}

/* ---------- 4. Por onde começar a pagar dívidas ---------- */
function calcDividas() {
  const linhas = [];
  for (let k = 1; k <= 3; k++) {
    const v = num('d-valor' + k);
    const t = num('d-taxa' + k);
    if (v > 0) linhas.push({ n: k, valor: v, taxa: t });
  }
  if (!linhas.length) {
    resultado('d-out', [], 'Preencha pelo menos uma dívida.');
    return;
  }

  const porTaxa = linhas.slice().sort((a, b) => b.taxa - a.taxa);
  const porValor = linhas.slice().sort((a, b) => a.valor - b.valor);
  const total = linhas.reduce((s, x) => s + x.valor, 0);
  const jurosAno = linhas.reduce((s, x) => s + x.valor * (x.taxa / 100), 0);

  resultado('d-out', [
    ['Dívida total', eur(total), true],
    ['Juro de um ano, se nada mudar', eur(jurosAno)],
    ['Pela matemática, comece pela', 'dívida ' + porTaxa[0].n + ' (' + porTaxa[0].taxa.toString().replace('.', ',') + '%)'],
    ['Para não desistir, comece pela', 'dívida ' + porValor[0].n + ' (' + eur(porValor[0].valor) + ')']
  ], 'Pagar primeiro a de juro mais alto poupa mais dinheiro. Pagar primeiro a mais pequena dá uma vitória rápida, e a investigação mostra que quem faz assim desiste menos — e uma estratégia abandonada poupa zero. As duas são defensáveis.');
}

/* ---------- 5. Taxa de esforço da habitação ---------- */
function calcEsforco() {
  const rendimento = num('e-rendimento');
  const habitacao = num('e-habitacao');
  if (rendimento <= 0) {
    resultado('e-out', [], 'Escreva o rendimento do agregado.');
    return;
  }
  const pct = (habitacao / rendimento) * 100;
  const sobra = rendimento - habitacao;

  resultado('e-out', [
    ['A habitação leva', pct.toFixed(1).replace('.', ',') + '%', true],
    ['Sobra para tudo o resto', eur(sobra)],
    ['Por dia', eur(sobra / 30)]
  ], pct > 40
      ? 'Acima de 40% quase não sobra folga para imprevistos. Não é um julgamento — é a razão pela qual a renda é a despesa onde uma mudança rende mais do que meses a apertar no supermercado.'
      : 'O que sobra é o que tem de chegar para comer, transporte, contas e poupança. Vale a pena lançar um mês inteiro na aplicação para ver onde está a ir.');
}

/* ---------- 6. O custo de um hábito ---------- */
function calcHabito() {
  const valor = num('h-valor');
  const vezes = num('h-vezes');
  const semana = valor * vezes;
  const mes = semana * 4.345;   // média de semanas num mês
  const ano = semana * 52;

  resultado('h-out', [
    ['Por ano', eur(ano), true],
    ['Por mês', eur(mes)],
    ['Por semana', eur(semana)]
  ], 'Não é para deixar de o fazer. É para saber quanto custa, e decidir com o número à frente em vez de à sorte.');
}

/* ---------- 7. PREMIUM · Plano de 12 meses ---------- */
function calcPlano12() {
  const rendimento = num('a-rendimento');
  const essenciais = num('a-essenciais');
  const extra = num('a-extra');
  const folga = rendimento - essenciais;

  if (folga <= 0) {
    resultado('a-out', [
      ['Sobra por mês', eur(folga), true]
    ], 'Com estes números não sobra nada, e nenhum plano de poupança resolve isso — o problema não é disciplina. As saídas são rendimento, custos fixos, ou apoios a que tenha direito e não esteja a receber. Em Portugal há apoio gratuito e confidencial na <a href="https://clientebancario.bportugal.pt/pt-pt/entidades-da-race" target="_blank" rel="noopener">RACE</a>.');
    return;
  }

  const mensal = folga * 0.5;
  const corpo = [];
  let acumulado = 0;
  for (let m = 1; m <= 12; m++) {
    acumulado += mensal;
    // Subsídios: em Portugal entram tipicamente em Junho e Novembro.
    if ((m === 6 || m === 11) && extra > 0) acumulado += extra * 0.5;
    corpo.push([mesNome(m), eur(acumulado)]);
  }

  resultado('a-out', [
    ['Ao fim de 12 meses', eur(acumulado), true],
    ['Guardando por mês', eur(mensal)],
    ['Metade da folga fica para viver', eur(folga - mensal)]
  ], 'Metade da folga, não a folga toda: um plano que não deixa margem nenhuma é abandonado no primeiro mês difícil.');

  const tab = document.getElementById('a-tabela');
  if (tab) {
    tab.innerHTML = '';
    corpo.forEach(([m, v]) => {
      const li = document.createElement('li');
      li.innerHTML = '<span>' + m + '</span><b>' + v + '</b>';
      tab.appendChild(li);
    });
  }
}

function mesNome(n) {
  const nomes = ['1.º mês','2.º mês','3.º mês','4.º mês','5.º mês','6.º mês',
                 '7.º mês','8.º mês','9.º mês','10.º mês','11.º mês','12.º mês'];
  return nomes[n - 1] || n + '.º mês';
}

/* ---------- 8. PREMIUM · Comparar dois caminhos ---------- */
function calcCenarios() {
  const anos = Math.max(1, Math.min(40, num('c-anos') || 5));
  const meses = anos * 12;

  function fim(mensal, taxa) {
    const i = (taxa / 100) / 12;
    return i === 0 ? mensal * meses : mensal * ((Math.pow(1 + i, meses) - 1) / i);
  }

  const a = fim(num('c-mensalA'), num('c-taxaA'));
  const b = fim(num('c-mensalB'), num('c-taxaB'));
  const dif = Math.abs(a - b);
  const melhor = a >= b ? 'A' : 'B';

  resultado('c-out', [
    ['Caminho A, ao fim de ' + anos + (anos === 1 ? ' ano' : ' anos'), eur(a), melhor === 'A'],
    ['Caminho B', eur(b), melhor === 'B'],
    ['Diferença', eur(dif)]
  ], 'Nenhuma taxa é garantida — são pressupostos seus, não previsões. O que a comparação mostra é o peso relativo de cada decisão, não o futuro.');
}

/* ---------- 9. PREMIUM · Quanto tempo até à independência ---------- */
function calcIndependencia() {
  const gastoAnual = num('i-gasto') * 12;
  const patrimonio = num('i-tenho');
  const poupancaAnual = num('i-poupo') * 12;
  const taxa = num('i-taxa') / 100;
  const alvo = gastoAnual * 25;   // regra dos 4%, dita como pressuposto

  if (poupancaAnual <= 0 && patrimonio < alvo) {
    resultado('i-out', [['Alvo', eur(alvo), true]],
      'Sem poupança mensal não há caminho a calcular. O primeiro passo é a folga, não o alvo.');
    return;
  }

  let p = patrimonio, anos = 0;
  while (p < alvo && anos < 80) { p = p * (1 + taxa) + poupancaAnual; anos++; }

  resultado('i-out', [
    ['Alvo (25 anos de despesa)', eur(alvo), true],
    ['Tem hoje', eur(patrimonio)],
    ['Anos ao ritmo actual', anos >= 80 ? 'mais de 80' : anos + (anos === 1 ? ' ano' : ' anos')]
  ], 'O alvo assume que se retira 4% ao ano, um pressuposto comum e discutível, calculado sobre mercados e períodos concretos. Isto não é uma previsão nem uma recomendação de investimento — é aritmética com os números que escreveu.');
}

/* ---------- desenhar resultados ---------- */
function resultado(id, linhas, nota) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  linhas.forEach(([rot, val, destaque]) => {
    const d = document.createElement('div');
    d.className = 'res-linha' + (destaque ? ' destaque' : '');
    d.innerHTML = '<span>' + rot + '</span><b>' + val + '</b>';
    el.appendChild(d);
  });
  if (nota) {
    const p = document.createElement('p');
    p.className = 'res-nota';
    p.innerHTML = nota;
    el.appendChild(p);
  }
  el.classList.add('mostrar');
}

/* ============================================================
   Ligar tudo
   ============================================================ */
const CALCULOS = {
  'p': calcPoupanca, 'r': calcReserva, 'q': calcParcelar, 'd': calcDividas,
  'e': calcEsforco, 'h': calcHabito,
  'a': calcPlano12, 'c': calcCenarios, 'i': calcIndependencia
};

function aplicarEstadoPremium() {
  const tem = temPremium();
  const ate = validadeChave();

  document.querySelectorAll('.ferramenta.premium').forEach(f => {
    f.classList.toggle('trancada', !tem);
    f.querySelectorAll('input, button').forEach(el => {
      if (!el.classList.contains('js-ignorar-trinco')) el.disabled = !tem;
    });
  });

  document.querySelectorAll('.js-se-premium').forEach(el => { el.hidden = !tem; });
  document.querySelectorAll('.js-se-gratis').forEach(el => { el.hidden = tem; });

  const val = document.getElementById('validade');
  if (val && ate) {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                   'Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const fim = new Date(ate.getTime() - 1);
    const dias = Math.ceil((ate - new Date()) / 86400000);
    val.textContent = 'Chave activa até ' + meses[fim.getMonth()] + ' de ' + fim.getFullYear() +
                      ' — faltam ' + dias + (dias === 1 ? ' dia' : ' dias') + '.';
  }
}

/* ---------- painel de desbloqueio ----------
   O cadeado fica à vista em cima da ferramenta, com o nome e o que ela faz
   legíveis por baixo. Esconder o que se vende não vende nada: quem não vê o
   que está do outro lado não tem razão nenhuma para pagar. */
function abrirDesbloqueio() {
  const p = document.getElementById('painel-desbloqueio');
  if (!p) return;
  p.hidden = false;
  p.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const campo = document.getElementById('c-chave');
  if (campo) setTimeout(() => campo.focus({ preventScroll: true }), 400);
}

document.addEventListener('DOMContentLoaded', () => {
  Object.entries(CALCULOS).forEach(([pre, fn]) => {
    const btn = document.getElementById(pre + '-calc');
    if (btn) btn.addEventListener('click', fn);
    document.querySelectorAll('[id^="' + pre + '-"]').forEach(el => {
      if (el.tagName === 'INPUT') {
        el.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); });
      }
    });
  });

  // Desbloquear com a chave
  const form = document.getElementById('form-chave');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const campo = document.getElementById('c-chave');
      const aviso = document.getElementById('aviso-chave');
      const r = guardarChave(campo.value);
      aviso.hidden = false;
      if (r.ok) {
        aviso.className = 'aviso ok';
        aviso.textContent = 'Chave aceite. As três ferramentas estão abertas.';
        aplicarEstadoPremium();
        campo.value = '';
        const p = document.getElementById('painel-desbloqueio');
        if (p) p.hidden = true;
      } else if (r.motivo === 'caducada') {
        aviso.className = 'aviso erro';
        aviso.textContent = 'Essa chave já caducou. Peça uma nova — é o mesmo preço e volta a valer um ano.';
      } else if (r.motivo === 'formato') {
        aviso.className = 'aviso erro';
        aviso.textContent = 'Falta alguma coisa na chave. Deve ter o formato VF-2708-XXXX-0, com os traços.';
      } else {
        aviso.className = 'aviso erro';
        aviso.textContent = 'Essa chave não é válida. Confirme se a copiou inteira.';
      }
    });
  }

  document.querySelectorAll('.js-desbloquear').forEach(b =>
    b.addEventListener('click', e => { e.preventDefault(); abrirDesbloqueio(); }));

  const sair = document.getElementById('remover-chave');
  if (sair) {
    sair.addEventListener('click', () => {
      removerChave();
      aplicarEstadoPremium();
      const aviso = document.getElementById('aviso-chave');
      if (aviso) { aviso.className = 'aviso info'; aviso.textContent = 'Chave removida neste dispositivo.'; aviso.hidden = false; }
    });
  }

  aplicarEstadoPremium();
});
