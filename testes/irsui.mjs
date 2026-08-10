/* A gaveta do IRS, no telemóvel.

   O motor está testado no `teste-irs.mjs`, à parte e sem ecrã. Isto testa a
   outra metade: que os campos chegam ao motor, que o resultado volta, e que a
   caixa verde do "o que ainda dá para fazer" aparece a quem lhe interessa.

   Há uma razão concreta para este ficheiro existir. O ecrã lê os campos com
   `irsNum()` e `irsTexto()`, e o motor não sabe nada de campos: um campo com o
   `id` trocado não parte teste nenhum do motor e desaparece em silêncio do
   resultado. Foi assim que a caixa da reserva chegou a mostrar "0 meses"
   durante semanas — sem erro na consola e sem ninguém dar por isso. */
import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';

/* O `addInitScript` volta a correr em cada `reload()` — está escrito no
   README dos testes e apanha toda a gente uma vez. Se a limpeza do `vf:irs`
   ficasse aqui dentro, o teste de "o que se escreve fica escrito" apagava
   sozinho aquilo que ia verificar, e depois queixava-se de que a aplicação
   não guardava nada. Por isso a limpeza faz-se uma vez, à mão, antes de
   escrever seja o que for. */
async function abrir(){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{console.log('  !! JS:',e.message);falhas.push('erro JS: '+e.message);});
  await p.addInitScript(()=>{
    const doc={get:()=>Promise.resolve({exists:false,data:()=>({})}),
               set:()=>Promise.resolve(), delete:()=>Promise.resolve()};
    const col=()=>({doc:()=>doc,get:()=>Promise.resolve({docs:[],forEach(){}}),
                    orderBy(){return this},limit(){return this},add:()=>Promise.resolve({id:'x'})});
    window.firebase={initializeApp(){},
      auth:()=>({onAuthStateChanged(f){setTimeout(()=>f(null),60)},signOut(){}}),
      firestore:()=>({collection:col})};
    try{localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','EUR');
        localStorage.setItem('vf:banner-fechado','1');
        localStorage.setItem('vf:arranque',JSON.stringify({feito:true,pedidoAposConta:true}));
        /* Sem isto a gaveta abre com os campos das despesas já preenchidos
           pelos lançamentos do ano, e os números do teste deixavam de ser os
           números do teste. */
        localStorage.removeItem('vf:movimentos');
    }catch(e){}
  });
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>{ try{localStorage.removeItem('vf:irs');}catch(e){} });
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1200);

  /* Antes de la' ir, o corpo tem de estar vazio: sao muitos campos e a maior
     parte das pessoas vem aqui duas vezes por ano, por isso so' se desenha
     quando o separador abre. */
  ok((await p.locator('#irs-corpo').innerHTML()).length===0,
     'o IRS nao se desenha antes de alguem la' + "'" + ' ir');

  /* O IRS tem separador proprio desde que saiu das Ferramentas. Era uma gaveta
     dentro de um grupo dentro do separador das Ferramentas — para a unica
     coisa da aplicacao que tem prazo, isso era fundo a mais. */
  await p.click('.aba[data-ecra="irs"]');
  await p.waitForTimeout(500);
  ok(await p.evaluate(()=>(document.querySelector('.ecra.activo')||{}).id)==='ecra-irs',
     'o separador do IRS abre o ecra do IRS');

  /* Duas perguntas a' vista e mais nada. Eram catorze campos numa pagina, e o
     primeiro era "ganhou no ano todo, antes dos descontos" — que quase
     ninguem sabe de cabeca. Quem nao sabe responder nao escreve "nao sei":
     fecha a aplicacao. E' esta contagem que impede a parede de voltar. */
  const visiveis = await p.locator('#irs-corpo input:visible').count();
  ok(visiveis===2, 'so' + "'" + ' duas perguntas a' + "'" + ' vista (estao '+visiveis+')');
  const quais = await p.locator('#irs-corpo input:visible').evaluateAll(es=>es.map(e=>e.id));
  ok(quais.join(',')==='irs-mes,irs-retmes', 'e sao as duas do recibo: '+quais.join(', '));
  ok(await p.locator('#irs-mais').evaluate(d=>!d.open), 'o resto nasce fechado');
  return p;
}

/* Escrever num campo que vive dentro da gaveta fechada. Abre-se, escreve-se, e
   deixa-se aberta — quem esta' a afinar a conta nao quer a gaveta a fechar-se
   na cara a cada numero. */
async function afinar(p, campo, valor){
  await p.evaluate(()=>{ const d=document.getElementById('irs-mais'); if(d) d.open=true; });
  await p.waitForTimeout(120);
  await p.fill(campo, valor);
}

