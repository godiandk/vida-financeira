/* ============================================================
   Vida Financeira — o chat responde na língua de quem escreve?

     node teste-chat.mjs

   O `teste-idiomas.mjs` ao lado garante que as quatro línguas têm as mesmas
   frases e os mesmos buracos. Isso não garante o que interessa: que o código
   vá buscar a frase certa. Uma chave mal escrita no `assistente.js` —
   `resp.semfolgas` em vez de `resp.semfolga` — passa por aquele teste sem se
   notar, e depois aparece no telemóvel de alguém como a palavra crua
   `resp.semfolgas` a meio de uma conversa sobre a renda.

   Aqui pergunta-se de verdade, nas quatro línguas, com uma pessoa inventada
   que tem movimentos lançados. E verifica-se três coisas em cada resposta:
   que veio texto, que não sobrou nenhum buraco por preencher, e que veio na
   língua em que se perguntou.
   ============================================================ */

import { readFileSync } from 'node:fs';
import assert from 'node:assert';

/* ---------- uma pessoa com três meses lançados ---------- */
function mesesAtras(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const movimentos = [];
for (let m = 3; m >= 1; m--) {
  movimentos.push({ data: mesesAtras(m), valor: 1200, tipo: 'entrada', categoria: 'salario' });
  movimentos.push({ data: mesesAtras(m), valor: 700, tipo: 'saida', categoria: 'renda', ess: true });
  movimentos.push({ data: mesesAtras(m), valor: 250, tipo: 'saida', categoria: 'mercado', ess: true });
  movimentos.push({ data: mesesAtras(m), valor: 60, tipo: 'saida', categoria: 'reserva' });
}

const gaveta = {
  'vf:movimentos': JSON.stringify(movimentos),
  'vf:moeda': 'EUR'
};

const localStorage = {
  getItem: k => (k in gaveta ? gaveta[k] : null),
  setItem: (k, v) => { gaveta[k] = String(v); },
  removeItem: k => { delete gaveta[k]; }
};

/* ---------- correr os ficheiros como a página os corre ---------- */
const codigo = readFileSync('idiomas.js', 'utf8') + '\n' +
               readFileSync('respostas.js', 'utf8') + '\n' +
               readFileSync('assistente.js', 'utf8') + '\n' +
               readFileSync('interpretar.js', 'utf8') + '\n' +
               '; return { responder, fixarLingua, definirIdioma, T };';

const app = new Function('navigator', 'localStorage', 'document', 'window', 'Intl', codigo)(
  { language: 'pt-PT' },
  localStorage,
  { querySelectorAll: () => [], documentElement: {}, addEventListener: () => {},
    getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {} } }) },
  { dispatchEvent: () => {}, addEventListener: () => {} },
  Intl
);

/* ---------- as perguntas, e o que tem de aparecer na resposta ---------- */
const PERGUNTAS = [
  { lingua: 'pt', texto: 'não sobra nada ao fim do mês', marcas: ['disciplina', 'Apoios'] },
  { lingua: 'pt', texto: 'quanto devo guardar de reserva?', marcas: ['degraus', 'Uma semana'] },
  { lingua: 'pt', texto: 'tenho dívidas no cartão de crédito', marcas: ['PERSI', 'RACE'] },
  { lingua: 'pt', texto: 'onde é que eu invisto o dinheiro?', marcas: ['comissão', 'garantia'] },

  { lingua: 'es', texto: 'no me sobra nada a fin de mes', marcas: ['disciplina', 'Ayudas'] },
  { lingua: 'es', texto: '¿cuánto tengo que ahorrar de colchón?', marcas: ['escalones', 'Una semana'] },
  { lingua: 'es', texto: 'tengo deudas con la tarjeta', marcas: ['Segunda Oportunidad', 'OMIC'] },
  { lingua: 'es', texto: '¿dónde invierto mi dinero?', marcas: ['comisión', 'garantía'] },
  { lingua: 'es', texto: 'quiero ganar más dinero', marcas: ['primer cliente', 'Cobre'] },

  { lingua: 'en', texto: "there's nothing left at the end of the month", marcas: ['discipline', 'Benefits'] },
  { lingua: 'en', texto: 'how much should i save as an emergency fund?', marcas: ['steps', 'One week'] },
  { lingua: 'en', texto: 'i have credit card debt', marcas: ['PERSI', 'superindebtedness'] },
  { lingua: 'en', texto: 'where should i invest my money?', marcas: ['fee', 'commission'] },
  { lingua: 'en', texto: 'how do i earn more money?', marcas: ['first customer', 'Charge'] },
  { lingua: 'en', texto: 'how much does this cost?', marcas: ['free', '4.90'] }
];

