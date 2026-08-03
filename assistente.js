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

/* O dinheiro escreve-se à maneira de quem está a ler. O valor é o mesmo e a
   moeda é a mesma; muda a pontuação — `1.500,00 €` e `€1,500.00` são o mesmo
   número, e cada um deles é ilegível a quem não cresceu com ele. */
const LOCAIS = { pt: 'pt-PT', br: 'pt-BR', es: 'es-ES', en: 'en-GB' };

function dinAssist(v, l) {
  const d = dadosAssistente();
  const local = LOCAIS[l || (typeof idioma === 'function' ? idioma() : 'pt')] || 'pt-PT';
  return new Intl.NumberFormat(local, {
    style: 'currency', currency: d.moeda, minimumFractionDigits: 2
  }).format(isFinite(v) ? v : 0);
}

/* ============================================================
   O banco de respostas

   Cada entrada: palavras que a fazem disparar, e uma função que devolve o
   texto já com os números da pessoa. Devolver `null` significa "esta não
   serve para o estado actual", e a seguinte é tentada.

   ---- As palavras são das quatro línguas, na mesma lista ----

   Não há uma lista por língua, e não é preguiça. Quem escreve "no me sobra
   nada" e quem escreve "there's nothing left" está a fazer a mesma pergunta,
   e quem emigrou escreve metade numa língua e metade noutra sem dar por isso
   — "não sobra nothing at the end do mês" é uma frase real. Uma lista só
   apanha-as a todas; listas separadas obrigariam a acertar primeiro na língua
   para depois acertar na pergunta, e errar a primeira estragava a segunda.

   ---- O texto vem do `respostas.js` ----

   Aqui fica a decisão — qual das respostas serve, e com que números. As
   palavras estão no `respostas.js`, nas quatro línguas. É a mesma divisão do
   resto da aplicação: a lógica num sítio, o que se diz noutro, e nunca as
   duas coisas na mesma linha.
   ============================================================ */
