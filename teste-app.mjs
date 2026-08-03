/* ============================================================
   Vida Financeira — a aplicação aberta num telemóvel a sério

     python3 -m http.server 8899        (numa consola)
     npm i playwright                   (uma vez)
     node teste-app.mjs                 (noutra consola)

   Os outros testes deste projecto correm código sem navegador nenhum: as
   línguas, o chat, os workers. Isto é diferente — abre a aplicação num
   Chromium do tamanho de um telemóvel, com movimentos lançados, e carrega nas
   coisas como uma pessoa carrega.

   Existe porque a reorganização de Agosto de 2026 mudou de sítio meia
   aplicação: as contas fixas foram para o fim do Mês, a dívida e os apoios
   foram para dentro das Ferramentas, e as nove calculadoras passaram a estar
   fechadas dentro de grupos. Mover conteúdo com um script é rápido de
   escrever e é a maneira mais fácil de partir um botão sem dar por isso — não
   dá erro na consola, só deixa de haver ali nada.

   E existe também por causa de um defeito que esteve na aplicação sem ninguém
   ver: dois ficheiros com uma função global chamada `num`, e o cartão da
   Reserva a mostrar "0 meses" a quem tinha dinheiro de lado. O último teste
   deste ficheiro é sobre isso, e falha se alguém voltar a pisar o nome.
   ============================================================ */

import { chromium } from 'playwright';
import assert from 'node:assert';

const ENDERECO = process.env.VF_ENDERECO || 'http://localhost:8899';
const CHROMIUM = process.env.VF_CHROMIUM || undefined;

/* Uma pessoa com quatro meses lançados: salário, renda, mercado, luz, passe,
   um café, e sessenta euros guardados por mês. */
function movimentos() {
  const m = [], hoje = new Date();
  for (let mes = 3; mes >= 0; mes--) {
    const dia = x => new Date(hoje.getFullYear(), hoje.getMonth() - mes, x)
      .toLocaleDateString('sv-SE');
    m.push({ id: 'e' + mes, data: dia(2),  valor: 1240, tipo: 'entrada', categoria: 'salario', desc: 'Salário' });
    m.push({ id: 'r' + mes, data: dia(4),  valor: 620,  tipo: 'saida', categoria: 'casa', desc: 'Renda', ess: true });
    m.push({ id: 'm' + mes, data: dia(7),  valor: 180,  tipo: 'saida', categoria: 'mercado', desc: 'Mercado', ess: true });
    m.push({ id: 'l' + mes, data: dia(11), valor: 74,   tipo: 'saida', categoria: 'contas', desc: 'Luz', ess: true });
    m.push({ id: 't' + mes, data: dia(14), valor: 41,   tipo: 'saida', categoria: 'transporte', desc: 'Passe', ess: true });
    m.push({ id: 'g' + mes, data: dia(18), valor: 60,   tipo: 'saida', categoria: 'reserva', desc: 'Guardei' });
    m.push({ id: 'x' + mes, data: dia(21), valor: 28,   tipo: 'saida', categoria: 'lazer', desc: 'Café' });
  }
  return m;
}

const navegador = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-PT'
});
const p = await ctx.newPage();

const erros = [];
p.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));

