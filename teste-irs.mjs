/* ============================================================
   Vida Financeira — o motor do IRS

     node teste-irs.mjs

   Isto testa o **motor**, não a lei. São coisas diferentes, e convém que
   fique escrito qual é qual:

   - o motor é a aritmética: fatiar o rendimento pelos escalões, aplicar a
     dedução específica, abater o mínimo de existência, comparar conjunta com
     separada. Está testado aqui, e as contas foram feitas à mão a partir das
     tabelas que estão no `IRS_REF`;
   - a lei são os números dentro do `IRS_REF`. Quase todos já estão conferidos
     contra o Diário da República e contra a tabela oficial das Finanças; os
     que faltam estão marcados com `verificado: null`, e há um teste aqui em
     baixo que falha no dia em que alguém os der por confirmados sem pôr a
     fonte ao lado.

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
const { IRS_REF, irsColeta, irsSolidariedade, irsImposto,
        irsCalcular, irsMelhorOpcao, irsRendimentoLiquido,
        irsIsencaoJovem, irsFacturasEmFalta, irsQuantoFaltaParaOTecto,
        irsPorConfirmar, irsTectoGlobal, irsTectoRendas,
        irsConferirMedias, irsConferirParcelas,
        irsAbatimentoMinimo, irsValorReferencia, irsLimiteL,
        irsDeducaoDependentes } = irs;

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
  for (let r = 0; r <= 300000; r += 137) {
    const liquido = r - irsImposto(r);
    assert.ok(liquido >= anterior, 'a ' + r + ' € o líquido desceu');
    anterior = liquido;
  }
});

console.log('\na taxa adicional de solidariedade\n');

testar('abaixo de 80.000 € não existe', () => {
  assert.equal(irsSolidariedade(79999), 0);
});

testar('entre 80.000 e 250.000 são 2,5% só da parte de cima', () => {
  perto(irsSolidariedade(100000), 20000 * 0.025);
});

testar('acima de 250.000 acresce os 5%', () => {
  perto(irsSolidariedade(300000), 170000 * 0.025 + 50000 * 0.05);
});

testar('e sem ela o simulador dizia menos do que a verdade', () => {
  /* Nunca menos: um simulador que erra sempre para o lado bom é pior do que
     um que não existe. */
  assert.ok(irsImposto(120000) > irsColeta(120000));
  assert.equal(irsImposto(30000), irsColeta(30000));
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

testar('quem paga quotas a uma ordem profissional deduz mais', () => {
  /* 240 € de rendimento que deixa de ser tributado, sem papelada nenhuma: a
     ordem comunica. Quase ninguém sabe que a caixa existe. */
  const sem = irsRendimentoLiquido({ trabalho: 30000 });
  const com = irsRendimentoLiquido({ trabalho: 30000, ordemProfissional: true });
  perto(sem.liquido - com.liquido,
    IRS_REF.especificas.comOrdemProfissional - IRS_REF.especificas.trabalho);
});

testar('nos recibos verdes só uma parte é tributada', () => {
  const r = irsRendimentoLiquido({ recibosVerdes: 20000 });
  perto(r.bruto, 20000 * IRS_REF.simplificado.servicos);
});

testar('mas o bruto declarado é o facturado todo', () => {
  /* Isto não é um pormenor: é o `RB` do artigo 70.º, e é com ele que se
     decide o mínimo de existência. Usar o tributável em vez do facturado dava
     a quem passa recibos verdes um abatimento que a lei não lhe dá. */
  const r = irsRendimentoLiquido({ recibosVerdes: 20000 });
  perto(r.brutoDeclarado, 20000);
  perto(r.especifica, 20000 * (1 - IRS_REF.simplificado.servicos));
});

testar('e o coeficiente muda conforme o que se faz', () => {
  const s = irsRendimentoLiquido({ recibosVerdes: 20000, recibosTipo: 'servicos' });
  const o = irsRendimentoLiquido({ recibosVerdes: 20000, recibosTipo: 'outros' });
  assert.ok(o.bruto < s.bruto, 'vender coisas devia tributar menos do que prestar serviços');
});

