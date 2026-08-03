/* ============================================================
   Vida Financeira — o servidor mínimo que falta para haver IA

   A aplicação é só ficheiros. Isso é uma escolha, e é dela que vêm três
   promessas que estão escritas na página inicial: funciona sem internet, não
   há rastreadores, e os movimentos não passam por servidor nenhum.

   Uma IA a sério quebra a primeira condição, e só a primeira: precisa de uma
   chave secreta, e uma chave secreta não pode viver dentro de um ficheiro que
   qualquer pessoa abre com o botão direito. Em dias estaria a ser usada por
   estranhos, e a factura vinha para quem a pôs lá.

   Este ficheiro é a caixa onde a chave fica fechada. Corre no Cloudflare
   Workers — de graça até cem mil pedidos por dia — e faz três coisas e mais
   nenhuma:

     1. confirma que quem pergunta tem conta na aplicação (assinatura do
        Firebase, verificada a sério, com as chaves públicas da Google);
     2. trava quem pergunta de mais;
     3. passa a pergunta à Anthropic e devolve a resposta.

   O que ele NÃO faz, e é de propósito:

     - não guarda conversas. Nem em log, nem em base de dados. O que se
       pergunta a esta aplicação sobre dinheiro é do foro de quem pergunta;
     - não recebe movimentos. A app manda o resumo que quiser mandar — não a
       lista do que a pessoa comprou;
     - não substitui o que já existe. As regras do `interpretar.js` continuam
       a lançar, a calcular e a corrigir, de graça, sem internet e sem contar
       a ninguém. A IA só entra quando as regras dizem "não percebi".

   COMO SE PÕE ISTO A ANDAR: ver o README ao lado.
   ============================================================ */

/* Quantas perguntas por pessoa e por dia. Uma pergunta ao Claude Haiku custa
   fracções de cêntimo, mas fracções vezes gente sem limite é uma factura sem
   limite. Vinte por dia chega para quem usa isto a sério e não chega para
   quem o quer usar como brinquedo. */
const POR_DIA = 20;

/* O modelo. Haiku porque é o mais barato e chega bem para conversa sobre
   contas de casa — e porque quem paga isto é uma pessoa, não uma empresa. */
const MODELO = 'claude-haiku-4-5-20251001';

/* O que a IA é, e o que não pode ser. Isto não é decoração: é a única coisa
   entre a aplicação e um modelo a recomendar produtos financeiros a alguém
   que está aflito. */
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

const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async fetch(pedido, env) {
    /* ---- de onde se aceita ---- */
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

    /* ---- quem está a perguntar ---- */
    const auth = pedido.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return responder(401, { erro: 'sem-conta' }, cabecalhos);

    let uid;
    try {
      uid = await uidDoToken(token, env.FIREBASE_PROJECTO);
    } catch (e) {
      return responder(401, { erro: 'conta-invalida' }, cabecalhos);
    }

    /* ---- travão ---- */
    if (env.TRAVAO) {
      const { success } = await env.TRAVAO.limit({ key: uid });
      if (!success) return responder(429, { erro: 'demasiadas', porDia: POR_DIA }, cabecalhos);
    }

    /* ---- a pergunta ---- */
    let corpo;
    try { corpo = await pedido.json(); } catch (e) { return responder(400, { erro: 'corpo' }, cabecalhos); }

    const mensagem = String(corpo.mensagem || '').slice(0, 2000);
    if (!mensagem.trim()) return responder(400, { erro: 'vazio' }, cabecalhos);

    /* O resumo é o que a app decidir contar: quanto entra, quanto sai, se há
       dívida. Nunca a lista de movimentos. Cortado por segurança, para uma
       app com defeito não conseguir mandar daqui um extracto inteiro. */
    const resumo = String(corpo.resumo || '').slice(0, 800);

    const resposta = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 700,
        system: INSTRUCOES + (resumo ? '\n\nOs números desta pessoa:\n' + resumo : ''),
        messages: [{ role: 'user', content: mensagem }]
      })
    });

    if (!resposta.ok) {
      /* O erro da Anthropic não é devolvido tal e qual: pode trazer detalhes
         da conta de quem paga, e isso não é da conta de quem pergunta. */
      return responder(502, { erro: 'servico' }, cabecalhos);
    }

    const dados = await resposta.json();
    const texto = (dados.content || [])
      .filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

    return responder(200, { texto: texto }, cabecalhos);
  }
};

function responder(estado, corpo, cabecalhos) {
  return new Response(JSON.stringify(corpo), { status: estado, headers: cabecalhos });
}

/* ------------------------------------------------------------
   Confirmar que o token é mesmo do Firebase

   Sem isto, qualquer pessoa que descobrisse o endereço podia gastar a conta
   da Anthropic a partir de um terminal. Um `Authorization` que não é
   verificado não é uma porta fechada — é uma porta com um autocolante a dizer
   "fechada".

   Verifica-se a assinatura com as chaves públicas da Google, o emissor, o
   destinatário (o projecto) e a validade. Não há atalhos aqui.
   ------------------------------------------------------------ */
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
