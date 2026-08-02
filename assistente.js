/* ============================================================
   Vida Financeira — o assistente

   Responde a perguntas de dinheiro com os números que a própria pessoa já
   lançou. Não é um modelo de linguagem: é um banco de respostas escritas à
   mão, escolhidas por regras e preenchidas com os dados reais.

   Porquê assim, e não um chat com modelo:
   - custa zero por conversa, e funciona offline
   - é auditável frase a frase, o que num site de dinheiro importa
   - é ESTRUTURALMENTE incapaz de recomendar um produto financeiro, em vez de
     apenas instruído a não o fazer
   - e é mais útil: já sabe o rendimento, os essenciais e a reserva de quem
     pergunta, por isso responde com números em vez de generalidades

   A persona é o fundador, com a história verdadeira. Nada de títulos
   inventados: quem lê isto ganha perto do salário mínimo e é exactamente a
   pessoa que mais precisa de poder confiar no que aqui está escrito.
   ============================================================ */

const ASSIST_HIST = 'vf:assistente';

/* ---------- ler o estado real da pessoa ---------- */
function dadosAssistente() {
  let movs = [];
  try { movs = JSON.parse(localStorage.getItem('vf:movimentos') || '[]'); } catch (e) {}
  if (!Array.isArray(movs)) movs = [];

  const hoje = new Date();
  const chave = d => String(d).slice(0, 7);
  const passado = movs.filter(m => m && m.data && new Date(m.data) <= hoje);

  const meses = {};
  passado.forEach(m => {
    const k = chave(m.data);
    meses[k] = meses[k] || { entrou: 0, saiu: 0, ess: 0, guardou: 0 };
    const v = Number(m.valor) || 0;
    if (m.tipo === 'entrada') meses[k].entrou += v;
    else {
      if (m.categoria === 'reserva') meses[k].guardou += v;
      else {
        meses[k].saiu += v;
        if (m.ess !== false) meses[k].ess += v;
      }
    }
  });

  const chaves = Object.keys(meses).sort();
  const completos = chaves.slice(0, -1);          // o mês corrente ainda não fechou
  const med = campo => {
    const v = completos.map(k => meses[k][campo]).sort((a, b) => a - b);
    if (!v.length) return null;
    return v[Math.floor(v.length / 2)];
  };

  const R = med('entrou');
  const E = med('ess');
  const reserva = passado.filter(m => m.categoria === 'reserva')
                         .reduce((s, m) => s + (Number(m.valor) || 0), 0)
                - passado.filter(m => m.categoria === 'reserva-tirei')
                         .reduce((s, m) => s + (Number(m.valor) || 0), 0);

  const temParcelas = movs.some(m => m && m.parc && typeof m.parc === 'object');
  const moeda = localStorage.getItem('vf:moeda') || 'EUR';

  return {
    R, E, reserva: Math.max(0, reserva),
    folga: (R !== null && E !== null) ? R - E : null,
    mesesReserva: (E && E > 0) ? reserva / E : null,
    nMovs: passado.length, nMeses: completos.length,
    temParcelas, moeda,
    aperto: (R !== null && E !== null) ? (R - E) <= 0 : null
  };
}

function dinAssist(v) {
  const d = dadosAssistente();
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency', currency: d.moeda, minimumFractionDigits: 2
  }).format(isFinite(v) ? v : 0);
}

/* ============================================================
   O banco de respostas

   Cada entrada: palavras que a fazem disparar, e uma função que devolve o
   texto já com os números da pessoa. Devolver `null` significa "esta não
   serve para o estado actual", e a seguinte é tentada.
   ============================================================ */
