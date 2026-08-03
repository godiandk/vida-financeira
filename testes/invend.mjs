/* Chegar a' gaveta de investir pelo endereco e pelo banner. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';
const hoje=new Date().toISOString().slice(0,10);

async function abrir(url,{banner=false}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({d,semBanner})=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),
               set:()=>Promise.resolve(), delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},
      auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),60)},signOut(){}}),
      firestore:()=>({collection:col})};
    try{localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
        if(semBanner) localStorage.setItem('vf:banner-fechado','1');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,pedidoAposConta:true}));
        localStorage.setItem('vf:movimentos',JSON.stringify([{id:'m1',tipo:'saida',valor:30,
          categoria:'mercado',descricao:'Continente',data:d,criado:Date.now(),conta:'minha',moeda:'EUR'}]));
    }catch(e){}
  },{d:hoje,semBanner:!banner});
  await p.goto(B+url,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1300);
  return p;
}

console.log('== app/#investir abre a gaveta ==');
let p=await abrir('/app/#investir');
ok(await p.locator('#gaveta-investir').evaluate(e=>e.open), 'a gaveta abriu-se sozinha');
ok(await p.locator('#investir-corpo .inv-opcao').count()===3, 'e ja' + "'" + ' esta desenhada');
await p.close();

console.log('\n== e os outros enderecos que estavam partidos ==');
/* `app/#divida` deixou de abrir nada quando os ecras passaram a gavetas: o
   `ecra-divida` deixou de existir e ninguem deu por isso. */
for (const nome of ['divida','contas','lancar','apoios','mais']) {
  p=await abrir('/app/#'+nome);
  ok(await p.locator('#gaveta-'+nome).evaluate(e=>e.open), 'app/#'+nome+' abre a gaveta certa');
  await p.close();
}

console.log('\n== o banner fala do sitio e leva la ==');
p=await abrir('/app/',{banner:true});
const textos=await p.evaluate(()=>{
  const m=(typeof bannerMensagens==='function')?bannerMensagens():[];
  return m.map(x=>x.etiqueta);
});
console.log('   ', textos.join(' | '));
ok(textos.some(t=>/onde pôr/i.test(t)), 'ha uma mensagem sobre onde por o dinheiro');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
