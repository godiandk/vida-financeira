/* ============================================================
   Vida Financeira — ler o talão

   Durante muito tempo esta aplicação disse à pessoa, com todas as letras, que
   não sabia ler a fotografia do talão: guardava-a, e o valor tinha de ser
   escrito à mão. A razão era esta — os serviços de leitura de imagem cobram e
   exigem uma chave secreta, e num site que é só ficheiros, servido pelo
   GitHub Pages, uma chave dessas fica à vista de quem abrir o código da
   página. Em dias estaria a ser usada por estranhos, e a factura vinha para
   quem a pôs lá.

   O que resolve isto não é um serviço: é o motor de leitura correr **dentro
   do telemóvel**. O Tesseract compilado para WebAssembly faz exactamente
   isso. Não há chave nenhuma porque não há servidor nenhum; a fotografia do
   talão — que mostra onde a pessoa anda, a que horas e com que cartão paga —
   nunca sai do aparelho. Para esta aplicação isso não é um pormenor técnico,
   é a mesma promessa que está escrita na página inicial.

   O preço é o tamanho. São cerca de 4,3 MB a descarregar (o motor e o
   dicionário do português), e nesta aplicação isso não pode acontecer sem
   aviso: quem a usa está muitas vezes com dados contados ao megabyte. Por
   isso nada disto é descarregado ao abrir o site — só quando a pessoa manda
   ler um talão, e depois de lhe ser dito quanto é e que é uma vez só.

   Os ficheiros do motor estão guardados aqui no repositório, em `vendor/ocr`,
   e não vêm de um CDN. Assim funcionam com a aplicação instalada e sem
   internet, e ninguém de fora sabe que esta pessoa leu um talão hoje.
   ============================================================ */

/* Onde vivem os ficheiros do motor. */
function ocrRaiz() {
  return (typeof raizDoSite === 'function' ? raizDoSite() : './') + 'vendor/ocr/';
}

/* Os telemóveis mais recentes têm instruções que fazem o mesmo trabalho em
   menos tempo (SIMD). Os antigos não — e é para esses que existe a segunda
   versão do motor. Perguntar custa microssegundos e poupa uma falha seca em
   aparelhos de oito anos, que são precisamente os do público desta app. */
function ocrTemSimd() {
  try {
    return WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
      3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
    ]));
  } catch (e) { return false; }
}

function ocrPodeCorrer() {
  return typeof WebAssembly === 'object' && typeof Worker === 'function';
}

/* Quanto há a descarregar da primeira vez, para se poder dizer o número em
   vez de "alguns megabytes". Motor + dicionário, arredondado para cima. */
const OCR_MEGAS = 4.3;

const OCR_JA = 'vf:ocr-ca';   /* o motor já foi descarregado neste aparelho */

let ocrLeitor = null;         /* o worker, reaproveitado entre talões */
let ocrAPrepararse = null;    /* a promessa, para dois toques não criarem dois */

function ocrCarregarBiblioteca() {
  if (typeof Tesseract !== 'undefined') return Promise.resolve();
  return new Promise((feito, falhou) => {
    const s = document.createElement('script');
    s.src = ocrRaiz() + 'tesseract.min.js';
    s.onload = feito;
    s.onerror = () => falhou(new Error('nao-carregou'));
    document.head.appendChild(s);
  });
}

/* Prepara o leitor. `aoAndar` recebe {passo, parte} para se poder mostrar à
   pessoa que a coisa está viva — quatro megabytes numa rede fraca são um
   minuto de ecrã parado, e um ecrã parado parece avariado. */
