/* ============================================================
   Vida Financeira — o mesmo servidor, mas sem factura

   Este ficheiro faz exactamente o que o `worker.js` faz ao lado, com uma
   diferença: em vez de mandar a pergunta para a Anthropic, que cobra por
   pergunta e precisa de um cartão, manda-a para o modelo que corre dentro da
   própria Cloudflare — o Workers AI.

   Porque é que isso interessa: a Cloudflare dá **10.000 neurónios por dia** de
   graça a qualquer conta, e não pede cartão nenhum para os usar. Um neurónio é
   a unidade com que ela conta o trabalho dos modelos.

   E quando acabam? **Não vem factura nenhuma.** Sem cartão na conta, a
   Cloudflare não cobra: recusa. E uma recusa daqui não parte nada — este
   worker responde 429, o `ia.js` lê isso como "não", e o chat segue pelas
   regras de sempre, que continuam a lançar, a calcular e a corrigir de graça.

   É esta a diferença que faz isto poder ser grátis para sempre: a IA nunca foi
   o motor desta aplicação. É um extra que, quando falta, não faz falta.

   ---- Três coisas entre a pergunta e a resposta ----

   Um modelo à solta a falar de dinheiro com quem tem pouco não é só desagradá-
   vel: é perigoso. Entre a pergunta e o que sai daqui há três peças, e nenhuma
   delas é decoração.

   1. **O modelo grande primeiro.** Um modelo pequeno erra em português e
      inventa números. Pede-se ao grande, e só se ele falhar — quota, avaria —
      é que se cai no pequeno. Melhor curto do que errado, melhor errado por
      falta de jeito do que mudo.

   2. **A conversa, e não a frase solta.** Sem as mensagens anteriores, um
      "e se eu cortar isso?" não quer dizer nada. Vão as últimas trocas, e mais
      nada.

   3. **A revisão do que sai.** O que o modelo escreve é lido antes de sair:
      promessas de retorno, marcas de banco ou de cripto a serem recomendadas,
      culpa atirada à pessoa, pedidos de senha. Apanhado, pede-se outra vez; à
      segunda, cala-se e o chat responde pelas regras escritas — que são boas.

   COMO SE PÕE ISTO A ANDAR: ver o README ao lado, secção "a via grátis".
   Para saber se ficou bem posto, abra o endereço do worker no navegador — um
   GET responde com o que está ligado e o que falta, e não diz mais nada a
   ninguém.
   ============================================================ */

const POR_DIA = 20;

/* Os modelos, por ordem de preferência.

   O grande gasta à volta de 70 neurónios por resposta — uns 140 por dia nos
   10.000 grátis. O pequeno gasta uns 12, o que dá umas 800. Parece uma troca
   má e não é: 140 respostas por dia é muito mais do que esta aplicação tem de
   procura, e no dia em que tiver, o pequeno entra sozinho e ninguém fica sem
   resposta. Trocar qualidade por um tecto que ninguém está a bater seria pagar
   por nada. */
const MODELOS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast'
];

/* ------------------------------------------------------------
   O que a IA é, e o que não pode ser

   Isto não é decoração: é a única coisa entre a aplicação e um modelo a
   recomendar produtos financeiros a alguém que está aflito. E há uma regra
   aqui que não é óbvia — **não se faz passar pelo fundador**. O chat
   apresenta-se com o nome e a história dele, e nas respostas que ele escreveu
   isso é verdade. Numa resposta gerada por um modelo, seria pôr palavras na
   boca de uma pessoa real, e sobre dinheiro. Não se faz.
   ------------------------------------------------------------ */
