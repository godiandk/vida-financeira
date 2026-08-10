/* Os talões maus, passados pelo mesmo caminho que a aplicação usa:
   `ocrPrepararImagem` (1600px, cinzentos, contraste esticado) e depois o
   `talaoInterpretar`. O que interessa saber é se erra o valor — errar o
   valor em silêncio é o único resultado inaceitável. */
import { chromium } from 'playwright';
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});
const p=await b.newPage();
p.on('pageerror',e=>console.log('!!',e.message));
await p.goto('http://127.0.0.1:8930/vazio-ocr.html',{waitUntil:'domcontentloaded'});
await p.evaluate(async()=>{
  for (const f of ['interpretar.js','talao.js']) {
    await new Promise(ok=>{const s=document.createElement('script');s.src='/'+f;s.onload=ok;document.head.appendChild(s);});
  }
  window.raizDoSite = () => '/';
});
const casos=['continente','mau-torto','mau-desbotado','mau-sombra','mau-ruido','mau-escuro','mau-tudo'];

/* Os taloes de mentira sao servidos de `testes/talos/`, ao lado dos testes que
   os usam. Estavam a ser lidos de `/talos/` — uma pasta na raiz do site que
   nao existe e nunca foi para o repositorio — por isso os sete falhavam
   sempre, com `erro: imagem`, e a suite nao dizia nada porque o `correr.sh`
   nao sabia falhar. */
const PASTA='/testes/talos/';
const existe = await fetch('http://127.0.0.1:8930'+PASTA+'continente.png')
  .then(r=>r.ok).catch(()=>false);
if (!existe) {
  console.log('  -- saltado: faltam os taloes de mentira em testes/talos/');
  console.log('     gere-os primeiro:  node testes/fazer-talao.mjs && node testes/fazer-maus.mjs');
  await b.close();
  process.exit(0);
}
const r = await p.evaluate(async ({casos, pasta}) => {
  const out=[];
  for (const c of casos) {
    const t0=performance.now();
    let linha={caso:c};
    try {
      const texto = await ocrLer(pasta+c+'.png');
      const i = talaoInterpretar(texto);
      linha = {caso:c, ok:i.ok, valor:i.valor, loja:i.loja, data:i.data,
               conf:i.confianca, ms:Math.round(performance.now()-t0),
               linhas:(i.linhas||[]).length};
    } catch (e) { linha.erro = e.message; }
    out.push(linha);
  }
  return out;
}, {casos, pasta: PASTA});
console.log('caso              lido       loja           data         confiança   linhas  ms');
for (const x of r) {
  console.log(
    String(x.caso).padEnd(17),
    String(x.ok ? x.valor : (x.erro||'—')).padEnd(10),
    String(x.loja||'—').slice(0,14).padEnd(14),
    String(x.data||'—').padEnd(12),
    String(x.conf||'—').padEnd(11),
    String(x.linhas||0).padEnd(7),
    x.ms||''
  );
}
const falhas=[]; const ok=(c,n)=>{if(!c)falhas.push(n);console.log((c?'  OK   ':'  FALHA ')+n);};

console.log('');
/* A regra que nao pode ser quebrada: um valor errado apresentado como certo.
   Preferivel nao ler nada. */
const errados = r.filter(x=>x.ok && x.valor!==14.58 && x.conf==='alta');
ok(errados.length===0,
   'nenhum talao deu um valor errado com confianca alta' +
   (errados.length?' ('+JSON.stringify(errados.map(e=>[e.caso,e.valor]))+')':''));

const certos = r.filter(x=>x.valor===14.58).length;
ok(certos===r.length, 'os '+r.length+' talaos deram 14,58 (deu '+certos+')');

r.forEach(x=>{
  ok(x.valor===14.58, x.caso+': valor certo');
});
r.forEach(x=>{
  ok(/continente/i.test(x.loja||''), x.caso+': loja reconhecida');
});
const lentos = r.filter(x=>x.ms>8000);
ok(lentos.length===0, 'nenhum demorou mais de 8 s'+(lentos.length?' ('+lentos.map(l=>l.caso+' '+l.ms).join(', ')+')':''));

await b.close();
console.log(`\n=== ${falhas.length?'FALHAS:\n - '+falhas.join('\n - '):'TODAS PASSARAM'} ===`);

/* Sair com codigo de erro quando alguma coisa falhou. Sem isto, o teste
   escrevia "FALHAS" no ecra e dizia ao corredor que tinha corrido bem — e o
   `correr.sh` acreditava, porque so' tem o codigo de saida para se guiar.
   Um teste que nao sabe reprovar da' autorizacao para publicar. */
if (falhas.length) process.exit(1);
