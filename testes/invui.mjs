/* O ecra de investir: na gaveta da app e na seccao do site. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';

async function abrir(url,{lingua='pt',moeda='EUR'}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({l,m})=>{
    const perfil={};
    const doc={get:()=>Promise.resolve({exists:false,data:()=>perfil}),
               set:()=>Promise.resolve(), delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},
      auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),60)},signOut(){}}),
      firestore:()=>({collection:col})};
    try{localStorage.setItem('vf:lingua',l);
        localStorage.setItem('vf:moeda',m);
        localStorage.setItem('vf:banner-fechado','1');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,pedidoAposConta:true}));
        localStorage.setItem('vf:movimentos',JSON.stringify([{id:'m1',tipo:'saida',valor:30,
          categoria:'mercado',descricao:'Continente',data:new Date().toISOString().slice(0,10),
          criado:Date.now(),conta:'minha',moeda:m||'EUR'}]));
    }catch(e){}
  },{l:lingua,m:moeda});
  await p.goto(B+url,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1200);
  /* Na aplicacao a gaveta vive no separador das Ferramentas, e o
     `ferramentas.js` arruma-a dentro do grupo de quem quer guardar dinheiro.
     Sem passar pelo separador, o `details` existe no documento mas nao esta'
     visivel — e clicar no que nao se ve' e' testar o documento, nao a
     aplicacao. Na pagina solta (`ferramentas.html`) nao ha separadores, por
     isso so' se faz isto na app. */
  if (url.startsWith('/app')) {
    await p.click('.aba[data-ecra="mais"]');
    await p.waitForTimeout(400);
  }
  return p;
}

/* Abre a caixa `<details>` que envolve um elemento, seja ela qual for. Vale
   mais do que decorar o id da caixa: o `ferramentas.js` pode reagrupar as
   ferramentas amanha, e isto continua a valer. */
async function abrirCaixa(p, dentro){
  await p.evaluate(sel=>{
    const el=document.querySelector(sel); if(!el) return;
    let d=el.closest('details');
    while(d){ d.open=true; d=d.parentElement && d.parentElement.closest('details'); }
  }, dentro);
  await p.waitForTimeout(250);
}

console.log('== na aplicacao, em portugues e em euros ==');
let p=await abrir('/app/');
ok(await p.locator('#gaveta-investir').count()===1, 'a gaveta existe');
await p.locator('#gaveta-investir > summary').click();
await p.waitForTimeout(300);
ok(await p.locator('#investir-corpo .inv-aviso').isVisible(), 'o aviso aparece antes de tudo');
ok(await p.locator('#investir-corpo .inv-opcao').count()===3, 'ha tres sitios onde por o dinheiro');
const nomes=await p.locator('#investir-corpo .inv-opcao summary b').allInnerTexts();
console.log('   ',nomes.join(' | '));
ok(nomes.join(' ').includes('Aforro'), 'em euros mostram-se os produtos portugueses');
ok(!/inv\./.test(await p.locator('#investir-corpo').innerText()), 'nenhuma chave de traducao a' + "'" + ' mostra');

console.log('\n-- a calculadora --');
await p.fill('#inv-inicial','1000');
await p.fill('#inv-mensal','50');
await p.fill('#inv-anos','10');
await p.fill('#inv-taxa','5');
await p.waitForTimeout(250);
const grande=await p.locator('#inv-resultado .inv-grande').innerText();
console.log('   ao fim de 10 anos:',grande);
/* 1000 + 50/mes a 5% durante 10 anos: bruto ~9411, posto 7000, liquido ~8736 */
const n=parseInt(grande.replace(/[^\d]/g,''),10);
ok(n>8500 && n<9000, 'o numero grande bate com a conta feita a mao ('+n+')');
ok(grande.includes('€'), 'e vem em euros');
ok(await p.locator('#inv-resultado .inv-tabela tr').count()===11, 'a tabela tem cabecalho e dez anos');
const detalhe=await p.locator('#inv-resultado .inv-detalhe').innerText();
console.log('   ',detalhe.replace(/\n/g,' / '));
ok(/28/.test(detalhe), 'o imposto portugues de 28% esta la');

