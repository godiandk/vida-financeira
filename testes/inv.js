const RAIZ = require('path').join(__dirname, '..');
/* A conta do juro composto, conferida contra numeros feitos a' mao. */
const fs=require('fs'),vm=require('vm');
const ctx={module:{exports:{}},console,Math,Number,isFinite,Object,Array,String,JSON,saida:null};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(RAIZ + '/investir.js','utf8')+
  '\nsaida={investSimular,investImposto,investRef,investOpcoes,investTexto,INVEST_REF,INVEST_TEXTO};',ctx);
const {investSimular,investImposto,investOpcoes,INVEST_REF,INVEST_TEXTO}=ctx.saida;
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};

console.log('== juro composto, sem reforcos ==');
/* 1000 a 10% durante 10 anos = 1000 * 1,1^10 = 2593,74 */
let r=investSimular({inicial:1000,mensal:0,anos:10,taxa:10,imposto:0,moeda:'EUR'});
console.log('   bruto:',r.bruto);
ok(Math.abs(r.bruto-2593.74)<0.5, '1000 a 10%/ano, 10 anos → 2593,74 (deu '+r.bruto+')');
ok(r.posto===1000, 'o que se pos foi 1000');
ok(Math.abs(r.juros-1593.74)<0.5, 'e os juros sao 1593,74');

console.log('\n== com reforcos mensais ==');
/* 100/mes a 12%/ano durante 1 ano, taxa mensal equivalente. */
r=investSimular({inicial:0,mensal:100,anos:1,taxa:12,imposto:0,moeda:'EUR'});
console.log('   posto:',r.posto,'bruto:',r.bruto);
ok(r.posto===1200, 'poe-se 1200 em doze meses');
ok(r.bruto>1200 && r.bruto<1290, 'e rende alguma coisa, mas nao um ano inteiro de juros ('+r.bruto+')');

console.log('\n== o imposto entra na conta ==');
r=investSimular({inicial:10000,mensal:0,anos:10,taxa:5,moeda:'EUR'});
console.log('   bruto:',r.bruto,'imposto:',r.imposto,'liquido:',r.liquido);
ok(r.impostoPct===28, 'em euros sao 28%');
ok(Math.abs(r.imposto - r.juros*0.28)<0.02, 'o imposto e 28% dos juros, nao do total');
ok(Math.abs(r.liquido - (r.bruto-r.imposto))<0.02, 'o liquido e o bruto menos o imposto');
ok(r.ganho < r.juros, 'e o que se ganha e menos do que os juros brutos');

console.log('\n== o imposto brasileiro desce com o tempo ==');
ok(investImposto('BRL',0.4)===22.5, 'ate 180 dias, 22,5%');
ok(investImposto('BRL',0.9)===20, 'ate 360 dias, 20%');
ok(investImposto('BRL',1.5)===17.5, 'ate 720 dias, 17,5%');
ok(investImposto('BRL',3)===15, 'acima de 720 dias, 15%');
ok(investImposto('EUR',10)===28, 'em Portugal e sempre 28%');

console.log('\n== o ano a ano ==');
r=investSimular({inicial:1000,mensal:50,anos:5,taxa:3,moeda:'EUR'});
console.log('   anos:',r.linhas.map(l=>l.ano).join(','));
ok(r.linhas.length===5, 'ha uma linha por ano');
ok(r.linhas[0].ano===1 && r.linhas[4].ano===5, 'do ano 1 ao 5');
let sobe=true;
for(let i=1;i<r.linhas.length;i++) if(r.linhas[i].liquido<=r.linhas[i-1].liquido) sobe=false;
ok(sobe, 'e o valor sobe sempre');
ok(r.linhas[4].posto===1000+50*60, 'o que se pos bate certo (1000 + 60 meses x 50)');

console.log('\n== o que nao faz sentido nao passa ==');
ok(investSimular({inicial:0,mensal:0,anos:10,taxa:5,moeda:'EUR'})===null, 'sem dinheiro nenhum, nao ha conta');
ok(investSimular({inicial:1000,mensal:0,anos:10,taxa:-1,moeda:'EUR'})===null, 'taxa negativa nao passa');
ok(investSimular({inicial:1000,mensal:0,anos:10,taxa:500,moeda:'EUR'})===null, 'taxa de 500% nao passa');
r=investSimular({inicial:1000,mensal:0,anos:999,taxa:5,moeda:'EUR'});
ok(r.anos===50, 'e mais de 50 anos fica em 50');

console.log('\n== taxa zero nao inventa juros ==');
r=investSimular({inicial:1000,mensal:100,anos:5,taxa:0,moeda:'EUR'});
ok(r.bruto===r.posto && r.juros===0 && r.imposto===0, 'a 0% nao rende nem paga imposto');

console.log('\n== as referencias tem fonte e data ==');
['EUR','BRL'].forEach(m=>{
  const ref=INVEST_REF[m];
  ok(!!ref.verificado && !!ref.ligacao, m+': tem data e ligacao');
  ok(ref.opcoes.length>=3, m+': tem pelo menos tres sitios onde por o dinheiro');
});

console.log('\n== e o que se le esta' + "'" + ' escrito nas quatro linguas ==');
const CAMPOS=['nome','quem','seguro','rende','mexer','limite','onde'];
['pt','br','es','en'].forEach(l=>{
  let faltam=[];
  ['EUR','BRL'].forEach(m=>{
    ok(!!ctx.saida.investTexto('fonte.'+m,l) && !!ctx.saida.investTexto('impnota.'+m,l),
       l+'/'+m+': tem fonte e nota do imposto');
    investOpcoes(m,l).forEach(o=>CAMPOS.forEach(c=>{ if(!o[c]) faltam.push(o.id+'.'+c); }));
  });
  ok(faltam.length===0, l+': nenhum campo em branco'+(faltam.length?' ('+faltam.join(', ')+')':''));
});
/* O `es` e o `en` nao podem ser o portugues copiado: se forem, alguem se
   esqueceu de traduzir e ninguem da' por isso ate' um ingles abrir a app. */
['es','en'].forEach(l=>{
  let iguais=[];
  ['EUR','BRL'].forEach(m=>{
    const pt=investOpcoes(m,'pt'), out=investOpcoes(m,l);
    pt.forEach((o,i)=>['seguro','rende','mexer','onde'].forEach(c=>{
      if(o[c]===out[i][c]) iguais.push(l+'/'+o.id+'.'+c);
    }));
  });
  ok(iguais.length===0, l+': esta' + "'" + ' mesmo traduzido'+(iguais.length?' (igual ao pt: '+iguais.join(', ')+')':''));
});

/* A regra que nao pode cair: nomeia-se o instrumento, nunca a marca. */
const marcas=/santander|caixa geral|millennium|novo banco|nubank|itau|bradesco|xp |rico |btg|c6|inter\b/i;
let comMarca=[];
['pt','br','es','en'].forEach(l=>['EUR','BRL'].forEach(m=>investOpcoes(m,l).forEach(o=>{
  const t=CAMPOS.map(c=>o[c]).join(' ');
  if(marcas.test(t)) comMarca.push(l+'/'+m+'/'+o.id);
})));
ok(comMarca.length===0, 'nenhum banco, corretora ou marca e nomeado'+(comMarca.length?' ('+comMarca.join(', ')+')':''));

console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);
