/* ============================================================
   Vida Financeira — onde é que o dinheiro rende sem se perder

   Esta aplicação diz há muito tempo que se deve juntar uma reserva, e nunca
   dizia onde. Isso é meio conselho: quem junta 2000 € e os deixa na conta à
   ordem vê-os render zero e a inflação comê-los, e ao fim de dois anos
   conclui — com razão — que poupar não serviu de nada.

   Só que dizer "onde" numa aplicação de contas é o sítio onde estas coisas
   costumam apodrecer. Há uma linha, e é esta:

     - Nomeia-se o **instrumento**, nunca a marca. "Certificados de Aforro" e
       "Tesouro Selic" são o Estado; "depósito a prazo" e "CDB" são categorias
       com garantia pública. Nenhum banco, nenhuma corretora, nenhum fundo,
       nenhuma cripto, e nenhum link de afiliado — nunca.
     - Só entra aqui o que tem **garantia do Estado ou do fundo de garantia**.
       Não se fala de acções, de fundos, nem de nada que possa valer menos do
       que se pôs. Quem tem o dinheiro contado não pode perder capital.
     - As taxas são **referências publicadas, com fonte e data**, e não
       promessas. Mudam todos os meses, e a aplicação diz isso em vez de as
       esconder.
     - O imposto entra na conta. Uma calculadora que mostra o bruto está a
       mentir por omissão: ninguém recebe o bruto.

   Isto não é aconselhamento financeiro e está escrito no ecrã. É a mesma
   regra do resto da app: mostra-se a conta, diz-se a fonte, e quem decide é
   quem tem o dinheiro.
   ============================================================ */

/* ------------------------------------------------------------
   As referências

   `taxa` é a taxa anual bruta de referência. `verificado` é o dia em que foi
   confirmada — e está à vista de propósito, para ninguém confiar num número
   velho sem saber que é velho.

   Os `opcoes` são só os nomes internos. O que se lê está no `INVEST_TEXTO`
   aqui em baixo, e não no `idiomas.js`: a descrição de um instrumento e a
   taxa que ele paga mudam ao mesmo tempo, e ter as duas coisas no mesmo
   ficheiro é o que evita que uma seja actualizada e a outra fique para trás.
   ------------------------------------------------------------ */
const INVEST_REF = {
  EUR: {
    pais: 'Portugal',
    verificado: '2026-08-03',
    /* Certificados de Aforro Série F, taxa de subscrição de Agosto de 2026.
       O tecto da série é 2,5%, e há prémios de permanência de 0,25% a 1,75%
       que aqui não se contam — contá-los era prometer um rendimento que
       depende de a pessoa não mexer no dinheiro durante anos. */
    taxa: 2.474,
    ligacao: 'https://www.igcp.pt/pt/aforristas/produtos-de-aforro/certificados-de-aforro/',
    imposto: 28,
    opcoes: ['aforro', 'prazo', 'tesouro']
  },

  BRL: {
    pais: 'Brasil',
    verificado: '2026-08-03',
    /* Selic definida pelo Copom em 17/06/2026. O Tesouro Selic acompanha-a
       de perto, e é por isso que ela serve de referência. */
    taxa: 14.25,
    ligacao: 'https://www.bcb.gov.br/controleinflacao/taxaselic',
    imposto: null,   /* regressivo: calculado pelo prazo */
    opcoes: ['tesouro-selic', 'cdb', 'poupanca']
  }
};

/* ------------------------------------------------------------
   O que se lê sobre cada sítio

   Seis perguntas por instrumento, sempre as mesmas, e sempre por esta ordem:
   de quem é, quem garante, quanto rende, se dá para mexer, até quanto está
   coberto, e onde é que se faz. Quem está a decidir onde pôr o pouco que tem
   precisa das seis, e a maior parte dos sítios só responde à terceira.

   O `br` só leva o que muda mesmo — e o que muda é o Brasil, que é o que os
   brasileiros vão ler.
   ------------------------------------------------------------ */
