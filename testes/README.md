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
| `ferr.mjs` | as calculadoras do site, e o que fica trancado sem chave |

## Duas coisas que enganam

1. **O idioma.** O Playwright abre em `en-US`. Um teste que não escreva
   `localStorage.setItem('vf:lingua','pt')` vê a aplicação em inglês e falha
   por uma razão que não tem nada que ver com o que está a testar.
2. **O `addInitScript` corre em cada navegação**, incluindo nos `reload()`.
   Um teste que escreva no `localStorage` lá dentro sem se defender está a
   apagar, a cada recarregamento, aquilo que acabou de gravar.

## O que aqui não está

O `ferr.mjs` precisa que o Firebase carregue para o painel da chave aparecer;
sem rede para o `gstatic.com` falha uma parte, e não é defeito do site.