const RESPOSTAS = [

  /* ---------- não sobra nada ---------- */
  {
    id: 'sem-folga',
    chaves: ['não sobra', 'nao sobra', 'não consigo poupar', 'nao consigo poupar',
             'não tenho dinheiro', 'nao tenho dinheiro', 'não dá', 'nao da',
             'estou apertado', 'no vermelho', 'não chega', 'nao chega',
             'no sobra', 'no me sobra', 'no llego', 'no me llega', 'no consigo ahorrar',
             'no tengo dinero', 'estoy apretado', 'no alcanza',
             'nothing left', 'no money left', 'cannot save', "can't save",
             'not enough', 'broke', 'skint', 'end of the month'],
    resp(d, l) {
      const base = d.aperto === true
        ? T('resp.semfolga.contas', { R: dinAssist(d.R, l), E: dinAssist(d.E, l) }, l)
        : '';
      return base + T('resp.semfolga', { v80: dinAssist(80, l) }, l);
    }
  },

  /* ---------- subsídios e apoios ---------- */
  {
    id: 'subsidios',
    chaves: ['subsídio', 'subsidio', 'rsi', 'rendimento social', 'apoio', 'apoios',
             'abono', 'bolsa família', 'bolsa familia', 'segurança social',
             'seguranca social', 'estado', 'ajuda do governo', 'benefício', 'beneficio',
             'bpc', 'auxílio', 'auxilio', 'inss',
             'ayuda', 'ayudas', 'subsidio por desempleo', 'paro', 'ingreso mínimo',
             'ingreso minimo', 'imv', 'seguridad social', 'prestación', 'prestacion',
             'benefit', 'benefits', 'universal credit', 'welfare', 'food stamps',
             'social security', 'disability'],
    resp(d, l) {
      return T('resp.subsidios', { v5: dinAssist(5, l) }, l);
    }
  },

  /* ---------- como começar do zero ---------- */
  {
    id: 'comecar',
    chaves: ['começar', 'comecar', 'por onde', 'primeiro passo', 'do zero',
             'não sei por onde', 'nao sei por onde', 'ajuda', 'mudar de vida',
             'sair da pobreza', 'melhorar de vida',
             'empezar', 'por dónde', 'por donde', 'primer paso', 'desde cero',
             'no sé por dónde', 'no se por donde', 'cambiar de vida',
             'start', 'where do i start', 'first step', 'from scratch',
             'get started', 'turn my life around', 'help me'],
    resp(d, l) {
      if (d.nMovs === 0) return T('resp.comecar.zero', { v10: dinAssist(10, l) }, l);
      if (d.aperto === true) return RESPOSTAS[0].resp(d, l);
      const alvo = d.E ? d.E * 3 : null;
      return T('resp.comecar.andamento', {
        n: d.nMovs,
        folga: dinAssist(d.folga, l),
        metade: dinAssist(d.folga / 2, l),
        alvo: alvo ? dinAssist(alvo, l) : T('resp.comecar.alvovago', null, l),
        meses: alvo ? Math.ceil(alvo / (d.folga / 2)) : '—'
      }, l);
    }
  },

  /* ---------- reserva ---------- */
  {
    id: 'reserva',
    chaves: ['reserva', 'emergência', 'emergencia', 'poupança', 'poupanca',
             'quanto guardar', 'quanto poupar', 'juntar dinheiro',
             'colchón', 'colchon', 'ahorro', 'ahorros', 'ahorrar',
             'cuánto guardar', 'cuanto guardar', 'fondo de emergencia',
             'emergency fund', 'savings', 'buffer', 'rainy day',
             'how much should i save', 'set aside'],
    resp(d, l) {
      if (!d.E) return T('resp.reserva.semessencial', {
        v1000: dinAssist(1000, l), v500: dinAssist(500, l), v1100: dinAssist(1100, l)
      }, l);
      const m = d.mesesReserva || 0;
      const estado = m >= 3 ? T('resp.reserva.feita', { m: m.toFixed(1) }, l)
                   : m >= 1 ? T('resp.reserva.um', { m: m.toFixed(1) }, l)
                   : m > 0  ? T('resp.reserva.pouco', { m: m.toFixed(1) }, l)
                            : T('resp.reserva.zero', null, l);
      return T('resp.reserva', {
        E: dinAssist(d.E, l), estado: estado,
        semana: dinAssist(d.E / 4, l), mes: dinAssist(d.E, l), tres: dinAssist(d.E * 3, l)
      }, l);
    }
  },

  /* ---------- dívidas e cartão ---------- */
  {
    id: 'dividas',
    chaves: ['dívida', 'divida', 'dividas', 'dívidas', 'cartão', 'cartao',
             'crédito', 'credito', 'prestação', 'prestacao', 'parcelar',
             'devo', 'juros', 'rotativo', 'empréstimo', 'emprestimo',
             'cheque especial', 'nome sujo', 'serasa', 'negativado',
             'deuda', 'deudas', 'tarjeta', 'préstamo', 'prestamo', 'cuota',
             'intereses', 'debo', 'asnef',
             'debt', 'debts', 'credit card', 'loan', 'owe', 'interest',
             'overdraft', 'instalments', 'installments', 'repayments'],
    resp(d, l) {
      const nota = d.temParcelas ? T('resp.dividas.nota', null, l) : '';
      return T('resp.dividas', { nota: nota }, l);
    }
  },

  /* ---------- ganhar mais / negócio ---------- */
  {
    id: 'rendimento',
    chaves: ['ganhar mais', 'aumentar', 'negócio', 'negocio', 'vender',
             'trabalhar por conta', 'empreender', 'empresa', 'freelancer',
             'segundo emprego', 'renda extra', 'trabalho extra', 'comércio', 'comercio',
             'bico', 'autônomo', 'autonomo',
             'ganar más', 'ganar mas', 'ingresos extra', 'emprender', 'autónomo',
             'segundo trabajo', 'montar un negocio',
             'earn more', 'make more money', 'side job', 'side hustle',
             'second job', 'start a business', 'self-employed', 'sell'],
    resp(d, l) {
      return T('resp.rendimento', { v200: dinAssist(200, l) }, l);
    }
  },

  /* ---------- investir ---------- */
  {
    id: 'investir',
    chaves: ['investir', 'investimento', 'invisto', 'invista', 'aplicar', 'render',
             'bolsa', 'ações', 'acoes', 'cripto', 'onde ponho', 'fundo', 'tesouro',
             'invertir', 'inversión', 'inversion', 'invierto', 'acciones',
             'dónde pongo', 'donde pongo', 'renta fija', 'fondo indexado',
             'invest', 'investing', 'stocks', 'shares', 'crypto', 'index fund',
             'where should i put', 'isa', 'pension'],
    resp(d, l) {
      const antes = (d.mesesReserva !== null && d.mesesReserva < 3)
        ? T('resp.investir.antes', { m: (d.mesesReserva || 0).toFixed(1) }, l) : '';
      return antes + T('resp.investir', null, l);
    }
  },

  /* ---------- o que a app faz ---------- */
  {
    id: 'app',
    chaves: ['como funciona', 'o que faz', 'para que serve', 'não percebo',
             'nao percebo', 'como uso', 'como usar', 'preencher',
             'cómo funciona', 'como funciona esto', 'para qué sirve', 'para que sirve',
             'no entiendo', 'cómo se usa', 'como se usa',
             'how does this work', 'how do i use', 'what does this do',
             "don't understand", 'what is this app'],
    resp(d, l) {
      return T('resp.app', null, l);
    }
  },

  /* ---------- premium ---------- */
  {
    id: 'premium',
    chaves: ['premium', 'pagar', 'preço', 'preco', 'assinatura', 'quanto custa',
             'chave', 'comprar',
             'precio', 'cuánto cuesta', 'cuanto cuesta', 'suscripción', 'suscripcion',
             'clave', 'pago', 'es gratis', 'gratis',
             'price', 'does it cost', 'does this cost', 'subscription', 'pay for',
             'buy', 'free', 'is it free'],
    resp(d, l) {
      return T('resp.premium', null, l);
    }
  }
];

/* ---------- resposta por omissão ---------- */
function respostaGenerica(d, l) {
  const contexto = d.nMovs === 0
    ? T('resp.generica.zero', null, l)
    : T('resp.generica.jalancou', {
        n: d.nMovs,
        comR: d.R ? T('resp.generica.comR', { R: dinAssist(d.R, l) }, l) : ''
      }, l);
  return T('resp.generica', { contexto: contexto }, l);
}

