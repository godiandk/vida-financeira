/* O dinheiro de um casal, em tres bolsos: o dele, o dela, e a emergencia.
   O que se verifica e' que cada gasto desconta do bolso certo. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
function dig(c){let s=0;for(let i=0;i<c.length;i++)s+=c.charCodeAt(i)*(i+2);return s%10;}
const f=new Date(); f.setMonth(f.getMonth()+12);
const aamm=String(f.getFullYear()%100).padStart(2,'0')+String(f.getMonth()+1).padStart(2,'0');
const CHAVE='VF'+aamm+'AB23'+dig(aamm+'AB23');

async function abrir(){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript((c)=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
    try{/* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
        localStorage.setItem('vf:banner-fechado','1');
        localStorage.setItem('vf:lar',JSON.stringify({comQuem:'esposa'}));
        localStorage.setItem('vf:chave',c);}catch(e){}
  },CHAVE);
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1000);
  await p.evaluate(()=>window.irEcra('wesley'));
  await p.waitForTimeout(300);
  return p;
}
async function diz(p,t){
  await p.fill('#assist-campo', t);
  await p.locator('#assist-form button[type=submit]').evaluate(e=>e.click());
  await p.waitForTimeout(700);
  const m=await p.locator('.msg.ele .msg-txt').allInnerTexts();
  return m[m.length-1];
}
const bolsos = p => p.evaluate(()=>({
  minha: saldoDaCarteira('minha'),
  parceiro: saldoDaCarteira('parceiro'),
  emergencia: saldoDaCarteira('emergencia'),
  tudo: saldoDeTudo()
}));

console.log('== os tres bolsos ==');
let p=await abrir();
let r=await diz(p,'tenho 1000 euros no banco');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,90));
ok(/minha conta/i.test(r), 'com companheira, a conta dele chama-se "a minha conta"');

r=await diz(p,'ela tem 800 na conta dela');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,90));
ok(/conta dela/i.test(r), 'e a dela chama-se "conta dela"');

r=await diz(p,'temos 2000 na conta de emergencia');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,90));
ok(/emerg/i.test(r), 'e a de emergência é reconhecida');

let s=await bolsos(p);
console.log('   ', JSON.stringify(s));
ok(s.minha===1000 && s.parceiro===800 && s.emergencia===2000, 'os três ficaram com o seu número');
ok(s.tudo===3800, 'e ao todo são 3800');

console.log('\n== cada gasto sai do bolso certo ==');
await diz(p,'gastei 30 no continente');
s=await bolsos(p);
ok(s.minha===970 && s.parceiro===800, 'o meu gasto sai da minha conta');

await diz(p,'a minha mulher gastou 40 no lidl');
s=await bolsos(p);
console.log('   ', JSON.stringify(s));
ok(s.parceiro===760, 'o gasto dela sai da conta dela');
ok(s.minha===970, 'e não da minha');

await diz(p,'ela pagou 25 na farmacia');
s=await bolsos(p);
ok(s.parceiro===735, '"ela pagou" também é dela');

await diz(p,'tirei 200 da poupanca');
s=await bolsos(p);
console.log('   ', JSON.stringify(s));
ok(s.emergencia===1800, 'tirar da poupança sai da emergência');
ok(s.minha===970, 'e não da conta de ninguém');

console.log('\n== ela também recebe ==');
await diz(p,'ela recebeu 900 de salario');
s=await bolsos(p);
console.log('   ', JSON.stringify(s));
ok(s.parceiro===1635, 'a entrada dela soma na conta dela');
ok(s.tudo===4405, 'e o total acompanha (deu '+s.tudo+')');

console.log('\n== o movimento guarda de quem é ==');
const contas=await p.evaluate(()=>JSON.parse(localStorage.getItem('vf:movimentos')||'[]')
  .map(m=>m.conta+':'+m.valor));
console.log('   ', JSON.stringify(contas));
ok(contas.filter(x=>x.startsWith('parceiro')).length===3, 'três movimentos são dela');
ok(contas.filter(x=>x.startsWith('emergencia')).length===1, 'um é da emergência');

console.log('\n== "quanto tenho?" diz os bolsos todos ==');
r=await diz(p,'quanto tenho?');
console.log('   '+r.replace(/\n+/g,' | '));
ok(/4\s?405/.test(r), 'dá o total');
ok(/minha conta/i.test(r) && /conta dela/i.test(r) && /emerg/i.test(r), 'e discrimina os três');

console.log('\n== a dívida ==');
await p.evaluate(()=>definirDividaTotal(3500));
await p.waitForTimeout(300);
r=await diz(p,'quanto tenho?');
console.log('   '+r.replace(/\n+/g,' | ').slice(-80));
ok(/3\s?500/.test(r), 'e diz quanto se deve');

console.log('\n== no ecrã ==');
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(500);
const tela=await p.locator('#v-conta').innerText();
console.log('   '+tela.replace(/\n+/g,' | '));
ok(/A minha conta/i.test(tela), 'o Início mostra a conta dele');
ok(/Conta dela/i.test(tela), 'a conta dela');
ok(/Emerg/i.test(tela), 'a de emergência');
ok(/Ao todo/i.test(tela) && /4\s?405/.test(tela), 'o total');
ok(/Devemos/i.test(tela) && /3\s?500/.test(tela), 'e a dívida');

console.log('\n== sozinho, sem parceiro, nada disto aparece ==');
await p.close();
let p2=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await p2.addInitScript((c)=>{
  const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
  const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
  window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
  try{localStorage.setItem('vf:moeda','EUR');
      localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
      localStorage.setItem('vf:banner-fechado','1');localStorage.setItem('vf:chave',c);}catch(e){}
},CHAVE);
await p2.goto(B+'/app/',{waitUntil:'domcontentloaded'});
await p2.waitForTimeout(1000);
await p2.evaluate(()=>window.irEcra('wesley')); await p2.waitForTimeout(300);
r=await diz(p2,'tenho 500 no banco');
ok(/na conta/i.test(r), 'quem vive sozinho vê só "Na conta"');
await p2.evaluate(()=>window.irEcra('inicio')); await p2.waitForTimeout(400);
const t2=await p2.locator('#v-conta').innerText();
console.log('   '+t2.replace(/\n+/g,' | '));
ok(!/Ao todo/i.test(t2), 'e não leva um total de um bolso só');
await p2.close();

console.log('\n== quem já usava a app não perde nada ==');
let p3=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await p3.addInitScript((c)=>{
  const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
  const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
  window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
  try{localStorage.setItem('vf:moeda','EUR');
      localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
      localStorage.setItem('vf:banner-fechado','1');localStorage.setItem('vf:chave',c);
      /* Como ficava um aparelho na versao anterior: saldo e reserva soltos,
         sem carteiras nenhumas. */
      localStorage.setItem('vf:saldo',JSON.stringify({valor:640,em:Date.now()-86400000}));
      localStorage.setItem('vf:reservainicial','1200');}catch(e){}
},CHAVE);
await p3.goto(B+'/app/',{waitUntil:'domcontentloaded'});
await p3.waitForTimeout(1200);
const migrou=await p3.evaluate(()=>({m:saldoDaCarteira('minha'), e:saldoDaCarteira('emergencia')}));
console.log('   ', JSON.stringify(migrou));
ok(migrou.m===640, 'o saldo antigo virou a carteira "minha"');
ok(migrou.e===1200, 'e a reserva antiga virou a de emergência');
await p3.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