const RESPOSTAS = [

  /* ---------- não sobra nada ---------- */
  {
    id: 'sem-folga',
    chaves: ['não sobra', 'nao sobra', 'não consigo poupar', 'nao consigo poupar',
             'não tenho dinheiro', 'nao tenho dinheiro', 'não dá', 'nao da',
             'estou apertado', 'no vermelho', 'não chega', 'nao chega'],
    resp(d) {
      const base = d.aperto === true
        ? `Fiz as contas com o que lançou: entra cerca de ${dinAssist(d.R)} por mês e o essencial leva ${dinAssist(d.E)}. Não sobra. `
        : '';
      return base + `Vou dizer-lhe uma coisa que ninguém diz: **se as contas não fecham, o problema não é a sua disciplina.** Não há método de orçamento que resolva a falta de dinheiro. Eu passei por isto, e o que me tirou de lá não foi apertar mais o cinto — foi mexer em três coisas, por esta ordem de dificuldade:

**1. Apoios a que tem direito e não está a receber.** É espantosamente comum, e é o único que dá dinheiro esta semana sem trabalhar mais uma hora. Toque em **Apoios** aqui em baixo e responda a quatro perguntas.

**2. Custos fixos, sobretudo a habitação.** Uma renda ${dinAssist(80)} mais barata vale mais do que dois anos a poupar no supermercado. É duro e é lento, mas é o que muda a conta de vez.

**3. Rendimento.** Horas, formação paga, mudar de entidade, um trabalho ao lado. É o mais lento dos três — e o único que resolve para sempre.

Enquanto não houver folga, o objectivo não é poupar. É **acabar o mês sem dívida nova.** Isso já é ganhar.`;
    }
  },

  /* ---------- subsídios e apoios ---------- */
  {
    id: 'subsidios',
    chaves: ['subsídio', 'subsidio', 'rsi', 'rendimento social', 'apoio', 'apoios',
             'abono', 'bolsa família', 'bolsa familia', 'segurança social',
             'seguranca social', 'estado', 'ajuda do governo', 'benefício', 'beneficio'],
    resp() {
      return `Quem vive de apoios tem um problema que quase nenhum conselho financeiro trata: **o dinheiro chega em datas fixas e não aumenta**. Isso muda tudo — e, ao contrário do que parece, joga a favor.

**Porquê a favor:** quem tem rendimento fixo consegue planear ao cêntimo. Quem trabalha à peça não consegue. A previsibilidade é a única vantagem que tem, e a maioria das pessoas desperdiça-a.

**O que fazer com ela, em concreto:**

**No dia em que entra**, separe primeiro — nem que sejam ${dinAssist(5)}. Não no fim do mês, quando já não há. Esta é a diferença entre quem junta e quem não junta, e não tem nada a ver com quanto se ganha.

**Confirme o que lhe falta receber.** Muita gente recebe um apoio e tem direito a três. A tarifa social da energia e da água não é automática — tem de ser pedida, e muita gente que tem direito nunca a pediu. Toque em **Apoios** e veja a lista do seu país.

**Marque as datas.** Se sabe que entra no dia 20, sabe que os dias 15 a 19 são os apertados. Planeie as compras grandes para os dias 20 e 21, quando há dinheiro e não se compra em aflição.

Comece pelos **Apoios** aqui em baixo — é onde há dinheiro que talvez já seja seu.`;
    }
  },

  /* ---------- como começar do zero ---------- */
  {
    id: 'comecar',
    chaves: ['começar', 'comecar', 'por onde', 'primeiro passo', 'do zero',
             'não sei por onde', 'nao sei por onde', 'ajuda', 'mudar de vida',
             'sair da pobreza', 'melhorar de vida'],
    resp(d) {
      if (d.nMovs === 0) {
        return `Do zero, e sem rodeios. O primeiro mês é o único que custa.

**Esta semana, só isto:** lance tudo o que gastar. Tudo. O café, o pão, o passe. Não mude nada nos hábitos ainda — só aponte. Leva vinte segundos de cada vez, no separador **Lançar**.

**Porquê antes de tudo o resto:** quem regista o que gasta passa a gastar menos, mesmo sem tentar. Não é força de vontade — é que passa a haver um número onde antes havia uma vaga sensação. Eu só percebi para onde ia o meu dinheiro quando o vi escrito.

**No fim do mês** já tem uma coisa que hoje não tem: saber quanto precisa mesmo para viver. A partir daí tudo se calcula.

**E o segundo mês**, separa-se um valor no dia em que o dinheiro entra. Pequeno. ${dinAssist(10)} chegam para começar — o hábito vale mais do que o valor, e o valor cresce com o tempo.

Nada disto exige que seja uma pessoa diferente da que é. Exige um mês.`;
      }
      if (d.aperto === true) return RESPOSTAS[0].resp(d);
      const alvo = d.E ? d.E * 3 : null;
      return `Já lançou ${d.nMovs} movimentos, o que é mais do que a maioria faz. Com esses números, o caminho é este:

**Sobra-lhe cerca de ${dinAssist(d.folga)} por mês.** Não guarde tudo — quem tenta guardar a folga inteira desiste no primeiro mês difícil. Guarde **metade**, ${dinAssist(d.folga / 2)}, e no dia em que o dinheiro entra.

**O alvo é ${alvo ? dinAssist(alvo) : 'três meses de despesa essencial'}** — três meses do seu essencial. Não é para investir; é para uma avaria não se transformar em crédito a 18%. É esta reserva que separa quem vai subindo de quem volta sempre à casa de partida.

**Ao ritmo de ${dinAssist(d.folga / 2)} por mês**, lá chega em cerca de ${alvo ? Math.ceil(alvo / (d.folga / 2)) : '—'} meses. É muito tempo. É também o tempo que passa de qualquer maneira.`;
    }
  },

  /* ---------- reserva ---------- */
  {
    id: 'reserva',
    chaves: ['reserva', 'emergência', 'emergencia', 'poupança', 'poupanca',
             'quanto guardar', 'quanto poupar', 'juntar dinheiro'],
    resp(d) {
      if (!d.E) return `A reserva mede-se em **meses de despesa essencial**, e não em euros. ${dinAssist(1000)} são dois meses para quem gasta ${dinAssist(500)}, e menos de um para quem gasta ${dinAssist(1100)}. Por isso o primeiro passo é saber quanto é o seu essencial — lance um mês inteiro e a aplicação diz-lhe.`;
      const m = d.mesesReserva || 0;
      const estado = m >= 3 ? `Tem ${m.toFixed(1)} meses. Está feita — a partir daqui o que sobra pode ir para outra coisa.`
                   : m >= 1 ? `Tem ${m.toFixed(1)} meses. Já não está exposto ao pior: uma avaria já não vira crédito.`
                   : m > 0  ? `Tem ${m.toFixed(1)} meses. É pouco, mas é infinitamente mais do que zero — a primeira semana de reserva é a que mais muda.`
                            : `Ainda não tem reserva nenhuma. É por aqui que se começa.`;
      return `O seu essencial é cerca de ${dinAssist(d.E)} por mês. ${estado}

**Os degraus, por ordem:**
· **Uma semana** — ${dinAssist(d.E / 4)}. Cobre o susto pequeno.
· **Um mês** — ${dinAssist(d.E)}. Cobre a maioria das avarias.
· **Três meses** — ${dinAssist(d.E * 3)}. Cobre ficar sem trabalho por um tempo.

Não salte para os três meses. Persiga o degrau seguinte, sempre. Um alvo que se atinge dá vontade de continuar; um alvo distante dá vontade de desistir — e é isso que separa quem consegue de quem começa dez vezes.`;
    }
  },

  /* ---------- dívidas e cartão ---------- */
  {
    id: 'dividas',
    chaves: ['dívida', 'divida', 'dividas', 'dívidas', 'cartão', 'cartao',
             'crédito', 'credito', 'prestação', 'prestacao', 'parcelar',
             'devo', 'juros', 'rotativo', 'empréstimo', 'emprestimo'],
    resp(d) {
      const nota = d.temParcelas ? '\n\nVi que tem prestações lançadas. No separador **Início**, o bloco "Já comprometido" mostra-lhe quanto de cada mês já está gasto antes de começar.' : '';
      return `Sobre dívida, três coisas que aprendi a pagar caro.

**Primeira: saiba o número.** Não o "mais ou menos". O número. A maior parte das pessoas endividadas não sabe quanto deve ao certo, e não se resolve o que não se mede. A ferramenta **Por onde começar a pagar dívidas** faz-lhe essa conta.

**Segunda: a ordem importa menos do que continuar.** Pela matemática, começa-se pela taxa mais alta. Na prática, quem começa pela dívida mais pequena desiste menos — e uma estratégia abandonada poupa zero. Se é do tipo que precisa de ver uma vitória, comece pela pequena. Não é irracional; é conhecer-se.

**Terceira, e a mais importante:** em Portugal, se falhar uma prestação, o banco é **obrigado por lei** a integrá-lo no PERSI, e enquanto isso corre não pode executar a dívida. E há apoio gratuito e confidencial para tratar disto — a RACE, com entidades por distrito. Não é um empréstimo nem vende nada. Se está a ler isto porque as contas não fecham, é provavelmente o telefonema mais útil que pode fazer esta semana.${nota}`;
    }
  },

  /* ---------- ganhar mais / negócio ---------- */
  {
    id: 'rendimento',
    chaves: ['ganhar mais', 'aumentar', 'negócio', 'negocio', 'vender',
             'trabalhar por conta', 'empreender', 'empresa', 'freelancer',
             'segundo emprego', 'renda extra', 'trabalho extra', 'comércio', 'comercio'],
    resp() {
      return `Poupar tem um tecto: não se pode cortar abaixo de zero. Ganhar não tem. Se está com o essencial a cobrir tudo, é aqui que está a saída — e é o caminho mais lento e o único definitivo.

**O que aprendi a começar sem dinheiro:**

**Venda o que já sabe fazer, não o que gostaria de saber.** O erro que mais vi custar meses foi ir aprender uma coisa nova quando já havia uma coisa vendável nas mãos. Cozinhar, arranjar, limpar, conduzir, cortar cabelo, escrever, traduzir, cuidar. Qualquer uma delas tem mercado hoje.

**Comece com o primeiro cliente, não com a empresa.** Sem nome, sem logótipo, sem site. Um cliente que paga. A empresa faz-se depois, e faz-se em dias. Vi muita gente gastar as poupanças a preparar um negócio que nunca teve um cliente.

**Cobre desde o primeiro dia.** Trabalho de graça "para ganhar experiência" ensina o cliente a não pagar. Cobre pouco no início, mas cobre.

**Separe o dinheiro do negócio do dinheiro de casa** desde o primeiro euro. Misturados, o negócio parece lucrativo até ao dia em que não há dinheiro para a renda.

**E o mais importante:** um negócio pequeno que dá ${dinAssist(200)} por mês, todos os meses, muda mais a sua vida do que um plano grande que nunca começa. ${dinAssist(200)} por mês é a renda mais barata, é a reserva feita num ano, é a dívida do cartão paga.`;
    }
  },

  /* ---------- investir ---------- */
  {
    id: 'investir',
    chaves: ['investir', 'investimento', 'aplicar', 'render', 'bolsa',
             'ações', 'acoes', 'cripto', 'onde ponho', 'fundo'],
    resp(d) {
      const antes = (d.mesesReserva !== null && d.mesesReserva < 3)
        ? `Antes de mais: tem ${(d.mesesReserva || 0).toFixed(1)} meses de reserva. Investir antes de ter três é como pôr o telhado antes das paredes — à primeira avaria vende-se ao pior preço possível, e perde-se mais do que se ganhou.\n\n` : '';
      return `${antes}Não lhe digo onde pôr dinheiro. Não sou entidade autorizada para isso, e quem lhe disser sem conhecer a sua vida está a vender-lhe alguma coisa.

**O que lhe posso dizer é como funciona, e as perguntas que tem de fazer:**

**O custo é a única coisa previsível.** O retorno ninguém sabe; a comissão sabe-se ao cêntimo. Uma diferença de 2% ao ano em comissões, ao longo de vinte anos, come uma fatia enorme do resultado. Pergunte sempre: *quanto é que isto me cobra por ano, ao todo?*

**O prazo decide tudo.** Dinheiro de que pode precisar dentro de três anos não deve estar exposto a oscilações. É por isso que a reserva vem primeiro.

**As perguntas a fazer antes de assinar seja o que for:**
· Quanto custa por ano, tudo incluído?
· Quanto posso perder no pior ano registado?
· Em quanto tempo consigo tirar o dinheiro, e com que penalização?
· Que garantia existe, e até que valor?
· Quem me está a vender isto ganha comissão?

Se quem lhe vende não responder às cinco com clareza, tem a sua resposta.`;
    }
  },

  /* ---------- o que a app faz ---------- */
  {
    id: 'app',
    chaves: ['como funciona', 'o que faz', 'para que serve', 'não percebo',
             'nao percebo', 'como uso', 'como usar', 'preencher'],
    resp() {
      return `Simples, e é de propósito.

**Lançar** — toque no que foi (Mercado, Luz, Renda…), escreva quanto, e pronto. Vinte segundos. O valor escreve-se sempre à mão porque é isso que faz pensar no dinheiro; tocar num rótulo não faz.

**Início** — mostra o que sobra até ao fim do mês, e **por dia**. É esse o número que decide uma ida ao supermercado; o total do mês não decide nada.

**Mês** — todos os movimentos e para onde foi o dinheiro, por categoria.

**Mais** — as ferramentas, o método e o premium.

Não precisa de conta, não precisa de internet, e não se liga ao seu banco. Os dados ficam no seu telemóvel.

Se alguma coisa estiver confusa, diga-me qual e explico.`;
    }
  },

  /* ---------- premium ---------- */
  {
    id: 'premium',
    chaves: ['premium', 'pagar', 'preço', 'preco', 'assinatura', 'quanto custa',
             'chave', 'comprar'],
    resp() {
      return `Direto: **tudo o que precisa para gerir o mês e juntar uma reserva é grátis, e vai continuar a ser.** Cobrar isso a quem está a tentar sair de uma situação difícil seria contradizer a razão de existir disto.

O premium é **4,90 €, uma vez** — não é mensalidade. Dá acesso ao plano de 12 meses mês a mês, à comparação de caminhos, à projecção a longo prazo, e à sincronização entre telemóvel e computador.

E digo-lhe uma coisa que estas páginas nunca dizem: **se não puder pagar, escreva e a chave é sua na mesma.** Sem justificação e sem verificação nenhuma. Um projecto que existe para ajudar quem tem pouco não pode ser mais um sítio onde quem tem pouco fica de fora.`;
    }
  }
];

