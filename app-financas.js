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
const AGREGADO_CHAVE = 'vf:agregado';
const BALANCO_CHAVE = 'vf:balanco';
const PLANO_CHAVE = 'vf:plano';
const CONTAS_CHAVE = 'vf:contasfixas';
const ARRANQUE_CHAVE = 'vf:arranque';
const RESERVA_INICIAL_CHAVE = 'vf:reservainicial';
const SALDO_CHAVE = 'vf:saldo';

/* ---------- o dinheiro extra do ano, por país ----------
   Estava escrito "em junho e em novembro" em quatro sítios. É verdade em
   Portugal e falso em todo o lado: no Brasil é um 13.º só, pago até 30 de
   Novembro e até 20 de Dezembro, e vale um mês de salário e não dois.

   `mesesAno` é quantos meses de rendimento esse dinheiro vale por ano — é o
   que a conta da reserva usa. Dois em Portugal (férias + Natal), um no
   Brasil (13.º).

   Para as moedas de que não tenho resposta verificada, a pergunta faz-se sem
   nomear meses nenhuns. Inventar um mês errado é pior do que não o dizer:
   quem contasse com dinheiro num mês em que ele não entra ficava sem plano
   e sem confiança na aplicação. */
const SUBSIDIOS = {
  EUR: {
    pergunta: 'Recebe subsídio de férias e de Natal?',
    quando: 'em junho e em novembro',
    nome: 'subsídio de férias e de Natal',
    metade: 'metade dos dois subsídios',
    mesesAno: 2
  },
  BRL: {
    pergunta: 'Recebe 13.º salário?',
    quando: 'em novembro e em dezembro',
    nome: '13.º salário',
    metade: 'metade do 13.º',
    mesesAno: 1
  }
};

const SUBSIDIO_NEUTRO = {
  pergunta: 'Recebe algum pagamento extra por ano (13.º, subsídio, prémio)?',
  quando: 'nos meses em que esse dinheiro entra',
  nome: 'pagamento extra do ano',
  metade: 'metade desse pagamento',
  mesesAno: 1
};

function subsidioPais() {
  return SUBSIDIOS[moeda] || SUBSIDIO_NEUTRO;
}

/* Quantos dias à frente se avisa. Sete porque é o horizonte em que ainda se
   consegue fazer alguma coisa — adiar uma compra, pedir um adiantamento,
   cobrar quem deve. Avisar com um mês não muda nada; avisar no próprio dia
   já não serve para nada. */
const CONTAS_JANELA = 7;

/* Sugestões ao criar uma conta fixa. Não é tradução: é outra lista. Quem vive
   no Brasil não paga "renda" nem tem "passe", e ler as palavras erradas é
   perceber em dois segundos que isto não foi feito para si. A lista segue a
   moeda, que é o que a app já sabe sobre o país. */
const CONTAS_SUGESTOES = {
  EUR: [
    { nome: 'Renda',      cat: 'casa',       emoji: '🏠' },
    { nome: 'Luz',        cat: 'contas',     emoji: '💡' },
    { nome: 'Água',       cat: 'contas',     emoji: '🚿' },
    { nome: 'Gás',        cat: 'contas',     emoji: '🔥' },
    { nome: 'Telemóvel',  cat: 'contas',     emoji: '📱' },
    { nome: 'Internet',   cat: 'contas',     emoji: '📶' },
    { nome: 'Passe',      cat: 'transporte', emoji: '🚌' }
  ],
  BRL: [
    { nome: 'Aluguel',    cat: 'casa',       emoji: '🏠' },
    { nome: 'Luz',        cat: 'contas',     emoji: '💡' },
    { nome: 'Água',       cat: 'contas',     emoji: '🚿' },
    { nome: 'Gás',        cat: 'contas',     emoji: '🔥' },
    { nome: 'Celular',    cat: 'contas',     emoji: '📱' },
    { nome: 'Internet',   cat: 'contas',     emoji: '📶' },
    { nome: 'Transporte', cat: 'transporte', emoji: '🚌' }
  ]
};

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
    /* Um acerto é o que falta para as contas da app baterem com o dinheiro
       verdadeiro. Não é um gasto: é a app a admitir que lhe escapou alguma
       coisa. Fica à vista na lista do mês, como tudo o resto, e apaga-se
       como tudo o resto. */
    { id: 'acerto',    nome: 'Acerto de saldo', emoji: '⚖️' },
    { id: 'outros-s',  nome: 'Outros',          emoji: '📦' }
  ],
  entrada: [
    { id: 'salario',   nome: 'Salário',         emoji: '💼' },
    { id: 'extra',     nome: 'Trabalho extra',  emoji: '🛠️' },
    { id: 'vendas',    nome: 'Vendas',          emoji: '🏷️' },
    { id: 'juros',     nome: 'Juros e rendimentos', emoji: '📈' },
    { id: 'presente',  nome: 'Presente',        emoji: '🎁' },
    { id: 'reserva-tirei', nome: 'Tirei da reserva', emoji: '🔓' },
    { id: 'acerto',    nome: 'Acerto de saldo', emoji: '⚖️' },
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

/* ---------- prestações ----------
   A regra que manda em tudo o que se segue:

     A aplicação NUNCA comenta uma compra parcelada já feita.

   Nunca escreve "podia ter poupado", nunca calcula quanto se pagou a mais
   numa compra passada, nunca marca uma prestação a vermelho. Sobre o
   passado só há factos sem adjectivo: quanto falta, até quando, quanto por
   mês. A mesma aritmética entregue ANTES da compra seguinte é uma decisão
   que muda; entregue depois é uma acusação, e a pessoa fecha a app.

   Por isso a funcionalidade está partida em duas, com a mesma matemática
   nas duas pontas do tempo: `lancarParcelado()` (registar, sem opinião) e
   o simulador (antecipar, com a conta toda).

   E nunca se pergunta a taxa de juro: o que se paga a mais é
   `n × prestação − preço a pronto`. Aritmética exacta, sem pressupostos. */
const PARC_VEZES = [2, 3, 6, 10, 12, 24];
const PARC_MAX = 60;

/* Categorias cujo consumo se esgota dentro do mês. Parcelar um frigorífico
   é normal; parcelar a compra do mês ou a factura da luz é o sinal de que
   o mês não está a fechar. */
const CATS_CONSUMO = ['mercado', 'contas', 'saude'];

/* Encaminhamento para apoio gratuito a quem está com dívidas a mais.
   Verificado antes de publicar, que era a condição do desenho: a RACE tem
   entidades reconhecidas pela Direcção-Geral do Consumidor com parecer do
   Banco de Portugal, o apoio é gratuito e confidencial, e o directório é
   pesquisável por distrito no Portal do Cliente Bancário.

   A frase é deliberadamente seca. Quem chega aqui não precisa de ser
   encorajado — precisa de saber que existe sítio onde ir e que não paga. */
const APOIO_ENDIVIDADO = {
  texto: 'Há apoio gratuito e confidencial para tratar de dívidas, por distrito.',
  rotulo: 'Ver as entidades da RACE',
  url: 'https://clientebancario.bportugal.pt/pt-pt/entidades-da-race'
};

/* ---------- agregado familiar ----------
   A app já resolvia isto e ninguém tinha reparado: se os dois salários
   forem lançados como entradas, o `R` que `calcular()` produz já é o
   rendimento do agregado. Não falta modelo de dados nenhum — falta a
   pessoa saber que deve lançar o segundo salário.

   Por isso a funcionalidade inteira são duas frases e uma chave. E o que
   NÃO existe aqui é tão importante como o que existe:

     Não há membros do agregado, não há "cônjuge", não há um ecrã que
     liste o que cada pessoa ganha.

   A razão não é a simplicidade — é segurança. Esta app corre num
   telemóvel que muitas vezes é partilhado, e um ecrã que lista o que o
   companheiro ganha, num agregado onde exista controlo financeiro
   coercivo, é um problema que o produto não tem como resolver e não deve
   criar. Uma descrição livre que a pessoa escolhe escrever é reversível;
   um campo estruturado não é. Quem vier a seguir: não acrescente esse
   ecrã. */
const AGREGADO_MESES = 2;      // nunca perguntar antes de 2 meses completos
const AGREGADO_MUDANCA = 0.30; // R a mudar mais de 30% volta a perguntar
const AGREGADO_ADIAR_DIAS = 30;

/* ---------- balanço do fim do mês ----------
   Factos comparados com a própria pessoa, mês contra mês. NUNCA com uma
   norma externa: "o recomendado são 30%" é ficção para este público, e um
   número sem referência ("40% em adiáveis") também não diz nada. A
   referência é a própria pessoa no mês anterior. Comparativo, nunca
   normativo.

   E três regras que, se caírem, transformam isto em vigilância:
     1. Só se menciona uma categoria se ela passar numa de duas portas, e
        basta uma: variou ≥20% E ≥2% do R (grande em proporção), ou variou
        ≥5% do R seja qual for a percentagem (pesa no orçamento mesmo sendo
        pequena em proporção — 60 € numa renda de 550 € são 11%, nunca
        chegavam aos 20%, e são dinheiro a sério). Uma porta só deixava de
        fora ou as despesas grandes ou as pequenas.
        Comentar uma oscilação de 3 € lê-se como estar a ser observado.
     2. No máximo duas menções; se existir uma que desceu, ela entra; e
        NUNCA um balanço só com más notícias. Não é negociável.
     3. Sem adjectivos ("gastou mais", nunca "gastou demais"), sem notas,
        sem estrelas, sem emojis de cara, sem vermelho em linha nenhuma.

   A app tem direito a UMA opinião no balanço inteiro, e só nesta
   condição: entrou dinheiro acima do normal e não ficou nada dele. Mais
   nada aqui opina. */
const BAL_MIN_SAIDAS = 5;      // menos do que isto não se compara
const BAL_VAR_REL = 0.20;      // porta 1: variação mínima em proporção
const BAL_VAR_R = 0.02;        // ... e mínimo em relação ao rendimento
const BAL_VAR_R_SO = 0.05;     // porta 2: variação que pesa, seja qual for a %
const BAL_DIAS_CONVITE = 10;   // a linha "o mês fechou" vive do dia 1 ao 10 —
                               // cinco dias saltava quem abre a app uma vez
                               // por semana, e essa pessoa nunca saberia que
                               // o balanço existe
const BAL_EXCESSO = 1.15;      // acima disto o mês teve dinheiro a mais
const BAL_SOBROU = 0.05;       // ... e "não ficou nada" é menos de 5% dele

/* ---------- 5 · o plano guiado ----------
   Recusou-se o chat, e a razão mais forte não é técnica: uma caixa de
   texto em branco obriga a pessoa a saber formular a pergunta, e quem
   nunca fez um orçamento não sabe que a pergunta é "quanto devo guardar
   por mês". Um assistente gastaria três turnos a extrair o que a app já
   sabe dos movimentos lançados.

   O que fica no lugar são seis perguntas fechadas, quase todas
   pré-preenchidas com o que a app já calculou — a pessoa confirma em vez
   de escrever — e um documento de forma fixa com os números dela.

   REGRA QUE NÃO SE TOCA: nenhuma frase deste plano é gerada. Todas saem
   deste ficheiro, escolhidas por regras. Um modelo de linguagem *pode*
   ser levado a recomendar um produto financeiro por quem tentar;
   "instruído a não fazer" não é "incapaz de fazer". Isto é incapaz por
   construção — não há aqui nome de instituição, nome de produto, nem
   verbo de investimento em lado nenhum, e não pode passar a haver.
   Quem acrescentar uma frase acrescenta-a aqui, à mão, e fica auditável.

   PLANO_PASSOS = 6 e o documento é o passo 6. */
const PLANO_PASSOS = 6;
const PLANO_DEGRAU = 5;        // "Menos"/"Mais" mexem de 5 em 5, sem teclado

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

/* Agregado: uma confirmação, uma vez. `R` é o rendimento com que a
   confirmação foi dada — é o que permite voltar a perguntar quando a vida
   mudar, e mais nada. Não guarda quem ganha o quê, porque a app não
   pergunta quem ganha o quê. */
let agregado = { confirmado: false, ts: 0, R: null, adiado: null, dicaSalarios: false };

/* Balanço: só os meses cujo convite já foi mostrado e respondido. O
   balanço em si é sempre recalculado dos movimentos — nunca guardado, para
   não envelhecer. */
let balancoPrefs = { vistos: [] };
let balancoAberto = null;   // chave do mês aberto no ecrã, ou null

/* Plano: guardam-se as respostas, nunca o documento. O documento é
   re-desenhado dos dados actuais sempre que se abre, para não envelhecer —
   um plano com os números de há seis meses é pior do que nenhum. */
let planoGuardado = null;   // { feito, respostas, versao }
let planoAberto = false;
let planoPasso = 0;         // 0..5 perguntas, 6 = o documento
let planoResp = {};
let planoEssAberto = false; // "há coisas mal marcadas" abriu os interruptores

/* ---------- contas fixas ----------
   `contas` é a lista do que se repete todos os meses; `pagas` diz quais já
   foram pagas, mês a mês, com a chave `idDaConta|2026-08`. Guardar por mês e
   não um booleano na conta é o que faz o mês seguinte recomeçar sozinho, e o
   que permite voltar a Julho e ver o que lá ficou por pagar. */
let contasFixas = [];
let contasPagas = {};
let contaAberta = null;    // id da conta com o campo do valor à vista
let contasEditando = false;// o ecrã de gestão está em modo de edição

/* ---------- primeiro arranque ----------
   `entra` e `essenciais` são o que a pessoa DISSE, não o que foi medido. Ficam
   separados dos movimentos de propósito: assim que houver lançamentos a sério,
   é por eles que a app se guia, e isto passa a ser só o ponto de partida. */
let arranque = { feito: false, dispensado: false, entra: null, essenciais: null };
let arranquePasso = 0;     // 0, 1, 2 = perguntas · 3 = a resposta

/* O que já estava guardado antes de a aplicação existir. "Tenho 1000 no
   banco" não é uma entrada deste mês — é dinheiro que já lá estava. Somado à
   reserva, mas fora dos movimentos: lançá-lo como movimento dizia que a
   pessoa guardou mil euros hoje, e no fim do mês a app dava-lhe os parabéns
   por uma coisa que não aconteceu. */
let reservaInicial = 0;

/* ============================================================
   O saldo da conta

   A reserva é dinheiro guardado. Isto é outra coisa: é o que a pessoa tem
   agora para gastar, e é o número que ela quer ver quando pergunta "quanto
   tenho?".

   Faltava, e a falta era cara. Quem escrevia "tenho 1000 no banco" via a app
   arrumar os mil na reserva e o número grande do ecrã continuar a dizer
   −500 — que não é o dinheiro dela, é a diferença entre o que entrou e o que
   saiu no mês. Duas coisas certas, lidas como uma contradição, e a conclusão
   de quem lê é sempre a mesma: isto não percebe nada.

   Guarda-se `{ valor, em }`: "no instante `em`, tinha `valor`". Daí para a
   frente é a própria app que o mantém — cada saída desconta, cada entrada
   soma. Assim o número nunca envelhece sozinho, e nunca é preciso pedir à
   pessoa que o volte a escrever.
   ============================================================ */
let saldoConta = null;

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

/* Estado do caminho "paguei a prestações". Tudo isto é do lançamento que
   está a ser escrito e morre com ele. */
let parcAberto = false;         // a etiqueta foi tocada
let parcVezes = null;           // quantas vezes
let parcDividido = false;       // já usou "o valor que escrevi é o preço total"
let parcOfertaVista = false;    // a oferta "ver a conta?" não volta a aparecer

/* Simulador "antes de parcelar". Vive fora do formulário porque também se
   abre a partir do bloco "Já comprometido". */
let simAberto = false;
let simVals = { pronto: '', prestacao: '', vezes: '' };
let compVerTodos = false;       // "ver todos" os meses comprometidos

/* ---------- utilitários ---------- */
/* A língua acompanha a moeda. Em pt-PT o real sai "61,59 R$", que nenhum
   brasileiro escreve — lá é "R$ 61,59", com o símbolo à frente. É um pormenor
   que diz a quem lê se aquilo foi feito para ele. */
function localDaMoeda(m) {
  return m === 'BRL' ? 'pt-BR' : 'pt-PT';
}

function dinheiro(v) {
  try {
    return new Intl.NumberFormat(localDaMoeda(moeda), {
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

/* '2026-01' → '2025-12'. Sem `Date`: uma chave de mês é texto e não tem
   fuso horário nenhum para se enganar. */
function mesAnteriorK(k) {
  let ano = parseInt(k.slice(0, 4), 10);
  let mes = parseInt(k.slice(5, 7), 10) - 1;   // 0..11
  mes--;
  if (mes < 0) { mes = 11; ano--; }
  return chaveMes(ano, mes);
}

function num(v) {
  return v.toFixed(1).replace('.', ',');
}

/* Data local em ISO. `toISOString()` converte para UTC e, em Portugal no
   Verão, à meia-noite e meia devolve o dia anterior — o que punha uma
   prestação no mês errado. */
function isoLocal(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

const HOJE = isoLocal(hoje);

/* '2027-03' → 'março de 2027'. Com `curto`, o ano só aparece quando não é
   o corrente — numa lista de meses seguidos o ano repetido é ruído. */
function mesExtenso(chave, curto) {
  const ano = parseInt(chave.slice(0, 4), 10);
  const mes = parseInt(chave.slice(5, 7), 10) - 1;
  if (curto && ano === hoje.getFullYear()) return MESES[mes];
  return MESES[mes] + ' de ' + ano;
}

function comMaiuscula(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/* As N datas de uma compra parcelada: mesmo dia do mês, mês + k, com o dia
   limitado ao último dia do mês de destino. Dia 31 em Fevereiro é o erro
   que se comete aqui. */
function datasPrestacoes(dataISO, de) {
  const base = new Date(dataISO + 'T00:00:00');
  const dia = base.getDate();
  const datas = [];
  for (let k = 0; k < de; k++) {
    const alvo = new Date(base.getFullYear(), base.getMonth() + k, 1);
    const d = Math.min(dia, diasNoMes(alvo.getFullYear(), alvo.getMonth()));
    datas.push(isoLocal(new Date(alvo.getFullYear(), alvo.getMonth(), d)));
  }
  return datas;
}

function lerValor(texto) {
  const v = parseFloat(String(texto || '').replace(',', '.').trim());
  return (isFinite(v) && v > 0) ? v : null;
}

function escreverValor(el, v) {
  el.value = String(Math.round(v * 100) / 100).replace('.', ',');
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
    /* As prestações estão gravadas com a data real de cada uma, logo há
       saídas com data futura. Nenhuma delas foi lançada por alguém a
       viver o dia — e 24 prestações iguais tomavam a barra toda. */
    if (m.data < limite || m.data > HOJE) return;
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
    localStorage.setItem(AGREGADO_CHAVE, JSON.stringify(agregado));
    localStorage.setItem(BALANCO_CHAVE, JSON.stringify(balancoPrefs));
    if (planoGuardado) localStorage.setItem(PLANO_CHAVE, JSON.stringify(planoGuardado));
  } catch (e) { /* sem localStorage a app funciona na mesma, só não se lembra */ }

  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ preferencias: {
        reserva: reservaPrefs, essenciais, agregado,
        balanco: balancoPrefs, plano: planoGuardado || null
      } }, { merge: true })
      .catch(() => { /* silencioso: são preferências, não são dados */ });
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

  /* `parc` segue a regra do `ess`: ou está bem formado, ou desaparece.
     Nunca se inventa. Um movimento sem `parc` é uma compra normal — que é
     o que todos os movimentos gravados antes desta versão são. */
  if (o.parc !== undefined) {
    const q = o.parc;
    const ok = q && typeof q === 'object' &&
      typeof q.g === 'string' && q.g &&
      typeof q.n === 'number' && typeof q.de === 'number' &&
      q.n === Math.floor(q.n) && q.de === Math.floor(q.de) &&
      q.n >= 1 && q.de >= 1 && q.n <= q.de;
    if (ok) {
      const tot = Number(q.tot);
      o.parc = {
        g: q.g, n: q.n, de: q.de,
        tot: isFinite(tot) && tot > 0 ? tot : Math.round(o.valor * q.de * 100) / 100
      };
    } else {
      delete o.parc;
    }
  }
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

  const ag = lerJSON(AGREGADO_CHAVE, null);
  if (ag) {
    agregado = {
      confirmado: ag.confirmado === true,
      ts: typeof ag.ts === 'number' ? ag.ts : 0,
      R: (typeof ag.R === 'number' && isFinite(ag.R) && ag.R > 0) ? ag.R : null,
      adiado: typeof ag.adiado === 'string' ? ag.adiado : null,
      dicaSalarios: ag.dicaSalarios === true
    };
  }

  const bal = lerJSON(BALANCO_CHAVE, null);
  if (bal && Array.isArray(bal.vistos)) {
    balancoPrefs = {
      vistos: bal.vistos.filter(x => typeof x === 'string' && /^\d{4}-\d{2}$/.test(x)).slice(-36)
    };
  }

  const pl = lerJSON(PLANO_CHAVE, null);
  if (pl && pl.respostas && typeof pl.respostas === 'object') {
    planoGuardado = {
      feito: typeof pl.feito === 'string' ? pl.feito : '',
      respostas: pl.respostas,
      versao: 1
    };
  }

  const ri = Number(localStorage.getItem(RESERVA_INICIAL_CHAVE));
  reservaInicial = (isFinite(ri) && ri > 0) ? Math.round(ri * 100) / 100 : 0;

  const sc = lerJSON(SALDO_CHAVE, null);
  if (sc && isFinite(Number(sc.valor)) && Number(sc.em) > 0) {
    saldoConta = { valor: Math.round(Number(sc.valor) * 100) / 100, em: Number(sc.em) };
  }

  const arr = lerJSON(ARRANQUE_CHAVE, null);
  if (arr) {
    const e = Number(arr.entra), s = Number(arr.essenciais);
    arranque = {
      feito: !!arr.feito,
      dispensado: !!arr.dispensado,
      entra: (isFinite(e) && e > 0) ? e : null,
      essenciais: (isFinite(s) && s >= 0) ? s : null
    };
  }

  /* Contas fixas. Cada campo é validado à entrada: o que vier torto é
     descartado, não corrigido às cegas. Uma conta com `dia` fora de 1..31 ou
     com valor negativo entrava aqui e só rebentava três ecrãs à frente. */
  const cf = lerJSON(CONTAS_CHAVE, null);
  if (cf) {
    if (Array.isArray(cf.contas)) {
      contasFixas = cf.contas.map(c => {
        if (!c || typeof c !== 'object') return null;
        const dia = Math.floor(Number(c.dia));
        const valor = Number(c.valor);
        const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 40) : '';
        if (!nome || !(dia >= 1 && dia <= 31)) return null;
        return {
          id: typeof c.id === 'string' && c.id ? c.id : idNovo(),
          nome: nome,
          valor: (isFinite(valor) && valor > 0) ? Math.round(valor * 100) / 100 : 0,
          dia: dia,
          categoria: typeof c.categoria === 'string' && c.categoria ? c.categoria : 'contas',
          emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 4) : '🧾'
        };
      }).filter(Boolean).slice(0, 40);
    }
    if (cf.pagas && typeof cf.pagas === 'object') {
      Object.keys(cf.pagas).forEach(k => {
        if (/^[^|]+\|\d{4}-\d{2}$/.test(k) && typeof cf.pagas[k] === 'string') {
          contasPagas[k] = cf.pagas[k];
        }
      });
    }
  }
}

/* ------------------------------------------------------------
   Quando é que um movimento foi lançado

   Para o saldo se manter certo é preciso saber quais dos movimentos vieram
   DEPOIS de a pessoa dizer quanto tinha. A data não serve: alguém pode
   lançar hoje um gasto de ontem, e esse gasto já estava descontado no número
   que ela leu no extracto.

   O `id` traz a hora dentro — é `Date.now()` em base 36 — e os movimentos
   novos passam a trazer também um `criado`, escrito por extenso. Não se lendo
   nem um nem outro, conta como antigo: um movimento que não sabemos quando
   nasceu não pode andar a mexer no saldo que a pessoa afirmou.
   ------------------------------------------------------------ */
const ANO_2000 = 946684800000;

function quandoFoiLancado(m) {
  if (m && typeof m.criado === 'number' && m.criado > ANO_2000) return m.criado;
  const t = parseInt(String((m && m.id) || '').slice(0, 8), 36);
  return (isFinite(t) && t > ANO_2000 && t < Date.now() + 86400000) ? t : 0;
}

/* O saldo de agora: o que a pessoa disse, mais o que entrou e menos o que
   saiu desde que o disse. */
function saldoAgora() {
  if (!saldoConta) return null;
  return Math.round((saldoConta.valor + movimentos.reduce((soma, m) => {
    if (quandoFoiLancado(m) <= saldoConta.em) return soma;
    return soma + (m.tipo === 'entrada' ? m.valor : -m.valor);
  }, 0)) * 100) / 100;
}

/* Substitui, não soma. E fica com a hora, que é o que permite descontar dali
   para a frente sem descontar duas vezes o que já estava descontado. */
function definirSaldoConta(valor) {
  const v = Number(valor);
  if (!isFinite(v)) return null;
  saldoConta = { valor: Math.round(v * 100) / 100, em: Date.now() };
  try { localStorage.setItem(SALDO_CHAVE, JSON.stringify(saldoConta)); } catch (e) {}
  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ saldoConta: saldoConta }, { merge: true }).catch(() => {});
  }
  desenhar();
  return saldoConta.valor;
}

