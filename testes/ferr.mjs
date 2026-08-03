import { chromium } from 'playwright';
const erros=[],falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});

for (const [nome,vp] of [['telemovel',{width:390,height:844}],['desktop',{width:1280,height:900}]]) {
  console.log(`\n===== ${nome} =====`);
  const p=await b.newPage({viewport:vp,isMobile:vp.width<500,hasTouch:vp.width<500});
  p.on('pageerror',e=>erros.push(`${nome}: ${e.message}`));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/gstatic|googleapis|firebase|font|TUNNEL|RESET/i.test(t)) erros.push(`${nome}: ${t}`);});
  await p.goto('http://127.0.0.1:8930/ferramentas.html',{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(600);

  ok(await p.locator('.ferramenta').count()===10, `10 ferramentas (${await p.locator('.ferramenta').count()})`);
  ok(await p.locator('.ferramenta.trancada').count()===3, `3 trancadas sem chave`);

  // as 6 gratuitas calculam
  for (const pre of ['p','r','q','d','e','h']) {
    await p.click(`#${pre}-calc`);
    await p.waitForTimeout(150);
    const t=await p.locator(`#${pre}-out`).innerText();
    ok(t.length>10, `${pre}: calcula -> ${t.split('\n')[0]} ${t.split('\n')[1]||''}`);
  }
  // aritmetica do parcelar: 12 x 45,90 = 550,80 ; a mais = 70,80
  const q=await p.locator('#q-out').innerText();
  ok(/550,80/.test(q) && /70,80/.test(q), 'parcelar: 550,80 e 70,80 corretos');

  // premium trancado nao calcula
  const disabled = await p.evaluate(()=>document.getElementById('a-calc').disabled);
  ok(disabled===true, 'botao premium desativado sem chave');

  // chave invalida
  await p.fill('#c-chave','VF-1234-5678-0');
  await p.click('#form-chave button[type=submit]');
  await p.waitForTimeout(300);
  ok(/n[aã]o [eé] v[aá]lida/i.test(await p.locator('#aviso-chave').innerText()), 'chave inventada recusada');

  // chave valida
  await p.fill('#c-chave','VF-UM6B-RA7B-8');
  await p.click('#form-chave button[type=submit]');
  await p.waitForTimeout(400);
  ok(await p.locator('.ferramenta.trancada').count()===0, 'chave valida destranca as 3');
  await p.click('#a-calc'); await p.waitForTimeout(250);
  ok((await p.locator('#a-out').innerText()).length>10, 'plano de 12 meses calcula');
  ok(await p.locator('#a-tabela li').count()===12, `tabela com 12 meses (${await p.locator('#a-tabela li').count()})`);

  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1), 'sem deslize lateral');
  if(vp.width===390) await p.screenshot({path:'/tmp/vf16-ferr-mobile.png'});
  else await p.screenshot({path:'/tmp/vf16-ferr-desktop.png'});
  await p.close();
}

// premium.html + menus
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
p.on('pageerror',e=>erros.push('premium: '+e.message));
await p.goto('http://127.0.0.1:8930/premium.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
ok(await p.locator('.plano').count()===2,'premium.html tem as duas colunas');
ok(/4,90/.test(await p.locator('body').innerText()),'preco visivel');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'premium sem deslize');
await p.screenshot({path:'/tmp/vf16-premium.png'});
await p.close();

for (const pag of ['index','app','conta','sobre','metodo','ferramentas','premium']) {
  const q=await b.newPage({viewport:{width:1280,height:900}});
  await q.goto(`http://127.0.0.1:8930/${pag}.html`,{waitUntil:'domcontentloaded'});
  await q.waitForTimeout(250);
  const m=await q.evaluate(()=>[...document.querySelectorAll('#menu a')].map(a=>a.textContent.trim()));
  ok(m.includes('Ferramentas'), `${pag}: menu -> ${m.join(' · ')}`);
  await q.close();
}
await b.close();
console.log(`\n=== ${falhas.length?'FALHAS: '+falhas.join(' | '):'TODAS PASSARAM'} ===`);
console.log('erros JS:',erros.length?erros.join(' | '):'nenhum');
