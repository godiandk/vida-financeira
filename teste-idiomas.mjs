/* ============================================================
   Vida Financeira — as quatro línguas batem certo?

     node teste-idiomas.mjs

   Há duas maneiras de partir uma aplicação traduzida, e nenhuma delas dá erro
   no navegador — é isso que as torna caras:

   **Uma chave que só existe em português.** Quem escreve em inglês recebe a
   frase portuguesa (o `T()` cai no `pt` de propósito, e faz bem: uma frase na
   língua errada percebe-se, uma chave crua parece avaria). Mas ninguém dá por
   isso a testar em português, e o defeito só aparece do lado de quem não se
   queixa.

   **Um buraco com o nome trocado.** O código manda `{metade}` e a tradução
   espanhola escreve `{mitad}`. O resultado é um texto sobre o dinheiro de
   alguém com a palavra `{mitad}` no meio — e a pessoa a perguntar-se se a
   aplicação está avariada ou se é ela que não percebe.

   Este ficheiro lê os textos como o navegador os lê e compara as quatro
   línguas com o português, que é o original. O `br` é caso à parte: por
   desenho, só tem o que muda mesmo, e o que não tiver cai no `pt`.
   ============================================================ */

import { readFileSync } from 'node:fs';

/* Os dois ficheiros são scripts de página, não módulos. Lêem-se e correm-se
   como o navegador faz, com o pouco que eles esperam encontrar à volta. */
const codigo = readFileSync('idiomas.js', 'utf8') + '\n' +
               readFileSync('respostas.js', 'utf8') + '\n; return TEXTOS;';

const TEXTOS = new Function('navigator', 'localStorage', 'document', 'window', codigo)(
  { language: 'pt-PT' },
  { getItem: () => null, setItem: () => {} },
  { querySelectorAll: () => [], documentElement: {}, addEventListener: () => {},
    getElementById: () => null },
  { dispatchEvent: () => {} }
);

const falhas = [];
const buracos = s => (String(s).match(/\{[a-zA-Z0-9]+\}/g) || []).sort().join(',');

/* ---- todas as línguas dizem tudo o que o português diz ---- */
for (const l of ['es', 'en']) {
  for (const chave of Object.keys(TEXTOS.pt)) {
    if (TEXTOS[l][chave] === undefined) falhas.push(`falta em ${l}: ${chave}`);
  }
}

/* ---- e ninguém inventou uma chave que o português não tem ---- */
for (const l of ['br', 'es', 'en']) {
  for (const chave of Object.keys(TEXTOS[l])) {
    if (TEXTOS.pt[chave] === undefined) falhas.push(`só existe em ${l}: ${chave}`);
  }
}

/* ---- os buracos são os mesmos, com os mesmos nomes ---- */
for (const l of ['br', 'es', 'en']) {
  for (const chave of Object.keys(TEXTOS[l])) {
    const meus = buracos(TEXTOS[l][chave]);
    const dele = buracos(TEXTOS.pt[chave]);
    if (meus !== dele) {
      falhas.push(`buracos diferentes em ${l}/${chave}: [${meus}] em vez de [${dele}]`);
    }
  }
}

/* ---- as respostas longas do chat estão nas quatro, e não só nas duas ---- */
const longas = Object.keys(TEXTOS.pt).filter(c => c.startsWith('resp.') || c.startsWith('abertura'));
for (const l of ['br', 'es', 'en']) {
  for (const chave of longas) {
    if (TEXTOS[l][chave] === undefined) {
      falhas.push(`resposta longa por traduzir em ${l}: ${chave}`);
    }
  }
}

const contas = ['pt', 'br', 'es', 'en'].map(l => `${l}: ${Object.keys(TEXTOS[l]).length}`).join('   ');
console.log('\nfrases por língua —  ' + contas);
console.log('respostas longas —  ' + longas.length + ' por língua\n');

if (falhas.length) {
  falhas.forEach(f => console.log('  FALHA  ' + f));
  console.log('\n' + falhas.length + ' problemas\n');
  process.exit(1);
}
console.log('as quatro línguas batem certo\n');
