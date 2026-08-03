/* ============================================================
   Vida Financeira — pôr os dois workers a correr antes de os publicar

   Estes ficheiros nunca tinham corrido. Estavam escritos, lidos e nunca
   executados — e código nunca executado é código que ainda não se sabe se
   funciona. Publicar um worker à primeira, num painel, com o telemóvel de
   alguém do outro lado, é a pior altura para descobrir uma vírgula.

   Isto corre-os aqui, com um Firebase de mentira e uma IA de mentira:

     node servidor/teste-worker.mjs

   As chaves são geradas na hora, os tokens são assinados a sério, e a
   verificação da assinatura é a mesma linha que vai correr na Cloudflare. O
   que não se testa aqui é o que só existe lá — o modelo e o KV verdadeiros —
   e por isso é que ambos são substituídos por peças de mentira que respondem
   como as de verdade respondem.
   ============================================================ */

import assert from 'node:assert';

const PROJECTO = 'vida-financeira-faf77';
const ORIGEM = 'https://godiandk.github.io';
const KID = 'chave-de-teste';

/* O tamanho das instruções entra na conta de um dos testes: o que se corta é o
   resumo da pessoa, não o texto que diz à IA o que ela não pode fazer. */
const INSTRUCOES_MAX = 1200;

/* ---------- as chaves, geradas na hora ---------- */
async function parDeChaves() {
  return crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
}

const boas = await parDeChaves();
const falsas = await parDeChaves();

const publica = await crypto.subtle.exportKey('jwk', boas.publicKey);
const JWKS_FALSO = { keys: [{ ...publica, kid: KID, alg: 'RS256', use: 'sig' }] };

/* ---------- assinar tokens como o Firebase assina ---------- */
function base64url(texto) {
  return Buffer.from(texto, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function token(opcoes = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const cabeca = { alg: opcoes.alg || 'RS256', kid: opcoes.kid || KID, typ: 'JWT' };
  const corpo = {
    sub: opcoes.sub || 'pessoa-1',
    aud: opcoes.aud || PROJECTO,
    iss: opcoes.iss || ('https://securetoken.google.com/' + (opcoes.aud || PROJECTO)),
    exp: opcoes.exp || (agora + 3600),
    iat: agora
  };
  const inicio = base64url(JSON.stringify(cabeca)) + '.' + base64url(JSON.stringify(corpo));
  const chave = opcoes.falsa ? falsas.privateKey : boas.privateKey;
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(inicio));
  const b64 = Buffer.from(assinatura).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return inicio + '.' + b64;
}

/* ---------- o mundo lá fora, de mentira ---------- */
let pedidosAoJWKS = 0;
let pedidosAAnthropic = 0;
let respostaAnthropic = () => new Response(JSON.stringify({
  content: [{ type: 'text', text: 'Isto dá para o mês, com folga curta.' }]
}), { status: 200 });

globalThis.fetch = async (url, opcoes) => {
  const endereco = String(url);
  if (endereco.includes('googleapis.com')) {
    pedidosAoJWKS++;
    return new Response(JSON.stringify(JWKS_FALSO), {
      status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' }
    });
  }
  if (endereco.includes('api.anthropic.com')) {
    pedidosAAnthropic++;
    return respostaAnthropic(opcoes);
  }
  throw new Error('pedido inesperado para ' + endereco);
};

/* ---------- um KV de mentira, com as manhas do verdadeiro ---------- */
function kvFalso({ partido = false } = {}) {
  const gaveta = new Map();
  return {
    gaveta,
    async get(chave) {
      if (partido) throw new Error('kv em baixo');
      return gaveta.has(chave) ? gaveta.get(chave) : null;
    },
    async put(chave, valor) {
      if (partido) throw new Error('kv em baixo');
      gaveta.set(chave, valor);
    }
  };
}

function pedidoPost(corpo, cabecalhos = {}) {
  return new Request('https://vf-ia.exemplo.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': ORIGEM, ...cabecalhos },
    body: JSON.stringify(corpo)
  });
}

/* ---------- correr ---------- */
const gratis = (await import('./worker-gratis.js')).default;
const pago = (await import('./worker.js')).default;

let feitos = 0;
const falhas = [];

async function testar(nome, fn) {
  try { await fn(); feitos++; process.stdout.write('  ok   ' + nome + '\n'); }
  catch (e) { falhas.push(nome); process.stdout.write('  FALHA ' + nome + '\n         ' + e.message + '\n'); }
}

