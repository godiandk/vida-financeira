/* O banner rotativo: na página de entrada e dentro da aplicação.
   O que se verifica aqui é sobretudo o que ele NÃO faz — não vender a quem
   já pagou, não voltar depois de fechado, não rodar por baixo do dedo. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';

async function abrir(url,{estado={},sessao=false,reduzido=false,perfil=null}={}){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    reducedMotion: reduzido?'reduce':'no-preference'});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(({est,s,pf})=>{
    /* O perfil que o Firestore ja tem. Sem isto, o site.js olhava para uma
       ficha vazia e comecava um mes novo — apagando o que o teste semeou. */
    window.__perfil = pf ? JSON.parse(JSON.stringify(pf)) : null;
    const doc={get:()=>Promise.resolve({exists:!!window.__perfil,data:()=>window.__perfil||{}}),
               set:(v)=>{window.__perfil=Object.assign({},window.__perfil||{},v);return Promise.resolve()},
               delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),
      orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},
      auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(s?{uid:'u1',email:'a@x.pt'}:null),40)},signOut(){}}),
      firestore:()=>({collection:col})};
    try{
      /* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
      localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));
      Object.keys(est).forEach(k=>localStorage.setItem(k,est[k]));
    }catch(e){}
  },{est:estado,s:sessao,pf:perfil});
  await p.goto(B+url,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(900);
  /* Dentro da aplicacao, quem nao tem nada lancado abre no chat — e no chat o
     banner cala-se de proposito. Os testes que querem ve-lo vao ao Inicio. */
  if (/\/app\//.test(url)) {
    await p.evaluate(()=>{ if (typeof window.irEcra==='function') window.irEcra('inicio'); });
    await p.waitForTimeout(400);
  }
  return p;
}
const etiqueta = p => p.locator('#banner-corpo .bn-etiqueta').innerText();
const texto    = p => p.locator('#banner-corpo .bn-texto').innerText();

console.log('== página de entrada: aparece e diz o que interessa ==');
let p=await abrir('/index.html');
ok(await p.locator('#banner').isVisible(), 'o banner está à vista');
let e1=await etiqueta(p), t1=await texto(p);
console.log('   1ª mensagem:', e1, '|', t1.slice(0,60));
ok(/mês grátis/i.test(e1), 'começa pelo mês grátis a quem não tem conta');
ok(/crie conta/i.test(t1), 'e diz "crie conta"');
const bt=p.locator('#banner-corpo .bn-accao');
ok(await bt.count()===1 && /criar conta/i.test(await bt.innerText()), 'com botão para criar conta');
ok(/conta\.html$/.test(await bt.getAttribute('href')||''), 'que aponta mesmo para a página da conta');

const nPontos=await p.locator('.bn-ponto').count();
console.log('   pontos:', nPontos);
ok(nPontos===8, 'há um ponto por mensagem (8)');
ok(await p.locator('.bn-ponto[aria-selected="true"]').count()===1, 'e só um está marcado');

console.log('\n== roda sozinho ==');
await p.waitForTimeout(7600);
let e2=await etiqueta(p);
console.log('   passou para:', e2);
ok(e2!==e1, 'ao fim de sete segundos mudou de mensagem');
const marcado=await p.locator('.bn-ponto').nth(1).getAttribute('aria-selected');
ok(marcado==='true', 'e o ponto marcado acompanhou');
await p.close();

console.log('\n== os pontos levam à mensagem escolhida ==');
p=await abrir('/index.html');
await p.locator('.bn-ponto').nth(5).click();
await p.waitForTimeout(200);
let e5=await etiqueta(p);
console.log('   ponto 6 →', e5);
ok(/dívida/i.test(e5), 'o sexto ponto abre a mensagem da dívida');
ok(await p.locator('.bn-ponto').nth(5).getAttribute('aria-selected')==='true', 'e fica marcado');
await p.close();

