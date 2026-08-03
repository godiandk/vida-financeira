/* ============================================================
   Vida Financeira — as quatro línguas, do lado de fora

   O `interpretar.js` já percebia português de Portugal, português do Brasil,
   espanhol e inglês. Isto é a outra metade: **responder** na língua em que se
   escreveu, e mostrar a aplicação nessa língua.

   Faltava, e a falta era mais feia do que parece — alguém escrevia
   "I spent 30 at the market", a app entendia, lançava certo, e respondia
   "Lançado: − 30,00 €". Percebe-te mas não te falo. Para quem emigrou e está
   a tentar perceber para onde lhe vai o dinheiro, isso é a app a dizer que
   ele é que se desenrasque.

   ---- Quatro e não três ----

   O português de Portugal e o do Brasil são a mesma língua e não são o mesmo
   texto. "Telemóvel" e "celular", "ecrã" e "tela", "autocarro" e "ônibus".
   Escrever "telemóvel" a um brasileiro não o impede de perceber — marca-o
   como estrangeiro na sua própria aplicação de contas. Por isso são quatro
   saídas, e o `br` só escreve o que é mesmo diferente: tudo o que não
   estiver lá cai no `pt`, e cai bem.

   ---- Como se escolhe ----

   1. O que a pessoa escolher, que manda sempre.
   2. Senão, a língua do telemóvel (`navigator.language`).
   3. Senão, a moeda que a app já adivinhou: quem está em reais está no Brasil.
   4. Senão, português.

   E no chat há uma regra a mais, que é a que importa: **responde-se na língua
   da mensagem**, não na da aplicação. Quem tem o telemóvel em português mas
   escreve em espanhol recebe espanhol de volta.
   ============================================================ */

const IDIOMA_CHAVE = 'vf:lingua';
const IDIOMAS = ['pt', 'br', 'es', 'en'];

const IDIOMA_NOME = {
  pt: 'Português (Portugal)',
  br: 'Português (Brasil)',
  es: 'Español',
  en: 'English'
};

let idiomaActual = null;

function idiomaDoAparelho() {
  try {
    const l = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (l.indexOf('pt-br') === 0 || l === 'pt_br') return 'br';
    if (l.indexOf('pt') === 0) return 'pt';
    if (l.indexOf('es') === 0) return 'es';
    if (l.indexOf('en') === 0) return 'en';
  } catch (e) {}
  /* A moeda já foi adivinhada pelo fuso horário no `site.js`. Quem está em
     reais está no Brasil, e isso diz mais do que a língua do sistema — há
     muito telemóvel vendido no Brasil com o sistema em inglês. */
  try { if (localStorage.getItem('vf:moeda') === 'BRL') return 'br'; } catch (e) {}
  return 'pt';
}

function idioma() {
  if (idiomaActual) return idiomaActual;
  try {
    const g = localStorage.getItem(IDIOMA_CHAVE);
    if (IDIOMAS.indexOf(g) !== -1) { idiomaActual = g; return g; }
  } catch (e) {}
  idiomaActual = idiomaDoAparelho();
  return idiomaActual;
}

function definirIdioma(l) {
  if (IDIOMAS.indexOf(l) === -1) return;
  idiomaActual = l;
  try { localStorage.setItem(IDIOMA_CHAVE, l); } catch (e) {}
  traduzirPagina();
  try { window.dispatchEvent(new CustomEvent('vf:lingua-mudou')); } catch (e) {}
}

/* A língua em que se responde a uma mensagem: a dela, se der para saber. O
   `interpretar.js` só distingue três (não separa os dois portugueses, e faz
   bem — ninguém escreve de propósito num ou noutro). Quando dá português,
   usa-se o português que a aplicação está a mostrar. */
function idiomaDaMensagem(texto) {
  if (typeof lingua !== 'function') return idioma();
  const l = lingua(texto);
  if (l === 'es' || l === 'en') return l;
  const meu = idioma();
  return (meu === 'br') ? 'br' : 'pt';
}

/* ------------------------------------------------------------
   Procurar uma frase

   `T('inicio.livre')` dá a frase na língua da aplicação.
   `T('chat.lancado', {v: '30,00 €'}, 'en')` dá numa língua escolhida, com
   os buracos preenchidos.

   Falhando a língua, cai-se no português — nunca numa chave crua no ecrã.
   Uma chave à mostra é pior do que uma frase na língua errada: a segunda
   percebe-se, a primeira parece avaria.
   ------------------------------------------------------------ */
function T(chave, vars, forcar) {
  const l = forcar || idioma();
  let s = (TEXTOS[l] && TEXTOS[l][chave]);
  if (s === undefined && l === 'br') s = TEXTOS.pt[chave];
  if (s === undefined) s = TEXTOS.pt[chave];
  if (s === undefined) return chave;
  if (vars) {
    Object.keys(vars).forEach(k => {
      s = s.split('{' + k + '}').join(String(vars[k]));
    });
  }
  return s;
}

/* ------------------------------------------------------------
   Traduzir o que está escrito no HTML

   `data-t` troca o texto, `data-t-ph` o `placeholder`, `data-t-aria` o
   `aria-label`. O HTML fica escrito em português — que continua a ser o que
   se lê ao abrir o ficheiro — e é trocado ao carregar.
   ------------------------------------------------------------ */
function traduzirPagina(raiz) {
  const zona = raiz || document;
  zona.querySelectorAll('[data-t]').forEach(el => {
    const v = T(el.getAttribute('data-t'));
    if (v) el.textContent = v;
  });
  zona.querySelectorAll('[data-t-ph]').forEach(el => {
    const v = T(el.getAttribute('data-t-ph'));
    if (v) el.setAttribute('placeholder', v);
  });
  zona.querySelectorAll('[data-t-aria]').forEach(el => {
    const v = T(el.getAttribute('data-t-aria'));
    if (v) el.setAttribute('aria-label', v);
  });
  try { document.documentElement.lang = idioma() === 'en' ? 'en'
        : idioma() === 'es' ? 'es' : (idioma() === 'br' ? 'pt-BR' : 'pt-PT'); } catch (e) {}
}

/* ============================================================
   AS FRASES

   Regra ao traduzir isto: não se traduziu palavra a palavra. Uma frase que
   em português diz "não é uma dívida" tem de dizer em inglês o que um inglês
   diria — o objectivo é a pessoa perceber, não o texto ser fiel.

   O `br` só tem o que muda mesmo. Uma entrada a mais no `br` é uma frase a
   mais para manter em dois sítios.
   ============================================================ */
