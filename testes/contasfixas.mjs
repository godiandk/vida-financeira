import { chromium } from 'playwright';
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const B='http://127.0.0.1:8930';

// A janela de aviso e' de 7 dias, por isso o dia de vencimento tem de ser
// escolhido em funcao de hoje, senao o teste passa ou falha conforme o mes.
const hoje=new Date();
const diasNoMes=new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate();
const diaDaqui3=Math.min(hoje.getDate()+3, diasNoMes);
const diaLonge=(hoje.getDate()>15)?2:28;   // fora da janela, nos dois sentidos

async function nova(){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>{ console.log('  !! JS:',e.message); falhas.push('erro JS: '+e.message); });
  // Quem chega de novo abre nas perguntas do primeiro arranque, e o Inicio
  // fica fora de vista. Esta suite e' sobre as contas fixas, por isso parte
  // de alguem que ja passou por essa parte.
  await p.addInitScript(()=>{try{
    localStorage.setItem('vf:arranque',JSON.stringify({feito:true,dispensado:true,entra:null,essenciais:null}));
  }catch(e){}});
  await p.goto(B+'/app/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(900);
  // Sem movimentos lancados a app abre no chat, de proposito. Esta suite e'
  // sobre o Inicio, por isso navega-se para la.
  await p.evaluate(()=>window.irEcra('inicio'));
  await p.waitForTimeout(300);
  return p;
}

console.log('== sem contas criadas ==');
let p=await nova();
ok(await p.locator('#bloco-contas').isVisible(), 'o convite aparece no mes corrente');
ok((await p.locator('#contas-corpo').innerText()).includes('Renda') ||
   (await p.locator('#contas-corpo').innerText()).includes('luz'), 'o convite explica o que e');
await p.locator('#contas-corpo button').click(); await p.waitForTimeout(500);
/* As contas fixas deixaram de ser um ecra e passaram a viver no fim do Mes,
   dentro da `#zona-contas` — sao a outra metade da mesma pergunta. O
   `#gaveta-contas` que aqui estava deixou de existir nessa arrumacao, e o
   teste rebentava sem ninguem dar por isso porque o `correr.sh` nao sabia
   falhar. O que importa continua a ser o mesmo: o botao leva la', e o
   formulario fica a' vista. */
ok(await p.evaluate(()=>(document.querySelector('.ecra.activo')||{}).id)==='ecra-mes',
   'o botao leva ao Mes, que e onde as contas fixas vivem agora');
ok(await p.locator('#zona-contas').count()===1, 'e a zona das contas esta la');
ok(await p.locator('#form-conta').isVisible(), 'e o formulario das contas fica a' + "'" + ' vista');

console.log('\n== sugestoes seguem a moeda ==');
ok((await p.locator('#contas-sugestoes').innerText()).includes('Renda'), 'em EUR sugere "Renda"');
await p.evaluate(()=>{/* O Playwright abre o browser em en-US, e a app agora segue a lingua do
           aparelho. Estas suites verificam o portugues: fixa-se. */
        localStorage.setItem('vf:lingua','pt');
        localStorage.setItem('vf:moeda','BRL')});
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(300);
const sugBR=await p.locator('#contas-sugestoes').innerText();
ok(sugBR.includes('Aluguel'), 'em BRL sugere "Aluguel"');
ok(sugBR.includes('Celular') && !sugBR.includes('Telemóvel'), 'e "Celular", nao "Telemóvel"');
await p.evaluate(()=>{localStorage.setItem('vf:moeda','EUR')});
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(300);

console.log('\n== criar uma conta ==');
await p.locator('.cf-sug', {hasText:'Luz'}).click(); await p.waitForTimeout(200);
ok(await p.locator('#cf-nome').inputValue()==='Luz', 'a sugestao escreve o nome');
await p.fill('#cf-dia', String(diaDaqui3));
await p.fill('#cf-novo-valor','48,50');
await p.locator('#form-conta button[type=submit]').click(); await p.waitForTimeout(500);
ok((await p.locator('#contas-lista').innerText()).includes('Luz'), 'a conta entra na lista');
ok((await p.locator('#contas-resumo').innerText()).includes('48,50'), 'o resumo soma');
ok(await p.locator('#cf-nome').inputValue()==='', 'o formulario limpa-se');

console.log('\n== recusa dados impossiveis ==');
await p.fill('#cf-nome','Teste'); await p.fill('#cf-dia','45');
await p.locator('#form-conta button[type=submit]').click(); await p.waitForTimeout(300);
ok(!(await p.locator('#contas-lista').innerText()).includes('Teste'), 'dia 45 nao entra');
await p.fill('#cf-dia','');
await p.fill('#cf-nome','');