console.log('\no IRS Jovem\n');

testar('no primeiro ano é isenção total, até ao tecto', () => {
  const tecto = IRS_REF.jovem.tectoIAS * IRS_REF.ias;
  perto(irsIsencaoJovem(15000, 1), 15000);
  perto(irsIsencaoJovem(999999, 1), tecto, 0.02, 'devia parar no tecto');
});

testar('o tecto do IRS Jovem é 55 vezes o IAS', () => {
  perto(IRS_REF.jovem.tectoIAS * IRS_REF.ias, 28737.50);
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

console.log('\no mínimo de existência — três fórmulas e dois cortes\n');

testar('o valor de referência de 2025 são os 12.180 € da lei', () => {
  /* A lei manda usar o maior entre 12.180 € e 1,5 × 14 × IAS. Em 2025 o IAS
     dá 10.972,50 €, por isso ganha o valor escrito. No ano em que deixar de
     ganhar, este teste é o que dá por isso. */
  perto(irsValorReferencia(), 12180);
  assert.ok(IRS_REF.minimoExistencia.vrIAS * IRS_REF.ias < 12180);
});

testar('o L é 13.863,06 € e sai da fórmula, não de uma cópia', () => {
  perto(irsLimiteL(), 13863.06, 0.01);
});

testar('as três fórmulas encaixam sem degrau nenhum', () => {
  /* Se as fórmulas não colassem nos pontos de passagem, haveria um rendimento
     em que ganhar mais um euro custava dinheiro. É o defeito mais fácil de
     introduzir aqui e o mais difícil de ver. */
  const de = IRS_REF.especificas.trabalho;
  const vr = irsValorReferencia(), L = irsLimiteL();
  perto(irsAbatimentoMinimo(vr - 0.01, de, 1), irsAbatimentoMinimo(vr + 0.01, de, 1), 0.05);
  perto(irsAbatimentoMinimo(L - 0.01, de, 1), irsAbatimentoMinimo(L + 0.01, de, 1), 0.05);
});

testar('o salário mínimo sobra com exactamente 2.000 € de colectável', () => {
  /* Esta é a conta que confere a fórmula toda contra si própria. O `250/12,5%`
     que está lá dentro existe para isto: 12.180 € de salário mínimo deixam
     2.000 € de colectável, que a 12,5% dão 250 € de imposto — e 250 € é, ao
     cêntimo, o tecto da dedução de despesas gerais. Se algum destes quatro
     números estiver mal copiado, esta igualdade parte-se. */
  const r = irsCalcular({ titulares: [{ trabalho: 12180, retencao: 0 }] });
  perto(r.coletavel, 2000, 0.02);
  perto(r.coleta, IRS_REF.coleta.gerais.tecto, 0.02);
});

testar('o salário mínimo com facturas não paga IRS nenhum', () => {
  /* Para encher os 250 € de dedução bastam 714,29 € de compras com o número
     no ano inteiro — menos de 60 € por mês. */
  const r = irsCalcular({
    titulares: [{ trabalho: 12180, retencao: 0 }],
    gastos: { gerais: 250 / IRS_REF.coleta.gerais.pct }
  });
  assert.equal(r.imposto, 0, 'devia estar todo apagado pela dedução de despesas gerais');
});

testar('e sem facturas paga 250 € que não tinha de pagar', () => {
  /* O número mais caro deste ficheiro, e a razão de ser da ferramenta toda:
     quem ganha o salário mínimo e nunca pediu factura com o número entrega
     250 € ao Estado por não ter dito nove dígitos na caixa do supermercado. */
  const r = irsCalcular({ titulares: [{ trabalho: 12180, retencao: 0 }] });
  perto(r.imposto, 250, 0.02);
});

testar('a um jovem que já não paga nada, não se anuncia poupança nenhuma', () => {
  /* Com o IRS Jovem no primeiro ano o colectável já está em zero, e o mínimo
     de existência não poupa cêntimo nenhum. Dizer-lhe "poupou-lhe 700 €" é
     inventar-lhe uma poupança — e é o tipo de número simpático que faz uma
     pessoa confiar numa ferramenta que a está a enganar. */
  const r = irsCalcular({ titulares: [{ trabalho: 12000, jovem: true, anoJovem: 1 }] });
  assert.equal(r.imposto, 0);
  assert.equal(r.minimoAplicado, 0, 'não havia imposto nenhum para poupar');
});

testar('o abatimento nunca deixa o colectável negativo', () => {
  for (let rb = 0; rb <= 20000; rb += 173) {
    const r = irsCalcular({ titulares: [{ trabalho: rb }] });
    assert.ok(r.coletavel >= 0, 'a ' + rb + ' € o colectável ficou negativo');
    assert.ok(r.imposto >= 0, 'a ' + rb + ' € o imposto ficou negativo');
  }
});

testar('quem ganha acima do corte não tem abatimento nenhum', () => {
  const corte = IRS_REF.minimoExistencia.corteBrutoIAS * IRS_REF.ias;
  perto(corte, 16093, 0.01);
  const r = irsCalcular({ titulares: [{ trabalho: corte + 500 }] });
  assert.equal(r.abatimentoMinimo, 0);
});

testar('e o corte não faz penhasco nenhum: já não havia nada para cortar', () => {
  /* Se o abatimento ainda valesse alguma coisa no corte, haveria um euro de
     rendimento que custava centenas. A lei tem o cuidado de o fazer chegar a
     zero antes; este teste é o que garante que o nosso motor também. */
  const corte = IRS_REF.minimoExistencia.corteBrutoIAS * IRS_REF.ias;
  const antes = irsCalcular({ titulares: [{ trabalho: corte - 1 }] });
  perto(antes.abatimentoMinimo, 0, 0.02, 'no corte ainda havia abatimento por perder');
});

testar('ganhar mais um euro nunca deixa ninguém com menos — declaração inteira', () => {
  /* O varrimento que apanha qualquer degrau escondido: dedução específica,
     três fórmulas do mínimo de existência, dois cortes, escalões e tectos,
     tudo ao mesmo tempo. */
  let anterior = -1;
  for (let rb = 0; rb <= 60000; rb += 79) {
    const r = irsCalcular({ titulares: [{ trabalho: rb }], gastos: { gerais: 3000 } });
    const naMao = rb - r.imposto;
    assert.ok(naMao >= anterior - 0.01,
      'a ' + rb + ' € de bruto o que fica na mão desceu (' + naMao + ' < ' + anterior + ')');
    anterior = naMao;
  }
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

console.log('\nos filhos, com a regra a sério\n');

testar('sem idades assume o valor base, e diz que assumiu', () => {
  const d = irsDeducaoDependentes(null, 3);
  perto(d.valor, 3 * IRS_REF.coleta.dependente.fixo);
  assert.equal(d.exacto, false, 'tinha de assinalar que não sabia as idades');
});

testar('um filho com dois anos dá 726 €', () => {
  /* Exemplo 1 da tabela oficial. */
  perto(irsDeducaoDependentes([2], 1).valor, 726);
});

testar('dois filhos de 5 e 2 anos dão 1.500 €', () => {
  /* Exemplo 2. O segundo filho com 6 anos ou menos leva +300, e o primeiro,
     com 5, não leva os 126 — é a armadilha que apanha quem lê depressa. */
  perto(irsDeducaoDependentes([5, 2], 2).valor, 1500);
});

testar('três filhos de 3, 2 e 1 ano dão 2.526 € e não 2.178 €', () => {
  /* Exemplo 4, e o que separa a regra certa da regra intuitiva: só o primeiro
     filho leva os 126 €; do segundo em diante são 300 € cada. */
  perto(irsDeducaoDependentes([3, 2, 1], 3).valor, 2526);
});

testar('três filhos de 6, 2 e 1 ano dão 2.400 €', () => {
  perto(irsDeducaoDependentes([6, 2, 1], 3).valor, 2400);
});

testar('três filhos de 10, 7 e 3 anos dão 2.100 €', () => {
  perto(irsDeducaoDependentes([10, 7, 3], 3).valor, 2100);
});

testar('e dizer as idades nunca dá menos do que não dizer', () => {
  const semIdades = irsDeducaoDependentes(null, 2).valor;
  assert.ok(irsDeducaoDependentes([1, 1], 2).valor >= semIdades);
  assert.ok(irsDeducaoDependentes([40, 40], 2).valor >= semIdades);
});

console.log('\nos pais e sogros, e a caixa que quase ninguém abre\n');

testar('um ascendente sozinho dá mais do que um em dois', () => {
  const um = irsCalcular({ titulares: [{ trabalho: 25000 }], ascendentes: 1 });
  const dois = irsCalcular({ titulares: [{ trabalho: 25000 }], ascendentes: 2 });
  const l1 = um.deducoes.linhas.find(l => l.nome === 'Pais ou sogros em casa');
  const l2 = dois.deducoes.linhas.find(l => l.nome === 'Pais ou sogros em casa');
  perto(l1.valor, IRS_REF.coleta.ascendente.sozinho);
  perto(l2.valor, 2 * IRS_REF.coleta.ascendente.fixo);
});

console.log('\nas famílias monoparentais\n');

testar('45% em vez de 35%, e 335 € em vez de 250 €', () => {
  const normal = irsCalcular({ titulares: [{ trabalho: 20000 }], dependentes: 1,
    gastos: { gerais: 5000 } });
  const mono = irsCalcular({ titulares: [{ trabalho: 20000 }], dependentes: 1,
    monoparental: true, gastos: { gerais: 5000 } });
  const g1 = normal.deducoes.linhas.find(l => l.nome === 'Despesas gerais da família');
  const g2 = mono.deducoes.linhas.find(l => l.nome === 'Despesas gerais da família');
  perto(g1.valor, IRS_REF.coleta.gerais.tecto);
  perto(g2.valor, IRS_REF.coleta.gerais.monoTecto);
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

testar('num casal em conjunto as despesas gerais valem 500 € e não 250 €', () => {
  const r = irsCalcular({
    titulares: [{ trabalho: 25000 }, { trabalho: 22000 }],
    conjunta: true, gastos: { gerais: 9000 }
  });
  const g = r.deducoes.linhas.find(l => l.nome === 'Despesas gerais da família');
  perto(g.valor, 2 * IRS_REF.coleta.gerais.tecto);
});

testar('e o tecto global usa o colectável já dividido por dois', () => {
  /* Está na nota 7 da tabela das Finanças, e é fácil de esquecer: sem o
     divisor, um casal com 70.000 € de colectável levava o tecto de quem ganha
     70.000 € sozinho, quando a lei lhe dá o de quem ganha 35.000 €. Dá
     centenas de euros de diferença. */
  const r = irsCalcular({
    titulares: [{ trabalho: 40000 }, { trabalho: 40000 }],
    conjunta: true, gastos: { saude: 9000, educacao: 5000 }
  });
  perto(r.tectoGlobal, irsTectoGlobal(r.coletavelPorSujeito, 0), 0.02);
  assert.ok(r.tectoGlobal > irsTectoGlobal(r.coletavel, 0),
    'o divisor 2 devia dar mais folga, não menos');
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

testar('diz quanto falta gastar-com-factura para encher a dedução', () => {
  /* O único conselho desta ferramenta que serve para alguma coisa em
     Fevereiro. Para os 250 € de despesas gerais são 714,29 € de compras. */
  const f = irsQuantoFaltaParaOTecto(0, IRS_REF.coleta.gerais);
  perto(f.faltaGastar, 250 / 0.35, 0.02);
  perto(f.ganha, 250);
});

testar('e cala-se quando já não falta nada', () => {
  assert.equal(irsQuantoFaltaParaOTecto(99999, IRS_REF.coleta.gerais), null);
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
  perto(r.deducoes.travavel > r.tectoGlobal ? r.tectoGlobal : r.deducoes.travavel,
    r.deduzido - r.deducoes.livre, 0.02);
});

testar('mas não trava os filhos, os pais em casa nem as despesas gerais', () => {
  /* Está na nota 7 e é a metade da regra que ninguém copia: o tecto do artigo
     78.º n.º 7 vale para a saúde, a educação, a casa, o lar, o IVA das
     facturas e as pensões de alimentos. Os 600 € por filho, os 525 € por um
     pai em casa e as despesas gerais da família ficam de fora e contam por
     inteiro.

     Enquanto isto estava mal, uma família com três filhos e um rendimento a
     meio da tabela via 1.800 € de dedução por filhos entrarem no mesmo saco
     das despesas de saúde e serem cortados — centenas de euros de reembolso
     que a app dizia não existirem. */
  const r = irsCalcular({
    titulares: [{ trabalho: 90000, retencao: 30000 }],
    dependentes: 3, ascendentes: 1,
    gastos: { saude: 9000, educacao: 5000, rendas: 6000, gerais: 20000 }
  });
  const livres = ['Filhos', 'Pais ou sogros em casa', 'Despesas gerais da família'];
  const somaLivres = r.deducoes.linhas.filter(l => livres.indexOf(l.nome) >= 0)
    .reduce((s, l) => s + l.valor, 0);
  perto(r.deducoes.livre, somaLivres, 0.02, 'as deduções livres não estão bem separadas');
  assert.ok(r.deducoes.livre > 2000, 'três filhos e um pai em casa valem bem mais do que isto');
  /* O que se deduziu é o tecto **mais** tudo o que o tecto não pode cortar. */
  perto(r.deduzido, r.tectoGlobal + r.deducoes.livre, 0.02);
  assert.ok(r.deduzido > r.tectoGlobal, 'o tecto não pode comer as deduções que não trava');
});

testar('e cada linha diz de que lado do tecto está', () => {
  /* Se uma linha nova aparecer sem `travavel`, cai no lado errado em silêncio
     — e ninguém dá por isso até alguém receber menos do que devia. */
  const r = irsCalcular({
    titulares: [{ trabalho: 40000 }], dependentes: 1, ascendentes: 1,
    gastos: { saude: 500, educacao: 500, rendas: 500, gerais: 3000,
              lares: 500, iva: 200, domestico: 1000, alimentos: 1200 }
  });
  r.deducoes.linhas.forEach(l => {
    assert.equal(typeof l.travavel, 'boolean', 'a linha "' + l.nome + '" não diz se é travável');
  });
  perto(r.deducoes.travavel + r.deducoes.livre, r.deducoes.total, 0.02);
});

console.log('\no tecto da renda, que sobe para quem ganha menos\n');

testar('quem ganha até ao primeiro escalão tem 1.000 € e não 700 €', () => {
  perto(irsTectoRendas(IRS_REF.limiteGlobal.semLimiteAte), 1000);
});

testar('acima de 30.000 € volta aos 700 €', () => {
  perto(irsTectoRendas(50000), 700);
});

testar('pelo meio desce em linha recta, e nunca sobe', () => {
  let anterior = Infinity;
  for (let r = 0; r <= 40000; r += 250) {
    const t = irsTectoRendas(r);
    assert.ok(t <= anterior + 0.01, 'a ' + r + ' € o tecto da renda subiu');
    anterior = t;
  }
});

testar('e quem ganha pouco deduz mais de renda do que quem ganha muito', () => {
  const pobre = irsCalcular({ titulares: [{ trabalho: 12000 }], gastos: { rendas: 9000 } });
  const rico  = irsCalcular({ titulares: [{ trabalho: 60000 }], gastos: { rendas: 9000 } });
  const a = pobre.deducoes.linhas.find(l => l.nome === 'Renda da casa');
  const b = rico.deducoes.linhas.find(l => l.nome === 'Renda da casa');
  assert.ok(a.valor > b.valor, 'a elevação da nota 8 não está a ser aplicada');
});

console.log('\ncontra uma liquidacao a serio das Financas\n');

/* ---- o primeiro caso real ----

   Uma simulação feita no Portal das Finanças, por uma pessoa a sério: sozinha,
   sem IRS Jovem, só trabalho dependente. Os números estão como a AT os
   apresentou, e o nome dela não está aqui nem faz falta.

   Isto vale mais do que os setenta e tal testes acima juntos. Os outros
   confirmam que o motor faz o que eu pensei; este confirma que o que eu pensei
   é o que a Autoridade Tributária faz. São coisas diferentes, e só a segunda
   interessa a quem vai entregar uma declaração.

   Confere-se etapa a etapa e não só o valor final, de propósito: se o fim
   batesse e o meio não, seriam dois erros a cancelarem-se — e esses são os que
   sobrevivem a um teste que só olha para o resultado. */
const AT_SOZINHO = {
  global: 15464.69, especificas: 4462.15, abatimento: 0, coletavel: 11002.54,
  taxa: 16.00, parcela: 282.07, coletaTotal: 1478.34,
  deducoes: 804.76, beneficioMunicipal: 16.84, coletaLiquida: 656.73,
  retencoes: 1063.00, receber: 406.27
};

testar('caso real: a deducao especifica bate com a da AT', () => {
  const t = irsRendimentoLiquido({ trabalho: AT_SOZINHO.global });
  perto(t.especifica, AT_SOZINHO.especificas);
});

testar('caso real: o minimo de existencia da' + "'" + ' zero, e a AT tambem', () => {
  /* Com 15.464,69 € de bruto esta pessoa cai na terceira formula do artigo
     70.º, que dá −820,29 € — e a lei corta em zero. Se a fórmula estivesse
     mal, saía um número positivo qualquer e o colectável ficava errado. É o
     ponto onde uma cópia à pressa se denuncia. */
  const de = IRS_REF.especificas.trabalho;
  const ab = irsAbatimentoMinimo(AT_SOZINHO.global, de, 1, AT_SOZINHO.global, 0);
  perto(ab, AT_SOZINHO.abatimento);
});

testar('caso real: o rendimento colectavel bate ao centimo', () => {
  const t = irsRendimentoLiquido({ trabalho: AT_SOZINHO.global });
  const ab = irsAbatimentoMinimo(AT_SOZINHO.global, t.especifica, 1, AT_SOZINHO.global, 0);
  perto(AT_SOZINHO.global - t.especifica - ab, AT_SOZINHO.coletavel);
});

testar('caso real: a coleta bate, e pelos dois caminhos', () => {
  /* O nosso, fatia a fatia, e o da AT, `taxa × colectável − parcela a abater`.
     Duas contas diferentes sobre a mesma tabela: se a tabela estivesse mal
     copiada, era muito improvável que as duas errassem para o mesmo sítio. */
  perto(irsColeta(AT_SOZINHO.coletavel), AT_SOZINHO.coletaTotal);
  perto(AT_SOZINHO.coletavel * (AT_SOZINHO.taxa / 100) - AT_SOZINHO.parcela,
        AT_SOZINHO.coletaTotal);
});

testar('caso real: a declaracao inteira bate, com as deducoes que ela teve', () => {
  /* Não se sabe a repartição dos 804,76 € entre saúde, educação e o resto, por
     isso constrói-se uma que dê exactamente esse total: as despesas gerais
     cheias (250 €, que é o tecto delas) e o resto em saúde. O que aqui se
     confere é a máquina de somar e não a origem de cada euro.

     Falta o Benefício Municipal, que o motor ainda não conhece: são os 16,84 €
     de diferença, e estão apontados no CLAUDE.md. */
  const emGerais = IRS_REF.coleta.gerais.tecto;
  const emSaude = AT_SOZINHO.deducoes - emGerais;
  const r = irsCalcular({
    titulares: [{ trabalho: AT_SOZINHO.global, retencao: AT_SOZINHO.retencoes }],
    gastos: {
      gerais: emGerais / IRS_REF.coleta.gerais.pct,
      saude:  emSaude / IRS_REF.coleta.saude.pct
    }
  });
  perto(r.coletavel, AT_SOZINHO.coletavel);
  perto(r.coleta, AT_SOZINHO.coletaTotal);
  perto(r.deduzido, AT_SOZINHO.deducoes, 0.02);
  perto(r.imposto, AT_SOZINHO.coletaLiquida + AT_SOZINHO.beneficioMunicipal, 0.02,
    'sem o Benefício Municipal, o imposto fica acima do da AT por esse valor');
  perto(r.resultado, AT_SOZINHO.receber - AT_SOZINHO.beneficioMunicipal, 0.02);
});

testar('caso real: o Beneficio Municipal e' + "'" + ' 2,5% da coleta ja deduzida', () => {
  /* A participação variável no IRS: o município tem direito a 5% do imposto de
     quem lá mora e pode abrir mão de parte. Esta câmara abriu mão de metade, e
     essa metade voltou ao contribuinte. O motor ainda não sabe que isto
     existe — este teste guarda a conta para quando souber. */
  const base = AT_SOZINHO.coletaTotal - AT_SOZINHO.deducoes;
  perto(AT_SOZINHO.beneficioMunicipal / base * 100, 2.5, 0.01);
});

console.log('\nas duas somas de controlo da tabela dos escalões\n');

testar('a taxa média da lei tem de bater com as taxas', () => {
  /* A taxa média que a lei publica no topo de cada escalão não é um número
     independente: sai das taxas e dos limites. Foi com esta conta que se
     apanhou uma das duas tabelas que nos deram — coerente nos seis primeiros
     escalões e incoerente nos dois últimos, o que provou que os limites dela
     estavam errados. */
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

testar('a parcela a abater da tabela das Finanças confere com o mesmo motor', () => {
  /* Segunda soma de controlo, e independente da primeira: a tabela prática da
     AT publica a "parcela a abater", que é a outra maneira de fazer a mesma
     conta. Duas colunas calculadas de maneiras diferentes a baterem com o
     mesmo motor é a prova mais forte que se consegue ter em casa de que a
     tabela está bem copiada. */
  const fora = irsConferirParcelas();
  assert.deepEqual(fora, [], 'a parcela a abater não bate: ' + JSON.stringify(fora));
});

testar('e as nove parcelas estão todas escritas', () => {
  const comParcela = IRS_REF.escaloes.faixas.filter(f => typeof f.parcela === 'number').length;
  assert.equal(comParcela, 9, 'faltam parcelas: só há ' + comParcela + ' de 9');
});

testar('os escalões estão conferidos contra o Diário da República', () => {
  assert.equal(IRS_REF.escaloes.verificado, '2026-08-03');
  assert.ok(/Di[áa]rio da Rep[úu]blica/.test(IRS_REF.escaloes.fonte),
    'a fonte devia dizer onde é que se foi ler');
});

console.log('\na lei, e o que dela ainda não está confirmado\n');

testar('as tabelas por confirmar estão assinaladas', () => {
  const falta = irsPorConfirmar();
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

testar('quem foi confirmado na tabela das Finanças diz o endereço', () => {
  /* Uma fonte sem endereço não é uma fonte: é uma memória. Daqui a um ano
     ninguém se lembra de qual das páginas da AT foi. */
  ['especificas', 'minimoExistencia', 'coleta', 'limiteGlobal', 'solidariedade']
    .forEach(k => {
      assert.ok(IRS_REF[k].verificado, k + ' devia estar confirmada');
      assert.ok(/https:\/\/info\.portaldasfinancas\.gov\.pt/.test(IRS_REF[k].fonte),
        k + ': a fonte tem de trazer o endereço onde se foi ler');
    });
});

testar('o ano dos rendimentos não é o ano da entrega', () => {
  /* O erro mais fácil de cometer aqui: usar as tabelas que saem nas notícias
     em Janeiro, que são as do ano que começa e não as do que se vai declarar. */
  assert.equal(IRS_REF.anoEntrega, IRS_REF.anoRendimentos + 1);
});

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
if (falhas.length) process.exit(1);