const INVEST_TEXTO = {
  pt: {
    'fonte.EUR': 'IGCP — Certificados de Aforro Série F, Agosto de 2026',
    'fonte.BRL': 'Banco Central — taxa Selic, reunião do Copom de 17/06/2026',
    'impnota.EUR': 'IRS de 28% sobre os juros, retido na fonte.',
    'impnota.BRL': 'Imposto de renda regressivo: 22,5% até 180 dias, 20% até 360, 17,5% até 720, e 15% acima disso. Retido no resgate — quanto mais tempo o dinheiro fica, menos imposto paga.',

    'aforro.nome': 'Certificados de Aforro',
    'aforro.quem': 'Do Estado português (IGCP).',
    'aforro.seguro': 'É o Estado que deve o dinheiro. Não há banco pelo meio.',
    'aforro.rende': 'Indexado à Euribor a 3 meses, com um tecto de 2,5% ao ano na Série F. Em Agosto de 2026, 2,474%.',
    'aforro.mexer': 'Só se pode levantar passados 3 meses. Depois disso, a qualquer altura.',
    'aforro.limite': 'Até 250.000 € por conta aforro.',
    'aforro.onde': 'Subscreve-se nos CTT ou no site do IGCP. Não se paga comissão a ninguém.',

    'prazo.nome': 'Depósito a prazo',
    'prazo.quem': 'Do banco onde o tiver.',
    'prazo.seguro': 'Garantido pelo Fundo de Garantia de Depósitos até 100.000 € por banco e por titular. Uma conta com dois titulares está coberta até 200.000 €.',
    'prazo.rende': 'Cada banco põe a sua taxa, e variam muito. Compare antes de assinar.',
    'prazo.mexer': 'Depende do contrato. Muitos deixam levantar antes do fim, perdendo os juros.',
    'prazo.limite': 'A garantia é por banco: acima de 100.000 €, vale a pena repartir.',
    'prazo.onde': 'No banco. Peça a taxa por escrito e confirme se é bruta ou líquida.',

    'tesouro.nome': 'Certificados do Tesouro',
    'tesouro.quem': 'Do Estado português.',
    'tesouro.seguro': 'Como os de Aforro: é o Estado que deve.',
    'tesouro.rende': 'Taxa crescente ao longo dos anos, definida na emissão em vigor.',
    'tesouro.mexer': 'Prazo mais longo. Confirme as condições da emissão do momento.',
    'tesouro.limite': 'Definido em cada emissão.',
    'tesouro.onde': 'Nos CTT ou no IGCP.',

    'tesouro-selic.nome': 'Tesouro Selic',
    'tesouro-selic.quem': 'Do Governo Federal.',
    'tesouro-selic.seguro': 'É o título mais seguro que existe no país: quem deve é o Tesouro Nacional.',
    'tesouro-selic.rende': 'Acompanha a Selic, que em Agosto de 2026 está em 14,25% ao ano.',
    'tesouro-selic.mexer': 'Pode resgatar-se em qualquer dia útil, e o dinheiro chega no dia seguinte.',
    'tesouro-selic.limite': 'Sem limite de garantia — não precisa, porque não há banco pelo meio.',
    'tesouro-selic.onde': 'Pelo site do Tesouro Direto, através de um banco ou de uma corretora. A taxa de custódia da B3 é de 0,20% ao ano, e é isenta até R$ 10.000 aplicados em Tesouro Selic.',

    'cdb.nome': 'CDB com garantia do FGC',
    'cdb.quem': 'Do banco que o emite.',
    'cdb.seguro': 'Garantido pelo Fundo Garantidor de Créditos até R$ 250.000 por CPF e por instituição, com um tecto de R$ 1 milhão a cada quatro anos. Confirme que o CDB tem FGC antes de assinar — nem todos os produtos de renda fixa têm.',
    'cdb.rende': 'Anunciado como uma percentagem do CDI, que anda colado à Selic. "110% do CDI" quer dizer 10% acima dela.',
    'cdb.mexer': 'Só os de liquidez diária deixam tirar quando se quer. Os outros prendem o dinheiro até ao vencimento.',
    'cdb.limite': 'Acima de R$ 250.000, reparta por instituições diferentes.',
    'cdb.onde': 'No banco ou na corretora. Desconfie de taxas muito acima do mercado: taxa alta de mais costuma ser risco alto de mais.',

    'poupanca.nome': 'Poupança',
    'poupanca.quem': 'Do banco.',
    'poupanca.seguro': 'Também coberta pelo FGC, nos mesmos R$ 250.000.',
    'poupanca.rende': 'Com a Selic acima de 8,5%, rende 0,5% ao mês mais TR — bastante menos do que o Tesouro Selic.',
    'poupanca.mexer': 'Sai quando se quer. Mas só rende no "aniversário": tirar antes do dia perde o mês inteiro.',
    'poupanca.limite': 'O mesmo do FGC.',
    'poupanca.onde': 'Em qualquer banco. É a mais fácil de todas, e é a que menos rende — vale como primeiro passo, não como destino.'
  },

  br: {
    'tesouro-selic.mexer': 'Dá para resgatar em qualquer dia útil, e o dinheiro cai na conta no dia seguinte.',
    'tesouro-selic.limite': 'Sem limite de garantia — não precisa, porque não tem banco no meio.',
    'tesouro-selic.onde': 'Pelo site do Tesouro Direto, através de um banco ou de uma corretora. A taxa de custódia da B3 é de 0,20% ao ano, e é isenta até R$ 10.000 aplicados em Tesouro Selic.',
    'cdb.seguro': 'Garantido pelo Fundo Garantidor de Créditos até R$ 250.000 por CPF e por instituição, com teto de R$ 1 milhão a cada quatro anos. Confira se o CDB tem FGC antes de assinar — nem todo produto de renda fixa tem.',
    'cdb.mexer': 'Só os de liquidez diária deixam sacar quando você quiser. Os outros prendem o dinheiro até o vencimento.',
    'cdb.limite': 'Acima de R$ 250.000, divida entre instituições diferentes.',
    'cdb.onde': 'No banco ou na corretora. Desconfie de taxa muito acima do mercado: taxa alta demais costuma ser risco alto demais.',
    'poupanca.rende': 'Com a Selic acima de 8,5%, rende 0,5% ao mês mais TR — bem menos do que o Tesouro Selic.',
    'poupanca.mexer': 'Sai quando você quiser. Mas só rende no "aniversário": tirar antes do dia perde o mês inteiro.',
    'poupanca.onde': 'Em qualquer banco. É a mais fácil de todas, e é a que menos rende — vale como primeiro passo, não como destino.',
    'impnota.BRL': 'Imposto de renda regressivo: 22,5% até 180 dias, 20% até 360, 17,5% até 720, e 15% acima disso. Retido no resgate — quanto mais tempo o dinheiro fica, menos imposto você paga.'
  },

  es: {
    'fonte.EUR': 'IGCP — Certificados de Aforro Serie F, agosto de 2026',
    'fonte.BRL': 'Banco Central de Brasil — tasa Selic, reunión del Copom del 17/06/2026',
    'impnota.EUR': '28% de IRS sobre los intereses, retenido en origen.',
    'impnota.BRL': 'Impuesto sobre la renta regresivo: 22,5% hasta 180 días, 20% hasta 360, 17,5% hasta 720, y 15% por encima. Se retiene al rescatar — cuanto más tiempo esté el dinero, menos impuesto paga.',

    'aforro.nome': 'Certificados de Aforro (deuda del Estado portugués)',
    'aforro.quem': 'Del Estado portugués (IGCP).',
    'aforro.seguro': 'Es el Estado quien debe el dinero. No hay ningún banco de por medio.',
    'aforro.rende': 'Ligado al Euríbor a 3 meses, con un techo del 2,5% anual en la Serie F. En agosto de 2026, 2,474%.',
    'aforro.mexer': 'No se puede sacar hasta pasados 3 meses. Después, cuando se quiera.',
    'aforro.limite': 'Hasta 250.000 € por cuenta.',
    'aforro.onde': 'Se contrata en los CTT o en la web del IGCP. No se paga comisión a nadie.',

    'prazo.nome': 'Depósito a plazo',
    'prazo.quem': 'Del banco donde lo tenga.',
    'prazo.seguro': 'Garantizado por el fondo de garantía de depósitos hasta 100.000 € por banco y por titular. Una cuenta con dos titulares está cubierta hasta 200.000 €.',
    'prazo.rende': 'Cada banco pone su tasa, y varían mucho. Compare antes de firmar.',
    'prazo.mexer': 'Depende del contrato. Muchos dejan sacar antes de tiempo, perdiendo los intereses.',
    'prazo.limite': 'La garantía es por banco: por encima de 100.000 €, conviene repartir.',
    'prazo.onde': 'En el banco. Pida la tasa por escrito y confirme si es bruta o neta.',

    'tesouro.nome': 'Certificados del Tesoro portugués',
    'tesouro.quem': 'Del Estado portugués.',
    'tesouro.seguro': 'Como los de Aforro: quien debe es el Estado.',
    'tesouro.rende': 'Tasa creciente con los años, fijada en la emisión vigente.',
    'tesouro.mexer': 'Plazo más largo. Confirme las condiciones de la emisión del momento.',
    'tesouro.limite': 'Fijado en cada emisión.',
    'tesouro.onde': 'En los CTT o en el IGCP.',

    'tesouro-selic.nome': 'Tesouro Selic (deuda del Estado brasileño)',
    'tesouro-selic.quem': 'Del Gobierno Federal de Brasil.',
    'tesouro-selic.seguro': 'Es el título más seguro que existe en el país: quien debe es el Tesoro Nacional.',
    'tesouro-selic.rende': 'Sigue a la Selic, que en agosto de 2026 está en 14,25% anual.',
    'tesouro-selic.mexer': 'Se puede rescatar cualquier día hábil, y el dinero llega al día siguiente.',
    'tesouro-selic.limite': 'Sin límite de garantía — no hace falta, porque no hay banco de por medio.',
    'tesouro-selic.onde': 'Por la web del Tesouro Direto, a través de un banco o una correduría. La comisión de custodia de la B3 es del 0,20% anual, y está exenta hasta R$ 10.000 invertidos en Tesouro Selic.',

    'cdb.nome': 'CDB con garantía del FGC',
    'cdb.quem': 'Del banco que lo emite.',
    'cdb.seguro': 'Garantizado por el Fondo Garantizador de Créditos hasta R$ 250.000 por persona y por entidad, con un techo de R$ 1 millón cada cuatro años. Confirme que el CDB tiene FGC antes de firmar — no todos los productos de renta fija lo tienen.',
    'cdb.rende': 'Se anuncia como un porcentaje del CDI, que va pegado a la Selic. "110% del CDI" quiere decir un 10% por encima de ella.',
    'cdb.mexer': 'Solo los de liquidez diaria dejan sacar cuando se quiere. Los demás retienen el dinero hasta el vencimiento.',
    'cdb.limite': 'Por encima de R$ 250.000, reparta entre entidades distintas.',
    'cdb.onde': 'En el banco o en la correduría. Desconfíe de tasas muy por encima del mercado: tasa demasiado alta suele ser riesgo demasiado alto.',

    'poupanca.nome': 'Poupança (cuenta de ahorro brasileña)',
    'poupanca.quem': 'Del banco.',
    'poupanca.seguro': 'También cubierta por el FGC, en los mismos R$ 250.000.',
    'poupanca.rende': 'Con la Selic por encima del 8,5%, da 0,5% al mes más TR — bastante menos que el Tesouro Selic.',
    'poupanca.mexer': 'Sale cuando se quiere. Pero solo renta en el "aniversario": sacarlo antes de ese día pierde el mes entero.',
    'poupanca.limite': 'El mismo del FGC.',
    'poupanca.onde': 'En cualquier banco. Es la más fácil de todas, y la que menos renta — vale como primer paso, no como destino.'
  },

  en: {
    'fonte.EUR': 'IGCP — Certificados de Aforro Series F, August 2026',
    'fonte.BRL': 'Central Bank of Brazil — Selic rate, Copom meeting of 17/06/2026',
    'impnota.EUR': '28% tax on the interest, withheld at source.',
    'impnota.BRL': 'Income tax on a sliding scale: 22.5% up to 180 days, 20% up to 360, 17.5% up to 720, and 15% beyond that. Withheld when you take the money out — the longer it stays in, the less tax you pay.',

    'aforro.nome': 'Certificados de Aforro (Portuguese government savings)',
    'aforro.quem': 'The Portuguese State (IGCP).',
    'aforro.seguro': 'The State itself owes you the money. There is no bank in between.',
    'aforro.rende': 'Tracks 3-month Euribor, capped at 2.5% a year on Series F. In August 2026, 2.474%.',
    'aforro.mexer': 'You cannot take it out for the first 3 months. After that, whenever you want.',
    'aforro.limite': 'Up to €250,000 per savings account.',
    'aforro.onde': 'You sign up at a post office (CTT) or on the IGCP website. No commission to anyone.',

    'prazo.nome': 'Fixed-term deposit',
    'prazo.quem': 'Whichever bank holds it.',
    'prazo.seguro': 'Covered by the deposit guarantee fund up to €100,000 per bank per holder. An account with two holders is covered up to €200,000.',
    'prazo.rende': 'Each bank sets its own rate, and they vary a lot. Compare before you sign.',
    'prazo.mexer': 'Depends on the contract. Many let you take it out early, but you lose the interest.',
    'prazo.limite': 'The guarantee is per bank: above €100,000, it is worth splitting it up.',
    'prazo.onde': 'At the bank. Ask for the rate in writing, and check whether it is before or after tax.',

    'tesouro.nome': 'Certificados do Tesouro (Portuguese treasury certificates)',
    'tesouro.quem': 'The Portuguese State.',
    'tesouro.seguro': 'Same as the Aforro ones: the State is the one who owes.',
    'tesouro.rende': 'A rate that rises year by year, fixed by whichever issue is open.',
    'tesouro.mexer': 'Longer term. Check the conditions of the issue that is open now.',
    'tesouro.limite': 'Set by each issue.',
    'tesouro.onde': 'At the post office (CTT) or through IGCP.',

    'tesouro-selic.nome': 'Tesouro Selic (Brazilian government bond)',
    'tesouro-selic.quem': 'The Brazilian federal government.',
    'tesouro-selic.seguro': 'The safest thing you can buy in the country: the National Treasury is the one who owes.',
    'tesouro-selic.rende': 'Tracks the Selic rate, which in August 2026 is 14.25% a year.',
    'tesouro-selic.mexer': 'You can cash it in on any working day, and the money arrives the next day.',
    'tesouro-selic.limite': 'No guarantee limit — it does not need one, because there is no bank in between.',
    'tesouro-selic.onde': 'Through the Tesouro Direto website, via a bank or a broker. The B3 custody fee is 0.20% a year, and it is waived on the first R$10,000 held in Tesouro Selic.',

    'cdb.nome': 'CDB covered by the FGC',
    'cdb.quem': 'The bank that issues it.',
    'cdb.seguro': 'Covered by the credit guarantee fund up to R$250,000 per person per institution, capped at R$1 million every four years. Check that the CDB is FGC-covered before you sign — not every fixed-income product is.',
    'cdb.rende': 'Quoted as a percentage of the CDI, which sits right next to the Selic rate. "110% of CDI" means 10% above it.',
    'cdb.mexer': 'Only the daily-liquidity ones let you take the money out when you want. The rest lock it in until maturity.',
    'cdb.limite': 'Above R$250,000, split it between different institutions.',
    'cdb.onde': 'At a bank or a broker. Be suspicious of rates far above the market: too high a rate usually means too high a risk.',

    'poupanca.nome': 'Poupança (Brazilian savings account)',
    'poupanca.quem': 'The bank.',
    'poupanca.seguro': 'Also covered by the FGC, up to the same R$250,000.',
    'poupanca.rende': 'With the Selic above 8.5%, it pays 0.5% a month plus TR — quite a bit less than Tesouro Selic.',
    'poupanca.mexer': 'Out whenever you want. But it only pays on its "birthday": take it out before that day and you lose the whole month.',
    'poupanca.limite': 'The same as the FGC.',
    'poupanca.onde': 'At any bank. It is the easiest of all, and the one that pays least — worth it as a first step, not as a destination.'
  }
};