function ocrPreparar(aoAndar) {
  if (ocrLeitor) return Promise.resolve(ocrLeitor);
  if (ocrAPrepararse) return ocrAPrepararse;

  const nucleo = ocrRaiz() + (ocrTemSimd()
    ? 'tesseract-core-simd-lstm.js'
    : 'tesseract-core-lstm.js');

  ocrAPrepararse = ocrCarregarBiblioteca().then(() =>
    Tesseract.createWorker('por', 1, {
      workerPath: ocrRaiz() + 'worker.min.js',
      corePath: nucleo,
      langPath: ocrRaiz(),
      /* Sem isto o worker nasce de um blob, fica sem endereço de base, e o
         `.wasm` — que o motor pede por caminho relativo — deixa de ser
         encontrado. Custou uma tarde a descobrir: o erro que aparece é
         "Failed to parse URL", que não diz nada sobre blobs. */
      workerBlobURL: false,
      logger: m => {
        if (typeof aoAndar !== 'function') return;
        aoAndar({ passo: m.status || '', parte: typeof m.progress === 'number' ? m.progress : 0 });
      }
    })
  ).then(w => {
    ocrLeitor = w;
    ocrAPrepararse = null;
    /* Fica registado que já cá esteve, para da segunda vez não se voltar a
       perguntar "posso descarregar 4 MB?" a quem já os descarregou. */
    try { localStorage.setItem(OCR_JA, '1'); } catch (e) {}
    return w;
  }).catch(e => { ocrAPrepararse = null; throw e; });

  return ocrAPrepararse;
}

/* ------------------------------------------------------------
   Preparar a imagem

   A fotografia que fica agarrada ao movimento é encolhida para 640px, que
   chega para a ver no ecrã. Para ler, não chega: a 640px de largura as letras
   de um talão têm três píxeis de altura e não são letras nenhumas. Aqui
   vai-se pelo caminho oposto — o maior lado a 1600px.

   Depois vem a parte que decide tudo. A primeira versão disto punha a imagem
   a cinzentos e esticava o contraste com uma regra só para a fotografia
   inteira. Parecia bem e lia mal, por uma razão que só se percebe olhando
   para o que o motor recebia: numa fotografia de um talão em cima da mesa, a
   coisa mais clara não é o papel — é a mesa, ou a luz da janela. Esticar pela
   fotografia toda deixava a mesa a branco e o papel a cinzento médio, e o
   motor, que espera letras escuras sobre fundo claro, dava o papel inteiro
   por fundo escuro e não lia lá nada.

   O que se faz agora é decidir píxel a píxel, comparando cada ponto com a
   vizinhança dele (Sauvola). Uma sombra atravessada no talão deixa de
   importar, porque de um lado e do outro da sombra a conta é feita à parte; e
   nas zonas sem letra nenhuma — margens, mesa — o desvio é baixo e fica tudo
   branco, em vez de virar ruído.

   É mais trabalho: uma imagem de 1600px leva umas décimas de segundo. Ao pé
   dos quatro megabytes que se descarregam uma vez e do segundo que o motor
   demora a ler, não se nota — e é a diferença entre ler o talão desbotado e
   pedir à pessoa que escreva o valor à mão.
   ------------------------------------------------------------ */
const OCR_LADO = 1600;

/* Sauvola: o limiar de cada píxel sai da média e do desvio da vizinhança.
   `k` mais alto apaga mais (bom para papel sujo), mais baixo agarra letras
   fracas. 0,25 é o meio-termo que melhor se portou com talões desbotados sem
   partir os que já estavam bons. */
const OCR_K = 0.25;
const OCR_R = 128;

