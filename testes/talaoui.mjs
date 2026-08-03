/* O caminho completo: fotografia do talao -> OCR no proprio telemovel ->
   proposta -> movimento gravado, com foto agarrada. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
const T='/tmp/claude-0/-home-user-tecnova-digital/c11833be-0b79-51cc-ab28-7c88aae60061/scratchpad/talos/';

async function abrir({chave=true, ocrJaCa=false}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({k,ja})=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
    try{
      /* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
      localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
      localStorage.setItem('vf:banner-fechado','1');
      if(k) localStorage.setItem('vf:chave', window.__chave);
      if(ja) localStorage.setItem('vf:ocr-ca','1');
    }catch(e){}
  },{k:chave,ja:ocrJaCa});
  return p;
}
function dig(c){let s=0;for(let i=0;i<c.length;i++)s+=c.charCodeAt(i)*(i+2);return s%10;}
const f=new Date(); f.setMonth(f.getMonth()+12);
const aamm=String(f.getFullYear()%100).padStart(2,'0')+String(f.getMonth()+1).padStart(2,'0');
const CHAVE='VF'+aamm+'AB23'+dig(aamm+'AB23');

async function entrar(p,{ocrJaCa=false}={}){
  await p.addInitScript(({c,ja})=>{ try{ localStorage.setItem('vf:chave',c);
    if(ja) localStorage.setItem('vf:ocr-ca','1'); }catch(e){} },{c:CHAVE,ja:ocrJaCa});
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1000);
  await p.evaluate(()=>window.irEcra('wesley'));
  await p.waitForTimeout(400);
}
const ultima = async p => {
  const t=await p.locator('.msg.ele .msg-txt').allInnerTexts();
  return t[t.length-1];
};

console.log('== a pergunta antes dos 4 MB ==');
let p=await abrir({chave:false});
await entrar(p);
await p.setInputFiles('#assist-ficheiro', T+'continente.png');
await p.waitForTimeout(1500);
let msg=await ultima(p);
console.log('   ', msg.replace(/\n/g,' | ').slice(0,180));
ok(/quer que eu tente ler o tal/i.test(msg), 'pergunta antes de descarregar seja o que for');
ok(/4,3 MB/.test(msg), 'e diz quantos megabytes são');
ok(/uma vez só/i.test(msg), 'e que é uma vez só');
ok(/nunca sai do seu telemóvel/i.test(msg), 'e que a fotografia não sai do aparelho');
let bts=await p.locator('.msg.ele:last-child .msg-accao').allInnerTexts();
console.log('   botões:', JSON.stringify(bts));
ok(bts.length===2 && /ler o talão/i.test(bts[0]), 'com um sim e um não');

console.log('\n== "escrevo eu" não descarrega nada ==');
await p.locator('.msg.ele:last-child .msg-accao').nth(1).click();
await p.waitForTimeout(600);
ok(/escreva quanto foi/i.test(await ultima(p)), 'quem diz que escreve, escreve');
const pediuMotor = await p.evaluate(()=>performance.getEntriesByType('resource')
  .some(r=>/vendor\/ocr/.test(r.name)));
ok(pediuMotor===false, 'e não se foi buscar um único byte do motor');
await p.close();

console.log('\n== ler mesmo o talão do Continente ==');
p=await abrir({chave:false});
await entrar(p);
await p.setInputFiles('#assist-ficheiro', T+'continente.png');
await p.waitForTimeout(1200);
await p.locator('.msg.ele:last-child .msg-accao').first().click();
await p.waitForFunction(()=>{
  const t=document.querySelectorAll('.msg.ele .msg-txt');
  return t.length && /Li o talão|Acho que li|não encontrei|Não consegui/.test(t[t.length-1].innerText);
},{timeout:120000});
msg=await ultima(p);
console.log('   ', msg.replace(/\n/g,' | '));
ok(/li o talão/i.test(msg), 'leu o talão com confiança');
ok(/14,58/.test(msg), 'e o valor é 14,58 — o total, não a soma dos artigos');
ok(/continente/i.test(msg), 'e sabe que foi no Continente');

console.log('\n== "sim, lança" grava mesmo ==');
await p.locator('.msg.ele:last-child .msg-accao').first().click();
await p.waitForTimeout(900);
msg=await ultima(p);
console.log('   ', msg.replace(/\n/g,' | '));
ok(/lançado/i.test(msg), 'diz que lançou');
const guardado=await p.evaluate(()=>{
  const m=JSON.parse(localStorage.getItem('vf:movimentos')||'[]');
  const f=JSON.parse(localStorage.getItem('vf:fotos')||'{}');
  const u=m[m.length-1];
  return {n:m.length, tipo:u&&u.tipo, valor:u&&u.valor, cat:u&&u.categoria,
          desc:u&&u.descricao, data:u&&u.data, temFoto: !!(u&&f[u.id])};
});
console.log('   na base:', JSON.stringify(guardado));
ok(guardado.n===1, 'há um movimento gravado');
ok(guardado.valor===14.58, 'com o valor do talão');
ok(guardado.tipo==='saida' && guardado.cat==='mercado', 'como saída, em mercado');
ok(/continente/i.test(guardado.desc||''), 'com o nome da loja na descrição');
ok(guardado.temFoto===true, 'e com a fotografia agarrada');

console.log('\n== e o mês conta com ele ==');
await p.evaluate(()=>window.irEcra('inicio'));
await p.waitForTimeout(700);
const noEcra=await p.locator('#v-livre').innerText();
console.log('   livre no ecrã:', noEcra);
ok(/14,58|−|-/.test(await p.locator('.resumo').innerText()) || noEcra!=='—',
   'o painel já mostra o efeito do talão');
await p.close();

console.log('\n== da segunda vez não pergunta ==');
p=await abrir({chave:false});
await entrar(p,{ocrJaCa:true});
await p.setInputFiles('#assist-ficheiro', T+'bomba.png');
await p.waitForFunction(()=>{
  const t=document.querySelectorAll('.msg.ele .msg-txt');
  return t.length && /Li o talão|Acho que li|não encontrei|Não consegui/.test(t[t.length-1].innerText);
},{timeout:120000});
msg=await ultima(p);
console.log('   ', msg.replace(/\n/g,' | '));
ok(!/quer que eu tente/i.test(msg), 'não volta a perguntar a quem já descarregou');
ok(/55,24/.test(msg), 'e lê o talão da bomba: 55,24');
const textoTodo=(await p.locator('.msg.ele .msg-txt').allInnerTexts()).join(' ');
ok(!/4,3 MB/.test(textoTodo), 'e não fala de megabytes nenhuns');

console.log('\n== o combustível vai para transporte, não para contas ==');
await p.locator('.msg.ele:last-child .msg-accao').first().click();
await p.waitForTimeout(900);
const g2=await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('vf:movimentos')||'[]');
  return m[m.length-1];});
console.log('   ', JSON.stringify({v:g2.valor,c:g2.categoria,d:g2.descricao}));
ok(g2.categoria==='transporte', 'um talão da Galp com litros é transporte');
await p.close();

console.log('\n== sem assinatura nem mês, nem se chega ao talão ==');
p=await abrir({chave:false});
await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(1000);
await p.evaluate(()=>window.irEcra('wesley'));
await p.waitForTimeout(300);
await p.setInputFiles('#assist-ficheiro', T+'continente.png');
await p.waitForTimeout(900);
msg=await ultima(p);
console.log('   ', msg.replace(/\n/g,' | ').slice(0,140));
ok(/assinatura|mês inteiro/i.test(msg), 'é dito que faz parte da assinatura');
ok(!/quer que eu tente/i.test(msg), 'e não se pergunta por megabytes a quem não pode usar');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