function envGratis(extra = {}) {
  return {
    FIREBASE_PROJECTO: PROJECTO,
    ORIGENS: ORIGEM,
    IA: { run: async () => ({ response: 'Corte primeiro no que se repete todos os meses.' }) },
    TRAVAO: kvFalso(),
    ...extra
  };
}

function envPago(extra = {}) {
  return {
    FIREBASE_PROJECTO: PROJECTO,
    ORIGENS: ORIGEM,
    ANTHROPIC_KEY: 'sk-de-mentira',
    TRAVAO: kvFalso(),
    ...extra
  };
}

console.log('\nworker-gratis.js\n');

await testar('o GET diz o que está ligado', async () => {
  const r = await gratis.fetch(new Request('https://x/', { headers: { Origin: ORIGEM } }), envGratis());
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.ia, true);
  assert.equal(d.travao, 'kv');
  assert.equal(d.porDia, 20);
});

await testar('o GET não inventa ligações que não existem', async () => {
  const env = envGratis(); delete env.IA; delete env.TRAVAO;
  const r = await gratis.fetch(new Request('https://x/', { headers: { Origin: ORIGEM } }), env);
  const d = await r.json();
  assert.equal(d.ia, false);
  assert.equal(d.travao, 'nenhum');
});

await testar('o OPTIONS deixa o navegador continuar', async () => {
  const r = await gratis.fetch(new Request('https://x/', { method: 'OPTIONS', headers: { Origin: ORIGEM } }), envGratis());
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEM);
  assert.ok(r.headers.get('Access-Control-Allow-Headers').includes('Authorization'));
});

await testar('sem token não se responde', async () => {
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }), envGratis());
  assert.equal(r.status, 401);
  assert.equal((await r.json()).erro, 'sem-conta');
});

await testar('com token do Firebase responde-se', async () => {
  const t = await token();
  const r = await gratis.fetch(pedidoPost({ mensagem: 'como corto no mês?' }, { Authorization: 'Bearer ' + t }), envGratis());
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.ok(d.texto.length > 0);
});

await testar('um token assinado por outra chave não entra', async () => {
  const t = await token({ falsa: true });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), envGratis());
  assert.equal(r.status, 401);
  assert.equal((await r.json()).erro, 'conta-invalida');
});

await testar('um token fora do prazo não entra', async () => {
  const t = await token({ exp: Math.floor(Date.now() / 1000) - 10 });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), envGratis());
  assert.equal(r.status, 401);
});

await testar('um token de outro projecto não entra', async () => {
  const t = await token({ aud: 'projecto-de-outra-pessoa' });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), envGratis());
  assert.equal(r.status, 401);
});

await testar('um token a dizer "alg: none" não entra', async () => {
  const t = await token({ alg: 'none' });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), envGratis());
  assert.equal(r.status, 401);
});

await testar('um pedido de outro sítio não entra', async () => {
  const t = await token();
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, {
    Authorization: 'Bearer ' + t, Origin: 'https://sitio-de-alguem.com'
  }), envGratis());
  assert.equal(r.status, 403);
});

await testar('uma mensagem vazia não vale uma chamada ao modelo', async () => {
  const t = await token();
  let chamadas = 0;
  const env = envGratis({ IA: { run: async () => { chamadas++; return { response: 'x' }; } } });
  const r = await gratis.fetch(pedidoPost({ mensagem: '   ' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 400);
  assert.equal(chamadas, 0);
});

await testar('vinte por dia, e a vigésima primeira não', async () => {
  const env = envGratis();
  const t = await token({ sub: 'pessoa-do-limite' });
  for (let i = 0; i < 20; i++) {
    const r = await gratis.fetch(pedidoPost({ mensagem: 'pergunta ' + i }, { Authorization: 'Bearer ' + t }), env);
    assert.equal(r.status, 200, 'a pergunta ' + (i + 1) + ' devia passar');
  }
  const r = await gratis.fetch(pedidoPost({ mensagem: 'mais uma' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 429);
  assert.equal((await r.json()).erro, 'demasiadas');
});

await testar('o limite é por pessoa e não da casa toda', async () => {
  const env = envGratis();
  const t1 = await token({ sub: 'ele' });
  const t2 = await token({ sub: 'ela' });
  for (let i = 0; i < 20; i++) {
    await gratis.fetch(pedidoPost({ mensagem: 'p' + i }, { Authorization: 'Bearer ' + t1 }), env);
  }
  const dele = await gratis.fetch(pedidoPost({ mensagem: 'mais' }, { Authorization: 'Bearer ' + t1 }), env);
  const dela = await gratis.fetch(pedidoPost({ mensagem: 'a primeira dela' }, { Authorization: 'Bearer ' + t2 }), env);
  assert.equal(dele.status, 429);
  assert.equal(dela.status, 200);
});

await testar('com o contador em baixo, responde-se à mesma', async () => {
  const t = await token();
  const env = envGratis({ TRAVAO: kvFalso({ partido: true }) });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 200);
});

await testar('quando os neurónios acabam, diz-se que não dá', async () => {
  const t = await token();
  const env = envGratis({ IA: { run: async () => { throw new Error('sem capacidade'); } } });
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 429);
  assert.equal((await r.json()).erro, 'sem-quota');
});

await testar('sem o modelo ligado, diz-se qual é a peça que falta', async () => {
  const t = await token();
  const env = envGratis(); delete env.IA;
  const r = await gratis.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).erro, 'sem-modelo');
});

