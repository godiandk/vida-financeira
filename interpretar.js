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
      if (v) achados.push({ valor: v, inicio: mm.index, fim: mm.index + mm[1].length, texto: mm[1].trim() });
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
  'abasteci','meti','carreguei','levei','fiz compras','fui ao','fui a '];
const V_ENTRADA = ['recebi','recebeu','recebemos','recebo','recebido',
  'ganhei','ganhou','ganho','entrou','caiu','me pagaram','pagaram-me',
  'depositaram','veio','creditaram','recebimento','entrada de','vendi','vendeu'];

/* Frases sobre o que ainda não aconteceu. "vou comprar uma tv de 300" não é
   uma compra — e gravá-la punha na conta da pessoa dinheiro que ela ainda
   tem. */
const FUTURO = ['vou ','vamos ','quero ','queria ','penso ','pretendo ','se eu ',
  'preciso de ','tenho de ','tenho que ','devia ','pensei em ','estou a pensar'];
const V_SALDO = ['tenho','tinha','fiquei com','sobrou-me','tenho guardado','tenho de lado','no banco','na conta','na poupanca','de lado','guardado','poupado','na carteira','em casa'];

function contem(t, lista) {
  return lista.some(k => t.includes(k));
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

/* Para os testes correrem em node sem browser. No navegador esta linha não
   faz nada — `module` não existe e o `typeof` evita o erro. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { interpretar, acharValores, numeroDeTexto, numeroPorExtenso, acharData, acharCategoria };
}
