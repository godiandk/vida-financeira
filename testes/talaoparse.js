const RAIZ = require('path').join(__dirname, '..');
/* O que o talao.js faz com o texto que sai do OCR.
   Aqui nao ha browser: e' so' texto a entrar e um movimento a sair. */
const fs = require('fs');
const path = RAIZ + '/';
/* O talao.js usa o acharCategoria do interpretar.js. Carregam-se os dois no
   mesmo contexto, como acontece na pagina. */
const vm = require('vm');
const ctx = { module: {}, console, Date, Math, JSON, parseInt, parseFloat, isFinite, String, Number, Array, Object, RegExp, document: undefined, window: undefined };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path+'interpretar.js','utf8'), ctx);
vm.runInContext(fs.readFileSync(path+'talao.js','utf8'), ctx);
const { talaoInterpretar } = ctx;

const falhas=[];
function ok(c,n){ if(!c) falhas.push(n); console.log((c?'  OK   ':'  FALHA ')+n); }

const hoje = new Date();
const hj = d => { const x=new Date(hoje); x.setDate(x.getDate()-d);
  return String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear(); };
const iso = d => { const x=new Date(hoje); x.setDate(x.getDate()-d);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };

console.log('== talões lidos mesmo pelo OCR ==');

const continente = `CONTINENTE MODELO

HIPERMERCADOS SA

NIF 502 011 475

AV. DA REPUBLICA 1234

2685-223 LISBOA

FATURA SIMPLIFICADA

FS 0234/000123

${hj(0)} 18:42

LEITE MIMOSA 1L' 2 1,09 2,18
PAO DE FORMA 1,45 1,45
ARROZ AGULHA 1KG 1,29 1,29
FRANGO INTEIRO 4,87 4,87
MACA ROYAL GALA 2,31 2,31
DETERGENTE LOICA 1,99 1,99
TOGURTE NATURAL 4 1,49 1,49
TOTAL A PAGAR 14,58
MULTIBANCO 14,58
OBRIGADO PELA SUA VISITA`;

let r = talaoInterpretar(continente);
console.log('   ', JSON.stringify({v:r.valor,l:r.loja,c:r.categoria,d:r.data,cf:r.confianca}));
ok(r.ok && r.valor===14.58, 'Continente: o total é 14,58 e não a soma dos artigos');
ok(r.loja==='Continente', 'e a loja é o Continente');
ok(r.categoria==='mercado', 'em mercado');
ok(r.data===iso(0), 'com a data do talão');
ok(r.confianca==='alta', 'e com confiança alta');

const pingo = `PINGO DOCE

DISTRIBUICAO ALIMENTAR SA
NIF 500829993

RUA JOAO MENDONCA 505
4050-000 PORTO

FATURA SIMPLIFICADA N. 118/4429
DATA ${hj(1).replace(/\//g,'-')} HORA 09:15
BATATA SACO 2KG 1,79
CEBOLA KG 0,98
AZEITE GALLO 0O.75L 5,49
BACALHAU DEMOLHADO 8,32
CERVEJA SUPER BOCK 6 3,99
SUBTOTAL 20,57
IVA 6% 1,12
TOTAL 20,57
NUMERARTIO 25,00
TROCO 4,43`;

r = talaoInterpretar(pingo);
console.log('   ', JSON.stringify({v:r.valor,l:r.loja,c:r.categoria,d:r.data}));
ok(r.valor===20.57, 'Pingo Doce: 20,57 — nem o subtotal, nem os 25,00 entregues');
ok(r.loja==='Pingo Doce', 'a loja é o Pingo Doce');
ok(r.data===iso(1), 'e a data de ontem, escrita com traços');

const carrefour = `CARREFOUR COMERCIO E
INDUSTRIA LTDA

CNPJ 45.543.915/0001-81

AV PAULISTA 1500 SAO PAULO
CUPOM FISCAL

${hj(0)} 14:07

ARROZ TIO JOAO 5KG 24,90
FEIJAO CARIOCA 1KG 8,49
OLEO SOJA LIZA 7,29
ACUCAR UNIAO 1KG 4,99
CAFE PILAO 500G 18,90
LEITE ITAMBE 1L 3 5,49 16,47
TOTAL R$ 81,04
CARTAO DEBITO 81,04
OBRIGADO VOLTE SEMPRE`;