const euros = t => parseFloat(String(t).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'));

console.log('== a gaveta abre e diz o que ainda não está confirmado ==');
let p=await abrir();
ok(await p.locator('#irs-corpo .irs-bloco').count()>=5, 'os blocos de perguntas desenharam-se');
const aviso=await p.locator('#irs-corpo .irs-aviso-lei').innerText();
console.log('   ',aviso.split('\n').join(' / ').slice(0,160));
ok(/por confirmar|falta confirmar/i.test(aviso), 'o aviso diz que ainda falta confirmar alguma coisa');
ok(/recibos verdes|IRS Jovem/i.test(aviso), 'e diz **o quê**, para se saber o que ir buscar');
/* O `NaN` procura-se com maiusculas e minusculas certas de proposito: com o
   `i` ligado, "NaN" casa com o "nan" de "Financas" e o teste acusava um
   defeito que nao existe em todos os ecras que falam das Financas. */
const corpoIRS=await p.locator('#irs-corpo').innerText();
ok(!/undefined|\[object/i.test(corpoIRS) && !/NaN/.test(corpoIRS),
   'nao ha nada por preencher a mostra');

console.log('\n-- a banda diz em que dia do ano estamos --');
/* A ferramenta perguntava por 2025 em Agosto de 2026, seis semanas depois de a
   entrega ter fechado. Agora diz de que ano esta' a falar e porque'. */
const banda=await p.locator('#irs-corpo .irs-epoca').innerText();
console.log('   ',banda.split('\n').join(' / ').slice(0,170));
const anoAgora=new Date().getMonth()+1<=6 ? new Date().getFullYear()-1 : new Date().getFullYear();
ok(banda.includes(String(anoAgora)), 'fala do ano certo para o dia de hoje ('+anoAgora+')');
ok(/dias|prazo|entregue|fechou/i.test(banda), 'e diz o que ha' + "'" + ' para fazer, ou nao ha');
ok(await p.locator('#irs-trocar-ano').count()===1, 'e da' + "'" + ' para ver outro ano');

console.log('\n-- quem chega sem nada lancado ouve isso, em vez de ver zeros --');
ok(/nada lançado/i.test(banda), 'diz que nao ha nada para somar');
ok(await p.locator('#irs-japreenchido, .irs-japreenchido').count()===0,
   'e nao oferece somar um ano vazio');

console.log('\n-- sem nada escrito nao inventa um numero --');
ok(await p.locator('#irs-vazio, #irs-resultado .irs-vazio').count()===1,
   'diz o que escrever em vez de mostrar zero euros');

console.log('\n== o salario minimo, sem facturas ==');
/* 12.180 € é o salário mínimo de 2025 (870 € × 14). Sem facturas com o
   número, a lei manda pagar 250 € — que é exactamente o tecto da dedução de
   despesas gerais que ficou por usar. É o número mais caro da ferramenta. */
await afinar(p,'#irs-trab','12180');
await afinar(p,'#irs-ret','0');
await p.waitForTimeout(300);
let grande=await p.locator('#irs-resultado .irs-numero b').innerText();
let rotulo=await p.locator('#irs-resultado .irs-numero .rot').innerText();
console.log('   ',rotulo,grande);
ok(/pagar/i.test(rotulo), 'sem retencoes e sem facturas, paga');
ok(Math.abs(euros(grande)-250)<1, 'e paga os 250 € da deducao que nao pediu ('+grande+')');

console.log('\n-- e a caixa verde diz-lhe o que fazer com isso --');
const dica=await p.locator('#irs-falta .irs-dica').innerText();
console.log('   ',dica.split('\n').join(' / ').slice(0,200));
ok(/714/.test(dica), 'diz quanto falta gastar-com-factura (714,29 €)');
ok(/250/.test(dica), 'e quanto isso lhe vale');

console.log('\n== o mesmo salario, com as facturas pedidas ==');
await afinar(p,'#irs-gerais','715');
await p.waitForTimeout(300);
grande=await p.locator('#irs-resultado .irs-numero b').innerText();
console.log('   ',grande);
ok(Math.abs(euros(grande))<1, 'com facturas, o salario minimo nao paga IRS nenhum ('+grande+')');
const semGanho=await p.locator('#irs-falta').innerText();
console.log('   ',semGanho.split('\n').join(' / ').slice(0,160));
ok(!/de imposto a menos/.test(semGanho),
   'nao promete poupanca nenhuma a quem ja' + "'" + ' paga zero');
ok(/nada a ganhar/i.test(semGanho), 'e diz-lhe isso em vez de deixar um vazio');

console.log('\n-- e a quem ja' + "'" + ' nao paga nada nao se promete uma poupanca --');
/* Muitas deducoes por cima de pouca coleta: a caixa verde nao pode dizer
   "sao mais 145 € de imposto a menos" a quem ja' esta' a zero. Uma deducao so'
   devolve dinheiro enquanto houver imposto para abater. */
await afinar(p,'#irs-dep','2');
await afinar(p,'#irs-idades','3, 1');
await afinar(p,'#irs-asc','1');
await afinar(p,'#irs-renda','4800');
await afinar(p,'#irs-gerais','300');
await p.waitForTimeout(350);
const cheio=await p.locator('#irs-falta').innerText();
console.log('   ',cheio.split('\n').join(' / ').slice(0,200));
ok(euros(await p.locator('#irs-resultado .irs-numero b').innerText())<1, 'nao paga nada');
ok(!/de imposto a menos/.test(cheio), 'e a app nao lhe inventa euros que nao ha');
/* Volta ao caso simples para os testes seguintes. */
await afinar(p,'#irs-dep',''); await afinar(p,'#irs-idades','');
await afinar(p,'#irs-asc',''); await afinar(p,'#irs-renda','');
await p.waitForTimeout(250);

console.log('\n-- a conta toda esta a' + "'" + " vista --");
await p.locator('#irs-resultado .irs-conta > summary').click();
await p.waitForTimeout(200);
const conta=await p.locator('#irs-resultado .irs-conta').innerText();
console.log('   ',conta.split('\n').join(' / ').slice(0,240));
ok(/M[íi]nimo de exist[êe]ncia/i.test(conta), 'o minimo de existencia aparece, e em euros de imposto');
ok(/Despesas gerais/i.test(conta), 'a deducao das despesas gerais aparece');

console.log('\n== os filhos, com e sem idades ==');
await afinar(p,'#irs-trab','25000');
await afinar(p,'#irs-ret','3000');
await afinar(p,'#irs-dep','3');
await p.waitForTimeout(300);
const semIdades=euros(await p.locator('#irs-resultado .irs-numero b').innerText());
/* O `innerText` de um `<details>` fechado só traz o `summary`. Abre-se antes
   de se ler, senão o teste diz que o texto não lá está quando o que se
   passou foi não se ter ido lá ver. */
await p.locator('#irs-resultado .irs-conta > summary').click();
await p.waitForTimeout(150);
const aviso2=await p.locator('#irs-resultado .irs-conta').innerText();
ok(/Escreva as idades/i.test(aviso2), 'sem idades, pede as idades em vez de calar');
await afinar(p,'#irs-idades','3, 2, 1');
await p.waitForTimeout(300);
const comIdades=euros(await p.locator('#irs-resultado .irs-numero b').innerText());
console.log('   sem idades:',semIdades,' com 3, 2 e 1 ano:',comIdades);
/* 1.800 € vira 2.526 €: mais 726 € de deducao, e por isso mais 726 € de volta.
   A coleta a 25.000 € da' bem mais do que isso, e a deducao por filhos nao
   entra no tecto global — por isso passa toda. */
ok(Math.abs((comIdades-semIdades)-726)<1,
   'dizer as idades vale 726 € e a app tem de os dar (deu '+(comIdades-semIdades).toFixed(2)+')');
await p.locator('#irs-resultado .irs-conta > summary').click();
await p.waitForTimeout(150);
ok(!/Escreva as idades/i.test(await p.locator('#irs-resultado .irs-conta').innerText()),
   'e o pedido desaparece depois de respondido');

console.log('\n== um casal, e a escolha que quase ninguem faz de proposito ==');
await p.evaluate(()=>{ const d=document.getElementById('irs-mais'); if(d) d.open=true; });
await p.waitForTimeout(120);
await p.locator('#irs-quem button[data-quem="casal"]').click();
await p.waitForTimeout(200);
ok(await p.locator('#irs-trab2').isVisible(), 'os campos da outra pessoa aparecem');
await afinar(p,'#irs-trab','45000');
await afinar(p,'#irs-ret','9000');
await afinar(p,'#irs-trab2','8000');
await afinar(p,'#irs-ret2','100');
await p.waitForTimeout(350);
const melhor=await p.locator('#irs-comparar .irs-melhor').innerText();
console.log('   ',melhor.split('\n').join(' / ').slice(0,200));
ok(/em conjunto/i.test(melhor), 'com rendimentos muito diferentes, diz para entregar em conjunto');
ok(/€/.test(melhor), 'e diz quanto e' + "'" + ' que isso vale');

console.log('\n-- o que se escreve fica escrito --');
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(1000);
await p.click('.aba[data-ecra="irs"]');
await p.waitForTimeout(500);
ok(await p.locator('#irs-trab').inputValue()==='45000', 'os rendimentos ficaram guardados');
ok(await p.locator('#irs-idades').inputValue()==='3, 2, 1', 'as idades tambem');
ok(await p.locator('#irs-quem button[data-quem="casal"].sim').count()===1, 'e a escolha de casal tambem');

console.log('\n-- e nada disto vai parar a lado nenhum --');
const rodape=await p.locator('#irs-corpo .irs-rodape').innerText();
ok(/nunca lhe vai pedir/i.test(rodape), 'esta' + "'" + ' escrito que a senha das Financas nunca e pedida');
await p.close();

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
if(falhas.length) process.exit(1);
