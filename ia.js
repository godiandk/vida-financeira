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

   A pergunta, e um resumo de três linhas: quanto entra, quanto sai, se há
   dívida. **Nunca a lista de movimentos.** Quem comprou o quê e onde é do
   foro de quem comprou, e não precisa de sair do telemóvel para alguém
   receber um conselho sobre o fim do mês.
   ============================================================ */

/* ← O endereço do worker. Vazio = desligado. */
const IA_ENDERECO = '';

const IA_ESPERA = 20000;   /* ao fim disto, desiste-se e responde-se sem ela */

function iaLigada() {
  return typeof IA_ENDERECO === 'string' && IA_ENDERECO.indexOf('http') === 0;
}

/* Três linhas, e não um extracto. O que aqui não estiver, a IA não sabe — e
   é assim que se quer. */
function iaResumo() {
  if (typeof calcular !== 'function') return '';
  try {
    const r = calcular();
    const v = r.mesVisivel || {};
    const linhas = [];
    if (v.entrou) linhas.push('Entra por mês: ' + Math.round(v.entrou));
    if (v.saiu) linhas.push('Sai por mês: ' + Math.round(v.saiu));
    if (typeof saldoDeTudo === 'function') {
      const t = saldoDeTudo();
      if (t !== null) linhas.push('Tem agora: ' + Math.round(t));
    }
    if (typeof dividaTotal !== 'undefined' && dividaTotal && dividaTotal.valor > 0) {
      linhas.push('Deve: ' + Math.round(dividaTotal.valor));
    }
    if (typeof moeda !== 'undefined') linhas.push('Moeda: ' + moeda);
    return linhas.join('\n');
  } catch (e) { return ''; }
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
      body: JSON.stringify({ mensagem: String(mensagem || '').slice(0, 2000), resumo: iaResumo() })
    }).then(r => {
      if (!r.ok) return null;
      return r.json().then(d => (d && d.texto) ? d.texto : null);
    }).catch(() => null);

    return Promise.race([chamada, desistir]);
  }).catch(() => null);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { iaLigada, iaResumo, IA_ENDERECO };
}
