/* ============================================================
   Vida Financeira — a casa partilhada, na parte que não se vê

     node teste-casa.mjs

   Duas pessoas a lançar contas na mesma casa, cada uma com o seu telemóvel e
   a sua rede — é aqui que estas coisas se partem, e partem-se em silêncio: um
   movimento que desaparece não dá erro nenhum, só deixa a conta errada e a
   pessoa a achar que se enganou.

   Por isso a parte que decide o que sobrevive a uma fusão está escrita em
   funções puras, sem Firebase e sem ecrã, e é testada aqui: o que se junta, o
   que se apaga, o que ganha quando os dois mexeram no mesmo.

   O que este ficheiro NÃO testa é o Firestore — as regras, os convites, quem
   pode ler o quê. Isso só se testa contra o emulador, e está escrito em
   `firestore.rules` com o raciocínio à vista para poder ser lido em vez de
   acreditado.
   ============================================================ */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const casa = new Function('module', 'crypto', 'localStorage', 'document', 'window',
  readFileSync('casa.js', 'utf8') + '\n; return module.exports;')(
  { exports: {} }, globalThis.crypto,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  { getElementById: () => null, addEventListener: () => {}, createElement: () => ({ style: {}, appendChild() {}, addEventListener() {} }) },
  {}
);

const { casaCodigoNovo, casaLimparCodigo, casaMarcarApagados,
        casaFundirMovimentos, casaMaisRecente, ALFABETO } = casa;

let feitos = 0;
const falhas = [];
function testar(nome, fn) {
  try { fn(); feitos++; console.log('  ok   ' + nome); }
  catch (e) { falhas.push(nome); console.log('  FALHA ' + nome + '\n         ' + e.message); }
}

const mov = (id, valor, extra = {}) => ({ id, valor, data: '2026-07-10', tipo: 'saida', ...extra });

console.log('\no código\n');

testar('tem o formato que se lê em voz alta', () => {
  const c = casaCodigoNovo();
  assert.ok(/^VF-CASA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c), c);
});

testar('não usa letras que se confundem com números', () => {
  /* Um código é ditado de um telemóvel para o outro, muitas vezes por quem
     não vê bem ao perto. O 0 e o O, o 1 e o I, são onde se erra. */
  ['O', 'I', '0', '1'].forEach(x => {
    assert.equal(ALFABETO.indexOf(x), -1, 'o alfabeto não devia ter ' + x);
  });
});

testar('não se repete', () => {
  const vistos = new Set();
  for (let i = 0; i < 500; i++) vistos.add(casaCodigoNovo());
  assert.equal(vistos.size, 500);
});

testar('aceita-se escrito como sair', () => {
  const certo = 'VF-CASA-4K7P-9RTM';
  ['vf-casa-4k7p-9rtm', 'VFCASA4K7P9RTM', '4K7P9RTM', ' 4k7p 9rtm ', '4K7P-9RTM']
    .forEach(t => assert.equal(casaLimparCodigo(t), certo, 'não aceitou "' + t + '"'));
});

testar('e recusa-se o que não é um código', () => {
  ['', 'olá', '4K7P', '4K7P9RTM9', 'VF-CASA-0O1I-4K7P']
    .forEach(t => assert.equal(casaLimparCodigo(t), null, 'aceitou "' + t + '"'));
});

console.log('\ndois telemóveis, a mesma casa\n');

testar('o que cada um lançou aparece dos dois lados', () => {
  const dele = [mov('a', 10), mov('b', 20)];
  const dela = [mov('c', 30)];
  const juntos = casaFundirMovimentos(dele, dela, []);
  assert.deepEqual(juntos.map(m => m.id).sort(), ['a', 'b', 'c']);
});

testar('o mesmo movimento não entra duas vezes', () => {
  const dele = [mov('a', 10), mov('b', 20)];
  const dela = [mov('a', 10), mov('b', 20)];
  const juntos = casaFundirMovimentos(dele, dela, []);
  assert.equal(juntos.length, 2);
});

testar('uma correcção feita aqui ganha à cópia antiga de lá', () => {
  const antigo = [mov('a', 500)];
  const corrigido = [mov('a', 50)];
  const juntos = casaFundirMovimentos(antigo, corrigido, []);
  assert.equal(juntos[0].valor, 50, 'devia ficar o corrigido');
});

console.log('\napagar, que é o caso difícil\n');

