# Vida Financeira — como se trabalha aqui

Para quem é isto: pessoas de Portugal e do Brasil com o dinheiro contado. Não é
uma app de investimento nem de produtividade — é para quem precisa de saber se
chega ao fim do mês. Tudo o que se decide aqui decide-se com essa pessoa à
frente.

## As regras que não se quebram

1. **Zero dependências, zero passo de compilação.** HTML, CSS e JavaScript
   servidos pelo GitHub Pages. Não há `npm install` para o site correr, não há
   bundler, não há framework. Se uma solução precisar de um, é a solução
   errada.
2. **Funciona sem internet.** É PWA. Os movimentos vivem no `localStorage` e a
   nuvem (Firebase) é opcional e vem por cima.
3. **Os movimentos não saem do aparelho.** Está prometido na página inicial.
   O OCR do talão corre dentro do telemóvel (Tesseract em WASM, em
   `vendor/ocr/`). A IA, se um dia for ligada, recebe um resumo de três linhas
   e nunca a lista do que a pessoa comprou.
4. **Nunca se recomenda um produto financeiro concreto.** Nomeia-se o
   instrumento, nunca a marca. Nenhum banco, corretora, fundo, cripto ou link
   de afiliado. Há um teste que falha se aparecer um nome de marca.
5. **Nunca se diz a alguém que a culpa é dele.** Quem não chega ao fim do mês
   raramente lá chegou por indisciplina, e a app não pede para poupar dinheiro
   que não existe.
6. **Mostra-se a conta e diz-se a fonte.** Taxas com origem e data à vista, e
   impostos descontados. Um número grande sem imposto é mentira por omissão.

## Como se escreve

Português de Portugal, nos comentários e nas mensagens de commit. Os
comentários explicam **porquê**, não o quê — de preferência dizendo que defeito
real é que aquela linha impede de voltar a acontecer. As mensagens de commit
são longas e explicam a decisão, não o diff.

Nomes de funções e de variáveis em português (`desenharInvestir`,
`saldoDaCarteira`, `precisaArranque`).

## Onde está o quê

| ficheiro | o que faz |
|---|---|
| `app-financas.js` | o motor: movimentos, meses, carteiras, reserva, dívida, arranque |
| `interpretar.js` | lê o que a pessoa escreve, nas quatro línguas |
| `assistente.js` | o chat |
| `idiomas.js` | todas as frases da interface, em `pt`, `br`, `es`, `en` (o `br` só leva o que muda mesmo) |
| `investir.js` | onde pôr o dinheiro a render, e a calculadora do juro composto |
| `talao.js` + `vendor/ocr/` | ler a fotografia do talão, dentro do telemóvel |
| `banner.js` | o carrossel do topo |
| `ia.js` + `servidor/` | a IA, escrita e **desligada** (`IA_ENDERECO` vazio) |
| `app/index.html` | a aplicação. Tudo numa página, com gavetas `<details>` |

## Publicar

Trabalha-se em `main` e publica-se com `git push origin main`. O GitHub Pages
faz o resto; demora uns minutos. **Sempre que se mexer num `.js` ou num `.css`,
subir o `?v=NN` em todos os HTML e o `VERSAO` do `sw.js`** — senão o service
worker serve a versão velha a quem já lá esteve.

## Testar

```sh
sh testes/correr.sh          # tudo
sh testes/correr.sh inv      # um pedaço
```

Precisa de `npm i -D playwright` (só para testar; o site não precisa). Ver
`testes/README.md` — em especial as duas armadilhas: o Playwright abre em
`en-US`, e o `addInitScript` corre outra vez em cada `reload()`.

Não se publica nada sem correr os testes que tocam no que se mexeu.

## O que está por fazer

- **A IA está desligada de propósito.** Há duas maneiras de a ligar, descritas
  no `servidor/README.md`: uma grátis e sem cartão (o modelo da Cloudflare) e
  uma paga (Anthropic). O conselho que está lá escrito mantém-se: deixar
  correr um mês sem ela e só depois decidir.
- **Textos por traduzir.** As respostas longas de ajuda do chat, o ecrã final
  do arranque e as páginas do site fora de `/app/` continuam só em português.
- **As taxas envelhecem.** No `investir.js`, `INVEST_REF` tem `taxa`, `fonte` e
  `verificado`. A data está à vista no ecrã de propósito. Quando mudarem, são
  duas linhas — e o texto do instrumento está no mesmo ficheiro, ao lado, para
  os dois serem actualizados ao mesmo tempo.

## Uma coisa sobre este repositório

Este projecto é só do `godiandk/vida-financeira`. Não tem nada que ver com o
`tecnova-digital`, e nada daqui deve ser empurrado para lá.
