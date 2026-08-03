/* ============================================================
   Vida Financeira — o cartão que se manda para o grupo

   Ninguém manda "instala esta aplicação" à família. Manda-se "olha o que eu
   descobri". Por isso o que se parte daqui não é um anúncio: é um número que
   a pessoa descobriu sobre si própria, desenhado numa imagem que se envia com
   um toque.

   Três regras, e a primeira é a que importa:

   1. Nada sai daqui sem a pessoa ver primeiro. A imagem é desenhada, mostrada
      em tamanho grande, e só depois é que há um botão para partilhar. Uma
      aplicação de dinheiro que publica sozinha perde a confiança de toda a
      gente, e com razão.

   2. O que entra no cartão é escolhido para não expor ninguém. O salário
      nunca aparece — quanto se ganha é a coisa mais privada que aqui existe,
      e num grupo de WhatsApp não se desdiz. O que aparece são números
      derivados: o que dá para adiar, o que já se juntou, o que uma prestação
      custa a mais.

   3. Nenhum cartão diz nada que não seja verdade sobre esta pessoa. Se não
      houver dados para o preencher, o cartão não existe — em vez de se
      inventar um número bonito.
   ============================================================ */

const CARTAO_L = 1080;
const CARTAO_A = 1350;   /* retrato 4:5 — o que o WhatsApp e as histórias não cortam */

const COR = {
  fundo: '#0d1512',
  fundo2: '#131e19',
  ouro: '#d9b26e',
  ouroClaro: '#e8cf9e',
  creme: '#f2f6f3',
  cremeFraco: '#a9b8b0',
  verde: '#3ecf8e'
};

/* Quais os cartões que os números desta pessoa dão para preencher. Um cartão
   sem dados não entra na lista — não se inventa. */
/* Num casal, o dinheiro é dos dois — e o cartão que se manda para o grupo da
   família é lido pelos dois. "Descobri que gasto" e "a minha reserva" ditos
   sobre dinheiro que é de duas pessoas não são só imprecisos: são a aplicação
   a dar razão a um contra o outro, num assunto em que as casas discutem. */
function juntos() {
  return typeof temParceiro === 'function' && temParceiro();
}

function cartoesPossiveis() {
  if (typeof calcular !== 'function') return [];
  const r = calcular();
  const lista = [];
  const nos = juntos();

  /* --- o que dava para adiar ---
     O mais forte, e o que não envergonha ninguém: não é "gastas mal", é
     "havia aqui um número que não se via". */
  const mesesComp = (r.completos || []).slice(-3);
  if (mesesComp.length) {
    let soma = 0;
    mesesComp.forEach(k => { soma += r.meses[k].naoEssenciais; });
    const media = soma / mesesComp.length;
    if (media > 0) {
      lista.push({
        id: 'adiar',
        etiqueta: 'O que dava para adiar',
        topo: nos ? 'Descobrimos que gastamos' : 'Descobri que gasto',
        numero: dinheiro(Math.round(media * 100) / 100),
        baixo: 'por mês em coisas que davam para adiar.',
        rodape: mesesComp.length === 1 ? 'Média do último mês' : 'Média dos últimos ' + mesesComp.length + ' meses'
      });
    }
  }

  /* --- a reserva --- */
  if (r.reserva > 0) {
    const meses = r.mesesDeReserva;
    lista.push({
      id: 'reserva',
      etiqueta: nos ? 'A nossa reserva' : 'A minha reserva',
      topo: nos ? 'Já temos' : 'Já tenho',
      numero: dinheiro(r.reserva),
      /* "Comecei do zero" era dito a quem tinha cem euros guardados: uma
         frase sobre um passado que a aplicação não conhece. O que ela sabe é
         que ainda não chega a meio mês de essenciais — e isso diz-se sem
         inventar história nenhuma a ninguém. */
      baixo: (meses && meses >= 0.5)
        ? 'de lado — dá para ' + num(meses) + ' meses de essenciais.'
        : 'de lado. É por aqui que se começa.',
      rodape: 'Um mês de cada vez'
    });
  }

  /* --- o que uma prestação custa a mais ---
     Este é o que ensina alguma coisa a quem o recebe, e por isso é o que
     viaja: quem o lê faz a conta da sua própria prestação. */
  const grupos = {};
  movimentos.forEach(m => {
    if (!m.parc || m.tipo !== 'saida') return;
    grupos[m.parc.g] = m.parc;
  });
  const g = Object.keys(grupos).map(k => grupos[k])
    .sort((a, b) => (b.tot - b.valor * b.de) - (a.tot - a.valor * a.de))[0];
  if (g && g.tot > 0) {
    const porPrestacao = g.tot / g.de;
    lista.push({
      id: 'parcelas',
      etiqueta: 'O preço de parcelar',
      topo: g.de + ' prestações de ' + dinheiro(Math.round(porPrestacao * 100) / 100) + ' são',
      numero: dinheiro(g.tot),
      baixo: 'no fim. Parece pequeno todos os meses, e não é.',
      rodape: 'Faça a conta à sua'
    });
  }

  /* --- quanto sobra por dia --- */
  if (r.porDia && r.porDia.valor > 0) {
    lista.push({
      id: 'pordia',
      etiqueta: 'Até ao fim do mês',
      topo: 'Faltam ' + r.porDia.dias + (r.porDia.dias === 1 ? ' dia' : ' dias') +
            (nos ? ' e temos' : ' e tenho'),
      numero: dinheiro(r.porDia.valor),
      baixo: 'por dia. Saber isto muda o que se compra hoje.',
      rodape: 'A aplicação faz esta conta sozinha'
    });
  }

  return lista;
}