function esquecerSaldoConta() {
  saldoConta = null;
  try { localStorage.removeItem(SALDO_CHAVE); } catch (e) {}
  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ saldoConta: null }, { merge: true }).catch(() => {});
  }
  desenhar();
}

/* Substitui, não soma: "tenho 1000" é o total de agora, não mais mil. */
function definirReservaInicial(valor) {
  const v = Number(valor);
  reservaInicial = (isFinite(v) && v > 0) ? Math.round(v * 100) / 100 : 0;
  try { localStorage.setItem(RESERVA_INICIAL_CHAVE, String(reservaInicial)); } catch (e) {}
  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ reservaInicial: reservaInicial }, { merge: true }).catch(() => {});
  }
  desenhar();
}

function guardarArranque() {
  try { localStorage.setItem(ARRANQUE_CHAVE, JSON.stringify(arranque)); }
  catch (e) { /* sem localStorage a app funciona, só volta a perguntar */ }
  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ arranque }, { merge: true })
      .catch(() => { /* silencioso: já ficou gravado no telemóvel */ });
  }
}

function guardarContas() {
  try {
    localStorage.setItem(CONTAS_CHAVE, JSON.stringify({
      contas: contasFixas, pagas: contasPagas
    }));
  } catch (e) { /* sem localStorage a app funciona, só não se lembra */ }

  if (utilizador && window.db) {
    db.collection('utilizadores').doc(utilizador.uid)
      .set({ contasFixas: { contas: contasFixas, pagas: contasPagas } }, { merge: true })
      .catch(() => { /* silencioso: já ficou gravado no telemóvel */ });
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
      nSaidas: 0, nSalarios: 0,
      porCatEss: {}, porCat: {}, porCatDesc: {}
    });
    if (m.tipo === 'entrada') {
      if (m.categoria === 'reserva-tirei') a.guardado -= m.valor;
      else a.rendimento += m.valor;
      if (m.categoria === 'salario') a.nSalarios++;
    } else {
      if (m.categoria === 'reserva') {
        a.guardado += m.valor;
      } else {
        /* Só conta o que já foi vivido. As prestações futuras são saídas
           a sério, mas não são registos de dias passados: se contassem
           aqui, uma compra em 24 vezes destrancava sozinha os portões de
           "dados suficientes" e a barra de etiquetas aprendida. */
        if (m.data <= HOJE) { totalSaidas++; a.nSaidas++; }
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
  /* `reservaInicial` é o que já estava guardado antes de a app existir. Sem
     esta parcela, quem escrevesse "tenho 1000 no banco" via a resposta certa
     no chat e um zero no ecrã do Início — e um número que se contradiz a si
     próprio põe em dúvida todos os outros. */
  r.reserva = reservaInicial + Object.keys(meses).reduce((s, k) => s + meses[k].guardado, 0);
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
  const a = meses[kVisto] || { rendimento: 0, essenciais: 0, naoEssenciais: 0, guardado: 0, nSaidas: 0, nSalarios: 0, porCat: {}, porCatEss: {}, porCatDesc: {} };
  r.mesVisivel = {
    chave: kVisto,
    nSaidas: a.nSaidas || 0,
    nSalarios: a.nSalarios || 0,
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

  /* --- prestações -------------------------------------------------
     Cada prestação é uma saída normal com a sua data real. Nada disto
     precisa de um modelo de dados novo: os meses futuros mostram o
     compromisso sem uma linha nova em lado nenhum, e `completos` (que só
     olha para meses anteriores ao corrente) mantém as medianas limpas. */
  const futuras = movimentos.filter(m => m.tipo === 'saida' && m.parc && m.data >= HOJE);
  r.parcelasFuturas = futuras;
  r.comprometidoTotal = Math.round(futuras.reduce((s, m) => s + m.valor, 0) * 100) / 100;

  const porMesComp = {};
  futuras.forEach(m => {
    const k = m.data.slice(0, 7);
    porMesComp[k] = (porMesComp[k] || 0) + m.valor;
  });
  r.comprometidoMeses = Object.keys(porMesComp).sort()
    .map(k => ({ mes: k, valor: Math.round(porMesComp[k] * 100) / 100 }));
  r.ultimaPrestacao = r.comprometidoMeses.length
    ? r.comprometidoMeses[r.comprometidoMeses.length - 1].mes : null;

  /* "Por mês" refere-se aos meses que ainda vêm a caminho, não a este —
     este já está meio vivido e a sua parcela pode já ter sido paga. */
  const seguintes = r.comprometidoMeses.filter(x => x.mes > chaveHoje);
  r.comprometidoPorMes = seguintes.length ? mediana(seguintes.map(x => x.valor)) : null;
  r.comprometidoUniforme = seguintes.length > 0 &&
    seguintes.every(x => Math.abs(x.valor - seguintes[0].valor) < 0.005);
  r.comprometidoSeguintes = Math.round(
    seguintes.reduce((s, x) => s + x.valor, 0) * 100) / 100;

  const grupos = {};
  movimentos.forEach(m => {
    if (m.tipo !== 'saida' || !m.parc) return;
    const g = grupos[m.parc.g] || (grupos[m.parc.g] = {
      g: m.parc.g, de: m.parc.de, categoria: m.categoria,
      descricao: m.descricao || '', valor: m.valor,
      inicio: m.data, porPagar: 0, quantasFaltam: 0, proxima: null
    });
    if (m.data < g.inicio) { g.inicio = m.data; g.valor = m.valor; }
    if (m.data >= HOJE) {
      g.porPagar += m.valor;
      g.quantasFaltam++;
      if (!g.proxima || m.data < g.proxima.data) g.proxima = m;
    }
  });
  r.grupos = Object.keys(grupos).map(k => grupos[k])
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  r.gruposActivos = r.grupos.filter(g => g.porPagar > 0);

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

  /* --- sinal de aflição -------------------------------------------
     A informação mais importante que estes dados contêm, e a mais fácil
     de estragar. Três níveis, sem popup, sem vermelho, sem ponto de
     exclamação — e cada nível termina a tirar a culpa de cima da pessoa,
     que é o que decide se ela lê a linha seguinte ou fecha a app.

     O mesmo portão da fase 1: nada de sinal com menos de 2 meses
     completos e 8 saídas. */
  r.sinalAflicao = null;
  if (r.completos.length >= 2 && totalSaidas >= 8 && r.gruposActivos.length) {
    const ha3meses = isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate()));
    const cats = [];
    r.grupos.forEach(g => {
      if (CATS_CONSUMO.indexOf(g.categoria) === -1) return;
      if (g.inicio < ha3meses) return;
      const nome = catInfo('saida', g.categoria).nome;
      if (cats.indexOf(nome) === -1) cats.push(nome);
    });

    const peso = (r.R && r.R > 0 && r.comprometidoPorMes)
      ? r.comprometidoPorMes / r.R : null;
    const nivel1 = cats.length > 0;
    const nivel2 = peso !== null && peso >= 0.20;

    if (nivel1 || nivel2) {
      const ambos = nivel1 && nivel2;
      r.sinalAflicao = {
        nivel: (ambos || r.dividasASubir) ? 3 : (nivel2 ? 2 : 1),
        consumo: nivel1,
        cats: cats,
        peso: nivel2,
        porMes: r.comprometidoPorMes,
        pct: peso !== null ? Math.round(peso * 100) : null
      };
    }
  }

  /* --- dia habitual do salário ------------------------------------ */
  r.lembreteSalario = null;
  r.diaSalario = null;
  const salarios = movimentos.filter(m => m.tipo === 'entrada' && m.categoria === 'salario')
                             .sort((x, y) => x.data.localeCompare(y.data));
  if (salarios.length >= 2) {
    const d = Math.round(mediana(salarios.slice(-3).map(m => parseInt(m.data.slice(8, 10), 10))));
    if (d >= 1 && d <= 31) r.diaSalario = d;
  }
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

  /* --- escala das saídas já lançadas -------------------------------
     A mediana de uma saída desta pessoa. Serve de referência quando `R`
     ainda não existe — e é a única referência honesta, porque é feita dos
     números dela e não de uma norma. Só saídas já vividas (uma prestação
     futura não é um registo de um dia passado), sem a reserva (guardar não
     é gastar) e só na moeda em uso (somar euros com kwanzas não escala
     nada). */
  const saidasVividas = movimentos.filter(m =>
    m.tipo === 'saida' && m.categoria !== 'reserva' &&
    m.data <= HOJE && (m.moeda || moeda) === moeda && m.valor > 0);
  r.nSaidasVividas = saidasVividas.length;
  r.medianaSaida = mediana(saidasVividas.map(m => m.valor));

  /* --- agregado familiar -------------------------------------------
     Uma confirmação, uma vez, e nunca no arranque: sem 2 meses completos
     o número que estaria a confirmar não existe. */
  r.agregadoPerguntar = false;
  if (!r.moedaMista && completos.length >= AGREGADO_MESES && r.R !== null && r.R > 0) {
    const adiadoHa = agregado.adiado
      ? (hoje - new Date(agregado.adiado + 'T00:00:00')) / 864e5 : Infinity;
    if (adiadoHa >= AGREGADO_ADIAR_DIAS) {
      if (!agregado.confirmado) {
        r.agregadoPerguntar = true;
      } else if (agregado.R && agregado.R > 0) {
        /* Volta a perguntar só se o rendimento mudar mais de 30% durante
           dois meses seguidos — uma vida que mudou, não um mês estranho. */
        const dois = completos.slice(-2).map(k => meses[k].rendimento);
        if (dois.length === 2 &&
            dois.every(x => Math.abs(x - agregado.R) > AGREGADO_MUDANCA * agregado.R)) {
          r.agregadoPerguntar = true;
        }
      }
    }
  }
  /* Dois salários no mês visível: uma linha dispensável para sempre. Não
     abre ecrã nenhum, não guarda de quem é o quê. */
  r.dicaDoisSalarios = !agregado.dicaSalarios && r.mesVisivel.nSalarios >= 2;

  /* --- balanço do fim do mês ---------------------------------------- */
  r.balancoAlvo = null;
  r.balancoConvite = false;
  if (r.ehFuturo) {
    /* nada: um mês que ainda não aconteceu não fechou */
  } else if (!r.ehMesCorrente) {
    if (meses[kVisto]) r.balancoAlvo = kVisto;          // navegou para um mês fechado
  } else if (hoje.getDate() <= BAL_DIAS_CONVITE) {
    const ant = mesAnteriorK(chaveHoje);
    /* Um mês com meia dúzia de movimentos lançados diria que se gastou
       menos em tudo. Não se convida ninguém a ver isso. */
    if (meses[ant] && meses[ant].nSaidas >= BAL_MIN_SAIDAS) {
      r.balancoAlvo = ant;
      r.balancoConvite = balancoPrefs.vistos.indexOf(ant) === -1;
    }
  }
  r.balanco = (r.balancoAlvo && balancoAberto === r.balancoAlvo)
    ? construirBalanco(r, r.balancoAlvo) : null;

  return r;
}