/* ---------- escolher a resposta ---------- */
function responder(texto) {
  /* Nome curto que nao pode ser `t`: essa e' a funcao que traz as frases
     traduzidas, e uma variavel local com o mesmo nome tapava-a. */
  const q = String(texto || '').toLowerCase().trim();
  const d = dadosAssistente();

  /* A língua é a da conversa, que o `fixarLingua` já decidiu a partir da
     mensagem — e não a da aplicação. Quem tem o telemóvel em português e
     escreve em espanhol recebe espanhol de volta. Usa-se o `L()` e não a
     mensagem directamente porque uma resposta longa vem muitas vezes a seguir
     a um "sim", e "sim" não tem língua nenhuma. */
  const l = L();

  if (!q) return respostaGenerica(d, l);

  let melhor = null, pontosMax = 0;
  RESPOSTAS.forEach(r => {
    let pontos = 0;
    r.chaves.forEach(c => { if (q.includes(c)) pontos += c.length; });
    if (pontos > pontosMax) { pontosMax = pontos; melhor = r; }
  });

  if (!melhor) return respostaGenerica(d, l);
  const out = melhor.resp(d, l);
  return out || respostaGenerica(d, l);
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

/* O nome da categoria na língua da conversa. Sem isto ficava "Added: − 30,00 €
   · 📦 Outros" — metade inglês, metade português, dentro da mesma linha. */
function nomeCategoria(tipo, id) {
  if (typeof catInfo !== 'function') return id;
  const c = catInfo(tipo, id);
  const traduzido = (typeof T === 'function') ? T('cat.' + id, null, L()) : null;
  return c.emoji + ' ' + (traduzido && traduzido !== 'cat.' + id ? traduzido : c.nome);
}

/* Faz o que o leitor percebeu, e devolve o texto da resposta. */
/* ------------------------------------------------------------
   A língua desta conversa

   Responde-se na língua da mensagem, não na da aplicação. Quem tem o
   telemóvel em português mas escreve em espanhol recebe espanhol de volta —
   e é isso que faz a diferença entre uma app que percebe e uma app que fala
   consigo.

   Fica guardada entre mensagens porque uma resposta longa vem muitas vezes
   depois de um "sim" ou de um toque num botão, e "sim" não tem língua. */
let linguaDaConversa = null;

function L() {
  return linguaDaConversa || (typeof idioma === 'function' ? idioma() : 'pt');
}

function t(chave, vars) {
  return (typeof T === 'function') ? T(chave, vars, L()) : chave;
}

function fixarLingua(texto) {
  if (typeof idiomaDaMensagem !== 'function') return;
  /* Mensagens de duas ou três palavras não chegam para decidir uma língua —
     e trocar de língua a meio de uma conversa por causa de um "ok" é pior do
     que ficar na anterior. */
  if (String(texto || '').trim().split(/\s+/).length < 3 && linguaDaConversa) return;
  linguaDaConversa = idiomaDaMensagem(texto);
}

function executarLeitura(r) {
  if (r.tipo === 'saldo') {
    ultimoLote = null;

    /* "de lado", "guardado", "na poupança", "de emergência" — dinheiro
       parado. É a carteira de emergência, que é o mesmo que a app sempre
       chamou reserva. */
    if (r.onde === 'reserva') {
      if (typeof definirReservaInicial !== 'function') return null;
      definirReservaInicial(r.valor);
      return t('chat.reservaposta', { v: dinCurto(r.valor) }) + '\n\n' + t('chat.reservaexplica');
    }

    /* "no banco", "na conta", ou sem dizer onde: é o dinheiro de viver, e
       quem trata disso é o `dizerSaldoDaConta`, lá em baixo — porque dizer o
       saldo e corrigir o saldo são a mesma coisa e não podem ter dois
       caminhos. Aqui devolve-se null para o chat seguir por lá. */
    return null;
  }

  if (typeof lancar !== 'function') return null;

  const criados = [];
  r.lancamentos.forEach(l => {
    const dados = {
      tipo: l.tipo, valor: l.valor, categoria: l.categoria,
      descricao: l.descricao,
      conta: l.conta || 'minha',
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
  const quando = mesmoDia ? '' : '\n\n' + t('chat.comdata', { d: d.getDate() + '/' + (d.getMonth() + 1) });

  return (criados.length === 1 ? t('chat.lancado') : t('chat.lancados')) + '\n\n' + linhas.join('\n') + quando;
}

/* ------------------------------------------------------------
   O mal-entendido que custou mais caro

   O número grande do Início chama-se "Livre até ao fim do mês" e é uma
   diferença: entrou menos saiu. Num mês em que se lançaram gastos e ainda não
   entrou o ordenado, é negativo — e está certo que seja.

   Só que quem o lê não lê "diferença": lê "eu tenho menos quinhentos". Depois
   diz à app quanto tem no banco, o número não muda, e a conclusão é que a
   ferramenta não percebeu nada. Não era desatenção de ninguém: eram dois
   números verdadeiros e nenhuma frase a explicar que falavam de coisas
   diferentes.

   Esta é a frase. Aparece quando o mês está negativo, e uma vez só — repeti-la
   a cada mensagem era outra maneira de não estar a ouvir.
   ------------------------------------------------------------ */
let jaExpliqueiONegativo = false;

function mesEstaNegativo() {
  if (typeof calcular !== 'function') return false;
  try {
    const r = calcular();
    return !!(r && r.mesVisivel && !r.mesVisivel.vazio && r.mesVisivel.livre < 0);
  } catch (e) { return false; }
}

function avisoDoNegativo() {
  if (jaExpliqueiONegativo || !mesEstaNegativo()) return '';
  jaExpliqueiONegativo = true;
  return '\n\n' + t('chat.avisonegativo');
}

function explicarONegativo() {
  jaExpliqueiONegativo = true;
  const agora = (typeof saldoAgora === 'function') ? saldoAgora() : null;
  let txt = t('chat.negativotitulo') + '\n\n' + t('chat.negativoexplica');
  txt += '\n\n' + (agora !== null
    ? t('chat.negativotem', { v: dinCurto(agora) })
    : t('chat.negativopede'));
  return txt;
}

/* ============================================================
   A fotografia do talão

   Durante muito tempo esta parte da aplicação dizia, com todas as letras, que
   não sabia ler o talão — e a razão era boa: os serviços que lêem imagens
   cobram e exigem uma chave secreta, e num site que é só ficheiros essa chave
   ficava à vista de toda a gente.

   Agora lê. Não por um serviço, mas por um motor que corre dentro do próprio
   telemóvel (ver `talao.js`). Isso muda a promessa em dois pontos que importam
   a quem usa isto: a fotografia do talão — que mostra onde a pessoa anda, a
   que horas e com que cartão paga — continua a não sair do aparelho; e os
   quatro megabytes do motor só são descarregados quando alguém manda ler um
   talão, depois de lhe ser dito quanto é.

   O que sai do OCR nunca é lançado às escondidas. É mostrado — o valor, a
   loja, o dia — e é a pessoa que carrega em "Sim, lança". Um número errado
   metido sozinho nas contas de alguém é a forma mais rápida de essa pessoa
   deixar de confiar no caderno todo.

   As fotografias ficam à parte dos movimentos e nunca sobem para a nuvem:
   são o que ocupa espaço a sério, e o dono do telemóvel não pediu para as
   guardar em lado nenhum.
   ============================================================ */
const FOTOS_CHAVE = 'vf:fotos';
const FOTOS_MAX = 20;
let fotoEmEspera = null;

function lerFotos() {
  try {
    const f = JSON.parse(localStorage.getItem(FOTOS_CHAVE) || '{}');
    return (f && typeof f === 'object') ? f : {};
  } catch (e) { return {}; }
}

function guardarFoto(idMovimento, dataUrl) {
  const fotos = lerFotos();
  fotos[idMovimento] = dataUrl;

  /* Vinte é o tecto. O armazenamento do navegador anda pelos cinco megabytes
     e é partilhado com os movimentos — deixar as fotografias crescerem sem
     limite acabava com a aplicação a não conseguir gravar um lançamento, que
     é a coisa que ela não pode falhar. */
  const chaves = Object.keys(fotos);
  if (chaves.length > FOTOS_MAX) chaves.slice(0, chaves.length - FOTOS_MAX).forEach(k => delete fotos[k]);

  try { localStorage.setItem(FOTOS_CHAVE, JSON.stringify(fotos)); }
  catch (e) {
    /* Sem espaço: a fotografia perde-se, o movimento não. */
    try { localStorage.removeItem(FOTOS_CHAVE); } catch (e2) {}
    return false;
  }
  return true;
}

/* Encolher antes de guardar. Uma fotografia de telemóvel são três ou quatro
   megabytes; a 640 pixéis de largura e qualidade média fica em dezenas de
   kilobytes e continua a dar para ler um talão com os olhos. */
function encolherImagem(ficheiro) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('não foi possível ler o ficheiro'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('isso não parece uma imagem'));
      img.onload = () => {
        const max = 640;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.6));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(ficheiro);
  });
}