const TEXTOS = {

  /* ---------------------------------------------------------- pt-PT */
  pt: {
    /* — barra e navegação — */
    'abas.escrever': 'Escrever',
    'abas.inicio': 'Início',
    'abas.lancar': 'Lançar',
    'abas.mes': 'Mês',
    'abas.mais': 'Ferramentas',

    /* — Início — */
    'inicio.sub': 'Isto é o seu mês. Lance o que gastou e o resto faz-se sozinho.',
    'inicio.livre': 'Livre até ao fim do mês',
    'inicio.guardei': 'Guardei este mês',
    'inicio.reserva': 'Reserva',
    'inicio.naconta': 'Na conta',
    'inicio.aotodo': 'Ao todo',
    'inicio.devemos': 'Devemos',
    'inicio.minhaconta': 'A minha conta',
    'inicio.contadela': 'Conta dela',
    'inicio.contadele': 'Conta dele',
    'inicio.outraconta': 'A outra conta',
    'inicio.emergencia': 'Emergência',
    'inicio.naodivida': 'Saiu mais {v} do que entrou este mês. Não é uma dívida.',

    /* — gavetas — */
    'gaveta.lancar': 'Lançar um gasto ou uma entrada',
    'gaveta.mes': 'O meu mês, movimento a movimento',
    'gaveta.contas': 'As contas que se repetem',
    'gaveta.divida': 'O que a dívida custa',
    'gaveta.apoios': 'Apoios que talvez não receba',
    'gaveta.mais': 'Ferramentas e calculadoras',

    /* — conferir — */
    'conferir.pergunta': 'Mês novo. Estes números batem certo com o seu banco?',
    'conferir.certo': 'Está certo',
    'conferir.acertar': 'Quero acertar',
    'conferir.escreva': 'Escreva o que está lá hoje. O que deixar em branco fica como está.',
    'conferir.guardar': 'Guardar',
    'conferir.deixa': 'Deixa estar',
    'conferir.quantodevem': 'Quanto devem',
    'conferir.feito': 'Acertado. Os números do mês passam a ser estes.',
    'conferir.nada': 'Não mudou nada — fica tudo como estava.',
    'conferir.nota': 'Isto acerta o saldo, não apaga nem inventa lançamentos. Se faltar um gasto, lance-o em ➕ Lançar ou diga-mo no chat.',

    /* — chat — */
    'chat.lancado': 'Lançado:',
    'chat.lancados': 'Lançados:',
    'chat.apagar': 'Apagar isto',
    'chat.apagado': 'Apagado',
    'chat.comdata': 'Com a data de {d}.',
    'chat.comfoto': 'Com a fotografia agarrada.',
    'chat.semfoto': 'Não coube a fotografia — o movimento ficou lançado à mesma.',
    'chat.saldoposto': 'Fico a saber: **{v}** — {onde}.',
    'chat.saldoexplica': 'Já está no seu Início. A partir daqui vou eu descontando o que gastar e somando o que entrar — não precisa de o escrever outra vez.',
    'chat.reservaposta': 'Fica guardado que tem **{v}** de lado, na conta de emergência.',
    'chat.reservaexplica': 'Não lancei isto como entrada — não é dinheiro que recebeu hoje, é dinheiro que já tinha.',
    'chat.jaestava': 'Já estava em **{v}**. Não mexi em nada.',
    'chat.corrigido': 'Corrigido: **{a} → {b}** — {onde}.',
    'chat.corrigidoult': 'Corrigido: **{a} → {b}**{desc}.',
    'chat.semlancamento': 'Ainda não há nenhum lançamento para corrigir.',
    'chat.jaesta': 'O último já está em **{v}**. Não mexi em nada.',
    'chat.temna': 'Tem **{v}** — {onde}.',
    'chat.naosei': 'Ainda não sei quanto tem na conta — só sei o que me foi lançado.',
    'chat.digameonumero': '**Diga-me o número** ("tenho 1000 no banco") e a partir daí mantenho-o certo sozinho: desconto o que gastar e somo o que entrar.',
    'chat.aotodo': 'Ao todo, **{v}**:',
    'chat.edevem': 'E devem **{v}**.',
    'chat.diferenca': 'Há **{v}** de diferença que nunca foi lançado — {qual} sem eu saber.',
    'chat.entrou': 'dinheiro que entrou',
    'chat.saiu': 'dinheiro que saiu',
    'chat.registar': 'Quer que eu registe isso no mês, para as contas baterem certo?',
    'chat.simregista': 'Sim, regista',
    'chat.naodeixa': 'Não, deixa',
    'chat.registado': 'Registado',
    'chat.ficoucomoestava': 'Ficou como estava',
    'chat.sosaldo': 'Fica só o saldo corrigido, então. O mês continua como estava.',
    'chat.acertofeito': 'Registado no mês: **{s} {v}** · ⚖️ Acerto de saldo.',
    'chat.acertosaldo': 'O saldo continua em {v}.',
    'chat.oquestaerrado': 'Diga-me o que está errado e eu arranjo.',
    'chat.comodizer': 'Se for um valor: **"o último foi 50, não 500"**.\nSe for o saldo: **"tenho 1000 no banco"**.\nSe for um lançamento a mais, escreva **"apaga o último"**.',
    'chat.negativotitulo': 'Tem razão em estranhar, e a culpa é da etiqueta.',
    'chat.negativoexplica': 'Aquele número vermelho **não é o seu saldo** e não é uma dívida. É a conta **deste mês**: o que saiu menos o que entrou. Enquanto não entrar o ordenado, ele fica negativo — e continuaria negativo mesmo que tivesse um milhão no banco.',
    'chat.negativotem': 'O seu dinheiro é o outro: **{v}**, na linha logo por baixo.',
    'chat.negativopede': '**Diga-me quanto tem na conta** — "tenho 1000 no banco" — e eu ponho esse número no Início e mantenho-o certo a partir daí.',
    'chat.avisonegativo': 'E já agora, sobre o número vermelho lá em cima: **não é uma dívida.** É só quanto saiu a mais do que entrou **neste mês** — que é o normal antes de entrar o ordenado. O seu dinheiro é o que está em "Na conta".',
    'chat.semconta': 'Percebi o que escreveu — e é isto que a **Vida Financeira** faz por si: escreve, e fica lançado.',
    'chat.semcontames': '**Crie conta e tem um mês inteiro, de graça.** Sem cartão, sem nada. Depois desse mês, são 9,89 € por ano.',
    'chat.semcontamao': 'Enquanto isso pode lançar à mão no ➕ Lançar, que é grátis para sempre.',
    'chat.corrigirsemconta': 'Percebi o que quer corrigir — e é isso que a **Vida Financeira** faz por si.',
    'chat.placeholder': 'Gastei 30 euros no mercado…',

    /* — talão — */
    'talao.perguntar': 'Guardei a fotografia. **Quer que eu tente ler o talão?**',
    'talao.megas': 'Da primeira vez tenho de descarregar o leitor: cerca de {mb} MB, **uma vez só**. Depois disso funciona sem internet, e a fotografia nunca sai do seu telemóvel — quem lê é o próprio aparelho.',
    'talao.ler': 'Ler o talão',
    'talao.aler': 'A ler…',
    'talao.escrevoeu': 'Escrevo eu',
    'talao.escreveuvoce': 'Escreve você',
    'talao.estabem': 'Está bem. **Escreva quanto foi** — por exemplo, "gastei 30 euros no mercado Continente" — e eu lanço com o talão agarrado.',
    'talao.li': 'Li o talão: **{v}**{onde}{quando}.',
    'talao.lancoassim': 'Lanço assim?',
    'talao.achoqueli': 'Acho que li **{v}**{onde}{quando} — mas **não tenho a certeza**, o talão está difícil de ler.',
    'talao.severdadeiro': 'Se o valor estiver certo eu lanço; se não estiver, escreva-o e eu corrijo.',
    'talao.simlanca': 'Sim, lança',
    'talao.naoescrevo': 'Não, escrevo eu',
    'talao.certo': 'Certo. **Escreva quanto foi** e eu lanço com o talão agarrado.',
    'talao.semtotal': 'Li a fotografia mas **não encontrei lá o total**. Acontece com talões amarrotados ou com pouca luz.',
    'talao.tireoutra': 'Tire outra com o talão esticado e a foto direita — ou **escreva quanto foi** e eu lanço na mesma, com este talão agarrado.',
    'talao.falhou': 'Não consegui descarregar o leitor — talvez a internet tenha falhado a meio.',
    'talao.tenteoutra': 'Pode tentar outra vez, ou **escrever quanto foi** que eu lanço com o talão agarrado.',
    'talao.semmotor': 'Guardei a fotografia.\n\nEste telemóvel não me deixa ler o talão sozinho. **Escreva quanto foi** (por exemplo, "gastei 30 euros no mercado") e eu lanço com o talão agarrado.',
    'talao.naoabriu': 'Não consegui abrir essa imagem. Tente outra vez.',
    'talao.assinatura': 'Guardar a fotografia do talão faz parte da assinatura.',
    'talao.apreparar': 'A preparar…',
    'ocr.descarregar': 'A descarregar o leitor',
    'ocr.preparar': 'A preparar o leitor',
    'ocr.portugues': 'A descarregar o dicionário',
    'ocr.quase': 'Quase pronto',
    'ocr.aler': 'A ler o talão',

    /* — arranque — */
    'arr.pergunta': 'Pergunta {i} de {n}',
    'arr.seguinte': 'Seguinte',
    'arr.ver': 'Ver as minhas contas',
    'arr.naosei': 'Não sei — saltar',
    'arr.voltar': '‹ Voltar',
    'arr.agoranao': 'Agora não',
    'arr.escrevanumero': 'Escreva um número, mesmo que seja por alto.',
    'arr.semconta': 'Isto ficou guardado só neste telemóvel. Se limpar o navegador ou trocar de aparelho, perde-se.',
    'arr.criarconta': 'Criar conta e guardar isto',
    'arr.q.entra': 'Quanto entra por mês?',
    'arr.a.entra': 'Tudo o que entra em casa, de todas as pessoas: salário, apoios, pensões, biscates. Um número aproximado chega.',
    'arr.q.essenciais': 'E quanto é o que não dá para não pagar?',
    'arr.a.essenciais': 'Casa, comida, luz, água, transporte, remédios. Só isso — o resto fica de fora. Se não souber ao certo, escreva o que lhe parecer.',
    'arr.q.comquem': 'Vive sozinho ou com alguém?',
    'arr.a.comquem': 'Isto serve para eu saber de quem é o dinheiro quando me disser "ela gastou 40 no mercado". Nada mais.',
    'arr.o.so': 'Sozinho(a)',
    'arr.o.esposa': 'Com a minha esposa',
    'arr.o.marido': 'Com o meu marido',
    'arr.o.companheiro': 'Com outra pessoa',
    'arr.q.minha': 'Quanto tem na sua conta agora?',
    'arr.a.minha': 'O que está lá hoje. É este o número que passa a aparecer no Início — e a partir daqui sou eu que o mantenho certo.',
    'arr.q.parceiro': 'E quanto tem {quem} na conta dela?',
    'arr.a.parceiro': 'Se não souber, salte. Dá para dizer mais tarde ao chat: "ela tem 800 na conta dela".',
    'arr.q.emergencia': 'E de lado, para emergências?',
    'arr.a.emergencia': 'Dinheiro que não é para gastar este mês: poupança, pé-de-meia, o que estiver guardado. Se não houver nada, escreva 0.',
    'arr.q.divida': 'Quanto devem hoje, ao todo?',
    'arr.a.divida': 'Cartões, crédito, prestações, dinheiro pedido a alguém. Somado. Se não dever nada, escreva 0 — é uma boa notícia e vale a pena vê-la escrita.',
    'arr.q.plano': 'E o que quer fazer primeiro?',
    'arr.a.plano': 'Pode mudar quando quiser. Serve só para eu saber o que lhe pôr à frente.',
    'arr.quem.esposa': 'a sua esposa',
    'arr.quem.marido': 'o seu marido',
    'arr.quem.outro': 'a outra pessoa',
    'plano.respirar': 'Chegar ao fim do mês',
    'plano.respirar.a': 'Primeiro parar de afundar. A app põe à frente o que sai e onde dá para cortar.',
    'plano.reserva': 'Juntar uma reserva',
    'plano.reserva.a': 'As contas estão a dar. Agora é juntar dinheiro para os imprevistos não virarem dívida.',
    'plano.divida': 'Sair das dívidas',
    'plano.divida.a': 'Há prestações a pagar. A app põe à frente o que custam e quanto falta.',

    /* — escolher a língua — */
    /* — categorias, que aparecem em cada confirmação — */
    'cat.casa': 'Casa e rendas',
    'cat.mercado': 'Mercado',
    'cat.transporte': 'Transporte',
    'cat.saude': 'Saúde',
    'cat.educacao': 'Educação',
    'cat.lazer': 'Lazer',
    'cat.contas': 'Contas e serviços',
    'cat.dividas': 'Dívidas',
    'cat.reserva': 'Guardei na reserva',
    'cat.acerto': 'Acerto de saldo',
    'cat.outros-s': 'Outros',
    'cat.salario': 'Salário',
    'arr.q.entra': 'Num mês normal, quanto entra em casa?',
    'arr.a.entra': 'Tudo o que entra, de todo mundo: salário, benefícios, aposentadoria, bicos.\n\nSe você ganha por comissão, ou se um mês é bom e outro é fraco, **escreva um mês fraco** — é com esse que as contas precisam fechar. E se preferir, pule: o app aprende sozinho assim que você lançar um mês inteiro.',
    'arr.varia': 'Varia muito — não sei dizer',
    "bn.escrever": "«Gastei 30 reais no mercado Carrefour» — e o movimento fica feito, com o valor, a categoria e a loja. Escreva o tipo de lugar e o nome: mercado, farmácia, posto de gasolina.",
    "bn.talao.t": "Fotografe o cupom",
    "bn.talao": "Tire uma foto do cupom e eu leio o total, a loja e o dia. A leitura é feita dentro do seu celular — a foto não sai daqui.",
    "bn.seu": "Os movimentos ficam no seu celular e funcionam sem internet. Com conta, aparecem também no computador.",
    "bn.vence": "Anote as contas que se repetem e o app avisa antes de vencer. Multa por esquecimento é dinheiro que já era seu." ,
    'cat.extra': 'Trabalho extra',
    'cat.vendas': 'Vendas',
    'cat.juros': 'Juros e rendimentos',
    'cat.presente': 'Presente',
    'cat.reserva-tirei': 'Tirei da reserva',
    'cat.outros-e': 'Outros',

    'ola.manha': 'Bom dia',
    'ola.tarde': 'Boa tarde',
    'ola.noite': 'Boa noite',
        /* — o banner — */
    "bn.mes.t": "O seu mês",
    "bn.mes.1": "Último dia do seu mês de experiência. Depois disto, são 9,89 € por ano.",
    "bn.mes.n": "Está no seu mês de experiência — faltam {d} dias, com tudo aberto.",
    "bn.gratis.t": "Um mês grátis",
    "bn.gratis": "Crie conta e tem um mês inteiro com tudo aberto. Sem cartão, sem compromisso.",
    "bn.gratis.b": "Criar conta",
    "bn.escrever.t": "Escreva, e fica lançado",
    "bn.escrever": "«Gastei 30 euros no mercado Continente» — e o movimento fica feito, com o valor, a categoria e a loja. Escreva o tipo de sítio e o nome: mercado, farmácia, bomba de gasolina.",
    "bn.talao.t": "Fotografe o talão",
    "bn.talao": "Tire uma fotografia ao talão e eu leio o total, a loja e o dia. A leitura é feita dentro do seu telemóvel — a fotografia não sai daqui.",
    "bn.contas.t": "Contas na hora",
    "bn.contas": "Na loja, pergunte «12x de 45,90 ou 480 a pronto?». A resposta vem antes de assinar — e é grátis.",
    "bn.vence.t": "O que vence esta semana",
    "bn.vence": "Escreva as contas que se repetem e a app avisa antes de vencerem. Multa por esquecimento é dinheiro que já era seu.",
    "bn.divida.t": "O preço da dívida",
    "bn.divida": "Quanto é que aquela prestação custa mesmo, e quanto tempo falta. Com as taxas do seu país, e com a fonte à vista.",
    "bn.seu.t": "Fica tudo consigo",
    "bn.seu": "Os movimentos ficam no seu telemóvel e funcionam sem internet. Com conta, aparecem também no computador.",
    "bn.experimentar": "Experimentar",
    "bn.chat": "Abrir o chat",
    "bn.vercontas": "Ver as contas",
    "bn.verconta": "Ver a conta",

        'arr.q.entra': 'Num mês normal, quanto entra em casa?',
    'arr.a.entra': 'Tudo o que entra, de todas as pessoas: salário, apoios, pensões, biscates.\n\nSe ganha à comissão, ou se uns meses são bons e outros maus, **escreva um mês fraco** — é com esse que as contas têm de bater. E se preferir, salte: a app aprende sozinha assim que lançar um mês inteiro.',
    'arr.varia': 'Varia muito — não sei dizer',

    'lingua.titulo': 'Língua',
    'lingua.ajuda': 'Escrevo-lhe nesta língua. No chat respondo sempre na língua em que me escrever.',

    /* ---- onde o dinheiro rende ---- */
    'bn.investir.t': 'Onde pôr o que já juntou',
    'bn.investir': 'Dinheiro parado na conta à ordem rende zero e a inflação come-o. Aqui ficam os sítios com garantia do Estado ou do fundo de garantia, em Portugal e no Brasil, e a conta feita já com o imposto.',
    'bn.verinvestir': 'Ver onde',
    'inv.titulo': 'Pôr o dinheiro a render',
    'inv.aviso': 'Isto não é aconselhamento financeiro, e nenhum banco pagou para estar aqui. É a lista do que tem garantia do Estado ou do fundo de garantia, com a fonte à vista, e uma calculadora para fazer a conta com os seus números.',
    'inv.onde': 'Onde é que o dinheiro está seguro em {pais}',
    'inv.oquee': 'Só entra nesta lista o que é garantido e não pode valer menos do que se lá pôs. Nada de acções, de fundos nem de cripto — quem tem o dinheiro contado não pode dar-se ao luxo de perder capital.',
    'inv.quem': 'De quem é:',
    'inv.seguro': 'Quem garante:',
    'inv.rende': 'Quanto rende:',
    'inv.mexer': 'Dá para mexer?',
    'inv.limite': 'Até quanto:',
    'inv.onde2': 'Onde se faz:',
    'inv.fonte': 'Fonte:',
    'inv.confirmar': 'confirmar na fonte',
    'inv.verificado': 'Conferido a {d}. As taxas mudam todos os meses — veja a fonte antes de decidir.',
    'inv.calc': 'A conta, com os seus números',
    'inv.calcsub': 'Escreva o que já tem de lado e o que consegue pôr por mês. O imposto já vai descontado.',
    'inv.jatem': 'O que já tem',
    'inv.pormes': 'O que põe por mês',
    'inv.anos': 'Durante quantos anos',
    'inv.taxa': 'Taxa ao ano (%)',
    'inv.escreva': 'Escreva um valor aí em cima para eu fazer a conta.',
    'inv.aofim': 'Ao fim de {n} anos fica com',
    'inv.pos': 'Saiu do seu bolso',
    'inv.rendeu': 'Rendeu',
    'inv.imposto': 'Imposto ({p}%)',
    'inv.ganho': 'São {v} que não tinha, em {n} anos, sem trabalhar para os ganhar.',
    'inv.ano': 'Ano',
    'inv.fica': 'Fica com',
    'inv.inflacao': 'Estes números são em dinheiro de hoje e não descontam a inflação: daqui a uns anos, o mesmo dinheiro compra menos. Render acima da inflação é o mínimo para não perder — e é por isso que deixar tudo na conta à ordem é perder devagar.'
  },

  /* ---------------------------------------------------------- pt-BR
     Só o que muda mesmo. O resto cai no `pt` e cai bem. */
  br: {
    'inicio.sub': 'Este é o seu mês. Lance o que gastou e o resto se faz sozinho.',
    'inicio.livre': 'Livre até o fim do mês',
    'inicio.guardei': 'Guardei este mês',
    'inicio.naodivida': 'Saiu mais {v} do que entrou este mês. Não é uma dívida.',
    'gaveta.mes': 'O meu mês, movimento a movimento',
    'conferir.pergunta': 'Mês novo. Esses números batem com o seu banco?',
    'conferir.escreva': 'Escreva o que tem hoje. O que deixar em branco fica como está.',
    'conferir.nota': 'Isso acerta o saldo, não apaga nem inventa lançamentos. Se faltar um gasto, lance em ➕ Lançar ou me diga no chat.',
    'chat.saldoexplica': 'Já está no seu Início. Daqui pra frente sou eu que desconto o que você gastar e somo o que entrar — não precisa escrever de novo.',
    'chat.digameonumero': '**Me diga o número** ("tenho 1000 no banco") e daí em diante eu mantenho ele certo sozinho: desconto o que gastar e somo o que entrar.',
    'chat.negativoexplica': 'Aquele número vermelho **não é o seu saldo** e não é dívida. É a conta **deste mês**: o que saiu menos o que entrou. Enquanto o salário não cair, ele fica negativo — e continuaria negativo mesmo que você tivesse um milhão no banco.',
    'chat.negativopede': '**Me diga quanto você tem na conta** — "tenho 1000 no banco" — e eu ponho esse número no Início e mantenho ele certo daí em diante.',
    'chat.avisonegativo': 'E já que estamos: aquele número vermelho lá em cima **não é dívida.** É só quanto saiu a mais do que entrou **neste mês** — normal antes do salário cair. O seu dinheiro é o que está em "Na conta".',
    'chat.semcontames': '**Crie conta e ganhe um mês inteiro, de graça.** Sem cartão, sem nada. Depois desse mês, são 9,89 € por ano.',
    'chat.semcontamao': 'Enquanto isso dá pra lançar na mão em ➕ Lançar, que é grátis pra sempre.',
    'chat.placeholder': 'Gastei 30 reais no mercado…',
    'chat.comodizer': 'Se for um valor: **"o último foi 50, não 500"**.\nSe for o saldo: **"tenho 1000 no banco"**.\nSe for um lançamento a mais, escreva **"apaga o último"**.',
    'talao.megas': 'Na primeira vez preciso baixar o leitor: cerca de {mb} MB, **uma vez só**. Depois disso funciona sem internet, e a foto nunca sai do seu celular — quem lê é o próprio aparelho.',
    'talao.semmotor': 'Guardei a foto.\n\nEste celular não me deixa ler o cupom sozinho. **Escreva quanto foi** (por exemplo, "gastei 30 no mercado") e eu lanço com a foto junto.',
    'talao.perguntar': 'Guardei a foto. **Quer que eu tente ler o cupom?**',
    'talao.li': 'Li o cupom: **{v}**{onde}{quando}.',
    'talao.semtotal': 'Li a foto mas **não achei o total**. Acontece com cupom amassado ou com pouca luz.',
    'talao.tireoutra': 'Tire outra com o cupom esticado e a foto reta — ou **escreva quanto foi** e eu lanço do mesmo jeito, com essa foto junto.',
    'talao.assinatura': 'Guardar a foto do cupom faz parte da assinatura.',
    'talao.ler': 'Ler o cupom',
    'ocr.aler': 'Lendo o cupom',
    'arr.semconta': 'Isso ficou guardado só neste celular. Se limpar o navegador ou trocar de aparelho, se perde.',
    'arr.a.entra': 'Tudo o que entra em casa, de todo mundo: salário, benefícios, aposentadoria, bicos. Um número aproximado já serve.',
    'arr.a.essenciais': 'Casa, comida, luz, água, transporte, remédio. Só isso — o resto fica de fora. Se não souber ao certo, escreva o que achar.',
    'arr.q.comquem': 'Mora sozinho ou com alguém?',
    'arr.o.esposa': 'Com a minha esposa',
    'arr.o.marido': 'Com o meu marido',
    'arr.a.emergencia': 'Dinheiro que não é pra gastar este mês: poupança, reserva, o que estiver guardado. Se não tiver nada, escreva 0.',
    'arr.a.divida': 'Cartão, crediário, parcelas, dinheiro que pediu emprestado. Somado. Se não dever nada, escreva 0 — é boa notícia e vale a pena ver escrito.',
    'cat.casa': 'Casa e aluguel',
    'cat.contas': 'Contas e serviços',
    'cat.salario': 'Salário',
    'arr.q.entra': 'Num mês normal, quanto entra em casa?',
    'arr.a.entra': 'Tudo o que entra, de todo mundo: salário, benefícios, aposentadoria, bicos.\n\nSe você ganha por comissão, ou se um mês é bom e outro é fraco, **escreva um mês fraco** — é com esse que as contas precisam fechar. E se preferir, pule: o app aprende sozinho assim que você lançar um mês inteiro.',
    'arr.varia': 'Varia muito — não sei dizer',
    "bn.escrever": "«Gastei 30 reais no mercado Carrefour» — e o movimento fica feito, com o valor, a categoria e a loja. Escreva o tipo de lugar e o nome: mercado, farmácia, posto de gasolina.",
    "bn.talao.t": "Fotografe o cupom",
    "bn.talao": "Tire uma foto do cupom e eu leio o total, a loja e o dia. A leitura é feita dentro do seu celular — a foto não sai daqui.",
    "bn.seu": "Os movimentos ficam no seu celular e funcionam sem internet. Com conta, aparecem também no computador.",
    "bn.vence": "Anote as contas que se repetem e o app avisa antes de vencer. Multa por esquecimento é dinheiro que já era seu.",

    'bn.investir.t': 'Onde botar o que você já juntou',
    'bn.investir': 'Dinheiro parado na conta corrente rende zero e a inflação come. Aqui estão os lugares com garantia do governo ou do fundo garantidor, no Brasil e em Portugal, e a conta já feita com o imposto descontado.',
    'bn.verinvestir': 'Ver onde',
    'inv.aviso': 'Isto não é consultoria financeira, e nenhum banco pagou para estar aqui. É a lista do que tem garantia do governo ou do fundo garantidor, com a fonte à mostra, e uma calculadora para fazer a conta com os seus números.',
    'inv.oquee': 'Só entra nesta lista o que é garantido e não pode valer menos do que você colocou. Nada de ações, de fundos nem de cripto — quem tem o dinheiro contado não pode se dar ao luxo de perder o que juntou.',
    'inv.mexer': 'Dá para tirar quando quiser?',
    'inv.calcsub': 'Escreva o que já tem guardado e o que consegue separar por mês. O imposto já está descontado.',
    'inv.pormes': 'O que separa por mês',
    'inv.escreva': 'Escreva um valor aí em cima que eu faço a conta.',
    'inv.pos': 'Saiu do seu bolso',
    'inv.ganho': 'São {v} que você não tinha, em {n} anos, sem trabalhar para ganhar.',
    'inv.inflacao': 'Estes números são em dinheiro de hoje e não descontam a inflação: daqui a uns anos, o mesmo dinheiro compra menos. Render acima da inflação é o mínimo para não perder — e é por isso que deixar tudo na conta corrente é perder devagar.'
  },

  /* ---------------------------------------------------------- español */
  es: {
    'abas.escrever': 'Escribir',
    'abas.inicio': 'Inicio',
    'abas.lancar': 'Registrar',
    'abas.mes': 'Mes',
    'abas.mais': 'Herramientas',

    'inicio.sub': 'Este es su mes. Apunte lo que gastó y el resto se hace solo.',
    'inicio.livre': 'Libre hasta fin de mes',
    'inicio.guardei': 'Ahorré este mes',
    'inicio.reserva': 'Reserva',
    'inicio.naconta': 'En la cuenta',
    'inicio.aotodo': 'En total',
    'inicio.devemos': 'Debemos',
    'inicio.minhaconta': 'Mi cuenta',
    'inicio.contadela': 'La cuenta de ella',
    'inicio.contadele': 'La cuenta de él',
    'inicio.outraconta': 'La otra cuenta',
    'inicio.emergencia': 'Emergencia',
    'inicio.naodivida': 'Salió {v} más de lo que entró este mes. No es una deuda.',

    'gaveta.lancar': 'Apuntar un gasto o un ingreso',
    'gaveta.mes': 'Mi mes, movimiento a movimiento',
    'gaveta.contas': 'Las cuentas que se repiten',
    'gaveta.divida': 'Lo que cuesta la deuda',
    'gaveta.apoios': 'Ayudas que quizá no esté cobrando',
    'gaveta.mais': 'Herramientas y calculadoras',

    'conferir.pergunta': 'Mes nuevo. ¿Estos números cuadran con su banco?',
    'conferir.certo': 'Está bien',
    'conferir.acertar': 'Quiero ajustar',
    'conferir.escreva': 'Escriba lo que hay hoy. Lo que deje en blanco se queda igual.',
    'conferir.guardar': 'Guardar',
    'conferir.deixa': 'Déjalo así',
    'conferir.quantodevem': 'Cuánto deben',
    'conferir.feito': 'Ajustado. Los números del mes pasan a ser estos.',
    'conferir.nada': 'No cambió nada — se queda todo igual.',
    'conferir.nota': 'Esto ajusta el saldo, no borra ni inventa movimientos. Si falta un gasto, apúntelo en ➕ Registrar o dígamelo en el chat.',

    'chat.lancado': 'Apuntado:',
    'chat.lancados': 'Apuntados:',
    'chat.apagar': 'Borrar esto',
    'chat.apagado': 'Borrado',
    'chat.comdata': 'Con fecha del {d}.',
    'chat.comfoto': 'Con la foto adjunta.',
    'chat.semfoto': 'La foto no cupo — el movimiento quedó apuntado igual.',
    'chat.saldoposto': 'Anotado: **{v}** — {onde}.',
    'chat.saldoexplica': 'Ya está en su Inicio. A partir de ahora yo voy restando lo que gaste y sumando lo que entre — no hace falta que lo escriba otra vez.',
    'chat.reservaposta': 'Queda anotado que tiene **{v}** apartado, en la cuenta de emergencia.',
    'chat.reservaexplica': 'No lo apunté como ingreso — no es dinero que recibió hoy, es dinero que ya tenía.',
    'chat.jaestava': 'Ya estaba en **{v}**. No toqué nada.',
    'chat.corrigido': 'Corregido: **{a} → {b}** — {onde}.',
    'chat.corrigidoult': 'Corregido: **{a} → {b}**{desc}.',
    'chat.semlancamento': 'Todavía no hay ningún movimiento que corregir.',
    'chat.jaesta': 'El último ya está en **{v}**. No toqué nada.',
    'chat.temna': 'Tiene **{v}** — {onde}.',
    'chat.naosei': 'Todavía no sé cuánto tiene en la cuenta — solo sé lo que me han apuntado.',
    'chat.digameonumero': '**Dígame el número** ("tengo 1000 en el banco") y a partir de ahí lo mantengo correcto solo: resto lo que gaste y sumo lo que entre.',
    'chat.aotodo': 'En total, **{v}**:',
    'chat.edevem': 'Y deben **{v}**.',
    'chat.diferenca': 'Hay **{v}** de diferencia que nunca se apuntó — {qual} sin que yo lo supiera.',
    'chat.entrou': 'dinero que entró',
    'chat.saiu': 'dinero que salió',
    'chat.registar': '¿Quiere que lo apunte en el mes, para que las cuentas cuadren?',
    'chat.simregista': 'Sí, apúntalo',
    'chat.naodeixa': 'No, déjalo',
    'chat.registado': 'Apuntado',
    'chat.ficoucomoestava': 'Se quedó igual',
    'chat.sosaldo': 'Entonces queda solo el saldo corregido. El mes sigue como estaba.',
    'chat.acertofeito': 'Apuntado en el mes: **{s} {v}** · ⚖️ Ajuste de saldo.',
    'chat.acertosaldo': 'El saldo sigue en {v}.',
    'chat.oquestaerrado': 'Dígame qué está mal y lo arreglo.',
    'chat.comodizer': 'Si es un importe: **"el último fue 50, no 500"**.\nSi es el saldo: **"tengo 1000 en el banco"**.\nSi es un movimiento de más, escriba **"borra el último"**.',
    'chat.negativotitulo': 'Hace bien en extrañarse, y la culpa es de la etiqueta.',
    'chat.negativoexplica': 'Ese número rojo **no es su saldo** y no es una deuda. Es la cuenta **de este mes**: lo que salió menos lo que entró. Mientras no entre la nómina se queda en negativo — y seguiría en negativo aunque tuviera un millón en el banco.',
    'chat.negativotem': 'Su dinero es el otro: **{v}**, en la línea de justo debajo.',
    'chat.negativopede': '**Dígame cuánto tiene en la cuenta** — "tengo 1000 en el banco" — y pongo ese número en el Inicio y lo mantengo correcto a partir de ahí.',
    'chat.avisonegativo': 'Y ya que estamos, sobre el número rojo de arriba: **no es una deuda.** Es solo cuánto salió de más este mes — lo normal antes de que entre la nómina. Su dinero es el que está en "En la cuenta".',
    'chat.semconta': 'Entendí lo que escribió — y esto es lo que **Vida Financeira** hace por usted: escribe, y queda apuntado.',
    'chat.semcontames': '**Cree una cuenta y tiene un mes entero, gratis.** Sin tarjeta, sin nada. Después de ese mes son 9,89 € al año.',
    'chat.semcontamao': 'Mientras tanto puede apuntar a mano en ➕ Registrar, que es gratis para siempre.',
    'chat.corrigirsemconta': 'Entendí lo que quiere corregir — y eso es lo que **Vida Financeira** hace por usted.',
    'chat.placeholder': 'Gasté 30 euros en el mercado…',

    'talao.perguntar': 'Guardé la foto. **¿Quiere que intente leer el ticket?**',
    'talao.megas': 'La primera vez tengo que descargar el lector: unos {mb} MB, **una sola vez**. Después funciona sin internet, y la foto nunca sale de su móvil — quien lee es el propio aparato.',
    'talao.ler': 'Leer el ticket',
    'talao.aler': 'Leyendo…',
    'talao.escrevoeu': 'Lo escribo yo',
    'talao.escreveuvoce': 'Lo escribe usted',
    'talao.estabem': 'De acuerdo. **Escriba cuánto fue** — por ejemplo, "gasté 30 euros en el mercado" — y lo apunto con el ticket adjunto.',
    'talao.li': 'Leí el ticket: **{v}**{onde}{quando}.',
    'talao.lancoassim': '¿Lo apunto así?',
    'talao.achoqueli': 'Creo que leí **{v}**{onde}{quando} — pero **no estoy seguro**, el ticket está difícil de leer.',
    'talao.severdadeiro': 'Si el importe está bien lo apunto; si no, escríbalo y lo corrijo.',
    'talao.simlanca': 'Sí, apúntalo',
    'talao.naoescrevo': 'No, lo escribo yo',
    'talao.certo': 'Vale. **Escriba cuánto fue** y lo apunto con el ticket adjunto.',
    'talao.semtotal': 'Leí la foto pero **no encontré el total**. Pasa con tickets arrugados o con poca luz.',
    'talao.tireoutra': 'Haga otra con el ticket estirado y la foto recta — o **escriba cuánto fue** y lo apunto igual, con este ticket adjunto.',
    'talao.falhou': 'No pude descargar el lector — quizá se cortó internet a medias.',
    'talao.tenteoutra': 'Puede intentarlo otra vez, o **escribir cuánto fue** y lo apunto con el ticket adjunto.',
    'talao.semmotor': 'Guardé la foto.\n\nEste móvil no me deja leer el ticket solo. **Escriba cuánto fue** (por ejemplo, "gasté 30 en el mercado") y lo apunto con el ticket adjunto.',
    'talao.naoabriu': 'No pude abrir esa imagen. Inténtelo otra vez.',
    'talao.assinatura': 'Guardar la foto del ticket forma parte de la suscripción.',
    'talao.apreparar': 'Preparando…',
    'ocr.descarregar': 'Descargando el lector',
    'ocr.preparar': 'Preparando el lector',
    'ocr.portugues': 'Descargando el diccionario',
    'ocr.quase': 'Casi listo',
    'ocr.aler': 'Leyendo el ticket',

    'arr.pergunta': 'Pregunta {i} de {n}',
    'arr.seguinte': 'Siguiente',
    'arr.ver': 'Ver mis cuentas',
    'arr.naosei': 'No lo sé — saltar',
    'arr.voltar': '‹ Atrás',
    'arr.agoranao': 'Ahora no',
    'arr.escrevanumero': 'Escriba un número, aunque sea aproximado.',
    'arr.semconta': 'Esto quedó guardado solo en este móvil. Si limpia el navegador o cambia de aparato, se pierde.',
    'arr.criarconta': 'Crear cuenta y guardar esto',
    'arr.q.entra': '¿Cuánto entra al mes?',
    'arr.a.entra': 'Todo lo que entra en casa, de todas las personas: nómina, ayudas, pensiones, chapuzas. Un número aproximado basta.',
    'arr.q.essenciais': '¿Y cuánto es lo que no se puede dejar de pagar?',
    'arr.a.essenciais': 'Casa, comida, luz, agua, transporte, medicinas. Solo eso — el resto queda fuera. Si no lo sabe exacto, escriba lo que le parezca.',
    'arr.q.comquem': '¿Vive solo o con alguien?',
    'arr.a.comquem': 'Esto me sirve para saber de quién es el dinero cuando me diga "ella gastó 40 en el mercado". Nada más.',
    'arr.o.so': 'Solo/a',
    'arr.o.esposa': 'Con mi esposa',
    'arr.o.marido': 'Con mi marido',
    'arr.o.companheiro': 'Con otra persona',
    'arr.q.minha': '¿Cuánto tiene en su cuenta ahora?',
    'arr.a.minha': 'Lo que hay hoy. Es este el número que pasa a aparecer en el Inicio — y a partir de ahora soy yo quien lo mantiene correcto.',
    'arr.q.parceiro': '¿Y cuánto tiene {quem} en su cuenta?',
    'arr.a.parceiro': 'Si no lo sabe, sáltelo. Puede decírmelo más tarde en el chat: "ella tiene 800 en su cuenta".',
    'arr.q.emergencia': '¿Y apartado, para emergencias?',
    'arr.a.emergencia': 'Dinero que no es para gastar este mes: ahorros, lo que esté guardado. Si no hay nada, escriba 0.',
    'arr.q.divida': '¿Cuánto deben hoy, en total?',
    'arr.a.divida': 'Tarjetas, créditos, plazos, dinero pedido a alguien. Sumado. Si no deben nada, escriba 0 — es una buena noticia y vale la pena verla escrita.',
    'arr.q.plano': '¿Y qué quiere hacer primero?',
    'arr.a.plano': 'Puede cambiarlo cuando quiera. Solo sirve para que yo sepa qué ponerle delante.',
    'arr.quem.esposa': 'su esposa',
    'arr.quem.marido': 'su marido',
    'arr.quem.outro': 'la otra persona',
    'plano.respirar': 'Llegar a fin de mes',
    'plano.respirar.a': 'Primero dejar de hundirse. La app pone delante lo que sale y dónde se puede recortar.',
    'plano.reserva': 'Juntar un colchón',
    'plano.reserva.a': 'Las cuentas cuadran. Ahora toca juntar dinero para que un imprevisto no acabe en deuda.',
    'plano.divida': 'Salir de las deudas',
    'plano.divida.a': 'Hay plazos que pagar. La app pone delante lo que cuestan y cuánto falta.',

    /* — categorias, que aparecem em cada confirmação — */
    'cat.casa': 'Casa y alquiler',
    'cat.mercado': 'Mercado',
    'cat.transporte': 'Transporte',
    'cat.saude': 'Salud',
    'cat.educacao': 'Educación',
    'cat.lazer': 'Ocio',
    'cat.contas': 'Facturas y servicios',
    'cat.dividas': 'Deudas',
    'cat.reserva': 'Guardé en el ahorro',
    'cat.acerto': 'Ajuste de saldo',
    'cat.outros-s': 'Otros',
    'cat.salario': 'Nómina',
    'cat.extra': 'Trabajo extra',
    'cat.vendas': 'Ventas',
    'cat.juros': 'Intereses',
    'cat.presente': 'Regalo',
    'cat.reserva-tirei': 'Saqué del ahorro',
    'cat.outros-e': 'Otros',

    'ola.manha': 'Buenos días',
    'ola.tarde': 'Buenas tardes',
    'ola.noite': 'Buenas noches',
        /* — o banner — */
    "bn.mes.t": "Su mes",
    "bn.mes.1": "Último día de su mes de prueba. Después son 9,89 € al año.",
    "bn.mes.n": "Está en su mes de prueba — quedan {d} días, con todo abierto.",
    "bn.gratis.t": "Un mes gratis",
    "bn.gratis": "Cree una cuenta y tiene un mes entero con todo abierto. Sin tarjeta, sin compromiso.",
    "bn.gratis.b": "Crear cuenta",
    "bn.escrever.t": "Escriba, y queda apuntado",
    "bn.escrever": "«Gasté 30 euros en el mercado Mercadona» — y el movimiento queda hecho, con el importe, la categoría y la tienda. Escriba el tipo de sitio y el nombre: mercado, farmacia, gasolinera.",
    "bn.talao.t": "Fotografíe el ticket",
    "bn.talao": "Hágale una foto al ticket y yo leo el total, la tienda y el día. La lectura se hace dentro de su móvil — la foto no sale de aquí.",
    "bn.contas.t": "Cuentas al momento",
    "bn.contas": "En la tienda, pregunte «¿12 cuotas de 45,90 o 480 al contado?». La respuesta llega antes de firmar — y es gratis.",
    "bn.vence.t": "Lo que vence esta semana",
    "bn.vence": "Apunte las facturas que se repiten y la app avisa antes de que venzan. Un recargo por olvido es dinero que ya era suyo.",
    "bn.divida.t": "El precio de la deuda",
    "bn.divida": "Cuánto cuesta de verdad ese plazo, y cuánto tiempo queda. Con los tipos de su país, y con la fuente a la vista.",
    "bn.seu.t": "Todo se queda con usted",
    "bn.seu": "Los movimientos se quedan en su móvil y funcionan sin internet. Con cuenta, aparecen también en el ordenador.",
    "bn.experimentar": "Probar",
    "bn.chat": "Abrir el chat",
    "bn.vercontas": "Ver las cuentas",
    "bn.verconta": "Ver la cuenta",

        'arr.q.entra': 'En un mes normal, ¿cuánto entra en casa?',
    'arr.a.entra': 'Todo lo que entra, de todas las personas: nómina, ayudas, pensiones, chapuzas.\n\nSi cobra a comisión, o si unos meses son buenos y otros malos, **escriba un mes flojo** — es con ese con el que tienen que cuadrar las cuentas. Y si lo prefiere, sáltelo: la app lo aprende sola en cuanto apunte un mes entero.',
    'arr.varia': 'Varía mucho — no sabría decir',

    'lingua.titulo': 'Idioma',
    'lingua.ajuda': 'Le escribo en este idioma. En el chat respondo siempre en el idioma en que me escriba.',

    'bn.investir.t': 'Dónde poner lo que ya juntó',
    'bn.investir': 'El dinero parado en la cuenta corriente renta cero y la inflación se lo come. Aquí están los sitios con garantía del Estado o del fondo de garantía, en Portugal y en Brasil, y la cuenta ya hecha con el impuesto.',
    'bn.verinvestir': 'Ver dónde',
    'inv.titulo': 'Poner el dinero a rendir',
    'inv.aviso': 'Esto no es asesoramiento financiero, y ningún banco ha pagado por estar aquí. Es la lista de lo que tiene garantía del Estado o del fondo de garantía, con la fuente a la vista, y una calculadora para hacer la cuenta con sus números.',
    'inv.onde': 'Dónde está seguro el dinero en {pais}',
    'inv.oquee': 'En esta lista solo entra lo que está garantizado y no puede valer menos de lo que usted puso. Nada de acciones, de fondos ni de cripto — quien tiene el dinero justo no puede permitirse perder lo que juntó.',
    'inv.quem': 'De quién es:',
    'inv.seguro': 'Quién lo garantiza:',
    'inv.rende': 'Cuánto renta:',
    'inv.mexer': '¿Se puede sacar?',
    'inv.limite': 'Hasta cuánto:',
    'inv.onde2': 'Dónde se hace:',
    'inv.fonte': 'Fuente:',
    'inv.confirmar': 'confirmar en la fuente',
    'inv.verificado': 'Comprobado el {d}. Las tasas cambian todos los meses — mire la fuente antes de decidir.',
    'inv.calc': 'La cuenta, con sus números',
    'inv.calcsub': 'Escriba lo que ya tiene apartado y lo que consigue poner al mes. El impuesto ya va descontado.',
    'inv.jatem': 'Lo que ya tiene',
    'inv.pormes': 'Lo que pone al mes',
    'inv.anos': 'Durante cuántos años',
    'inv.taxa': 'Tasa al año (%)',
    'inv.escreva': 'Escriba un valor ahí arriba y hago la cuenta.',
    'inv.aofim': 'Al cabo de {n} años tendrá',
    'inv.pos': 'Salió de su bolsillo',
    'inv.rendeu': 'Rindió',
    'inv.imposto': 'Impuesto ({p}%)',
    'inv.ganho': 'Son {v} que no tenía, en {n} años, sin trabajar para ganarlos.',
    'inv.ano': 'Año',
    'inv.fica': 'Se queda con',
    'inv.inflacao': 'Estos números son en dinero de hoy y no descuentan la inflación: dentro de unos años, el mismo dinero compra menos. Rendir por encima de la inflación es lo mínimo para no perder — y por eso dejarlo todo en la cuenta corriente es perder despacio.'
  },

  /* ---------------------------------------------------------- english */
  en: {
    'abas.escrever': 'Write',
    'abas.inicio': 'Home',
    'abas.lancar': 'Add',
    'abas.mes': 'Month',
    'abas.mais': 'Tools',

    'inicio.sub': 'This is your month. Enter what you spent and the rest takes care of itself.',
    'inicio.livre': 'Free until the end of the month',
    'inicio.guardei': 'Saved this month',
    'inicio.reserva': 'Savings',
    'inicio.naconta': 'In the account',
    'inicio.aotodo': 'All together',
    'inicio.devemos': 'We owe',
    'inicio.minhaconta': 'My account',
    'inicio.contadela': 'Her account',
    'inicio.contadele': 'His account',
    'inicio.outraconta': 'The other account',
    'inicio.emergencia': 'Emergency',
    'inicio.naodivida': '{v} more went out than came in this month. This is not a debt.',

    'gaveta.lancar': 'Add a expense or some money in',
    'gaveta.mes': 'My month, entry by entry',
    'gaveta.contas': 'The bills that come every month',
    'gaveta.divida': 'What the debt costs',
    'gaveta.apoios': 'Benefits you may not be claiming',
    'gaveta.mais': 'Tools and calculators',

    'conferir.pergunta': 'New month. Do these numbers match your bank?',
    'conferir.certo': "That's right",
    'conferir.acertar': 'I want to fix them',
    'conferir.escreva': "Write what's there today. Anything you leave blank stays as it is.",
    'conferir.guardar': 'Save',
    'conferir.deixa': 'Leave it',
    'conferir.quantodevem': 'How much you owe',
    'conferir.feito': "Done. These are the month's numbers now.",
    'conferir.nada': 'Nothing changed — everything stays as it was.',
    'conferir.nota': 'This corrects the balance. It does not delete or invent entries. If an expense is missing, add it in ➕ Add or tell me in the chat.',

    'chat.lancado': 'Added:',
    'chat.lancados': 'Added:',
    'chat.apagar': 'Delete this',
    'chat.apagado': 'Deleted',
    'chat.comdata': 'Dated {d}.',
    'chat.comfoto': 'With the photo attached.',
    'chat.semfoto': "The photo didn't fit — the entry was saved anyway.",
    'chat.saldoposto': 'Got it: **{v}** — {onde}.',
    'chat.saldoexplica': "It's on your Home screen now. From here on I'll subtract what you spend and add what comes in — you won't have to write it again.",
    'chat.reservaposta': 'Noted: you have **{v}** put aside, in the emergency account.',
    'chat.reservaexplica': "I didn't record that as money coming in — it's not money you got today, it's money you already had.",
    'chat.jaestava': 'It was already **{v}**. I changed nothing.',
    'chat.corrigido': 'Fixed: **{a} → {b}** — {onde}.',
    'chat.corrigidoult': 'Fixed: **{a} → {b}**{desc}.',
    'chat.semlancamento': "There's nothing to correct yet.",
    'chat.jaesta': 'The last one is already **{v}**. I changed nothing.',
    'chat.temna': 'You have **{v}** — {onde}.',
    'chat.naosei': "I don't know how much is in your account yet — I only know what's been entered.",
    'chat.digameonumero': '**Tell me the number** ("I have 1000 in the bank") and from then on I keep it right on my own: I subtract what you spend and add what comes in.',
    'chat.aotodo': 'All together, **{v}**:',
    'chat.edevem': 'And you owe **{v}**.',
    'chat.diferenca': "There's **{v}** unaccounted for — {qual} without my knowing.",
    'chat.entrou': 'money that came in',
    'chat.saiu': 'money that went out',
    'chat.registar': 'Shall I record that in the month, so the books add up?',
    'chat.simregista': 'Yes, record it',
    'chat.naodeixa': 'No, leave it',
    'chat.registado': 'Recorded',
    'chat.ficoucomoestava': 'Left as it was',
    'chat.sosaldo': 'Just the balance, then. The month stays as it was.',
    'chat.acertofeito': 'Recorded in the month: **{s} {v}** · ⚖️ Balance adjustment.',
    'chat.acertosaldo': 'The balance stays at {v}.',
    'chat.oquestaerrado': "Tell me what's wrong and I'll fix it.",
    'chat.comodizer': 'If it\'s an amount: **"the last one was 50, not 500"**.\nIf it\'s the balance: **"I have 1000 in the bank"**.\nIf there\'s an entry too many, write **"delete the last one"**.',
    'chat.negativotitulo': "You're right to find that odd, and the label is to blame.",
    'chat.negativoexplica': "That red number **is not your balance** and it is not a debt. It's **this month's** sum: what went out minus what came in. Until your wages land it stays negative — and it would stay negative even if you had a million in the bank.",
    'chat.negativotem': 'Your money is the other one: **{v}**, on the line just below.',
    'chat.negativopede': '**Tell me how much is in your account** — "I have 1000 in the bank" — and I\'ll put that number on your Home screen and keep it right from then on.',
    'chat.avisonegativo': "And while we're here, about that red number above: **it is not a debt.** It's only how much more went out than came in **this month** — normal before your wages land. Your money is what's under \"In the account\".",
    'chat.semconta': "I understood what you wrote — and this is what **Vida Financeira** does for you: you write, and it's recorded.",
    'chat.semcontames': '**Create an account and you get a whole month, free.** No card, nothing. After that month it is €9.89 a year.',
    'chat.semcontamao': 'In the meantime you can add entries by hand in ➕ Add, which is free forever.',
    'chat.corrigirsemconta': 'I understood what you want to fix — and that is what **Vida Financeira** does for you.',
    'chat.placeholder': 'I spent 30 at the market…',

    'talao.perguntar': 'I saved the photo. **Shall I try to read the receipt?**',
    'talao.megas': 'The first time I have to download the reader: about {mb} MB, **once only**. After that it works without internet, and the photo never leaves your phone — the phone itself does the reading.',
    'talao.ler': 'Read the receipt',
    'talao.aler': 'Reading…',
    'talao.escrevoeu': "I'll write it",
    'talao.escreveuvoce': 'You write it',
    'talao.estabem': 'All right. **Write how much it was** — for example, "I spent 30 at the market" — and I\'ll record it with the receipt attached.',
    'talao.li': 'I read the receipt: **{v}**{onde}{quando}.',
    'talao.lancoassim': 'Record it like this?',
    'talao.achoqueli': "I think I read **{v}**{onde}{quando} — but **I'm not sure**, the receipt is hard to read.",
    'talao.severdadeiro': "If the amount is right I'll record it; if not, write it and I'll correct it.",
    'talao.simlanca': 'Yes, record it',
    'talao.naoescrevo': "No, I'll write it",
    'talao.certo': "Right. **Write how much it was** and I'll record it with the receipt attached.",
    'talao.semtotal': "I read the photo but **I couldn't find the total**. That happens with crumpled receipts or poor light.",
    'talao.tireoutra': 'Take another with the receipt flat and the photo straight — or **write how much it was** and I\'ll record it anyway, with this receipt attached.',
    'talao.falhou': "I couldn't download the reader — the connection may have dropped halfway.",
    'talao.tenteoutra': "You can try again, or **write how much it was** and I'll record it with the receipt attached.",
    'talao.semmotor': 'I saved the photo.\n\nThis phone won\'t let me read the receipt on my own. **Write how much it was** (for example, "I spent 30 at the market") and I\'ll record it with the receipt attached.',
    'talao.naoabriu': "I couldn't open that image. Try again.",
    'talao.assinatura': 'Saving the receipt photo is part of the subscription.',
    'talao.apreparar': 'Getting ready…',
    'ocr.descarregar': 'Downloading the reader',
    'ocr.preparar': 'Getting the reader ready',
    'ocr.portugues': 'Downloading the dictionary',
    'ocr.quase': 'Almost there',
    'ocr.aler': 'Reading the receipt',

    'arr.pergunta': 'Question {i} of {n}',
    'arr.seguinte': 'Next',
    'arr.ver': 'See my numbers',
    'arr.naosei': "I don't know — skip",
    'arr.voltar': '‹ Back',
    'arr.agoranao': 'Not now',
    'arr.escrevanumero': 'Write a number, even a rough one.',
    'arr.semconta': 'This was saved on this phone only. If you clear your browser or change phone, it is gone.',
    'arr.criarconta': 'Create an account and keep this',
    'arr.q.entra': 'How much comes in each month?',
    'arr.a.entra': 'Everything that comes into the house, from everyone: wages, benefits, pensions, odd jobs. A rough number is enough.',
    'arr.q.essenciais': "And how much is what you can't not pay?",
    'arr.a.essenciais': "Rent, food, electricity, water, transport, medicine. Only that — the rest stays out. If you're not sure, write what seems right.",
    'arr.q.comquem': 'Do you live alone or with someone?',
    'arr.a.comquem': 'This is so I know whose money it is when you tell me "she spent 40 at the market". Nothing else.',
    'arr.o.so': 'On my own',
    'arr.o.esposa': 'With my wife',
    'arr.o.marido': 'With my husband',
    'arr.o.companheiro': 'With someone else',
    'arr.q.minha': 'How much is in your account right now?',
    'arr.a.minha': "What's there today. This is the number that will show on your Home screen — and from here on I keep it right.",
    'arr.q.parceiro': 'And how much does {quem} have in their account?',
    'arr.a.parceiro': 'If you don\'t know, skip it. You can tell me later in the chat: "she has 800 in her account".',
    'arr.q.emergencia': 'And put aside, for emergencies?',
    'arr.a.emergencia': "Money that isn't for spending this month: savings, a rainy-day fund, whatever is put away. If there is none, write 0.",
    'arr.q.divida': 'How much do you owe today, all together?',
    'arr.a.divida': 'Cards, loans, instalments, money borrowed from someone. Added up. If you owe nothing, write 0 — that is good news and worth seeing written down.',
    'arr.q.plano': 'And what do you want to do first?',
    'arr.a.plano': 'You can change it whenever you like. It only tells me what to put in front of you.',
    'arr.quem.esposa': 'your wife',
    'arr.quem.marido': 'your husband',
    'arr.quem.outro': 'the other person',
    'plano.respirar': 'Get to the end of the month',
    'plano.respirar.a': 'First stop sinking. The app puts what goes out, and where you can cut, up front.',
    'plano.reserva': 'Build up savings',
    'plano.reserva.a': "The books add up. Now it's about putting money aside so a surprise doesn't turn into debt.",
    'plano.divida': 'Get out of debt',
    'plano.divida.a': 'There are instalments to pay. The app puts what they cost, and how much is left, up front.',

    /* — categorias, que aparecem em cada confirmação — */
    'cat.casa': 'Home and rent',
    'cat.mercado': 'Groceries',
    'cat.transporte': 'Transport',
    'cat.saude': 'Health',
    'cat.educacao': 'Education',
    'cat.lazer': 'Leisure',
    'cat.contas': 'Bills and services',
    'cat.dividas': 'Debt',
    'cat.reserva': 'Put into savings',
    'cat.acerto': 'Balance adjustment',
    'cat.outros-s': 'Other',
    'cat.salario': 'Wages',
    'cat.extra': 'Extra work',
    'cat.vendas': 'Sales',
    'cat.juros': 'Interest',
    'cat.presente': 'Gift',
    'cat.reserva-tirei': 'Took from savings',
    'cat.outros-e': 'Other',

    'ola.manha': 'Good morning',
    'ola.tarde': 'Good afternoon',
    'ola.noite': 'Good evening',
        /* — o banner — */
    "bn.mes.t": "Your month",
    "bn.mes.1": "Last day of your trial month. After that it is 9.89 € a year.",
    "bn.mes.n": "You are in your trial month — {d} days left, with everything open.",
    "bn.gratis.t": "A free month",
    "bn.gratis": "Create an account and get a whole month with everything open. No card, no commitment.",
    "bn.gratis.b": "Create an account",
    "bn.escrever.t": "Write it, and it is recorded",
    "bn.escrever": "\"I spent 30 euros at the Tesco supermarket\" — and the entry is made, with the amount, the category and the shop. Say the kind of place and its name: supermarket, pharmacy, petrol station.",
    "bn.talao.t": "Photograph the receipt",
    "bn.talao": "Take a photo of the receipt and I read the total, the shop and the date. The reading happens inside your phone — the photo never leaves it.",
    "bn.contas.t": "Sums on the spot",
    "bn.contas": "In the shop, ask \"12 payments of 45.90 or 480 up front?\". The answer comes before you sign — and it is free.",
    "bn.vence.t": "What is due this week",
    "bn.vence": "Write down the bills that come every month and the app warns you before they are due. A late fee is money that was already yours.",
    "bn.divida.t": "What debt costs",
    "bn.divida": "What that instalment really costs, and how long is left. With the rates for your country, and the source in plain sight.",
    "bn.seu.t": "It all stays with you",
    "bn.seu": "Your entries stay on your phone and work without internet. With an account they show up on your computer too.",
    "bn.experimentar": "Try it",
    "bn.chat": "Open the chat",
    "bn.vercontas": "See the bills",
    "bn.verconta": "See the sum",

        'arr.q.entra': 'In a normal month, how much comes in?',
    'arr.a.entra': 'Everything that comes in, from everyone: wages, benefits, pensions, odd jobs.\n\nIf you work on commission, or some months are good and others bad, **write a lean month** — that is the one the books have to add up against. And if you would rather, skip it: the app works it out on its own once you have entered a full month.',
    'arr.varia': 'It varies a lot — I could not say',

    'lingua.titulo': 'Language',
    'lingua.ajuda': 'I write to you in this language. In the chat I always answer in the language you write to me in.',

    'bn.investir.t': 'Where to put what you saved',
    'bn.investir': 'Money sitting in a current account earns nothing and inflation eats it. Here are the places guaranteed by the State or the deposit guarantee fund, in Portugal and Brazil, with the sums already done after tax.',
    'bn.verinvestir': 'See where',
    'inv.titulo': 'Putting money to work',
    'inv.aviso': 'This is not financial advice, and no bank paid to be on this page. It is a list of what is guaranteed by the State or by the deposit guarantee fund, with the source in plain sight, and a calculator to do the sums with your own numbers.',
    'inv.onde': 'Where money is safe in {pais}',
    'inv.oquee': 'Only things that are guaranteed and cannot be worth less than you put in make this list. No shares, no funds, no crypto — when money is tight you cannot afford to lose what you saved.',
    'inv.quem': 'Whose it is:',
    'inv.seguro': 'Who guarantees it:',
    'inv.rende': 'What it pays:',
    'inv.mexer': 'Can you take it out?',
    'inv.limite': 'Up to how much:',
    'inv.onde2': 'Where you do it:',
    'inv.fonte': 'Source:',
    'inv.confirmar': 'check the source',
    'inv.verificado': 'Checked on {d}. Rates change every month — look at the source before you decide.',
    'inv.calc': 'The sums, with your numbers',
    'inv.calcsub': 'Write what you already have put by and what you can manage each month. Tax is already taken off.',
    'inv.jatem': 'What you already have',
    'inv.pormes': 'What you put in each month',
    'inv.anos': 'For how many years',
    'inv.taxa': 'Rate per year (%)',
    'inv.escreva': 'Write an amount up there and I will do the sums.',
    'inv.aofim': 'After {n} years you would have',
    'inv.pos': 'Out of your pocket',
    'inv.rendeu': 'Earned',
    'inv.imposto': 'Tax ({p}%)',
    'inv.ganho': "That's {v} you did not have, over {n} years, without working for it.",
    'inv.ano': 'Year',
    'inv.fica': 'You have',
    'inv.inflacao': 'These numbers are in today’s money and do not take inflation off: in a few years the same amount buys less. Earning more than inflation is the bare minimum for not losing — which is why leaving it all in a current account is losing slowly.'
  }
};

/* Os botões de escolher a língua. Botões e não um menu: um `<select>` com
   quatro linhas num telemóvel é onde as pessoas desistem, e aqui só há quatro
   opções — cabem todas à vista. */
function desenharEscolhaDeIdioma() {
  const zona = document.getElementById('lingua-opcoes');
  if (!zona) return;
  zona.innerHTML = '';
  IDIOMAS.forEach(l => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lingua-bt' + (l === idioma() ? ' escolhida' : '');
    b.textContent = IDIOMA_NOME[l];
    b.setAttribute('lang', l === 'br' ? 'pt-BR' : (l === 'pt' ? 'pt-PT' : l));
    b.addEventListener('click', () => {
      definirIdioma(l);
      desenharEscolhaDeIdioma();
      /* O que já está desenhado por javascript não tem `data-t` nenhum —
         quem o redesenha é o próprio app-financas. */
      if (typeof desenhar === 'function') desenhar();
    });
    zona.appendChild(b);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  traduzirPagina();
  desenharEscolhaDeIdioma();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { T, IDIOMAS, IDIOMA_NOME, TEXTOS, idiomaDoAparelho };
}