/* ============================================================
   3 · O BALANÇO DO FIM DO MÊS

   Tudo o que sai daqui é facto. A comparação é sempre com a própria
   pessoa no mês anterior — nunca com uma norma, nunca com uma média de
   ninguém, nunca com uma percentagem "recomendada".
   ============================================================ */
function construirBalanco(r, k) {
  const a = r.meses[k];
  if (!a) return null;

  const b = { mes: k, nome: mesExtenso(k, true) };
  if ((a.nSaidas || 0) < BAL_MIN_SAIDAS) {
    b.poucos = true;
    return b;
  }

  b.entrou = a.rendimento;
  b.saiu = a.essenciais + a.naoEssenciais;
  b.essenciais = a.essenciais;
  b.guardou = a.guardado;
  b.livre = a.rendimento - b.saiu - a.guardado;
  b.pctEssEntrou = b.entrou > 0 ? Math.round(a.essenciais / b.entrou * 100) : null;

  /* Em aperto o quadro muda de forma: cai a coluna "Guardou" e "Sobrou"
     passa a "Faltou". Fingir uma linha de poupança a quem não teve nenhuma
     é a maneira mais rápida de o balanço deixar de ser lido. */
  b.apertado = b.livre < 0 || (b.entrou > 0 && a.essenciais >= b.entrou);

  const kp = mesAnteriorK(k);
  const ap = r.meses[kp] || null;
  b.antMes = ap ? kp : null;
  b.antNome = ap ? mesExtenso(kp, true) : null;

  const pct = (x, base) => (base > 0 ? Math.round(x / base * 100) : null);
  b.pctEss = pct(a.essenciais, b.saiu);
  b.pctAdi = pct(a.naoEssenciais, b.saiu);
  if (ap) {
    const saiuP = ap.essenciais + ap.naoEssenciais;
    b.antSaiu = saiuP;
    b.antPctEss = pct(ap.essenciais, saiuP);
    b.antPctAdi = pct(ap.naoEssenciais, saiuP);
    b.antGuardou = ap.guardado;
  }

  /* As três maiores saídas do mês. Factos ordenados, sem cor nenhuma. */
  b.maiores = Object.keys(a.porCat)
    .map(id => ({ id: id, valor: a.porCat[id] }))
    .sort((x, y) => y.valor - x.valor)
    .slice(0, 3);

  /* Guardou em N dos últimos meses. Só entra com N ≥ 1: "guardou em 0 dos
     últimos 6" é uma má notícia sem utilidade nenhuma. */
  const ate = Object.keys(r.meses).filter(x => x <= k).sort().slice(-6);
  const comGuardado = ate.filter(x => r.meses[x].guardado > 0).length;
  b.guardouEm = (comGuardado >= 1 && ate.length >= 2)
    ? { n: comGuardado, de: ate.length } : null;

  /* --- as menções, e a regra anti-vergonha ------------------------- */
  b.mencoes = null;
  const base = (r.R && r.R > 0) ? r.R : b.saiu;
  if (ap && base > 0) {
    const ids = {};
    Object.keys(a.porCat).forEach(x => { ids[x] = true; });
    Object.keys(ap.porCat).forEach(x => { ids[x] = true; });

    const cands = Object.keys(ids).map(id => {
      const mv = a.porCat[id] || 0;
      const pv = ap.porCat[id] || 0;
      return { id: id, mv: mv, pv: pv, d: mv - pv };
    }).filter(c => {
      const abs = Math.abs(c.d);
      /* Porta 2: pesa no orçamento mesmo sendo pequena em proporção. Sem
         ela, uma subida de 60 € numa renda de 550 € (11%) ficava calada —
         e é dinheiro a sério. */
      if (abs >= BAL_VAR_R_SO * base) return true;
      /* Porta 1: grande em proporção, e acima do ruído. Comentar uma
         oscilação de 3 € lê-se como estar a ser observado. */
      if (abs < BAL_VAR_R * base) return false;
      const rel = c.pv > 0 ? abs / c.pv : 1;
      return rel >= BAL_VAR_REL;
    });

    const sobem = cands.filter(c => c.d > 0).sort((x, y) => y.d - x.d);
    const descem = cands.filter(c => c.d < 0).sort((x, y) => x.d - y.d);

    /* Existe alguma boa notícia neste balanço, fora as menções? É esta
       pergunta que impede um balanço só com más notícias. */
    const temBoa = !!b.guardouEm || b.guardou > 0 || b.livre > 0 ||
      (b.antGuardou !== undefined && b.guardou > b.antGuardou) ||
      (b.antSaiu !== undefined && b.saiu < b.antSaiu);

    if (descem.length) {
      /* Sempre que existir uma que desceu, ela entra. */
      if (sobem.length) b.mencoes = { sobe: sobem[0], desce: descem[0] };
      else b.mencoes = { desce: descem[0], desce2: descem[1] || null };
    } else if (sobem.length && temBoa) {
      b.mencoes = { sobe: sobem[0] };
    }
    /* Sem nenhuma que desceu e sem boa notícia nenhuma: não se menciona
       categoria nenhuma. Um balanço só com más notícias não se publica. */
  }

  /* --- a única opinião a que a app tem direito ---------------------
     Entrou dinheiro acima do normal e não ficou nada dele. É factual,
     aponta para um mecanismo e não para um carácter, e a app assume
     metade da falha. Mais nada no balanço opina. */
  b.opiniao = null;
  const antesDe = r.completos.filter(x => x < k).slice(-6).map(x => r.meses[x].rendimento);
  const normal = mediana(antesDe);
  if (normal && normal > 0 && b.entrou > BAL_EXCESSO * normal) {
    const excesso = Math.round((b.entrou - normal) * 100) / 100;
    const restou = Math.max(0, b.livre) + Math.max(0, b.guardou);
    if (excesso > 0 && restou <= BAL_SOBROU * excesso) b.opiniao = excesso;
  }

  return b;
}

/* Sem `R` não há travão nenhum — e é a primeira utilização que mais
   precisa dele. A referência alternativa é a mediana das saídas já
   lançadas por esta pessoa: o erro de escrever o preço da montra inflaciona
   a prestação em exactamente `n` vezes, por isso compara-se a prestação
   com o que ela costuma gastar de uma vez, e o total com o mesmo padrão. */
function totalSuspeito(valor, vezes, r) {
  if (r.R && r.R > 0) return valor * vezes > 3 * r.R;
  if (r.nSaidasVividas < 3 || !r.medianaSaida || r.medianaSaida <= 0) return false;
  return valor > 5 * r.medianaSaida && valor * vezes > 12 * r.medianaSaida;
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
  const elComp = document.getElementById('v-livre-comp');

  if (r.ehFuturo) {
    /* Um mês futuro não tem rendimento lançado. Mostrar "Livre" negativo
       era dizer uma coisa falsa com um número grande. Só se mostra o que
       já tem dono — sem por-dia, sem vermelho, sem o resumo do mês. */
    elLivre.textContent = '—';
    elLivre.classList.remove('neg');
    elSub.textContent = v.saiu > 0
      ? 'Mês futuro. Só se vê o que já está comprometido: ' + dinheiro(v.saiu) + '.'
      : 'Mês futuro. Ainda não há nada lançado para este mês.';
  } else if (v.vazio) {
    elLivre.textContent = '—';
    elLivre.classList.remove('neg');
    elSub.textContent = 'Ainda não lançou nada neste mês.';
  } else if (v.livre < 0) {
    elLivre.textContent = dinheiro(v.livre);
    elLivre.classList.add('neg');
    /* As três palavras do fim são o que faltava. Um mês com mais saídas do
       que entradas é normal antes de entrar o ordenado, mas um número grande
       e vermelho lê-se como uma dívida — e quem o lê assim vem perguntar
       porque é que a aplicação lhe inventou um saldo negativo. */
    elSub.textContent = 'Saiu mais ' + dinheiro(Math.abs(v.livre)) +
      ' do que entrou este mês. Não é uma dívida.';
  } else {
    elLivre.textContent = dinheiro(v.livre);
    elLivre.classList.remove('neg');
    elSub.textContent = r.porDia
      ? ('faltam ' + r.porDia.dias + (r.porDia.dias === 1 ? ' dia' : ' dias') +
         ' · ' + dinheiro(r.porDia.valor) + ' por dia')
      : '';
  }

  /* Uma linha, só no mês corrente e só quando há meses à frente com
     prestações. É facto, não é aviso. */
  if (elComp) {
    if (r.ehMesCorrente && r.comprometidoPorMes) {
      elComp.hidden = false;
      elComp.textContent = r.comprometidoUniforme
        ? ('Nos próximos meses há ' + dinheiro(r.comprometidoPorMes) +
           ' por mês já comprometidos.')
        : ('Nos próximos meses há ' + dinheiro(r.comprometidoSeguintes) +
           ' já comprometidos — cerca de ' + dinheiro(r.comprometidoPorMes) + ' por mês.');
    } else {
      elComp.hidden = true;
      elComp.textContent = '';
    }
  }

  desenharSaldoConta();

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

  document.getElementById('resumo-linha').textContent = r.ehFuturo ? ''
    : ('Entrou ' + dinheiro(v.entrou) + '  ·  Saiu ' + dinheiro(v.saiu) +
       '  ·  Guardou ' + dinheiro(v.guardado));
}

/* A linha do dinheiro a sério.

   Só existe depois de a pessoa dizer quanto tem — não se inventa um saldo a
   partir dos movimentos, porque a app não viu o mês em que ela começou nem
   sabe o que havia na conta antes disso. Dita a frase uma vez, fica certa
   sozinha para sempre. */
function desenharSaldoConta() {
  const el = document.getElementById('v-conta');
  if (!el) return;

  const agora = saldoAgora();
  if (agora === null) { el.hidden = true; el.textContent = ''; return; }

  el.hidden = false;
  el.className = 'linha-conta' + (agora < 0 ? ' neg' : '');
  el.textContent = 'Na conta: ' + dinheiro(agora);
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
    let legenda = info.nome;
    /* `3/12` e mais nada. É informação, não é comentário: sem cor, sem
       ícone, sem "faltam nove". */
    if (m.parc) legenda += ' · ' + m.parc.n + '/' + m.parc.de;
    legenda += ' · ' + d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
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
    del.addEventListener('click', () => apagar(m.id, li));

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

/* Uma pergunta com respostas, no sítio onde a pessoa já está a olhar.
   Nunca um popup: no telemóvel um popup aparece longe do que o provocou e
   fecha-se por engano. */
function caixaPergunta(texto, botoes) {
  const cx = document.createElement('div');
  cx.className = 'pergunta';
  cx.appendChild(p(texto));
  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  botoes.forEach(b => acoes.appendChild(botao(b[0], 'mini-btn', b[1])));
  cx.appendChild(acoes);
  return cx;
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

  /* 2 · Agregado familiar. Duas frases e uma chave. */
  desenharAgregado(r, c);

  /* Botões e nota permanente: em todos os modos, incluindo o aperto. */
  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Guardar agora', 'btn btn-gold btn-peq', () => prepararGuardar(r.mensal)));
  if (r.reserva > 0) {
    acoes.appendChild(botao('Tirei da reserva', 'btn btn-line btn-peq', () => prepararTirar()));
  }
  /* O plano reúne o que os outros blocos já produziram. Fica aqui porque é
     aqui que a pergunta "e agora?" nasce. */
  acoes.appendChild(botao('O meu plano', 'btn btn-line btn-peq', abrirPlano));
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

/* ============================================================
   2 · AGREGADO FAMILIAR

   A funcionalidade inteira: uma confirmação que, quando falha, abre o
   lançamento em vez de um formulário. Um número escrito num ecrã de
   definições envelhece e ninguém o volta a corrigir; um movimento é
   corrigido pelo acto de viver.

   E o que aqui não está é deliberado: não há ecrã de membros, não há
   "quem ganha o quê", não há campo "cônjuge". Num telemóvel partilhado
   esse ecrã é um perigo que o produto não deve criar. Se um dia alguém o
   quiser acrescentar, esta é a razão para não o fazer.
   ============================================================ */
function desenharAgregado(r, c) {
  if (r.agregadoPerguntar) {
    const cx = caixaPergunta(
      'Este quadro está a contar com ' + dinheiro(r.R) +
      ' por mês. É tudo o que entra em casa?', [
        ['É tudo', () => {
          agregado.confirmado = true;
          agregado.R = r.R;
          agregado.ts = Date.now();
          agregado.adiado = null;
          guardarPrefs();
          desenhar();
          mostrarAviso('Fica assim. Só volta a perguntar se o que entra mudar muito.', 'ok');
        }],
        ['Falta contar outro rendimento', () => {
          /* Não abre um formulário a perguntar quanto é. Abre o
             lançamento, já em Entrada/Salário. */
          agregado.confirmado = false;
          agregado.adiado = isoLocal(new Date());
          guardarPrefs();
          desenhar();
          prepararOutroRendimento();
        }]
      ]);
    cx.classList.add('agregado');
    c.appendChild(cx);
  }

  /* Distinguir de quem, sem campo novo nenhum: a descrição livre, que a
     pessoa escolhe escrever e pode apagar. Dispensável para sempre. */
  if (r.dicaDoisSalarios) {
    const d = document.createElement('div');
    d.className = 'agregado-dica';
    d.appendChild(p('Há dois salários neste mês. Se quiser distinguir, escreva de quem na descrição — "meu", "do João". Não é preciso.', 'res-nota'));
    d.appendChild(botao('Não mostrar mais', 'link-btn', () => {
      agregado.dicaSalarios = true;
      guardarPrefs();
      desenhar();
    }));
    c.appendChild(d);
  }
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

/* ============================================================
   1a · O BLOCO "JÁ COMPROMETIDO" — registar, sem opinião nenhuma

   Factos e mais nada: quanto falta, até quando, quanto por mês. Aqui não
   se calcula o que se pagou a mais numa compra já feita — para o fazer a
   app teria de perguntar o preço a pronto de uma coisa já comprada, que é
   literalmente perguntar "quanto é que desperdiçou".
   ============================================================ */
function desenharComprometido(r) {
  const bloco = document.getElementById('bloco-comprometido');
  const c = document.getElementById('comprometido-corpo');
  if (!bloco || !c) return;

  c.innerHTML = '';
  if (!r.parcelasFuturas.length) {
    bloco.hidden = true;
    compVerTodos = false;
    return;
  }
  bloco.hidden = false;

  c.appendChild(p('Prestações que já estão a caminho:', 'comp-rot'));

  const meses = r.comprometidoMeses;
  const mostrar = compVerTodos ? meses : meses.slice(0, 4);
  const ul = document.createElement('ul');
  ul.className = 'comp-meses';
  mostrar.forEach(x => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = comMaiuscula(mesExtenso(x.mes, true));
    const sp = document.createElement('span');
    sp.textContent = dinheiro(x.valor);
    li.append(b, sp);
    ul.appendChild(li);
  });
  c.appendChild(ul);

  if (meses.length > mostrar.length) {
    const restantes = meses.length - mostrar.length;
    const linha = document.createElement('div');
    linha.className = 'comp-mais';
    const sp = document.createElement('span');
    sp.textContent = '… mais ' + restantes + (restantes === 1 ? ' mês' : ' meses');
    linha.append(sp, botao('ver todos', 'link-btn', () => {
      compVerTodos = true;
      desenhar();
    }));
    c.appendChild(linha);
  }

  const t = document.createElement('dl');
  t.className = 'res-tabela';
  [
    ['Falta pagar no total', dinheiro(r.comprometidoTotal)],
    ['Última prestação', mesExtenso(r.ultimaPrestacao)]
  ].forEach(par => {
    const dt = document.createElement('dt'); dt.textContent = par[0];
    const dd = document.createElement('dd'); dd.textContent = par[1];
    t.append(dt, dd);
  });
  c.appendChild(t);

  c.appendChild(p('Isto é dinheiro dos próximos meses que já tem dono. O "Livre até ao fim do mês" de cada um destes meses já conta com ele.', 'res-nota'));

  /* Uma compra liquidada mais cedo deixa cá dentro movimentos futuros que
     já não existem. Cada grupo tem por onde sair. */
  if (r.gruposActivos.length) {
    c.appendChild(p('Compras a prestações', 'res-subtitulo'));
    const gu = document.createElement('ul');
    gu.className = 'comp-grupos';
    r.gruposActivos.forEach(g => {
      const info = catInfo('saida', g.categoria);
      const li = document.createElement('li');

      const txt = document.createElement('div');
      txt.className = 'comp-g-txt';
      const b = document.createElement('b');
      b.textContent = info.emoji + ' ' + (g.descricao || info.nome);
      const sp = document.createElement('span');
      const nn = g.proxima ? g.proxima.parc.n : g.de;
      sp.textContent = nn + '/' + g.de + ' · ' + dinheiro(g.valor) + ' por mês · faltam ' +
        dinheiro(Math.round(g.porPagar * 100) / 100);
      txt.append(b, sp);

      li.append(txt, botao('Já paguei tudo', 'mini-btn', () => {
        const antiga = li.querySelector('.pergunta');
        if (antiga) antiga.remove();
        const cx = caixaPergunta(
          'Apagar as ' + g.quantasFaltam + (g.quantasFaltam === 1 ? ' prestação que falta' : ' prestações que faltam') + '?', [
            ['Apagar', () => apagarRestoDoGrupo(g.g)],
            ['Cancelar', () => cx.remove()]
          ]);
        li.appendChild(cx);
      }));
      gu.appendChild(li);
    });
    c.appendChild(gu);
  }

  desenharSinal(r, c);

  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Vou comprar uma coisa a prestações', 'btn btn-line btn-peq',
    () => abrirSimulador(null)));
  c.appendChild(acoes);
}

