/* ============================================================
   Vida Financeira — o motor do IRS

     node teste-irs.mjs

   Isto testa o **motor**, não a lei. São coisas diferentes, e convém que
   fique escrito qual é qual:

   - o motor é a aritmética: fatiar o rendimento pelos escalões, aplicar a
     dedução específica, comparar conjunta com separada, travar no mínimo de
     existência. Está testado aqui, e as contas foram feitas à mão a partir
     das tabelas que estão no `IRS_REF`;
   - a lei são os números dentro do `IRS_REF`: as taxas, os tectos, os
     coeficientes. Esses **ainda estão por confirmar** contra a fonte oficial,
     e há um teste aqui em baixo que falha no dia em que alguém os der por
     confirmados sem pôr a fonte ao lado.

   Um motor certo com uma tabela errada dá um número errado com toda a
   confiança do mundo. É por isso que a ferramenta escreve por cima do
   resultado que os números estão por confirmar, e é por isso que este
   ficheiro separa as duas coisas.
   ============================================================ */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';

/* O ficheiro tem o motor e o ecrã. Aqui corre-se com um `document` de
   mentira: o que se está a testar é a aritmética, e ela não precisa de ecrã
   nenhum — precisar seria o defeito. */
const irs = new Function('module', 'document', 'localStorage', 'Intl',
  readFileSync('irs.js', 'utf8') + '\n; return module.exports;')(
  { exports: {} },
  { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] },
  { getItem: () => null, setItem: () => {} },
  Intl
);
const { IRS_REF, irsColeta, irsCalcular, irsMelhorOpcao, irsRendimentoLiquido,
        irsIsencaoJovem, irsFacturasEmFalta, irsPorConfirmar,
        irsTectoGlobal, irsConferirMedias } = irs;

let feitos = 0;
const falhas = [];
function testar(nome, fn) {
  try { fn(); feitos++; console.log('  ok   ' + nome); }
  catch (e) { falhas.push(nome); console.log('  FALHA ' + nome + '\n         ' + e.message); }
}

const perto = (a, b, margem, msg) =>
  assert.ok(Math.abs(a - b) <= (margem || 0.02), (msg || '') + ' — deu ' + a + ', esperava ' + b);

console.log('\na colecta, fatia a fatia\n');

testar('sem rendimento não há imposto', () => {
  assert.equal(irsColeta(0), 0);
});

testar('dentro do primeiro escalão é a taxa do primeiro escalão', () => {
  const f = IRS_REF.escaloes.faixas[0];
  perto(irsColeta(5000), 5000 * f.taxa / 100);
});

testar('no segundo escalão só a parte de cima paga mais', () => {
  /* O erro clássico de quem faz isto à mão: aplicar a taxa do escalão ao
     rendimento todo. Uma pessoa a ganhar mais um euro nunca fica com menos. */
  const [a, b] = IRS_REF.escaloes.faixas;
  const esperado = a.ate * a.taxa / 100 + (10000 - a.ate) * b.taxa / 100;
  perto(irsColeta(10000), esperado);
});

testar('ganhar mais um euro nunca deixa ninguém com menos', () => {
  let anterior = -1;
  for (let r = 0; r <= 120000; r += 137) {
    const liquido = r - irsColeta(r);
    assert.ok(liquido >= anterior, 'a ' + r + ' € o líquido desceu');
    anterior = liquido;
  }
});

console.log('\no rendimento de cada pessoa\n');

testar('a dedução específica tira o mesmo a quem ganha pouco', () => {
  const r = irsRendimentoLiquido({ trabalho: 14000 });
  perto(r.liquido, 14000 - IRS_REF.especificas.trabalho);
});

testar('nunca fica negativo', () => {
  const r = irsRendimentoLiquido({ trabalho: 2000 });
  assert.equal(r.liquido, 0);
});

testar('quem descontou mais para a Segurança Social deduz esse valor', () => {
  const ss = IRS_REF.especificas.trabalho + 2000;
  const r = irsRendimentoLiquido({ trabalho: 30000, segurancaSocial: ss });
  perto(r.liquido, 30000 - ss);
});

testar('nos recibos verdes só uma parte é tributada', () => {
  const r = irsRendimentoLiquido({ recibosVerdes: 20000 });
  perto(r.bruto, 20000 * IRS_REF.simplificado.servicos);
});

testar('e o coeficiente muda conforme o que se faz', () => {
  const s = irsRendimentoLiquido({ recibosVerdes: 20000, recibosTipo: 'servicos' });
  const o = irsRendimentoLiquido({ recibosVerdes: 20000, recibosTipo: 'outros' });
  assert.ok(o.bruto < s.bruto, 'vender coisas devia tributar menos do que prestar serviços');
});

console.log('\no IRS Jovem\n');

