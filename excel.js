/* ============================================================
   Vida Financeira — gerar um ficheiro Excel de verdade

   Um .xlsx é um ZIP com uns ficheiros XML lá dentro. Está escrito à mão aqui
   porque a alternativa era uma biblioteca de centenas de kilobytes vinda de
   outro servidor — e este site funciona sem internet, não carrega código de
   terceiros e é usado por gente com dados contados. Isto ocupa oito
   kilobytes e não pede nada a ninguém.

   Porque não CSV, que já existia: um CSV aberto no Excel português com
   números em vírgula decimal transforma 45,90 em texto ou em 4590, conforme
   a máquina. Quem exportou fica com uma folha que não soma. Um xlsx traz os
   números como números e as datas como datas, e abre igual em todo o lado.

   Sem compressão de propósito. O deflate obrigava a incluir um compressor;
   o ZIP aceita ficheiros "guardados" tal e qual, e uma folha de contas de uma
   família não passa de uns quilobytes.
   ============================================================ */

/* ---------- CRC-32, que o ZIP exige por cada ficheiro ---------- */
const CRC_TAB = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TAB[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function bytesDe(texto) {
  return new TextEncoder().encode(texto);
}

/* ---------- escrever o ZIP ----------
   Formato mínimo: por cada ficheiro um cabeçalho local seguido dos dados, e
   no fim um índice central. É o suficiente para o Excel, o LibreOffice, o
   Google Sheets e o Numbers abrirem sem se queixarem. */
function fazerZip(ficheiros) {
  const partes = [], central = [];
  let deslocamento = 0;

  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  ficheiros.forEach(f => {
    const nome = bytesDe(f.nome);
    const dados = bytesDe(f.conteudo);
    const crc = crc32(dados);

    const local = [].concat(
      u32(0x04034b50), u16(20), u16(0), u16(0),
      u16(0), u16(0),                       // hora e data: zero, não interessam
      u32(crc), u32(dados.length), u32(dados.length),
      u16(nome.length), u16(0)
    );
    partes.push(new Uint8Array(local), nome, dados);

    central.push([].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0),
      u16(0), u16(0),
      u32(crc), u32(dados.length), u32(dados.length),
      u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(deslocamento)
    ).concat(Array.from(nome)));

    deslocamento += local.length + nome.length + dados.length;
  });

  const indice = [].concat.apply([], central);
  const fim = [].concat(
    u32(0x06054b50), u16(0), u16(0),
    u16(ficheiros.length), u16(ficheiros.length),
    u32(indice.length), u32(deslocamento), u16(0)
  );

  partes.push(new Uint8Array(indice), new Uint8Array(fim));

  let total = 0;
  partes.forEach(p => { total += p.length; });
  const saida = new Uint8Array(total);
  let i = 0;
  partes.forEach(p => { saida.set(p, i); i += p.length; });
  return saida;
}

