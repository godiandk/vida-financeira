/* O arranque com as perguntas novas: com quem vive, os saldos, a divida e o
   plano. O que importa e' que ninguem fica preso e que nada e' inventado. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';

async function abrir(){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(()=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
    try{/* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');localStorage.setItem('vf:banner-fechado','1');}catch(e){}
  });
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1100);
  return p;
}
const titulo = p => p.locator('.arr-titulo').innerText();
const conta  = p => p.locator('.arr-conta').innerText();
async function num(p,v){
  await p.fill('#arr-valor', v);
  await p.locator('.arr-bt').first().click();
  await p.waitForTimeout(350);
}
async function escolher(p,txt){
  await p.locator('.arr-opcao', {hasText: txt}).first().click();
  await p.waitForTimeout(350);
}

console.log('== o caminho de quem vive com a esposa ==');
let p=await abrir();
ok(await p.locator('#ecra-arranque').isVisible(), 'o arranque aparece a quem nunca lançou nada');
console.log('   ', await conta(p), '|', await titulo(p));
ok(/quanto entra/i.test(await titulo(p)), 'começa por quanto entra');

await num(p,'1800');
ok(/nao da para nao pagar|não dá para não pagar/i.test(await titulo(p)), 'depois os essenciais');
await num(p,'1200');

let t=await titulo(p);
console.log('   ', t);
ok(/vive sozinho ou com alguem|vive sozinho ou com alguém/i.test(t), 'depois pergunta com quem vive');
let ops=await p.locator('.arr-opcao').allInnerTexts();
console.log('   opções:', JSON.stringify(ops.map(x=>x.split('\n')[0])));
ok(ops.length===4, 'com quatro respostas');
await escolher(p,'Com a minha esposa');

t=await titulo(p);
ok(/na sua conta/i.test(t), 'depois quanto tem na conta dele');
await num(p,'900');

t=await titulo(p);
console.log('   ', t);
ok(/a sua esposa/i.test(t), 'e a pergunta seguinte trata-a por "a sua esposa"');
await num(p,'450');

t=await titulo(p);
ok(/de lado/i.test(t), 'depois o dinheiro de lado');
await num(p,'2500');

t=await titulo(p);
ok(/devem hoje/i.test(t), 'depois a dívida');
await num(p,'3200');

t=await titulo(p);
console.log('   ', t);
ok(/fazer primeiro/i.test(t), 'e por fim o plano');
ops=await p.locator('.arr-opcao').allInnerTexts();
console.log('   planos:', JSON.stringify(ops.map(x=>x.split('\n')[0])));
ok(ops.length===3, 'com três planos');
await escolher(p,'Sair das dívidas');

console.log('\n== o que ficou gravado ==');
const estado=await p.evaluate(()=>({
  lar: lar.comQuem,
  minha: saldoDaCarteira('minha'),
  parceiro: saldoDaCarteira('parceiro'),
  emergencia: saldoDaCarteira('emergencia'),
  divida: dividaTotal && dividaTotal.valor,
  plano: arranque.plano,
  movimentos: movimentos.length
}));
console.log('   ', JSON.stringify(estado));
ok(estado.lar==='esposa', 'ficou registado que vive com a esposa');
ok(estado.minha===900 && estado.parceiro===450, 'as duas contas com os números certos');
ok(estado.emergencia===2500, 'a emergência também');
ok(estado.divida===3200, 'e a dívida');
ok(estado.plano==='divida', 'e o plano escolhido');
ok(estado.movimentos===0, 'e NENHUM movimento foi inventado — nada disto é um lançamento');

console.log('\n== sem conta, avisa que isto fica so' + "'" + ' no aparelho ==');
const semConta=await p.locator('.arr-semconta').innerText();
console.log('   ', semConta.replace(/\n+/g,' | '));
ok(/so neste telemovel|só neste telemóvel/i.test(semConta), 'diz que fica só neste telemóvel');
ok(await p.locator('.arr-bt-conta').count()===1, 'e oferece criar conta');

console.log('\n== a folha da resposta ainda aparece ==');
const resp=await p.locator('#arranque-corpo').innerText();
console.log('   ', resp.replace(/\n+/g,' | ').slice(0,120));
ok(/sobram|falta/i.test(resp), 'a conta do que sobra é mostrada');
ok(await p.locator('.arr-bt').count()>0, 'com os botões para continuar');

console.log('\n== e no Início estão as carteiras ==');
/* O ultimo `.arr-bt` da folha da resposta e' "Comecar a lancar gastos". A
   ligacao "Criar conta" tem classe propria de proposito — sai da aplicacao. */
await p.locator('.arr-bt', {hasText:'Começar a lançar'}).click();
await p.waitForTimeout(500);
await p.evaluate(()=>window.irEcra('inicio'));
await p.waitForTimeout(500);
const tela=await p.locator('#v-conta').innerText();
console.log('   ', tela.replace(/\n+/g,' | '));
ok(/A minha conta/i.test(tela) && /900/.test(tela), 'a conta dele');
ok(/Conta dela/i.test(tela) && /450/.test(tela), 'a conta dela');
ok(/Emerg/i.test(tela) && /2\s?500/.test(tela), 'a emergência');
ok(/Devemos/i.test(tela) && /3\s?200/.test(tela), 'e a dívida');
await p.close();