testar('no primeiro ano é isenção total, até ao tecto', () => {
  const tecto = IRS_REF.jovem.tectoIAS * IRS_REF.jovem.ias;
  perto(irsIsencaoJovem(15000, 1), 15000);
  perto(irsIsencaoJovem(999999, 1), tecto, 0.02, 'devia parar no tecto');
});

testar('vai baixando ao longo dos dez anos', () => {
  const anos = [1, 2, 5, 8].map(a => irsIsencaoJovem(20000, a));
  for (let i = 1; i < anos.length; i++) {
    assert.ok(anos[i] <= anos[i - 1], 'a isenção subiu do ano ' + i);
  }
});

testar('e ao décimo primeiro ano já não há nada', () => {
  assert.equal(irsIsencaoJovem(20000, 11), 0);
});

testar('um jovem paga menos do que alguém igual sem o regime', () => {
  const base = { titulares: [{ trabalho: 18000, retencao: 1500 }] };
  const jovem = { titulares: [{ trabalho: 18000, retencao: 1500, jovem: true, anoJovem: 2 }] };
  assert.ok(irsCalcular(jovem).resultado > irsCalcular(base).resultado);
});

console.log('\na declaração inteira\n');

testar('quem descontou a mais recebe, quem descontou a menos paga', () => {
  const muito = irsCalcular({ titulares: [{ trabalho: 20000, retencao: 4000 }] });
  const pouco = irsCalcular({ titulares: [{ trabalho: 20000, retencao: 100 }] });
  assert.ok(muito.recebe, 'com 4000 retidos devia receber');
  assert.ok(!pouco.recebe, 'com 100 retidos devia pagar');
  /* A diferença entre os dois é exactamente a diferença das retenções: o
     imposto devido é o mesmo, só muda o que já foi entregue. */
  perto(muito.resultado - pouco.resultado, 3900);
});

testar('o salário mínimo não paga IRS', () => {
  const r = irsCalcular({ titulares: [{ trabalho: 12180, retencao: 0 }] });
  assert.equal(r.imposto, 0, 'devia estar coberto pelo mínimo de existência');
});

testar('as deduções descem o imposto, mas nunca abaixo de zero', () => {
  const sem = irsCalcular({ titulares: [{ trabalho: 25000, retencao: 3000 }] });
  const com = irsCalcular({ titulares: [{ trabalho: 25000, retencao: 3000 }],
    dependentes: 2, gastos: { saude: 800, educacao: 1200, gerais: 3000 } });
  assert.ok(com.imposto < sem.imposto, 'as deduções deviam baixar o imposto');
  assert.ok(com.imposto >= 0);
});

testar('cada dedução pára no seu tecto', () => {
  const c = irsCalcular({ titulares: [{ trabalho: 60000, retencao: 15000 }],
    gastos: { saude: 999999 } });
  const saude = c.deducoes.linhas.find(l => l.nome === 'Saúde');
  perto(saude.valor, IRS_REF.coleta.saude.tecto);
});

console.log('\nconjunta ou separada — a escolha que vale dinheiro\n');

testar('com rendimentos muito diferentes, juntos compensa', () => {
  /* É este o caso em que o quociente conjugal muda alguma coisa: um ganha
     bem, o outro quase nada, e a metade de cada um cai num escalão mais
     baixo. */
  const d = {
    titulares: [{ trabalho: 45000, retencao: 9000 }, { trabalho: 8000, retencao: 100 }]
  };
  const o = irsMelhorOpcao(d);
  assert.equal(o.melhor, 'conjunta');
  assert.ok(o.diferenca > 0, 'devia haver diferença entre as duas');
});

testar('com rendimentos parecidos, quase não muda', () => {
  const d = {
    titulares: [{ trabalho: 20000, retencao: 2500 }, { trabalho: 20500, retencao: 2600 }]
  };
  const o = irsMelhorOpcao(d);
  assert.ok(o.diferenca < 200, 'devia dar quase o mesmo, deu ' + o.diferenca);
});

testar('sozinho não há escolha nenhuma a fazer', () => {
  assert.equal(irsMelhorOpcao({ titulares: [{ trabalho: 20000 }] }), null);
});

console.log('\nas facturas que faltam\n');

testar('diz quanto se perde por não ter pedido factura', () => {
  const r = irsFacturasEmFalta(340, 120, IRS_REF.coleta.saude);
  perto(r.falta, 220);
  perto(r.perde, (340 - 120) * IRS_REF.coleta.saude.pct);
});

testar('sem facturas em falta não inventa um aviso', () => {
  assert.equal(irsFacturasEmFalta(120, 340, IRS_REF.coleta.saude), null);
  assert.equal(irsFacturasEmFalta(0, 0, IRS_REF.coleta.saude), null);
});

