/* Gera talões falsos, com o aspecto dos verdadeiros, para haver com que
   testar o OCR sem depender de fotografias reais. */
import { chromium } from 'playwright';
import fs from 'fs';
const D=process.env.VF_TALOES || new URL('./talos/', import.meta.url).pathname;
/* Os talões de mentira vivem ao lado dos testes que os usam, e não numa
   pasta temporária de outro projecto. Estava aqui um caminho absoluto para
   o scratchpad do `tecnova-digital` — que não tem nada que ver com isto — e
   por isso a suite rebentava em qualquer máquina que não fosse aquela.
   `VF_TALOES=` muda a pasta para quem os quiser noutro sítio. */
const b=await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium'});

const talos = [
 {f:'continente.png', w:420, cor:'#fff', txt:`
CONTINENTE MODELO
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

OBRIGADO PELA SUA VISITA
`},
 {f:'pingodoce.png', w:400, cor:'#f7f5f0', txt:`
PINGO DOCE
DISTRIBUICAO ALIMENTAR SA
NIF 500829993
RUA JOAO MENDONCA 505
4050-000 PORTO

FATURA SIMPLIFICADA N. 118/4429
DATA 02-08-2026  HORA 09:15

BATATA SACO 2KG        1,79
CEBOLA KG              0,98
AZEITE GALLO 0.75L     5,49
BACALHAU DEMOLHADO     8,32
CERVEJA SUPER BOCK 6   3,99

SUBTOTAL              20,57
IVA 6%                 1,12

TOTAL                 20,57
NUMERARIO             25,00
TROCO                  4,43
`},
 {f:'carrefour.png', w:400, cor:'#fff', txt:`
CARREFOUR COMERCIO E
INDUSTRIA LTDA
CNPJ 45.543.915/0001-81
AV PAULISTA 1500 SAO PAULO

CUPOM FISCAL
02/08/2026  14:07

ARROZ TIO JOAO 5KG    24,90
FEIJAO CARIOCA 1KG     8,49
OLEO SOJA LIZA         7,29
ACUCAR UNIAO 1KG       4,99
CAFE PILAO 500G       18,90
LEITE ITAMBE 1L    3   5,49   16,47

TOTAL R$              81,04

CARTAO DEBITO         81,04

OBRIGADO VOLTE SEMPRE
`},
 {f:'bomba.png', w:380, cor:'#fff', txt:`
GALP ENERGIA
POSTO DE ABASTECIMENTO
NIF 504 499 777

02/08/2026        07:33

GASOLEO SIMPLES
34,12 LT X 1,619

TOTAL                 55,24

CARTAO CREDITO        55,24
`},
];

for (const t of talos) {
  const p = await b.newPage({viewport:{width:t.w, height:900}, deviceScaleFactor:2});
  await p.setContent(`<body style="margin:0;background:${t.cor};font-family:'DejaVu Sans Mono',monospace;">
    <pre style="margin:0;padding:22px 18px;font-size:14px;line-height:1.5;color:#111;white-space:pre">${t.txt.trim()}</pre></body>`);
  const el = await p.locator('pre');
  await el.screenshot({path: D+t.f});
  await p.close();
  console.log(t.f, fs.statSync(D+t.f).size, 'bytes');
}
await b.close();
