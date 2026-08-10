const RAIZ = require('path').join(__dirname, '..');
/* As quatro linguas: portugues de Portugal, portugues do Brasil, espanhol e
   ingles. O que se verifica e' que a mesma coisa dita nas quatro da' o mesmo
   resultado — e que nenhuma lingua morde as outras. */
const fs = require('fs'), vm = require('vm');
const ctx = { module:{}, console, Date, Math, JSON, parseInt, parseFloat, isFinite,
              String, Number, Array, Object, RegExp };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(RAIZ + '/interpretar.js','utf8'), ctx);
const { interpretar, entenderPedido, lingua } = ctx;

const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};

function saida(frase, valor, cat){
  const r = interpretar(frase);
  const bom = r.ok && r.tipo==='movimentos' && r.lancamentos.length===1 &&
              Math.abs(r.lancamentos[0].valor-valor)<0.005 &&
              r.lancamentos[0].tipo==='saida' &&
              (!cat || r.lancamentos[0].categoria===cat);
  ok(bom, '"'+frase+'" → saída '+valor+(cat?' ['+cat+']':'') +
     (bom?'':'  ⟵ deu '+JSON.stringify(r.ok?(r.lancamentos||r):r.motivo)));
}
function entrada(frase, valor){
  const r = interpretar(frase);
  const bom = r.ok && r.tipo==='movimentos' && r.lancamentos[0] &&
              r.lancamentos[0].tipo==='entrada' && Math.abs(r.lancamentos[0].valor-valor)<0.005;
  ok(bom, '"'+frase+'" → entrada '+valor+(bom?'':'  ⟵ deu '+JSON.stringify(r.ok?r.lancamentos:r.motivo)));
}
function saldo(frase, valor, conta){
  const r = interpretar(frase);
  const bom = r.ok && r.tipo==='saldo' && Math.abs(r.valor-valor)<0.005 &&
              (!conta || r.conta===conta);
  ok(bom, '"'+frase+'" → saldo '+valor+(conta?' ('+conta+')':'') +
     (bom?'':'  ⟵ deu '+JSON.stringify(r.ok?r:r.motivo)));
}
function pedido(frase, tipo, valor){
  const q = entenderPedido(frase);
  const bom = q && q.pedido===tipo && (valor===undefined || Math.abs(q.valor-valor)<0.005);
  ok(bom, '"'+frase+'" → '+tipo+(valor!==undefined?' '+valor:'') +
     (bom?'':'  ⟵ deu '+JSON.stringify(q)));
}
function nada(frase){
  const r = interpretar(frase);
  ok(!r.ok, '"'+frase+'" NÃO é um lançamento'+(r.ok?'  ⟵ deu '+JSON.stringify(r.lancamentos||r):''));
}

console.log('== gastar, nas quatro ==');
saida('gastei 30 no continente', 30, 'mercado');            // pt-PT
saida('gastei 30 reais no carrefour', 30, 'mercado');        // pt-BR
saida('gasté 30 euros en el mercadona', 30, 'mercado');      // es
saida('I spent 30 at lidl', 30, 'mercado');                  // en
saida('paguei 45,90 na farmacia', 45.90, 'saude');
saida('pagué 45,90 en la farmacia', 45.90, 'saude');
saida('I paid 45.90 at the pharmacy', 45.90);
saida('comprei 12 euros de pao', 12);
saida('compré 12 euros de pan', 12);
saida('I bought 12 euros of bread', 12);

console.log('\n== receber ==');
entrada('recebi 1500 de salario', 1500);
entrada('recibí 1500 de salario', 1500);
entrada('I received 1500 salary', 1500);
entrada('I got paid 1500', 1500);
entrada('vendi a bicicleta por 120', 120);
entrada('I sold the bike for 120', 120);

console.log('\n== quanto se tem ==');
saldo('tenho 1000 no banco', 1000, 'minha');
saldo('tengo 1000 en el banco', 1000, 'minha');
saldo('I have 1000 in the bank', 1000, 'minha');
saldo('my balance is 1000', 1000, 'minha');
saldo('mi saldo es 1000', 1000, 'minha');

console.log('\n== de quem é o dinheiro ==');
saldo('mi mujer tiene 800 en su cuenta', 800, 'parceiro');
saldo('my wife has 800 in her account', 800, 'parceiro');
let r = interpretar('my wife spent 40 at the market');
ok(r.ok && r.lancamentos[0].conta==='parceiro', '"my wife spent 40 at the market" sai da conta dela'+
   (r.ok?'':'  ⟵ '+r.motivo));
