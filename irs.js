/* ============================================================
   Vida Financeira — o IRS, e onde é que fica o dinheiro esquecido

   Isto não entrega o IRS de ninguém, e nunca vai pedir a senha das Finanças.
   Faz duas coisas, e a segunda é a que vale:

   1. **Estima** quanto se vai receber ou pagar, com os números da pessoa.
   2. **Aponta o que lhe falta** — as escolhas da declaração que quase ninguém
      faz bem, e as facturas que não foram pedidas com o número de
      contribuinte.

   ---- Porque é que a segunda é a que vale ----

   A maior parte do dinheiro que se perde no IRS não se perde na declaração:
   perde-se durante o ano, ao não pedir factura com o número. Em Abril já só
   se conta o que se pediu; em Fevereiro ainda se vai pedir.

   E esta aplicação sabe uma coisa que nenhum simulador sabe: **onde é que a
   pessoa gastou**. Se ela lançou 340 € em saúde e o e-factura só tem 120,
   faltam 220 € de facturas — e isso são euros perdidos no dia 25 de
   Fevereiro, não em Junho.

   ---- Não se promete reembolso, e não é timidez ----

   Receber ou pagar é uma subtracção: o que foi descontado do ordenado durante
   o ano menos o imposto devido. Quem descontou a mais recebe; quem descontou
   a menos paga. Nenhuma ferramenta legal muda isso, e a única maneira de
   "garantir" um reembolso é inflacionar deduções — em que a coima é de quem
   entregou, não de quem fez o site.

   O que se pode mesmo fazer é não deixar nada por usar. É essa a lista aqui
   em baixo.

   ---- Os números desta lei mudam todos os anos ----

   Todas as tabelas estão num bloco só, o `IRS_REF`, com a fonte e a data ao
   lado — como o `investir.js` faz com as taxas. Enquanto o `verificado` de um
   bloco estiver a `null`, a ferramenta calcula mas escreve por cima que os
   números estão por confirmar. Um simulador de imposto que inventa uma taxa
   não é um simulador optimista: é uma pessoa a receber uma coima por nossa
   causa.
   ============================================================ */

/* ============================================================
   AS TABELAS — o único sítio onde há números da lei
   ============================================================ */
