/* ============================================================
   Vida Financeira — interpretar o que a pessoa escreve

   "acabei de gastar 30 euros no mercado continente" tem de virar um
   movimento lançado, sem a pessoa tocar em mais nada.

   Porque é que isto não usa inteligência artificial: o site é estático e
   público. Uma chave de um serviço de IA ia dentro do código, à vista de
   toda a gente, e a primeira pessoa que a copiasse gastava o dinheiro do
   projecto. Além disso deixaria de funcionar sem internet — e a aplicação
   toda foi feita para funcionar sem.

   O que isto é: um leitor de português escrito à mão, com o vocabulário de
   quem fala de dinheiro em Portugal e no Brasil. Corre no telemóvel, em
   silêncio, sem enviar nada para lado nenhum. Nenhuma frase sai deste
   aparelho — e para quem escreve quanto ganha e onde compra, isso não é um
   pormenor técnico, é a diferença entre usar e não usar.

   Regra que atravessa o ficheiro: na dúvida, não inventar. Uma frase que
   não se percebe devolve `ok:false` e segue para o assistente responder por
   palavras, em vez de gravar um movimento errado nas contas de alguém.
   ============================================================ */

/* ---------- números ----------
   "30", "30,50", "1.500,00", "1 500,00", "30€", "R$ 30", "mil e quinhentos".
   Os separadores mudam de país e às vezes dentro da mesma frase, por isso
   decide-se pela forma e não por uma regra fixa. */

const INT_PALAVRA = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  catorze: 14, quatorze: 14, quinze: 15, dezasseis: 16, dezesseis: 16,
  dezassete: 17, dezessete: 17, dezoito: 18, dezanove: 19, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
  duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500,
  seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900
};