await p.goto(ENDERECO + '/app/');
await p.evaluate(m => {
  localStorage.setItem('vf:movimentos', JSON.stringify(m));
  localStorage.setItem('vf:moeda', 'EUR');
  localStorage.setItem('vf:arranque', 'feito');
  localStorage.setItem('vf:onboarding', 'feito');
}, movimentos());
await p.goto(ENDERECO + '/app/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

let feitos = 0;
const falhas = [];
async function testar(nome, fn) {
  try { await fn(); feitos++; console.log('  ok   ' + nome); }
  catch (e) { falhas.push(nome); console.log('  FALHA ' + nome + '\n         ' + e.message); }
}

console.log('\na aplicação, num telemóvel\n');

await testar('o Início é a primeira aba, porque é o início', async () => {
  assert.equal(await p.evaluate(() => document.querySelector('.aba')?.dataset.ecra), 'inicio');
});

await testar('as cinco abas abrem o que dizem que abrem', async () => {
  for (const d of ['lancar', 'mes', 'mais', 'wesley', 'inicio']) {
    await p.click(`.aba[data-ecra="${d}"]`);
    await p.waitForTimeout(300);
    const activo = await p.evaluate(() => document.querySelector('.ecra.activo')?.id);
    assert.equal(activo, 'ecra-' + d, d + ' abriu ' + activo);
  }
});

await testar('o Início cabe em quatro ecrãs e não em seis', async () => {
  const m = await p.evaluate(() => ({
    ecras: document.body.scrollHeight / window.innerHeight,
    tocaveis: [...document.querySelector('.ecra.activo')
      .querySelectorAll('button,a[href],input,select,textarea,summary')]
      .filter(e => e.offsetParent !== null).length
  }));
  assert.ok(m.ecras < 4.5, 'tem ' + m.ecras.toFixed(1) + ' ecrãs de altura');
  assert.ok(m.tocaveis < 45, 'tem ' + m.tocaveis + ' coisas em que tocar');
});

await testar('o número do mês aparece antes de qualquer anúncio', async () => {
  const r = await p.evaluate(() => {
    const num = document.querySelector('#ecra-inicio .card.saldo');
    const banner = document.getElementById('banner');
    if (!num) return null;
    return {
      numero: num.getBoundingClientRect().top + window.scrollY,
      banner: banner ? banner.getBoundingClientRect().top + window.scrollY : 1e9
    };
  });
  assert.ok(r, 'não há cartão do saldo');
  assert.ok(r.numero < r.banner, 'o banner está por cima do número da pessoa');
});

await testar('as ferramentas estão arrumadas por pergunta', async () => {
  await p.click('.aba[data-ecra="mais"]');
  await p.waitForTimeout(600);
  const grupos = await p.evaluate(() =>
    [...document.querySelectorAll('.ferr-grupo')].map(g => g.id));
  assert.deepEqual(grupos,
    ['grupo-dividas', 'grupo-guardar', 'grupo-gastar', 'grupo-apoios', 'grupo-planear']);
});

await testar('cada ferramenta nasce fechada, com o nome e para que serve', async () => {
  const caixas = await p.evaluate(() => [...document.querySelectorAll('.ferr-caixa')].map(c => ({
    aberta: c.open,
    nome: c.querySelector('.ferr-nome')?.textContent.trim() || '',
    para: c.querySelector('.ferr-para')?.textContent.trim() || ''
  })));
  assert.ok(caixas.length >= 11, 'só há ' + caixas.length + ' caixas');
  caixas.forEach(c => {
    assert.ok(!c.aberta, 'nasceu aberta: ' + c.nome);
    assert.ok(c.nome.length > 3, 'caixa sem nome');
    assert.ok(c.para.length > 10, 'caixa sem dizer para que serve: ' + c.nome);
  });
});

await testar('uma calculadora abre e faz a conta certa', async () => {
  const caixa = p.locator('#q-calc').locator('xpath=ancestor::details[1]');
  await caixa.locator('> summary').click();
  await p.waitForTimeout(250);
  await p.fill('#q-pronto', '480');
  await p.fill('#q-vezes', '12');
  await p.fill('#q-prestacao', '45,90');
  await p.click('#q-calc');
  await p.waitForTimeout(300);
  const out = await p.textContent('#q-out');
  assert.ok(/70,80/.test(out), 'as doze prestações de 45,90 custam 70,80 a mais: ' + out.slice(0, 140));
});

await testar('a dívida, os apoios e o render foram para o grupo certo', async () => {
  const onde = await p.evaluate(() => ({
    divida: document.getElementById('caixa-ecra-divida')?.closest('.ferr-grupo')?.id,
    apoios: document.getElementById('caixa-ecra-apoios')?.closest('.ferr-grupo')?.id,
    render: document.getElementById('gaveta-investir')?.closest('.ferr-grupo')?.id
  }));
  assert.equal(onde.divida, 'grupo-dividas');
  assert.equal(onde.apoios, 'grupo-apoios');
  assert.equal(onde.render, 'grupo-guardar');
});

await testar('as contas que se repetem vivem no fim do Mês', async () => {
  const onde = await p.evaluate(() =>
    document.getElementById('zona-contas')?.closest('.ecra')?.id);
  assert.equal(onde, 'ecra-mes');
});

await testar('o menu do Início leva a cada sítio, incluindo aos que mudaram', async () => {
  const ir = async (destino, ecra) => {
    await p.click('.aba[data-ecra="inicio"]');
    await p.waitForTimeout(250);
    await p.click('.menu-linha[data-ir="' + destino + '"]');
    await p.waitForTimeout(500);
    assert.equal(await p.evaluate(() => document.querySelector('.ecra.activo')?.id),
      'ecra-' + ecra, destino + ' não abriu no ' + ecra);
  };
  await ir('lancar', 'lancar');
  await ir('mes', 'mes');
  await ir('contas', 'mes');
  await ir('mais', 'mais');
  await ir('wesley', 'wesley');
});

await testar('os apoios continuam a ter porta directa do Início', async () => {
  await p.click('.aba[data-ecra="inicio"]');
  await p.waitForTimeout(250);
  await p.click('[data-ir="apoios"]');
  await p.waitForTimeout(700);
  assert.equal(await p.evaluate(() => document.querySelector('.ecra.activo')?.id), 'ecra-mais');
  assert.ok(await p.evaluate(() => document.getElementById('caixa-ecra-apoios')?.open),
    'devia abrir a caixa dos apoios');
});

await testar('lançar um gasto continua a ser um ecrã com campos', async () => {
  await p.click('.aba[data-ecra="lancar"]');
  await p.waitForTimeout(400);
  assert.ok(await p.locator('#ecra-lancar input').count() > 0, 'o ecrã de lançar ficou vazio');
});

/* ---- o defeito do `num` ----
   Dois ficheiros da mesma página tinham uma função global chamada `num`. O
   `app-financas.js` formatava um número; o `ferramentas.js`, carregado
   depois, lia um campo por id. O segundo apagava o primeiro em silêncio, e o
   cartão da Reserva passava a mostrar "0 meses" a quem tinha dinheiro de
   lado — sem um erro na consola, sem nada partido à vista, só a aplicação a
   dizer a alguém que o que ele juntou não conta. */
await testar('quem tem dinheiro de lado não vê "0 meses"', async () => {
  await p.click('.aba[data-ecra="inicio"]');
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({
    meses: document.getElementById('v-reserva-meses')?.textContent.trim(),
    calculado: typeof calcular === 'function' ? calcular().mesesDeReserva : null
  }));
  assert.ok(r.calculado > 0, 'a conta devia dar mais do que zero meses');
  assert.ok(!/^0\s*mes/.test(r.meses),
    'a conta dá ' + r.calculado.toFixed(2) + ' meses e o cartão mostra "' + r.meses + '"');
});