const IRS_REF = {
  /* O IRS entregue em 2026 é sobre os rendimentos de 2025, e usa as taxas de
     2025. Confundir isto é o erro mais fácil de cometer aqui: as tabelas que
     saem nas notícias em Janeiro são as do ano que começa, não as do ano que
     se vai declarar. */
  anoRendimentos: 2025,
  anoEntrega: 2026,

  escaloes: {
    /* ---- CONFERIDO CONTRA O TEXTO DA LEI ----

       Antes de aqui chegar, isto passou por duas fontes que discordavam. Dois
       modelos de linguagem, a mesma pergunta, duas tabelas diferentes e ambas
       apresentadas como oficiais:

         A:  13 · 16,5 · 22 · 25 · 32 · 35,5 · 43,5 · 45 · 48
         B:  12,5 · 16 · 21,5 · 24,4 · 31,4 · 34,9 · 43,1 · 44,6 · 48

       e ainda dois limites diferentes no topo — 83.258/86.634 contra
       44.987/83.696. Aceitar a primeira que chegou punha o simulador errado
       sem ninguém dar por isso.

       Quem resolveu a discussão foi a coluna (B) do artigo 68.º, a "taxa
       média". Ela não é um número independente: é o imposto acumulado no topo
       de cada escalão a dividir pelo rendimento, ou seja, sai das taxas e dos
       limites. Serve de soma de controlo — e apanhou a tabela A, que é
       coerente nos seis primeiros escalões e deixa de ser nos dois últimos.

       O texto publicado no Diário da República confirmou a B, e melhor do que
       isso: as oito médias que o nosso motor calcula batem, à terceira casa
       decimal, com as oito que a lei publica. Não é uma tabela copiada — é uma
       tabela conferida contra si própria.

       Estes são os rendimentos de 2025, declarados em 2026. O artigo 3.º da
       mesma lei anuncia uma redução adicional de 0,3 pontos do 2.º ao 5.º
       escalão em sede de Orçamento do Estado para 2026 — essa é para o ano
       seguinte, e não entra aqui. */
    verificado: '2026-08-03',
    fonte: 'Lei n.º 55-A/2025, de 22 de julho — artigo 68.º do CIRS · ' +
           'Diário da República n.º 139/2025, Suplemento, Série I',
    /* `ate: null` é o último escalão, que não tem tecto. A `media` é a coluna
       (B) da lei, e é o que o `irsConferirMedias()` usa para conferir. */
    faixas: [
      { ate: 8059,  taxa: 12.5, media: 12.500 },
      { ate: 12160, taxa: 16.0, media: 13.680 },
      { ate: 17233, taxa: 21.5, media: 15.982 },
      { ate: 22306, taxa: 24.4, media: 17.897 },
      { ate: 28400, taxa: 31.4, media: 20.794 },
      { ate: 41629, taxa: 34.9, media: 25.277 },
      { ate: 44987, taxa: 43.1, media: 26.607 },
      { ate: 83696, taxa: 44.6, media: 34.929 },
      { ate: null,  taxa: 48.0, media: null }
    ]
  },

  especificas: {
    verificado: null,
    fonte: 'artigo 25.º do CIRS — as duas fontes concordam neste valor',
    trabalho: 4462.15,
    pensoes: 4462.15
  },

  minimoExistencia: {
    verificado: null,
    fonte: 'artigo 70.º do CIRS',
    valor: 12180
  },

  simplificado: {
    verificado: null,
    fonte: 'artigo 31.º do CIRS',
    /* Três coeficientes e não dois: vender coisas é tributado a 15%, os
       serviços da tabela do artigo 151.º a 75%, e os outros serviços a 35%. */
    vendas: 0.15,
    servicos: 0.75,
    outros: 0.35
  },

  jovem: {
    verificado: null,
    fonte: 'artigo 12.º-B do CIRS · folheto do IRS Jovem 2025 da AT',
    /* Aqui as duas fontes batem certo, e o tecto confere: 55 × 522,50 =
       28.737,50 €. */
    isencao: [1.00, 0.75, 0.75, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25],
    tectoIAS: 55,
    ias: 522.50
  },

  coleta: {
    verificado: null,
    fonte: 'artigos 78.º a 84.º do CIRS',
    /* Cada uma: a percentagem do que se gastou, e o máximo que se pode
       deduzir. É aqui que está o dinheiro que as pessoas deixam na mesa. */
    dependente:  { fixo: 600, ate3anos: 726, segundoAte6: 900 },
    ascendente:  { fixo: 525, sozinho: 635 },
    gerais:      { pct: 0.35, tecto: 250, porSujeito: true,
                   monoPct: 0.45, monoTecto: 335 },
    saude:       { pct: 0.15, tecto: 1000 },
    educacao:    { pct: 0.30, tecto: 800, comMajoracao: 1100 },
    rendas:      { pct: 0.15, tecto: 700, interior: 1000 },
    lares:       { pct: 0.25, tecto: 403.75 },
    ivaFaturas:  { pct: 0.15, tecto: 250 }
  },

  /* O tecto de tudo junto, por escalão. Sem isto, quem tem rendimento alto e
     muitas despesas via uma dedução que a lei não deixa ter — e o simulador
     prometia um reembolso que não existe. */
  limiteGlobal: {
    verificado: null,
    fonte: 'artigo 78.º n.º 7 do CIRS',
    semLimiteAte: 8059,
    base: 1000,
    janela: 1500,
    tecto: 80000,
    /* 80.000 − 8.059. Fica escrito em vez de calculado para bater à letra com
       o que está na lei. */
    amplitude: 71941
  }
};

/* O tecto global das deduções à colecta. Abaixo do primeiro escalão não há
   tecto nenhum; acima de 80.000 € são 1.000 €; pelo meio desce em linha
   recta. */