/* ---------- resposta por omissão ---------- */
function respostaGenerica(d) {
  const contexto = d.nMovs === 0
    ? 'Ainda não lançou nada, por isso ainda não sei nada sobre a sua situação.'
    : `Já lançou ${d.nMovs} movimentos${d.R ? `, e entra cerca de ${dinAssist(d.R)} por mês` : ''}.`;
  return `${contexto} Posso ajudar melhor se me perguntar por uma destas coisas:

· **"Não sobra nada ao fim do mês"** — o que fazer quando as contas não fecham
· **"Recebo subsídio"** — como planear com rendimento fixo
· **"Por onde começo?"** — o primeiro mês, passo a passo
· **"Quanto devo guardar?"** — a reserva, em degraus
· **"Tenho dívidas"** — a ordem certa e onde há ajuda gratuita
· **"Como ganho mais?"** — começar a vender sem dinheiro
· **"Onde invisto?"** — o que perguntar antes de assinar seja o que for

Escreva com as suas palavras. Percebo se escrever torto.`;
}

/* ---------- escolher a resposta ---------- */
function responder(texto) {
  const t = String(texto || '').toLowerCase().trim();
  const d = dadosAssistente();
  if (!t) return respostaGenerica(d);

  let melhor = null, pontosMax = 0;
  RESPOSTAS.forEach(r => {
    let pontos = 0;
    r.chaves.forEach(c => { if (t.includes(c)) pontos += c.length; });
    if (pontos > pontosMax) { pontosMax = pontos; melhor = r; }
  });

  if (!melhor) return respostaGenerica(d);
  const out = melhor.resp(d);
  return out || respostaGenerica(d);
}

