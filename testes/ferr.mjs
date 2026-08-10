import { chromium } from 'playwright';
/* Os erros de rede ficam de fora da lista: numa maquina sem saida para a
   internet o Firebase falha sempre, e as vezes com um erro de certificado em
   vez de um nome de dominio. Um teste que reprova por causa disso ensina-se a
   ignorar — e a seguir ja' nao se ve' o que ele reprova com razao. O que fica
   na lista sao erros do javascript do proprio site, que sao os que interessam. */
const erros=[],falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});

/* Abre todas as caixas da pagina. Nao se decoram ids de caixas: o
   `ferramentas.js` pode reagrupar as ferramentas amanha, e isto continua a
   valer. */
async function abrirTodas(p){
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;}));
  await p.waitForTimeout(250);
}

for (const [nome,vp] of [['telemovel',{width:390,height:844}],['desktop',{width:1280,height:900}]]) {
  console.log(`\n===== ${nome} =====`);
  const p=await b.newPage({viewport:vp,isMobile:vp.width<500,hasTouch:vp.width<500});
  p.on('pageerror',e=>erros.push(`${nome}: ${e.message}`));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/gstatic|googleapis|firebase|font|TUNNEL|RESET|net::ERR_|CERT_/i.test(t)) erros.push(`${nome}: ${t}`);});
  await p.goto('http://127.0.0.1:8930/ferramentas.html',{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(600);

  ok(await p.locator('.ferramenta').count()===10, `10 ferramentas (${await p.locator('.ferramenta').count()})`);
  ok(await p.locator('.ferramenta.trancada').count()===3, `3 trancadas sem chave`);

  /* Cada ferramenta passou a nascer fechada, arrumada num `<details>` dentro
     do seu grupo — uma pagina com onze ferramentas abertas nao e' uma pagina,
     e' uma parede. Este teste clicava nos botoes de calcular sem abrir a caixa
     onde eles vivem, e rebentava desde essa arrumacao sem ninguem dar por
     isso, porque o `correr.sh` nao sabia falhar.

     Abrem-se todas de uma vez: o que esta suite verifica e' a aritmetica das
     calculadoras e o que fica trancado sem chave, e nao a arrumacao (essa e' o
     `teste-app.mjs` que a guarda). */
  await abrirTodas(p);

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

  /* O painel da chave so' aparece depois de o Firebase carregar do
     `gstatic.com`. Numa maquina sem saida para a internet ele nunca chega, e
     isso nao e' defeito do site — esta' escrito no README. Antes, o teste
     rebentava com um `Timeout` de trinta segundos que parecia uma avaria;
     agora diz o que se passou e segue. */
  const temPainel = await p.locator('#c-chave').isVisible().catch(()=>false);
  if (!temPainel) {
    console.log('  -- saltado: o painel da chave nao carregou (Firebase/gstatic sem rede)');
  } else {
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
    await abrirTodas(p);
    await p.click('#a-calc'); await p.waitForTimeout(250);
    ok((await p.locator('#a-out').innerText()).length>10, 'plano de 12 meses calcula');
    ok(await p.locator('#a-tabela li').count()===12, `tabela com 12 meses (${await p.locator('#a-tabela li').count()})`);
  }

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
/* O preco mudou de 4,90 € por mes para 9,89 € por um ano inteiro, e o teste
   ficou a pedir o antigo. Passa a verificar os dois numeros que a pagina tem
   de mostrar — o zero da parte gratis e o preco da chave — em vez de um
   numero solto, porque a coluna gratis a dizer "0 €" e' metade da promessa. */
const txtPremium = await p.locator('body').innerText();
ok(/9,89\s*€/.test(txtPremium), 'o preco da chave esta' + "'" + ' visivel');
ok(/0\s*€/.test(txtPremium), 'e o "0 €" da parte gratis tambem');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'premium sem deslize');
await p.screenshot({path:'/tmp/vf16-premium.png'});
await p.close();

/* O `app.html` saiu da lista: nao e' uma pagina do site, e' um desvio de tres
   linhas que manda para `/app/`. Nao tem menu nem deve ter, e estava a fazer
   este bloco falhar a pedir-lhe uma coisa que ele nunca vai ter. */
for (const pag of ['index','conta','sobre','metodo','ferramentas','premium']) {
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

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length || erros.length) process.exit(1);
