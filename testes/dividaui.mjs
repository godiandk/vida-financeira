import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const hoje=new Date(), iso=d=>d.toISOString().slice(0,10);

// Uma compra em 12 vezes de 45,90, com 8 prestacoes ainda por vencer.
const movs=[];
for(let k=0;k<12;k++){
  const d=new Date(hoje.getFullYear(),hoje.getMonth()-3+k,10);
  movs.push({id:'p'+k,tipo:'saida',valor:45.9,categoria:'dividas',descricao:'Máquina',
             data:iso(d),moeda:'EUR',parc:{g:'gp',n:k+1,de:12,tot:550.8}});
}

async function app(moeda='EUR', comParc=true){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({m,mo,c})=>{try{
    /* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda',mo);
    localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
    if(c) localStorage.setItem('vf:movimentos',JSON.stringify(m));
  }catch(e){}},{m:movs,mo:moeda,c:comParc});
  await p.goto('http://127.0.0.1:8930/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1100);
  await p.evaluate(()=>window.irEcra('divida')); await p.waitForTimeout(600);
  return p;
}

console.log('== chega la e preenche-se sozinho ==');
let p=await app();
/* Os ecras separados viraram gavetas de uma pagina so'. O destino continua a
   ser o mesmo — o que muda e' que agora se chega la' sem sair do sitio. */
ok(await p.locator('#gaveta-divida').evaluate(g=>g.open), 'a gaveta da divida abre');
ok(await p.locator('#dv-deve').isVisible(), 'e os campos ficam a' + "'" + ' vista');
ok(await p.locator('#divida-lancada').isVisible(), 'diz que usou as prestacoes ja lancadas');
const nota=await p.locator('#divida-lancada').innerText();
console.log('   → '+nota);
const deve=await p.locator('#dv-deve').inputValue();
const paga=await p.locator('#dv-paga').inputValue();
console.log('   deve:', deve, '| paga:', paga);
ok(Number(deve.replace(',','.'))>0, 'o quanto deve veio preenchido');
ok(paga.replace(',','.')==='45.9', 'e o quanto paga por mes e o valor de UMA prestacao');

console.log('\n== antes de escolher o juro, nao inventa ==');
ok((await p.locator('#divida-corpo').innerText()).includes('Escolha'), 'pede para escolher o juro');

console.log('\n== com a referencia portuguesa ==');
await p.locator('#dv-ref').evaluate(e=>e.click()); await p.waitForTimeout(500);
ok((await p.locator('#dv-ref').innerText()).includes('Portugal'), 'o botao diz de que pais e');
const fonte=await p.locator('#dv-fonte').innerText();
console.log('   fonte: '+fonte);
ok(/18,5/.test(fonte) && /Banco de Portugal/.test(fonte), 'com a fonte e o valor');
ok(/2026/.test(fonte), 'e com data');

// O CSS poe os rotulos em maiusculas, e o innerText devolve o texto tal como
// e' desenhado — comparar com minusculas falhava sem haver defeito nenhum.
const conta=(await p.locator('#divida-corpo').innerText());
console.log('   --- a conta ---\n   '+conta.replace(/\n/g,'\n   '));
ok(/vai pagar ao todo/i.test(conta), 'diz o total');
ok(/só de juro/i.test(conta), 'e quanto e juro');
ok(/tempo até acabar/i.test(conta), 'e quanto tempo falta');
ok(/RACE/.test(conta), 'e onde ha ajuda gratuita em Portugal');
await p.screenshot({path:'/tmp/v-divida-pt.png'});
await p.close();

console.log('\n== o rotativo brasileiro: a divida cresce ==');
p=await app('BRL');
await p.locator('#dv-ref').evaluate(e=>e.click()); await p.waitForTimeout(500);
ok((await p.locator('#dv-ref').innerText()).includes('Brasil'), 'a referencia muda com o pais');
const cru=await p.locator('#divida-corpo').innerText();
console.log('   --- a conta ---\n   '+cru.replace(/\n/g,'\n   '));
ok(/está a crescer/i.test(cru), 'avisa que a divida cresce');
ok(/nunca acaba/i.test(cru), 'e que a esse ritmo nunca acaba');
ok(/começar a descer/i.test(cru), 'e diz onde esta a linha');
ok(!/deve pagar|tem de|aconselho|recomendo/i.test(cru), 'sem dizer a ninguem o que fazer');
await p.screenshot({path:'/tmp/v-divida-br.png'});
await p.close();

console.log('\n== escrever o meu proprio juro ==');
p=await app();
await p.locator('#dv-meu').evaluate(e=>e.click()); await p.waitForTimeout(400);
ok(await p.locator('#dv-meu-zona').isVisible(), 'aparece o campo do juro');
ok(await p.locator('#dv-fonte').isHidden(), 'e a fonte da referencia desaparece');
await p.fill('#dv-taxa','0');
await p.waitForTimeout(500);
const semJuro=await p.locator('#divida-corpo').innerText();
ok(/vai pagar ao todo/i.test(semJuro), 'com juro zero tambem faz a conta');
ok(/0,00/.test(semJuro), 'e o juro dá zero');
await p.close();

console.log('\n== sem prestacoes lancadas ==');
p=await app('EUR', false);
ok(await p.locator('#divida-lancada').isHidden(), 'nao inventa numeros que nao existem');
await p.locator('#dv-ref').evaluate(e=>e.click()); await p.waitForTimeout(400);
ok(/escreva quanto ainda deve/i.test(await p.locator('#divida-corpo').innerText()), 'e pede os numeros');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
