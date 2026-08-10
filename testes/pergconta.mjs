/* As perguntas do arranque a partir do momento em que ha' conta. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
const hoje=new Date().toISOString().slice(0,10);
const MOV=[{id:'m1',tipo:'saida',valor:30,categoria:'mercado',descricao:'Continente',
            data:hoje,criado:Date.now(),conta:'minha',moeda:'EUR'}];

async function abrir({sessao=false, extra={}}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({s,x})=>{
    const perfil={};
    const doc={get:()=>Promise.resolve({exists:false,data:()=>perfil}),
               set:()=>Promise.resolve(), delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},
      auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(s?{uid:'u1',email:'a@x.pt'}:null),80)},signOut(){}}),
      firestore:()=>({collection:col})};
    try{localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
        localStorage.setItem('vf:banner-fechado','1');
        Object.keys(x||{}).forEach(k=>localStorage.setItem(k, typeof x[k]==='string'?x[k]:JSON.stringify(x[k])));
    }catch(e){}
  },{s:sessao,x:extra});
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1400);
  return p;
}
const aparece = p => p.locator('#ecra-arranque').isVisible();

console.log('== sem conta, como sempre ==');
let p=await abrir();
ok(await aparece(p), 'quem chega novo é perguntado');
await p.close();

console.log('\n== sem conta e com movimentos, nao se pergunta ==');
p=await abrir({extra:{'vf:movimentos':MOV}});
ok(!await aparece(p), 'quem já lançou e não tem conta não é interrompido');
await p.close();

console.log('\n== COM conta e com movimentos, pergunta-se ==');
/* Este era o caso que ficava de fora: quem andava a usar a app sem conta e
   depois criou uma. As respostas dessa pessoa sao as que agora tem onde ficar. */
p=await abrir({sessao:true, extra:{'vf:movimentos':MOV}});
ok(await aparece(p), 'com conta criada, pergunta-se mesmo a quem já lançou');
console.log('   ', await p.locator('.arr-titulo').innerText());
await p.close();

console.log('\n== COM conta e ja tendo dispensado antes, pergunta-se uma vez ==');
p=await abrir({sessao:true, extra:{'vf:movimentos':MOV,
  'vf:arranque':{feito:false,dispensado:true}}});
ok(await aparece(p), 'ter dito "agora não" sem conta não vale para sempre');
await p.close();

console.log('\n== mas so uma vez: dispensar com conta fecha de vez ==');
p=await abrir({sessao:true, extra:{'vf:movimentos':MOV}});
await p.locator('.arr-voltar', {hasText:'Agora não'}).click();
await p.waitForTimeout(500);
ok(!await aparece(p), 'o "Agora não" fecha');
const marca=await p.evaluate(()=>JSON.parse(localStorage.getItem('vf:arranque')||'{}'));
console.log('   ', JSON.stringify(marca));
ok(marca.pedidoAposConta===true, 'e fica marcado que já se perguntou depois da conta');
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1400);
ok(!await aparece(p), 'e não volta a perguntar na abertura seguinte');
await p.close();

console.log('\n== quem ja respondeu nunca mais e' + "'" + ' perguntado ==');
p=await abrir({sessao:true, extra:{'vf:movimentos':MOV,
  'vf:arranque':{feito:true,dispensado:false,entra:900,essenciais:600}}});
ok(!await aparece(p), 'ter respondido vale para sempre');
await p.close();

console.log('\n== responder tudo tambem fecha de vez ==');
p=await abrir({sessao:true});
await p.fill('#arr-valor','1000'); await p.locator('.arr-bt').first().click(); await p.waitForTimeout(350);
await p.fill('#arr-valor','700'); await p.locator('.arr-bt').first().click(); await p.waitForTimeout(350);
await p.locator('.arr-opcao').first().click(); await p.waitForTimeout(350);
for (let i=0;i<3;i++){ await p.locator('.arr-saltar').click(); await p.waitForTimeout(300); }
await p.locator('.arr-opcao').first().click(); await p.waitForTimeout(500);
const m2=await p.evaluate(()=>JSON.parse(localStorage.getItem('vf:arranque')||'{}'));
console.log('   ', JSON.stringify({feito:m2.feito, pedido:m2.pedidoAposConta}));
ok(m2.pedidoAposConta===true, 'chegar ao fim marca que já se perguntou');
await p.close();

console.log('\n== e cada pergunta continua a poder ser saltada ==');
p=await abrir({sessao:true, extra:{'vf:movimentos':MOV}});
await p.fill('#arr-valor','1000'); await p.locator('.arr-bt').first().click(); await p.waitForTimeout(350);
await p.fill('#arr-valor','700'); await p.locator('.arr-bt').first().click(); await p.waitForTimeout(350);
await p.locator('.arr-opcao').first().click(); await p.waitForTimeout(350);
ok(await p.locator('.arr-saltar').count()===1, 'obrigatório é ser perguntado, não é responder');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length) process.exit(1);