function irsTectoGlobal(coletavel, nDependentes) {
  const g = IRS_REF.limiteGlobal;
  if (coletavel <= g.semLimiteAte) return Infinity;
  const base = (coletavel >= g.tecto)
    ? g.base
    : g.base + g.janela * (g.tecto - coletavel) / g.amplitude;
  /* Três ou mais filhos: mais 5% por cada um. */
  const maj = (nDependentes >= 3) ? (1 + 0.05 * nDependentes) : 1;
  return arred(base * maj);
}

/* A "taxa média" que a lei publica no topo de cada escalão é uma consequência
   das taxas e dos limites, não um número à parte. Serve de soma de controlo: é
   com ela que se apanha uma tabela mal copiada — e já apanhou uma. */
function irsConferirMedias() {
  const fora = [];
  IRS_REF.escaloes.faixas.forEach(f => {
    if (f.ate === null || f.media === null || f.media === undefined) return;
    const calculada = irsColeta(f.ate) / f.ate * 100;
    if (Math.abs(calculada - f.media) > 0.01) {
      fora.push({ ate: f.ate, escrita: f.media, calculada: Math.round(calculada * 1000) / 1000 });
    }
  });
  return fora;
}

/* Uma tabela por confirmar não impede a conta — impede o silêncio sobre ela. */
function irsPorConfirmar() {
  return Object.keys(IRS_REF)
    .filter(k => IRS_REF[k] && typeof IRS_REF[k] === 'object' && 'verificado' in IRS_REF[k])
    .filter(k => !IRS_REF[k].verificado);
}

/* ============================================================
   O CÁLCULO — funções puras, sem ecrã, para poderem ser testadas
   ============================================================ */

/* A colecta faz-se fatia a fatia e não com a "parcela a abater". Dá o mesmo
   número e precisa de menos um valor da lei — e cada valor da lei que não é
   preciso é um valor que não pode estar errado. */
function irsColeta(coletavel) {
  let resta = Math.max(0, coletavel), imposto = 0, base = 0;
  for (const f of IRS_REF.escaloes.faixas) {
    const tecto = f.ate === null ? Infinity : f.ate;
    const fatia = Math.min(resta, tecto - base);
    if (fatia <= 0) break;
    imposto += fatia * (f.taxa / 100);
    resta -= fatia;
    base = tecto;
  }
  return arred(imposto);
}

/* Quanto de um rendimento fica isento pelo IRS Jovem. O ano conta-se a partir
   do primeiro em que se teve rendimentos, não da idade. */
function irsIsencaoJovem(rendimento, anoDeRendimentos) {
  const j = IRS_REF.jovem;
  const i = Math.floor(anoDeRendimentos) - 1;
  if (!(i >= 0 && i < j.isencao.length)) return 0;
  const tecto = j.tectoIAS * j.ias;
  return arred(Math.min(rendimento * j.isencao[i], tecto));
}

/* O rendimento de um titular, já sem o que não é tributado. */
function irsRendimentoLiquido(t) {
  const dep = Math.max(0, Number(t.trabalho) || 0);
  const pen = Math.max(0, Number(t.pensoes) || 0);
  const rv  = Math.max(0, Number(t.recibosVerdes) || 0);

  /* Recibos verdes no regime simplificado: só uma parte é tributada, e o
     resto é assumido como despesa sem ter de se provar. */
  const coef = (t.recibosTipo === 'outros')
    ? IRS_REF.simplificado.outros : IRS_REF.simplificado.servicos;
  const rvTributavel = arred(rv * coef);

  let isento = 0;
  if (t.jovem && t.anoJovem) {
    isento = irsIsencaoJovem(dep + rvTributavel, t.anoJovem);
  }

  /* A dedução específica é o maior entre o valor da lei e o que se descontou
     para a Segurança Social. Para quem ganha pouco, é quase sempre o da lei. */
  const ss = Math.max(0, Number(t.segurancaSocial) || 0);
  const especDep = dep > 0 ? Math.min(dep, Math.max(IRS_REF.especificas.trabalho, ss)) : 0;
  const especPen = pen > 0 ? Math.min(pen, IRS_REF.especificas.pensoes) : 0;

  const bruto = dep + pen + rvTributavel;
  const liquido = Math.max(0, bruto - especDep - especPen - isento);

  return {
    bruto: arred(bruto),
    especifica: arred(especDep + especPen),
    isentoJovem: arred(isento),
    liquido: arred(liquido),
    retido: Math.max(0, Number(t.retencao) || 0)
  };
}

