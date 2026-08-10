/* Talões como eles aparecem mesmo: fotografados de lado, com sombra, com o
   papel térmico já desbotado, com ruído de câmara barata e amarrotados.
   Se o OCR só funcionasse com o talão a direito e bem iluminado, isto não
   servia para nada — a fotografia é tirada no parque de estacionamento. */
import { chromium } from 'playwright';
import fs from 'fs';
const D=process.env.VF_TALOES || new URL('./talos/', import.meta.url).pathname;
/* Os talões de mentira vivem ao lado dos testes que os usam, e não numa
   pasta temporária de outro projecto. Estava aqui um caminho absoluto para
   o scratchpad do `tecnova-digital` — que não tem nada que ver com isto — e
   por isso a suite rebentava em qualquer máquina que não fosse aquela.
   `VF_TALOES=` muda a pasta para quem os quiser noutro sítio. */
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});

const TALAO = `CONTINENTE MODELO
HIPERMERCADOS SA
NIF 502 011 475
AV. DA REPUBLICA 1234
2685-223 LISBOA

FATURA SIMPLIFICADA
FS 0234/000123
02/08/2026            18:42

LEITE MIMOSA 1L   2   1,09    2,18
PAO DE FORMA          1,45    1,45
ARROZ AGULHA 1KG      1,29    1,29
FRANGO INTEIRO        4,87    4,87
MACA ROYAL GALA       2,31    2,31
DETERGENTE LOICA      1,99    1,99
IOGURTE NATURAL 4     1,49    1,49

TOTAL A PAGAR                14,58

MULTIBANCO                   14,58

OBRIGADO PELA SUA VISITA`;

/* Cada caso é uma degradação diferente, aplicada ao mesmo talão, para o
   resultado ser comparável: muda a fotografia, não o conteúdo. */
const casos = [
  { f:'mau-torto.png',    css:'transform:rotate(-3.5deg)', fundo:'#c9c6bd', filtro:'' },
  { f:'mau-desbotado.png',css:'', fundo:'#efeee9', filtro:'contrast(0.34) brightness(1.22)' },
  { f:'mau-sombra.png',   css:'', fundo:'#fff', filtro:'', sombra:true },
  { f:'mau-ruido.png',    css:'', fundo:'#fff', filtro:'contrast(0.8)', ruido:true },
  { f:'mau-escuro.png',   css:'', fundo:'#8f8d86', filtro:'brightness(0.55) contrast(0.9)' },
  { f:'mau-tudo.png',     css:'transform:rotate(2.2deg)', fundo:'#b8b5ac',
    filtro:'contrast(0.45) brightness(1.1) blur(0.4px)', ruido:true, sombra:true }
];

for (const c of casos) {
  const p = await b.newPage({viewport:{width:520, height:1000}, deviceScaleFactor:2});
  await p.setContent(`<body style="margin:0;background:${c.fundo};display:grid;place-items:center;height:1000px;position:relative">
    <div style="${c.css};filter:${c.filtro||'none'};background:#fdfcfa;padding:26px 20px;box-shadow:0 6px 24px rgba(0,0,0,.25)">
      <pre style="margin:0;font-family:'DejaVu Sans Mono',monospace;font-size:13px;line-height:1.5;color:#1a1a1a;white-space:pre">${TALAO}</pre>
    </div>
    ${c.sombra ? `<div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 45%,rgba(0,0,0,.3) 100%);pointer-events:none"></div>` : ''}
    ${c.ruido ? `<canvas id="r" style="position:absolute;inset:0;width:100%;height:100%;opacity:.3;mix-blend-mode:multiply"></canvas>
      <script>
        const cv=document.getElementById('r'); cv.width=520; cv.height=1000;
        const x=cv.getContext('2d'); const d=x.createImageData(520,1000);
        for(let i=0;i<d.data.length;i+=4){const v=200+Math.random()*55;
          d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255;}
        x.putImageData(d,0,0);
      <\/script>` : ''}
  </body>`);
  await p.waitForTimeout(300);
  await p.screenshot({path: D+c.f});
  await p.close();
  console.log(c.f, fs.statSync(D+c.f).size, 'bytes');
}
await b.close();
