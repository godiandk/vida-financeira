/* A conferencia de inicio de mes: acertar os saldos com o banco, sem apagar
   nem inventar lancamentos. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
function dig(c){let s=0;for(let i=0;i<c.length;i++)s+=c.charCodeAt(i)*(i+2);return s%10;}
const f=new Date(); f.setMonth(f.getMonth()+12);
const aamm=String(f.getFullYear()%100).padStart(2,'0')+String(f.getMonth()+1).padStart(2,'0');
const CHAVE='VF'+aamm+'AB23'+dig(aamm+'AB23');

async function abrir(extra){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({c,x})=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
    try{/* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
        localStorage.setItem('vf:banner-fechado','1');
        localStorage.setItem('vf:chave',c);
        Object.keys(x||{}).forEach(k=>localStorage.setItem(k, typeof x[k]==='string'?x[k]:JSON.stringify(x[k])));
    }catch(e){}
  },{c:CHAVE,x:extra});
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1100);
  /* Sem movimentos, a app abre no chat. Isto vive no Inicio. */
  await p.evaluate(()=>window.irEcra('inicio'));
  await p.waitForTimeout(400);
  return p;
}
const agora = Date.now()-86400000;

console.log('== não aparece a quem não tem nada declarado ==');
let p=await abrir();
ok(await p.locator('#conferir').isHidden(), 'sem carteiras, não há nada a conferir');
await p.close();

console.log('== aparece a quem tem ==');
p=await abrir({'vf:carteiras':{minha:{valor:900,em:agora}, emergencia:{valor:2000,em:agora}},
               'vf:dividatotal':{valor:1500,em:agora}});
ok(await p.locator('#conferir').isVisible(), 'com carteiras, pergunta');
let t=await p.locator('#conferir').innerText();
console.log('   ', t.replace(/\n+/g,' | '));
ok(/batem certo com o seu banco/i.test(t), 'pergunta se os números batem certo');
ok(/está certo/i.test(t) && /quero acertar/i.test(t), 'com duas respostas');

console.log('\n== "está certo" fecha e não volta ==');
await p.locator('.mini-btn', {hasText:'Está certo'}).click();
await p.waitForTimeout(400);
ok(await p.locator('#conferir').isHidden(), 'desaparece');
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1100);
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
ok(await p.locator('#conferir').isHidden(), 'e não volta neste mês');
await p.close();

console.log('\n== "quero acertar" abre os campos ==');
p=await abrir({'vf:carteiras':{minha:{valor:900,em:agora}, parceiro:{valor:400,em:agora}, emergencia:{valor:2000,em:agora}},
               'vf:lar':{comQuem:'marido'},
               'vf:dividatotal':{valor:1500,em:agora}});
await p.locator('.mini-btn', {hasText:'Quero acertar'}).click();
await p.waitForTimeout(400);
const rotulos=await p.locator('#conferir .field label').allInnerTexts();
console.log('   campos:', JSON.stringify(rotulos));
ok(rotulos.length===4, 'um campo por carteira, mais a dívida');
ok(rotulos.some(x=>/conta dele/i.test(x)), 'com o nome certo da conta do marido');
ok(rotulos.some(x=>/devem/i.test(x)), 'e a dívida');

console.log('\n== guardar acerta só o que se escreveu ==');
const inps=p.locator('#conferir .field input');
await inps.nth(0).fill('850');
await inps.nth(3).fill('1200');
await p.locator('.mini-btn', {hasText:'Guardar'}).click();
await p.waitForTimeout(600);
const dep=await p.evaluate(()=>({
  minha: saldoDaCarteira('minha'), parceiro: saldoDaCarteira('parceiro'),
  emergencia: saldoDaCarteira('emergencia'), divida: dividaTotal.valor,
  movimentos: movimentos.length
}));
console.log('   ', JSON.stringify(dep));
ok(dep.minha===850, 'a conta que se escreveu mudou');
ok(dep.divida===1200, 'a dívida também');
ok(dep.parceiro===400 && dep.emergencia===2000, 'e as que ficaram em branco não mexeram');
ok(dep.movimentos===0, 'e não se inventou lançamento nenhum');
ok(await p.locator('#conferir').isHidden(), 'e a conferência fecha-se');

console.log('\n== o Início mostra já os números novos ==');
const tela=await p.locator('#v-conta').innerText();
console.log('   ', tela.replace(/\n+/g,' | '));
ok(/850/.test(tela) && /1\s?200/.test(tela), 'com o saldo e a dívida acertados');
await p.close();

console.log('\n== "deixa estar" não mexe em nada ==');
p=await abrir({'vf:carteiras':{minha:{valor:900,em:agora}}});
await p.locator('.mini-btn', {hasText:'Quero acertar'}).click();
await p.waitForTimeout(400);
await p.locator('#conferir .field input').first().fill('123');
await p.locator('.mini-btn', {hasText:'Deixa estar'}).click();
await p.waitForTimeout(400);
const m=await p.evaluate(()=>saldoDaCarteira('minha'));
ok(m===900, 'o que se escreveu e não se guardou não conta (deu '+m+')');
await p.close();

console.log('\n== num mês passado não se pergunta nada ==');
p=await abrir({'vf:carteiras':{minha:{valor:900,em:agora}}});
await p.locator('#mes-antes').click();
await p.waitForTimeout(500);
ok(await p.locator('#conferir').isHidden(), 'conferir saldos em Março passado não faz sentido');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
