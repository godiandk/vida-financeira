/* ============================================================
   Vida Financeira — a IA, quando existir

   Isto está escrito e **desligado**. Fica ligado no dia em que o endereço do
   servidor estiver na linha aqui em baixo — e enquanto não estiver, nada
   nesta aplicação muda: as funções daqui devolvem "não" e o chat segue pelo
   caminho de sempre.

   Escrever isto antes de o servidor existir não é adiantar trabalho por
   adiantar: é o que permite decidir, com o código à frente, se vale a pena.
   O `servidor/README.md` diz o que custa e o que é preciso.

   ---- Onde é que a IA entra ----

   No fim, e só no fim. A ordem no chat é, e continua a ser:

     1. um pedido sobre o que já lá está (corrigir, o saldo, uma queixa)
     2. um movimento para lançar
     3. uma conta para fazer
     4. uma das respostas escritas
     5. — e só aqui — a IA

   Os quatro primeiros são grátis, instantâneos, funcionam sem internet e não
   contam a ninguém o que se perguntou. Trocá-los por uma chamada a um
   servidor seria pagar para perder as três coisas.

   ---- O que sai daqui ----

   A pergunta, as últimas seis trocas da conversa, a língua, e um resumo de
   contas: quanto entra, quanto leva o essencial, quantos meses de reserva, se
   há dívida, e as três categorias onde o dinheiro se está a ir.

   **Nunca a lista de movimentos.** Nem o nome de uma loja, nem uma data, nem
   uma fotografia. "Gasta 38% em mercado" responde à pergunta; "comprou 23,40
   no Continente a 12 de Março" só serve a quem quer saber por onde a pessoa
   anda — e essa é a diferença entre ajudar alguém e contar a vida dele a um
   servidor.
   ============================================================ */

/* ← O endereço do worker. Vazio = desligado.

   Deixou de estar vazio a 3 de Agosto de 2026. Do outro lado está o
   `servidor/worker-gratis.js`, a correr na Cloudflare com o modelo dela — sem
   chave da Anthropic, sem cartão na conta e, por isso, sem factura possível.
   Quando os neurónios do dia acabarem, ele responde 429, isto lê "não", e o
   chat segue pelas regras como seguia ontem. */
const IA_ENDERECO = 'https://vf-ia.wly-vianna.workers.dev';

const IA_ESPERA = 20000;   /* ao fim disto, desiste-se e responde-se sem ela */

function iaLigada() {
  return typeof IA_ENDERECO === 'string' && IA_ENDERECO.indexOf('http') === 0;
}

/* ---- o que sai daqui, e o que não sai ----

   Contas, e nunca o extracto. Vai o que se pode dizer em voz alta numa sala:
   quanto entra, quanto leva o essencial, quantos meses de reserva, se há
   dívida, e em que três categorias é que o dinheiro se está a ir. Não vai —
   nem por engano — a lista de movimentos, nem o nome de uma loja, nem uma
   data, nem uma fotografia de talão.

   A diferença entre "gasta 38% em mercado" e "comprou 23,40 no Continente a
   12 de Março" é a diferença entre ajudar alguém e contar a vida dele a um
   servidor. A primeira responde à pergunta; a segunda só serve para quem quer
   saber por onde a pessoa anda.

   As médias vêm do `dadosAssistente()`, que usa a mediana dos meses fechados:
   um mês com uma avaria não faz a IA achar que a pessoa gasta sempre aquilo. */