function ocrBinarizar(ctx, l, a) {
  const d = ctx.getImageData(0, 0, l, a);
  const p = d.data;

  /* Cinzentos, num sítio à parte para não se estar a ler e a escrever no
     mesmo array enquanto se calculam as médias. */
  const cinza = new Uint8Array(l * a);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    cinza[j] = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) | 0;
  }

  /* Somas acumuladas: com elas, a soma de qualquer rectângulo custa quatro
     leituras, seja ele de dez píxeis ou de dez mil. Sem isto, uma janela de
     80 píxeis sobre uma imagem de 1600 seriam mil milhões de contas. */
  const L = l + 1;
  const soma = new Float64Array(L * (a + 1));
  const soma2 = new Float64Array(L * (a + 1));
  for (let y = 0; y < a; y++) {
    let linha = 0, linha2 = 0;
    for (let x = 0; x < l; x++) {
      const v = cinza[y * l + x];
      linha += v; linha2 += v * v;
      soma[(y + 1) * L + (x + 1)] = soma[y * L + (x + 1)] + linha;
      soma2[(y + 1) * L + (x + 1)] = soma2[y * L + (x + 1)] + linha2;
    }
  }

  /* A janela tem de ser maior do que uma letra e menor do que a fotografia:
     por volta de um vinte avos da largura dá as duas coisas em talões
     fotografados de perto e de longe. */
  const meia = Math.max(7, Math.round(l / 40));

  for (let y = 0; y < a; y++) {
    const y0 = Math.max(0, y - meia), y1 = Math.min(a - 1, y + meia);
    for (let x = 0; x < l; x++) {
      const x0 = Math.max(0, x - meia), x1 = Math.min(l - 1, x + meia);
      const n = (x1 - x0 + 1) * (y1 - y0 + 1);

      const A = (y1 + 1) * L + (x1 + 1), B = y0 * L + (x1 + 1);
      const C = (y1 + 1) * L + x0, D2 = y0 * L + x0;

      const s = soma[A] - soma[B] - soma[C] + soma[D2];
      const s2 = soma2[A] - soma2[B] - soma2[C] + soma2[D2];

      const media = s / n;
      const varia = Math.max(0, s2 / n - media * media);
      const desvio = Math.sqrt(varia);

      const limiar = media * (1 + OCR_K * (desvio / OCR_R - 1));
      const c = cinza[y * l + x] > limiar ? 255 : 0;

      const i = (y * l + x) * 4;
      p[i] = p[i + 1] = p[i + 2] = c;
      p[i + 3] = 255;
    }
  }

  ctx.putImageData(d, 0, 0);
}

function ocrPrepararImagem(origem) {
  return new Promise((feito, falhou) => {
    const img = new Image();
    img.onload = () => {
      const maior = Math.max(img.width, img.height);
      const escala = maior > OCR_LADO ? OCR_LADO / maior : 1;
      const l = Math.round(img.width * escala);
      const a = Math.round(img.height * escala);

      const tela = document.createElement('canvas');
      tela.width = l; tela.height = a;
      const ctx = tela.getContext('2d');
      ctx.drawImage(img, 0, 0, l, a);

      try {
        ocrBinarizar(ctx, l, a);
      } catch (e) {
        /* Uma imagem de outro domínio suja a tela e o `getImageData` recusa;
           num telemóvel sem memória, o `new Float64Array` pode falhar. Nos
           dois casos lê-se a imagem como veio, que é melhor do que não ler. */
      }

      feito(tela);
    };
    img.onerror = () => falhou(new Error('imagem'));
    img.src = origem;
  });
}

/* Já cá está? Se sim, ler um talão é imediato e não há nada a perguntar. */
function ocrJaDescarregado() {
  if (ocrLeitor) return true;
  try { return localStorage.getItem(OCR_JA) === '1'; } catch (e) { return false; }
}

/* Lê e devolve o texto cru. */
function ocrLer(origem, aoAndar) {
  return ocrPreparar(aoAndar)
    .then(w => ocrPrepararImagem(origem).then(tela => w.recognize(tela)))
    .then(r => (r && r.data && r.data.text) ? r.data.text : '');
}

/* ============================================================
   Do texto para um movimento

   Esta é a parte que decide o que fica lançado, e por isso é a parte que tem
   de errar para o lado seguro. Um total errado num caderno de contas é pior
   do que um total em falta: a pessoa deixa de confiar no que lá está e o
   caderno morre. Daí a `confianca` que sai daqui — quando é baixa, quem
   chama isto tem de perguntar antes de gravar.
   ============================================================ */