console.log('\n== aparece no Inicio e paga-se ==');
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
ok(await p.locator('#bloco-contas').isVisible(), 'o bloco "A pagar" aparece');
const txt=await p.locator('#contas-corpo').innerText();
ok(txt.includes('Luz'), 'com a Luz la dentro');
ok(/vence (hoje|amanhã|em \d+ dias)/.test(txt), 'e diz quando vence: '+(txt.match(/vence[^·\n]*/)||[''])[0].trim());
await p.locator('.conta-linha .cf-bt').first().click(); await p.waitForTimeout(400);
ok(await p.locator('#cf-valor').isVisible(), '"Paguei" abre o campo do valor');
ok(await p.locator('#cf-valor').inputValue()==='48,5', 'ja vem com o valor habitual');
await p.fill('#cf-valor','52,30');
await p.locator('.cf-pagar .btn').click(); await p.waitForTimeout(600);
ok(await p.locator('#bloco-contas').isHidden(), 'paga a unica conta, o bloco desaparece');

console.log('\n== o pagamento virou um movimento a serio ==');
await p.evaluate(()=>window.irEcra('mes')); await p.waitForTimeout(400);
const mes=await p.locator('#lista').innerText();
ok(mes.includes('Luz'), 'a Luz esta na lista de movimentos');
ok(mes.includes('52,30'), 'com o valor que foi mesmo pago, nao o habitual');

console.log('\n== o valor habitual aprendeu ==');
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(400);
ok((await p.locator('#contas-lista').innerText()).includes('52,30'), 'a conta passou a 52,30');
ok((await p.locator('#contas-lista').innerText()).includes('paga'), 'e esta marcada como paga');

console.log('\n== desmarcar ==');
await p.locator('.conta-gerir .cf-bt').first().click(); await p.waitForTimeout(500);
ok(!(await p.locator('#contas-lista').innerText()).includes('· paga'), 'volta a por pagar');
await p.evaluate(()=>window.irEcra('inicio')); await p.waitForTimeout(400);
ok(await p.locator('#bloco-contas').isVisible(), 'e reaparece no Inicio');

console.log('\n== uma conta longe nao enche o ecra ==');
await p.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('vf:contasfixas'));
  d.contas=[{id:'z1',nome:'Seguro',valor:30,dia:Number(document.title&&0)|| DIA_LONGE,categoria:'contas',emoji:'🧾'}];
  d.pagas={};
  localStorage.setItem('vf:contasfixas',JSON.stringify(d));
}).catch(()=>{});
await p.evaluate((dia)=>{
  localStorage.setItem('vf:contasfixas',JSON.stringify({
    contas:[{id:'z1',nome:'Seguro',valor:30,dia:dia,categoria:'contas',emoji:'🧾'}], pagas:{}
  }));
}, diaLonge);
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
ok(await p.locator('#bloco-contas').isHidden(), 'conta a vencer daqui a muito nao aparece no Inicio (dia '+diaLonge+')');
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(300);
ok((await p.locator('#contas-lista').innerText()).includes('Seguro'), 'mas esta no ecra das contas');

console.log('\n== sobrevive a fechar a app ==');
await p.evaluate((dia)=>{
  localStorage.setItem('vf:contasfixas',JSON.stringify({
    contas:[{id:'z2',nome:'Renda',valor:400,dia:dia,categoria:'casa',emoji:'🏠'}], pagas:{}
  }));
}, diaDaqui3);
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
ok((await p.locator('#contas-corpo').innerText()).includes('Renda'), 'a conta continua la depois de recarregar');
await p.screenshot({path:'/tmp/v-contas-inicio.png'});
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/v-contas-ecra.png'});

console.log('\n== lixo gravado nao rebenta a app ==');
await p.evaluate(()=>{
  localStorage.setItem('vf:contasfixas',JSON.stringify({
    contas:[{nome:'',dia:99},{nome:'Boa',dia:5,valor:-4},null,'x'], pagas:{'lixo':1}
  }));
});
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(900);
// Nao se exige o ecra Inicio: o ecra fica no endereco (#contas) de proposito,
// para o botao "voltar" funcionar, por isso o recarregamento reabre onde se
// estava. O que importa e' que a app abriu alguma coisa e nao rebentou.
ok(await p.locator('.ecra.activo').count()===1, 'a app abre na mesma');
await p.evaluate(()=>window.irEcra('contas')); await p.waitForTimeout(300);
const l=await p.locator('#contas-lista').innerText();
ok(l.includes('Boa') && !l.includes('99'), 'so a conta valida sobrevive');

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