/* A fotografia por inteiro, para ler. A `encolherImagem` corta para 640px, que
   serve para ver e não serve para ler; aqui não se corta nada e é o `talao.js`
   que decide o tamanho de leitura. */
function imagemGrande(ficheiro) {
  return new Promise((feito, falhou) => {
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error('nao-leu'));
    leitor.onload = () => feito(leitor.result);
    leitor.readAsDataURL(ficheiro);
  });
}

function leitorJaCa() {
  return typeof ocrJaDescarregado === 'function' && ocrJaDescarregado();
}

/* '2026-08-03' → uma data local. Sem isto, o `new Date('2026-08-03')` do
   navegador lê a cadeia como UTC e, a oeste de Greenwich, um talão do dia 3
   ficava lançado no dia 2. */
function dataDoDia(iso) {
  const p = String(iso).split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

const MESES_TALAO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function diaPorExtenso(iso) {
  const d = dataDoDia(iso);
  return d.getDate() + ' de ' + MESES_TALAO[d.getMonth()];
}

function ehHoje(iso) {
  const d = dataDoDia(iso), h = new Date();
  return d.getDate() === h.getDate() && d.getMonth() === h.getMonth() &&
         d.getFullYear() === h.getFullYear();
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
  /* A abertura segue a língua da aplicação e não a de uma mensagem: ainda não
     houve mensagem nenhuma. É a primeira coisa que se lê aqui dentro, e era
     das últimas que ainda só sabia dizer-se em português. */
  const numeros = d.nMovs === 0
    ? t('abertura.semnumeros')
    : t('abertura.comnumeros', {
        quais: d.R ? t('abertura.entra', { R: dinAssist(d.R, L()) })
                   : t('abertura.movimentos', { n: d.nMovs })
      });
  juntar(t('abertura', { numeros: numeros }), 'ele');

  /* Uma resposta com botões por baixo. Nasceu para o "Apagar isto" e passou a
     servir também o talão lido, que precisa de um sim e de um não. Quem
     carrega decide o que acontece à bolha: devolver uma frase substitui o
     texto, devolver `true` desactiva os botões, devolver nada deixa tudo. */
  function juntarBotoes(texto, botoes) {
    const li = bolha(texto, 'ele');
    const zona = li.querySelector('.msg-txt');
    const fila = document.createElement('div');
    fila.className = 'msg-accoes';
    zona.appendChild(fila);

    botoes.forEach(cfg => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'msg-accao' + (cfg.tom === 'sim' ? ' msg-accao-sim' : '');
      b.textContent = cfg.rotulo;
      b.addEventListener('click', () => {
        const r = cfg.aoClicar(li);
        if (r === false) return;
        Array.prototype.forEach.call(zona.querySelectorAll('.msg-accao'), x => { x.disabled = true; });
        if (typeof r === 'string') b.textContent = r;
      });
      fila.appendChild(b);
    });

    fio.appendChild(li);
    fio.scrollTop = fio.scrollHeight;
    return li;
  }

  function juntarComAccao(texto, rotulo, aoClicar) {
    juntarBotoes(texto, [{ rotulo: rotulo, aoClicar: () => aoClicar() ? t('chat.apagado') : false }]);
  }

  /* Uma bolha que se reescreve no lugar. Quatro megabytes numa rede fraca são
     um minuto de ecrã quieto, e um ecrã quieto parece avariado — isto é o que
     mostra que a coisa está viva sem encher o fio de mensagens. */
  function juntarVivo(texto) {
    const li = bolha(texto, 'ele');
    fio.appendChild(li);
    fio.scrollTop = fio.scrollHeight;
    const zona = li.querySelector('.msg-txt');
    return {
      escrever(t) { zona.innerHTML = assistMarkdown(t); fio.scrollTop = fio.scrollHeight; },
      apagar() { li.remove(); }
    };
  }

  /* ---------- corrigir, reclamar, perguntar quanto se tem ----------

     Isto vem ANTES de se tentar ler um movimento, e a ordem é deliberada.
     "o último gasto foi 50, não 500" tem a palavra "gasto" lá dentro; lida
     como movimento, lançava-se uma despesa nova de 50 em vez de se corrigir a
     de 500. Quem escreve "corrige", "errei" ou "não é isso" está a falar do
     que já lá está, e essas palavras não aparecem em quem está só a lançar. */
  function tratarPedido(pedido) {
    if (pedido.pedido === 'saldo-quanto') {
      const vivas = (typeof CARTEIRAS !== 'undefined')
        ? CARTEIRAS.filter(id => carteiras[id]) : [];
      if (!vivas.length) {
        juntar(t('chat.naosei') + '\n\n' + t('chat.digameonumero'), 'ele');
        return true;
      }
      if (vivas.length === 1) {
        juntar(t('chat.temna', { v: dinCurto(saldoDaCarteira(vivas[0])),
          onde: nomeDaCarteira(vivas[0], L()).toLowerCase() }) + avisoDoNegativo(), 'ele');
        return true;
      }
      const linhas = vivas.map(id => '· ' + nomeDaCarteira(id, L()) + ': **' +
        dinCurto(saldoDaCarteira(id)) + '**');
      juntar(t('chat.aotodo', { v: dinCurto(saldoDeTudo()) }) + '\n\n' + linhas.join('\n') +
        (dividaTotal && dividaTotal.valor > 0
          ? '\n\n' + t('chat.edevem', { v: dinCurto(dividaTotal.valor) }) : '') +
        avisoDoNegativo(), 'ele');
      return true;
    }

    if (pedido.pedido === 'queixa-saldo') { juntar(explicarONegativo(), 'ele'); return true; }

    if (pedido.pedido === 'queixa') {
      juntar(t('chat.oquestaerrado') + '\n\n' + t('chat.comodizer'), 'ele');
      return true;
    }

    /* Explicar é grátis; mudar os números é que faz parte da assinatura.
       Dizer a alguém "aquele vermelho não é uma dívida" e cobrar por isso
       seria mesquinho. */
    if (!podeLancarPorTexto()) {
      juntar(t('chat.corrigirsemconta') + '\n\n' + t('chat.semcontames'), 'ele');
      return true;
    }

    if (pedido.pedido === 'corrigir-ultimo') { corrigirUltimo(pedido.valor); return true; }
    if (pedido.pedido === 'corrigir-saldo') { corrigirSaldo(pedido); return true; }
    return false;
  }

  function corrigirUltimo(valor) {
    if (typeof movimentos === 'undefined' || !movimentos.length) {
      juntar(t('chat.semlancamento'), 'ele');
      return;
    }
    const m = movimentos[movimentos.length - 1];
    const antes = m.valor;
    if (Math.abs(antes - valor) < 0.005) {
      juntar(t('chat.jaesta', { v: dinCurto(valor) }), 'ele');
      return;
    }
    m.valor = Math.round(valor * 100) / 100;
    if (typeof guardar === 'function') guardar();
    if (typeof desenhar === 'function') desenhar();
    juntar(t('chat.corrigidoult', { a: dinCurto(antes), b: dinCurto(m.valor),
      desc: m.descricao ? ' · ' + m.descricao : '' }), 'ele');
  }

  /* Dizer o saldo certo é sempre aceite. O que muda é o que se faz com a
     diferença: da primeira vez não há diferença nenhuma a explicar — é o
     ponto de partida. Havendo já um saldo conhecido e o novo não bater com
     ele, a diferença é dinheiro que se moveu sem ninguém ter lançado, e a app
     PERGUNTA se quer que fique registado. Nunca inventa o lançamento
     sozinha: é dinheiro na conta de alguém. */
  function corrigirSaldo(pedido) {
    if (pedido.onde === 'reserva' && typeof definirReservaInicial === 'function') {
      definirReservaInicial(pedido.valor);
      juntar(t('chat.reservaposta', { v: dinCurto(pedido.valor) }), 'ele');
      return;
    }
    dizerSaldoDaConta(pedido.valor);
  }

  /* Uma porta só para o saldo da conta, venha ela de "tenho 1000 no banco" ou
     de "corrige para 1000". São a mesma frase dita de duas maneiras, e ter
     dois caminhos era o que fazia a app oferecer o acerto num caso e ficar
     calada no outro. */
  function dizerSaldoDaConta(novo, qual) {
    if (typeof definirCarteira !== 'function') { juntar(explicarONegativo(), 'ele'); return; }
    const id = (qual === 'parceiro' || qual === 'emergencia') ? qual : 'minha';
    const como = (typeof nomeDaCarteira === 'function')
      ? nomeDaCarteira(id, L()).toLowerCase() : t('inicio.naconta').toLowerCase();

    const antes = (typeof saldoDaCarteira === 'function') ? saldoDaCarteira(id) : null;
    definirCarteira(id, novo);

    if (antes === null) {
      juntar(t('chat.saldoposto', { v: dinCurto(novo), onde: como }) + '\n\n' +
        t('chat.saldoexplica') + avisoDoNegativo(), 'ele');
      return;
    }

    const dif = Math.round((novo - antes) * 100) / 100;
    if (Math.abs(dif) < 0.005) {
      juntar(t('chat.jaestava', { v: dinCurto(novo) }), 'ele');
      return;
    }

    const falta = dif > 0;
    juntar(t('chat.corrigido', { a: dinCurto(antes), b: dinCurto(novo), onde: como }), 'ele');

    juntarBotoes(t('chat.diferenca', { v: dinCurto(Math.abs(dif)),
        qual: falta ? t('chat.entrou') : t('chat.saiu') }) + '\n\n' + t('chat.registar'),
      [
        { rotulo: t('chat.simregista'), tom: 'sim',
          aoClicar: () => { lancarAcerto(dif, id); return t('chat.registado'); } },
        { rotulo: t('chat.naodeixa'), aoClicar: () => {
            juntar(t('chat.sosaldo'), 'ele');
            return t('chat.ficoucomoestava');
          } }
      ]);
  }

  function lancarAcerto(dif, id) {
    if (typeof lancar !== 'function') return;
    /* O acerto é lançado com a data de hoje e não muda o saldo da conta: esse
       já é o número certo, foi a pessoa que o disse. Por isso o movimento
       nasce com a hora de ANTES da declaração — senão o `saldoAgora()`
       somava-o outra vez e o saldo afastava-se do que ela acabou de dizer. */
    const m = lancar({
      tipo: dif > 0 ? 'entrada' : 'saida',
      valor: Math.abs(dif),
      categoria: 'acerto',
      conta: id || 'minha',
      descricao: 'Acerto de saldo',
      /* Data em texto, como todos os outros movimentos. Passar aqui um
         `Date` fazia a app rebentar mais tarde, na altura de a desenhar. */
      data: (typeof isoLocal === 'function') ? isoLocal(new Date())
                                             : new Date().toISOString().slice(0, 10)
    });
    const c = (typeof carteiras !== 'undefined') ? carteiras[id || 'minha'] : null;
    if (c) m.criado = c.em - 1;
    if (typeof guardar === 'function') guardar();
    if (typeof desenhar === 'function') desenhar();
    ultimoLote = [m.id];
    juntarComAccao(
      t('chat.acertofeito', { s: dif > 0 ? '+' : '−', v: dinCurto(Math.abs(dif)) }) + '\n\n' +
      t('chat.acertosaldo', {
        v: dinCurto((typeof saldoDaCarteira === 'function' ? saldoDaCarteira(id || 'minha') : 0)) }),
      t('chat.apagar'), apagarUltimoLote);
  }

  function tratar(escrito) {
    /* Um pedido sobre o que já lá está manda em tudo o resto. */
    const pedido = (typeof entenderPedido === 'function') ? entenderPedido(escrito) : null;
    if (pedido && tratarPedido(pedido)) return;

    /* Depois tenta ler-se como movimento. Só se não for é que segue para as
       respostas escritas — assim "gastei 30 no continente" nunca é confundido
       com uma pergunta sobre mercearia. */
    const r = (typeof interpretar === 'function') ? interpretar(escrito) : { ok: false };

    if (r.ok) {
      if (!podeLancarPorTexto()) {
        juntar(t('chat.semconta') + '\n\n' + t('chat.semcontames') + '\n\n' +
          t('chat.semcontamao'), 'ele');
        return;
      }
      if (r.tipo === 'saldo' && r.onde !== 'reserva') { dizerSaldoDaConta(r.valor, r.conta); return; }

      const resposta = executarLeitura(r);
      if (resposta) {
        if (r.tipo === 'saldo') { juntar(resposta, 'ele'); return; }

        /* A fotografia que estava à espera agarra-se ao primeiro movimento
           deste lote — é o que a pessoa acabou de fotografar. */
        let comFoto = '';
        if (fotoEmEspera && ultimoLote && ultimoLote.length) {
          comFoto = '\n\n' + (guardarFoto(ultimoLote[0], fotoEmEspera)
            ? t('chat.comfoto') : t('chat.semfoto'));
          limparFotoEmEspera();
        }
        juntarComAccao(resposta + comFoto, t('chat.apagar'), apagarUltimoLote);
        return;
      }
    }

    /* A calculadora vem antes das respostas escritas: quem pergunta
       "12x de 45,90 ou 480 a pronto?" quer o número, não um texto sobre
       crédito. É grátis — fazer uma conta a alguém não se cobra. */
    const c = (typeof calculadora === 'function') ? calculadora(escrito) : { ok: false };
    if (c.ok) { juntar(c.resposta, 'ele'); return; }

    /* As respostas escritas são o último passo grátis. Havendo IA ligada, e
       só se a resposta escrita for a genérica — a que diz "não percebi bem" —
       vale a pena perguntar a alguém que perceba. Enquanto não houver
       servidor, o `iaPerguntar` devolve `null` de imediato e isto não muda
       coisa nenhuma. */
    const escrita = responder(escrito);
    if (typeof iaLigada !== 'function' || !iaLigada()) { juntar(escrita, 'ele'); return; }

    const vivo = juntarVivo('…');
    iaPerguntar(escrito).then(resp => {
      vivo.apagar();
      juntar(resp || escrita, 'ele');
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const escrito = campo.value.trim();
    if (!escrito) return;
    fixarLingua(escrito);
    juntar(escrito, 'eu');
    campo.value = '';
    setTimeout(() => tratar(escrito), 340);
  });

  /* ---------- a fotografia ---------- */
  const zonaFoto = document.getElementById('foto-espera');
  const vistaFoto = document.getElementById('foto-vista');
  const campoFicheiro = document.getElementById('assist-ficheiro');

  window.limparFotoEmEspera = function () {
    fotoEmEspera = null;
    if (zonaFoto) zonaFoto.hidden = true;
    if (vistaFoto) vistaFoto.removeAttribute('src');
    if (campoFicheiro) campoFicheiro.value = '';
  };

  if (campoFicheiro) {
    campoFicheiro.addEventListener('change', async () => {
      const f = campoFicheiro.files && campoFicheiro.files[0];
      if (!f) return;
      if (!podeLancarPorTexto()) {
        campoFicheiro.value = '';
        juntar(t('talao.assinatura') + '\n\n' + t('chat.semcontames'), 'ele');
        return;
      }
      try {
        fotoEmEspera = await encolherImagem(f);
        if (vistaFoto) vistaFoto.src = fotoEmEspera;
        if (zonaFoto) zonaFoto.hidden = false;

        /* A imagem grande, para ler. A que se guarda é a pequena — 640px
           chegam para a ver, mas não chegam para a ler. */
        const paraLer = await imagemGrande(f);

        if (typeof ocrPodeCorrer !== 'function' || !ocrPodeCorrer()) {
          juntar(t('talao.semmotor'), 'ele');
          return;
        }

        /* Se o motor já cá está — já foi usado antes — não se pergunta nada:
           perguntar por perguntar é uma barreira a mais para quem só quer
           lançar um gasto. A pergunta existe por causa dos megabytes, e da
           segunda vez já não há megabytes nenhuns. */
        if (leitorJaCa()) { lerOTalao(paraLer); return; }

        const mb = (typeof OCR_MEGAS === 'number' ? OCR_MEGAS : 4.3);
        juntarBotoes(t('talao.perguntar') + '\n\n' +
          t('talao.megas', { mb: L() === 'en' ? mb.toString() : mb.toString().replace('.', ',') }),
          [
            { rotulo: t('talao.ler'), tom: 'sim', aoClicar: () => { lerOTalao(paraLer); return t('talao.aler'); } },
            { rotulo: t('talao.escrevoeu'), aoClicar: () => {
                juntar(t('talao.estabem'), 'ele');
                return t('talao.escreveuvoce');
              } }
          ]);
      } catch (err) {
        campoFicheiro.value = '';
        juntar(t('talao.naoabriu'), 'ele');
      }
    });
  }

  /* ---------- ler o talão ---------- */

  /* Nomes por extenso do que o motor anda a fazer. O que ele diz em inglês
     ("loading language traineddata") não diz nada a ninguém. */
  const OCR_PASSOS = {
    'loading tesseract core': 'ocr.descarregar',
    'initializing tesseract': 'ocr.preparar',
    'loading language traineddata': 'ocr.portugues',
    'initializing api': 'ocr.quase',
    'recognizing text': 'ocr.aler'
  };

  async function lerOTalao(imagem) {
    const vivo = juntarVivo(t('talao.apreparar'));
    let ultimo = '';
    try {
      const texto = await ocrLer(imagem, ({ passo, parte }) => {
        const nome = OCR_PASSOS[passo] ? t(OCR_PASSOS[passo]) : t('talao.apreparar');
        const pct = Math.round((parte || 0) * 100);
        const linha = nome + (pct > 0 && pct < 100 ? ' — ' + pct + '%' : '…');
        if (linha !== ultimo) { ultimo = linha; vivo.escrever(linha); }
      });

      const r = (typeof talaoInterpretar === 'function') ? talaoInterpretar(texto) : { ok: false };
      vivo.apagar();

      if (!r.ok) {
        juntar(t('talao.semtotal') + '\n\n' + t('talao.tireoutra'), 'ele');
        return;
      }
      propor(r);
    } catch (e) {
      vivo.apagar();
      juntar(t('talao.falhou') + '\n\n' + t('talao.tenteoutra'), 'ele');
    }
  }

  /* O que se leu, dito por palavras, com um sim e um não. Nunca se lança sem
     este passo: o OCR erra, e um valor errado metido sozinho nas contas de
     alguém faz mais estrago do que valor nenhum. */
  function propor(r) {
    const onde = r.loja ? ' no **' + r.loja + '**' : '';
    const dia = r.data ? diaPorExtenso(r.data) : '';
    const quando = (dia && !ehHoje(r.data)) ? ', dia ' + dia : '';

    const certo = r.confianca === 'alta';
    const texto = certo
      ? (t('talao.li', { v: dinCurto(r.valor), onde: onde, quando: quando }) + '\n\n' +
         t('talao.lancoassim'))
      : (t('talao.achoqueli', { v: dinCurto(r.valor), onde: onde, quando: quando }) + '\n\n' +
         t('talao.severdadeiro'));

    juntarBotoes(texto, [
      { rotulo: t('talao.simlanca'), tom: 'sim',
        aoClicar: () => { lancarTalao(r); return t('chat.lancado').replace(':', ''); } },
      { rotulo: t('talao.naoescrevo'), aoClicar: () => {
          juntar(t('talao.certo'), 'ele');
          return t('talao.escreveuvoce');
        } }
    ]);
  }

  function lancarTalao(r) {
    if (typeof executarLeitura !== 'function') return;
    const resposta = executarLeitura({
      tipo: 'movimentos',
      lancamentos: [{
        tipo: 'saida',
        valor: r.valor,
        categoria: r.categoria,
        descricao: r.loja || '',
        data: r.data ? dataDoDia(r.data) : new Date(),
        parcelas: 1
      }]
    });
    if (!resposta) return;

    let comFoto = '';
    if (fotoEmEspera && ultimoLote && ultimoLote.length) {
      comFoto = '\n\n' + (guardarFoto(ultimoLote[0], fotoEmEspera)
        ? t('chat.comfoto') : t('chat.semfoto'));
      limparFotoEmEspera();
    }
    juntarComAccao(resposta + comFoto, t('chat.apagar'), apagarUltimoLote);
  }

  const foraFoto = document.getElementById('foto-fora');
  if (foraFoto) foraFoto.addEventListener('click', () => window.limparFotoEmEspera());

  /* Se o acesso chegar depois da página desenhada, o chat passa a poder
     lançar sem se recarregar nada. */
  window.addEventListener('vf:acesso-mudou', () => {
    if (podeLancarPorTexto() && !window.__avisouAcesso) {
      window.__avisouAcesso = true;
      juntar('O seu **mês de experiência** está a contar. A partir de agora ' +
        'escreva o que gastou e eu lanço por si.', 'ele');
    }
  });

  /* Os atalhos passam pelo mesmo caminho do que se escreve à mão. Iam
     directos ao `responder`, e por isso o atalho "Gastei 30 no mercado"
     devolvia um texto sobre mercearia em vez de lançar o gasto — que é
     precisamente a coisa que ele existe para demonstrar. */
  document.querySelectorAll('.assist-sug').forEach(b => {
    b.addEventListener('click', () => {
      const q = b.dataset.q || b.textContent;
      juntar(b.textContent, 'eu');
      setTimeout(() => tratar(q), 340);
    });
  });
});