/* As deduções à colecta: o que se gastou, vezes a percentagem, até ao tecto.
   Devolve também o que ficou por usar em cada uma — é isso que permite dizer
   "gastou de mais em saúde para o tecto que tem" ou "ainda cabe aqui". */
function irsDeducoes(g, nSujeitos, nDependentes, nAscendentes) {
  const c = IRS_REF.coleta;
  const linha = (nome, gasto, regra) => {
    const tecto = regra.porSujeito ? regra.tecto * Math.max(1, nSujeitos) : regra.tecto;
    const bruta = arred(Math.max(0, Number(gasto) || 0) * regra.pct);
    return {
      nome: nome, gasto: arred(Math.max(0, Number(gasto) || 0)),
      valor: arred(Math.min(bruta, tecto)),
      tecto: arred(tecto),
      sobra: arred(Math.max(0, tecto - bruta))
    };
  };

  const linhas = [
    { nome: 'Filhos', gasto: null, valor: arred(c.dependente.fixo * (nDependentes || 0)), tecto: null, sobra: 0 },
    { nome: 'Pais ou sogros em casa', gasto: null, valor: arred(c.ascendente.fixo * (nAscendentes || 0)), tecto: null, sobra: 0 },
    linha('Despesas gerais da família', g.gerais, c.gerais),
    linha('Saúde', g.saude, c.saude),
    linha('Educação', g.educacao, c.educacao),
    linha('Renda da casa', g.rendas, c.rendas),
    linha('Lar', g.lares, c.lares),
    linha('IVA das facturas', g.iva, c.ivaFaturas)
  ].filter(l => l.valor > 0 || l.gasto > 0);

  return { linhas: linhas, total: arred(linhas.reduce((s, l) => s + l.valor, 0)) };
}

/* Uma declaração inteira: de rendimentos a "recebe" ou "paga". */
function irsCalcular(d) {
  const titulares = (d.titulares || []).map(irsRendimentoLiquido);
  const conjunta = !!d.conjunta && titulares.length > 1;

  const liquidoTotal = arred(titulares.reduce((s, t) => s + t.liquido, 0));
  const retidoTotal  = arred(titulares.reduce((s, t) => s + t.retido, 0));

  /* O quociente conjugal: divide-se por dois, aplica-se a tabela, e
     multiplica-se por dois. É isto que faz a tributação conjunta compensar
     quando um ganha muito mais do que o outro — e é uma escolha que quase
     toda a gente faz sem saber que está a escolher. */
  let coleta;
  if (conjunta) {
    coleta = arred(irsColeta(liquidoTotal / 2) * 2);
  } else {
    coleta = arred(titulares.reduce((s, t) => s + irsColeta(t.liquido), 0));
  }

  const nSujeitos = conjunta ? 2 : 1;
  const ded = irsDeducoes(d.gastos || {}, nSujeitos, d.dependentes || 0, d.ascendentes || 0);

  /* O tecto de tudo junto. Sem isto o simulador prometia a quem tem
     rendimento alto uma dedução que a lei não deixa ter. */
  const tectoTudo = irsTectoGlobal(liquidoTotal, d.dependentes || 0);
  const deduzido = arred(Math.min(ded.total, tectoTudo));
  let liquida = arred(Math.max(0, coleta - deduzido));

  /* Mínimo de existência: ninguém pode ficar com menos do que isto por causa
     do imposto. É o que impede quem ganha o ordenado mínimo de pagar IRS. */
  const minimo = IRS_REF.minimoExistencia.valor * nSujeitos;
  const sobra = liquidoTotal - liquida;
  let minimoAplicado = 0;
  if (liquidoTotal <= minimo && liquida > 0) {
    minimoAplicado = liquida;
    liquida = 0;
  } else if (sobra < minimo && liquida > 0) {
    minimoAplicado = arred(Math.min(liquida, minimo - sobra));
    liquida = arred(liquida - minimoAplicado);
  }

  const resultado = arred(retidoTotal - liquida);

  return {
    conjunta: conjunta,
    coletavel: liquidoTotal,
    coleta: coleta,
    deducoes: ded,
    deduzido: deduzido,
    tectoGlobal: tectoTudo,
    minimoAplicado: minimoAplicado,
    imposto: liquida,
    retido: retidoTotal,
    /* Positivo é dinheiro que volta; negativo é dinheiro a pagar. */
    resultado: resultado,
    recebe: resultado > 0
  };
}