const INSTRUCOES = `És a resposta automática de uma aplicação de contas
domésticas chamada Vida Financeira, usada por pessoas de Portugal e do Brasil
com o dinheiro contado, muitas delas emigradas.

QUEM ÉS
- Não és uma pessoa. Se te perguntarem, diz que és uma resposta automática.
- Não tens nome, não tens história, não passaste por nada. Nunca escrevas
  "eu passei por isto", "quando eu estava endividado" ou parecido.
- Não te faças passar pelo fundador da aplicação nem por nenhum consultor.

O QUE NUNCA FAZES
- Nunca recomendas um produto financeiro concreto: nenhum banco, nenhuma
  corretora, nenhum cartão, nenhum crédito, nenhum fundo, nenhuma criptomoeda.
  Podes explicar como uma coisa funciona; não podes dizer para a comprar.
- Nunca prometes retorno, lucro ou rendimento. Nem "costuma render", nem
  "é seguro", nem "vais ganhar". O futuro não se promete a quem não pode
  perder.
- Nunca dizes que a culpa é da pessoa. Quem não chega ao fim do mês raramente
  lá chegou por indisciplina, e dizer-lho é falso e cruel.
- Nunca pedes dados: nem palavra-passe, nem número de cartão, nem IBAN, nem
  documento. A aplicação não liga a banco nenhum e nunca pedirá isso.
- Nunca inventas números. Só usas os que te forem dados aqui em baixo. Se não
  tiveres um número, dizes que ainda não sabes e dizes o que a pessoa tem de
  lançar para o saberes.

COMO RESPONDES
- Na língua da mensagem: português de Portugal, português do Brasil, espanhol
  ou inglês. Se te disserem qual é, é essa.
- Curto. Três parágrafos curtos no máximo, à volta de cem palavras. Quem lê
  isto está no telemóvel, muitas vezes na fila do supermercado.
- Palavras de gente. Nada de "alocação", "liquidez", "aporte", "portfólio".
- Concreto: um passo que se possa dar esta semana vale mais do que um
  princípio.
- Se a pergunta for de saúde, de lei, de impostos ou de imigração, diz o que
  souberes de dinheiro e encaminha para ajuda pública gratuita, sem inventar.
- Se não souberes, diz que não sabes. É uma resposta melhor do que uma
  invenção certeira.

SOBRE DÍVIDA, quando vier ao caso: há ajuda gratuita e quase ninguém a usa.
Em Portugal, o PERSI e a RACE. No Brasil, a lei do superendividamento, o
Procon e a Defensoria Pública. Em Espanha, as OMIC e a Lei de Segunda
Oportunidade. E nunca se paga a uma empresa para renegociar o que se consegue
de graça.

EXEMPLO de tom (não copies, é só o tom):
Pergunta: "não consigo poupar nada, o que faço?"
Resposta: "Com o que entra e o que é essencial, não sobra — e isso não é falta
de disciplina sua. Antes de cortar mais, veja os Apoios aqui na aplicação: é
onde costuma haver dinheiro a que já se tem direito e não se está a receber.
Enquanto não houver folga, o objectivo não é poupar. É acabar o mês sem dívida
nova."`;

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
        modelo: MODELOS[0],
        reserva: MODELOS[1],
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

    const resumo = String(corpo.resumo || '').slice(0, 1200);
    const lingua = LINGUAS[String(corpo.lingua || '')] || '';
    const historico = limparHistorico(corpo.historico);

    const sistema = INSTRUCOES
      + (lingua ? '\n\nA LÍNGUA desta conversa é: ' + lingua + '. Responde nela.' : '')
      + (resumo ? '\n\nOS NÚMEROS DESTA PESSOA (não tens outros, e não inventas mais):\n' + resumo : '')
      + (resumo ? '' : '\n\nNão tens números desta pessoa: ela ainda não lançou nada. Não finjas que tens.');

    const conversa = historico.concat([{ role: 'user', content: mensagem }]);

    /* ---- perguntar, rever, e se for preciso perguntar outra vez ---- */
    let texto = null, usado = null, recusa = null;

    for (let tentativa = 0; tentativa < 2 && !texto; tentativa++) {
      const mensagens = [{ role: 'system', content: sistema + (recusa ? '\n\n' + AVISO(recusa) : '') }]
        .concat(conversa);

      const saida = await perguntarAoModelo(env, mensagens);
      if (!saida.ok) {
        /* Aqui cai-se quando os neurónios do dia acabaram — e é para aqui
           cair. Devolve-se "não dá", o `ia.js` desiste sem se queixar, e o
           chat responde pelas regras. */
        return responder(429, { erro: 'sem-quota' }, cabecalhos);
      }

      const problema = rever(saida.texto);
      if (!problema) { texto = saida.texto; usado = saida.modelo; break; }
      recusa = problema;
    }

    /* Duas vezes recusado. Cala-se: a resposta escrita à mão que o chat tem
       para este caso é melhor do que uma resposta gerada que não passa na
       revisão. */
    if (!texto) return responder(422, { erro: 'nao-passou' }, cabecalhos);

    return responder(200, { texto: texto, modelo: usado }, cabecalhos);
  }
};

/* ------------------------------------------------------------
   Perguntar ao modelo, com o pequeno atrás do grande

   O grande responde melhor e gasta seis vezes mais. Quando ele falha — e a
   razão quase sempre é a quota do dia — tenta-se o pequeno antes de desistir.
   Uma resposta mais seca é muito melhor do que nenhuma.
   ------------------------------------------------------------ */
async function perguntarAoModelo(env, mensagens) {
  for (const modelo of MODELOS) {
    try {
      const saida = await env.IA.run(modelo, {
        messages: mensagens,
        max_tokens: 500,
        temperature: 0.3
      });
      const texto = String((saida && (saida.response || saida.result)) || '').trim();
      if (texto) return { ok: true, texto: texto, modelo: modelo };
    } catch (e) { /* segue para o seguinte */ }
  }
  return { ok: false };
}