testar('o que se apagou não volta pelo telemóvel do outro', () => {
  /* Sem marca, isto é o defeito clássico: apago o café no meu telemóvel, o
     dela ainda o tem, e na sincronização seguinte ele reaparece. */
  const marcas = casaMarcarApagados([], ['b']);
  const dela = [mov('a', 10), mov('b', 20)];
  const meus = [mov('a', 10)];
  const juntos = casaFundirMovimentos(dela, meus, marcas);
  assert.deepEqual(juntos.map(m => m.id), ['a']);
});

testar('apagar ganha a uma correcção feita ao mesmo movimento', () => {
  const marcas = casaMarcarApagados([], ['a']);
  const juntos = casaFundirMovimentos([mov('a', 999)], [mov('a', 5)], marcas);
  assert.equal(juntos.length, 0, 'entre ressuscitar e perder a correcção, perde-se a correcção');
});

testar('a marca guarda o id e o quando, e mais nada', () => {
  const marcas = casaMarcarApagados([], ['x'], 1000);
  assert.deepEqual(Object.keys(marcas[0]).sort(), ['em', 'id']);
  assert.equal(marcas[0].em, 1000);
});

testar('não se marca a mesma coisa duas vezes', () => {
  let m = casaMarcarApagados([], ['x'], 1000);
  m = casaMarcarApagados(m, ['x'], 2000);
  assert.equal(m.length, 1);
  assert.equal(m[0].em, 1000, 'fica a primeira marca');
});

testar('ao fim de seis meses a marca sai', () => {
  const velha = [{ id: 'antigo', em: 1000 }];
  const agora = 1000 + 200 * 86400000;
  const m = casaMarcarApagados(velha, ['novo'], agora);
  assert.deepEqual(m.map(x => x.id), ['novo']);
});

testar('e as marcas não crescem para sempre', () => {
  let m = [];
  const agora = Date.now();
  for (let i = 0; i < 900; i++) m = casaMarcarApagados(m, ['id' + i], agora);
  assert.ok(m.length <= 500, 'ficaram ' + m.length);
});

console.log('\nos retratos: o saldo, a dívida\n');

testar('de dois retratos vale o mais recente', () => {
  const meu = { valor: 100, em: 1000 };
  const dela = { valor: 250, em: 2000 };
  assert.equal(casaMaisRecente(meu, dela).valor, 250);
  assert.equal(casaMaisRecente(dela, meu).valor, 250);
});

testar('um lado vazio não apaga o outro', () => {
  const meu = { valor: 100, em: 1000 };
  assert.equal(casaMaisRecente(meu, null).valor, 100);
  assert.equal(casaMaisRecente(null, meu).valor, 100);
  assert.equal(casaMaisRecente(null, null), null);
});

testar('um retrato sem valor não vale nada', () => {
  const bom = { valor: 100, em: 1000 };
  assert.equal(casaMaisRecente(bom, { em: 9999 }).valor, 100);
});

console.log('\num mês inteiro, com os dois a lançar\n');

testar('trinta lançamentos de duas pessoas dão trinta movimentos', () => {
  const dele = [], dela = [];
  for (let i = 0; i < 15; i++) dele.push(mov('ele-' + i, 10 + i));
  for (let i = 0; i < 15; i++) dela.push(mov('ela-' + i, 20 + i));

  /* Cada telemóvel funde o que tem com o que recebeu, e volta a mandar o
     resultado — que é o que acontece de verdade quando os dois estão a usar a
     aplicação ao mesmo tempo. */
  let naCasa = casaFundirMovimentos([], dele, []);
  naCasa = casaFundirMovimentos(naCasa, dela, []);
  naCasa = casaFundirMovimentos(naCasa, dele, []);
  naCasa = casaFundirMovimentos(naCasa, dela, []);

  assert.equal(naCasa.length, 30);
  const soma = naCasa.reduce((s, m) => s + m.valor, 0);
  assert.equal(soma, dele.concat(dela).reduce((s, m) => s + m.valor, 0),
    'a soma da casa tem de bater com a soma dos dois');
});

testar('e um que foi apagado a meio continua apagado depois de dez sincronizações', () => {
  const dele = [mov('a', 10), mov('b', 20), mov('c', 30)];
  const marcas = casaMarcarApagados([], ['b']);
  let naCasa = dele.slice();
  for (let i = 0; i < 10; i++) naCasa = casaFundirMovimentos(naCasa, dele, marcas);
  assert.deepEqual(naCasa.map(m => m.id).sort(), ['a', 'c']);
});

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
if (falhas.length) process.exit(1);
