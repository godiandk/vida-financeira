# Os testes

Não há framework nenhuma, e é de propósito: o resto do projecto não tem
dependências nem passo de compilação, e não fazia sentido a única coisa que
precisa de `npm install` ser aquilo que serve para confirmar que o projecto
funciona.

Cada ficheiro é um programa que escreve `OK` ou `FALHA` por linha e acaba com
`TODAS PASSARAM` ou a lista do que falhou. Correr um teste é correr um
ficheiro.

```sh
sh testes/correr.sh          # tudo
sh testes/correr.sh inv      # só os que têm "inv" no nome
node testes/inv.js           # um, à mão
```

O `correr.sh` levanta um servidor na porta 8930 e mata-o no fim. Os que abrem
um navegador precisam do **Playwright** (`npm i -D playwright`) e de um
Chromium; procura-o em `/opt/pw-browsers/chromium`, e aceita outro caminho em
`CHROMIUM=`.

Os testes do talão precisam de fotografias, e as fotografias não vivem em git.
Geram-se uma vez:

```sh
node testes/fazer-talao.mjs   # os talões a direito
node testes/fazer-maus.mjs    # os mesmos, tortos, com sombra e desbotados
```

Ficam em `testes/talos/` (ou onde `VF_TALOES=` disser). Sem eles, o
`talaoui.mjs` diz que se saltou e sai bem, em vez de despejar uma pilha de
`ENOENT` que parece uma avaria e não é.

## O que cada um guarda

Os testes valem pelo que impedem de voltar a acontecer. Estes são todos
cicatrizes de defeitos reais:

| ficheiro | o que não pode voltar a partir-se |
|---|---|
| `inv.js` | a conta do juro composto, o imposto a incidir sobre os juros e não sobre o capital, e **nenhuma marca de banco ou corretora** no texto sobre investir |
| `invui.mjs` | o ecrã de investir nas quatro línguas e nos dois países, e a moeda a acompanhar o país e não as contas da pessoa |
| `invend.mjs` | `app/#divida` e companhia a abrirem a gaveta certa — deixaram de abrir quando os nove ecrãs viraram um |
| `motor.js` | ler o que a pessoa escreve: valores, correcções, entradas que não podem virar saídas |
| `linguas.js` | uma língua a morder a outra ("stock" não é um lançamento em inglês nem em português) |
| `falar.mjs` | o chat a lançar, a corrigir e a responder na língua em que lhe escrevem |
| `saldo.mjs` | "tenho 500 no banco" a virar saldo e não uma dívida de menos um |
| `arranque2.mjs` | as perguntas do início, incluindo a do salário poder ser saltada por quem ganha à comissão |
| `pergconta.mjs` | perguntar uma vez a quem cria conta, e nunca mais |
| `casal.mjs` | as três carteiras (a minha, a dele/dela, a de emergência) |
| `conferir.mjs` | o acerto de saldo no início do mês |
| `banner.mjs` | o carrossel: roda, pára ao toque, passa com o dedo, e cala-se para quem já pagou |
| `contasfixas.mjs` | as contas que se repetem, e uma conta estragada não levar a app atrás |
| `dividaui.mjs` | a dívida não inventar números que ninguém deu |
| `talaoparse.js` | ler o total, a loja e a data de um talão |
| `talaoui.mjs` | o que se diz a quem vai fotografar um talão, incluindo o tamanho do download |
| `ocrmaus.mjs` | talões maus: desbotados, com ruído, tortos. Precisa dos ficheiros que o `fazer-maus.mjs` gera primeiro |
| `irsui.mjs` | a gaveta do IRS: os campos chegarem ao motor, e a app não prometer poupança nenhuma a quem já paga zero |
| `ferr.mjs` | as calculadoras do site, e o que fica trancado sem chave |

Fora desta pasta, e por isso fora do `correr.sh`, correm-se à mão:

```sh
node teste-irs.mjs         # o motor do IRS, sem ecrã: escalões, mínimo de existência, deduções
node teste-idiomas.mjs     # as quatro línguas terem as mesmas chaves
node teste-chat.mjs        # o chat
node teste-casa.mjs        # a fusão dos movimentos entre dois telemóveis
node teste-app.mjs         # a app inteira (precisa de VF_ENDERECO e VF_CHROMIUM)
node servidor/teste-worker.mjs   # o worker da IA
```

## Três coisas que enganam

1. **O idioma.** O Playwright abre em `en-US`. Um teste que não escreva
   `localStorage.setItem('vf:lingua','pt')` vê a aplicação em inglês e falha
   por uma razão que não tem nada que ver com o que está a testar.
2. **O `addInitScript` corre em cada navegação**, incluindo nos `reload()`.
   Um teste que escreva no `localStorage` lá dentro sem se defender está a
   apagar, a cada recarregamento, aquilo que acabou de gravar.
3. **O `innerText` de um `<details>` fechado só traz o `summary`.** Um teste
   que procure texto lá dentro sem abrir primeiro acusa que a frase não
   existe, quando o que se passou foi não se ter ido lá ver.

## O que aqui não está

O `ferr.mjs` precisa que o Firebase carregue para o painel da chave aparecer;
sem rede para o `gstatic.com` essa parte salta-se, com uma linha a dizer
porquê. Não é defeito do site.

## Um teste novo tem de saber reprovar

Cada ficheiro acaba com:

```js
if (falhas.length) process.exit(1);
```

Sem essa linha, o teste escreve `FALHAS` no ecrã e diz ao corredor que correu
bem — e o corredor acredita, porque só tem o código de saída para se guiar.
Dezassete dos dezanove ficheiros estiveram assim. Se acrescentar um teste,
acrescente também esta linha.

## Uma lição que custou meia dúzia de testes

O `correr.sh` passou meses a não conseguir falhar, e por duas razões
independentes que se tapavam uma à outra.

A primeira: corria `node "$f" | tail`, e num pipe o `$?` é o do último comando
— o `tail` corre sempre bem. A segunda: mesmo que lesse o código certo, quase
nenhum ficheiro saía a não-zero quando falhava. A suite dizia `=== fim ===`
com sete ficheiros a rebentar lá dentro.

E houve ainda uma terceira, do lado contrário: o `trap` de limpeza fazia
`kill` do servidor, e quando esse `kill` falhava — porque a porta já estava
ocupada e o servidor nunca chegou a ser nosso — o `set -e` abortava o trap e
essa falha passava a ser o código de saída do script. O corredor reprovava com
tudo a passar. Um corredor que reprova sem razão ensina-se a ignorar, e a
seguir deixa de se ver o que reprova com razão.

Quando passou a saber falhar, apanhou de uma vez tudo o que a grande arrumação
tinha partido e ninguém tinha visto: o `banner.mjs` a pedir o banner num ecrã
onde ele deixou de aparecer de propósito, o `dividaui` e o `contasfixas` a
procurar gavetas que já não existem, o `invui` e o `ferr` a clicar dentro de
caixas fechadas, o `ocrmaus` a ler as fotografias de uma pasta que nunca
existiu, e o `talaoui` com um caminho absoluto para o scratchpad de outro
projecto. Nenhum era defeito do site — mas dois defeitos a sério do site
estavam escondidos atrás deles: `app/#contas` caía no Início, e `app/#investir`
abria a calculadora errada.

Um teste que não sabe falhar é pior do que não haver teste nenhum, porque dá
autorização para publicar.