function semAcentos(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* "1.500,00" e "1,500.00" querem dizer o mesmo em países diferentes. Decide-se
   pelo último separador: se o que vem depois dele tem duas casas, é decimal;
   se tem três, era separador de milhares. */
function numeroDeTexto(bruto) {
  let s = String(bruto).replace(/\s| | /g, '');
  const temV = s.includes(','), temP = s.includes('.');

  if (temV && temP) {
    s = (s.lastIndexOf(',') > s.lastIndexOf('.'))
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (temV) {
    const dep = s.length - s.lastIndexOf(',') - 1;
    s = (dep === 3) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (temP) {
    const dep = s.length - s.lastIndexOf('.') - 1;
    if (dep === 3) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

/* "mil e quinhentos", "dois mil", "trezentos e cinquenta". Só o que se diz
   mesmo a falar de dinheiro — não é um analisador de numerais completo. */
function numeroPorExtenso(texto) {
  const p = semAcentos(texto).toLowerCase().split(/[\s]+/).filter(Boolean);
  let total = 0, corrente = 0, viu = false;

  for (const w of p) {
    if (w === 'e') continue;
    if (w === 'mil') { corrente = (corrente || 1) * 1000; total += corrente; corrente = 0; viu = true; continue; }
    if (w === 'milhao' || w === 'milhoes') { corrente = (corrente || 1) * 1e6; total += corrente; corrente = 0; viu = true; continue; }
    if (Object.prototype.hasOwnProperty.call(INT_PALAVRA, w)) { corrente += INT_PALAVRA[w]; viu = true; continue; }
    return null;   // uma palavra que não é número: isto não era um numeral
  }
  const n = total + corrente;
  return viu && n > 0 ? n : null;
}

/* Todos os valores da frase, com a posição onde estão. A posição é o que
   permite saber a que parte da frase cada valor pertence quando há mais do
   que um: "30 no mercado e 12 na farmácia". */
function acharValores(texto) {
  const achados = [];
  const re = /(?:€|R\$|\$|£|kz)\s*([0-9][0-9.,\s  ]*)|([0-9][0-9.,\s  ]*)\s*(?:€|R\$|\$|£|kz|euros?|reais?|real|libras?|kwanzas?|paus|contos)?/gi;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const bruto = (m[1] !== undefined ? m[1] : m[2]);
    if (bruto === undefined) continue;
    const limpo = bruto.replace(/[\s  ]+$/, '');
    if (!/[0-9]/.test(limpo)) continue;
    const v = numeroDeTexto(limpo);
    if (v === null || v <= 0) continue;

    /* O "12" de "12 vezes" é a contagem das prestações, não dinheiro. Sem
       isto, "em 12 vezes de 45,90" lançava doze euros, perdia o valor a sério
       e ainda ficava com dois valores — o que desligava a leitura das
       prestações, que só corre quando há um valor só. */
    const depois = texto.slice(m.index + bruto.length);
    if (/^\s*(x\b|vezes|prestac|parcela)/i.test(semAcentos(depois))) continue;

    achados.push({ valor: v, inicio: m.index, fim: m.index + m[0].length, texto: m[0].trim() });
    if (re.lastIndex === m.index) re.lastIndex++;
  }

  /* Por extenso, e só quando não houve algarismos nenhuns: "recebi mil euros".
     Se houver algarismos, eles mandam — ninguém escreve as duas coisas. */
  if (!achados.length) {
    const t = semAcentos(texto).toLowerCase();
    const mm = t.match(/((?:(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezasseis|dezesseis|dezassete|dezessete|dezoito|dezanove|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil|milhao|milhoes)(?:\s+e\s+|\s+)?)+)/);
    if (mm) {
      const v = numeroPorExtenso(mm[1]);

      /* "um" e "uma" quase nunca são o número um: são o artigo. Em «isso não é
         **um** saldo negativo, arruma isso» não há dinheiro nenhum — e, sem
         esta linha, havia: a frase era lida como o valor 1 e o saldo da pessoa
         passava a um euro. Foi mesmo o que aconteceu a quem escreveu isso à
         aplicação, e o que ela respondeu a seguir — "menos um" — era o artigo
         a ser tratado como dinheiro.

         Para "um" contar como número tem de vir com a moeda à frente
         ("um euro", "uma nota de..."), que é como as pessoas escrevem quando
         é mesmo um. */
      const soUm = /^(um|uma)$/.test(mm[1].trim());
      const comMoeda = /^\s*(euros?|eur|reais?|real|r\$|€|\$)/.test(t.slice(mm.index + mm[1].length));
      if (v && (!soUm || comMoeda)) {
        achados.push({ valor: v, inicio: mm.index, fim: mm.index + mm[1].length, texto: mm[1].trim() });
      }
    }
  }
  return achados;
}

/* ---------- lojas e serviços ----------
   O nome da loja diz a categoria melhor do que qualquer palavra: quem escreve
   "continente" está a falar de mercado e não é preciso perguntar-lhe nada.
   Duas listas, uma por país, porque os nomes não se traduzem. */
const LOJAS = [
  // ---- mercado ----
  { k: ['continente','pingo doce','lidl','aldi','minipreco','intermarche','auchan','jumbo','mercadona','recheio','makro','spar','meu super','froiz','apolonia'], cat: 'mercado', pais: 'pt' },
  { k: ['carrefour','assai','atacadao','pao de acucar','extra','big','sam s club','sams club','mercado livre','oxxo','tenda','sonda','condor','angeloni','zaffari','supermercado','mercadinho','sacolao','feira','quitanda','acougue'], cat: 'mercado', pais: 'br' },
  { k: ['mercado','supermercado','minimercado','mercearia','talho','peixaria','padaria','hipermercado'], cat: 'mercado' },

  // ---- contas e serviços ----
  { k: ['edp','galp energia','endesa','iberdrola','goldenergy','repsol luz','epal','aguas de','indaqua'], cat: 'contas', pais: 'pt' },
  { k: ['meo','nos','vodafone','nowo','altice','uzo','moche'], cat: 'contas', pais: 'pt' },
  { k: ['enel','light','cemig','copel','celpe','coelba','cpfl','neoenergia','sabesp','cedae','copasa','comgas'], cat: 'contas', pais: 'br' },
  { k: ['vivo','claro','tim','oi ','net virtua','sky'], cat: 'contas', pais: 'br' },
  { k: ['luz','electricidade','eletricidade','agua','gas','internet','telemovel','celular','telefone','tv','netflix','spotify','condominio','condominio','iptu','imi','seguro'], cat: 'contas' },

  // ---- transporte ----
  { k: ['bp','cepsa','prio','repsol','galp'], cat: 'transporte', pais: 'pt' },
  { k: ['ipiranga','shell','petrobras','br mania','posto'], cat: 'transporte', pais: 'br' },
  { k: ['uber','bolt','99','taxi','metro','autocarro','onibus','comboio','cp ','carris','passe','bilhete','gasolina','gasoleo','diesel','combustivel','etanol','alcool','portagem','pedagio','estacionamento','oficina','pneu'], cat: 'transporte' },

  // ---- saúde ----
  { k: ['farmacia','drogaria','drogasil','droga raia','pacheco','wells','continente saude'], cat: 'saude' },
  { k: ['medico','dentista','consulta','analises','exame','hospital','clinica','remedio','remedios','comprimidos','oculos'], cat: 'saude' },

  // ---- casa ----
  { k: ['renda','aluguel','aluguer','prestacao da casa','credito habitacao','senhorio','imobiliaria'], cat: 'casa' },
  { k: ['ikea','leroy','aki','maxmat','obi','telhanorte','tok stok'], cat: 'casa' },

  // ---- educação ----
  { k: ['escola','colegio','creche','ama','explicacoes','faculdade','universidade','propina','mensalidade escolar','livros escolares','material escolar','curso'], cat: 'educacao' },

  // ---- lazer ----
  { k: ['cinema','restaurante','cafe','bar','pizza','mcdonald','burger','kfc','pizzaria','padoca','lanchonete','ifood','uber eats','glovo','bolt food','ginasio','academia','netflix','viagem','ferias','presente','roupa','zara','h m','primark','shein','decathlon','sport zone'], cat: 'lazer' },

  // ---- dívidas ----
  { k: ['cartao de credito','rotativo','emprestimo','financiamento','credito pessoal','consignado','crediario','carne','prestacao','parcela','divida','agiota','cetelem','cofidis','unibanco'], cat: 'dividas' }
];

/* Categorias de entrada. */
const ENTRADAS_CAT = [
  { k: ['salario','ordenado','vencimento','pagamento do trabalho','recibo verde','holerite','contracheque'], cat: 'salario' },
  { k: ['subsidio','13','decimo terceiro','ferias','natal','rsi','rendimento social','bolsa familia','abono','prestacao social','pensao','reforma','desemprego','seguranca social','inss','bpc','auxilio'], cat: 'salario' },
  { k: ['biscate','extra','freela','freelance','trabalho extra','bico','uber','entregas','servico'], cat: 'extra' },
  { k: ['vendi','venda','vendas','olx','vinted','marketplace','enjoei'], cat: 'vendas' },
  { k: ['presente','prenda','ofereceram','deram-me','me deram','doacao'], cat: 'presente' },
  { k: ['juros','rendimento','dividendos','poupanca rendeu'], cat: 'juros' }
];

/* ---------- o que a frase quer dizer ---------- */
/* Escrito por extenso e não por radicais. "gast" apanhava "gastar" numa
   pergunta sobre o futuro, e a diferença entre "gastei" e "vou gastar" é a
   diferença entre registar um facto e inventar um. */
const V_SAIDA = ['gastei','gastou','gastamos','gastei-me','gasto','gastar',
  'paguei','pagou','pagamos','pago','pagar',
  'comprei','comprou','compramos','compra ','comprar',
  'custou','custa','torrei','deixei','saiu','despesa','despesas',
  'abasteci','meti','carreguei','levei','fiz compras','fui ao','fui a ',
  /* Levantar dinheiro tira-o da conta — o que sai do banco sai do banco,
     mesmo que fique no bolso. Faltava, e sem isto "levantei 200 no
     multibanco" não era nada: nem gasto, nem saldo, nem resposta. */
  'levantei','levantou','levantamento','retirei','retirou','saquei','sacou','saque'];
const V_ENTRADA = ['recebi','recebeu','recebemos','recebo','recebido',
  'ganhei','ganhou','ganho','entrou','caiu','me pagaram','pagaram-me',
  'depositaram','veio','creditaram','recebimento','entrada de','vendi','vendeu'];

/* Frases sobre o que ainda não aconteceu. "vou comprar uma tv de 300" não é
   uma compra — e gravá-la punha na conta da pessoa dinheiro que ela ainda
   tem. */
const FUTURO = ['vou ','vamos ','quero ','queria ','penso ','pretendo ','se eu ',
  'preciso de ','tenho de ','tenho que ','devia ','pensei em ','estou a pensar'];
/* ---------- dizer quanto se tem ----------

   "Tenho 1000 no banco" não é um movimento: é um facto sobre o presente. E há
   duas coisas muito diferentes que se dizem com as mesmas palavras:

     "tenho 1000 no banco"      → é o dinheiro da conta, o que dá para gastar
     "tenho 1000 de lado"       → é a reserva, dinheiro que está guardado

   Isto esteve tudo no mesmo saco, e o resultado era o pior possível: alguém
   dizia quanto tinha na conta, a app arrumava-o na reserva, e o número grande
   do ecrã continuava a dizer outra coisa. A pessoa lia isso como "a ferramenta
   não percebeu nada do que eu disse" — e tinha razão. */
const V_SALDO = ['tenho','tinha','fiquei com','sobrou-me','sobrou me','me sobrou',
  'estou com','ando com','restam','resta-me','resta me','me restam','sobra-me','sobra me',
  'o meu saldo e','meu saldo e','o saldo e','saldo atual e','saldo actual e','saldo real e',
  'no banco','na conta','na poupanca','de lado','guardado','poupado','na carteira','em casa'];

/* Onde é que o dinheiro está. Sem nada dito, é a conta — é o caso comum, e é
   o que a pessoa quer ver quando pergunta "quanto tenho?". */
const ONDE_RESERVA = ['de lado','guardado','guardados','poupado','poupados','poupanca',
  'reserva','pe de meia','pé de meia','mealheiro','emergencia'];
const ONDE_CONTA = ['no banco','na conta','conta bancaria','multibanco','na carteira',
  'em casa','na mao','a mao','em dinheiro','saldo'];

function contem(t, lista) {
  return lista.some(k => t.includes(k));
}

/* 'conta' ou 'reserva'. Dito nenhum dos dois, é a conta: quem escreve "tenho
   1000" está a falar do dinheiro que tem para viver, não de um pé-de-meia. */
function ondeEstaODinheiro(t) {
  const r = ONDE_RESERVA.filter(k => t.includes(k));
  const c = ONDE_CONTA.filter(k => t.includes(k));
  if (!r.length) return 'conta';
  if (!c.length) return 'reserva';
  /* Ditas as duas ("tenho 1000 no banco, de lado"), ganha a mais comprida —
     a mesma regra que decide as categorias, e pela mesma razão. */
  const maisR = r.reduce((a, b) => a.length >= b.length ? a : b);
  const maisC = c.reduce((a, b) => a.length >= b.length ? a : b);
  return maisR.length > maisC.length ? 'reserva' : 'conta';
}

/* ---------- datas ----------
   "ontem", "sexta", "dia 3", "12/08". Sem data, é hoje — que é o caso quase
   sempre, porque quem escreve isto escreve-o na altura. */
const DIAS_SEMANA = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

function acharData(t, hoje) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (/\banteontem\b/.test(t)) { d.setDate(d.getDate() - 2); return d; }
  if (/\bontem\b/.test(t)) { d.setDate(d.getDate() - 1); return d; }
  if (/\bhoje\b|\bagora\b|\bacabei de\b|\bacabo de\b/.test(t)) return d;

  const dm = t.match(/\b([0-3]?[0-9])[\/\-]([01]?[0-9])(?:[\/\-](\d{2,4}))?\b/);
  if (dm) {
    const dia = Number(dm[1]), mes = Number(dm[2]) - 1;
    let ano = dm[3] ? Number(dm[3]) : hoje.getFullYear();
    if (ano < 100) ano += 2000;
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      const cand = new Date(ano, mes, dia);
      /* Sem ano escrito e a data ainda por chegar: era do ano passado. Quem
         escreve "25/12" em Janeiro está a falar do Natal que passou. */
      if (!dm[3] && cand > d) cand.setFullYear(ano - 1);
      return cand;
    }
  }

  const dn = t.match(/\bdia\s+([0-3]?[0-9])\b/);
  if (dn) {
    const dia = Number(dn[1]);
    if (dia >= 1 && dia <= 31) {
      const cand = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      if (cand > d) cand.setMonth(cand.getMonth() - 1);   // "dia 28" no dia 3 é o mês passado
      return cand;
    }
  }

  for (let i = 0; i < DIAS_SEMANA.length; i++) {
    if (new RegExp('\\b' + DIAS_SEMANA[i] + '(-feira)?\\b').test(t)) {
      const cand = new Date(d);
      const recuo = (d.getDay() - i + 7) % 7;
      cand.setDate(d.getDate() - (recuo === 0 ? 7 : recuo));
      return cand;
    }
  }
  return d;
}

/* ---------- prestações ---------- */
function acharParcelas(t) {
  const m = t.match(/\b(?:em\s+)?(\d{1,2})\s*(?:x|vezes|prestacoes|prestacao|parcelas|parcela)\b/);
  if (!m) return 0;
  const n = Number(m[1]);
  return (n >= 2 && n <= 60) ? n : 0;
}

/* ---------- categoria a partir de um pedaço de frase ---------- */
function acharCategoria(trecho, tipo) {
  const t = semAcentos(trecho).toLowerCase();

  if (tipo === 'entrada') {
    for (const g of ENTRADAS_CAT) {
      for (const k of g.k) if (t.includes(k)) return { cat: g.cat, rotulo: k };
    }
    return { cat: 'outros-e', rotulo: null };
  }

  /* A chave mais comprida ganha: "cartao de credito" antes de "credito", e
     "pao de acucar" antes de "acucar". Sem isto uma palavra curta apanhava
     frases que eram de outra coisa. */
  let melhor = null;
  for (const g of LOJAS) {
    for (const k of g.k) {
      if (t.includes(k) && (!melhor || k.length > melhor.rotulo.length)) {
        melhor = { cat: g.cat, rotulo: k };
      }
    }
  }
  return melhor || { cat: 'outros-s', rotulo: null };
}

/* Nome bonito para a descrição: o pedaço da frase que nomeia a loja, com a
   primeira letra em maiúscula. Vale mais "Continente" do que "mercado". */
function bonito(rotulo) {
  if (!rotulo) return '';
  return rotulo.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

/* ============================================================
   O leitor
   ============================================================ */
function interpretar(texto, opcoes) {
  const cru = String(texto || '').trim();
  if (!cru) return { ok: false, motivo: 'vazio' };

  const o = opcoes || {};
  const hoje = o.hoje ? new Date(o.hoje) : new Date();
  const t = semAcentos(cru).toLowerCase();

  const valores = acharValores(cru);
  if (!valores.length) return { ok: false, motivo: 'sem-valor' };

  /* Uma frase sem verbo nenhum de dinheiro é quase sempre uma pergunta com um
     número lá dentro — "quanto rende 1000 euros?". Deixa-se passar para o
     assistente responder, em vez de lançar um movimento que ninguém pediu. */
  const ehSaida = contem(t, V_SAIDA);
  const ehEntrada = contem(t, V_ENTRADA);
  const ehSaldo = contem(t, V_SALDO);
  if (!ehSaida && !ehEntrada && !ehSaldo) return { ok: false, motivo: 'sem-verbo' };

  /* Perguntas não são lançamentos, mesmo com verbo e número. */
  if (/\?$/.test(cru) || /^(quanto|quando|como|porque|por que|onde|sera que|vale a pena|devo|posso)\b/.test(t)) {
    return { ok: false, motivo: 'pergunta' };
  }

  /* Nem intenções. "vou comprar uma tv de 300" não é uma compra, e gravá-la
     tirava à pessoa dinheiro que ela ainda tem. */
  if (contem(t, FUTURO)) return { ok: false, motivo: 'futuro' };

  const data = acharData(t, hoje);
  const parcelas = acharParcelas(t);

  /* "tenho 1000 no banco" não é um movimento: é o saldo de agora. Tratado à
     parte porque gravá-lo como entrada dizia que a pessoa recebeu hoje mil
     euros, e isso é falso — ela só disse que os tem. */
  if (ehSaldo && !ehSaida && !ehEntrada) {
    return {
      ok: true, tipo: 'saldo',
      onde: ondeEstaODinheiro(t),
      valor: valores[0].valor,
      texto: cru
    };
  }

  const tipo = ehEntrada && !ehSaida ? 'entrada' : 'saida';

  /* Um valor por lançamento. Com vários, cada um fica com o pedaço de frase
     que vai do fim do valor anterior até ao fim do seu — é aí que está o
     nome da loja em "30 no continente e 12 na farmácia". */
  const lancamentos = valores.map((v, i) => {
    /* O trecho começa NO valor e vai até ao valor seguinte, porque em
       português o nome da loja vem depois do número: "30 no continente e 12
       na farmácia". Começá-lo no valor anterior punha o "continente" dentro
       do trecho do 12, e as duas despesas ficavam na mesma categoria. */
    const de = v.inicio;
    const ate = (i + 1 < valores.length) ? valores[i + 1].inicio : cru.length;
    const trecho = cru.slice(de, ate);

    /* Com um valor só, a frase inteira é o contexto; o trecho pode ser curto
       de mais para lá estar a loja. */
    const c = acharCategoria(valores.length === 1 ? cru : trecho, tipo);
    const cGlobal = c.cat === 'outros-s' || c.cat === 'outros-e'
      ? acharCategoria(cru, tipo) : c;

    return {
      tipo: tipo,
      valor: Math.round(v.valor * 100) / 100,
      categoria: cGlobal.cat,
      descricao: bonito(cGlobal.rotulo),
      data: data,
      parcelas: (valores.length === 1) ? parcelas : 0
    };
  });

  return { ok: true, tipo: 'movimentos', lancamentos, texto: cru };
}

/* ============================================================
   A CALCULADORA DO CHAT

   Quem está no mercado com o telemóvel na mão não vai a outro ecrã abrir uma
   ferramenta. Pergunta ali: "12x de 45,90 ou 480 a pronto?". E a resposta tem
   de vir ali, com as contas feitas.

   O que isto responde é sempre aritmética verificável, nunca opinião. "Fica
   mais caro X" é um facto; "não compre" é um conselho, e conselhos sobre o
   dinheiro dos outros não se dão a partir de uma frase escrita à pressa numa
   fila de supermercado.
   ============================================================ */

/* Fora da aplicação (nos testes) não há `dinheiro()`. A alternativa continua a
   ser o `Intl`, e não um `toFixed` — senão mil euros saíam "1000,00" nos
   testes e "1 000,00 €" no ecrã, e um teste que não vê o que a pessoa vê não
   está a testar o que interessa. */
function fmtCalc(v) {
  if (typeof dinheiro === 'function') return dinheiro(v);
  const m = (typeof localStorage !== 'undefined' && localStorage.getItem('vf:moeda')) || 'EUR';
  try {
    return new Intl.NumberFormat(m === 'BRL' ? 'pt-BR' : 'pt-PT',
      { style: 'currency', currency: m, minimumFractionDigits: 2 }).format(v || 0);
  } catch (e) {
    return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  }
}

function fmtNum(v) {
  const n = Math.round(v * 100) / 100;
  return (n % 1 === 0 ? String(n) : n.toFixed(2)).replace('.', ',');
}

/* Todos os números da frase, incluindo os que `acharValores` deixa de fora
   por serem contagens de prestações — aqui esses interessam. */
function numerosCrus(texto) {
  const out = [];
  const re = /([0-9][0-9.,\s  ]*)/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const v = numeroDeTexto(m[1].replace(/[\s  ]+$/, ''));
    if (v !== null) out.push(v);
  }
  return out;
}

function calculadora(texto) {
  const cru = String(texto || '').trim();
  if (!cru) return { ok: false };
  const t = semAcentos(cru).toLowerCase();
  const n = numerosCrus(cru);

  /* --- parcelar: o cálculo mais pedido de todos, e o que mais dinheiro
     poupa a quem o faz antes de assinar --- */
  const mParc = t.match(/(\d{1,2})\s*(?:x|vezes|prestac\w*|parcelas?)\s*(?:de\s*)?([0-9][0-9.,]*)/);
  if (mParc) {
    const vezes = Number(mParc[1]);
    const prestacao = numeroDeTexto(mParc[2]);
    if (vezes >= 2 && prestacao > 0) {
      const total = vezes * prestacao;
      /* O preço a pronto é o outro número da frase, se houver um que não seja
         nem as vezes nem a prestação. */
      const pronto = n.find(v => Math.abs(v - vezes) > 0.001 &&
                                 Math.abs(v - prestacao) > 0.001 && v > prestacao);
      let r = '**' + vezes + ' × ' + fmtCalc(prestacao) + ' = ' + fmtCalc(total) + '**';
      if (pronto) {
        const aMais = total - pronto;
        r += '\n\nA pronto são ' + fmtCalc(pronto) + '.';
        if (aMais > 0.005) {
          const pct = (aMais / pronto) * 100;
          r += ' Parcelado paga **' + fmtCalc(aMais) + ' a mais** — ' +
               fmtNum(pct) + '% acima do preço. Isso é juro, mesmo que digam que não há.';
        } else if (aMais < -0.005) {
          r += ' Parcelado fica ' + fmtCalc(-aMais) + ' **abaixo** do preço a pronto.';
        } else {
          r += ' Dá exactamente o mesmo: aqui não há juro nenhum.';
        }
      } else {
        r += '\n\nSe souber o preço a pronto, escreva-o também e eu digo quanto está a pagar a mais.';
      }
      return { ok: true, tipo: 'parcelar', resposta: r };
    }
  }

  /* --- percentagem: "30% de 900", "quanto é 15% de 1200" --- */
  const mPct = t.match(/([0-9][0-9.,]*)\s*%\s*(?:de|do|da)\s*([0-9][0-9.,]*)/);
  if (mPct) {
    const p = numeroDeTexto(mPct[1]), base = numeroDeTexto(mPct[2]);
    if (p !== null && base !== null) {
      return { ok: true, tipo: 'percentagem',
        resposta: '**' + fmtNum(p) + '% de ' + fmtCalc(base) + ' = ' + fmtCalc(base * p / 100) + '**' };
    }
  }

  /* --- poupar todos os meses: "quanto rende 50 por mes durante 5 anos" --- */
  if (/\b(rende|render|juntar|junto|poupar|poupo|guardar|guardo)\b/.test(t) &&
      /\b(ano|anos|mes|meses)\b/.test(t)) {
    const mensal = n[0];
    const mAnos = t.match(/([0-9]+)\s*anos?/);
    const mMeses = t.match(/([0-9]+)\s*meses/);
    const mTaxa = t.match(/([0-9][0-9.,]*)\s*%/);
    const meses = mAnos ? Number(mAnos[1]) * 12 : (mMeses ? Number(mMeses[1]) : 0);
    if (mensal > 0 && meses >= 1 && meses <= 600) {
      const taxa = mTaxa ? numeroDeTexto(mTaxa[1]) / 100 : 0;
      const i = taxa / 12;
      const total = i === 0 ? mensal * meses : mensal * ((Math.pow(1 + i, meses) - 1) / i);
      const posto = mensal * meses;
      let r = 'Guardando **' + fmtCalc(mensal) + ' por mês** durante ' +
              (mAnos ? mAnos[1] + (Number(mAnos[1]) === 1 ? ' ano' : ' anos') : meses + ' meses') +
              ':\n\n**' + fmtCalc(total) + '**';
      if (taxa > 0) {
        r += '\n\nDo seu bolso: ' + fmtCalc(posto) + '. Do juro: ' + fmtCalc(total - posto) +
             '. Repare que quase tudo veio do que **você** pôs.';
      } else {
        r += '\n\nÉ tudo seu — não contei juro nenhum. Se o dinheiro estiver num sítio que renda, ' +
             'escreva a percentagem e eu conto.';
      }
      return { ok: true, tipo: 'poupanca', resposta: r };
    }
  }

  /* --- a reserva: "quanto preciso de reserva se gasto 600" --- */
  if (/\breserva\b/.test(t) && n.length) {
    const ess = n[0];
    if (ess > 0) {
      return { ok: true, tipo: 'reserva',
        resposta: 'Com **' + fmtCalc(ess) + '** de essenciais por mês:\n\n' +
          '1 mês de reserva = ' + fmtCalc(ess) + '\n' +
          '3 meses = ' + fmtCalc(ess * 3) + '\n' +
          '6 meses = ' + fmtCalc(ess * 6) + '\n\n' +
          'Comece por um mês. Três é o que se costuma dizer, mas um mês já muda a vida a quem não tem nenhum.' };
    }
  }

  /* --- por dia: "tenho 300 e faltam 12 dias" --- */
  const mDias = t.match(/([0-9]+)\s*dias?/);
  if (mDias && n.length >= 2 && /\b(por dia|ao dia|faltam|restam|ate ao fim)\b/.test(t)) {
    const dias = Number(mDias[1]);
    const quanto = n.find(v => Math.abs(v - dias) > 0.001);
    if (dias >= 1 && quanto > 0) {
      return { ok: true, tipo: 'pordia',
        resposta: '**' + fmtCalc(quanto / dias) + ' por dia**, durante ' + dias +
          (dias === 1 ? ' dia' : ' dias') + '.\n\nÉ este o número que decide o que se compra hoje.' };
    }
  }

  /* --- aritmética simples: "12 x 45,90", "480 / 12", "900 - 600" ---
     Fica em último porque é a rede: qualquer coisa acima é mais útil do que
     uma conta seca. */
  const mOp = cru.match(/([0-9][0-9.,\s  ]*?)\s*([x*+\-\/÷])\s*([0-9][0-9.,]*)/i);
  if (mOp) {
    const a = numeroDeTexto(mOp[1]), b = numeroDeTexto(mOp[3]);
    const op = mOp[2].toLowerCase();
    if (a !== null && b !== null) {
      let v = null, sinal = op;
      if (op === 'x' || op === '*') { v = a * b; sinal = '×'; }
      else if (op === '+') v = a + b;
      else if (op === '-') v = a - b;
      else if (op === '/' || op === '÷') { if (b !== 0) { v = a / b; sinal = '÷'; } }
      if (v !== null) {
        return { ok: true, tipo: 'conta',
          resposta: '**' + fmtNum(a) + ' ' + sinal + ' ' + fmtNum(b) + ' = ' + fmtCalc(v) + '**' };
      }
    }
  }

  return { ok: false };
}

/* Para os testes correrem em node sem browser. No navegador esta linha não
   faz nada — `module` não existe e o `typeof` evita o erro. */
/* ============================================================
   O que a pessoa está a pedir

   O `interpretar()` responde a uma pergunta só: "isto é um movimento?". E
   durante muito tempo foi a única pergunta que a aplicação sabia fazer — tudo
   o que não fosse um movimento caía numa lista de temas de ajuda.

   O que isso fazia, na prática: alguém dizia "isso não é um saldo negativo,
   arruma isso" e recebia de volta sete tópicos sobre reservas de emergência.
   A pessoa dizia a mesma coisa por outras palavras, recebia os mesmos sete
   tópicos, e concluía — com razão — que do outro lado não estava ninguém a
   ouvir.

   Isto trata do resto: corrigir, reclamar, perguntar quanto se tem. São
   frases sem número ou com um número que não é um gasto, e cada uma tem uma
   resposta certa que não é uma lista de tópicos.
   ============================================================ */

/* Palavras de quem está a mandar arranjar alguma coisa. */
const PEDIR_ARRANJO = ['corrig', 'corrije', 'arruma', 'arranja', 'arranje',
  'conserta', 'muda', 'mude', 'altera', 'altere', 'acerta', 'acerte', 'ajusta', 'ajuste',
  'atualiza', 'actualiza', 'errado', 'errada', 'nao esta certo', 'nao ta certo',
  'esta mal', 'ta mal', 'nao e isso', 'nao e esse', 'nao e assim', 'errei', 'enganei-me',
  'me enganei', 'nao bate', 'esta errado', 'ta errado',
  /* "o valor certo é X" — a forma mais directa de todas, e faltava. "certo"
     sozinho não serve: "está certo!" é a pessoa a concordar. */
  'valor certo e', 'o certo e', 'correto e', 'correcto e', 'certo sao', 'certo e de',
  'na verdade e', 'na verdade sao', 'afinal e', 'afinal sao', 'e mesmo'];

/* Quem diz isto está a falar do número grande do ecrã. */
const FALA_DO_NEGATIVO = ['negativo', 'menos', 'vermelho', 'divida no ecra', 'saldo negativo'];

const PERGUNTA_QUANTO = /\b(quanto (e que )?(eu )?tenho|quanto (e que )?(me )?(sobra|resta)|qual (e )?(o )?meu saldo|qual (e )?o saldo|quanto ha na conta|quanto tenho na conta)\b/;

/* Frases que apontam para o último lançamento, e não para o saldo. */
const FALA_DO_ULTIMO = ['ultimo', 'ultima', 'esse lancamento', 'aquele lancamento',
  'o lancamento', 'a compra', 'aquela compra', 'essa compra', 'o gasto', 'aquele gasto'];

/* ------------------------------------------------------------
   Devolve o que a pessoa quer, ou null se isto não for para aqui.

   { pedido: 'saldo-quanto' }                    — quanto tenho?
   { pedido: 'corrigir-saldo',  valor }          — o certo é X
   { pedido: 'corrigir-ultimo', valor }          — o último foi X, não Y
   { pedido: 'queixa-saldo' }                    — "isso não é negativo", sem número
   { pedido: 'queixa' }                          — "está errado", sem mais nada
   ------------------------------------------------------------ */
function entenderPedido(texto) {
  const cru = String(texto || '').trim();
  if (!cru) return null;
  const t = semAcentos(cru).toLowerCase();

  if (PERGUNTA_QUANTO.test(t)) return { pedido: 'saldo-quanto' };

  const querArranjo = contem(t, PEDIR_ARRANJO);
  const falaDoNegativo = contem(t, FALA_DO_NEGATIVO);
  const valores = acharValores(cru);

  /* Sem número: é uma reclamação. Não há nada a gravar, mas há muito a
     explicar — e explicar é precisamente o que faltava. */
  if (!valores.length) {
    if (falaDoNegativo) return { pedido: 'queixa-saldo' };
    if (querArranjo) return { pedido: 'queixa' };
    return null;
  }

  /* Com número e com ordem de arranjo, falta saber o quê: o último
     lançamento ou o saldo. Quem nomeia o lançamento está a falar dele — e
     nomeá-lo chega, porque "o último foi 50, não 500" não traz mais nada. */
  const falaDoUltimo = contem(t, FALA_DO_ULTIMO);
  if (querArranjo || falaDoNegativo || falaDoUltimo) {
    const bom = valorCorrigido(cru, t, valores);
    if (bom === null) return null;
    return {
      pedido: falaDoUltimo ? 'corrigir-ultimo' : 'corrigir-saldo',
      valor: bom,
      onde: ondeEstaODinheiro(t)
    };
  }

  return null;
}

/* Qual dos números da frase é o certo.

   Numa correcção há quase sempre dois: o errado e o bom. E o que os separa
   não é a ordem — é o "não". Em «era 50 e não 500» o bom vem primeiro; em
   «não é 500, são 50» vem depois. Ficar com o último, como estava, dava 500
   nos dois casos: a app gravava exactamente o número que a pessoa acabara de
   dizer que estava errado. */
function valorCorrigido(cru, t, valores) {
  const recusados = valores.filter(v => {
    const antes = t.slice(Math.max(0, v.inicio - 12), v.inicio);
    return /\bnao\s+(e\s+|era\s+|sao\s+|foi\s+)?$/.test(antes);
  });
  const bons = valores.filter(v => recusados.indexOf(v) === -1);
  const lista = bons.length ? bons : valores;
  return lista.length ? lista[lista.length - 1].valor : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { interpretar, calculadora, entenderPedido, ondeEstaODinheiro,
    acharValores, numeroDeTexto, numeroPorExtenso, acharData, acharCategoria };
}