function iaResumo() {
  const linhas = [];

  try {
    const d = (typeof dadosAssistente === 'function') ? dadosAssistente() : null;
    if (d) {
      if (d.nMeses) linhas.push('Meses já lançados por inteiro: ' + d.nMeses);
      if (d.R) linhas.push('Entra por mês (mediana): ' + Math.round(d.R));
      if (d.E) linhas.push('Essencial por mês (mediana): ' + Math.round(d.E));
      if (d.folga !== null && d.folga !== undefined) {
        linhas.push('Sobra por mês: ' + Math.round(d.folga)
          + (d.folga <= 0 ? ' (não sobra nada)' : ''));
      }
      if (d.mesesReserva !== null && d.mesesReserva !== undefined) {
        linhas.push('Reserva: ' + d.mesesReserva.toFixed(1) + ' meses de essencial ('
          + Math.round(d.reserva) + ')');
      }
      if (d.temParcelas) linhas.push('Tem prestações a pagar todos os meses.');
      if (d.moeda) linhas.push('Moeda: ' + d.moeda);
    }
  } catch (e) {}

  try {
    if (typeof saldoDeTudo === 'function') {
      const t = saldoDeTudo();
      if (t !== null && t !== undefined) linhas.push('Tem na conta agora: ' + Math.round(t));
    }
  } catch (e) {}

  try {
    if (typeof dividaTotal !== 'undefined' && dividaTotal && dividaTotal.valor > 0) {
      linhas.push('Deve ao todo: ' + Math.round(dividaTotal.valor));
    }
  } catch (e) {}

  /* As três categorias maiores, em percentagem. Categorias — "Mercado",
     "Casa e rendas" — e nunca lojas. É o que permite responder "onde corto?"
     com alguma coisa que sirva, em vez de com um princípio geral. */
  try {
    const r = (typeof calcular === 'function') ? calcular() : null;
    const porCat = r && r.mesVisivel && r.mesVisivel.porCat;
    const total = r && r.mesVisivel && r.mesVisivel.saiu;
    if (porCat && total > 0) {
      const nomes = {};
      if (typeof CATEGORIAS !== 'undefined' && CATEGORIAS.saida) {
        CATEGORIAS.saida.forEach(c => { nomes[c.id] = c.nome; });
      }
      const tres = Object.keys(porCat)
        .filter(c => c !== 'reserva' && porCat[c] > 0)
        .sort((a, b) => porCat[b] - porCat[a])
        .slice(0, 3)
        .map(c => (nomes[c] || c) + ' ' + Math.round(porCat[c] / total * 100) + '%');
      if (tres.length) linhas.push('Onde vai o dinheiro este mês: ' + tres.join(', '));
    }
  } catch (e) {}

  return linhas.join('\n');
}

/* As últimas trocas da conversa, para um "e se eu cortar isso?" querer dizer
   alguma coisa. Seis mensagens: as suficientes para o fio não se perder, e
   poucas o bastante para não ser uma conversa inteira a sair daqui por causa
   de uma pergunta de uma linha. */
function iaHistorico() {
  try {
    const bolhas = document.querySelectorAll('#assist-fio .msg');
    const out = [];
    bolhas.forEach(li => {
      const txt = li.querySelector('.msg-txt');
      if (!txt) return;
      out.push({
        de: li.classList.contains('eu') ? 'eu' : 'ele',
        txt: (txt.innerText || txt.textContent || '').trim().slice(0, 600)
      });
    });
    /* A última é a pergunta que se está a fazer agora, e essa vai à parte. */
    return out.slice(-7, -1);
  } catch (e) { return []; }
}

/* O token da sessão do Firebase. Sem conta iniciada não há IA — e não por
   avareza: é o que impede que o endereço do servidor, que é público, seja
   usado por quem nunca abriu esta aplicação. */
function iaToken() {
  try {
    if (typeof firebase === 'undefined' || !window.auth) return Promise.resolve(null);
    const u = auth.currentUser;
    return u ? u.getIdToken() : Promise.resolve(null);
  } catch (e) { return Promise.resolve(null); }
}

/* Devolve o texto da resposta, ou `null` — e `null` quer dizer "segue sem
   mim". Nunca lança: uma falha da IA não pode partir o chat. */
function iaPerguntar(mensagem) {
  if (!iaLigada()) return Promise.resolve(null);

  return iaToken().then(token => {
    if (!token) return null;

    const desistir = new Promise(ok => setTimeout(() => ok(null), IA_ESPERA));
    const chamada = fetch(IA_ENDERECO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        mensagem: String(mensagem || '').slice(0, 2000),
        resumo: iaResumo(),
        historico: iaHistorico(),
        /* A língua da conversa, decidida pelo `assistente.js` a partir do que
           foi escrito. O modelo costuma acertar sozinho, mas costuma não é
           sempre — e receber a resposta na língua errada, sobre dinheiro, é
           a aplicação a dizer a alguém que ele ali é estrangeiro. */
        lingua: (typeof L === 'function') ? L() : (typeof idioma === 'function' ? idioma() : '')
      })
    }).then(r => {
      /* 422 é a revisão do servidor a recusar o que o modelo escreveu. Não é
         avaria: é o sistema a funcionar. Devolve-se `null` como em qualquer
         outro "não", e o chat responde pela resposta escrita à mão — que para
         estes casos é melhor do que uma resposta gerada que não passou. */
      if (!r.ok) return null;
      return r.json().then(d => (d && d.texto) ? d.texto : null);
    }).catch(() => null);

    return Promise.race([chamada, desistir]);
  }).catch(() => null);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { iaLigada, iaResumo, IA_ENDERECO };
}
