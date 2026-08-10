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

/* A página da AT de onde saiu quase tudo o que está aqui em baixo. Fica numa
   constante porque é citada por seis blocos diferentes, e uma fonte escrita
   seis vezes é uma fonte que fica desactualizada em cinco delas. */
const IRS_FONTE_AT =
  'Autoridade Tributária e Aduaneira — «Deduções, benefícios fiscais e taxas ' +
  'para rendimentos de 2025» · https://info.portaldasfinancas.gov.pt/pt/' +
  'apoio_ao_contribuinte/questoes_frequentes/declaracao/' +
  'Deducoes_beneficios_taxas/Paginas/default.aspx';

const IRS_REF = {
  /* O IRS entregue em 2026 é sobre os rendimentos de 2025, e usa as taxas de
     2025. Confundir isto é o erro mais fácil de cometer aqui: as tabelas que
     saem nas notícias em Janeiro são as do ano que começa, não as do ano que
     se vai declarar. */
  anoRendimentos: 2025,
  anoEntrega: 2026,

  /* O IAS é a régua com que se mede metade desta lei: o tecto do IRS Jovem, o
     valor de referência do mínimo de existência e os dois cortes que o
     desligam saem todos daqui. Um número só, num sítio só.
     Portaria n.º 6-B/2025/1, de 6 de Janeiro. */
  ias: 522.50,

  escaloes: {
    /* ---- CONFERIDO CONTRA O TEXTO DA LEI, E DUAS VEZES ----

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

       O texto publicado no Diário da República confirmou a B. E a tabela
       prática da AT trouxe uma **segunda** soma de controlo independente, a
       "parcela a abater", que confere com esta mesma tabela — duas colunas
       diferentes, calculadas de maneiras diferentes, a bater com o mesmo
       motor.

       Estes são os rendimentos de 2025, declarados em 2026. O artigo 3.º da
       mesma lei anuncia uma redução adicional de 0,3 pontos do 2.º ao 5.º
       escalão em sede de Orçamento do Estado para 2026 — essa é para o ano
       seguinte, e não entra aqui. */
    verificado: '2026-08-03',
    fonte: 'Lei n.º 55-A/2025, de 22 de julho — artigo 68.º do CIRS · ' +
           'Diário da República n.º 139/2025, Suplemento, Série I · ' +
           'tabela prática confirmada em ' + IRS_FONTE_AT,
    /* `ate: null` é o último escalão, que não tem tecto. A `media` é a coluna
       (B) da lei e a `parcela` é a coluna da tabela prática da AT: as duas
       servem de soma de controlo, e nenhuma delas é usada para calcular. */
    faixas: [
      { ate: 8059,  taxa: 12.5, media: 12.500, parcela: 0.00 },
      { ate: 12160, taxa: 16.0, media: 13.680, parcela: 282.07 },
      { ate: 17233, taxa: 21.5, media: 15.982, parcela: 950.91 },
      { ate: 22306, taxa: 24.4, media: 17.897, parcela: 1450.67 },
      { ate: 28400, taxa: 31.4, media: 20.794, parcela: 3011.98 },
      { ate: 41629, taxa: 34.9, media: 25.277, parcela: 4006.10 },
      { ate: 44987, taxa: 43.1, media: 26.607, parcela: 7419.54 },
      { ate: 83696, taxa: 44.6, media: 34.929, parcela: 8094.51 },
      { ate: null,  taxa: 48.0, media: null,   parcela: 10939.90 }
    ]
  },

  /* A taxa adicional de solidariedade. Ninguém do público desta aplicação lhe
     chega perto — mas custa quatro linhas, e sem ela o simulador dizia a quem
     ganha 90.000 € um número mais baixo do que a verdade. Um simulador que
     erra sempre para o lado bom é pior do que um que não existe. */
  solidariedade: {
    verificado: '2026-08-03',
    fonte: 'artigo 68.º-A do CIRS · ' + IRS_FONTE_AT,
    faixas: [
      { de: 80000,  ate: 250000, taxa: 2.5 },
      { de: 250000, ate: null,   taxa: 5.0 }
    ]
  },

  especificas: {
    verificado: '2026-08-03',
    fonte: 'artigos 25.º e 53.º do CIRS · ' + IRS_FONTE_AT,
    /* O valor de sempre, e a variante que quase ninguém conhece: quem paga
       quotas a uma ordem profissional (médicos, engenheiros, advogados,
       solicitadores) deduz até 4.702,50 € em vez de 4.462,15 €, desde que a
       diferença venha mesmo dessas quotas. São 240 € de rendimento que deixa
       de ser tributado, e não é preciso guardar recibo nenhum: a ordem
       comunica. */
    trabalho: 4462.15,
    comOrdemProfissional: 4702.50,
    pensoes: 4462.15
  },

  minimoExistencia: {
    /* ---- ISTO NÃO É UM CHÃO, É UM ABATIMENTO ----

       Durante anos o mínimo de existência foi uma frase simples: ninguém fica
       com menos do que X depois do imposto. Deixou de ser. Desde 2023 é um
       **abatimento ao rendimento colectável**, com três fórmulas conforme o
       rendimento bruto, e é por isso que ninguém consegue reproduzir a nota de
       liquidação em casa.

       O que a lei faz, traduzido: garante que quem ganha o salário mínimo
       (12.180 € por ano, 870 € × 14) fica com um colectável de exactamente
       2.000 €. Dois mil euros a 12,5% dão 250 € de imposto — e 250 € é, ao
       cêntimo, o tecto da dedução de despesas gerais. O imposto desaparece.

       Não é coincidência nenhuma: o `250 / 12,5%` que está dentro da fórmula
       é literalmente isso. E é por isso que a conta se confere sozinha, e há
       um teste que a confere.

       Repare-se no que isto quer dizer, e que quase ninguém sabe: quem ganha
       o salário mínimo e **não pediu facturas com o número** paga 250 € de
       IRS que não tinha de pagar. É o número mais caro deste ficheiro.

       Uma simplificação assumida: a lei só dá o abatimento a quem tem
       rendimentos predominantemente de trabalho dependente, de pensões, ou de
       actividades da tabela do anexo I da Portaria n.º 1011/2001 (menos o
       código 15). Aqui damo-lo a quem passa recibos verdes sem perguntar de
       que actividade são. Para quem passa recibos das profissões dessa tabela
       — a maioria de quem usa isto — dá o mesmo; para os outros, o número sai
       optimista. Enquanto os coeficientes do artigo 31.º estiverem por
       confirmar, isto vive debaixo do mesmo aviso, e é onde deve ficar. */
    verificado: '2026-08-03',
    fonte: 'artigo 70.º do CIRS · quadro do mínimo de existência em ' + IRS_FONTE_AT,
    /* VR é o maior entre 12.180 € e 1,5 × 14 × IAS (que em 2025 dá 10.972,50),
       por isso em 2025 vale 12.180 €. Fica escrito o critério e não só o
       resultado, para no ano em que o IAS passar o outro a conta se corrigir
       sozinha. */
    valorReferencia: 12180,
    vrIAS: 1.5 * 14,
    /* Os dois travões da alínea b) e da alínea c). Saem da lei tal e qual. */
    factorB: 2.6,
    factorC: 1.35,
    /* L = VR − limiteGerais/(taxa1º × divisorL) + limite1º/divisorL. Dá
       13.863,06 € em 2025, e é onde a fórmula b) passa a c) sem degrau. */
    divisorL: 3.6,
    /* O abatimento desliga-se de todo acima destes limites, e são dois
       independentes: o bruto dos titulares, e os rendimentos não englobados
       (juros, dividendos, rendas à taxa liberatória) do artigo 71.º. */
    corteBrutoIAS: 2.2 * 14,
    corteNaoEnglobadoIAS: 14
  },

  simplificado: {
    /* ---- AINDA POR CONFIRMAR, E DE PROPÓSITO ----

       A página da AT que confirmou tudo o resto não traz os coeficientes: diz
       só "rendimentos determinados com base nas regras do regime
       simplificado". Estes três números vêm do artigo 31.º e das duas fontes
       que concordaram entre si — o que não é o mesmo que estarem conferidos.

       Falta ir ao texto do artigo 31.º do CIRS. Enquanto não for, a ferramenta
       escreve por cima do resultado que os recibos verdes estão por confirmar,
       e faz bem. */
    verificado: null,
    fonte: 'artigo 31.º do CIRS — por ler no texto da lei',
    /* Três coeficientes e não dois: vender coisas é tributado a 15%, os
       serviços da tabela do artigo 151.º a 75%, e os outros serviços a 35%. */
    vendas: 0.15,
    servicos: 0.75,
    outros: 0.35
  },

  jovem: {
    /* O tecto e o IAS estão confirmados — 55 × 522,50 = 28.737,50 €, e o IAS
       está na página da AT. A escada dos dez anos ainda não: a AT remete para
       um folheto à parte, e é esse que falta ler. */
    verificado: null,
    fonte: 'artigo 12.º-B do CIRS · IAS confirmado em ' + IRS_FONTE_AT +
           ' · falta ler o folheto do IRS Jovem 2025 para a escada dos dez anos',
    isencao: [1.00, 0.75, 0.75, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25],
    tectoIAS: 55,
    /* O IRS Estudante, que é outra coisa e quase ninguém sabe que existe: um
       dependente que estude e trabalhe não é tributado até 5 × IAS. */
    estudanteIAS: 5
  },

  coleta: {
    verificado: '2026-08-03',
    fonte: 'artigos 78.º a 84.º e 87.º do CIRS · ' + IRS_FONTE_AT,

    /* ---- FILHOS ----
       Não são 600 € por filho e pronto. São 600 € cada, mais 126 € se o
       **primeiro** tiver 3 anos ou menos, mais 300 € por cada filho **a
       partir do segundo** que tenha 6 anos ou menos. Os exemplos da AT
       confirmam a regra e apanham quem a lê depressa: três filhos de 3, 2 e 1
       ano dão 2.526 € (1.800 + 126 + 300 + 300), e não 1.800 + 126 × 3.
       A idade conta-se a 31 de Dezembro. */
    dependente: { fixo: 600, majoraAte3: 126, majoraSeguintesAte6: 300 },
    /* Guarda partilhada com residência alternada comunicada à AT: metade para
       cada um. */
    dependentePartilhado: { fixo: 300, ate3: 363, seguintesAte6: 450 },

    ascendente: { fixo: 525, sozinho: 635 },

    /* ---- DESPESAS GERAIS ----
       35% do que se gastou, até 250 € por sujeito passivo — 500 € num casal
       que entregue em conjunto. Para chegar ao tecto bastam 714,29 € de
       facturas no ano inteiro, o que é menos de 60 € por mês de compras com o
       número. É a dedução mais fácil de ganhar e a mais perdida. */
    gerais: { pct: 0.35, tecto: 250, porSujeito: true,
              monoPct: 0.45, monoTecto: 335 },

    saude:    { pct: 0.15, tecto: 1000 },
    educacao: { pct: 0.30, tecto: 800,
                /* Até 1.100 € se a diferença for renda de estudante deslocado
                   a mais de 50 km, com o máximo de 400 € nessa parte. */
                comRendaEstudante: 1100, maximoRendaEstudante: 400,
                /* Escola no interior ou nas Regiões Autónomas: mais 10 pontos
                   percentuais, e o tecto sobe para 1.000 €. */
                pctInterior: 0.40, tectoInterior: 1000 },

    /* ---- RENDA DA CASA ----
       15% até 700 €, mas o tecto sobe para quem ganha menos: 1.000 € até ao
       primeiro escalão, e desce em linha recta até aos 30.000 €. Sem esta
       elevação, o simulador tirava dinheiro a quem menos tem — que é
       exactamente o contrário do que a lei quis. */
    rendas: { pct: 0.15, tecto: 700, tectoBaixoRendimento: 1000,
              elevaAte: 30000, interior: 1000 },
    /* Juros de casa de contratos assinados até 31.12.2011. Regra diferente e
       tecto diferente. */
    juros: { pct: 0.15, tecto: 296, tectoBaixoRendimento: 450, elevaAte: 30000 },

    lares:      { pct: 0.25, tecto: 403.75 },
    /* IVA das facturas: 15% em geral, mas 100% nos passes e nos jornais e
       revistas, 35% nos medicamentos veterinários e 30% nas prestações de
       serviços — tudo dentro do mesmo tecto de 250 €. O passe do autocarro
       devolve o IVA todo, e quase ninguém sabe. */
    ivaFaturas: { pct: 0.15, tecto: 250,
                  pctPasses: 1.00, pctPublicacoes: 1.00,
                  pctVeterinarios: 0.35, pctServicos: 0.30 },
    /* Quem tem empregada doméstica declarada deduz 5% até 200 €. */
    domestico:  { pct: 0.05, tecto: 200 },
    /* Pensões de alimentos: 20% do que se pagou, e sem tecto. */
    alimentos:  { pct: 0.20, tecto: Infinity },

    /* Deficiência com grau igual ou superior a 60%. Não está no ecrã, mas
       está aqui escrito porque é o dinheiro que mais gente deixa por pedir. */
    deficiencia: { sujeito: 2090, forcasArmadas: 2612.50,
                   dependente: 1306.25, ascendente: 1306.25,
                   acompanhamento90: 2090 }
  },

  /* O tecto de tudo junto, por escalão. Sem isto, quem tem rendimento alto e
     muitas despesas via uma dedução que a lei não deixa ter — e o simulador
     prometia um reembolso que não existe. */
  limiteGlobal: {
    verificado: '2026-08-03',
    fonte: 'artigo 78.º n.º 7 do CIRS · nota 7 de ' + IRS_FONTE_AT,
    semLimiteAte: 8059,
    base: 1000,
    janela: 1500,
    tecto: 80000,
    /* 80.000 − 8.059. Fica escrito em vez de calculado para bater à letra com
       o que está na lei. */
    amplitude: 71941,
    /* Três filhos ou mais: mais 5% por cada um. */
    majoraPorDependente: 0.05,
    majoraDesde: 3
  }
};

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