/* Conjunta ou separada: a escolha que mais dinheiro vale e que mais gente faz
   ao calhas. A ferramenta faz as duas contas e diz qual é a melhor — em
   segundos, e sem a pessoa ter de perceber porquê. */
function irsMelhorOpcao(d) {
  if (!d.titulares || d.titulares.length < 2) return null;
  const juntos = irsCalcular(Object.assign({}, d, { conjunta: true }));
  const separados = irsCalcular(Object.assign({}, d, { conjunta: false }));
  const diferenca = arred(juntos.resultado - separados.resultado);
  return {
    juntos: juntos,
    separados: separados,
    melhor: diferenca >= 0 ? 'conjunta' : 'separada',
    diferenca: Math.abs(diferenca)
  };
}

/* ---- o que a app sabe e o e-factura não ----
   O gasto lançado na aplicação contra o que está classificado no e-factura. A
   diferença são facturas que não foram pedidas com o número — e essas perdem-
   se no dia 25 de Fevereiro, não em Junho. */
function irsFacturasEmFalta(lancado, noEfactura, regra) {
  const l = Math.max(0, Number(lancado) || 0);
  const e = Math.max(0, Number(noEfactura) || 0);
  const falta = arred(Math.max(0, l - e));
  if (falta <= 0) return null;
  const jaUsado = Math.min(e * regra.pct, regra.tecto);
  const comTudo = Math.min(l * regra.pct, regra.tecto);
  return { falta: falta, perde: arred(Math.max(0, comTudo - jaUsado)) };
}

function arred(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IRS_REF, irsColeta, irsCalcular, irsMelhorOpcao, irsDeducoes,
    irsTectoGlobal, irsConferirMedias,
    irsRendimentoLiquido, irsIsencaoJovem, irsFacturasEmFalta, irsPorConfirmar
  };
}

/* ============================================================
   O ECRÃ

   Perguntas de gente, e o número em cima. Cada campo diz onde é que se vai
   buscar aquele valor — "vem no recibo de vencimento", "vem no extracto da
   Segurança Social" — porque a razão por que ninguém usa simuladores de IRS
   não é a matemática: é não se saber o que escrever nos campos.
   ============================================================ */

const IRS_CHAVE = 'vf:irs';

function irsGuardado() {
  try { return JSON.parse(localStorage.getItem(IRS_CHAVE) || '{}') || {}; }
  catch (e) { return {}; }
}

function irsGuardar(d) {
  try { localStorage.setItem(IRS_CHAVE, JSON.stringify(d)); } catch (e) {}
}

/* O que a aplicação já sabe. É isto que faz esta ferramenta ser diferente de
   um simulador qualquer: metade das respostas já lá estão. */
function irsDoQueJaSabemos() {
  const fora = { saude: 0, educacao: 0, rendas: 0, gerais: 0 };
  try {
    if (typeof movimentos === 'undefined') return fora;
    const ano = String(IRS_REF.anoRendimentos);
    movimentos.forEach(m => {
      if (!m || m.tipo !== 'saida' || String(m.data).slice(0, 4) !== ano) return;
      if (m.categoria === 'saude') fora.saude += m.valor;
      else if (m.categoria === 'educacao') fora.educacao += m.valor;
      else if (m.categoria === 'casa') fora.rendas += m.valor;
      else if (m.categoria !== 'reserva' && m.categoria !== 'dividas') fora.gerais += m.valor;
    });
  } catch (e) {}
  Object.keys(fora).forEach(k => { fora[k] = arred(fora[k]); });
  return fora;
}