let feitos = 0;
const falhas = [];

for (const p of PERGUNTAS) {
  app.definirIdioma('pt');           /* a app em português, de propósito: a
                                        resposta tem de seguir a mensagem e
                                        não a aplicação */
  app.fixarLingua(p.texto);
  const r = app.responder(p.texto);
  const nome = p.lingua + ': "' + p.texto + '"';

  try {
    assert.ok(r && r.length > 200, 'resposta curta de mais ou vazia');
    const sobrou = r.match(/\{[a-zA-Z0-9]+\}/g);
    assert.ok(!sobrou, 'ficou um buraco por preencher: ' + sobrou);
    assert.ok(!/resp\.[a-z]/.test(r), 'saiu uma chave crua em vez da frase');
    p.marcas.forEach(m => {
      assert.ok(r.includes(m), 'faltou "' + m + '" — provavelmente veio noutra língua');
    });
    feitos++;
    console.log('  ok   ' + nome);
  } catch (e) {
    falhas.push(nome);
    console.log('  FALHA ' + nome + '\n         ' + e.message);
  }
}

/* ---------- e o dinheiro escrito à maneira de cada sítio ---------- */
try {
  app.definirIdioma('pt');
  app.fixarLingua('quanto devo guardar de reserva?');
  const pt = app.responder('quanto devo guardar de reserva?');
  app.fixarLingua('how much should i save as an emergency fund?');
  const en = app.responder('how much should i save as an emergency fund?');
  assert.ok(/\d\.\d{3},\d{2}|\d+,\d{2}\s?€/.test(pt), 'o português devia trazer vírgula decimal');
  assert.ok(/€\d|\d+\.\d{2}/.test(en), 'o inglês devia trazer ponto decimal');
  feitos++;
  console.log('  ok   o dinheiro escrito à maneira de quem lê');
} catch (e) {
  falhas.push('formato do dinheiro');
  console.log('  FALHA formato do dinheiro\n         ' + e.message);
}

/* ---------- e o que já funcionava continua a funcionar ----------

   Mexer nas marcas de língua para acertar nas perguntas podia estragar o que
   elas foram feitas para fazer: saber em que língua está escrito um gasto.
   Uma frase de lançar mal classificada não dá erro nenhum — responde na
   língua errada a quem acabou de escrever certo. */
const codigoLingua = readFileSync('interpretar.js', 'utf8') + '\n; return lingua;';
const lingua = new Function('navigator', 'localStorage', 'document', 'window', codigoLingua)(
  { language: 'pt-PT' }, localStorage,
  { addEventListener: () => {}, querySelectorAll: () => [], documentElement: {} }, {});

const DE_SEMPRE = [
  ['gastei 30 no continente', 'pt'], ['paguei 12 na farmacia', 'pt'],
  ['a minha mulher gastou 40 no lidl', 'pt'], ['tenho 1000 no banco', 'pt'],
  ['o ultimo foi 50, nao 500', 'pt'], ['quanto tenho na conta?', 'pt'],
  ['meti 40 de gasolina', 'pt'], ['recebi o salario hoje', 'pt'],
  ['gaste 30 en el mercadona', 'es'], ['pague 12 en la farmacia', 'es'],
  ['cuanto tengo en la cuenta?', 'es'], ['mi esposa gasto 40 ayer', 'es'],
  ['tengo 1000 en el banco', 'es'],
  ['i spent 30 at lidl', 'en'], ['my wife spent 40 at the market', 'en'],
  ['the last one was 50, not 500', 'en'], ['how much do i have in my account?', 'en'],
  ['i paid 12 at boots today', 'en']
];

try {
  DE_SEMPRE.forEach(([frase, esperada]) => {
    assert.equal(lingua(frase), esperada, `"${frase}" foi lida como ${lingua(frase)}`);
  });
  feitos++;
  console.log('  ok   as ' + DE_SEMPRE.length + ' frases de lançar continuam na língua certa');
} catch (e) {
  falhas.push('línguas das frases de lançar');
  console.log('  FALHA línguas das frases de lançar\n         ' + e.message);
}

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
if (falhas.length) process.exit(1);