/* ---------- desenhar ---------- */
function textoQuebrado(ctx, texto, largura) {
  const palavras = String(texto).split(' ');
  const linhas = [];
  let linha = '';
  palavras.forEach(p => {
    const tentativa = linha ? linha + ' ' + p : p;
    if (ctx.measureText(tentativa).width > largura && linha) { linhas.push(linha); linha = p; }
    else linha = tentativa;
  });
  if (linha) linhas.push(linha);
  return linhas;
}

/* O número é a peça grande do cartão, e há moedas que o fazem crescer — "1 234,56 Kz"
   não cabe onde cabe "45 €". Em vez de o deixar sair fora, encolhe-se até caber. */
function ajustarAoLargo(ctx, texto, largura, tamanhoMax, familia) {
  let t = tamanhoMax;
  do {
    ctx.font = '700 ' + t + 'px ' + familia;
    if (ctx.measureText(texto).width <= largura) break;
    t -= 4;
  } while (t > 40);
  return t;
}

function desenharCartao(cartao) {
  const c = document.createElement('canvas');
  c.width = CARTAO_L;
  c.height = CARTAO_A;
  const x = c.getContext('2d');

  const serif = '"Playfair Display", Georgia, serif';
  const sans = '"Manrope", system-ui, sans-serif';

  /* fundo */
  const g = x.createLinearGradient(0, 0, CARTAO_L, CARTAO_A);
  g.addColorStop(0, COR.fundo2);
  g.addColorStop(1, COR.fundo);
  x.fillStyle = g;
  x.fillRect(0, 0, CARTAO_L, CARTAO_A);

  /* um brilho dourado no canto, como no site */
  const brilho = x.createRadialGradient(CARTAO_L * 0.85, 0, 0, CARTAO_L * 0.85, 0, CARTAO_L * 0.9);
  brilho.addColorStop(0, 'rgba(217,178,110,0.18)');
  brilho.addColorStop(1, 'rgba(217,178,110,0)');
  x.fillStyle = brilho;
  x.fillRect(0, 0, CARTAO_L, CARTAO_A);

  /* moldura */
  x.strokeStyle = 'rgba(217,178,110,0.28)';
  x.lineWidth = 3;
  x.strokeRect(40, 40, CARTAO_L - 80, CARTAO_A - 80);

  const margem = 110;
  const larguraUtil = CARTAO_L - margem * 2;

  /* etiqueta */
  x.fillStyle = COR.ouro;
  x.font = '800 30px ' + sans;
  x.letterSpacing = '6px';
  x.fillText(String(cartao.etiqueta).toUpperCase(), margem, 210);
  x.letterSpacing = '0px';

  /* O bloco do meio é centrado à mão entre a etiqueta e o rodapé. Desenhado a
     partir de uma altura fixa, um cartão de duas linhas deixava um terço da
     imagem vazio e um de quatro linhas encostava ao rodapé — e a diferença
     entre os dois é só o comprimento de uma frase. Mede-se primeiro, e só
     depois se escolhe onde começar. */
  x.font = '500 44px ' + sans;
  const linhasTopo = textoQuebrado(x, cartao.topo, larguraUtil);
  const tam = ajustarAoLargo(x, cartao.numero, larguraUtil, 168, serif);
  x.font = '500 46px ' + sans;
  const linhasBaixo = textoQuebrado(x, cartao.baixo, larguraUtil);

  /* A altura mede-se da primeira linha de base à última, que é a distância
     que o desenho a seguir vai mesmo percorrer — somar tamanhos de letra dava
     um número que não correspondia a nada, e o bloco ficava sempre em cima. */
  const ATE_NUMERO = 130, DEPOIS_NUMERO = 90;
  const entreBases = linhasTopo.length * 60 + ATE_NUMERO + DEPOIS_NUMERO +
                     (linhasBaixo.length - 1) * 64;
  const acima = 44, abaixo = 16;   // o que sobe acima e desce abaixo das bases
  const alturaVisivel = acima + entreBases + abaixo;

  const topoZona = 300, fundoZona = CARTAO_A - 300;
  let y = topoZona + Math.max(0, (fundoZona - topoZona - alturaVisivel) / 2) + acima;

  /* linha de cima */
  x.fillStyle = COR.cremeFraco;
  x.font = '500 44px ' + sans;
  linhasTopo.forEach(l => { x.fillText(l, margem, y); y += 60; });

  /* o número */
  x.fillStyle = COR.ouroClaro;
  x.font = '700 ' + tam + 'px ' + serif;
  y += ATE_NUMERO;
  x.fillText(cartao.numero, margem, y);

  /* linha de baixo */
  x.fillStyle = COR.creme;
  x.font = '500 46px ' + sans;
  y += DEPOIS_NUMERO;
  linhasBaixo.forEach(l => { x.fillText(l, margem, y); y += 64; });

  /* rodapé */
  x.fillStyle = 'rgba(217,178,110,0.22)';
  x.fillRect(margem, CARTAO_A - 260, larguraUtil, 2);

  x.fillStyle = COR.cremeFraco;
  x.font = '500 32px ' + sans;
  x.fillText(cartao.rodape, margem, CARTAO_A - 200);

  x.fillStyle = COR.ouroClaro;
  x.font = '700 40px ' + serif;
  x.letterSpacing = '4px';
  x.fillText('VIDA FINANCEIRA', margem, CARTAO_A - 130);
  x.letterSpacing = '0px';

  x.fillStyle = COR.cremeFraco;
  x.font = '500 30px ' + sans;
  x.fillText('godiandk.github.io/vida-financeira', margem, CARTAO_A - 85);

  return c;
}