/* O nome de cada tabela em português, para o aviso poder dizer o que falta em
   vez de dizer só que falta alguma coisa. Saber o que falta é o que permite
   ir buscá-lo. */
const IRS_NOMES = {
  escaloes: 'os escalões', especificas: 'a dedução específica',
  minimoExistencia: 'o mínimo de existência', simplificado: 'os recibos verdes',
  jovem: 'o IRS Jovem', coleta: 'os limites das deduções',
  limiteGlobal: 'o tecto global das deduções'
};

function irsNomeTabela(k) { return IRS_NOMES[k] || k; }

function irsNum(id) {
  const e = document.getElementById(id);
  if (!e) return 0;
  const v = parseFloat(String(e.value).replace(/\s/g, '').replace(',', '.'));
  return isFinite(v) ? v : 0;
}

function irsCampo(id, rotulo, ajuda, valor) {
  return '<div class="irs-campo">' +
    '<label for="' + id + '">' + rotulo + '</label>' +
    (ajuda ? '<small>' + ajuda + '</small>' : '') +
    '<input id="' + id + '" type="text" inputmode="decimal" value="' + (valor || '') + '">' +
    '</div>';
}

function irsDesenhar() {
  const zona = document.getElementById('irs-corpo');
  if (!zona) return;
  const g = irsGuardado();
  const sabe = irsDoQueJaSabemos();
  const dinheiro = v => (typeof fmtEuro === 'function') ? fmtEuro(v)
    : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);

  const porConfirmar = irsPorConfirmar();

  zona.innerHTML =
    (porConfirmar.length ? '<div class="irs-aviso-lei">' +
      '<b>Ferramenta em construção — falta confirmar parte dos números.</b>' +
      '<span>Os escalões e as taxas já foram conferidos no texto da lei. ' +
      'Falta confirmar: ' + porConfirmar.map(irsNomeTabela).join(', ') + '. ' +
      'O resultado serve para perceber como vai ser, e não para decidir nada — ' +
      'não entregue nada com base nisto.</span></div>' : '') +

    '<div class="irs-resultado" id="irs-resultado"></div>' +

    '<div class="irs-bloco"><h4>Quem entrega</h4>' +
    '<div class="irs-escolhas" id="irs-quem">' +
      '<button type="button" data-quem="so" class="' + (g.quem !== 'casal' ? 'sim' : '') + '">Sozinho</button>' +
      '<button type="button" data-quem="casal" class="' + (g.quem === 'casal' ? 'sim' : '') + '">Casado ou junto</button>' +
    '</div></div>' +

    '<div class="irs-bloco"><h4>O que entrou em 2025</h4>' +
    irsCampo('irs-trab', 'Ganhou no ano todo (antes dos descontos)',
      'Está no recibo de Dezembro, na coluna do acumulado. Ou soma os doze.', g.trab) +
    irsCampo('irs-ret', 'IRS que lhe descontaram no ano todo',
      'No mesmo sítio, na linha do IRS. É este que decide se recebe ou paga.', g.ret) +
    irsCampo('irs-ss', 'Segurança Social descontada (se souber)',
      'Se não souber, deixe em branco — a conta faz-se à mesma.', g.ss) +
    irsCampo('irs-rv', 'Recibos verdes, se passou algum',
      'O total facturado no ano. Se não passa recibos verdes, deixe 0.', g.rv) +
    '</div>' +

    '<div class="irs-bloco" id="irs-bloco2" ' + (g.quem === 'casal' ? '' : 'hidden') + '>' +
    '<h4>E a outra pessoa</h4>' +
    irsCampo('irs-trab2', 'Ganhou no ano todo', '', g.trab2) +
    irsCampo('irs-ret2', 'IRS descontado no ano todo', '', g.ret2) +
    '</div>' +

    '<div class="irs-bloco"><h4>Quem vive consigo</h4>' +
    irsCampo('irs-dep', 'Quantos filhos', 'Só os que estão no seu agregado.', g.dep) +
    irsCampo('irs-asc', 'Pais ou sogros que vivam consigo', 'Muita gente não sabe que isto dá dedução.', g.asc) +
    '</div>' +

    '<div class="irs-bloco"><h4>É jovem a começar a trabalhar?</h4>' +
    '<div class="irs-escolhas" id="irs-jovem">' +
      '<button type="button" data-jovem="nao" class="' + (!g.jovem ? 'sim' : '') + '">Não</button>' +
      '<button type="button" data-jovem="sim" class="' + (g.jovem ? 'sim' : '') + '">Sim</button>' +
    '</div>' +
    '<div id="irs-jovem-ano" ' + (g.jovem ? '' : 'hidden') + '>' +
    irsCampo('irs-anojovem', 'Que ano de trabalho é este', 'O primeiro ano em que teve rendimentos é o ano 1.', g.anojovem || 1) +
    '</div></div>' +

    '<div class="irs-bloco"><h4>O que gastou — já preenchido pela app</h4>' +
    '<p class="irs-nota">Estes números vêm do que lançou durante o ano. ' +
    'Corrija-os se souber melhor: aqui só conta o que tem factura com o seu número.</p>' +
    irsCampo('irs-saude', 'Saúde', 'Farmácia, médico, dentista, óculos.', g.saude !== undefined ? g.saude : sabe.saude) +
    irsCampo('irs-educ', 'Educação', 'Escola, creche, livros, explicações.', g.educ !== undefined ? g.educ : sabe.educacao) +
    irsCampo('irs-renda', 'Renda da casa', 'Só renda de habitação permanente.', g.renda !== undefined ? g.renda : sabe.rendas) +
    irsCampo('irs-gerais', 'Tudo o resto (despesas gerais)', 'Mercado, luz, água, roupa — tudo com factura.', g.gerais !== undefined ? g.gerais : sabe.gerais) +
    '</div>' +

    '<div class="irs-comparar" id="irs-comparar"></div>' +

    '<p class="irs-rodape">Isto é uma <b>estimativa</b>, e nada aqui é entregue às Finanças. ' +
    'A declaração é entregue por si, no Portal das Finanças, com a sua senha — ' +
    'que esta aplicação nunca lhe vai pedir.</p>';

  zona.querySelectorAll('input').forEach(i => i.addEventListener('input', irsContar));
  zona.querySelectorAll('#irs-quem button').forEach(b => b.addEventListener('click', () => {
    zona.querySelectorAll('#irs-quem button').forEach(x => x.classList.remove('sim'));
    b.classList.add('sim');
    document.getElementById('irs-bloco2').hidden = b.dataset.quem !== 'casal';
    irsContar();
  }));
  zona.querySelectorAll('#irs-jovem button').forEach(b => b.addEventListener('click', () => {
    zona.querySelectorAll('#irs-jovem button').forEach(x => x.classList.remove('sim'));
    b.classList.add('sim');
    document.getElementById('irs-jovem-ano').hidden = b.dataset.jovem !== 'sim';
    irsContar();
  }));

  irsContar();
}