console.log('\n-- mudar de pais muda tudo --');
await p.locator('.inv-pais', {hasText:'Brasil'}).click();
await p.waitForTimeout(400);
const nomes2=await p.locator('#investir-corpo .inv-opcao summary b').allInnerTexts();
console.log('   ',nomes2.join(' | '));
ok(nomes2.join(' ').includes('Selic'), 'no Brasil mostram-se os produtos brasileiros');
const g2=await p.locator('#inv-resultado .inv-grande').innerText();
console.log('   ',g2);
ok(/R\$/.test(g2), 'e a conta passa a ser em reais');
const det2=await p.locator('#inv-resultado .inv-detalhe').innerText();
ok(/15/.test(det2), 'com o imposto brasileiro de 15% aos dez anos');
await p.close();

console.log('\n== a app em ingles ==');
p=await abrir('/app/',{lingua:'en'});
await p.locator('#gaveta-investir > summary').click();
await p.waitForTimeout(300);
const ing=await p.locator('#investir-corpo').innerText();
ok(/Where money is safe/i.test(ing), 'o titulo esta em ingles');
ok(/Who guarantees it/i.test(ing) || /guarantee/i.test(ing), 'as etiquetas tambem');
await p.locator('#investir-corpo .inv-opcao').first().click();
await p.waitForTimeout(200);
const corpo=await p.locator('#investir-corpo .inv-opcao').first().innerText();
console.log('   ',corpo.split('\n').slice(0,3).join(' / '));
ok(/The State itself owes/i.test(corpo), 'e o que se le sobre cada produto tambem');
await p.close();

console.log('\n== a app em espanhol ==');
p=await abrir('/app/',{lingua:'es',moeda:'BRL'});
await p.locator('#gaveta-investir > summary').click();
await p.waitForTimeout(300);
await p.locator('#investir-corpo .inv-opcao').first().click();
await p.waitForTimeout(200);
const esp=await p.locator('#investir-corpo').innerText();
ok(/Dónde está seguro el dinero en Brasil/i.test(esp), 'em espanhol e no Brasil, por a moeda ser reais');
ok(/Tesoro Nacional/i.test(esp)||/Gobierno Federal/i.test(esp), 'com o texto em espanhol');
await p.close();

console.log('\n== no site, na pagina das ferramentas ==');
p=await abrir('/ferramentas.html');
ok(await p.locator('#investir-corpo .inv-opcao').count()===3, 'a seccao do site desenha-se sozinha');
/* Na pagina solta o "render" tambem passou a ser uma caixa que nasce fechada,
   como todas as outras — uma pagina de onze ferramentas abertas nao e' uma
   pagina, e' uma parede. Abre-se antes de se escrever la' dentro. */
await abrirCaixa(p, '#investir-corpo');
await p.fill('#inv-inicial','2000');
await p.waitForTimeout(250);
const gs=await p.locator('#inv-resultado .inv-grande').innerText();
console.log('   ',gs);
ok(/\d/.test(gs), 'e a calculadora funciona no site');
ok((await p.locator('#investir-corpo .cadeado').count())===0, 'e nao esta atras de assinatura');
await p.close();

console.log('\n== um brasileiro que chega ao site pela lingua ==');
p=await abrir('/ferramentas.html',{lingua:'br',moeda:''});
await abrirCaixa(p, '#investir-corpo');
const txt=await p.locator('#investir-corpo').innerText();
ok(/Brasil/.test(txt.split('\n')[1]||txt), 'sem moeda guardada, a lingua do Brasil abre no Brasil');
console.log('   ',txt.split('\n').slice(0,4).join(' / '));
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