/* 1b · O sinal de aflição. Dentro do bloco, nunca em popup, nunca a
   vermelho, nunca com ponto de exclamação. Cada nível termina a tirar a
   culpa de cima da pessoa. */
function desenharSinal(r, c) {
  const s = r.sinalAflicao;
  if (!s) return;

  const cx = document.createElement('div');
  cx.className = 'sinal';

  if (s.consumo) {
    cx.appendChild(p('Há compras parceladas em ' + s.cats.join(' e ') +
      '. Parcelar coisas que se gastam dentro do mês costuma ser sinal de que o mês não está a fechar — não de má gestão.', 'res-nota'));
  }
  if (s.peso) {
    cx.appendChild(p('Das suas entradas de um mês normal (' + dinheiro(r.R) + '), ' +
      dinheiro(s.porMes) + ' já estão comprometidos em prestações — ' + s.pct + '%.', 'res-nota'));
  }
  if (s.nivel === 3) {
    cx.appendChild(p('Quando o mês não fecha, a prestação seguinte tapa o buraco da anterior. Isso não se resolve com orçamento nenhum. Resolve-se com uma despesa fixa a menos ou com rendimento a mais.', 'res-nota'));
    if (APOIO_ENDIVIDADO && APOIO_ENDIVIDADO.texto && APOIO_ENDIVIDADO.url) {
      const linha = p(APOIO_ENDIVIDADO.texto + ' ', 'res-nota');
      const a = document.createElement('a');
      a.href = APOIO_ENDIVIDADO.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = APOIO_ENDIVIDADO.rotulo || 'Ver';
      linha.appendChild(a);
      cx.appendChild(linha);
    }
  }

  c.appendChild(cx);
}

/* ============================================================
   3 · O BALANÇO — desenhar

   Regra de desenho, e não é decorativa: nada aqui leva cor de alarme,
   nota, estrela ou emoji de cara. Um balanço com um número a vermelho
   deixa de ser um espelho e passa a ser uma avaliação — e quem é avaliado
   deixa de lançar as despesas que ficam mal na fotografia, que é a app a
   corromper os seus próprios dados.
   ============================================================ */
function marcarBalancoVisto(k) {
  if (!k || balancoPrefs.vistos.indexOf(k) !== -1) return;
  balancoPrefs.vistos.push(k);
  if (balancoPrefs.vistos.length > 36) {
    balancoPrefs.vistos = balancoPrefs.vistos.slice(-36);
  }
  guardarPrefs();
}

function abrirBalanco(k) {
  balancoAberto = k;
  marcarBalancoVisto(k);
  desenhar();
  const el = document.getElementById('bloco-balanco');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharBalanco() {
  balancoAberto = null;
  desenhar();
}

/* A entrada é uma linha, nunca um popup no dia 1. Um toque, dispensável, e
   depois o balanço continua acessível ao navegar para o mês. */
function desenharBalancoLinha(r) {
  const el = document.getElementById('balanco-linha');
  if (!el) return;
  el.innerHTML = '';

  const esconder = !r.balancoAlvo ||
    balancoAberto === r.balancoAlvo ||
    (r.ehMesCorrente && !r.balancoConvite);
  if (esconder) { el.hidden = true; return; }

  el.hidden = false;
  const nome = mesExtenso(r.balancoAlvo, true);

  if (r.ehMesCorrente) {
    const sp = document.createElement('span');
    sp.textContent = 'O mês de ' + nome + ' fechou.';
    el.appendChild(sp);
    el.appendChild(botao('Ver como correu', 'link-btn', () => abrirBalanco(r.balancoAlvo)));
    el.appendChild(botao('Agora não', 'link-btn', () => {
      marcarBalancoVisto(r.balancoAlvo);
      desenhar();
    }));
  } else {
    el.appendChild(botao('Ver como correu ' + nome, 'link-btn',
      () => abrirBalanco(r.balancoAlvo)));
  }
}

function balParte(c) {
  return dinheiro(c.mv) + ' contra ' + dinheiro(c.pv);
}

/* Sem adjectivo nenhum: "gastou mais", nunca "gastou demais". */
function balFraseMencoes(b) {
  const m = b.mencoes;
  if (!m) return null;
  const nome = c => catInfo('saida', c.id).nome;

  if (m.sobe && m.desce) {
    return 'Gastou mais em ' + nome(m.sobe) + ' do que em ' + b.antNome +
      ' (' + balParte(m.sobe) + ') e menos em ' + nome(m.desce) +
      ' (' + balParte(m.desce) + ').';
  }
  if (m.sobe) {
    return 'Gastou mais em ' + nome(m.sobe) + ' do que em ' + b.antNome +
      ' (' + balParte(m.sobe) + ').';
  }
  let t = 'Gastou menos em ' + nome(m.desce) + ' do que em ' + b.antNome +
    ' (' + balParte(m.desce) + ')';
  if (m.desce2) t += ' e em ' + nome(m.desce2) + ' (' + balParte(m.desce2) + ')';
  return t + '.';
}

function balTabelaLado(pares) {
  const t = document.createElement('dl');
  t.className = 'res-tabela';
  pares.forEach(par => {
    const dt = document.createElement('dt'); dt.textContent = par[0];
    const dd = document.createElement('dd'); dd.textContent = par[1];
    t.append(dt, dd);
  });
  return t;
}

function desenharBalanco(r) {
  const bloco = document.getElementById('bloco-balanco');
  const c = document.getElementById('balanco-corpo');
  const tit = document.getElementById('balanco-titulo');
  if (!bloco || !c) return;

  c.innerHTML = '';
  const b = r.balanco;
  if (!b) { bloco.hidden = true; return; }
  bloco.hidden = false;
  if (tit) tit.textContent = 'Como correu ' + b.nome;

  const fechar = () => {
    const acoes = document.createElement('div');
    acoes.className = 'res-acoes';
    acoes.appendChild(botao('Fechar', 'mini-btn', fecharBalanco));
    c.appendChild(acoes);
  };

  /* Meia dúzia de movimentos lançados diria que se gastou menos em tudo.
     Dizer que não dá é mais honesto do que comparar na mesma. */
  if (b.poucos) {
    c.appendChild(p(comMaiuscula(b.nome) +
      ' tem poucos movimentos lançados para se comparar.', 'res-nota'));
    fechar();
    return;
  }

  const grelha = document.createElement('div');
  grelha.className = 'bal-grelha';

  const esq = [
    ['Entrou', dinheiro(b.entrou)],
    ['Saiu', dinheiro(b.saiu)]
  ];
  if (!b.apertado) esq.push(['Guardou', dinheiro(b.guardou)]);
  esq.push(b.livre < 0
    ? ['Faltou', dinheiro(Math.abs(b.livre))]
    : ['Sobrou', dinheiro(b.livre)]);
  grelha.appendChild(balTabelaLado(esq));

  const dir = document.createElement('div');
  if (b.antMes) {
    /* A referência é a própria pessoa no mês anterior. Não há aqui coluna
       nenhuma com uma média, um recomendado ou um "as pessoas como você". */
    const env = document.createElement('div');
    env.className = 'bal-tab-env';
    const tab = document.createElement('table');
    tab.className = 'bal-tab';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    ['', b.nome, b.antNome].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    tab.appendChild(thead);

    const tbody = document.createElement('tbody');
    const linhas = [
      ['Essencial', b.pctEss === null ? '—' : b.pctEss + '%',
                    b.antPctEss === null ? '—' : b.antPctEss + '%'],
      ['Dá para adiar', b.pctAdi === null ? '—' : b.pctAdi + '%',
                        b.antPctAdi === null ? '—' : b.antPctAdi + '%']
    ];
    if (!b.apertado) {
      linhas.push(['Guardou', dinheiro(b.guardou), dinheiro(b.antGuardou)]);
    }
    linhas.forEach(l => {
      const f = document.createElement('tr');
      l.forEach((cel, i) => {
        const td = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) td.scope = 'row';
        td.textContent = cel;
        f.appendChild(td);
      });
      tbody.appendChild(f);
    });
    tab.appendChild(tbody);
    env.appendChild(tab);
    dir.appendChild(env);
  } else {
    dir.appendChild(p('Ainda não há mês anterior para comparar.', 'res-nota'));
  }
  grelha.appendChild(dir);
  c.appendChild(grelha);

  if (b.maiores.length) {
    c.appendChild(p('As maiores saídas de ' + b.nome, 'res-subtitulo'));
    const ul = document.createElement('ul');
    ul.className = 'res-maiores';
    b.maiores.forEach(x => {
      const info = catInfo('saida', x.id);
      const li = document.createElement('li');
      const nb = document.createElement('b');
      nb.textContent = info.emoji + ' ' + info.nome;
      const sp = document.createElement('span');
      sp.textContent = dinheiro(x.valor);
      li.append(nb, sp);
      ul.appendChild(li);
    });
    c.appendChild(ul);
  }

  const frase = balFraseMencoes(b);
  if (frase) c.appendChild(p(frase, 'res-nota'));

  if (b.guardouEm) {
    c.appendChild(p('Guardou em ' + b.guardouEm.n + ' dos últimos ' +
      b.guardouEm.de + ' meses.', 'res-nota'));
  }

  /* A única frase a que a app tem direito a opinião — e vem sempre com a
     segunda parte, que tira a culpa de cima da pessoa e põe metade dela na
     própria app. Sem a segunda parte isto é uma acusação. */
  if (b.opiniao) {
    c.appendChild(p('Em ' + b.nome + ' entraram ' + dinheiro(b.opiniao) +
      ' acima do normal e no fim do mês não ficou nada.', 'bal-opiniao'));
    c.appendChild(p('É o padrão mais comum que há, e é exactamente o que a app tenta apanhar no momento em que o dinheiro entra.', 'res-nota'));
  }

  if (b.apertado) {
    c.appendChild(p(b.pctEssEntrou !== null
      ? ('Em ' + b.nome + ' o essencial levou ' + b.pctEssEntrou +
         '% do que entrou. Não há aqui nada que tenha corrido mal por sua causa.')
      : ('Em ' + b.nome + ' não há entradas lançadas, por isso o que saiu não tem com que ser comparado.'),
      'res-nota'));
  }

  fechar();
}

/* ============================================================
   5 · O MEU PLANO — um construtor guiado, não um assistente

   Seis perguntas fechadas, quase todas já respondidas pelos movimentos
   lançados: a pessoa confirma em vez de escrever. Todas têm uma resposta
   que é "não sei" a sério — porque "não sei" é a resposta verdadeira de
   muita gente e obrigá-la a escolher outra coisa é obrigá-la a mentir aos
   próprios dados.

   E o documento que sai daqui não é prosa gerada: é forma fixa, com os
   números da própria pessoa, e cada frase escolhida de um catálogo por
   regras. Nenhuma frase deste ficheiro nomeia uma instituição, um produto
   ou um sítio onde pôr dinheiro. Isso não é uma instrução que se possa
   contornar — é uma coisa que não está escrita em lado nenhum e por isso
   não pode sair.
   ============================================================ */
function dataExtenso(d) {
  return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
}

function abrirPlano() {
  planoAberto = true;
  planoEssAberto = false;
  if (planoGuardado && planoGuardado.respostas) {
    planoResp = Object.assign({}, planoGuardado.respostas);
    planoPasso = PLANO_PASSOS;      // já o fez: abre no documento, refeito de hoje
  } else {
    planoResp = {};
    planoPasso = 0;
  }
  desenhar();
  const el = document.getElementById('bloco-plano');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharPlano() { planoAberto = false; desenhar(); }

function refazerPlano() {
  planoPasso = 0;
  planoEssAberto = false;
  desenhar();
}

function responderPlano(chave, valor) {
  planoResp[chave] = valor;
  planoEssAberto = false;
  planoPasso++;
  desenhar();
}

/* Uma pergunta: o número do passo, o que a app já sabe, e botões. Nunca
   um campo de texto — o valor por mês mexe-se de cinco em cinco, para não
   abrir teclado nenhum a quem só quer confirmar. */
function planoPergunta(c, n, textos, opcoes, chave) {
  c.appendChild(p(n + ' de ' + PLANO_PASSOS, 'plano-passo'));
  textos.forEach(t => c.appendChild(p(t, 'plano-q')));

  const grelha = document.createElement('div');
  grelha.className = 'plano-ops';
  opcoes.forEach(o => {
    const b = botao(o[0], 'plano-op', o[1]);
    if (o[2] !== undefined) b.setAttribute('aria-pressed', String(planoResp[chave] === o[2]));
    grelha.appendChild(b);
  });
  c.appendChild(grelha);
}

function planoNav(c, n) {
  const nav = document.createElement('div');
  nav.className = 'res-acoes';
  if (n > 1) nav.appendChild(botao('Voltar', 'mini-btn', () => {
    planoPasso--; planoEssAberto = false; desenhar();
  }));
  nav.appendChild(botao('Fechar', 'mini-btn', fecharPlano));
  c.appendChild(nav);
}

/* Passo 2, segunda resposta: os interruptores de essencial, na lista de
   categorias. É a mesma preferência que o formulário já usa, por isso
   corrigir aqui corrige o `E` de todos os meses de uma vez. */
function planoInterruptores(c) {
  const ul = document.createElement('ul');
  ul.className = 'plano-ess';
  CATEGORIAS.saida.filter(cat => cat.id !== 'reserva').forEach(cat => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = cat.emoji + ' ' + cat.nome;
    const sel = document.createElement('div');
    sel.className = 'ess-sel';
    [['Essencial', true], ['Dá para adiar', false]].forEach(par => {
      const bt = botao(par[0], '', () => {
        essenciais[cat.id] = par[1];
        guardarPrefs();
        desenhar();
      });
      bt.setAttribute('aria-pressed', String(padraoCategoria(cat.id) === par[1]));
      sel.appendChild(bt);
    });
    li.append(b, sel);
    ul.appendChild(li);
  });
  c.appendChild(ul);
}

/* O degrau que este plano persegue. A resposta sobre "para que é" muda o
   texto e o primeiro degrau — nunca a matemática. */
function planoDegrau(r, para) {
  if (!r.degraus || !r.degraus.length) return null;
  const desde = (para === 'trabalho') ? 1 : 0;
  return r.degraus.find((d, i) => i >= desde && d.valor > r.reserva) ||
         r.degraus.find(d => d.valor > r.reserva) || null;
}

const PLANO_PARA = {
  'avaria':    'O primeiro degrau é ter com que pagar uma avaria sem pedir emprestado.',
  'trabalho':  'O primeiro degrau é ter um mês de despesas essenciais de lado, para o caso de ficar sem trabalho.',
  'divida':    'O primeiro degrau é ter de onde tirar quando aparecer uma despesa, para não abrir outra dívida a pagar a que está a acabar.',
  'nao-sei':   'Não faz falta saber para que é. Uma reserva serve para o que aparecer, e a resposta costuma chegar sozinha.'
};

function juntarFrase(lista) {
  if (lista.length === 1) return lista[0];
  return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1];
}