await testar('a lista de movimentos não passa daqui', async () => {
  const t = await token();
  let visto = null;
  const env = envGratis({ IA: { run: async (m, o) => { visto = o; return { response: 'ok' }; } } });
  const resumoLongo = 'Entra por mês: 1200\n' + 'x'.repeat(2000);
  await gratis.fetch(pedidoPost({ mensagem: 'e agora?', resumo: resumoLongo }, { Authorization: 'Bearer ' + t }), env);
  const sistema = visto.messages[0].content;
  assert.ok(sistema.includes('Entra por mês: 1200'));
  assert.ok(sistema.length < 800 + INSTRUCOES_MAX, 'o resumo tem de vir cortado');
});

await testar('as chaves da Google pedem-se uma vez, não a cada pergunta', async () => {
  const antes = pedidosAoJWKS;
  const t = await token();
  await gratis.fetch(pedidoPost({ mensagem: 'a' }, { Authorization: 'Bearer ' + t }), envGratis());
  await gratis.fetch(pedidoPost({ mensagem: 'b' }, { Authorization: 'Bearer ' + t }), envGratis());
  assert.equal(pedidosAoJWKS, antes);
});

console.log('\nworker.js (o pago)\n');

await testar('o GET não mostra a chave, só diz que existe', async () => {
  const r = await pago.fetch(new Request('https://x/', { headers: { Origin: ORIGEM } }), envPago());
  const d = await r.json();
  assert.equal(d.chave, true);
  assert.ok(!JSON.stringify(d).includes('sk-de-mentira'));
});

await testar('com token do Firebase pergunta-se à Anthropic', async () => {
  const antes = pedidosAAnthropic;
  const t = await token();
  const r = await pago.fetch(pedidoPost({ mensagem: 'chego ao fim do mês?' }, { Authorization: 'Bearer ' + t }), envPago());
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(pedidosAAnthropic, antes + 1);
  assert.ok(d.texto.includes('mês'));
});

await testar('sem travão, este não responde a ninguém', async () => {
  const t = await token();
  const env = envPago(); delete env.TRAVAO;
  const r = await pago.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).erro, 'sem-travao');
});

await testar('com o contador em baixo, este cala-se em vez de gastar', async () => {
  const t = await token();
  const env = envPago({ TRAVAO: kvFalso({ partido: true }) });
  const antes = pedidosAAnthropic;
  const r = await pago.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), env);
  assert.equal(r.status, 429);
  assert.equal(pedidosAAnthropic, antes, 'não se paga uma pergunta que não se conseguiu contar');
});

await testar('um erro da Anthropic não sai daqui como veio', async () => {
  const t = await token();
  respostaAnthropic = () => new Response(JSON.stringify({
    error: { message: 'credit balance too low for organização de alguém' }
  }), { status: 400 });
  const r = await pago.fetch(pedidoPost({ mensagem: 'olá' }, { Authorization: 'Bearer ' + t }), envPago());
  const texto = await r.text();
  assert.equal(r.status, 502);
  assert.ok(!texto.includes('credit balance'));
  respostaAnthropic = () => new Response(JSON.stringify({
    content: [{ type: 'text', text: 'Isto dá para o mês, com folga curta.' }]
  }), { status: 200 });
});

await testar('um pedido de outro sítio não chega a custar dinheiro', async () => {
  const t = await token();
  const antes = pedidosAAnthropic;
  const r = await pago.fetch(pedidoPost({ mensagem: 'olá' }, {
    Authorization: 'Bearer ' + t, Origin: 'https://sitio-de-alguem.com'
  }), envPago());
  assert.equal(r.status, 403);
  assert.equal(pedidosAAnthropic, antes);
});

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
if (falhas.length) process.exit(1);