console.log('\n== pára quando se lhe toca ==');
p=await abrir('/index.html');
const antes=await etiqueta(p);
await p.locator('#banner').dispatchEvent('touchstart');
await p.waitForTimeout(7600);
ok(await etiqueta(p)===antes, 'com o dedo em cima não roda');
await p.locator('#banner').dispatchEvent('touchend');
await p.waitForTimeout(7600);
ok(await etiqueta(p)!==antes, 'e retoma quando se larga');
await p.close();

console.log('\n== quem pediu menos movimento não leva rotação ==');
p=await abrir('/index.html',{reduzido:true});
const r1=await etiqueta(p);
await p.waitForTimeout(7600);
ok(await etiqueta(p)===r1, 'não roda sozinho');
await p.locator('.bn-ponto').nth(2).click(); await p.waitForTimeout(200);
ok(await etiqueta(p)!==r1, 'mas os pontos continuam a funcionar');
await p.close();

/* Isto ja' afirmou o contrario: que fechado era fechado para sempre. Estava
   errado — quem fecha um aviso diz "agora nao", nao "nunca mais". */
console.log('\n== fecha-se agora, e volta na visita seguinte ==');
p=await abrir('/index.html');
await p.locator('#banner-fechar').click();
await p.waitForTimeout(150);
ok(!await p.locator('#banner').isVisible(), 'fechou');
const naSessao=await p.evaluate(()=>sessionStorage.getItem('vf:banner-fechado'));
const noAparelho=await p.evaluate(()=>localStorage.getItem('vf:banner-fechado'));
ok(naSessao==='1', 'fica marcado para esta visita');
ok(noAparelho===null, 'e NAO fica marcado no aparelho — senao nunca mais voltava');
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
ok(!await p.locator('#banner').isVisible(), 'no mesmo separador continua fechado');
await p.close();

/* Separador novo = visita nova. E' isto que o traz de volta. */
p=await abrir('/index.html');
ok(await p.locator('#banner').isVisible(), 'e volta a aparecer numa visita nova');
await p.close();

console.log('\n== passa-se com o dedo ==');
p=await abrir('/index.html');
const antesDedo=await etiqueta(p);
const cx=await p.locator('#banner').boundingBox();
await p.touchscreen.tap(cx.x+cx.width/2, cx.y+cx.height/2);
await p.evaluate(({x,y})=>{
  const el=document.getElementById('banner');
  /* O TouchEvent do Chromium exige objectos Touch a serio, e nao literais. */
  const t=(cx,cy)=>new Touch({identifier:1, target:el, clientX:cx, clientY:cy});
  el.dispatchEvent(new TouchEvent('touchstart',{touches:[t(x+140,y)],bubbles:true}));
  el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[t(x+20,y)],bubbles:true}));
}, {x:cx.x, y:cx.y+cx.height/2});
await p.waitForTimeout(250);
ok(await etiqueta(p)!==antesDedo, 'arrastar para a esquerda passa a' + "'" + ' mensagem seguinte');
const meio=await etiqueta(p);
await p.evaluate(({x,y})=>{
  const el=document.getElementById('banner');
  /* O TouchEvent do Chromium exige objectos Touch a serio, e nao literais. */
  const t=(cx,cy)=>new Touch({identifier:1, target:el, clientX:cx, clientY:cy});
  el.dispatchEvent(new TouchEvent('touchstart',{touches:[t(x+20,y)],bubbles:true}));
  el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[t(x+140,y)],bubbles:true}));
}, {x:cx.x, y:cx.y+cx.height/2});
await p.waitForTimeout(250);
ok(await etiqueta(p)===antesDedo, 'e para a direita volta a' + "'" + ' anterior');

/* Um toque sem arrasto, ou um deslize vertical (rolar a pagina), nao pode
   trocar de mensagem. */
await p.evaluate(({x,y})=>{
  const el=document.getElementById('banner');
  /* O TouchEvent do Chromium exige objectos Touch a serio, e nao literais. */
  const t=(cx,cy)=>new Touch({identifier:1, target:el, clientX:cx, clientY:cy});
  el.dispatchEvent(new TouchEvent('touchstart',{touches:[t(x+80,y)],bubbles:true}));
  el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[t(x+90,y+120)],bubbles:true}));
}, {x:cx.x, y:cx.y+cx.height/2});
await p.waitForTimeout(250);
ok(await etiqueta(p)===antesDedo, 'rolar a pagina para baixo nao troca de mensagem');
await p.close();