console.log('\n== quem vive sozinho não leva a pergunta do parceiro ==');
p=await abrir();
await num(p,'1000'); await num(p,'800');
await escolher(p,'Sozinho');
ok(/na sua conta/i.test(await titulo(p)), 'salta da escolha para a conta dele');
/* O `text-transform:uppercase` do CSS chega ao `innerText`: a comparacao tem
   de ser feita sem se importar com maiusculas. */
ok(/de\s*7$/i.test((await conta(p)).trim()), 'e são sete perguntas, não oito ('+await conta(p)+')');
await p.close();

console.log('\n== "não sei" salta sem inventar nada ==');
p=await abrir();
await num(p,'1000'); await num(p,'800');
await escolher(p,'Sozinho');
ok(await p.locator('.arr-saltar').count()===1, 'a pergunta da conta tem "Não sei"');
await p.locator('.arr-saltar').click(); await p.waitForTimeout(350);
await p.locator('.arr-saltar').click(); await p.waitForTimeout(350);
await p.locator('.arr-saltar').click(); await p.waitForTimeout(350);
ok(/fazer primeiro/i.test(await titulo(p)), 'saltou as três e chegou ao plano');
await escolher(p,'Juntar uma reserva');
const vazio=await p.evaluate(()=>({
  n: ['minha','parceiro','emergencia'].filter(id=>carteiras[id]).length,
  d: dividaTotal
}));
console.log('   ', JSON.stringify(vazio));
ok(vazio.n===0 && vazio.d===null, 'e não se gravou carteira nem dívida nenhuma');
await p.close();

console.log('\n== quanto entra deixou de ser obrigatória ==');
/* Quem ganha à comissão não tem um número para dar. Obrigá-lo a inventar um
   estraga tudo o que a app calcula a partir dele. */
p=await abrir();
ok(await p.locator('.arr-saltar').count()===1, 'a pergunta do que entra pode ser saltada');
console.log('   ', await p.locator('.arr-saltar').innerText());
ok(/varia/i.test(await p.locator('.arr-saltar').innerText()), 'e o botão diz porquê: "varia muito"');
await p.locator('.arr-saltar').click(); await p.waitForTimeout(350);
ok(/não dá para não pagar|essenciais/i.test(await titulo(p)), 'e saltar leva à pergunta seguinte');

console.log('\n== mas os essenciais continuam obrigatórios ==');
ok(await p.locator('.arr-saltar').count()===0, 'a dos essenciais não tem "Não sei"');
await p.fill('#arr-valor','');
await p.locator('.arr-bt').first().click();
await p.waitForTimeout(350);
ok(/não dá para não pagar|essenciais/i.test(await titulo(p)), 'e vazio não avança');

console.log('\n== e quem saltou não ouve que lhe falta dinheiro ==');
/* Sem saber o que entra, "entra 0 e saem 800" dava sempre falta de dinheiro —
   falso, e a frase mais rapida para alguem fechar a app e nao voltar. */
await num(p,'800');
await escolher(p,'Sozinho');
for (let i=0;i<3;i++){ await p.locator('.arr-saltar').click(); await p.waitForTimeout(300); }
await p.locator('.arr-opcao').first().click(); await p.waitForTimeout(500);
const fim=await p.locator('#arranque-corpo').innerText();
console.log('   ', fim.split('\n').slice(0,3).join(' / '));
ok(!/falta-lhe dinheiro/i.test(fim), 'não se conclui uma falta que não se sabe se existe');
ok(/primeiro mês/i.test(fim), 'diz-se que fica a saber-se com o primeiro mês');
await p.close();

console.log('\n== dá para sair a qualquer momento ==');
p=await abrir();
await num(p,'1000'); await num(p,'800');
await p.locator('.arr-voltar', {hasText:'Agora não'}).click();
await p.waitForTimeout(500);
ok(await p.locator('#ecra-arranque').isHidden(), 'o "Agora não" fecha o arranque');
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1100);
ok(await p.locator('#ecra-arranque').isHidden(), 'e não volta ao recarregar');
await p.close();

console.log('\n== e dá para voltar atrás ==');
p=await abrir();
await num(p,'1000'); await num(p,'800');
await escolher(p,'Com o meu marido');
ok(/o seu marido/i.test((await titulo(p))+(await p.locator('.arr-titulo').innerText())) ||
   /na sua conta/i.test(await titulo(p)), 'seguiu em frente');
await p.locator('.arr-voltar', {hasText:'Voltar'}).click(); await p.waitForTimeout(350);
ok(/vive sozinho/i.test(await titulo(p)), 'o "Voltar" traz a pergunta anterior');
const marcada=await p.locator('.arr-opcao.escolhida').count();
ok(marcada===1, 'com a resposta anterior ainda marcada');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length) process.exit(1);
