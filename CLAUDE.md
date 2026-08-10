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
| `respostas.js` | as respostas longas do chat, nas quatro línguas. Só a app o carrega |
| `investir.js` | onde pôr o dinheiro a render, e a calculadora do juro composto |
| `irs.js` | o IRS: estimativa, e o que ainda dá para pedir. Toda a lei vive no `IRS_REF` |
| `casa.js` | a casa partilhada: duas contas, os mesmos movimentos, em tempo real |
| `ferramentas.js` | as calculadoras, e a arrumação das ferramentas por grupos (`GRUPOS_FERR`) |
| `talao.js` + `vendor/ocr/` | ler a fotografia do talão, dentro do telemóvel |
| `banner.js` | o carrossel do topo |
| `ia.js` + `servidor/` | a IA. **Ligada**, no worker grátis da Cloudflare |
| `app/index.html` | a aplicação. Tudo numa página, com gavetas `<details>` |

A barra tem seis separadores: **Início · Lançar · Mês · IRS · Ferramentas ·
Escrever**. O IRS tem separador próprio e não é uma gaveta das Ferramentas —
é a única coisa aqui dentro com um prazo, e entre Abril e Junho não pode
estar escondida dentro de um grupo. Cada separador é uma `<section class="ecra"
id="ecra-…">`; quem troca é o bloco `abas()` no fim do `app/index.html`, e a
única coisa que ele faz é mudar a classe `.activo`. Quem precisar de saber que
um ecrã abriu (o `irs.js`, o `banner.js`) fica à escuta dessa classe em vez de
saber como a navegação funciona.

Alguns destinos deixaram de ser ecrãs — as contas fixas vivem no fim do Mês, a
dívida e os apoios são caixas nas Ferramentas. A tabela `ANCORAS` é a lista a
sério do que existe, e é a ela que se pergunta se um endereço é válido:
perguntar aos elementos é frágil, porque a resposta muda conforme a ordem por
que os blocos correm.

Duas coisas que já morderam e convém saber antes de mexer:

- **Nomes globais colidem.** Não há módulos: tudo o que se declara no topo de
  um `.js` fica no `window`, e o último a carregar ganha. Um `num()` no
  `ferramentas.js` apagou o `num()` do `app-financas.js` e pôs a caixa da
  reserva a dizer "0 meses" a quem tinha dinheiro de lado — sem um erro na
  consola. Antes de criar um nome curto, `grep` por ele.
- **Um simulador não pode errar para o lado bom.** Vale para o IRS, para o
  `investir.js` e para o que vier: um número simpático e falso é pior do que
  não haver número nenhum, porque a pessoa acredita nele.

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

- **As tabelas do IRS estão todas conferidas.** No `irs.js`, cada bloco do
  `IRS_REF` tem `verificado` e `fonte` com endereço. As sete foram lidas na
  fonte: os escalões e a taxa de solidariedade no Diário da República, a
  dedução específica, o mínimo de existência, os limites das deduções e o
  tecto global na tabela oficial da AT, os coeficientes do artigo 31.º na
  página do código, e a escada dos dez anos no folheto do IRS Jovem. Por isso
  o aviso laranja deixou de aparecer — e há um teste que falha no dia em que
  alguém acrescentar uma tabela sem a conferir, o que o faz voltar sozinho.
  **Mudam todos os anos com a Lei do Orçamento.**
- **O motor do IRS está conferido contra duas liquidações a sério.** No
  `teste-irs.mjs`: uma pessoa sozinha sem IRS Jovem (reproduzida ao cêntimo,
  linha a linha) e um casal em conjunto com IRS Jovem. A segunda apanhou o
  defeito mais caro que este ficheiro já teve — o motor subtraía o rendimento
  isento em vez de o englobar para determinar a taxa, e prometia **662 € a
  menos** de imposto a um jovem no 5.º ano. Dava o resultado certo no caso
  dela, porque o colectável era zero, e só se viu porque a nota mostra as
  linhas do meio. **Conferir sempre as linhas do meio, e não só o total.**
- **O IRS não vai ao Portal das Finanças, e não deve ir.** Estima e aponta o
  que falta pedir. Nunca pede a senha, nunca entrega nada. Se um dia houver
  cobrança pela ferramenta, é por esta conta — não por entregar a declaração
  de alguém.
- **Textos por traduzir.** O ecrã final do arranque, a gaveta do IRS e as
  páginas do site fora de `/app/` continuam só em português. As respostas
  longas do chat (`respostas.js`) e as ferramentas todas — nomes, campos,
  botões e a ajuda com os exemplos — já estão nas quatro.
- **As taxas envelhecem.** No `investir.js`, `INVEST_REF` tem `taxa`, `fonte` e
  `verificado`. A data está à vista no ecrã de propósito. Quando mudarem, são
  duas linhas — e o texto do instrumento está no mesmo ficheiro, ao lado, para
  os dois serem actualizados ao mesmo tempo. O `IRS_REF` segue a mesma regra,
  e muda todos os anos com a Lei do Orçamento.
- **As regras do Firestore publicam-se à mão.** O `firestore.rules` está no
  repositório mas o GitHub Pages não o lê: quem o mudar tem de o colar outra
  vez na consola do Firebase, senão a casa partilhada continua a correr com as
  regras velhas.

## Uma coisa sobre este repositório

Este projecto é só do `godiandk/vida-financeira`. Não tem nada que ver com o
`tecnova-digital`, e nada daqui deve ser empurrado para lá.