console.log('\n== quem já pagou não leva anúncios ==');
function dig(c){let s=0;for(let i=0;i<c.length;i++)s+=c.charCodeAt(i)*(i+2);return s%10;}
const f=new Date(); f.setMonth(f.getMonth()+12);
const aamm=String(f.getFullYear()%100).padStart(2,'0')+String(f.getMonth()+1).padStart(2,'0');
const chave='VF'+aamm+'AB23'+dig(aamm+'AB23');
p=await abrir('/app/',{estado:{'vf:chave':chave}});
ok(await p.locator('#banner').isVisible(), 'o banner aparece na mesma');
let etiquetas=[];
for(let i=0;i<await p.locator('.bn-ponto').count();i++){
  await p.locator('.bn-ponto').nth(i).click(); await p.waitForTimeout(120);
  etiquetas.push(await etiqueta(p)+' :: '+await texto(p));
}
console.log('   mensagens:', etiquetas.map(x=>x.split(' :: ')[0]).join(' | '));
ok(etiquetas.length===7, 'mas com sete mensagens, não oito');
ok(!etiquetas.some(x=>/mês grátis|crie conta|9,89/i.test(x)), 'e nenhuma lhe vende o que já comprou');
await p.close();

console.log('\n== no mês de experiência: dias que faltam, não anúncio ==');
const ha10=new Date(Date.now()-10*86400000).toISOString();
p=await abrir('/app/',{sessao:true,perfil:{email:'a@x.pt',teste:ha10},
  estado:{'vf:teste':JSON.stringify({uid:'u1',inicio:ha10})}});
let et=await etiqueta(p), tx=await texto(p);
console.log('   ', et, '|', tx);
ok(/o seu mês/i.test(et), 'a primeira mensagem é sobre o mês de experiência');
ok(/faltam 20 dias/i.test(tx), 'e diz quantos dias faltam (20)');
ok(await p.locator('#banner-corpo .bn-accao').count()===0, 'sem botão nenhum: não há nada a vender');
await p.close();

console.log('\n== último dia fala de uma vez só ==');
const ha29=new Date(Date.now()-29.2*86400000).toISOString();
p=await abrir('/app/',{sessao:true,perfil:{email:'a@x.pt',teste:ha29},
  estado:{'vf:teste':JSON.stringify({uid:'u1',inicio:ha29})}});
tx=await texto(p);
console.log('   ', tx);
ok(/último dia/i.test(tx) && /9,89/.test(tx), 'no último dia diz que é o último e quanto custa depois');
await p.close();

console.log('\n== dentro da app os botões trocam de ecrã ==');
p=await abrir('/app/');
await p.locator('.bn-ponto').nth(1).click(); await p.waitForTimeout(150);
const accao=p.locator('#banner-corpo .bn-accao');
ok(await accao.count()===1, 'a mensagem do chat tem botão');
ok(await accao.evaluate(el=>el.tagName)==='BUTTON', 'e é um botão, não uma ligação com # que não faz nada');
await accao.click(); await p.waitForTimeout(500);
const ecra=await p.evaluate(()=>{const a=document.querySelector('.ecra.activo');return a?a.id:null});
console.log('   ecrã aberto:', ecra);
ok(ecra==='ecra-wesley', 'e leva mesmo ao chat');
await p.close();

console.log('\n== o banner vive no Início, e só no Início ==');
/* Este bloco pedia outra coisa até hoje: pedia que o banner voltasse no ecrã
   do mês. Deixou de ser verdade quando o `arrumarInicio()` o passou para
   dentro do `#ecra-inicio`, por baixo dos cartões — um anúncio, mesmo sendo de
   uma coisa grátis e nossa, não se põe à frente do número que a pessoa abriu a
   aplicação para ver, nem anda atrás dela pelas páginas.

   O teste ficou a pedir o comportamento antigo e ninguém deu por isso, porque
   o `correr.sh` não sabia falhar: o `node | tail` devolvia sempre zero. Ficam
   as duas coisas arranjadas — o corredor, e o que este bloco verifica. */