/* A taxa adicional de solidariedade, também fatia a fatia. */
function irsSolidariedade(coletavel) {
  let extra = 0;
  for (const f of IRS_REF.solidariedade.faixas) {
    const cima = f.ate === null ? Infinity : f.ate;
    const fatia = Math.min(Math.max(0, coletavel) - f.de, cima - f.de);
    if (fatia > 0) extra += fatia * (f.taxa / 100);
  }
  return arred(extra);
}

/* O imposto todo sobre um colectável: a tabela do 68.º mais o 68.º-A. */
function irsImposto(coletavel) {
  return arred(irsColeta(coletavel) + irsSolidariedade(coletavel));
}

/* ---- o mínimo de existência ----

   Três fórmulas, conforme o rendimento bruto do titular, e dois cortes que a
   desligam de todo. Devolve o **abatimento ao rendimento colectável** — não o
   imposto poupado, que é outra coisa e é o que se mostra no ecrã.

     rb  rendimento bruto do titular (inclui o que é isento)
     de  as deduções específicas desse titular
     rbAgregado / nSujeitos  para o corte do n.º 4
     naoEnglobados  juros, dividendos e rendas à taxa liberatória */
function irsAbatimentoMinimo(rb, de, nSujeitos, rbAgregado, naoEnglobados) {
  const m = IRS_REF.minimoExistencia;
  const ias = IRS_REF.ias;
  const n = Math.max(1, nSujeitos || 1);

  /* Os dois cortes do n.º 4. Quem os passa não tem abatimento nenhum, por
     muito baixa que a fórmula desse. */
  if ((rbAgregado === undefined ? rb : rbAgregado) > m.corteBrutoIAS * ias * n) return 0;
  if ((naoEnglobados || 0) > m.corteNaoEnglobadoIAS * ias * n) return 0;

  const vr = irsValorReferencia();
  const limiteGerais = IRS_REF.coleta.gerais.tecto;
  const taxa1 = IRS_REF.escaloes.faixas[0].taxa / 100;
  const limite1 = IRS_REF.escaloes.faixas[0].ate;
  /* O termo `limiteGerais / taxa1` é o que faz o salário mínimo sobrar com
     exactamente 2.000 € de colectável, para a colecta dar 250 € e a dedução
     de despesas gerais a apagar. */
  const encosto = de + limiteGerais / taxa1;
  const L = irsLimiteL();

  let ab;
  if (rb <= vr) {
    ab = vr - encosto;
  } else if (rb <= L) {
    ab = (vr - m.factorB * (rb - vr)) - encosto;
  } else {
    ab = ((L - limite1) - m.factorC * (rb - L)) - de;
  }

  /* Nunca negativo, e nunca maior do que o que sobra depois das específicas —
     senão o colectável ficava negativo e a conta passava a devolver imposto
     que não existe. */
  return arred(Math.min(Math.max(0, ab), Math.max(0, rb - de)));
}