r = interpretar('mi mujer gastó 40 en el mercado');
ok(r.ok && r.lancamentos[0].conta==='parceiro', '"mi mujer gastó 40 en el mercado" também');
r = interpretar('I took out 200 from savings');
ok(r.ok && r.lancamentos[0].conta==='emergencia', '"I took out 200 from savings" sai da emergência'+
   (r.ok?'':'  ⟵ '+r.motivo));

console.log('\n== corrigir ==');
pedido('corrige para 1000', 'corrigir-saldo', 1000);
pedido('corrige a 1000', 'corrigir-saldo', 1000);
pedido('fix it to 1000', 'corrigir-saldo', 1000);
pedido('that is wrong, it should be 1000', 'corrigir-saldo', 1000);
pedido('el valor correcto es 1000', 'corrigir-saldo', 1000);
pedido('the last one was 50, not 500', 'corrigir-ultimo', 50);
pedido('el ultimo fue 50, no 500', 'corrigir-ultimo', 50);
pedido('está errado', 'queixa');
pedido('that is wrong', 'queixa');
pedido('esta mal', 'queixa');

console.log('\n== perguntar quanto se tem ==');
pedido('quanto tenho?', 'saldo-quanto');
pedido('cuanto tengo?', 'saldo-quanto');
pedido('how much do i have?', 'saldo-quanto');
pedido("what's my balance?", 'saldo-quanto');
pedido('cual es mi saldo?', 'saldo-quanto');

console.log('\n== o que NÃO é um lançamento ==');
nada('vou gastar 300 numa tv');
nada('voy a gastar 300 en una tele');
nada('I am going to spend 300 on a tv');
nada('should i spend 300 on a tv?');
nada('quanto rende 1000 euros?');
nada('how much does 1000 euros earn?');
nada('isso não é um saldo negativo, arruma');
nada('that is not a negative balance, fix it');

console.log('\n== números como se escrevem em cada sítio ==');
saida('gastei 1.500,00 no carro', 1500);
saida('I spent 1,500.00 on the car', 1500);
saida('gasté 1.500,50 en el coche', 1500.50);
saida('I spent 45.90 at tesco', 45.90);

console.log('\n== prestações ==');
r = interpretar('comprei uma tv de 600 em 12 vezes');
ok(r.ok && r.lancamentos[0].parcelas===12, '"em 12 vezes" → 12 prestações');
r = interpretar('I bought a tv for 600 in 12 installments');
ok(r.ok && r.lancamentos[0].parcelas===12, '"in 12 installments" → 12 prestações'+
   (r.ok?' (deu '+r.lancamentos[0].parcelas+')':'  ⟵ '+r.motivo));
r = interpretar('compré una tele de 600 en 12 cuotas');
ok(r.ok && r.lancamentos[0].parcelas===12, '"en 12 cuotas" → 12 prestações'+
   (r.ok?' (deu '+r.lancamentos[0].parcelas+')':'  ⟵ '+r.motivo));

console.log('\n== ontem e hoje ==');
const on = new Date(); on.setDate(on.getDate()-1);
['gastei 10 ontem','gasté 10 ayer','I spent 10 yesterday'].forEach(f=>{
  const x = interpretar(f);
  const d = x.ok && x.lancamentos[0].data;
  ok(d && d.getDate()===on.getDate(), '"'+f+'" → ontem');
});

console.log('\n== que língua está a ser escrita ==');
[['gastei 30 no continente','pt'],
 ['I spent 30 at the market','en'],
 ['gasté 30 en el mercado','es'],
 ['quanto tenho na minha conta?','pt'],
 ['how much do i have in my account?','en'],
 ['cuanto tengo en mi cuenta?','es']].forEach(([f,esp])=>{
  const l = lingua(f);
  ok(l===esp, '"'+f+'" → '+esp+(l===esp?'':'  ⟵ deu '+l));
});

console.log('\n== uma língua não morde a outra ==');
/* "got" vive dentro de "esgotado"; "pago" dentro de "pagoda"; "el" dentro de
   "eletricidade". Com comparacao por pedaco de texto, qualquer uma destas
   frases virava um lancamento. */
nada('o stock está esgotado');
nada('fui ver a pagoda');
r = interpretar('paguei 40 de eletricidade');
ok(r.ok && r.lancamentos[0].conta==='minha', '"paguei 40 de eletricidade" continua a ser meu');

console.log(`\n=== ${falhas.length?'FALHAS ('+falhas.length+'):\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length) process.exit(1);
