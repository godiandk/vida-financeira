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
   Para saber se ficou bem posto, abra o endereço do worker no navegador — um
   GET responde com o que está ligado e o que falta, e não diz mais nada a
   ninguém.
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
    const permitida = origensDe(env);
    const origem = pedido.headers.get('Origin') || '';
    const cabecalhos = cabecalhosDe(origem, permitida);

    if (pedido.method === 'OPTIONS') return new Response(null, { headers: cabecalhos });

    /* Abrir o endereço no navegador diz o que está ligado. É a única maneira
       de quem publicou isto perceber, sem ler código, que se esqueceu de uma
       ligação — e não conta nada que não se soubesse já. */
    if (pedido.method === 'GET') {
      return responder(200, {
        servico: 'vida-financeira-ia',
        modelo: MODELO,
        ia: !!env.IA,
        projecto: !!env.FIREBASE_PROJECTO,
        origens: permitida.length,
        travao: qualTravao(env),
        porDia: POR_DIA
      }, cabecalhos);
    }

    if (pedido.method !== 'POST') return responder(405, { erro: 'metodo' }, cabecalhos);

    /* Um pedido de um sítio que não é o nosso pára aqui. O navegador já o
       travava por causa do CORS, mas quem chama isto de um terminal não tem
       navegador nenhum a travá-lo. */
    if (permitida.length && origem && permitida.indexOf(origem) === -1) {
      return responder(403, { erro: 'origem' }, cabecalhos);
    }

    if (!env.IA) return responder(503, { erro: 'sem-modelo' }, cabecalhos);
    if (!env.FIREBASE_PROJECTO) return responder(503, { erro: 'sem-projecto' }, cabecalhos);

    const auth = pedido.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return responder(401, { erro: 'sem-conta' }, cabecalhos);

    let uid;
    try {
      uid = await uidDoToken(token, env.FIREBASE_PROJECTO);
    } catch (e) {
      return responder(401, { erro: 'conta-invalida' }, cabecalhos);
    }

    if (!await deixarPassar(env, uid)) {
      return responder(429, { erro: 'demasiadas', porDia: POR_DIA }, cabecalhos);
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

function origensDe(env) {
  return String(env.ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
}

function cabecalhosDe(origem, permitida) {
  return {
    'Access-Control-Allow-Origin': permitida.indexOf(origem) !== -1 ? origem : (permitida[0] || ''),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function responder(estado, corpo, cabecalhos) {
  return new Response(JSON.stringify(corpo), { status: estado, headers: cabecalhos });
}

/* ------------------------------------------------------------
   O travão

   Havia aqui uma coisa que não podia funcionar, e convém dizê-lo por escrito
   para não voltar a ser tentada: o travão de fábrica dos Workers — aquele que
   se chama com `.limit()` — só conta em janelas de 10 ou 60 segundos, e não se
   configura pelo painel. Nenhuma das duas coisas serve a quem quer 20 por dia
   e publica o worker copiando um ficheiro para o navegador.

   O que serve é um KV: uma gaveta de chave-valor que se cria no painel em dois
   cliques. Guarda-se um número por pessoa e por dia, e apaga-se sozinho ao fim
   de dois dias.

   Duas honestidades sobre isto:

   - o KV demora uns segundos a espalhar-se pelo mundo, por isso alguém com
     pressa e dois telemóveis consegue passar dos 20 por umas quantas. Não
     importa: sem cartão na conta, o pior que acontece é acabarem os neurónios
     mais cedo, e isso não custa dinheiro a ninguém;
   - se o KV falhar ou esgotar as escritas do dia, **deixa-se passar**. Um
     contador avariado não pode ser motivo para a aplicação deixar de
     responder — o tecto verdadeiro continua a ser o dos neurónios.

   Sem KV ligado o worker corre na mesma, e o `estado` diz "nenhum" para que
   isso não passe despercebido a quem o publicou.
   ------------------------------------------------------------ */
function qualTravao(env) {
  const t = env.TRAVAO;
  if (!t) return 'nenhum';
  if (typeof t.limit === 'function') return 'ratelimit';
  if (typeof t.get === 'function' && typeof t.put === 'function') return 'kv';
  return 'nenhum';
}

async function deixarPassar(env, uid) {
  const tipo = qualTravao(env);

  /* Quem publicar isto com o wrangler pode ligar o travão de fábrica; usa-se
     esse, que é mais rigoroso, quando lá estiver. */
  if (tipo === 'ratelimit') {
    try {
      const { success } = await env.TRAVAO.limit({ key: uid });
      return !!success;
    } catch (e) { return true; }
  }

  if (tipo === 'kv') {
    const chave = 'p:' + uid + ':' + new Date().toISOString().slice(0, 10);
    let quantas = 0;
    try {
      quantas = parseInt(await env.TRAVAO.get(chave), 10) || 0;
    } catch (e) {
      return true;
    }
    if (quantas >= POR_DIA) return false;
    try {
      await env.TRAVAO.put(chave, String(quantas + 1), { expirationTtl: 172800 });
    } catch (e) { /* escritas esgotadas: conta-se menos, responde-se na mesma */ }
    return true;
  }

  return true;
}

/* ------------------------------------------------------------
   Confirmar que o token é mesmo do Firebase

   Igual ao do outro worker: verifica-se a assinatura com as chaves públicas da
   Google. Um `Authorization` que não é verificado não é uma porta fechada — é
   uma porta com um autocolante a dizer "fechada".
   ------------------------------------------------------------ */
let chavesGuardadas = null;
let chavesAte = 0;

async function chavesDaGoogle() {
  const agora = Date.now();
  if (chavesGuardadas && agora < chavesAte) return chavesGuardadas;

  const resposta = await fetch(JWKS);
  if (!resposta.ok) throw new Error('jwks');
  const dados = await resposta.json();

  /* A Google diz quanto tempo é que estas chaves valem. Respeitá-lo poupa um
     pedido a cada pergunta e continua a rodar as chaves quando ela as roda. */
  const controlo = resposta.headers.get('cache-control') || '';
  const encontrado = controlo.match(/max-age=(\d+)/);
  const segundos = encontrado ? Math.min(parseInt(encontrado[1], 10), 86400) : 3600;

  chavesGuardadas = dados;
  chavesAte = agora + segundos * 1000;
  return dados;
}

async function uidDoToken(token, projecto) {
  const [cabeca64, corpo64, assinatura64] = token.split('.');
  if (!cabeca64 || !corpo64 || !assinatura64) throw new Error('formato');

  const cabeca = JSON.parse(b64(cabeca64));
  const corpo = JSON.parse(b64(corpo64));

  if (cabeca.alg !== 'RS256') throw new Error('algoritmo');

  const agora = Math.floor(Date.now() / 1000);
  if (!(corpo.exp > agora)) throw new Error('expirado');
  if (corpo.aud !== projecto) throw new Error('projecto');
  if (corpo.iss !== 'https://securetoken.google.com/' + projecto) throw new Error('emissor');
  if (!corpo.sub) throw new Error('sem-sub');

  const chaves = await chavesDaGoogle();
  const jwk = (chaves.keys || []).find(k => k.kid === cabeca.kid);
  if (!jwk) throw new Error('chave');

  const chave = await crypto.subtle.importKey('jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
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
