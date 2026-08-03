/* ============================================================
   Vida Financeira — o mesmo servidor, mas sem factura

   Este ficheiro faz exactamente o que o `worker.js` faz ao lado, com uma
   diferença: em vez de mandar a pergunta para a Anthropic, que cobra por
   pergunta e precisa de um cartão, manda-a para o modelo que corre dentro da
   própria Cloudflare — o Workers AI.

   Porque é que isso interessa: a Cloudflare dá **10.000 neurónios por dia** de
   graça a qualquer conta, e não pede cartão nenhum para os usar. Um neurónio é
   a unidade com que ela conta o trabalho dos modelos; com um modelo pequeno,
   10.000 dão à volta de mil e trezentas respostas por dia. Com o travão de 20
   por pessoa, são umas sessenta e cinco pessoas por dia a usarem tudo o que
   têm direito.

   E quando acabam? **Não vem factura nenhuma.** Sem cartão na conta, a
   Cloudflare não cobra: recusa. E uma recusa daqui não parte nada — este
   worker responde 429, o `ia.js` lê isso como "não", e o chat segue pelas
   regras de sempre, que continuam a lançar, a calcular e a corrigir de graça.
   A pessoa nota, no máximo, que a resposta veio mais curta.

   É esta a diferença que faz isto poder ser grátis para sempre: a IA nunca foi
   o motor desta aplicação. É um extra que, quando falta, não faz falta.

   ---- porque não o Gemini, que também é grátis ----

   O Google dá um plano grátis maior do que este e também sem cartão. Mas, no
   plano grátis, as perguntas e as respostas podem ser usadas para melhorar os
   produtos deles. A página inicial desta aplicação promete que o que se lá
   escreve não vai para lado nenhum, e uma promessa dessas não se quebra para
   poupar uns cêntimos. Por isso: não.

   COMO SE PÕE ISTO A ANDAR: ver o README ao lado, secção "a via grátis".
   ============================================================ */

const POR_DIA = 20;

/* O modelo. Pequeno de propósito: é o que faz os 10.000 neurónios diários
   chegarem para muita gente em vez de para meia dúzia. Se um dia as respostas
   parecerem curtas de mais, troca-se esta linha por um modelo maior — a lista
   está no painel da Cloudflare, em AI → Models — e o número de respostas por
   dia desce na mesma proporção. */
const MODELO = '@cf/meta/llama-3.1-8b-instruct';

/* O mesmo texto do outro worker, palavra por palavra. O que a IA não pode
   fazer não muda por ser outra a IA. */
const INSTRUCOES = `És o assistente da Vida Financeira, uma aplicação de contas
para pessoas de Portugal e do Brasil com dinheiro contado.

Regras que não se quebram:
- Nunca recomendes um produto financeiro concreto: nenhum banco, nenhum
  cartão, nenhum crédito, nenhum investimento, nenhuma criptomoeda.
- Nunca digas a alguém que a culpa é dele. Quem não chega ao fim do mês
  raramente lá chegou por indisciplina.
- Se não souberes, diz que não sabes.
- Responde na língua em que te escrevem: português de Portugal, português do
  Brasil, espanhol ou inglês.
- Sê curto. Três parágrafos no máximo, frases de gente.
- Fala de números só se os tiveres. Não inventes valores.`;

const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async fetch(pedido, env) {
    const origem = pedido.headers.get('Origin') || '';
    const permitida = (env.ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cabecalhos = {
      'Access-Control-Allow-Origin': permitida.indexOf(origem) !== -1 ? origem : permitida[0] || '',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    };
    if (pedido.method === 'OPTIONS') return new Response(null, { headers: cabecalhos });
    if (pedido.method !== 'POST') return responder(405, { erro: 'metodo' }, cabecalhos);

    const auth = pedido.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return responder(401, { erro: 'sem-conta' }, cabecalhos);

    let uid;
    try {
      uid = await uidDoToken(token, env.FIREBASE_PROJECTO);
    } catch (e) {
      return responder(401, { erro: 'conta-invalida' }, cabecalhos);
    }

    if (env.TRAVAO) {
      const { success } = await env.TRAVAO.limit({ key: uid });
      if (!success) return responder(429, { erro: 'demasiadas', porDia: POR_DIA }, cabecalhos);
    }

    let corpo;
    try { corpo = await pedido.json(); } catch (e) { return responder(400, { erro: 'corpo' }, cabecalhos); }

    const mensagem = String(corpo.mensagem || '').slice(0, 2000);
    if (!mensagem.trim()) return responder(400, { erro: 'vazio' }, cabecalhos);
    const resumo = String(corpo.resumo || '').slice(0, 800);

    /* Aqui é que está a diferença toda: não há `fetch` para fora, não há chave
       de ninguém, e não há conta a pagar. O modelo corre na mesma máquina que
       está a atender este pedido. */
    let saida;
    try {
      saida = await env.IA.run(MODELO, {
        max_tokens: 700,
        messages: [
          { role: 'system', content: INSTRUCOES + (resumo ? '\n\nOs números desta pessoa:\n' + resumo : '') },
          { role: 'user', content: mensagem }
        ]
      });
    } catch (e) {
      /* Aqui cai-se quando os 10.000 neurónios do dia acabaram — e é para aqui
         cair. Devolve-se "não dá", o `ia.js` desiste sem se queixar, e o chat
         responde pelas regras. Ninguém fica sem aplicação por causa disto. */
      return responder(429, { erro: 'sem-quota' }, cabecalhos);
    }

    const texto = String((saida && (saida.response || saida.result)) || '').trim();
    if (!texto) return responder(502, { erro: 'servico' }, cabecalhos);

    return responder(200, { texto: texto }, cabecalhos);
  }
};

function responder(estado, corpo, cabecalhos) {
  return new Response(JSON.stringify(corpo), { status: estado, headers: cabecalhos });
}

/* Igual ao do outro worker: verifica-se a assinatura do Firebase com as chaves
   públicas da Google. Um `Authorization` que não é verificado não é uma porta
   fechada — é uma porta com um autocolante a dizer "fechada". */
async function uidDoToken(token, projecto) {
  const [cabeca64, corpo64, assinatura64] = token.split('.');
  if (!cabeca64 || !corpo64 || !assinatura64) throw new Error('formato');

  const cabeca = JSON.parse(b64(cabeca64));
  const corpo = JSON.parse(b64(corpo64));

  const agora = Math.floor(Date.now() / 1000);
  if (corpo.exp <= agora) throw new Error('expirado');
  if (corpo.aud !== projecto) throw new Error('projecto');
  if (corpo.iss !== 'https://securetoken.google.com/' + projecto) throw new Error('emissor');
  if (!corpo.sub) throw new Error('sem-sub');

  const chaves = await (await fetch(JWKS)).json();
  const jwk = (chaves.keys || []).find(k => k.kid === cabeca.kid);
  if (!jwk) throw new Error('chave');

  const chave = await crypto.subtle.importKey('jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);

  const assinada = new TextEncoder().encode(cabeca64 + '.' + corpo64);
  const bytes = Uint8Array.from(b64(assinatura64), c => c.charCodeAt(0));

  const bom = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, bytes, assinada);
  if (!bom) throw new Error('assinatura');

  return corpo.sub;
}

function b64(s) {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}