/* VR: o maior entre os 12.180 € escritos na lei e 1,5 × 14 × IAS. Em 2025
   ganha o primeiro; escreve-se a regra e não só o resultado para o ano em que
   o IAS o ultrapassar não passar despercebido. */
function irsValorReferencia() {
  const m = IRS_REF.minimoExistencia;
  return Math.max(m.valorReferencia, m.vrIAS * IRS_REF.ias);
}

/* L: o ponto onde a segunda fórmula do mínimo de existência passa à terceira,
   sem degrau nenhum. Em 2025 dá 13.863,06 €. */
function irsLimiteL() {
  const m = IRS_REF.minimoExistencia;
  const taxa1 = IRS_REF.escaloes.faixas[0].taxa / 100;
  const limite1 = IRS_REF.escaloes.faixas[0].ate;
  return irsValorReferencia()
    - IRS_REF.coleta.gerais.tecto / (taxa1 * m.divisorL)
    + limite1 / m.divisorL;
}

/* O tecto global das deduções à colecta. Abaixo do primeiro escalão não há
   tecto nenhum; acima de 80.000 € são 1.000 €; pelo meio desce em linha
   recta. Atenção: num casal que entregue em conjunto, o colectável que aqui
   entra já vem dividido por dois — está na nota 7, e é fácil de esquecer. */
