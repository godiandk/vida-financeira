const RAIZ = require('path').join(__dirname, '..');
const { interpretar } = require(RAIZ + '/interpretar.js');
const HOJE = new Date(2026, 7, 12);   // quarta, 12 de Agosto de 2026
let falhas = [];

function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

function t(frase, espera) {
  const r = interpretar(frase, { hoje: HOJE });
  const erros = [];

  if (espera === false) {
    if (r.ok) erros.push('devia recusar, mas leu ' + JSON.stringify(r.lancamentos||r.valor));
  } else if (espera.saldo !== undefined) {
    if (!r.ok || r.tipo !== 'saldo') erros.push('devia ser saldo, foi ' + (r.motivo||r.tipo));
    else if (r.valor !== espera.saldo) erros.push('saldo ' + r.valor + ' != ' + espera.saldo);
  } else {
    if (!r.ok) { erros.push('nao leu (' + r.motivo + ')'); }
    else {
      const L = r.lancamentos;
      if (espera.n && L.length !== espera.n) erros.push(L.length+' lancamentos, esperava '+espera.n);
      const a = L[0] || {};
      if (espera.valor !== undefined && a.valor !== espera.valor) erros.push('valor '+a.valor+' != '+espera.valor);
      if (espera.tipo && a.tipo !== espera.tipo) erros.push('tipo '+a.tipo+' != '+espera.tipo);
      if (espera.cat && a.categoria !== espera.cat) erros.push('cat '+a.categoria+' != '+espera.cat);
      if (espera.desc && a.descricao !== espera.desc) erros.push('desc "'+a.descricao+'" != "'+espera.desc+'"');
      if (espera.data && iso(a.data) !== espera.data) erros.push('data '+iso(a.data)+' != '+espera.data);
      if (espera.parc !== undefined && a.parcelas !== espera.parc) erros.push('parc '+a.parcelas+' != '+espera.parc);
      if (espera.v2 !== undefined && (!L[1] || L[1].valor !== espera.v2)) erros.push('2.o valor '+(L[1]&&L[1].valor)+' != '+espera.v2);
      if (espera.cat2 && (!L[1] || L[1].categoria !== espera.cat2)) erros.push('2.a cat '+(L[1]&&L[1].categoria)+' != '+espera.cat2);
    }
  }
  const ok = !erros.length;
  if (!ok) falhas.push(frase + '  →  ' + erros.join(' | '));
  console.log((ok?'  OK   ':'  FALHA ') + '"' + frase + '"' + (ok?'':'\n           '+erros.join('\n           ')));
}

console.log('== o exemplo que o cliente deu ==');
t('acabei de gastar 30 euros no mercado continente', {valor:30, tipo:'saida', cat:'mercado', desc:'Continente', data:'2026-08-12'});
t('tenho 1000 euros no banco', {saldo:1000});
t('recebi agora 1500 euro de salario', {valor:1500, tipo:'entrada', cat:'salario', data:'2026-08-12'});

console.log('\n== despesas do dia a dia ==');
t('gastei 12,50 no pingo doce', {valor:12.5, cat:'mercado', desc:'Pingo Doce'});
t('paguei 45 de luz', {valor:45, cat:'contas'});
t('paguei a renda 400', {valor:400, cat:'casa'});
t('comprei remedios 8,90 na farmacia', {valor:8.9, cat:'saude'});
t('meti 30 de gasolina na galp', {valor:30, cat:'transporte'});
t('gastei 6 no cafe', {valor:6, cat:'lazer'});
t('paguei 25 do passe', {valor:25, cat:'transporte'});
t('gastei R$ 87,30 no atacadao', {valor:87.3, cat:'mercado', desc:'Atacadao'});
t('paguei 120 reais de luz da enel', {valor:120, cat:'contas'});
t('gastei 40 no uber', {valor:40, cat:'transporte'});
t('comprei 250 de material escolar', {valor:250, cat:'educacao'});
t('paguei 89,90 da fatura do cartao de credito', {valor:89.9, cat:'dividas'});

console.log('\n== entradas ==');
t('recebi o salario 1200', {valor:1200, tipo:'entrada', cat:'salario'});
t('caiu o bolsa familia 600', {valor:600, tipo:'entrada', cat:'salario'});
t('ganhei 80 num biscate', {valor:80, tipo:'entrada', cat:'extra'});
t('vendi o telemovel por 150', {valor:150, tipo:'entrada', cat:'vendas'});
t('recebi 1500', {valor:1500, tipo:'entrada', cat:'outros-e'});

console.log('\n== numeros dificeis ==');
t('gastei 1.500,00 no continente', {valor:1500, cat:'mercado'});
t('gastei 1500,50 no mercado', {valor:1500.5});
t('paguei 1.200 de renda', {valor:1200, cat:'casa'});
t('recebi mil e quinhentos euros de salario', {valor:1500, tipo:'entrada', cat:'salario'});
t('recebi dois mil de salario', {valor:2000, tipo:'entrada'});
t('gastei 30€ no lidl', {valor:30, cat:'mercado'});
t('gastei €30 no lidl', {valor:30, cat:'mercado'});

console.log('\n== datas ==');
t('gastei 20 no mercado ontem', {valor:20, data:'2026-08-11'});
t('paguei 30 anteontem', {valor:30, data:'2026-08-10'});
t('gastei 15 na segunda', {valor:15, data:'2026-08-10'});
t('paguei 60 no dia 5', {valor:60, data:'2026-08-05'});
t('paguei 60 no dia 28', {valor:60, data:'2026-07-28'});
t('gastei 33 em 03/08', {valor:33, data:'2026-08-03'});

console.log('\n== prestacoes ==');
t('comprei uma maquina de lavar em 12 vezes de 45,90', {valor:45.9, parc:12});
t('paguei 100 em 3x', {valor:100, parc:3});

console.log('\n== varias coisas na mesma frase ==');
t('gastei 30 no continente e 12 na farmacia', {n:2, valor:30, cat:'mercado', v2:12, cat2:'saude'});
t('paguei 400 de renda e 45 de luz', {n:2, valor:400, cat:'casa', v2:45, cat2:'contas'});

console.log('\n== o que NAO deve lancar ==');
t('quanto rende 1000 euros por ano?', false);
t('ola tudo bem', false);
t('como comeco a poupar', false);
t('o que e uma reserva de emergencia', false);
t('quanto devo guardar por mes', false);
t('nao sobra nada', false);
t('', false);
t('gastei muito este mes', false);          // sem valor
t('devo pagar 300 ao meu irmao?', false);   // pergunta

console.log('\n== saldos ==');
t('tenho 2500 na conta', {saldo:2500});
t('tenho 300 de lado', {saldo:300});
t('tinha 1000 guardado', {saldo:1000});

console.log(`\n=== ${falhas.length? falhas.length+' FALHAS' : 'TODAS PASSARAM'} ===`);
if (falhas.length) { console.log(falhas.map(f=>' - '+f).join('\n')); process.exit(1); }
