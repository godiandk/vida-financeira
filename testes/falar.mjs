/* Responder na lingua de quem escreve, e mostrar a app nessa lingua. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
function dig(c){let s=0;for(let i=0;i<c.length;i++)s+=c.charCodeAt(i)*(i+2);return s%10;}
const f=new Date(); f.setMonth(f.getMonth()+12);
const aamm=String(f.getFullYear()%100).padStart(2,'0')+String(f.getMonth()+1).padStart(2,'0');
const CHAVE='VF'+aamm+'AB23'+dig(aamm+'AB23');

async function abrir({lingua=null, sistema='pt-PT'}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    locale:sistema});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({c,l})=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
    try{localStorage.setItem('vf:moeda','EUR');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
        localStorage.setItem('vf:chave',c);
        /* O addInitScript corre em CADA navegacao, incluindo o reload. Sem
           este `if`, o teste apagava a escolha que estava a verificar. */
        if(l && !localStorage.getItem('vf:lingua')) localStorage.setItem('vf:lingua',l);
    }catch(e){}
  },{c:CHAVE,l:lingua});
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>window.irEcra('wesley'));
  await p.waitForTimeout(300);
  return p;
}
async function diz(p,txt){
  await p.fill('#assist-campo', txt);
  await p.locator('#assist-form button[type=submit]').evaluate(e=>e.click());
  await p.waitForTimeout(800);
  const m=await p.locator('.msg.ele .msg-txt').allInnerTexts();
  return m[m.length-1];
}

console.log('== responde na língua de quem escreve ==');
let p=await abrir();
let r=await diz(p,'I spent 30 euros at the market');
console.log('   EN →', r.replace(/\n+/g,' | ').slice(0,90));
ok(/added/i.test(r), 'quem escreve inglês recebe inglês');
ok(!/lançado/i.test(r), 'e já não recebe português');

r=await diz(p,'gasté 25 euros en la farmacia');
console.log('   ES →', r.replace(/\n+/g,' | ').slice(0,90));
ok(/apuntado/i.test(r), 'quem escreve espanhol recebe espanhol');

r=await diz(p,'gastei 12 euros no mercado continente');
console.log('   PT →', r.replace(/\n+/g,' | ').slice(0,90));
ok(/lançado/i.test(r), 'e quem volta ao português recebe português');

console.log('\n== o saldo, em inglês ==');
r=await diz(p,'I have 1000 in the bank');
console.log('   ', r.replace(/\n+/g,' | ').slice(0,140));
ok(/got it/i.test(r), 'confirma em inglês');
ok(/home screen/i.test(r), 'e explica em inglês');

r=await diz(p,'how much do i have?');
console.log('   ', r.replace(/\n+/g,' | ').slice(0,80));
ok(/you have/i.test(r), 'e responde à pergunta em inglês');

console.log('\n== a queixa do número vermelho, em espanhol ==');
let p2=await abrir();
await diz(p2,'gasté 200 en el mercado');
await diz(p2,'pagué 300 de alquiler');
r=await diz(p2,'eso no es un saldo negativo, arréglalo');
console.log('   ', r.replace(/\n+/g,' | ').slice(0,150));
ok(/no es su saldo/i.test(r), 'explica em espanhol que não é o saldo');
ok(/no es una deuda/i.test(r), 'e que não é uma dívida');
await p2.close();

console.log('\n== a interface segue a língua ==');
await p.close();
p=await abrir({lingua:'en'});
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(500);
let abas=await p.locator('.aba small').allInnerTexts();
console.log('   abas:', JSON.stringify(abas));
ok(abas.join(' ').includes('Home') && abas.join(' ').includes('Tools'), 'a barra fica em inglês');
let rot=await p.locator('.card.saldo .rot').innerText();
console.log('   rótulo:', rot);
ok(/free until/i.test(rot), 'e os rótulos também');
let gav=await p.locator('.gv-nome').allInnerTexts();
console.log('   gavetas:', gav.join(' · '));
ok(gav.join(' ').toLowerCase().includes('my month'), 'e as gavetas');
ok(await p.evaluate(()=>document.documentElement.lang)==='en', 'e a página declara-se em inglês');
await p.close();

console.log('\n== espanhol ==');
p=await abrir({lingua:'es'});
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(500);
abas=await p.locator('.aba small').allInnerTexts();
console.log('   abas:', JSON.stringify(abas));
ok(abas.join(' ').includes('Inicio') && abas.join(' ').includes('Herramientas'), 'barra em espanhol');
await p.close();

console.log('\n== português do Brasil ==');
p=await abrir({lingua:'br'});
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(500);
rot=await p.locator('.card.saldo .rot').innerText();
console.log('   rótulo:', rot);
ok(/fim do mês/i.test(rot) && !/ao fim/i.test(rot), 'diz "até o fim do mês" e não "até ao"');
const sub=await p.locator('#saudacao-sub').innerText();
console.log('   ', sub);
ok(/se faz sozinho/i.test(sub), 'e escreve como se escreve no Brasil');
await p.close();

console.log('\n== a app adivinha pelo telemóvel ==');
p=await abrir({sistema:'en-GB'});
const adivinhou=await p.evaluate(()=>idioma());
console.log('   telemóvel em en-GB →', adivinhou);
ok(adivinhou==='en', 'telemóvel em inglês, app em inglês');
await p.close();

p=await abrir({sistema:'pt-BR'});
ok(await p.evaluate(()=>idioma())==='br', 'telemóvel em pt-BR, app em português do Brasil');
await p.close();

console.log('\n== e dá para trocar à mão ==');
p=await abrir({lingua:'pt'});
await p.evaluate(()=>window.irEcra('mais')); await p.waitForTimeout(600);
const bts=await p.locator('.lingua-bt').allInnerTexts();
console.log('   opções:', JSON.stringify(bts));
ok(bts.length===4, 'há quatro línguas para escolher');
ok(await p.locator('.lingua-bt.escolhida').innerText()==='Português (Portugal)', 'com a actual marcada');
await p.locator('.lingua-bt', {hasText:'English'}).click();
await p.waitForTimeout(500);
abas=await p.locator('.aba small').allInnerTexts();
console.log('   depois de trocar:', JSON.stringify(abas));
ok(abas.join(' ').includes('Home'), 'trocar muda a app na hora');
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
ok((await p.locator('.aba small').allInnerTexts()).join(' ').includes('Home'), 'e fica guardado');
await p.close();

console.log('\n== nenhuma chave crua chega ao ecrã ==');
for (const l of ['pt','br','es','en']) {
  p=await abrir({lingua:l});
  await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
  const cru=await p.evaluate(()=>{
    const maus=[];
    document.querySelectorAll('[data-t]').forEach(e=>{
      if (e.textContent === e.getAttribute('data-t')) maus.push(e.getAttribute('data-t'));
    });
    return maus;
  });
  ok(cru.length===0, l+': nenhuma chave por traduzir'+(cru.length?' ('+cru.join(', ')+')':''));
  await p.close();
}

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