r = talaoInterpretar(carrefour);
console.log('   ', JSON.stringify({v:r.valor,l:r.loja,c:r.categoria}));
ok(r.valor===81.04, 'Carrefour: 81,04 em reais');
ok(r.loja==='Carrefour' && r.categoria==='mercado', 'loja e categoria certas');

const galp = `GALP ENERGIA

POSTO DE ABASTECIMENTO

NIF 504 499 777

${hj(0)} 07:33
GASOLEO SIMPLES

34,12 LT X 1,619

TOTAL 55,24
CARTAO CREDITO 55,24`;

r = talaoInterpretar(galp);
console.log('   ', JSON.stringify({v:r.valor,l:r.loja,c:r.categoria}));
ok(r.valor===55.24, 'Galp: 55,24 — e não os 34,12 litros nem o 1,619 por litro');
ok(r.categoria==='transporte', 'e vai para transporte');

console.log('\n== as armadilhas ==');

r = talaoInterpretar(`LIDL\n${hj(0)}\nPAO 0,89\nTOTAL A PAGAR 12,40\nNUMERARIO 20,00\nTROCO 7,60`);
ok(r.valor===12.40, 'não confunde o dinheiro entregue com o total');

r = talaoInterpretar(`MERCADONA\nARTIGOS 7\nTOTAL DE ITENS 7\nTOTAL 33,18`);
ok(r.valor===33.18, '"total de itens 7" não é um total de dinheiro');

r = talaoInterpretar(`AUCHAN\nTOTAL 45,00\nDESCONTO CARTAO 5,00\nTOTAL A PAGAR 40,00`);
ok(r.valor===40.00, 'com dois totais, ganha o "total a pagar"');

r = talaoInterpretar(`FARMACIA CENTRAL\nRUA DIREITA 12\nBEN-U-RON 4,20\nIVA 6% 0,25\nTOTAL 4,20`);
ok(r.valor===4.20 && r.categoria==='saude', 'a linha do IVA não ganha ao total');

r = talaoInterpretar(`CONTINENTE\nAV. DA REPUBLICA 1234\n2685-223 LISBOA\nNIF 502 011 475\nTOTAL 8,15`);
ok(r.valor===8.15, 'moradas e códigos postais não são dinheiro');

r = talaoInterpretar(`PADARIA DO BAIRRO\nPAO 1,20\nCAFE 0,70\nBOLO 1,50`);
console.log('   sem linha de total →', r.valor, r.confianca);
ok(r.ok && r.confianca==='baixa', 'sem linha de total, a confiança desce');

r = talaoInterpretar('');
ok(!r.ok && r.motivo==='vazio', 'texto vazio não inventa nada');

r = talaoInterpretar('xxxx\nyyyy\nzzzz');
ok(!r.ok && r.motivo==='sem-total', 'texto sem número nenhum não inventa nada');

r = talaoInterpretar(`SUPERMERCADO SOL\n${hj(0)}\nTOTAL 1 234,56`);
ok(r.valor===1234.56, 'milhares com espaço (1 234,56)');

r = talaoInterpretar(`ATACADAO\n${hj(0)}\nTOTAL R$ 1.499,90`);
ok(r.valor===1499.90, 'milhares com ponto (1.499,90)');

r = talaoInterpretar(`LOJA X\n01/01/2019\nTOTAL 10,00`);
ok(r.data===null, 'uma data de há sete anos é ruído e é descartada');

const amanha = new Date(); amanha.setDate(amanha.getDate()+40);
const fut = String(amanha.getDate()).padStart(2,'0')+'/'+String(amanha.getMonth()+1).padStart(2,'0')+'/'+amanha.getFullYear();
r = talaoInterpretar(`LOJA X\n${fut}\nTOTAL 10,00`);
ok(r.data===null, 'uma data no futuro também');

r = talaoInterpretar(`LOJA X\n32/13/2026\nTOTAL 10,00`);
ok(r.data===null, 'e o dia 32 do mês 13 também não passa');

r = talaoInterpretar(`PASTELARIA A MINHA\nRUA DAS FLORES 3\n${hj(0)}\nTOTAL 3,40`);
console.log('   loja desconhecida →', JSON.stringify(r.loja), r.lojaConhecida);
ok(r.loja==='Pastelaria A Minha' && r.lojaConhecida===false,
   'loja desconhecida: fica o nome que está no talão, e diz-se que não é certo');

r = talaoInterpretar(`TOTAL 25,00`);
ok(r.confianca==='baixa', 'um talão com uma linha só não merece confiança alta');

console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length) process.exit(1);