function desenharPlano(r) {
  const bloco = document.getElementById('bloco-plano');
  const c = document.getElementById('plano-corpo');
  if (!bloco || !c) return;
  c.innerHTML = '';
  bloco.hidden = !planoAberto;
  if (!planoAberto) return;

  /* Sem meses que cheguem não há plano nenhum para dar, e inventar um com
     dois movimentos era a primeira promessa que a app não cumpria. */
  if (r.modo === 'sem-dados' || r.R === null || r.E === null || r.moedaMista) {
    c.appendChild(p(r.moedaMista
      ? 'Há movimentos em mais do que uma moeda. Enquanto for assim não dá para fazer as contas deste plano.'
      : 'Ainda não há registos que cheguem para fazer um plano. Lance as despesas de um mês inteiro e este botão passa a fazer sentido.',
      'res-nota'));
    planoNav(c, 0);
    return;
  }

  const passo = Math.min(planoPasso, PLANO_PASSOS);

  if (passo === 0) {
    planoPergunta(c, 1, [
      'Pelo que já lançou, entram por mês cerca de ' + dinheiro(r.R) + '.'
    ], [
      ['Está certo', () => responderPlano('rendimento', 'certo'), 'certo'],
      ['Entra mais, falta lançar', () => responderPlano('rendimento', 'mais'), 'mais'],
      ['Varia muito de mês para mês', () => responderPlano('rendimento', 'varia'), 'varia']
    ], 'rendimento');
    planoNav(c, 1);
    return;
  }

  if (passo === 1) {
    planoPergunta(c, 2, [
      'Do que sai por mês, cerca de ' + dinheiro(r.E) + ' é essencial — o que não dá para adiar.'
    ], [
      ['Está certo', () => responderPlano('essenciais', 'certo'), 'certo'],
      ['Há coisas mal marcadas', () => { planoEssAberto = true; desenhar(); }, 'corrigi'],
      ['Não sei ao certo', () => responderPlano('essenciais', 'nao-sei'), 'nao-sei']
    ], 'essenciais');
    if (planoEssAberto) {
      c.appendChild(p('Toque no que estiver trocado. Fica assim em todos os meses.', 'res-nota'));
      planoInterruptores(c);
      const ac = document.createElement('div');
      ac.className = 'res-acoes';
      ac.appendChild(botao('Já está', 'btn btn-gold btn-peq',
        () => responderPlano('essenciais', 'corrigi')));
      c.appendChild(ac);
    }
    planoNav(c, 2);
    return;
  }

  if (passo === 2) {
    const tem = r.comprometidoPorMes && r.ultimaPrestacao;
    planoPergunta(c, 3, tem ? [
      'A app vê ' + dinheiro(r.comprometidoPorMes) + ' por mês em prestações, até ' +
      mesExtenso(r.ultimaPrestacao) + '.'
    ] : [
      'A app não vê nenhuma prestação nem crédito por pagar.'
    ], [
      [tem ? 'Está certo' : 'É isso mesmo', () => responderPlano('dividas', 'certo'), 'certo'],
      ['Há mais que a app não sabe', () => responderPlano('dividas', 'mais'), 'mais'],
      ['Não sei ao certo', () => responderPlano('dividas', 'nao-sei'), 'nao-sei']
    ], 'dividas');
    planoNav(c, 3);
    return;
  }

  if (passo === 3) {
    planoPergunta(c, 4, ['Para que é a reserva?'], [
      ['Não faço ideia', () => responderPlano('para', 'nao-sei'), 'nao-sei'],
      ['Uma avaria', () => responderPlano('para', 'avaria'), 'avaria'],
      ['Ficar sem trabalho', () => responderPlano('para', 'trabalho'), 'trabalho'],
      ['Acabar uma dívida', () => responderPlano('para', 'divida'), 'divida']
    ], 'para');
    planoNav(c, 4);
    return;
  }

  if (passo === 4) {
    /* Para um assalariado em Portugal é a pergunta que mais muda o plano
       de todas — dois meses por ano com dinheiro a mais decidem se há
       reserva ou não. */
    planoPergunta(c, 5, [subsidioPais().pergunta], [
      ['Sim', () => responderPlano('subsidios', 'sim'), 'sim'],
      ['Não', () => responderPlano('subsidios', 'nao'), 'nao'],
      ['Não sei', () => responderPlano('subsidios', 'nao-sei'), 'nao-sei']
    ], 'subsidios');
    planoNav(c, 5);
    return;
  }

  /* Passo 6 — quanto por mês. Proposto de metade da folga, e mexe-se de
     cinco em cinco: confirmar em vez de escrever. */
  if (passo === 5) {
    const proposto = planoResp.mensal !== undefined
      ? planoResp.mensal
      : (r.proposta || (r.folga > 0 ? Math.max(5, Math.floor(r.folga / 2)) : 0));
    const mexer = d => {
      planoResp.mensal = Math.max(0, Math.round((proposto + d) * 100) / 100);
      desenhar();
    };
    const textos = proposto > 0
      ? ['Pelas contas, dava para guardar cerca de ' + dinheiro(proposto) + ' por mês.']
      : ['Com o que entra e o que é essencial, não sobra nada por mês.'];
    const ops = proposto > 0
      ? [
          ['Está bem', () => responderPlano('mensal', proposto)],
          ['Menos', () => mexer(-PLANO_DEGRAU)],
          ['Mais', () => mexer(PLANO_DEGRAU)],
          ['Não consigo nada', () => responderPlano('mensal', 0)]
        ]
      : [
          ['Está certo', () => responderPlano('mensal', 0)],
          ['Consigo guardar alguma coisa', () => mexer(PLANO_DEGRAU)]
        ];
    planoPergunta(c, 6, textos, ops, '_');
    planoNav(c, 6);
    return;
  }

  desenharPlanoDocumento(r, c);
}

/* ---------- o documento ----------
   Forma fixa, números da pessoa, frases escolhidas de um catálogo. */
function desenharPlanoDocumento(r, c) {
  const resp = planoResp;
  const mensal = (typeof resp.mensal === 'number') ? resp.mensal : (r.mensal || 0);
  const aperto = r.modo === 'aperto' || r.folga === null || r.folga <= 0;
  const temPrest = !!(r.comprometidoPorMes && r.ultimaPrestacao);

  c.appendChild(p('feito a ' + dataExtenso(hoje), 'plano-data'));

  /* --- o que se sabe --- */
  c.appendChild(p('O que se sabe', 'res-subtitulo'));
  const linhas = [
    ['Entra por mês', dinheiro(r.R)],
    ['Essencial por mês', dinheiro(r.E)]
  ];
  linhas.push(aperto ? ['Falta', dinheiro(r.folga)] : ['Sobra', dinheiro(r.folga)]);
  if (temPrest) {
    linhas.push(['Comprometido em prestações',
      dinheiro(r.comprometidoPorMes) + '/mês até ' + mesExtenso(r.ultimaPrestacao, true)]);
  }
  const t = document.createElement('dl');
  t.className = 'res-tabela';
  linhas.forEach(par => {
    const dt = document.createElement('dt'); dt.textContent = par[0];
    const dd = document.createElement('dd'); dd.textContent = par[1];
    t.append(dt, dd);
  });
  c.appendChild(t);

  /* O que a pessoa disse que a app não vê fica escrito — senão o plano
     está a fazer contas com um número que ela já disse estar errado. */
  if (resp.rendimento === 'mais') {
    c.appendChild(p('Disse que entra mais do que a app vê. Lance o que falta e este plano refaz-se sozinho.', 'res-nota'));
  } else if (resp.rendimento === 'varia') {
    /* "o mais seguro" ficava aqui a saber a produto financeiro, num sítio
       onde a app não pode nomear nenhum. A palavra sai. */
    c.appendChild(p('Disse que varia muito de mês para mês. A conta usa o valor do meio dos últimos meses, que é o que menos se engana quando o rendimento oscila.', 'res-nota'));
  }
  if (resp.dividas === 'mais') {
    c.appendChild(p('Disse que há prestações ou créditos que a app não vê. Lance-os e os números acima mudam.', 'res-nota'));
  } else if (resp.dividas === 'nao-sei') {
    c.appendChild(p('Disse que não sabe ao certo o que tem em prestações. Não faz mal: o que aparecer lançado entra nas contas a partir daí.', 'res-nota'));
  }
  if (resp.essenciais === 'nao-sei') {
    c.appendChild(p('Disse que não sabe ao certo o que é essencial. A app usa o que está marcado hoje, e muda quando mudar uma marca.', 'res-nota'));
  }

  const passos = [];

  if (aperto) {
    /* Em aperto o plano não desaparece — muda. Não há aqui um plano de
       poupança para dar, e fingir que há é a mentira mais fácil deste
       produto. */
    c.appendChild(p('Não há aqui um plano de poupança para lhe dar, porque com estes números não sobra nada. Isto é o que a app consegue fazer consigo:', 'plano-lead'));

    const pesos = r.maioresEssenciais.slice(0, 2)
      .map(x => catInfo('saida', x.id).nome + ' (' + dinheiro(x.valor) + ')');
    if (temPrest) pesos.push('as prestações (' + dinheiro(r.comprometidoPorMes) + ' por mês)');
    if (pesos.length) {
      passos.push(pesos.length === 1
        ? ('A despesa fixa maior é ' + pesos[0] + '. É a única com tamanho para mudar alguma coisa.')
        : ('As despesas fixas maiores são ' + juntarFrase(pesos) + '. São as que têm tamanho para mudar alguma coisa.'));
    }
    if (resp.subsidios === 'sim') {
      passos.push(comMaiuscula(subsidioPais().quando) + ' entra dinheiro a mais. É a única altura do ano em que dá para guardar, e a app pergunta-lhe nesse dia.');
    } else if (resp.subsidios === 'nao-sei') {
      passos.push('Se receber ' + subsidioPais().nome + ', é aí que dá para guardar. Vale a pena confirmar no recibo.');
    }
    passos.push(temPrest
      ? 'Não parcelar mais nada. Cada prestação nova tira ao mês seguinte.'
      : 'Não parcelar nada enquanto for assim. Cada prestação nova tira ao mês seguinte.');
  } else {
    if (mensal > 0) {
      passos.push(r.diaSalario
        ? ('Guardar ' + dinheiro(mensal) + ' no dia ' + r.diaSalario +
           ', quando o salário entrar. A app pergunta-lhe nesse dia.')
        : ('Guardar ' + dinheiro(mensal) + ' no dia em que o salário entrar. A app pergunta-lhe nesse dia.'));
    } else {
      passos.push('Este mês não guardar nada. Disse que não consegue, e a app não lhe pede nada enquanto for assim.');
    }
    if (temPrest) {
      passos.push('Não parcelar nada até ' + mesExtenso(r.ultimaPrestacao, true) + '. Já tem ' +
        dinheiro(r.comprometidoPorMes) + ' por mês com dono.');
    }
  }

  if (passos.length) {
    c.appendChild(p(aperto ? 'O que dá para fazer' : 'O que faz este mês', 'res-subtitulo'));
    const ol = document.createElement('ol');
    ol.className = 'plano-passos';
    passos.forEach(x => {
      const li = document.createElement('li');
      li.textContent = x;
      ol.appendChild(li);
    });
    c.appendChild(ol);
  }

  /* --- os meses do subsídio, fora do aperto --- */
  if (!aperto && resp.subsidios !== 'nao') {
    c.appendChild(p('O que faz nos meses do subsídio', 'res-subtitulo'));
    const ol = document.createElement('ol');
    ol.className = 'plano-passos';
    ol.start = passos.length + 1;
    const li = document.createElement('li');
    li.textContent = resp.subsidios === 'sim'
      ? comMaiuscula(subsidioPais().quando) + ' entra dinheiro a mais. Guardar metade é o que decide se chega ao fim do ano com reserva ou sem ela.'
      : 'Se receber ' + subsidioPais().nome + ', é ' + subsidioPais().quando + ' que dá para guardar mais. Vale a pena confirmar no recibo.';
    ol.appendChild(li);
    c.appendChild(ol);
  }

  /* --- onde isto chega --- */
  c.appendChild(p('Onde isto chega', 'res-subtitulo'));
  if (PLANO_PARA[resp.para]) c.appendChild(p(PLANO_PARA[resp.para], 'res-nota'));

  const alvo = planoDegrau(r, resp.para);
  /* Metade do dinheiro extra do ano, espalhada por doze meses. Em Portugal
     são dois subsídios, logo metade vale um mês de rendimento por ano; no
     Brasil o 13.º é um só, logo vale meio. Conta simples e verificável; nada
     de retorno projectado, que não existe. */
  const sub = subsidioPais();
  const extra = (resp.subsidios === 'sim' && r.R > 0) ? (r.R * sub.mesesAno / 2) / 12 : 0;
  const ritmo = mensal + extra;

  if (!alvo) {
    c.appendChild(p('Já tem mais do que três meses de despesas essenciais guardados. A partir daqui a pergunta deixa de ser quanto guardar, e isso não se decide numa aplicação de contas.', 'res-nota'));
  } else if (ritmo <= 0) {
    c.appendChild(p('Sem nada por mês não há data para dar. O degrau seguinte é ' +
      alvo.rotulo + ' (' + dinheiro(alvo.valor) + '), e a app volta a fazer esta conta assim que sobrar alguma coisa.', 'res-nota'));
  } else {
    const falta = alvo.valor - r.reserva;
    const n = Math.ceil(falta / ritmo);
    const comSub = extra > 0 ? ' mais ' + sub.metade : '';
    if (n > 60) {
      c.appendChild(p('A ' + dinheiro(mensal) + ' por mês' + comSub +
        ', chegar a ' + alvo.rotulo + ' (' + dinheiro(alvo.valor) +
        ') leva mais de cinco anos. O número útil não é a data — é o degrau a seguir.', 'res-nota'));
    } else {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + n, 1);
      c.appendChild(p('A ' + dinheiro(mensal) + ' por mês' + comSub +
        ', chega a ' + alvo.rotulo + ' (' + dinheiro(alvo.valor) + ') por volta de ' +
        MESES[d.getMonth()] + ' de ' + d.getFullYear() + '.', 'res-nota'));
    }
  }

  /* Obrigatória em todas as versões, e não se corta. Alguém vai cumprir
     este plano e não chegar lá, porque a vida aconteceu. */
  c.appendChild(p('É uma conta com o que sabe hoje. Muda quando a vida mudar.', 'plano-fecho'));

  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Guardar este plano', 'btn btn-gold btn-peq', () => {
    planoGuardado = {
      feito: isoLocal(new Date()),
      respostas: Object.assign({}, planoResp),
      versao: 1
    };
    guardarPrefs();
    desenhar();
    mostrarAviso('Plano guardado. Volta a abrir sempre com os números de hoje.', 'ok');
  }));
  acoes.appendChild(botao('Refazer', 'mini-btn', refazerPlano));
  acoes.appendChild(botao('Fechar', 'mini-btn', fecharPlano));
  c.appendChild(acoes);
}

/* ============================================================
   1b · "ANTES DE PARCELAR" — a mesma aritmética, antes da compra

   Nunca se pergunta a taxa de juro. Ninguém a sabe e não é precisa: o que
   se paga a mais é `n × prestação − preço a pronto`. Exacto, verificável,
   sem pressupostos.
   ============================================================ */
function abrirSimulador(pre) {
  simAberto = true;
  if (pre) {
    simVals = {
      pronto: '',
      prestacao: pre.prestacao != null ? String(pre.prestacao).replace('.', ',') : '',
      vezes: pre.vezes != null ? String(pre.vezes) : ''
    };
  }
  desenharSimulador();
  const b = document.getElementById('bloco-simulador');
  if (b) {
    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const primeiro = document.getElementById('sim-pronto');
    if (primeiro) setTimeout(() => primeiro.focus(), 250);
  }
}

function fecharSimulador() {
  simAberto = false;
  desenharSimulador();
}

function desenharSimulador() {
  const bloco = document.getElementById('bloco-simulador');
  const c = document.getElementById('simulador-corpo');
  if (!bloco || !c) return;
  bloco.hidden = !simAberto;
  /* Ao fechar apaga-se a marca de "já construído": sem isto, reabrir
     encontrava o contentor vazio e não desenhava nada. */
  if (!simAberto) { c.innerHTML = ''; delete c.dataset.pronto; return; }
  if (c.dataset.pronto === '1') { actualizarSimulador(); return; }

  c.innerHTML = '';
  c.dataset.pronto = '1';

  [
    ['sim-pronto', 'Quanto custa a pronto?', 'se souber', 'pronto', 'decimal'],
    ['sim-prestacao', 'Quanto é cada prestação?', '', 'prestacao', 'decimal'],
    ['sim-vezes', 'Quantas vezes?', '', 'vezes', 'numeric']
  ].forEach(campo => {
    const d = document.createElement('div');
    d.className = 'field';
    const lb = document.createElement('label');
    lb.setAttribute('for', campo[0]);
    lb.textContent = campo[1];
    if (campo[2]) {
      const s = document.createElement('span');
      s.style.textTransform = 'none';
      s.style.letterSpacing = '0';
      s.textContent = ' (' + campo[2] + ')';
      lb.appendChild(s);
    }
    const inp = document.createElement('input');
    inp.id = campo[0];
    inp.type = 'text';
    inp.inputMode = campo[4];
    inp.autocomplete = 'off';
    inp.placeholder = campo[4] === 'numeric' ? '12' : '0,00';
    inp.value = simVals[campo[3]] || '';
    inp.addEventListener('input', () => {
      simVals[campo[3]] = inp.value;
      actualizarSimulador();
    });
    d.append(lb, inp);
    c.appendChild(d);
  });

  const res = document.createElement('div');
  res.className = 'sim-res';
  res.id = 'sim-res';
  c.appendChild(res);

  const acoes = document.createElement('div');
  acoes.className = 'res-acoes';
  acoes.appendChild(botao('Fechar', 'mini-btn', fecharSimulador));
  c.appendChild(acoes);

  actualizarSimulador();
}