/* JPEG e não PNG. O mesmo cartão sai com um megabyte em PNG e cerca de cem
   kilobytes em JPEG, sem diferença que se veja num telemóvel — e quem vai
   partilhar isto paga os dados que gasta. Não há transparência a perder. */
function canvasParaBlob(c) {
  return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.92));
}

/* ---------- o painel ---------- */
let cartaoActual = null;

async function abrirPartilha() {
  const painel = document.getElementById('partilha');
  const zona = document.getElementById('partilha-zona');
  const abas = document.getElementById('partilha-abas');
  const vazio = document.getElementById('partilha-vazio');
  if (!painel) return;

  const lista = cartoesPossiveis();
  painel.hidden = false;
  abas.innerHTML = '';
  zona.innerHTML = '';

  if (!lista.length) {
    vazio.hidden = false;
    zona.hidden = true;
    abas.hidden = true;
    return;
  }
  vazio.hidden = true;
  zona.hidden = false;
  abas.hidden = false;

  /* As fontes do site são descarregadas: desenhar antes de estarem prontas
     dava um cartão em Times New Roman. */
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

  const mostrar = (cartao) => {
    cartaoActual = cartao;
    const c = desenharCartao(cartao);
    zona.innerHTML = '';
    c.className = 'cartao-vista';
    zona.appendChild(c);
    Array.prototype.forEach.call(abas.children, b => {
      b.setAttribute('aria-pressed', String(b.dataset.id === cartao.id));
    });
  };

  lista.forEach(cartao => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'partilha-aba';
    b.dataset.id = cartao.id;
    b.textContent = cartao.etiqueta;
    b.addEventListener('click', () => mostrar(cartao));
    abas.appendChild(b);
  });

  mostrar(lista[0]);
}

function fecharPartilha() {
  const painel = document.getElementById('partilha');
  if (painel) painel.hidden = true;
  cartaoActual = null;
}

async function enviarCartao() {
  if (!cartaoActual) return;
  const c = desenharCartao(cartaoActual);
  const blob = await canvasParaBlob(c);
  if (!blob) { mostrarAviso('Não foi possível criar a imagem.', 'erro'); return; }

  const ficheiro = new File([blob], 'vida-financeira.jpg', { type: 'image/jpeg' });

  /* A partilha do sistema é a que abre o WhatsApp com a imagem já lá dentro.
     Onde não existir — computadores, sobretudo — descarrega-se e a pessoa
     anexa à mão, que é o que ela ia fazer de qualquer maneira. */
  if (navigator.canShare && navigator.canShare({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro] });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;   // desistiu, e isso não é um erro
    }
  }
  guardarCartao(blob);
}

function guardarCartao(blobJaFeito) {
  const seguir = (blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vida-financeira.jpg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    mostrarAviso('Imagem guardada. Já a pode enviar.', 'ok');
  };
  if (blobJaFeito) { seguir(blobJaFeito); return; }
  if (!cartaoActual) return;
  canvasParaBlob(desenharCartao(cartaoActual)).then(b => { if (b) seguir(b); });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cartoesPossiveis, desenharCartao };
}