function irsTectoGlobal(coletavel, nDependentes) {
  const g = IRS_REF.limiteGlobal;
  if (coletavel <= g.semLimiteAte) return Infinity;
  const base = (coletavel >= g.tecto)
    ? g.base
    : g.base + g.janela * (g.tecto - coletavel) / g.amplitude;
  const n = nDependentes || 0;
  const maj = (n >= g.majoraDesde) ? (1 + g.majoraPorDependente * n) : 1;
  return arred(base * maj);
}

/* O tecto da renda de casa sobe para quem ganha menos: 1.000 € até ao primeiro
   escalão e desce em linha recta até aos 30.000 €. Quem escreve `tecto: 700` e
   pára ali tira dinheiro exactamente a quem a lei quis dar. */
function irsTectoRendas(coletavel) {
  const r = IRS_REF.coleta.rendas;
  const g = IRS_REF.limiteGlobal;
  if (coletavel <= g.semLimiteAte) return r.tectoBaixoRendimento;
  if (coletavel >= r.elevaAte) return r.tecto;
  return arred(r.tecto + (r.tectoBaixoRendimento - r.tecto) *
    (r.elevaAte - coletavel) / (r.elevaAte - g.semLimiteAte));
}

/* A dedução por filhos, com a regra a sério. Recebe as idades a 31 de
   Dezembro; sem idades, assume-se o valor base e diz-se isso no ecrã. */