/* ============================================================
   Escrever e ficar lançado

   A pessoa escreve "acabei de gastar 30 no continente" e o movimento fica
   feito. O `interpretar.js` lê a frase; aqui decide-se o que fazer com ela.

   Lança-se já, sem perguntar "é isto?". Uma confirmação a cada frase é uma
   fricção a cada frase, e a fricção é o que faz alguém deixar de lançar ao
   fim de três dias — que é o problema que isto veio resolver. Em troca, o que
   ficou lançado aparece escrito, com um botão para apagar ao lado.
   Reversível vale mais do que cauteloso.
   ============================================================ */

/* Os ids do que se lançou na última frase, para o botão de apagar saber o que
   apagar sem tocar em mais nada. */
let ultimoLote = null;

function podeLancarPorTexto() {
  return typeof temAcessoTotal === 'function' ? temAcessoTotal() : false;
}

function dinCurto(v) {
  return typeof dinheiro === 'function' ? dinheiro(v) : String(v);
}

function nomeCategoria(tipo, id) {
  if (typeof catInfo !== 'function') return id;
  const c = catInfo(tipo, id);
  return c.emoji + ' ' + c.nome;
}

/* Faz o que o leitor percebeu, e devolve o texto da resposta. */
function executarLeitura(r) {
  if (r.tipo === 'saldo') {
    if (typeof definirReservaInicial !== 'function') return null;
    definirReservaInicial(r.valor);
    ultimoLote = null;
    return 'Fica guardado que tem **' + dinCurto(r.valor) + '** de lado. Passa a contar na sua reserva.\n\n' +
           'Não lancei isto como entrada — não é dinheiro que recebeu hoje, é dinheiro que já tinha.';
  }

  if (typeof lancar !== 'function') return null;

  const criados = [];
  r.lancamentos.forEach(l => {
    const dados = {
      tipo: l.tipo, valor: l.valor, categoria: l.categoria,
      descricao: l.descricao,
      data: (typeof isoLocal === 'function') ? isoLocal(l.data) : l.data.toISOString().slice(0, 10)
    };
    if (l.parcelas >= 2 && l.tipo === 'saida' && typeof lancarParcelado === 'function') {
      lancarParcelado(dados, l.parcelas).forEach(m => criados.push(m));
    } else {
      criados.push(lancar(dados));
    }
  });

  ultimoLote = criados.map(m => m.id);
  if (typeof desenhar === 'function') desenhar();

  const linhas = r.lancamentos.map(l => {
    const sinal = l.tipo === 'entrada' ? '+' : '−';
    const parc = l.parcelas >= 2 ? ' · ' + l.parcelas + ' prestações' : '';
    return '**' + sinal + ' ' + dinCurto(l.valor) + '** · ' + nomeCategoria(l.tipo, l.categoria) +
           (l.descricao ? ' · ' + l.descricao : '') + parc;
  });

  const hoje = new Date();
  const d = r.lancamentos[0].data;
  const mesmoDia = d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() &&
                   d.getFullYear() === hoje.getFullYear();
  const quando = mesmoDia ? '' : '\n\nCom a data de ' + d.getDate() + '/' + (d.getMonth() + 1) + '.';

  return (criados.length === 1 ? 'Lançado:' : 'Lançados:') + '\n\n' + linhas.join('\n') + quando;
}