p=await abrir('/app/');
ok(await p.locator('#banner').isVisible(), 'no Início está à vista');
ok(await p.evaluate(()=>{
     const b=document.getElementById('banner'); const i=document.getElementById('ecra-inicio');
     return !!(b && i && i.contains(b));
   }), 'e mora mesmo dentro do Início, e não por cima de todos os ecrãs');
ok(await p.evaluate(()=>{
     const r=document.querySelector('#ecra-inicio .resumo'); const b=document.querySelector('.banner-topo');
     if(!r||!b) return false;
     return r.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
   }), 'e por baixo dos cartões do mês, e não à frente do dinheiro de quem chega');

await p.evaluate(()=>window.irEcra('wesley')); await p.waitForTimeout(400);
ok(!await p.locator('#banner').isVisible(), 'no chat desaparece — a caixa de escrever não pode ir para o fundo do ecrã');
ok(await p.evaluate(()=>localStorage.getItem('vf:banner-fechado'))===null,
   'e não fica marcado como fechado: é esconder, não é dispensar');
await p.evaluate(()=>window.irEcra('mes')); await p.waitForTimeout(400);
ok(!await p.locator('#banner').isVisible(), 'no mês também não aparece: não anda atrás de ninguém');
await p.evaluate(()=>window.irEcra('mais')); await p.waitForTimeout(400);
ok(!await p.locator('#banner').isVisible(), 'nas ferramentas também não');
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
ok(await p.locator('#banner').isVisible(), 'e volta a estar lá quando se volta ao Início');
await p.close();

console.log('\n== quem abre no chat não vê o banner, e não fica preso a isso ==');
p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await p.addInitScript(()=>{
  const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),set:()=>Promise.resolve(),delete:()=>Promise.resolve()};
  const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
  window.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),40)},signOut(){}}),firestore:()=>({collection:col})};
  try{localStorage.setItem('vf:moeda','EUR');localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true}));}catch(e){}
});
await p.goto(B+'/app/',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1000);
ok(await p.evaluate(()=>document.querySelector('.ecra.activo').id)==='ecra-wesley','sem nada lançado abre no chat');
ok(!await p.locator('#banner').isVisible(), 'e aí o banner não aparece');
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
ok(await p.locator('#banner').isVisible(), 'mas está lá assim que se sai do chat');
const ondeForm=await p.evaluate(()=>{
  const f=document.querySelector('.assist-form'); return f?Math.round(f.getBoundingClientRect().top):null;});
await p.close();

console.log('\n== o relógio não é reiniciado por outras mudanças na página ==');
p=await abrir('/app/');
const antesRot=await etiqueta(p);
/* Trocar classes noutro sítio qualquer, como a aplicação faz a toda a hora. */
const bate=setInterval(()=>{},1);
await p.evaluate(()=>{
  let n=0;
  window.__bate=setInterval(()=>{document.body.classList.toggle('x-teste-'+(n++%3))},300);
});
await p.waitForTimeout(7800);
clearInterval(bate);
await p.evaluate(()=>clearInterval(window.__bate));
console.log('   ', antesRot, '→', await etiqueta(p));
ok(await etiqueta(p)!==antesRot, 'rodou na mesma ao fim dos sete segundos');
await p.close();

console.log('\n== criar conta refaz as mensagens sem recarregar ==');
p=await abrir('/app/');
ok(/mês grátis/i.test(await etiqueta(p)), 'antes de entrar, oferece o mês');
await p.evaluate(()=>{
  localStorage.setItem('vf:teste',JSON.stringify({uid:'u1',inicio:new Date().toISOString()}));
  window.dispatchEvent(new CustomEvent('vf:acesso-mudou'));
});
await p.waitForTimeout(250);
et=await etiqueta(p); tx=await texto(p);
console.log('   ', et, '|', tx);
ok(/o seu mês/i.test(et) && /30 dias/.test(tx), 'assim que a conta existe, passa a contar os dias');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