function investRef(moedaAgora) {
  return INVEST_REF[moedaAgora] || INVEST_REF.EUR;
}

/* Como o `T` do resto da app: falha-se para português, nunca para a chave
   crua. Uma chave à mostra parece avaria; uma frase na língua errada
   percebe-se na mesma. */
function investTexto(chave, lingua) {
  const l = lingua || ((typeof idioma === 'function') ? idioma() : 'pt');
  const tab = INVEST_TEXTO[l] || {};
  let s = tab[chave];
  if (s === undefined) s = INVEST_TEXTO.pt[chave];
  return s === undefined ? '' : s;
}

/* Os instrumentos de um país, já na língua de quem está a ler. */
function investOpcoes(moedaAgora, lingua) {
  return investRef(moedaAgora).opcoes.map(id => ({
    id: id,
    nome: investTexto(id + '.nome', lingua),
    quem: investTexto(id + '.quem', lingua),
    seguro: investTexto(id + '.seguro', lingua),
    rende: investTexto(id + '.rende', lingua),
    mexer: investTexto(id + '.mexer', lingua),
    limite: investTexto(id + '.limite', lingua),
    onde: investTexto(id + '.onde', lingua)
  }));
}

/* ------------------------------------------------------------
   O imposto sobre os juros

   Em Portugal são 28% e acabou. No Brasil depende de quanto tempo o dinheiro
   ficou parado, e a diferença entre 22,5% e 15% é dinheiro a sério — mostrar
   uma percentagem fixa seria enganar quem investe a longo prazo, e quem
   investe a curto ainda mais.
   ------------------------------------------------------------ */