/* ============================================================
   O que sai da aplicação: a folha e o cartão

   Uma exportação é a única coisa desta aplicação que vive fora dela. Se sair
   torta, ninguém a corrige — abre-se no Excel, não soma, e fecha-se.

   O CSV punha aspas à volta de tudo, incluindo os números: `"74,3"` chega ao
   Excel como texto, e a coluna do dinheiro não soma. E nenhuma das duas
   exportações dizia de que conta tinha saído o dinheiro, numa aplicação que
   separa três carteiras o ano inteiro.
   ============================================================ */
console.log('\no que sai da aplicação\n');

async function comoCasal(sim) {
  await p.evaluate(c => {
    localStorage.setItem('vf:lar', JSON.stringify({ comQuem: c ? 'esposa' : 'so' }));
    const m = JSON.parse(localStorage.getItem('vf:movimentos') || '[]');
    m.forEach((x, i) => { x.conta = c ? (i % 3 === 0 ? 'parceiro' : 'minha') : undefined; });
    localStorage.setItem('vf:movimentos', JSON.stringify(m));
  }, sim);
  await p.goto(ENDERECO + '/app/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
}

await testar('o CSV manda números, e não texto com aspas', async () => {
  await comoCasal(false);
  const linhas = await p.evaluate(() => linhasCSV());
  const valores = linhas.slice(1).map(l => l[4]);
  valores.forEach(v => assert.equal(typeof v, 'number',
    'o valor devia ir como número e foi como "' + v + '"'));
});

await testar('as saídas vão negativas, para a coluna somar o saldo', async () => {
  const linhas = await p.evaluate(() => linhasCSV());
  const saida = linhas.slice(1).find(l => l[1] === 'saida');
  const entrada = linhas.slice(1).find(l => l[1] === 'entrada');
  assert.ok(saida[4] < 0, 'uma saída devia ser negativa: ' + saida[4]);
  assert.ok(entrada[4] > 0, 'uma entrada devia ser positiva: ' + entrada[4]);
});

await testar('sozinho, não há coluna de conta a estorvar', async () => {
  const linhas = await p.evaluate(() => linhasCSV());
  assert.ok(!linhas[0].includes('conta'), 'não devia haver coluna de conta');
  const folhas = await p.evaluate(() => folhasParaExcel().map(f => f.nome));
  assert.deepEqual(folhas, ['Movimentos', 'Mês a mês', 'Por categoria']);
});

await testar('em casal, a folha diz de quem era o dinheiro', async () => {
  await comoCasal(true);
  const linhas = await p.evaluate(() => linhasCSV());
  assert.ok(linhas[0].includes('conta'), 'falta a coluna da conta no CSV');
  const contas = new Set(linhas.slice(1).map(l => l[l.length - 1]));
  assert.ok(contas.size >= 2, 'todas as linhas dizem a mesma conta: ' + [...contas]);

  const folhas = await p.evaluate(() => folhasParaExcel());
  assert.ok(folhas.some(f => f.nome === 'Por pessoa'), 'falta a folha "Por pessoa"');
  const cab = folhas[0].linhas[0].map(c => c.v);
  assert.ok(cab.includes('De que conta'), 'falta a coluna no Excel: ' + cab.join(', '));
});

await testar('cada folha fecha com um total que é uma soma a sério', async () => {
  const folhas = await p.evaluate(() => folhasParaExcel());
  ['Movimentos', 'Mês a mês', 'Por categoria'].forEach(nome => {
    const f = folhas.find(x => x.nome === nome);
    const ultima = f.linhas[f.linhas.length - 1];
    assert.equal(ultima[0].v, 'TOTAL', nome + ' não acaba num total');
    assert.ok(ultima.some(c => c.f && /^SUM\(/.test(c.f)),
      nome + ': o total devia ser uma fórmula e não um número escrito à mão');
  });
});

await testar('a percentagem não sai formatada como dinheiro', async () => {
  const f = await p.evaluate(() => folhasParaExcel().find(x => x.nome === 'Por categoria'));
  const linha = f.linhas[1];
  assert.equal(linha[2].t, 'p', 'a coluna da percentagem devia ter o formato de percentagem');
});

await testar('o cartão de um casal fala no plural', async () => {
  const cartoes = await p.evaluate(() => cartoesPossiveis());
  const reserva = cartoes.find(c => c.id === 'reserva');
  if (reserva) {
    assert.ok(/temos/.test(reserva.topo), 'devia dizer "Já temos": ' + reserva.topo);
    assert.ok(/nossa/i.test(reserva.etiqueta), 'devia dizer "A nossa reserva"');
  }
  const adiar = cartoes.find(c => c.id === 'adiar');
  if (adiar) assert.ok(/gastamos/.test(adiar.topo), 'devia dizer "gastamos": ' + adiar.topo);
});

await testar('e nenhum cartão inventa uma história que não sabe', async () => {
  const cartoes = await p.evaluate(() => cartoesPossiveis());
  cartoes.forEach(c => {
    assert.ok(!/comecei do zero/i.test(c.baixo || ''),
      'o cartão diz "comecei do zero" a quem já tem dinheiro guardado');
  });
});

await testar('nada rebentou pelo caminho', async () => {
  assert.equal(erros.length, 0, erros.slice(0, 3).join(' | '));
});

console.log('\n' + feitos + ' passaram, ' + falhas.length + ' falharam\n');
await navegador.close();
if (falhas.length) process.exit(1);