function irsDeducaoDependentes(idades, quantos) {
  const d = IRS_REF.coleta.dependente;
  if (!Array.isArray(idades) || !idades.length) {
    return { valor: arred(d.fixo * Math.max(0, quantos || 0)), exacto: false };
  }
  let total = 0;
  idades.forEach((idade, i) => {
    total += d.fixo;
    if (i === 0 && idade <= 3) total += d.majoraAte3;
    if (i > 0 && idade <= 6) total += d.majoraSeguintesAte6;
  });
  return { valor: arred(total), exacto: true };
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

/* A segunda soma de controlo, e independente da primeira: a "parcela a abater"
   da tabela prática da AT. Quem calcula com a parcela faz
   `colectável × taxa − parcela`; quem calcula fatia a fatia, como nós, tem de
   chegar ao mesmo sítio.

   A margem é de 25 cêntimos e não de um cêntimo por uma razão concreta: as
   parcelas publicadas são encadeadas umas nas outras já arredondadas, e o erro
   acumula à medida que se desce a tabela — meio cêntimo no segundo escalão,
   dezanove no último. É arredondamento da tabela, não desacordo com ela; uma
   taxa ou um limite trocados dariam dezenas ou centenas de euros de
   diferença, não cêntimos. */
function irsConferirParcelas() {
  const fora = [];
  const f = IRS_REF.escaloes.faixas;
  for (let i = 1; i < f.length; i++) {
    const limiteAnterior = f[i - 1].ate;
    const calculada = f[i].taxa / 100 * limiteAnterior - irsColeta(limiteAnterior);
    if (Math.abs(calculada - f[i].parcela) > 0.25) {
      fora.push({ escalao: i + 1, escrita: f[i].parcela,
                  calculada: Math.round(calculada * 100) / 100 });
    }
  }
  return fora;
}

/* Uma tabela por confirmar não impede a conta — impede o silêncio sobre ela. */
function irsPorConfirmar() {
  return Object.keys(IRS_REF)
    .filter(k => IRS_REF[k] && typeof IRS_REF[k] === 'object' && 'verificado' in IRS_REF[k])
    .filter(k => !IRS_REF[k].verificado);
}

/* Quanto de um rendimento fica isento pelo IRS Jovem. O ano conta-se a partir
   do primeiro em que se teve rendimentos, não da idade. */
function irsIsencaoJovem(rendimento, anoDeRendimentos) {
  const j = IRS_REF.jovem;
  const i = Math.floor(anoDeRendimentos) - 1;
  if (!(i >= 0 && i < j.isencao.length)) return 0;
  const tecto = j.tectoIAS * IRS_REF.ias;
  return arred(Math.min(rendimento * j.isencao[i], tecto));
}

/* O rendimento de um titular, já sem o que não é tributado. Ainda sem o
   mínimo de existência: esse precisa de saber o agregado inteiro, e faz-se
   uma camada acima. */
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
     para a Segurança Social. Para quem ganha pouco, é quase sempre o da lei.
     Quem paga quotas a uma ordem profissional tem direito a um tecto mais
     alto — 240 € de rendimento que deixa de ser tributado, sem papelada. */
  const ss = Math.max(0, Number(t.segurancaSocial) || 0);
  const tectoTrabalho = t.ordemProfissional
    ? IRS_REF.especificas.comOrdemProfissional : IRS_REF.especificas.trabalho;
  const especDep = dep > 0 ? Math.min(dep, Math.max(tectoTrabalho, ss)) : 0;
  const especPen = pen > 0 ? Math.min(pen, IRS_REF.especificas.pensoes) : 0;
  /* A parte dos recibos verdes que o coeficiente tira também é uma dedução
     específica para efeitos do mínimo de existência — está na legenda do
     quadro da AT, e sem isto quem passa recibos verdes ficava com um
     abatimento maior do que a lei dá. */
  const especRV = arred(rv - rvTributavel);

  /* RB é o bruto declarado, com o isento lá dentro: é assim que o artigo 70.º
     o define, e é por isso que o IRS Jovem não aumenta o mínimo de
     existência. */
  const rb = arred(dep + pen + rv);
  const de = arred(especDep + especPen + especRV);
  const tributavel = arred(dep + pen + rvTributavel);

  return {
    bruto: tributavel,
    brutoDeclarado: rb,
    especifica: de,
    especificaTributavel: arred(especDep + especPen),
    isentoJovem: arred(isento),
    liquido: arred(Math.max(0, tributavel - especDep - especPen - isento)),
    retido: Math.max(0, Number(t.retencao) || 0)
  };
}

/* As deduções à colecta: o que se gastou, vezes a percentagem, até ao tecto.
   Devolve também o que ficou por usar em cada uma — é isso que permite dizer
   "gastou de mais em saúde para o tecto que tem" ou "ainda cabe aqui". */
function irsDeducoes(g, nSujeitos, nDependentes, nAscendentes, opcoes) {
  const c = IRS_REF.coleta;
  const o = opcoes || {};
  /* `travavel` diz se esta dedução entra ou não no tecto global do artigo
     78.º n.º 7. A nota 7 da tabela das Finanças enumera as que entram —
     saúde, educação, imóveis, pensões de alimentos, exigência de factura,
     lares e benefícios fiscais — e essa lista não é decorativa: os filhos,
     os pais em casa, as despesas gerais da família e a empregada doméstica
     ficam **de fora**, e são deduzidos por inteiro.

     Estava mal, e custava dinheiro a quem tem filhos: uma família com três
     filhos via a dedução de 1.800 € entrar no mesmo saco das despesas de
     saúde e ser cortada pelo tecto. Não é assim — os 1.800 € são deles, por
     cima do tecto. */
  const linha = (nome, gasto, pct, tecto, travavel) => {
    const bruta = arred(Math.max(0, Number(gasto) || 0) * pct);
    return {
      nome: nome, gasto: arred(Math.max(0, Number(gasto) || 0)),
      valor: arred(Math.min(bruta, tecto)),
      tecto: (tecto === Infinity) ? null : arred(tecto),
      sobra: (tecto === Infinity) ? 0 : arred(Math.max(0, tecto - bruta)),
      travavel: !!travavel
    };
  };

  const filhos = irsDeducaoDependentes(o.idades, nDependentes);
  const ascFixo = (nAscendentes === 1) ? c.ascendente.sozinho : c.ascendente.fixo;

  /* Família monoparental: 45% em vez de 35%, e 335 € em vez de 250 €. É mais
     dinheiro do que o tecto normal de um casal a dividir, e passa despercebido
     porque a caixa nem sequer aparece na maior parte dos simuladores. */
  const geraisPct = o.monoparental ? c.gerais.monoPct : c.gerais.pct;
  const geraisTecto = o.monoparental
    ? c.gerais.monoTecto : c.gerais.tecto * Math.max(1, nSujeitos);

  const linhas = [
    { nome: 'Filhos', gasto: null, valor: filhos.valor, tecto: null, sobra: 0,
      exacto: filhos.exacto, travavel: false },
    { nome: 'Pais ou sogros em casa', gasto: null,
      valor: arred(ascFixo * (nAscendentes || 0)), tecto: null, sobra: 0,
      travavel: false },
    linha('Despesas gerais da família', g.gerais, geraisPct, geraisTecto, false),
    linha('Empregada doméstica', g.domestico, c.domestico.pct, c.domestico.tecto, false),
    linha('Saúde', g.saude, c.saude.pct, c.saude.tecto, true),
    linha('Educação', g.educacao, c.educacao.pct, c.educacao.tecto, true),
    linha('Renda da casa', g.rendas, c.rendas.pct,
      irsTectoRendas(o.coletavel === undefined ? Infinity : o.coletavel), true),
    linha('Lar', g.lares, c.lares.pct, c.lares.tecto, true),
    linha('IVA das facturas', g.iva, c.ivaFaturas.pct, c.ivaFaturas.tecto, true),
    linha('Pensão de alimentos', g.alimentos, c.alimentos.pct, c.alimentos.tecto, true)
  ].filter(l => l.valor > 0 || l.gasto > 0);

  const soma = f => arred(linhas.filter(f).reduce((s, l) => s + l.valor, 0));
  return {
    linhas: linhas,
    total: soma(() => true),
    /* As duas metades: a que o tecto global pode cortar, e a que não pode. */
    travavel: soma(l => l.travavel),
    livre: soma(l => !l.travavel)
  };
}