/* ---------- XML ---------- */
function xmlEscapar(t) {
  return String(t === undefined || t === null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    /* Caracteres de controlo são proibidos em XML e fazem o Excel recusar o
       ficheiro inteiro com uma mensagem que não explica nada. */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function letraColuna(n) {
  let s = '';
  n++;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/* As datas no Excel são o número de dias desde 1900, com o famoso dia 29 de
   Fevereiro de 1900 que nunca existiu — e que é preciso respeitar, porque o
   Excel conta com ele. */
function dataSerie(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const d = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.floor(d / 86400000) + 25569;
}

/* Uma célula. `tipo` é 't' texto, 'n' número, 'd' data. */
function celula(ref, valor, tipo) {
  if (tipo === 'n') {
    const v = Number(valor);
    if (!isFinite(v)) return '<c r="' + ref + '"/>';
    return '<c r="' + ref + '" s="2"><v>' + v + '</v></c>';
  }
  if (tipo === 'd') {
    const s = dataSerie(valor);
    if (s === null) return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEscapar(valor) + '</t></is></c>';
    return '<c r="' + ref + '" s="3"><v>' + s + '</v></c>';
  }
  return '<c r="' + ref + '" t="inlineStr"' + (tipo === 'h' ? ' s="1"' : '') +
         '><is><t>' + xmlEscapar(valor) + '</t></is></c>';
}

/* ---------- a folha ---------- */
function folhaXml(linhas) {
  const corpo = linhas.map((linha, i) => {
    const cs = linha.map((c, j) => celula(letraColuna(j) + (i + 1), c.v, c.t)).join('');
    return '<row r="' + (i + 1) + '">' + cs + '</row>';
  }).join('');

  const nCols = linhas.reduce((m, l) => Math.max(m, l.length), 0);
  const cols = '<cols>' +
    '<col min="1" max="1" width="12" customWidth="1"/>' +
    '<col min="2" max="2" width="10" customWidth="1"/>' +
    '<col min="3" max="3" width="18" customWidth="1"/>' +
    '<col min="4" max="4" width="26" customWidth="1"/>' +
    '<col min="5" max="' + Math.max(5, nCols) + '" width="14" customWidth="1"/>' +
    '</cols>';

  /* A ordem destes elementos não é gosto: o esquema exige
     sheetViews → cols → sheetData, por esta ordem, e um leitor exigente
     recusa o ficheiro inteiro se vier trocada. Nasceu trocado aqui — e
     descomprimir e validar o XML dizia que estava tudo bem, porque estava:
     bem formado e na ordem certa são coisas diferentes, e só um leitor de
     folhas a sério distingue as duas.

     A primeira linha fica presa: numa folha com trezentos movimentos, rolar
     sem cabeçalho é rolar às cegas. */
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    cols +
    '<sheetData>' + corpo + '</sheetData></worksheet>';
}

/* Formatos: o 164 é dinheiro com dois decimais e o 165 é a data em dia/mês/ano
   — a ordem que se usa nos dois países, e não a americana. */
function estilosXml(moeda) {
  const simbolo = { EUR: '€', BRL: 'R$', GBP: '£', USD: '$', AOA: 'Kz', CVE: '$' }[moeda] || '';
  const fmtMoeda = simbolo === '€'
    ? '#,##0.00\\ &quot;€&quot;'
    : '&quot;' + xmlEscapar(simbolo) + '&quot;\\ #,##0.00';

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2">' +
      '<numFmt numFmtId="164" formatCode="' + fmtMoeda + '"/>' +
      '<numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>' +
    '</numFmts>' +
    '<fonts count="2">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A2F"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    /* Sem o estilo "Normal" declarado, os leitores avisam que o livro não tem
       estilo por omissão e aplicam o deles. Funciona à mesma, mas é um aviso a
       quem abrir o ficheiro — e um aviso num ficheiro de contas põe em dúvida
       o que lá está dentro. Vai a seguir ao cellXfs, que é onde o esquema o
       quer: numFmts, fonts, fills, borders, cellStyleXfs, cellXfs, cellStyles. */
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

/* ---------- montar o livro ---------- */
function construirXlsx(folhas, moeda) {
  const nomes = folhas.map(f => f.nome);

  const ficheiros = [
    { nome: '[Content_Types].xml', conteudo:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      nomes.map((n, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
        '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>' },

    { nome: '_rels/.rels', conteudo:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' },

    { nome: 'xl/workbook.xml', conteudo:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nomes.map((n, i) => '<sheet name="' + xmlEscapar(n) + '" sheetId="' + (i + 1) +
        '" r:id="rId' + (i + 1) + '"/>').join('') +
      '</sheets></workbook>' },

    { nome: 'xl/_rels/workbook.xml.rels', conteudo:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      nomes.map((n, i) => '<Relationship Id="rId' + (i + 1) +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
        (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (nomes.length + 1) +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' },

    { nome: 'xl/styles.xml', conteudo: estilosXml(moeda) }
  ];

  folhas.forEach((f, i) => {
    ficheiros.push({ nome: 'xl/worksheets/sheet' + (i + 1) + '.xml', conteudo: folhaXml(f.linhas) });
  });

  return fazerZip(ficheiros);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { construirXlsx, fazerZip, crc32, dataSerie, letraColuna };
}