function actualizarSimulador() {
  const el = document.getElementById('sim-res');
  if (!el) return;
  el.innerHTML = '';

  const prest = lerValor(simVals.prestacao);
  const vezes = parseInt(String(simVals.vezes || '').replace(/\D/g, ''), 10);
  const pronto = lerValor(simVals.pronto);

  if (!prest || !isFinite(vezes) || vezes < 1) {
    el.appendChild(p('Escreva quanto é cada prestação e quantas vezes. O preço a pronto é o único opcional.', 'res-nota'));
    return;
  }

  const total = Math.round(prest * vezes * 100) / 100;
  const aMais = pronto ? Math.round((total - pronto) * 100) / 100 : null;

  const t = document.createElement('dl');
  t.className = 'res-tabela';
  const linhas = [['Paga no total', dinheiro(total)]];
  if (aMais !== null) linhas.push(['Paga a mais', dinheiro(Math.max(0, aMais))]);
  linhas.push(['Por mês', dinheiro(prest)]);
  linhas.forEach(par => {
    const dt = document.createElement('dt'); dt.textContent = par[0];
    const dd = document.createElement('dd'); dd.textContent = par[1];
    t.append(dt, dd);
  });
  el.appendChild(t);

  let mesesPoupanca = null;
  if (aMais === null) {
    el.appendChild(p('Sem o preço a pronto não dá para saber quanto está a pagar a mais.', 'res-nota'));
  } else if (aMais <= 0) {
    el.appendChild(p('Com estes números não paga nada a mais do que o preço a pronto.', 'res-nota'));
  } else {
    mesesPoupanca = Math.ceil(pronto / prest);
    el.appendChild(p('Se guardasse ' + dinheiro(prest) + ' por mês, ao fim de ' + mesesPoupanca +
      (mesesPoupanca === 1 ? ' mês' : ' meses') + ' tinha os ' + dinheiro(pronto) +
      ' e comprava sem pagar os ' + dinheiro(aMais) + ' a mais.', 'res-nota'));
  }

  /* Esta frase é obrigatória e não se corta. Sem ela isto é um sermão; com
     ela é uma conta. Parcelar uma máquina de lavar avariada é a decisão
     certa, e a app tem de o dizer — senão perde a credibilidade toda no
     primeiro caso em que a pessoa sabe mais do que ela. */
  el.appendChild(p('Isto é só a conta. A decisão é sua — há coisas que não esperam ' +
    (mesesPoupanca ? mesesPoupanca + (mesesPoupanca === 1 ? ' mês' : ' meses') : 'meses') +
    ', e uma máquina de lavar avariada é uma delas.', 'sim-fecho'));
}

/* ============================================================
   1a · O CAMINHO "PAGUEI A PRESTAÇÕES", NO FORMULÁRIO
   ============================================================ */
function fecharParc() {
  parcAberto = false;
  parcVezes = null;
  parcDividido = false;
  parcOfertaVista = false;
  const caixa = document.getElementById('parc-caixa');
  const chip = document.getElementById('parc-abre');
  if (caixa) { caixa.hidden = true; caixa.innerHTML = ''; }
  if (chip) chip.setAttribute('aria-expanded', 'false');
}

/* A etiqueta só existe nas saídas, e não existe na categoria da reserva —
   guardar dinheiro não se parcela. */
function desenharParc() {
  const zona = document.getElementById('parc');
  if (!zona) return;
  const sel = document.getElementById('f-categoria');
  const mostrar = tipoActual === 'saida' && (!sel || sel.value !== 'reserva');
  zona.hidden = !mostrar;
  if (!mostrar && parcAberto) fecharParc();
}

function alternarParc() {
  if (parcAberto) { fecharParc(); return; }
  parcAberto = true;
  const chip = document.getElementById('parc-abre');
  if (chip) chip.setAttribute('aria-expanded', 'true');
  construirCaixaParc();
}

function construirCaixaParc() {
  const caixa = document.getElementById('parc-caixa');
  if (!caixa) return;
  caixa.hidden = false;
  caixa.innerHTML = '';

  caixa.appendChild(p('Quantas vezes', 'parc-rot'));

  const grelha = document.createElement('div');
  grelha.className = 'parc-vezes';
  grelha.setAttribute('role', 'group');
  grelha.setAttribute('aria-label', 'Quantas prestações');
  PARC_VEZES.forEach(n => {
    const b = botao(String(n), 'parc-n', () => escolherVezes(n));
    b.dataset.n = String(n);
    b.setAttribute('aria-pressed', String(parcVezes === n));
    grelha.appendChild(b);
  });
  const outro = botao('outro', 'parc-n parc-outro', () => {
    const resp = prompt('Quantas vezes?', parcVezes ? String(parcVezes) : '');
    if (resp === null) return;
    const n = parseInt(String(resp).replace(/\D/g, ''), 10);
    if (!isFinite(n) || n < 2 || n > PARC_MAX) {
      mostrarAviso('Escreva um número de vezes entre 2 e ' + PARC_MAX + '.', 'erro');
      return;
    }
    escolherVezes(n);
  });
  grelha.appendChild(outro);
  caixa.appendChild(grelha);

  const conta = document.createElement('div');
  conta.className = 'parc-conta';
  conta.id = 'parc-conta';
  caixa.appendChild(conta);

  actualizarParc();
}

function escolherVezes(n) {
  parcVezes = n;
  document.querySelectorAll('#parc-caixa .parc-n').forEach(b => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.n) === n));
  });
  actualizarParc();
}

/* "550,80 € ÷ 12 = 45,90 € por mês". Metade das pessoas escreve o preço da
   montra; esta ligação resolve isso sem acrescentar uma decisão a quem não
   precisa dela. */
function usarComoTotal() {
  const campo = document.getElementById('f-valor');
  const v = lerValor(campo.value);
  if (!v || !parcVezes) return;
  const cada = Math.round((v / parcVezes) * 100) / 100;
  escreverValor(campo, cada);
  parcDividido = true;
  actualizarParc(dinheiro(v) + ' ÷ ' + parcVezes + ' = ' + dinheiro(cada) + ' por mês.');
}

function actualizarParc(notaDivisao) {
  const conta = document.getElementById('parc-conta');
  if (!conta) return;
  conta.innerHTML = '';

  const campo = document.getElementById('f-valor');
  const valor = lerValor(campo ? campo.value : '');

  if (!parcVezes) {
    conta.appendChild(p('Escolha quantas vezes. O valor acima passa a ser o de cada prestação — é o número que está no talão.', 'parc-nota'));
    return;
  }
  if (!valor) {
    conta.appendChild(p('Escreva o valor de cada prestação no campo acima.', 'parc-nota'));
    return;
  }

  const total = Math.round(valor * parcVezes * 100) / 100;

  /* Ver "550,80 €" quando se tinha "45,90 €" na cabeça é a carga útil
     inteira desta funcionalidade, e custa zero toques. É o único sítio
     onde a app revela alguma coisa sem opinar. */
  conta.appendChild(p(parcVezes + ' × ' + dinheiro(valor) + '  =  ' + dinheiro(total) +
    ' no total', 'parc-total'));

  const dataBase = (document.getElementById('f-data').value || HOJE);
  const datas = datasPrestacoes(dataBase, parcVezes);
  conta.appendChild(p('Última prestação em ' + mesExtenso(datas[datas.length - 1].slice(0, 7)),
    'parc-nota'));

  if (notaDivisao) {
    conta.appendChild(p(notaDivisao, 'parc-nota'));
  } else if (!parcDividido) {
    const b = botao('O valor que escrevi é o preço total →', 'link-btn', usarComoTotal);
    conta.appendChild(b);
  }

  /* Oferecida, nunca imposta: não bloqueia, e não volta a aparecer para o
     mesmo lançamento. */
  if (!parcOfertaVista) {
    const of = document.createElement('div');
    of.className = 'parc-oferta';
    of.appendChild(p('Isto fica em ' + parcVezes + ' vezes de ' + dinheiro(valor) + '. Ver a conta?'));
    const acoes = document.createElement('div');
    acoes.className = 'res-acoes';
    acoes.appendChild(botao('Ver', 'mini-btn', () => {
      parcOfertaVista = true;
      actualizarParc();
      abrirSimulador({ prestacao: valor, vezes: parcVezes });
    }));
    acoes.appendChild(botao('Não', 'mini-btn', () => {
      parcOfertaVista = true;
      actualizarParc();
    }));
    of.appendChild(acoes);
    conta.appendChild(of);
  }
}

/* ============================================================
   PRIMEIRO ARRANQUE — duas perguntas e uma resposta

   A app abria com três zeros e uma frase a dizer que não se lançou nada.
   Um caderno em branco. Quem está com a corda ao pescoço não abre um caderno
   em branco duas vezes.

   Duas perguntas, e a resposta na terceira folha. Duas e não seis: cada
   pergunta a mais é gente que desiste, e com estas duas já se consegue dizer
   a coisa que interessa — quanto sobra por dia.

   Regras que isto respeita:
   - Nada do que aqui se escreve vira movimento sem a pessoa confirmar que já
     aconteceu. Dizer "entram 900 por mês" não é dizer "recebi 900 hoje", e
     gravar um lançamento que não houve é escrever ficção nos dados dela.
   - O que ela disser fica marcado como dito, nunca como medido. Assim que
     houver lançamentos a sério, são eles que mandam.
   - Dá para saltar. Quem não quiser responder carrega uma vez e nunca mais vê
     isto.
   ============================================================ */
function precisaArranque() {
  return !arranque.feito && !arranque.dispensado && movimentos.length === 0;
}

function desenharArranque() {
  const ecra = document.getElementById('ecra-arranque');
  const corpo = document.getElementById('arranque-corpo');
  if (!ecra || !corpo) return;

  if (!precisaArranque()) { ecra.hidden = true; return; }
  ecra.hidden = false;
  corpo.innerHTML = '';

  const passos = [
    { chave: 'entra',
      titulo: 'Quanto entra por mês?',
      ajuda: 'Tudo o que entra em casa, de todas as pessoas: salário, apoios, pensões, biscates. Um número aproximado chega.' },
    { chave: 'essenciais',
      titulo: 'E quanto é o que não dá para não pagar?',
      ajuda: 'Casa, comida, luz, água, transporte, remédios. Só isso — o resto fica de fora. Se não souber ao certo, escreva o que lhe parecer.' }
  ];

  /* ---- as duas perguntas ---- */
  if (arranquePasso < passos.length) {
    const passo = passos[arranquePasso];

    const conta = document.createElement('p');
    conta.className = 'arr-conta';
    conta.textContent = 'Pergunta ' + (arranquePasso + 1) + ' de ' + passos.length;

    const h = document.createElement('h2');
    h.className = 'arr-titulo';
    h.textContent = passo.titulo;

    const aj = document.createElement('p');
    aj.className = 'arr-ajuda';
    aj.textContent = passo.ajuda;

    const campo = document.createElement('div');
    campo.className = 'arr-campo';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.placeholder = '0,00';
    inp.id = 'arr-valor';
    const v = arranque[passo.chave];
    if (v !== null && v !== undefined) inp.value = String(v).replace('.', ',');
    campo.appendChild(inp);

    const seguir = () => {
      const n = parseFloat(String(inp.value).replace(',', '.'));
      if (!isFinite(n) || n < 0) {
        mostrarAviso('Escreva um número, mesmo que seja por alto.', 'erro');
        inp.focus();
        return;
      }
      arranque[passo.chave] = Math.round(n * 100) / 100;
      arranquePasso++;
      guardarArranque();
      desenhar();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); seguir(); } });

    const bt = botao(arranquePasso === passos.length - 1 ? 'Ver o que sobra' : 'Seguinte',
                     'btn btn-gold arr-bt', seguir);

    corpo.append(conta, h, aj, campo, bt);

    if (arranquePasso > 0) {
      corpo.appendChild(botao('‹ Voltar', 'arr-voltar', () => {
        arranquePasso--;
        desenhar();
      }));
    } else {
      corpo.appendChild(botao('Agora não', 'arr-voltar', () => {
        arranque.dispensado = true;
        guardarArranque();
        desenhar();
        abrirEcra('inicio');
      }));
    }

    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    return;
  }

  /* ---- a resposta ---- */
  const entra = arranque.entra || 0;
  const ess = arranque.essenciais || 0;
  const sobra = Math.round((entra - ess) * 100) / 100;

  const h = document.createElement('h2');
  h.className = 'arr-titulo';

  const grande = document.createElement('div');
  grande.className = 'arr-numero' + (sobra <= 0 ? ' neg' : '');

  const sub = document.createElement('p');
  sub.className = 'arr-ajuda';

  if (sobra > 0) {
    const dias = diasNoMes(hoje.getFullYear(), hoje.getMonth());
    h.textContent = 'Sobram-lhe';
    grande.textContent = dinheiro(sobra) + ' por mês';
    sub.textContent = 'São ' + dinheiro(sobra / dias) + ' por dia. É este o número que a app vai ' +
      'seguir — e cada gasto que lançar vai dizer-lhe o que ainda resta.';
  } else if (sobra === 0) {
    h.textContent = 'Fica exactamente a zero';
    grande.textContent = dinheiro(0);
    sub.textContent = 'Entra o que sai. Não é falta de disciplina — é a conta que lhe está a ser feita. ' +
      'A app vai ajudá-lo a ver onde é que ainda há folga, se houver.';
  } else {
    /* Aqui não se pede para poupar. Pedir a alguém que guarde dinheiro que não
       existe é a maneira mais rápida de essa pessoa fechar a aplicação e não
       voltar — e a culpa não é dela. */
    h.textContent = 'Falta-lhe dinheiro todos os meses';
    grande.textContent = dinheiro(sobra);
    sub.textContent = 'Os essenciais são maiores do que o que entra. Isto não é falta de disciplina, ' +
      'e a app não lhe vai pedir para poupar. O que vale a pena agora é ver os apoios a que ' +
      'talvez tenha direito, e o que se pode negociar.';
  }

  corpo.append(h, grande, sub);

  const acoes = document.createElement('div');
  acoes.className = 'arr-accoes';

  acoes.appendChild(botao('Escrever as contas que se repetem', 'btn btn-gold arr-bt', () => {
    terminarArranque();
    abrirEcra('contas');
  }));

  if (sobra < 0) {
    acoes.appendChild(botao('Ver os apoios', 'btn btn-line arr-bt', () => {
      terminarArranque();
      abrirEcra('apoios');
    }));
  }

  acoes.appendChild(botao('Começar a lançar gastos', 'btn btn-line arr-bt', () => {
    terminarArranque();
    abrirEcra('lancar');
  }));

  corpo.appendChild(acoes);
}

function terminarArranque() {
  arranque.feito = true;
  guardarArranque();
  desenhar();
}

/* O que a pessoa disse no arranque, mostrado no Início enquanto não houver
   lançamentos. Marcado como dito e não como medido — a diferença importa, e
   a linha diz isso por palavras. */
function desenharPartida(r) {
  const bloco = document.getElementById('bloco-partida');
  if (!bloco) return;

  const semLancamentos = movimentos.length === 0;
  const temResposta = arranque.feito && arranque.entra !== null && arranque.essenciais !== null;
  if (!semLancamentos || !temResposta) { bloco.hidden = true; return; }

  const sobra = Math.round((arranque.entra - arranque.essenciais) * 100) / 100;
  bloco.hidden = false;
  const corpo = document.getElementById('partida-corpo');
  corpo.innerHTML = '';

  const l1 = document.createElement('p');
  l1.className = 'partida-num' + (sobra <= 0 ? ' neg' : '');
  l1.textContent = sobra > 0 ? dinheiro(sobra) + ' por mês' : dinheiro(sobra);

  const l2 = document.createElement('p');
  l2.className = 'partida-nota';
  l2.textContent = 'Pelo que me disse: entram ' + dinheiro(arranque.entra) +
    ' e os essenciais são ' + dinheiro(arranque.essenciais) + '. ' +
    'Ainda não é medido — lance um mês e passa a ser.';

  corpo.append(l1, l2);
  corpo.appendChild(botao('Lançar o primeiro gasto', 'btn btn-gold', () => abrirEcra('lancar')));
}

/* ============================================================
   CONTAS FIXAS — o calendário do que vence

   Porquê isto e não mais uma estatística: o dinheiro que uma pessoa pobre
   perde por esquecimento — juros de mora, multa, corte da luz e a taxa de
   religação — é dinheiro que ela tinha. Não é um problema de rendimento, é um
   problema de data. Uma linha a dizer "quinta vence a luz, e tem quanto"
   evita isso, e nenhuma outra parte da app o faz.

   Duas regras que vêm do resto da app e continuam aqui:
   - Se não há nada a vencer nem nada em atraso, o bloco desaparece. Não se
     ocupa o ecrã para dizer que está tudo bem.
   - O valor é sempre confirmado por quem paga. A luz e a água mudam todos os
     meses; dar por adquirido o valor do mês passado é gravar ficção. O valor
     habitual entra escrito no campo, e quem paga corrige ou aceita.
   ============================================================ */

/* O dia 31 numa conta fixa não existe em Fevereiro. Encostar ao último dia do
   mês é o que a pessoa faz na vida real — e é o mesmo cuidado que as
   prestações já tinham em `datasPrestacoes`. */
function dataVencimento(conta, ano, mes) {
  return new Date(ano, mes, Math.min(conta.dia, diasNoMes(ano, mes)));
}

function chavePaga(id, k) { return id + '|' + k; }

/* Trocar de ecrã. Quem manda nas abas é o app/index.html, que expõe a sua
   função em `window.irEcra`; fora da casca da aplicação ela não existe e não
   se faz nada, em vez de rebentar.

   O nome daqui é outro de propósito. Uma `function irEcra` declarada neste
   ficheiro passaria a ser `window.irEcra` e ficava a chamar-se a si própria —
   é a mesma armadilha do `const` que não fica em `window`, ao contrário. */
function abrirEcra(nome) {
  if (typeof window.irEcra === 'function') window.irEcra(nome);
}

/* Dias inteiros entre hoje e uma data, contados em dias de calendário e não
   em milissegundos: às 23h de segunda, terça continua a ser "amanhã". */
function diasAte(d) {
  const a = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}

function quandoVence(dias) {
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return 'vence em ' + dias + ' dias';
  if (dias === -1) return 'venceu ontem';
  return 'venceu há ' + (-dias) + ' dias';
}