/* Uma declaração inteira: de rendimentos a "recebe" ou "paga". */
function irsCalcular(d) {
  const titulares = (d.titulares || []).map(irsRendimentoLiquido);
  const conjunta = !!d.conjunta && titulares.length > 1;
  const nSujeitos = conjunta ? 2 : 1;

  const brutoTotal  = arred(titulares.reduce((s, t) => s + t.brutoDeclarado, 0));
  const retidoTotal = arred(titulares.reduce((s, t) => s + t.retido, 0));

  /* O mínimo de existência é um abatimento ao colectável, por titular, e é
     calculado com o bruto de cada um — mas o corte que o desliga olha para o
     agregado inteiro. */
  const abatimentos = titulares.map(t => irsAbatimentoMinimo(
    t.brutoDeclarado, t.especifica, nSujeitos, brutoTotal, d.naoEnglobados || 0));
  const abatimento = arred(abatimentos.reduce((s, a) => s + a, 0));

  const coletaveis = titulares.map((t, i) => arred(Math.max(0, t.liquido - abatimentos[i])));
  const liquidoTotal = arred(coletaveis.reduce((s, c) => s + c, 0));

  /* O quociente conjugal: divide-se por dois, aplica-se a tabela, e
     multiplica-se por dois. É isto que faz a tributação conjunta compensar
     quando um ganha muito mais do que o outro — e é uma escolha que quase
     toda a gente faz sem saber que está a escolher. */
  const coletavelDeReferencia = conjunta ? arred(liquidoTotal / 2) : liquidoTotal;
  let coleta;
  if (conjunta) {
    coleta = arred(irsImposto(liquidoTotal / 2) * 2);
  } else {
    coleta = arred(coletaveis.reduce((s, c) => s + irsImposto(c), 0));
  }

  /* Quanto é que o mínimo de existência valeu em euros de imposto. É o número
     que interessa mostrar: dizer "abateram-lhe 5.717,85 € ao colectável" não
     diz nada a ninguém.

     A conta faz-se com o colectável **antes** do abatimento — o `t.liquido` —
     e não com o colectável de agora mais o abatimento. Parece a mesma coisa e
     não é: um jovem com o IRS Jovem já tem o colectável em zero, o abatimento
     não lhe poupa cêntimo nenhum, e somá-lo de volta fazia a app anunciar-lhe
     uma poupança que não existiu. */
  const semAbatimentoTotal = arred(titulares.reduce((s, t) => s + t.liquido, 0));
  const semAbatimento = conjunta
    ? arred(irsImposto(semAbatimentoTotal / 2) * 2)
    : arred(titulares.reduce((s, t) => s + irsImposto(t.liquido), 0));
  const minimoAplicado = arred(Math.max(0, semAbatimento - coleta));

  const ded = irsDeducoes(d.gastos || {}, nSujeitos, d.dependentes || 0,
    d.ascendentes || 0, {
      coletavel: coletavelDeReferencia,
      monoparental: !!d.monoparental,
      idades: d.idades
    });

  /* O tecto de tudo junto. Sem isto o simulador prometia a quem tem
     rendimento alto uma dedução que a lei não deixa ter. Duas armadilhas
     numa linha só, as duas na nota 7: num casal em conjunto o colectável
     entra já dividido por dois, e o tecto **só corta** as deduções da lista
     do n.º 7 — os filhos, os pais em casa, as despesas gerais e a empregada
     doméstica passam por cima dele. */
  const tectoTudo = irsTectoGlobal(coletavelDeReferencia, d.dependentes || 0);
  const deduzido = arred(ded.livre + Math.min(ded.travavel, tectoTudo));
  const liquida = arred(Math.max(0, coleta - deduzido));

  const resultado = arred(retidoTotal - liquida);

  return {
    conjunta: conjunta,
    bruto: brutoTotal,
    coletavel: liquidoTotal,
    coletavelPorSujeito: coletavelDeReferencia,
    coleta: coleta,
    deducoes: ded,
    deduzido: deduzido,
    tectoGlobal: tectoTudo,
    /* O abatimento em euros de rendimento, e o que ele poupou em imposto. */
    abatimentoMinimo: abatimento,
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

/* Quanto é que ainda falta gastar-com-factura para encher uma dedução. É o
   conselho mais accionável desta ferramenta inteira, e o único que serve para
   alguma coisa em Fevereiro: "faltam-lhe 214 € de facturas com o número para
   apanhar os 250 € todos". */
function irsQuantoFaltaParaOTecto(gasto, regra, tecto) {
  const g = Math.max(0, Number(gasto) || 0);
  const t = (tecto === undefined) ? regra.tecto : tecto;
  const precisa = t / regra.pct;
  if (g >= precisa) return null;
  return { faltaGastar: arred(precisa - g), ganha: arred(t - g * regra.pct) };
}

function arred(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IRS_REF, IRS_FONTE_AT, irsColeta, irsSolidariedade, irsImposto,
    irsCalcular, irsMelhorOpcao, irsDeducoes,
    irsTectoGlobal, irsTectoRendas, irsConferirMedias, irsConferirParcelas,
    irsAbatimentoMinimo, irsValorReferencia, irsLimiteL,
    irsDeducaoDependentes, irsRendimentoLiquido, irsIsencaoJovem,
    irsFacturasEmFalta, irsQuantoFaltaParaOTecto, irsPorConfirmar
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
  escaloes: 'os escalões', solidariedade: 'a taxa de solidariedade',
  especificas: 'a dedução específica',
  minimoExistencia: 'o mínimo de existência',
  simplificado: 'os coeficientes dos recibos verdes',
  jovem: 'a escada dos dez anos do IRS Jovem',
  coleta: 'os limites das deduções',
  limiteGlobal: 'o tecto global das deduções'
};

function irsNomeTabela(k) { return IRS_NOMES[k] || k; }

function irsNum(id) {
  const e = document.getElementById(id);
  if (!e) return 0;
  const v = parseFloat(String(e.value).replace(/\s/g, '').replace(',', '.'));
  return isFinite(v) ? v : 0;
}

function irsTexto(id) {
  const e = document.getElementById(id);
  return e ? String(e.value || '') : '';
}

/* "3, 1, 7" vira [3, 1, 7]. Se vier vazio ou com lixo, devolve nada e a
   dedução por filhos usa o valor base — e o ecrã diz que usou. */
function irsIdades(txt, quantos) {
  const n = String(txt || '').split(/[,;\s]+/)
    .map(x => parseInt(x, 10)).filter(x => isFinite(x) && x >= 0 && x < 120);
  return (n.length && n.length === quantos) ? n : null;
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

  const porConfirmar = irsPorConfirmar();

  zona.innerHTML =
    (porConfirmar.length ? '<div class="irs-aviso-lei">' +
      '<b>Ferramenta em construção — falta confirmar parte dos números.</b>' +
      '<span>Os escalões, as deduções, o mínimo de existência e os tectos já ' +
      'foram conferidos no texto da lei e na tabela oficial das Finanças. ' +
      'Falta confirmar: ' + porConfirmar.map(irsNomeTabela).join(' e ') + '. ' +
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
    irsCampo('irs-idades', 'Que idades têm, a 31 de Dezembro',
      'Separadas por vírgula: 3, 1. Vale dinheiro — um filho com 3 anos ou ' +
      'menos dá mais 126 €, e do segundo em diante com 6 anos ou menos dá ' +
      'mais 300 € cada.', g.idades) +
    irsCampo('irs-asc', 'Pais ou sogros que vivam consigo',
      'Só contam se não receberem mais do que a pensão mínima. Se for só um, ' +
      'a dedução é maior. Muita gente não sabe que isto existe.', g.asc) +
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

    '<div class="irs-falta" id="irs-falta"></div>' +
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
  const nFilhos = irsNum('irs-dep');

  const titulares = [{
    trabalho: irsNum('irs-trab'), retencao: irsNum('irs-ret'),
    segurancaSocial: irsNum('irs-ss'), recibosVerdes: irsNum('irs-rv'),
    jovem: jovem, anoJovem: irsNum('irs-anojovem') || 1
  }];
  if (casal) titulares.push({ trabalho: irsNum('irs-trab2'), retencao: irsNum('irs-ret2') });

  const dados = {
    titulares: titulares, conjunta: casal,
    dependentes: nFilhos, ascendentes: irsNum('irs-asc'),
    idades: irsIdades(irsTexto('irs-idades'), nFilhos),
    gastos: {
      saude: irsNum('irs-saude'), educacao: irsNum('irs-educ'),
      rendas: irsNum('irs-renda'), gerais: irsNum('irs-gerais')
    }
  };

  irsGuardar({
    quem: casal ? 'casal' : 'so', jovem: jovem, anojovem: irsNum('irs-anojovem'),
    trab: irsNum('irs-trab'), ret: irsNum('irs-ret'), ss: irsNum('irs-ss'), rv: irsNum('irs-rv'),
    trab2: irsNum('irs-trab2'), ret2: irsNum('irs-ret2'),
    dep: nFilhos, idades: irsTexto('irs-idades'), asc: irsNum('irs-asc'),
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
    document.getElementById('irs-falta').innerHTML = '';
    return;
  }

  const r = irsCalcular(dados);
  const filhos = r.deducoes.linhas.find(l => l.nome === 'Filhos');
  alvo.innerHTML =
    '<div class="irs-numero ' + (r.recebe ? 'bom' : 'mau') + '">' +
      '<span class="rot">' + (r.recebe ? 'Estimativa: vai receber' : 'Estimativa: vai pagar') + '</span>' +
      '<b>' + dinheiro(Math.abs(r.resultado)) + '</b>' +
    '</div>' +
    '<details class="irs-conta"><summary>Ver a conta toda</summary><ul>' +
      '<li>Rendimento sobre o qual se paga <b>' + dinheiro(r.coletavel) + '</b></li>' +
      (r.minimoAplicado > 0 ? '<li>Mínimo de existência — poupou-lhe <b>' +
        dinheiro(r.minimoAplicado) + '</b> de imposto</li>' : '') +
      '<li>Imposto antes das deduções <b>' + dinheiro(r.coleta) + '</b></li>' +
      r.deducoes.linhas.map(l => '<li>− ' + l.nome + ' <b>' + dinheiro(l.valor) + '</b>' +
        (l.sobra > 0 && l.gasto ? '<span class="irs-sobra">ainda cabiam mais ' +
          dinheiro(l.sobra) + ' de dedução</span>' : '') + '</li>').join('') +
      (filhos && filhos.exacto === false ? '<li class="irs-sobra">Escreva as idades dos ' +
        'filhos para a dedução ficar certa — pode dar mais.</li>' : '') +
      (r.deduzido < r.deducoes.total ? '<li class="irs-sobra">A saúde, a educação, a casa e ' +
        'o lar juntos pararam no tecto de ' + dinheiro(r.tectoGlobal) + ' — é a lei, não é ' +
        'engano. Os filhos e as despesas gerais ficam de fora deste tecto e contam por ' +
        'inteiro.</li>' : '') +
      '<li>Imposto devido <b>' + dinheiro(r.imposto) + '</b></li>' +
      '<li>Já lhe descontaram <b>' + dinheiro(r.retido) + '</b></li>' +
    '</ul></details>';

  /* ---- o conselho que serve para alguma coisa em Fevereiro ----
     Não é dizer quanto vai receber: é dizer quanto falta pedir com o número
     para não deixar dinheiro na mesa.

     E há um travão em cima disto que não é opcional. Uma dedução só devolve
     dinheiro enquanto houver imposto para abater: quem já está a zero não
     ganha mais nada por pedir mais facturas. Sem este travão a caixa dizia a
     uma pessoa que paga 0 € que ainda podia poupar 145 € — um número grande,
     simpático, e falso. É exactamente o género de mentira por omissão que
     esta aplicação não faz. */
  const falta = document.getElementById('irs-falta');
  const margem = r.imposto;
  const avisos = [];
  if (margem > 0) {
    const gerais = irsQuantoFaltaParaOTecto(dados.gastos.gerais, IRS_REF.coleta.gerais,
      IRS_REF.coleta.gerais.tecto * (casal ? 2 : 1));
    if (gerais && Math.min(gerais.ganha, margem) >= 5) {
      avisos.push('Faltam-lhe <b>' + dinheiro(gerais.faltaGastar) + '</b> de compras com ' +
        'factura no seu número para apanhar a dedução de despesas gerais toda. ' +
        'São até <b>' + dinheiro(Math.min(gerais.ganha, margem)) + '</b> de imposto a ' +
        'menos, e é a dedução mais fácil de ganhar: mercado, luz, água, roupa, café.');
    }
    const saude = irsQuantoFaltaParaOTecto(dados.gastos.saude, IRS_REF.coleta.saude);
    if (saude && dados.gastos.saude > 0 && Math.min(saude.ganha, margem) >= 20) {
      avisos.push('Em saúde ainda cabem mais <b>' +
        dinheiro(Math.min(saude.ganha, margem)) + '</b> de dedução por usar. ' +
        'A farmácia conta, e as receitas do médico também.');
    }
  }
  falta.innerHTML = avisos.length
    ? '<div class="irs-dica"><b>O que ainda dá para fazer</b><ul><li>' +
      avisos.join('</li><li>') + '</li></ul></div>'
    : (r.coleta > 0 && margem === 0
      /* Quem já não paga nada merece ouvi-lo em vez de ficar com um espaço
         em branco onde estava um conselho. */
      ? '<div class="irs-dica"><b>Já não há nada a ganhar aqui</b><ul><li>As suas ' +
        'deduções já apagaram o imposto todo. Pedir mais facturas com o número ' +
        'não lhe devolve mais nada este ano — mas continua a valer a pena em ' +
        'Janeiro, quando o ano recomeça.</li></ul></div>'
      : '');

  /* A comparação que vale dinheiro e que quase ninguém faz. */
  const cmp = document.getElementById('irs-comparar');
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
