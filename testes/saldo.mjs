/* O chat a fazer contas com o dinheiro de alguém: dizer o saldo, gastar em
   varios sitios, receber, levantar, e corrigir o que estiver errado.
   O que se verifica em cada passo e' o numero que a pessoa ve' no ecra. */
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
const conta = p => p.evaluate(()=>saldoAgora());
const naTela = async p => {
  await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
  const t=await p.evaluate(()=>{const e=document.getElementById('v-conta');
    return (e&&!e.hidden)?e.innerText:null;});
  await p.evaluate(()=>window.irEcra('wesley')); await p.waitForTimeout(250);
  return t;
};

console.log('== dizer quanto se tem ==');
let p=await abrir();
let r=await diz(p,'tenho 1000 euros no banco');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,110));
ok(/1000,00/.test(r), 'aceita e repete o número');
ok(/na conta/i.test(r), 'e diz que é o dinheiro da conta');
ok(await conta(p)===1000, 'saldoAgora() = 1000');
ok(/1000,00/.test(await naTela(p)||''), 'e o Início mostra "Na conta: 1000,00 €"');

console.log('\n== "de lado" continua a ser reserva, não a conta ==');
let p2=await abrir();
r=await diz(p2,'tenho 300 euros de lado');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,90));
ok(/de lado|reserva/i.test(r), 'vai para a reserva');
ok(await conta(p2)===null, 'e NÃO mexe no saldo da conta');
await p2.close();

console.log('\n== um dia de compras ==');
const compras=[
  ['gastei 30 no continente', 970],
  ['paguei 12,50 na farmácia', 957.50],
  ['gastei 45,90 no lidl', 911.60],
  ['abasteci 60 euros na galp', 851.60],
  ['comprei 8 euros de pão na padaria', 843.60]
];
for (const [frase, esperado] of compras) {
  await diz(p, frase);
  const c = await conta(p);
  ok(Math.abs(c-esperado)<0.005, frase+' → '+esperado+' (deu '+c+')');
}

console.log('\n== entrou dinheiro ==');
await diz(p,'recebi 1500 de salário');
ok(Math.abs(await conta(p)-2343.60)<0.005, 'salário de 1500 soma → 2343,60 (deu '+await conta(p)+')');
await diz(p,'vendi uma bicicleta por 120');
ok(Math.abs(await conta(p)-2463.60)<0.005, 'venda de 120 soma → 2463,60 (deu '+await conta(p)+')');

console.log('\n== levantei / retirei ==');
await diz(p,'levantei 200 euros no multibanco');
let c=await conta(p);
console.log('   depois de levantar 200:', c);
ok(Math.abs(c-2263.60)<0.005, 'levantar desconta da conta → 2263,60 (deu '+c+')');

console.log('\n== perguntar quanto se tem ==');
r=await diz(p,'quanto tenho?');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,80));
ok(/2\s?263,60/.test(r), 'responde com o número certo');

console.log('\n== corrigir o último lançamento ==');
await diz(p,'gastei 500 no continente');
ok(Math.abs(await conta(p)-1763.60)<0.005, 'um gasto de 500 desce a conta');
r=await diz(p,'errei, o último foi 50 e não 500');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,90));
ok(/50,00/.test(r) && /500,00/.test(r), 'diz o antes e o depois');
c=await conta(p);
ok(Math.abs(c-2213.60)<0.005, 'e a conta volta a 2213,60 (deu '+c+')');
const ult=await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('vf:movimentos')||'[]');return m[m.length-1];});
ok(ult.valor===50, 'o movimento na base ficou com 50, não com um novo lançamento');
const n=await p.evaluate(()=>JSON.parse(localStorage.getItem('vf:movimentos')||'[]').length);
ok(n===9, 'e não se criou um movimento a mais (há '+n+')');

console.log('\n== o extracto diz outra coisa: acerto ==');
r=await diz(p,'na verdade tenho 2000 no banco');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,120));
ok(Math.abs(await conta(p)-2000)<0.005, 'o saldo passa a 2000');
let bts=await p.locator('.msg.ele:last-child .msg-accao').allInnerTexts();
console.log('   botões:', JSON.stringify(bts));
ok(bts.length===2 && /regista/i.test(bts[0]), 'e pergunta se regista a diferença');
const ultimoTexto=(await p.locator('.msg.ele .msg-txt').allInnerTexts()).slice(-1)[0];
ok(/213,60/.test(ultimoTexto), 'dizendo quanto é a diferença (213,60)');

console.log('\n== "sim, regista" lança o acerto e o saldo não mexe ==');
await p.locator('.msg.ele:last-child .msg-accao').first().click();
await p.waitForTimeout(800);
r=(await p.locator('.msg.ele .msg-txt').allInnerTexts()).slice(-1)[0];
console.log('   '+r.replace(/\n+/g,' | ').slice(0,110));
c=await conta(p);
ok(Math.abs(c-2000)<0.005, 'o saldo continua em 2000 (deu '+c+') — não se desconta duas vezes');
const acerto=await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('vf:movimentos')||'[]');
  return m.filter(x=>x.categoria==='acerto').map(x=>({t:x.tipo,v:x.valor}));});
console.log('   acertos:', JSON.stringify(acerto));
ok(acerto.length===1 && acerto[0].t==='saida' && Math.abs(acerto[0].v-213.60)<0.005,
   'ficou uma saída de 213,60 em "Acerto de saldo"');

console.log('\n== a queixa do número vermelho ==');
let p3=await abrir();
await diz(p3,'gastei 200 no continente');
await diz(p3,'paguei 300 de renda');
r=await diz(p3,'aquilo não é um saldo negativo, preciso que você arrume');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,170));
ok(!/Posso ajudar melhor se me perguntar/.test(r), 'já não responde com a lista de tópicos');
ok(/nao e o seu saldo|não é o seu saldo/i.test(r), 'explica que aquilo não é o saldo');
ok(/nao e uma divida|não é uma dívida/i.test(r), 'e que não é uma dívida');
ok(/diga-me quanto tem/i.test(r), 'e pede o número que falta');

console.log('\n== e o "menos um" que apareceu ao cliente ==');
const so=await p3.evaluate(()=>saldoAgora());
ok(so===null, 'a frase da queixa NÃO gravou um saldo de 1 € (deu '+so+')');

console.log('\n== "está errado" sem mais nada ==');
r=await diz(p3,'está errado');
console.log('   '+r.replace(/\n+/g,' | ').slice(0,120));
ok(/o que esta errado|o que está errado/i.test(r), 'pergunta o que está errado');
ok(/o ultimo foi|o último foi/i.test(r), 'e ensina como se diz');
await p3.close();

console.log('\n== o saldo sobrevive a fechar a app ==');
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(1200);
c=await conta(p);
ok(Math.abs(c-2000)<0.005, 'depois de recarregar continua em 2000 (deu '+c+')');
await diz(p,'gastei 10 no café');
ok(Math.abs(await conta(p)-1990)<0.005, 'e continua a descontar');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