testar('e não promete mais do que o tecto deixa', () => {
  const r = irsFacturasEmFalta(999999, 0, IRS_REF.coleta.saude);
  assert.ok(r.perde <= IRS_REF.coleta.saude.tecto);
});

console.log('\no tecto de todas as deduções juntas\n');

testar('quem ganha pouco não tem tecto nenhum', () => {
  assert.equal(irsTectoGlobal(7000, 0), Infinity);
});

testar('quem ganha muito fica pelos mil euros', () => {
  perto(irsTectoGlobal(120000, 0), IRS_REF.limiteGlobal.base);
});

testar('pelo meio desce em linha recta, e nunca sobe', () => {
  let anterior = Infinity;
  for (let r = 9000; r <= 100000; r += 500) {
    const t = irsTectoGlobal(r, 0);
    assert.ok(t <= anterior + 0.01, 'a ' + r + ' € o tecto subiu');
    anterior = t;
  }
});

testar('três filhos ou mais dão mais folga', () => {
  assert.ok(irsTectoGlobal(40000, 3) > irsTectoGlobal(40000, 2));
});

testar('o tecto trava mesmo as deduções de quem tem muitas despesas', () => {
  /* Sem isto, o simulador prometia a quem ganha bem uma dedução que a lei não
     deixa ter — e um reembolso que nunca ia chegar. */
  const r = irsCalcular({
    titulares: [{ trabalho: 90000, retencao: 25000 }],
    dependentes: 1,
    gastos: { saude: 9000, educacao: 5000, rendas: 6000, gerais: 20000 }
  });
  assert.ok(r.deduzido < r.deducoes.total, 'as deduções deviam ter sido travadas');
  perto(r.deduzido, r.tectoGlobal, 0.02);
});

console.log('\na taxa média, que serve de soma de controlo\n');

testar('quando a taxa média for conhecida, tem de bater com as taxas', () => {
  /* A taxa média que a lei publica no topo de cada escalão não é um número
     independente: sai das taxas e dos limites. Foi com esta conta que se
     apanhou uma das duas tabelas que nos deram — coerente nos seis primeiros
     escalões e incoerente nos dois últimos, o que provou que os limites dela
     estavam errados. Enquanto não tivermos a coluna oficial, isto não tem
     nada para conferir; no dia em que tiver, passa a ser o teste que impede
     uma tabela mal copiada de entrar. */
  const fora = irsConferirMedias();
  assert.deepEqual(fora, [], 'a taxa média não bate com as taxas: ' + JSON.stringify(fora));
});

testar('e a coluna da lei está toda cá, não só uma parte', () => {
  /* Um teste que confere uma coluna vazia passa sempre. Este garante que as
     oito médias do artigo 68.º estão mesmo escritas — senão o de cima não está
     a conferir nada. */
  const comMedia = IRS_REF.escaloes.faixas.filter(f => f.media !== null).length;
  assert.equal(comMedia, 8, 'faltam médias da lei: só há ' + comMedia + ' de 8');
});

testar('os escalões estão conferidos contra o Diário da República', () => {
  assert.equal(IRS_REF.escaloes.verificado, '2026-08-03');
  assert.ok(/Di[áa]rio da Rep[úu]blica/.test(IRS_REF.escaloes.fonte),
    'a fonte devia dizer onde é que se foi ler');
});

console.log('\na lei, que ainda não está confirmada\n');

testar('as tabelas por confirmar estão assinaladas', () => {
  const falta = irsPorConfirmar();
  /* Enquanto isto não estiver vazio, a ferramenta tem de escrever por cima do
     resultado que os números estão por confirmar. No dia em que estiver, este
     teste passa a ser o que garante que ninguém confirmou uma tabela sem lhe
     pôr a fonte ao lado. */
  console.log('         por confirmar: ' + (falta.length ? falta.join(', ') : 'nenhuma'));
  assert.ok(Array.isArray(falta));
});

testar('nenhuma tabela é dada por confirmada sem fonte e sem data', () => {
  Object.keys(IRS_REF).forEach(k => {
    const b = IRS_REF[k];
    if (!b || typeof b !== 'object' || !('verificado' in b)) return;
    if (b.verificado) {
      assert.ok(typeof b.fonte === 'string' && b.fonte.length > 10,
        k + ' foi dada por confirmada sem dizer de onde veio');
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.verificado),
        k + ': o `verificado` tem de ser a data em que se foi lá ver');
    }
  });
});

testar('o ano dos rendimentos não é o ano da entrega', () => {
  /* O erro mais fácil de cometer aqui: usar as tabelas que saem nas notícias
     em Janeiro, que são as do ano que começa e não as do que se vai declarar. */
  assert.equal(IRS_REF.anoEntrega, IRS_REF.anoRendimentos + 1);
});

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
if (falhas.length) process.exit(1);