/* O estado das contas fixas no mês que está no ecrã. */
function calcularContasFixas(k) {
  const ano = parseInt(k.slice(0, 4), 10);
  const mes = parseInt(k.slice(5, 7), 10) - 1;

  const lista = contasFixas.map(c => {
    const d = dataVencimento(c, ano, mes);
    const pagaEm = contasPagas[chavePaga(c.id, k)] || null;
    return { conta: c, data: d, dias: diasAte(d), paga: !!pagaEm, pagaEm: pagaEm };
  }).sort((a, b) => a.data - b.data);

  let total = 0, pago = 0;
  lista.forEach(l => { total += l.conta.valor; if (l.paga) pago += l.conta.valor; });

  /* O que interessa mostrar: o que está em atraso e o que vence dentro da
     janela. O resto do mês fica no ecrã das contas, não à frente de quem
     abriu a app para lançar um café. */
  const urgentes = lista.filter(l => !l.paga && l.dias <= CONTAS_JANELA);

  return {
    lista, urgentes, total, pago,
    falta: Math.round((total - pago) * 100) / 100,
    atrasadas: lista.filter(l => !l.paga && l.dias < 0).length
  };
}

function desenharContasFixas(r) {
  const bloco = document.getElementById('bloco-contas');
  const corpo = document.getElementById('contas-corpo');
  if (!bloco || !corpo) return;

  const k = chaveMes(mesVisto.ano, mesVisto.mes);
  const c = calcularContasFixas(k);
  corpo.innerHTML = '';

  /* Sem contas criadas: um convite, uma vez, e só no mês corrente. Não se
     insiste em meses passados nem se enche o ecrã de quem já disse que não
     tem contas fixas — quem não criar nenhuma vê isto e mais nada. */
  if (!contasFixas.length) {
    if (k !== chaveMes(hoje.getFullYear(), hoje.getMonth())) { bloco.hidden = true; return; }
    bloco.hidden = false;
    document.getElementById('contas-titulo').textContent = 'As contas que se repetem';
    const p = document.createElement('p');
    p.className = 'contas-vazio';
    p.textContent = 'Renda, luz, água, telemóvel. Diga quanto e em que dia, ' +
      'e a app avisa antes de vencer — é assim que se deixa de pagar multa por esquecimento.';
    corpo.appendChild(p);
    corpo.appendChild(botao('Escrever as minhas contas', 'btn btn-gold', () => abrirEcra('contas')));
    return;
  }

  /* Está tudo pago e nada vence: desaparece. */
  if (!c.urgentes.length) { bloco.hidden = true; return; }

  bloco.hidden = false;
  document.getElementById('contas-titulo').textContent =
    c.atrasadas ? 'A pagar — e há atrasadas' : 'A pagar';

  c.urgentes.forEach(l => corpo.appendChild(linhaContaFixa(l, k)));

  /* O aviso que muda comportamento: comparar o que falta pagar com o que
     ainda existe. Um facto, sem adjectivos — a pessoa já sabe que é mau. */
  const livre = (r && r.mesVisivel && typeof r.mesVisivel.livre === 'number')
    ? r.mesVisivel.livre : null;
  const porPagar = c.urgentes.reduce((s, l) => s + l.conta.valor, 0);
  if (livre !== null && porPagar > 0) {
    const nota = document.createElement('p');
    nota.className = 'contas-nota' + (livre < porPagar ? ' aperto' : '');
    nota.textContent = livre < porPagar
      ? 'Falta pagar ' + dinheiro(porPagar) + ' e tem ' + dinheiro(livre) + '.'
      : 'Falta pagar ' + dinheiro(porPagar) + ', e tem ' + dinheiro(livre) + '.';
    corpo.appendChild(nota);
  }

  corpo.appendChild(botao('Ver todas as contas', 'ligacao-simples', () => abrirEcra('contas')));
}

/* Uma linha do bloco "A pagar", com o campo do valor a abrir por baixo. */
function linhaContaFixa(l, k) {
  const li = document.createElement('div');
  li.className = 'conta-linha' + (l.dias < 0 ? ' atrasada' : '');

  const topo = document.createElement('div');
  topo.className = 'cf-topo';

  const ic = document.createElement('span');
  ic.className = 'cf-ic';
  ic.textContent = l.conta.emoji || '🧾';

  const meio = document.createElement('div');
  meio.className = 'cf-meio';
  const nome = document.createElement('b');
  nome.textContent = l.conta.nome;
  const quando = document.createElement('small');
  quando.textContent = quandoVence(l.dias) +
    (l.conta.valor > 0 ? ' · ' + dinheiro(l.conta.valor) : '');
  meio.append(nome, quando);

  const bt = document.createElement('button');
  bt.type = 'button';
  bt.className = 'cf-bt';
  bt.textContent = contaAberta === l.conta.id ? 'Fechar' : 'Paguei';
  bt.addEventListener('click', () => {
    contaAberta = (contaAberta === l.conta.id) ? null : l.conta.id;
    desenhar();
  });

  topo.append(ic, meio, bt);
  li.appendChild(topo);

  if (contaAberta === l.conta.id) li.appendChild(caixaPagar(l, k));
  return li;
}

/* O valor entra escrito e seleccionado. A luz de Agosto não é a de Julho, e
   confirmar um valor errado é pior do que não registar nada. */
function caixaPagar(l, k) {
  const cx = document.createElement('div');
  cx.className = 'cf-pagar';

  const lab = document.createElement('label');
  lab.textContent = 'Quanto pagou';
  lab.setAttribute('for', 'cf-valor');

  const inp = document.createElement('input');
  inp.id = 'cf-valor';
  inp.type = 'text';
  inp.inputMode = 'decimal';
  inp.value = l.conta.valor > 0 ? String(l.conta.valor).replace('.', ',') : '';
  inp.placeholder = '0,00';

  const conf = document.createElement('button');
  conf.type = 'button';
  conf.className = 'btn btn-gold';
  conf.textContent = 'Confirmar';

  const feito = () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (!isFinite(v) || v <= 0) {
      mostrarAviso('Escreva quanto pagou.', 'erro');
      inp.focus();
      return;
    }
    pagarContaFixa(l.conta, k, v);
  };
  conf.addEventListener('click', feito);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); feito(); } });

  cx.append(lab, inp, conf);
  setTimeout(() => { inp.focus(); inp.select(); }, 30);
  return cx;
}

/* Pagar é lançar uma saída normal. Não há um segundo tipo de movimento: a
   conta fixa é só a lembrança de que ele existe, e depois de lançado vive na
   lista, no CSV e nas categorias como qualquer outro. */
function pagarContaFixa(conta, k, valor) {
  const ano = parseInt(k.slice(0, 4), 10);
  const mes = parseInt(k.slice(5, 7), 10) - 1;
  const venc = dataVencimento(conta, ano, mes);

  /* A data é a de hoje quando se paga dentro do mês em que se está — é
     verdade e mantém o mês do ecrã coerente. Num mês passado ou futuro
     escreve-se na data de vencimento, que é a única defensável. */
  const mesmoMes = (ano === hoje.getFullYear() && mes === hoje.getMonth());
  const data = mesmoMes ? HOJE : isoLocal(venc);

  lancar({
    tipo: 'saida', valor: valor, categoria: conta.categoria,
    descricao: conta.nome, data: data
  });

  contasPagas[chavePaga(conta.id, k)] = data;

  /* O valor habitual passa a ser o último pago: no mês seguinte a caixa já
     abre com o número certo, sem ninguém ter de o ir corrigir. */
  if (Math.abs(valor - conta.valor) > 0.005) {
    conta.valor = Math.round(valor * 100) / 100;
  }
  guardarContas();

  contaAberta = null;
  desenhar();
  mostrarAviso(conta.nome + ' — ' + dinheiro(valor) + ' lançado.', 'ok');
}

function desmarcarContaFixa(conta, k) {
  delete contasPagas[chavePaga(conta.id, k)];
  guardarContas();
  desenhar();
  mostrarAviso('Marcada como por pagar. O movimento que já lançou não foi apagado.', 'info');
}

/* ---------- o ecrã das contas ---------- */
function desenharGestaoContas() {
  const corpo = document.getElementById('contas-lista');
  if (!corpo) return;

  const k = chaveMes(mesVisto.ano, mesVisto.mes);
  const c = calcularContasFixas(k);
  corpo.innerHTML = '';

  const resumo = document.getElementById('contas-resumo');
  if (resumo) {
    resumo.textContent = contasFixas.length
      ? 'Este mês: ' + dinheiro(c.total) + ' em contas fixas. Já pagou ' +
        dinheiro(c.pago) + '. Falta ' + dinheiro(c.falta) + '.'
      : 'Ainda não escreveu nenhuma.';
  }

  c.lista.forEach(l => {
    const li = document.createElement('div');
    li.className = 'conta-gerir' + (l.paga ? ' paga' : '');

    const ic = document.createElement('span');
    ic.className = 'cf-ic';
    ic.textContent = l.conta.emoji || '🧾';

    const meio = document.createElement('div');
    meio.className = 'cf-meio';
    const nome = document.createElement('b');
    nome.textContent = l.conta.nome;
    const sub = document.createElement('small');
    sub.textContent = 'dia ' + l.conta.dia +
      (l.conta.valor > 0 ? ' · ' + dinheiro(l.conta.valor) : ' · valor por dizer') +
      (l.paga ? ' · paga' : '');
    meio.append(nome, sub);

    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'cf-bt' + (l.paga ? ' feito' : '');
    bt.textContent = l.paga ? 'Paga ✓' : 'Apagar';
    bt.addEventListener('click', () => {
      if (l.paga) { desmarcarContaFixa(l.conta, k); return; }
      if (!confirm('Apagar "' + l.conta.nome + '" da lista de contas fixas?\n\n' +
                   'Os movimentos que já lançou ficam como estão.')) return;
      contasFixas = contasFixas.filter(x => x.id !== l.conta.id);
      Object.keys(contasPagas).forEach(kk => {
        if (kk.indexOf(l.conta.id + '|') === 0) delete contasPagas[kk];
      });
      guardarContas();
      desenhar();
    });

    li.append(ic, meio, bt);
    corpo.appendChild(li);
  });

  desenharSugestoesContas();
}

/* As sugestões são atalhos, não uma lista fechada: tocar numa escreve o nome
   e a categoria, e o que falta é o dia e o valor. Quem tiver uma conta que
   não está aqui escreve-a à mão no mesmo formulário. */
function desenharSugestoesContas() {
  const zona = document.getElementById('contas-sugestoes');
  if (!zona) return;
  zona.innerHTML = '';
  const lista = CONTAS_SUGESTOES[moeda] || CONTAS_SUGESTOES.EUR;
  lista.forEach(s => {
    if (contasFixas.some(c => c.nome.toLowerCase() === s.nome.toLowerCase())) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cf-sug';
    b.textContent = s.emoji + ' ' + s.nome;
    b.addEventListener('click', () => {
      document.getElementById('cf-nome').value = s.nome;
      document.getElementById('cf-nome').dataset.emoji = s.emoji;
      document.getElementById('cf-nome').dataset.cat = s.cat;
      document.getElementById('cf-dia').focus();
    });
    zona.appendChild(b);
  });
}

function adicionarContaFixa(ev) {
  if (ev) ev.preventDefault();
  const campoNome = document.getElementById('cf-nome');
  const nome = campoNome.value.trim();
  const dia = Math.floor(Number(document.getElementById('cf-dia').value));
  const valor = parseFloat(String(document.getElementById('cf-novo-valor').value).replace(',', '.'));

  if (!nome) { mostrarAviso('Escreva o nome da conta.', 'erro'); campoNome.focus(); return; }
  if (!(dia >= 1 && dia <= 31)) {
    mostrarAviso('O dia tem de estar entre 1 e 31.', 'erro');
    document.getElementById('cf-dia').focus();
    return;
  }
  if (contasFixas.length >= 40) {
    mostrarAviso('São já quarenta contas fixas — não deve caber mais nenhuma.', 'erro');
    return;
  }

  contasFixas.push({
    id: idNovo(),
    nome: nome.slice(0, 40),
    valor: (isFinite(valor) && valor > 0) ? Math.round(valor * 100) / 100 : 0,
    dia: dia,
    categoria: campoNome.dataset.cat || 'contas',
    emoji: campoNome.dataset.emoji || '🧾'
  });
  guardarContas();

  campoNome.value = '';
  delete campoNome.dataset.cat;
  delete campoNome.dataset.emoji;
  document.getElementById('cf-dia').value = '';
  document.getElementById('cf-novo-valor').value = '';

  desenhar();
  mostrarAviso(nome + ' entrou nas contas fixas.', 'ok');
}

/* ---------- render ---------- */
function desenhar() {
  const r = calcular();
  desenharMes();
  desenharTopo(r);
  desenharLembrete(r);
  desenharBalancoLinha(r);
  desenharBalanco(r);
  desenharPlano(r);
  desenharEtiquetas(r);
  desenharLista(r);
  desenharCategorias(r);
  desenharReserva(r);
  desenharComprometido(r);
  desenharArranque();
  desenharPartida(r);
  desenharContasFixas(r);
  desenharGestaoContas();
  desenharParc();
  desenharSimulador();
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
  desenharParc();
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

/* "Falta contar outro rendimento" leva a lançar, não a preencher uma
   definição. É a diferença entre um número que envelhece e um que a vida
   corrige sozinha. */
function prepararOutroRendimento() {
  trocarTipo('entrada');
  document.getElementById('f-categoria').value = 'salario';
  etiquetaActiva = '';
  limparDescricaoAutomatica();
  pintarEtiquetas();
  sincronizarEss();
  document.getElementById('f-valor').value = '';
  document.getElementById('f-data').value = isoLocal(new Date());
  notaForm('Lance-o como uma entrada, no dia em que entra. Fica a contar a partir daí.');
  irParaFormulario();
}

function reservaActual() {
  return reservaInicial + movimentos.reduce((s, m) => {
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
    /* A hora a que foi lançado, que não é a data a que aconteceu. É isto que
       permite ao saldo da conta saber o que já estava descontado no número
       que a pessoa leu no extracto e o que veio depois. */
    criado: Date.now(),
    moeda: moeda
  };
  if (typeof dados.ess === 'boolean') m.ess = dados.ess;
  movimentos.push(m);
  guardar();
  return m;
}

/* Criam-se as N saídas todas, já — não um movimento com metadados a
   expandir na leitura. Cada uma é um movimento normal, com a sua data
   real: os meses futuros mostram o compromisso sem uma linha nova em
   `calcular()`, na lista, no CSV ou na nuvem, e uma versão antiga deste
   ficheiro ainda em cache lê-as como saídas normais e ignora o `parc`. */
function lancarParcelado(dados, de) {
  const g = 'g-' + idNovo();
  const valor = Math.round(dados.valor * 100) / 100;
  const tot = Math.round(valor * de * 100) / 100;
  const criados = datasPrestacoes(dados.data, de).map((data, i) => {
    const m = {
      id: idNovo(),
      tipo: 'saida',
      valor: valor,
      categoria: dados.categoria,
      descricao: (dados.descricao || '').slice(0, 120),
      data: data,
      moeda: moeda,
      parc: { g: g, n: i + 1, de: de, tot: tot }
    };
    if (typeof dados.ess === 'boolean') m.ess = dados.ess;
    movimentos.push(m);
    return m;
  });
  guardar();
  return criados;
}

/* §8 · A pessoa lança as 12 prestações e depois lança também o pagamento
   mensal à mão. Conta a dobrar, e ninguém dá por ela. */
function prestacaoSemelhante(valor, categoria, data) {
  const k = data.slice(0, 7);
  return movimentos.find(m =>
    m.tipo === 'saida' && m.parc && m.categoria === categoria &&
    m.data.slice(0, 7) === k &&
    Math.abs(m.valor - valor) <= 0.02 * valor) || null;
}

function limparPerguntaForm() {
  const z = document.getElementById('form-pergunta');
  if (!z) return;
  z.hidden = true;
  z.innerHTML = '';
}

/* Uma nota no formulário, sem botões e sem decisão nenhuma: aparece
   porque a pessoa pediu, e desaparece no lançamento seguinte. */
function notaForm(texto) {
  const z = document.getElementById('form-pergunta');
  if (!z) return;
  z.innerHTML = '';
  z.hidden = false;
  const cx = document.createElement('div');
  cx.className = 'pergunta';
  cx.appendChild(p(texto));
  z.appendChild(cx);
}

function perguntaForm(texto, botoes) {
  const z = document.getElementById('form-pergunta');
  if (!z) return;
  z.innerHTML = '';
  z.hidden = false;
  z.appendChild(caixaPergunta(texto, botoes));
}

function adicionar(ev) {
  ev.preventDefault();
  esconderProposta();
  limparPerguntaForm();

  const valorBruto = document.getElementById('f-valor').value.replace(',', '.');
  const valor = parseFloat(valorBruto);

  if (!isFinite(valor) || valor <= 0) {
    mostrarAviso('Escreva um valor maior do que zero.', 'erro');
    return;
  }

  const categoria = document.getElementById('f-categoria').value;
  const data = document.getElementById('f-data').value || HOJE;

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
    }
  }

  const vezes = (tipoActual === 'saida' && categoria !== 'reserva' &&
                 parcAberto && parcVezes >= 2) ? parcVezes : 0;

  /* --- os dois travões do §8, uma pergunta de cada vez ------------- */
  if (vezes) {
    /* O valor escrito era o total e a pessoa não tocou no "é o preço
       total": criava 12 prestações de 550,80 €.

       O limiar de `3 × R` só existe com meses completos — ou seja, estava
       morto exactamente para quem lança a primeira compra parcelada, que é
       quem mais precisa dele. `totalSuspeito()` cai para a mediana das
       saídas já lançadas quando `R` não existe. */
    const r0 = calcular();
    if (totalSuspeito(valor, vezes, r0)) {
      perguntaForm('São ' + vezes + ' prestações de ' + dinheiro(valor) + ', ou ' +
        dinheiro(valor) + ' no total?', [
          ['São ' + vezes + ' de ' + dinheiro(valor), () => {
            limparPerguntaForm();
            executarLancamento(dados, vezes);
          }],
          ['É ' + dinheiro(valor) + ' no total', () => {
            limparPerguntaForm();
            usarComoTotal();
            mostrarAviso('Passa a ' + vezes + ' prestações de ' +
              dinheiro(Math.round((valor / vezes) * 100) / 100) + '. Confirme e toque em Lançar.', 'info');
          }]
        ]);
      return;
    }
  } else if (tipoActual === 'saida' && categoria !== 'reserva') {
    const igual = prestacaoSemelhante(valor, categoria, data);
    if (igual) {
      perguntaForm('Já há uma prestação de ' + dinheiro(igual.valor) + ' em ' +
        catInfo('saida', igual.categoria).nome + ' este mês. É a mesma?', [
          ['É a mesma, não lançar', () => {
            limparPerguntaForm();
            document.getElementById('f-valor').value = '';
            mostrarAviso('Não foi lançada. A prestação já estava na lista.', 'info');
          }],
          ['É outra coisa', () => {
            limparPerguntaForm();
            executarLancamento(dados, 0);
          }]
        ]);
      return;
    }
  }

  executarLancamento(dados, vezes);
}