function talaoSemAcentos(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* Os valores de uma linha, em euros ou reais, sempre com os cêntimos. Um
   talão escreve sempre "14,58" e nunca "14" — e exigir os dois algarismos é o
   que impede que o "2" de "2 UN" ou o "1500" de uma morada sejam lidos como
   dinheiro. */
function talaoValoresDaLinha(linha) {
  const fora = [];
  const re = /(\d{1,3}(?:[ .]\d{3})*|\d+)\s*[,.](\d{2})(?!\d)/g;
  let m;
  while ((m = re.exec(linha)) !== null) {
    const inteiro = m[1].replace(/[ .]/g, '');
    const v = parseFloat(inteiro + '.' + m[2]);
    if (isFinite(v) && v > 0 && v < 1000000) fora.push({ valor: v, fim: m.index + m[0].length });
  }
  return fora;
}

/* Linhas que trazem um valor igual ao total mas não são o total: o que se
   entregou, o troco, o meio de pagamento, o IVA. Se alguma destas ganhasse,
   um pagamento em numerário de 25,00 num talão de 20,57 ficava lançado como
   25,00 — e a diferença é o troco que a pessoa tem no bolso. */
const TALAO_NAO_E_TOTAL = [
  'subtotal', 'sub total', 'sub-total',
  'troco', 'numerario', 'dinheiro', 'entregue', 'recebido',
  'multibanco', 'cartao', 'debito', 'credito', 'pix', 'mbway', 'mb way',
  'iva', 'imposto', 'taxa', 'desconto', 'poupanca', 'poupou', 'economia',
  'itens', 'items', 'artigos', 'volumes', 'qtd', 'quantidade',
  'total de itens', 'total itens'
];

/* E as que são. Pela ordem em que valem: quem escreve "total a pagar" está a
   dizer exactamente o que queremos, e não há que adivinhar. */
const TALAO_E_TOTAL = [
  { re: /t[o0]tal\s*a\s*paga?r/, peso: 100 },
  { re: /valor\s*a\s*paga?r/, peso: 100 },
  { re: /valor\s*t[o0]tal/, peso: 95 },
  { re: /t[o0]tal\s*(r\$|eur|€)?/, peso: 80 },
  { re: /^a\s*paga?r\b/, peso: 70 }
];

function talaoAcharTotal(linhas) {
  let melhor = null;

  linhas.forEach((linha, i) => {
    const t = talaoSemAcentos(linha).toLowerCase().trim();
    if (!t) return;
    if (TALAO_NAO_E_TOTAL.some(x => t.includes(x))) return;

    const marca = TALAO_E_TOTAL.find(x => x.re.test(t));
    if (!marca) return;

    const vals = talaoValoresDaLinha(linha);
    if (!vals.length) return;

    /* O último valor da linha é o que interessa: "TOTAL 3 ITENS 20,57" tem o
       3 pelo meio, e num talão o dinheiro está sempre encostado à direita. */
    const v = vals[vals.length - 1].valor;
    /* Empatando o peso, ganha a linha mais abaixo — o total vem no fim. */
    if (!melhor || marca.peso > melhor.peso || (marca.peso === melhor.peso && i > melhor.linha)) {
      melhor = { valor: v, peso: marca.peso, linha: i, confianca: 'alta' };
    }
  });

  if (melhor) return melhor;

  /* Sem nenhuma linha de total — acontece com talões cortados ou com a parte
     de baixo desfocada. Fica o maior valor do terço final, que é quase sempre
     o total, mas com a confiança em baixo: quem chamar isto tem de perguntar. */
  const desde = Math.floor(linhas.length * 0.55);
  let maior = null;
  for (let i = desde; i < linhas.length; i++) {
    const t = talaoSemAcentos(linhas[i]).toLowerCase();
    if (TALAO_NAO_E_TOTAL.some(x => t.includes(x))) continue;
    talaoValoresDaLinha(linhas[i]).forEach(v => {
      if (!maior || v.valor > maior.valor) maior = { valor: v.valor, linha: i };
    });
  }
  return maior ? { valor: maior.valor, peso: 0, linha: maior.linha, confianca: 'baixa' } : null;
}

/* ---------- a loja ----------
   O nome está quase sempre nas primeiras linhas, e o `interpretar.js` já sabe
   ligar cerca de cento e cinquenta nomes de lojas portuguesas e brasileiras à
   categoria certa. Reaproveitar essa lista é o que faz um talão do Continente
   entrar em "mercado" e um da Galp em "transporte", sem perguntar nada. */
function talaoAcharLoja(linhas) {
  const cabeca = linhas.slice(0, 8);

  if (typeof acharCategoria === 'function') {
    for (const linha of cabeca) {
      const r = acharCategoria(linha, 'saida');
      if (r && r.rotulo) {
        return { nome: talaoNomeBonito(r.rotulo), cat: r.cat, certo: true };
      }
    }
    /* Nada na cabeça: procura-se no talão todo, que há cadeias que só se
       nomeiam no rodapé. */
    const r = acharCategoria(linhas.join(' '), 'saida');
    if (r && r.rotulo) return { nome: talaoNomeBonito(r.rotulo), cat: r.cat, certo: true };
  }

  /* Loja desconhecida: fica a primeira linha que pareça um nome e não uma
     morada, um número de contribuinte ou um código. */
  for (const linha of cabeca) {
    const l = linha.trim();
    if (l.length < 4 || l.length > 40) continue;
    if (/^\d/.test(l)) continue;
    if (/\b(nif|nipc|cnpj|cpf|contribuinte|rua|av\.?|avenida|praca|travessa|estrada|telefone|tel\.?)\b/i.test(talaoSemAcentos(l))) continue;
    if ((l.match(/[A-Za-zÀ-ÿ]/g) || []).length < 4) continue;
    return { nome: talaoNomeBonito(l.toLowerCase()), cat: 'outros-s', certo: false };
  }
  return { nome: '', cat: 'outros-s', certo: false };
}

/* Há nomes que valem duas coisas conforme o sítio onde aparecem. A Galp, a
   Repsol, a BP, a Shell e a Petrobras vendem contratos de luz e vendem
   gasóleo — e o `interpretar.js` faz bem em pôr "paguei a Galp Energia" em
   contas, porque numa frase é isso que quer dizer. Num talão não: se o papel
   fala de litros e de abastecimento, aquilo foi combustível.

   É a única correcção deste género, e é feita a partir do que está escrito no
   próprio talão, nunca a adivinhar. */
const TALAO_COMBUSTIVEL = /\b(gasoleo|gasolina|diesel|etanol|alcool|combustivel|abastecimento|litros?|lt\b|posto|bomba|gpl|adblue|sp95|sp98)\b/;

function talaoAfinarCategoria(cat, linhas) {
  if (cat !== 'contas') return cat;
  const t = talaoSemAcentos(linhas.join(' ')).toLowerCase();
  return TALAO_COMBUSTIVEL.test(t) ? 'transporte' : cat;
}

function talaoNomeBonito(t) {
  return String(t).trim().split(/\s+/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

/* ---------- a data ----------
   A do talão manda, e não a de hoje: quem fotografa o talão à noite, ou três
   dias depois, quer o gasto no dia em que aconteceu. Mas só se fizer sentido —
   uma data no futuro ou de há dois anos é ruído do OCR, e nesse caso é melhor
   hoje do que um mês errado. */
function talaoAcharData(texto) {
  const re = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/g;
  const hoje = new Date();
  let m;
  while ((m = re.exec(texto)) !== null) {
    let dia = parseInt(m[1], 10), mes = parseInt(m[2], 10), ano = parseInt(m[3], 10);
    if (ano < 100) ano += 2000;
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
    const d = new Date(ano, mes - 1, dia);
    if (d.getDate() !== dia || d.getMonth() !== mes - 1) continue;
    const dias = (hoje - d) / 86400000;
    if (dias < -1 || dias > 730) continue;
    return d.getFullYear() + '-' +
      String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }
  return null;
}

/* ---------- juntar tudo ---------- */
function talaoInterpretar(texto) {
  const linhas = String(texto || '')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0);

  if (!linhas.length) return { ok: false, motivo: 'vazio' };

  const total = talaoAcharTotal(linhas);
  if (!total) return { ok: false, motivo: 'sem-total', linhas: linhas };

  const loja = talaoAcharLoja(linhas);
  const data = talaoAcharData(linhas.join('\n'));

  /* Um talão bem lido tem linhas a mais e valores a mais. Muito pouco de
     ambos quer dizer fotografia má, e quem chama isto deve desconfiar. */
  const poucoTexto = linhas.length < 4;

  return {
    ok: true,
    valor: total.valor,
    data: data,
    loja: loja.nome,
    categoria: talaoAfinarCategoria(loja.cat, linhas),
    lojaConhecida: loja.certo,
    confianca: (total.confianca === 'alta' && !poucoTexto) ? 'alta' : 'baixa',
    linhas: linhas
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    talaoInterpretar, talaoAcharTotal, talaoAcharLoja, talaoAcharData,
    talaoValoresDaLinha, talaoAfinarCategoria, ocrTemSimd, OCR_MEGAS
  };
}