function investImposto(moedaAgora, anos) {
  if (moedaAgora !== 'BRL') return 28;
  const dias = anos * 365;
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20;
  if (dias <= 720) return 17.5;
  return 15;
}

/* ------------------------------------------------------------
   A conta

   Juro composto com reforços mensais. O reforço entra no fim de cada mês —
   é o que acontece a quem põe dinheiro de lado depois de receber, e é a
   hipótese mais conservadora: um mês a menos a render.

   Devolve o ano a ano, porque é isso que se percebe. "Ao fim de dez anos tem
   X" não diz nada a ninguém; ver a linha a subir diz tudo.
   ------------------------------------------------------------ */
function investSimular(dados) {
  const inicial = Math.max(0, Number(dados.inicial) || 0);
  const mensal = Math.max(0, Number(dados.mensal) || 0);
  const anos = Math.max(1, Math.min(50, Math.round(Number(dados.anos) || 1)));
  const taxaAno = Number(dados.taxa);
  if (!isFinite(taxaAno) || taxaAno < 0 || taxaAno > 100) return null;
  if (inicial === 0 && mensal === 0) return null;

  const i = Math.pow(1 + taxaAno / 100, 1 / 12) - 1;   /* taxa mensal equivalente */
  const impostoPct = (dados.imposto !== undefined && dados.imposto !== null)
    ? Number(dados.imposto) : investImposto(dados.moeda, anos);

  const linhas = [];
  let saldo = inicial;
  let posto = inicial;

  for (let mes = 1; mes <= anos * 12; mes++) {
    saldo = saldo * (1 + i) + mensal;
    posto += mensal;
    if (mes % 12 === 0) {
      const juros = saldo - posto;
      const imposto = juros > 0 ? juros * impostoPct / 100 : 0;
      linhas.push({
        ano: mes / 12,
        posto: Math.round(posto * 100) / 100,
        bruto: Math.round(saldo * 100) / 100,
        juros: Math.round(juros * 100) / 100,
        imposto: Math.round(imposto * 100) / 100,
        liquido: Math.round((saldo - imposto) * 100) / 100
      });
    }
  }

  const fim = linhas[linhas.length - 1];
  return {
    anos: anos,
    impostoPct: impostoPct,
    posto: fim.posto,
    bruto: fim.bruto,
    juros: fim.juros,
    imposto: fim.imposto,
    liquido: fim.liquido,
    /* Quanto rendeu, já sem imposto. É este o número que interessa: é o que
       fica na mão. */
    ganho: Math.round((fim.liquido - fim.posto) * 100) / 100,
    linhas: linhas
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { investSimular, investImposto, investRef, investOpcoes, investTexto,
                     INVEST_REF, INVEST_TEXTO };
}

/* ============================================================
   O ECRÃ

   Primeiro o que é seguro e porquê, depois a calculadora. Por esta ordem de
   propósito: uma calculadora sozinha é um número bonito sem sítio nenhum
   para o pôr, e é assim que as pessoas acabam a assinar o primeiro produto
   que lhes aparecer à frente.
   ============================================================ */

/* O país que se está a ver. Por esta ordem: o que a pessoa escolheu nos dois
   botões, a moeda da aplicação, a moeda guardada pelo site, e por fim a
   língua. Um brasileiro que abra isto no site tem de cair no Brasil sem ter
   de carregar em nada — e um português em Portugal. */
let INVEST_PAIS = null;

function investMoeda() {
  if (INVEST_PAIS && INVEST_REF[INVEST_PAIS]) return INVEST_PAIS;
  if (typeof moeda !== 'undefined' && INVEST_REF[moeda]) return moeda;
  try {
    const g = localStorage.getItem('vf:moeda');
    if (g && INVEST_REF[g]) return g;
  } catch (e) { /* sem localStorage, segue-se pela língua */ }
  return (typeof idioma === 'function' && idioma() === 'br') ? 'BRL' : 'EUR';
}

/* Não se usa aqui o `dinheiro()` da aplicação de propósito: esse escreve na
   moeda das contas da pessoa, e aqui a moeda é a do país que se está a ler.
   Um brasileiro a ver os Certificados de Aforro tem de ver euros. */
function investDinheiro(v, m) {
  const l = (typeof idioma === 'function') ? idioma() : 'pt';
  const local = l === 'en' ? 'en-GB' : l === 'es' ? 'es-ES' : l === 'br' ? 'pt-BR' : 'pt-PT';
  try {
    return new Intl.NumberFormat(local, {
      style: 'currency', currency: m || 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(v);
  } catch (e) {
    return String(Math.round(v));
  }
}

/* Uma data escrita 2026-08-03 num ecrã de pessoas é uma data de programador.
   Quem tem de a ler para saber se o número é velho lê-a por extenso. */
function investData(iso) {
  const l = (typeof idioma === 'function') ? idioma() : 'pt';
  const local = l === 'en' ? 'en-GB' : l === 'es' ? 'es-ES' : l === 'br' ? 'pt-BR' : 'pt-PT';
  try {
    const partes = String(iso).split('-');
    const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Intl.DateTimeFormat(local, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch (e) {
    return iso;
  }
}

function investEl(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function desenharInvestir() {
  const zona = document.getElementById('investir-corpo');
  if (!zona) return;
  const m = investMoeda();
  const ref = investRef(m);

  /* O que a pessoa já tinha escrito não se perde ao trocar de país nem de
     língua. A taxa é a excepção, e tem de ser: é a do país, e trazer a de
     Portugal para o Brasil dava uma conta errada com ar de certa. */
  const antes = {};
  ['inv-inicial', 'inv-mensal', 'inv-anos'].forEach(id => {
    const el = document.getElementById(id);
    if (el) antes[id] = el.value;
  });

  zona.innerHTML = '';

  /* ---- o aviso, primeiro e não em letra pequena ---- */
  const aviso = investEl('div', 'inv-aviso');
  aviso.appendChild(investEl('p', null, T('inv.aviso')));
  zona.appendChild(aviso);

  /* ---- de que país se está a falar ---- */
  const paises = investEl('div', 'inv-paises');
  Object.keys(INVEST_REF).forEach(k => {
    const b = investEl('button', 'inv-pais' + (k === m ? ' escolhido' : ''), INVEST_REF[k].pais);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(k === m));
    b.addEventListener('click', () => { INVEST_PAIS = k; desenharInvestir(); });
    paises.appendChild(b);
  });
  zona.appendChild(paises);

  /* ---- onde é que está seguro ---- */
  zona.appendChild(investEl('h3', 'inv-titulo', T('inv.onde', { pais: ref.pais })));
  zona.appendChild(investEl('p', 'inv-sub', T('inv.oquee')));

  investOpcoes(m).forEach(o => {
    const d = document.createElement('details');
    d.className = 'inv-opcao';
    const s = document.createElement('summary');
    s.appendChild(investEl('b', null, o.nome));
    s.appendChild(investEl('span', 'inv-seta', '›'));
    d.appendChild(s);

    const corpo = investEl('div', 'inv-corpo');
    [['inv.quem', o.quem], ['inv.seguro', o.seguro], ['inv.rende', o.rende],
     ['inv.mexer', o.mexer], ['inv.limite', o.limite], ['inv.onde2', o.onde]].forEach(([k, v]) => {
      if (!v) return;
      const l = investEl('p', 'inv-linha');
      l.appendChild(investEl('b', null, T(k) + ' '));
      l.appendChild(document.createTextNode(v.replace(/\*\*/g, '')));
      corpo.appendChild(l);
    });
    d.appendChild(corpo);
    zona.appendChild(d);
  });

  const fonte = investEl('p', 'inv-fonte');
  fonte.appendChild(document.createTextNode(T('inv.fonte') + ' ' + investTexto('fonte.' + m) + ' ('));
  const a = document.createElement('a');
  a.href = ref.ligacao; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = T('inv.confirmar');
  fonte.appendChild(a);
  fonte.appendChild(document.createTextNode('). ' +
    T('inv.verificado', { d: investData(ref.verificado) })));
  zona.appendChild(fonte);

  /* ---- a calculadora ---- */
  zona.appendChild(investEl('h3', 'inv-titulo', T('inv.calc')));
  zona.appendChild(investEl('p', 'inv-sub', T('inv.calcsub')));

  /* O imposto por extenso, e antes de se escrever o primeiro número: quem só
     descobre que existe depois de ver o total é quem leva o susto no fim. */
  zona.appendChild(investEl('p', 'inv-nota inv-imp', investTexto('impnota.' + m)));

  const campos = [
    { id: 'inv-inicial', rot: T('inv.jatem'), val: antes['inv-inicial'] || '' },
    { id: 'inv-mensal', rot: T('inv.pormes'), val: antes['inv-mensal'] || '' },
    { id: 'inv-anos', rot: T('inv.anos'), val: antes['inv-anos'] || '10' },
    { id: 'inv-taxa', rot: T('inv.taxa'), val: String(ref.taxa).replace('.', ',') }
  ];
  const grelha = investEl('div', 'inv-campos');
  campos.forEach(c => {
    const f = investEl('div', 'field');
    const l = document.createElement('label');
    l.setAttribute('for', c.id);
    l.textContent = c.rot;
    const i = document.createElement('input');
    i.id = c.id; i.type = 'text'; i.inputMode = 'decimal'; i.value = c.val;
    i.addEventListener('input', investContar);
    f.append(l, i);
    grelha.appendChild(f);
  });
  zona.appendChild(grelha);

  const resultado = investEl('div', 'inv-resultado');
  resultado.id = 'inv-resultado';
  zona.appendChild(resultado);

  investContar();
}

function investNum(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const s = String(el.value).trim().replace(/\s/g, '').replace(',', '.');
  return s === '' ? 0 : parseFloat(s);
}

function investContar() {
  const zona = document.getElementById('inv-resultado');
  if (!zona) return;
  const m = investMoeda();

  const r = investSimular({
    inicial: investNum('inv-inicial'),
    mensal: investNum('inv-mensal'),
    anos: investNum('inv-anos'),
    taxa: investNum('inv-taxa'),
    moeda: m
  });

  zona.innerHTML = '';
  if (!r) { zona.appendChild(investEl('p', 'inv-vazio', T('inv.escreva'))); return; }

  /* O número grande é o líquido, e não o bruto. Ninguém recebe o bruto, e
     pô-lo em destaque seria mentir com um número maior. */
  zona.appendChild(investEl('div', 'inv-rot', T('inv.aofim', { n: r.anos })));
  zona.appendChild(investEl('div', 'inv-grande', investDinheiro(r.liquido, m)));

  const detalhe = investEl('div', 'inv-detalhe');
  [[T('inv.pos'), r.posto], [T('inv.rendeu'), r.juros],
   [T('inv.imposto', { p: String(r.impostoPct).replace('.', ',') }), -r.imposto]].forEach(([n, v]) => {
    const l = investEl('div', 'inv-dl');
    l.appendChild(investEl('span', null, n));
    l.appendChild(investEl('b', v < 0 ? 'neg' : null, investDinheiro(Math.abs(v), m)));
    detalhe.appendChild(l);
  });
  zona.appendChild(detalhe);

  zona.appendChild(investEl('p', 'inv-ganho', T('inv.ganho', {
    v: investDinheiro(r.ganho, m), n: r.anos
  })));

  /* ---- o ano a ano ---- */
  const tabela = document.createElement('table');
  tabela.className = 'inv-tabela';
  const cab = document.createElement('tr');
  [T('inv.ano'), T('inv.pos'), T('inv.fica')].forEach(t => {
    const th = document.createElement('th'); th.textContent = t; cab.appendChild(th);
  });
  tabela.appendChild(cab);
  r.linhas.forEach(l => {
    const tr = document.createElement('tr');
    [String(l.ano), investDinheiro(l.posto, m), investDinheiro(l.liquido, m)].forEach((t, i) => {
      const td = document.createElement('td');
      td.textContent = t;
      if (i === 2) td.className = 'inv-fica';
      tr.appendChild(td);
    });
    tabela.appendChild(tr);
  });
  const rolo = investEl('div', 'inv-rolo');
  rolo.appendChild(tabela);
  zona.appendChild(rolo);

  zona.appendChild(investEl('p', 'inv-nota', T('inv.inflacao')));
}

/* Fora do navegador (nos testes) não há `document`, e a conta lá em cima tem
   de continuar a poder ser conferida sem abrir uma página. */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('investir-corpo')) desenharInvestir();
    window.addEventListener('vf:lingua-mudou', () => {
      if (document.getElementById('investir-corpo')) desenharInvestir();
    });
  });
}