function apagarUltimoLote() {
  if (!ultimoLote || !ultimoLote.length || typeof movimentos === 'undefined') return false;
  const ids = {};
  ultimoLote.forEach(id => { ids[id] = true; });
  const antes = movimentos.length;
  movimentos = movimentos.filter(m => !ids[m.id]);
  if (movimentos.length === antes) return false;
  if (typeof guardar === 'function') guardar();
  if (typeof desenhar === 'function') desenhar();
  ultimoLote = null;
  return true;
}

/* ---------- desenhar o chat ---------- */
function assistMarkdown(txt) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(txt)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .split('\n\n').map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

function bolha(texto, de) {
  const li = document.createElement('div');
  li.className = 'msg ' + de;
  if (de === 'ele') {
    li.innerHTML = '<div class="msg-av"><img src="' + (typeof raizDoSite === 'function' ? raizDoSite() : '../') +
                   'img/wesley.jpg" alt="" onerror="this.replaceWith(document.createTextNode(\'WV\'))"></div>' +
                   '<div class="msg-txt">' + assistMarkdown(texto) + '</div>';
  } else {
    li.innerHTML = '<div class="msg-txt">' + assistMarkdown(texto) + '</div>';
  }
  return li;
}

document.addEventListener('DOMContentLoaded', () => {
  const fio = document.getElementById('assist-fio');
  const form = document.getElementById('assist-form');
  const campo = document.getElementById('assist-campo');
  if (!fio || !form || !campo) return;

  function juntar(texto, de) {
    fio.appendChild(bolha(texto, de));
    fio.scrollTop = fio.scrollHeight;
  }

  // Abertura: quem é, o que faz, e o que já sabe sobre quem pergunta.
  const d = dadosAssistente();
  juntar(`Sou o **Wesley Vianna**, fundador da Vida Financeira. Comecei sem nada e construí o que tenho a partir de negócios pequenos — por isso não lhe vou dar conselhos que nunca tive de aplicar a mim próprio.

${d.nMovs > 0 ? `Já vi os seus números: ${d.R ? `entra cerca de ${dinAssist(d.R)} por mês` : `${d.nMovs} movimentos lançados`}. Posso responder com base neles.` : 'Ainda não lançou nada, mas posso responder na mesma — e depois de lançar um mês, respondo com os seus números.'}

Pergunte à vontade.`, 'ele');

  /* Uma resposta com um botão por baixo. Só o de apagar precisa disto, e não
     valia um sistema de botões para um caso — mas vale um sítio só. */
  function juntarComAccao(texto, rotulo, aoClicar) {
    const li = bolha(texto, 'ele');
    const zona = li.querySelector('.msg-txt');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg-accao';
    b.textContent = rotulo;
    b.addEventListener('click', () => {
      if (aoClicar()) {
        b.disabled = true;
        b.textContent = 'Apagado';
      }
    });
    zona.appendChild(b);
    fio.appendChild(li);
    fio.scrollTop = fio.scrollHeight;
  }

  function tratar(t) {
    /* Primeiro tenta ler-se como movimento. Só se não for é que segue para as
       respostas escritas — assim "gastei 30 no continente" nunca é confundido
       com uma pergunta sobre mercearia. */
    const r = (typeof interpretar === 'function') ? interpretar(t) : { ok: false };

    if (r.ok) {
      if (!podeLancarPorTexto()) {
        juntar('Percebi o que escreveu — e é isto que a **Vida Financeira** faz por si: ' +
          'escreve, e fica lançado.\n\n' +
          '**Crie conta e tem um mês inteiro, de graça.** Sem cartão, sem nada. ' +
          'Depois desse mês, são 9,89 € por ano.\n\n' +
          'Enquanto isso pode lançar à mão no ➕ Lançar, que é grátis para sempre.', 'ele');
        return;
      }
      const resposta = executarLeitura(r);
      if (resposta) {
        if (r.tipo === 'saldo') juntar(resposta, 'ele');
        else juntarComAccao(resposta, 'Apagar isto', apagarUltimoLote);
        return;
      }
    }

    juntar(responder(t), 'ele');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = campo.value.trim();
    if (!t) return;
    juntar(t, 'eu');
    campo.value = '';
    setTimeout(() => tratar(t), 340);
  });

  document.querySelectorAll('.assist-sug').forEach(b => {
    b.addEventListener('click', () => {
      juntar(b.textContent, 'eu');
      setTimeout(() => juntar(responder(b.dataset.q || b.textContent), 'ele'), 340);
    });
  });
});