const AVISO = motivo => 'A tua resposta anterior foi RECUSADA pela revisão, por: '
  + motivo + '. Escreve outra vez, sem isso, e mais curta.';

/* ------------------------------------------------------------
   A revisão do que sai

   Um modelo instruído a não fazer uma coisa faz-la à mesma, de vez em quando.
   Isto lê o que ele escreveu antes de sair daqui, e é de propósito que erra
   para o lado de recusar: quando recusa, a pessoa recebe a resposta escrita à
   mão, que é boa. O custo de um falso positivo é uma resposta melhor escrita;
   o custo de um falso negativo é alguém a comprar cripto por causa de uma
   aplicação que promete não vender nada.
   ------------------------------------------------------------ */
const MARCAS = 'revolut|nubank|banco inter|c6 bank|itaú|itau|bradesco|santander|millennium|novo banco|caixa geral|activobank|bpi|xp investimentos|rico|clear|binance|coinbase|etoro|trade republic|robinhood|degiro|mintos|bitcoin|ethereum|criptomoeda|cripto';

const RECOMENDAR = 'compra|compre|comprar|invista|investe|investir|abre|abra|abrir conta|põe|poe|coloca|coloque|recomendo|aconselho|sugiro|experimenta|experimente|aposta|aposte';

const REVISAO = [
  { porque: 'prometeste retorno ou ganho',
    re: /\b(garant\w+|assegur\w+)\b[^.!?]{0,60}\b(retorno|rendimento|lucro|ganho|juro)/i },
  { porque: 'prometeste retorno ou ganho',
    re: /\b(vai|vais|irá|ira|vou|podes esperar|pode esperar|espera)\b[^.!?]{0,30}\b(render|ganhar|lucrar|duplicar|multiplicar|valorizar)/i },
  { porque: 'prometeste uma percentagem de rendimento',
    re: /\b(rende|rendem|rendimento de|retorno de|lucro de|ganho de)\b[^.!?]{0,20}\d[\d.,]*\s?%/i },
  { porque: 'disseste que um investimento é seguro',
    re: /\b(sem risco|risco zero|risk[- ]free|guaranteed|é seguro investir|investimento seguro|inversión segura)\b/i },
  { porque: 'recomendaste um produto ou uma marca concreta',
    re: new RegExp('\\b(' + RECOMENDAR + ')\\b[^.!?]{0,60}\\b(' + MARCAS + ')\\b', 'i') },
  { porque: 'recomendaste um produto ou uma marca concreta',
    re: new RegExp('\\b(' + MARCAS + ')\\b[^.!?]{0,40}\\b(é a melhor|e a melhor|vale a pena|recomendo|aconselho)\\b', 'i') },
  { porque: 'atiraste a culpa à pessoa',
    re: /\b(a culpa é (sua|tua|dele|dela)|você é (irresponsáv|preguiç|relaxad)|falta[- ]lhe disciplina|falta de disciplina sua)/i },
  { porque: 'pediste dados que esta aplicação nunca pede',
    re: /\b(palavra-passe|password|senha do banco|senha da conta|número do cartão|numero do cartao|iban|cvv|código de segurança|codigo de seguranca)\b/i },
  { porque: 'fizeste-te passar por uma pessoa',
    re: /\b(sou o wesley|eu sou o fundador|quando eu (estava|passei|tinha)|na minha experiência pessoal)\b/i }
];

function rever(texto) {
  const t = String(texto || '');
  if (t.length < 15) return 'a resposta veio vazia ou curta de mais';
  for (const r of REVISAO) if (r.re.test(t)) return r.porque;
  return null;
}

/* ------------------------------------------------------------
   A conversa

   Sem as mensagens anteriores, "e se eu cortar isso?" não quer dizer nada, e
   a resposta sai genérica. Vão as últimas trocas e mais nada: nem tudo o que
   se disse desde sempre, que seria mandar para fora uma conversa inteira
   sobre o dinheiro de alguém por causa de uma pergunta de uma linha.
   ------------------------------------------------------------ */
function limparHistorico(bruto) {
  if (!Array.isArray(bruto)) return [];
  const out = [];
  for (const m of bruto.slice(-6)) {
    if (!m || typeof m !== 'object') continue;
    const papel = (m.de === 'eu' || m.role === 'user') ? 'user' : 'assistant';
    const txt = String(m.txt || m.content || '').trim().slice(0, 600);
    if (txt) out.push({ role: papel, content: txt });
  }
  /* A conversa tem de começar em quem pergunta e alternar; um histórico
     torto faz alguns modelos responderem torto. */
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

const LINGUAS = {
  pt: 'português de Portugal',
  br: 'português do Brasil',
  es: 'espanhol',
  en: 'inglês'
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