function executarLancamento(dados, vezes) {
  const antes = reservaActual();

  if (typeof dados.ess === 'boolean') {
    essenciais[dados.categoria] = dados.ess;
    guardarPrefs();
  }

  const criados = vezes ? lancarParcelado(dados, vezes) : [lancar(dados)];
  const m = criados[0];

  // Saltar para o mês do movimento que acabou de ser lançado, senão ele
  // é gravado mas não aparece — e parece que se perdeu.
  const d = new Date(dados.data + 'T00:00:00');
  mesVisto = { ano: d.getFullYear(), mes: d.getMonth() };

  document.getElementById('f-valor').value = '';
  document.getElementById('f-descricao').value = '';
  descAutomatica = false;
  /* O estado de partida é sempre o mesmo: a primeira da grelha acesa —
     não a que acabou de ser usada. */
  etiquetaActiva = null;
  fecharParc();

  const depois = reservaActual();
  desenhar();

  /* Uma compra parcelada é registada e mais nada: quantas, de quanto, até
     quando. Nenhum juízo — nem aqui nem em lado nenhum sobre o passado. */
  if (vezes) {
    const ultima = criados[criados.length - 1].data.slice(0, 7);
    mostrarAviso('Lançadas ' + vezes + ' prestações de ' + dinheiro(m.valor) + ' · ' +
      dinheiro(m.parc.tot) + ' no total. A última em ' + mesExtenso(ultima) + '.', 'ok');
    return;
  }

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

function apagarIds(ids) {
  if (!ids.length) return;
  const fora = {};
  ids.forEach(i => { fora[i] = true; });
  movimentos = movimentos.filter(x => !fora[x.id]);
  guardar();
  desenhar();
}

/* As que faltam são as de data ≥ hoje do mesmo grupo. As já pagas nunca se
   apagam por este caminho: são história, e história não se reescreve. */
function apagarRestoDoGrupo(g) {
  apagarIds(movimentos.filter(m => m.parc && m.parc.g === g && m.data >= HOJE).map(m => m.id));
  mostrarAviso('Prestações apagadas. O que já pagou fica no histórico.', 'ok');
}

function apagar(id, li) {
  const m = movimentos.find(x => x.id === id);
  if (!m) return;

  /* Numa prestação, "apagar" tem três significados diferentes e um
     `confirm()` só cabe um. */
  if (m.parc && li) {
    const antiga = li.querySelector('.pergunta');
    if (antiga) antiga.remove();
    const cx = caixaPergunta(
      'Esta é a prestação ' + m.parc.n + ' de ' + m.parc.de + '.', [
        ['Apagar só esta', () => apagarIds([m.id])],
        ['Apagar as que faltam', () => apagarRestoDoGrupo(m.parc.g)],
        ['Cancelar', () => cx.remove()]
      ]);
    li.appendChild(cx);
    return;
  }

  if (!confirm('Apagar "' + (m.descricao || catInfo(m.tipo, m.categoria).nome) + '"?')) return;
  apagarIds([id]);
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
/* ============================================================
   Exportar para Excel

   Três folhas: os movimentos um a um, um resumo por mês, e o que se gastou
   por categoria. É o que uma pessoa faz a seguir a exportar — e se a app não
   as fizer, ela vai fazê-las à mão numa folha que não sabe usar.

   Os valores vão como números e as datas como datas, para a folha somar. Um
   CSV aberto no Excel português transforma 45,90 em texto ou em 4590 conforme
   a máquina, e quem exportou fica com uma folha que não soma nada.
   ============================================================ */
function folhasParaExcel() {
  const r = calcular();
  const T = (v) => ({ v: v, t: 't' });
  const H = (v) => ({ v: v, t: 'h' });
  const N = (v) => ({ v: v, t: 'n' });
  const D = (v) => ({ v: v, t: 'd' });

  /* ---- folha 1: os movimentos ---- */
  const movs = [[H('Data'), H('Tipo'), H('Categoria'), H('Descrição'), H('Valor'),
                 H('Essencial'), H('Moeda'), H('Prestação'), H('De')]];
  movimentos.slice().sort((a, b) => a.data.localeCompare(b.data)).forEach(m => {
    const ess = (m.tipo === 'saida' && m.categoria !== 'reserva')
      ? (ehEssencial(m) ? 'Essencial' : 'Dá para adiar') : '';
    movs.push([
      D(m.data),
      T(m.tipo === 'entrada' ? 'Entrada' : 'Saída'),
      T(catInfo(m.tipo, m.categoria).nome),
      T(m.descricao || ''),
      /* Saídas com sinal negativo: assim a coluna soma sozinha e dá o saldo,
         em vez de dar a soma de tudo o que passou pelas mãos da pessoa. */
      N(m.tipo === 'entrada' ? m.valor : -m.valor),
      T(ess),
      T(m.moeda || moeda),
      m.parc ? N(m.parc.n) : T(''),
      m.parc ? N(m.parc.de) : T('')
    ]);
  });

  /* ---- folha 2: mês a mês ---- */
  const mes = [[H('Mês'), H('Entrou'), H('Saiu'), H('Guardado'), H('Sobrou')]];
  Object.keys(r.meses).sort().forEach(k => {
    const a = r.meses[k];
    const saiu = a.essenciais + a.naoEssenciais;
    mes.push([
      T(comMaiuscula(mesExtenso(k))),
      N(Math.round(a.rendimento * 100) / 100),
      N(Math.round(saiu * 100) / 100),
      N(Math.round(a.guardado * 100) / 100),
      N(Math.round((a.rendimento - saiu - a.guardado) * 100) / 100)
    ]);
  });

  /* ---- folha 3: para onde foi ---- */
  const cats = {};
  movimentos.forEach(m => {
    if (m.tipo !== 'saida' || m.categoria === 'reserva') return;
    cats[m.categoria] = (cats[m.categoria] || 0) + m.valor;
  });
  const porCat = [[H('Categoria'), H('Total gasto')]];
  Object.keys(cats).sort((a, b) => cats[b] - cats[a]).forEach(c => {
    porCat.push([T(catInfo('saida', c).nome), N(Math.round(cats[c] * 100) / 100)]);
  });

  return [
    { nome: 'Movimentos', linhas: movs },
    { nome: 'Mês a mês', linhas: mes },
    { nome: 'Por categoria', linhas: porCat }
  ];
}

function exportarExcel() {
  if (typeof construirXlsx !== 'function') {
    mostrarAviso('O gerador de Excel não carregou. Tente recarregar a página.', 'erro');
    return;
  }
  if (!movimentos.length) {
    mostrarAviso('Ainda não há nada para exportar. Lance um movimento primeiro.', 'info');
    return;
  }
  try {
    const bytes = construirXlsx(folhasParaExcel(), moeda);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vida-financeira-' + isoLocal(new Date()) + '.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    mostrarAviso('Folha de Excel criada com ' + movimentos.length + ' movimentos.', 'ok');
  } catch (e) {
    mostrarAviso('Não foi possível criar a folha: ' + e.message, 'erro');
  }
}

function exportarCSV() {
  const csv = linhasCSV().map(l => l.map(c => '"' + c + '"').join(';')).join('\r\n');
  // O BOM faz o Excel abrir os acentos correctamente.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vida-financeira.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function linhasCSV() {
  /* As duas colunas novas vão no fim: um ficheiro exportado antes desta
     versão continua a abrir, e uma folha já feita não muda de colunas. */
  const linhas = [['data', 'tipo', 'categoria', 'descricao', 'valor', 'essencial', 'moeda',
                   'prestacao', 'grupo']];
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
        m.moeda || moeda,
        m.parc ? (m.parc.n + '/' + m.parc.de) : '',
        m.parc ? m.parc.g : ''
      ]);
    });
  return linhas;
}

function apagarTudo() {
  if (!confirm('Isto apaga TODOS os movimentos, de todos os meses. Tem a certeza?')) return;
  if (!confirm('Última confirmação: apagar tudo?')) return;
  movimentos = [];
  guardar();
  desenhar();
  mostrarAviso('Todos os movimentos foram apagados.', 'info');
}

/* Duas prestações do mesmo grupo criadas em dois dispositivos offline: a
   fusão por `id` mantém as duas séries, e o mês passa a mostrar o dobro.
   Se dois grupos tiverem a mesma categoria, valor, número de vezes e mês
   inicial, fica o de `id` menor. É a única regra de desduplicação que este
   desenho precisa — e só se aplica a grupos, nunca a movimentos soltos:
   entre perder um movimento e ter um repetido, fica-se com o repetido. */
function desduplicarGrupos(lista) {
  const grupos = {};
  lista.forEach(m => {
    if (m.tipo !== 'saida' || !m.parc) return;
    const g = grupos[m.parc.g] || (grupos[m.parc.g] = {
      categoria: m.categoria, valor: m.valor, de: m.parc.de, inicio: m.data
    });
    if (m.data < g.inicio) { g.inicio = m.data; g.valor = m.valor; }
  });

  const vistos = {};
  const fora = {};
  Object.keys(grupos).sort().forEach(id => {
    const g = grupos[id];
    const ch = g.categoria + '|' + g.valor.toFixed(2) + '|' + g.de + '|' + g.inicio.slice(0, 7);
    if (vistos[ch]) fora[id] = true;
    else vistos[ch] = id;
  });

  if (!Object.keys(fora).length) return lista;
  return lista.filter(m => !(m.parc && fora[m.parc.g]));
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
          /* Agregado: ganha a confirmação mais recente. É uma resposta a
             uma pergunta, não um dado — se as duas pontas discordarem, a
             pior consequência é a pergunta reaparecer uma vez. */
          if (pref.agregado && typeof pref.agregado === 'object' &&
              (pref.agregado.ts || 0) > (agregado.ts || 0)) {
            agregado = Object.assign({}, agregado, pref.agregado);
          }
          /* Balanço: junta-se, nunca se apaga. Um mês já visto num
             telemóvel não volta a convidar no outro. */
          if (pref.balanco && Array.isArray(pref.balanco.vistos)) {
            pref.balanco.vistos.forEach(x => {
              if (typeof x === 'string' && balancoPrefs.vistos.indexOf(x) === -1) {
                balancoPrefs.vistos.push(x);
              }
            });
            balancoPrefs.vistos = balancoPrefs.vistos.slice(-36);
          }
          /* Plano: só as respostas viajam. O documento nunca é gravado,
             logo nunca chega desactualizado de lado nenhum. */
          if (pref.plano && pref.plano.respostas && typeof pref.plano.respostas === 'object' &&
              (!planoGuardado || (pref.plano.feito || '') > (planoGuardado.feito || ''))) {
            planoGuardado = {
              feito: typeof pref.plano.feito === 'string' ? pref.plano.feito : '',
              respostas: pref.plano.respostas, versao: 1
            };
          }
        }

        /* Arranque: se já foi feito num sítio, não se volta a perguntar no
           outro. Só se aceita o que faz o estado avançar — nunca o contrário,
           senão entrar noutro telemóvel ressuscitava as perguntas. */
        const rn = Number(dados.reservaInicial);
        if (isFinite(rn) && rn > 0 && rn !== reservaInicial) {
          reservaInicial = Math.round(rn * 100) / 100;
          try { localStorage.setItem(RESERVA_INICIAL_CHAVE, String(reservaInicial)); } catch (e) {}
        }

        /* Saldo da conta: ganha o mais recente dos dois lados. Aqui não se
           pode juntar nem somar — é um retrato de um instante, e de dois
           retratos o que vale é o último. */
        const sn = dados.saldoConta;
        if (sn && typeof sn === 'object' && isFinite(Number(sn.valor)) && Number(sn.em) > 0) {
          if (!saldoConta || Number(sn.em) > saldoConta.em) {
            saldoConta = { valor: Math.round(Number(sn.valor) * 100) / 100, em: Number(sn.em) };
            try { localStorage.setItem(SALDO_CHAVE, JSON.stringify(saldoConta)); } catch (e) {}
          }
        }

        const ar = dados.arranque;
        if (ar && typeof ar === 'object') {
          if (ar.feito) arranque.feito = true;
          if (ar.dispensado) arranque.dispensado = true;
          const e = Number(ar.entra), s = Number(ar.essenciais);
          if (arranque.entra === null && isFinite(e) && e > 0) arranque.entra = e;
          if (arranque.essenciais === null && isFinite(s) && s >= 0) arranque.essenciais = s;
          guardarArranque();
        } else if (arranque.feito || arranque.dispensado) {
          guardarArranque();
        }

        /* Contas fixas. Juntam-se pelo id e nunca se apagam: uma conta criada
           no telemóvel e outra criada no computador têm de sobreviver às
           duas. Quem já cá está ganha — trazer da nuvem um valor antigo por
           cima do que se acabou de pagar seria desfazer trabalho à frente
           dos olhos de quem o fez. */
        const cf = dados.contasFixas;
        if (cf && typeof cf === 'object') {
          if (Array.isArray(cf.contas)) {
            const tenho = {};
            contasFixas.forEach(c => { tenho[c.id] = true; });
            cf.contas.forEach(c => {
              if (!c || typeof c !== 'object' || tenho[c.id]) return;
              const dia = Math.floor(Number(c.dia));
              const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 40) : '';
              if (!nome || !(dia >= 1 && dia <= 31)) return;
              const v = Number(c.valor);
              contasFixas.push({
                id: typeof c.id === 'string' && c.id ? c.id : idNovo(),
                nome: nome,
                valor: (isFinite(v) && v > 0) ? Math.round(v * 100) / 100 : 0,
                dia: dia,
                categoria: typeof c.categoria === 'string' && c.categoria ? c.categoria : 'contas',
                emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 4) : '🧾'
              });
            });
          }
          /* Pagamentos juntam-se sempre: marcado como pago num sítio é pago
             em todos. O contrário — desmarcar por sincronização — faria a
             app pedir duas vezes o mesmo pagamento. */
          if (cf.pagas && typeof cf.pagas === 'object') {
            Object.keys(cf.pagas).forEach(kk => {
              if (/^[^|]+\|\d{4}-\d{2}$/.test(kk) && !contasPagas[kk] &&
                  typeof cf.pagas[kk] === 'string') {
                contasPagas[kk] = cf.pagas[kk];
              }
            });
          }
          guardarContas();
        } else if (contasFixas.length) {
          guardarContas();   // primeira vez nesta conta: enviar o que já há
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
        movimentos = desduplicarGrupos(Object.values(porId));
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

  /* O valor manda na conta das prestações: enquanto a caixa estiver
     aberta, a conta acompanha cada dígito. */
  document.getElementById('f-valor').addEventListener('input', () => {
    if (!parcAberto) return;
    parcDividido = false;
    actualizarParc();
  });
  document.getElementById('f-data').addEventListener('change', () => {
    if (parcAberto) actualizarParc();
  });
  document.getElementById('parc-abre').addEventListener('click', alternarParc);
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
  const formConta = document.getElementById('form-conta');
  if (formConta) formConta.addEventListener('submit', adicionarContaFixa);
  document.getElementById('mes-antes').addEventListener('click', () => mudarMes(-1));
  document.getElementById('mes-depois').addEventListener('click', () => mudarMes(1));
  document.getElementById('exportar').addEventListener('click', exportarCSV);
  const btExcel = document.getElementById('exportar-excel');
  if (btExcel) btExcel.addEventListener('click', exportarExcel);

  if (typeof ligarDivida === 'function') ligarDivida();

  const btPart = document.getElementById('abrir-partilha');
  if (btPart) btPart.addEventListener('click', abrirPartilha);
  const partFora = document.getElementById('partilha-fora');
  if (partFora) partFora.addEventListener('click', fecharPartilha);
  const partEnv = document.getElementById('partilha-enviar');
  if (partEnv) partEnv.addEventListener('click', enviarCartao);
  const partGuar = document.getElementById('partilha-guardar');
  if (partGuar) partGuar.addEventListener('click', () => guardarCartao());
  const painelPart = document.getElementById('partilha');
  /* Tocar fora fecha. Num telemóvel é o gesto que toda a gente tenta antes de
     procurar o X. */
  if (painelPart) painelPart.addEventListener('click', e => {
    if (e.target === painelPart) fecharPartilha();
  });
  document.getElementById('apagar-tudo').addEventListener('click', apagarTudo);
  document.getElementById('f-moeda').addEventListener('change', e => {
    moeda = e.target.value;
    try { localStorage.setItem(MOEDA_CHAVE, moeda); } catch (err) { /* ignora */ }
    desenhar();
  });

  desenhar();

  /* Quem chega de novo abre nas perguntas, não num ecrã de zeros. Depois do
     `desenhar()` porque é ele que decide se o arranque ainda faz falta. */
  if (precisaArranque()) abrirEcra('arranque');

  ligarNuvem();
});