function irsContar() {
  const zona = document.getElementById('irs-corpo');
  if (!zona) return;
  const casal = !!zona.querySelector('#irs-quem button.sim[data-quem="casal"]');
  const jovem = !!zona.querySelector('#irs-jovem button.sim[data-jovem="sim"]');

  const titulares = [{
    trabalho: irsNum('irs-trab'), retencao: irsNum('irs-ret'),
    segurancaSocial: irsNum('irs-ss'), recibosVerdes: irsNum('irs-rv'),
    jovem: jovem, anoJovem: irsNum('irs-anojovem') || 1
  }];
  if (casal) titulares.push({ trabalho: irsNum('irs-trab2'), retencao: irsNum('irs-ret2') });

  const dados = {
    titulares: titulares, conjunta: casal,
    dependentes: irsNum('irs-dep'), ascendentes: irsNum('irs-asc'),
    gastos: {
      saude: irsNum('irs-saude'), educacao: irsNum('irs-educ'),
      rendas: irsNum('irs-renda'), gerais: irsNum('irs-gerais')
    }
  };

  irsGuardar({
    quem: casal ? 'casal' : 'so', jovem: jovem, anojovem: irsNum('irs-anojovem'),
    trab: irsNum('irs-trab'), ret: irsNum('irs-ret'), ss: irsNum('irs-ss'), rv: irsNum('irs-rv'),
    trab2: irsNum('irs-trab2'), ret2: irsNum('irs-ret2'),
    dep: irsNum('irs-dep'), asc: irsNum('irs-asc'),
    saude: irsNum('irs-saude'), educ: irsNum('irs-educ'),
    renda: irsNum('irs-renda'), gerais: irsNum('irs-gerais')
  });

  const dinheiro = v => new Intl.NumberFormat('pt-PT',
    { style: 'currency', currency: 'EUR' }).format(v || 0);

  const alvo = document.getElementById('irs-resultado');
  if (!dados.titulares[0].trabalho && !dados.titulares[0].recibosVerdes) {
    alvo.innerHTML = '<div class="irs-vazio">Escreva quanto ganhou no ano e o IRS que lhe ' +
      'descontaram — são os dois números do recibo de Dezembro — e a conta aparece aqui.</div>';
    document.getElementById('irs-comparar').innerHTML = '';
    return;
  }

  const r = irsCalcular(dados);
  alvo.innerHTML =
    '<div class="irs-numero ' + (r.recebe ? 'bom' : 'mau') + '">' +
      '<span class="rot">' + (r.recebe ? 'Estimativa: vai receber' : 'Estimativa: vai pagar') + '</span>' +
      '<b>' + dinheiro(Math.abs(r.resultado)) + '</b>' +
    '</div>' +
    '<details class="irs-conta"><summary>Ver a conta toda</summary><ul>' +
      '<li>Rendimento sobre o qual se paga <b>' + dinheiro(r.coletavel) + '</b></li>' +
      '<li>Imposto antes das deduções <b>' + dinheiro(r.coleta) + '</b></li>' +
      r.deducoes.linhas.map(l => '<li>− ' + l.nome + ' <b>' + dinheiro(l.valor) + '</b>' +
        (l.sobra > 0 && l.gasto ? '<span class="irs-sobra">ainda cabiam mais ' +
          dinheiro(l.sobra) + ' de dedução</span>' : '') + '</li>').join('') +
      (r.minimoAplicado > 0 ? '<li>− Mínimo de existência <b>' + dinheiro(r.minimoAplicado) + '</b></li>' : '') +
      '<li>Imposto devido <b>' + dinheiro(r.imposto) + '</b></li>' +
      '<li>Já lhe descontaram <b>' + dinheiro(r.retido) + '</b></li>' +
    '</ul></details>';

  /* A comparação que vale dinheiro e que quase ninguém faz. */
  const cmp = document.getElementById('irs-comparar');
  if (!dados.conjunta && !zona.querySelector('#irs-quem button.sim[data-quem="casal"]')) {
    cmp.innerHTML = '';
  }
  const o = irsMelhorOpcao(dados);
  cmp.innerHTML = (o && o.diferenca > 0)
    ? '<div class="irs-melhor"><b>Entregar ' + (o.melhor === 'conjunta' ? 'em conjunto' : 'em separado') +
      ' dá-lhe mais ' + dinheiro(o.diferenca) + '</b>' +
      '<span>É uma escolha que se faz na declaração, e a maior parte das pessoas ' +
      'faz ao calhas. Em conjunto: ' + dinheiro(o.juntos.resultado) + '. ' +
      'Em separado: ' + dinheiro(o.separados.resultado) + '.</span></div>'
    : '';
}

document.addEventListener('DOMContentLoaded', () => {
  const g = document.getElementById('gaveta-irs');
  if (!g) return;
  /* Só se desenha quando se abre: são muitos campos, e a maior parte das
     pessoas abre esta gaveta duas vezes por ano. */
  g.addEventListener('toggle', () => { if (g.open) irsDesenhar(); });
  if (g.open) irsDesenhar();
});
