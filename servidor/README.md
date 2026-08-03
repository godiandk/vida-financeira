# O servidor da IA

Isto está escrito e testado no que se pode testar sem contas, **e não está a
correr**. Só passa a existir quando o Wesley criar uma conta — e enquanto não
existir, a aplicação funciona exactamente como hoje, sem mudar nada e sem
falhar nada.

Há duas maneiras de o pôr a andar: **uma grátis, sem cartão nenhum**, e uma
paga. Estão as duas descritas aqui em baixo, e a grátis vem primeiro por ser a
que eu escolheria.

## Porque é que isto é preciso

A Vida Financeira é só ficheiros: HTML, CSS e JavaScript, servidos pelo GitHub
Pages. Não há servidor nenhum, e é daí que vêm três promessas escritas na
página inicial — funciona sem internet, não tem rastreadores, e os movimentos
não passam por lado nenhum.

Uma IA precisa de uma chave secreta. Uma chave secreta dentro de um ficheiro
público não é secreta: qualquer pessoa a abre com o botão direito do rato. Em
dias estaria a ser usada por estranhos, e a factura vinha para quem a pôs lá.

Este servidor é a caixa onde essa chave fica fechada — ou, na via grátis, a
peça que fala com o modelo que corre dentro da própria Cloudflare, e que por
isso não precisa de chave nenhuma. É a peça mais pequena possível que resolve
o problema, e não faz mais nada.

## O que ele faz, e o que não faz

Faz três coisas:

1. confirma que quem pergunta tem conta na aplicação — verifica a assinatura
   do Firebase a sério, com as chaves públicas da Google;
2. trava quem pergunta de mais (20 por dia por pessoa);
3. passa a pergunta ao modelo e devolve a resposta.

Não faz:

- **não guarda conversas.** Nem em log, nem em base de dados;
- **não recebe movimentos.** A aplicação manda um resumo de três linhas — o
  que entra, o que sai, se há dívida — e nunca a lista do que a pessoa comprou;
- **não substitui as regras.** O `interpretar.js` continua a lançar, a
  calcular e a corrigir de graça, sem internet e sem contar a ninguém. A IA só
  entra quando as regras dizem "não percebi".

## Há dois caminhos, e um deles não tem factura

| | `worker-gratis.js` | `worker.js` |
|---|---|---|
| onde corre o modelo | dentro da Cloudflare | na Anthropic |
| contas a criar | **uma** (Cloudflare) | duas (Cloudflare + Anthropic) |
| cartão | **nenhum** | sim, na Anthropic |
| quanto dá por dia | ~1.300 respostas (10.000 neurónios grátis) | o que se pagar |
| quando acaba | responde "não dá" e o chat segue pelas regras | continua, e a factura sobe |
| qualidade | boa para conversa de contas; frases mais curtas | melhor |

**Comece pelo grátis.** É a mesma aplicação, com as mesmas regras escritas, e a
única diferença que a pessoa nota é a resposta ser mais seca. Se um dia isso
incomodar, troca-se o ficheiro do worker por o outro e põe-se o cartão — o
`ia.js` e a aplicação não mudam uma linha.

## A via grátis (sem cartão)

1. **dash.cloudflare.com** → criar conta → Workers & Pages → Create → Worker
2. Cole lá o **`worker-gratis.js`** deste directório
3. Settings → **Bindings** → Add → **Workers AI** → nome da variável: `IA`
   (é assim que o worker chega ao modelo; sem esta ligação ele não sabe onde
   perguntar)
4. Settings → **Variables**:

   | nome | o que é |
   |---|---|
   | `FIREBASE_PROJECTO` | `vida-financeira-faf77` |
   | `ORIGENS` | `https://godiandk.github.io` |

5. Settings → **Rate Limiting** → 20 pedidos por 86400 segundos, ligado ao
   worker com o nome `TRAVAO`
6. Ponha o endereço que o painel lhe dá no `ia.js`, na linha do `IA_ENDERECO`

**Não adicione cartão nenhum à conta da Cloudflare.** É isso — e só isso — que
garante que isto nunca lhe custa dinheiro: sem cartão, quando os 10.000
neurónios do dia acabam, a Cloudflare recusa em vez de cobrar. O worker
devolve "não dá", o `ia.js` desiste sem se queixar, e o chat responde pelas
regras como responde hoje.

### Porque não o Gemini, que dá mais de graça

Dá, e também não pede cartão. Mas no plano grátis do Google as perguntas e as
respostas podem ser usadas para melhorar os produtos deles. A página inicial
desta aplicação promete que o que se lá escreve não sai daqui, e isso não se
troca por uns cêntimos.

## A via paga

### 1. Conta na Anthropic (tem cartão)

- console.anthropic.com → criar conta
- Adicionar crédito. **Comece com 5 dólares** e veja quanto dura antes de pôr
  mais. Uma pergunta ao Haiku custa fracções de cêntimo, mas é melhor ver o
  número com os seus olhos do que acreditar no meu.
- API Keys → Create Key → guarde-a. **Não a ponha em lado nenhum do site.**

### 2. Conta na Cloudflare (grátis)

- dash.cloudflare.com → criar conta
- Workers & Pages → Create → Worker
- Cole lá o `worker.js` deste directório

### 3. Os três segredos

No painel do Worker, em **Settings → Variables**:

| nome | o que é | onde vai |
|---|---|---|
| `ANTHROPIC_KEY` | a chave da Anthropic | **Secret** (encriptado) |
| `FIREBASE_PROJECTO` | `vida-financeira-faf77` | Variable |
| `ORIGENS` | `https://godiandk.github.io` | Variable |

O `ANTHROPIC_KEY` tem de ir como **Secret** e não como Variable — a diferença
é que um Secret não volta a ser mostrado a ninguém, nem a si.

### 4. O travão

Settings → **Rate Limiting** → criar um limite de **20 pedidos por 86400
segundos**, e ligá-lo ao Worker com o nome `TRAVAO`.

Sem isto o worker corre na mesma, mas sem travão nenhum — e uma conta sem
travão é uma conta que pode ser esvaziada por alguém com tempo livre.

### 5. Ligar a aplicação

Depois de o Worker estar publicado, o painel dá-lhe um endereço parecido com
`https://vf-ia.SEUNOME.workers.dev`. Ponha-o no `ia.js`, na linha que diz:

```js
const IA_ENDERECO = '';   // ← o endereço do worker
```

E é só. Enquanto essa linha estiver vazia, a aplicação nem chega a tentar.

## Quanto é que isto custa

Com o Haiku, uma pergunta e uma resposta curtas ficam à volta de **0,03
cêntimos de euro**. Mil perguntas por dia são cerca de **30 cêntimos por dia**.

Duas contas que valem a pena fazer antes de abrir isto a toda a gente:

- 100 pessoas a usarem o limite todo (20/dia) = ~60 cêntimos por dia
- 1000 pessoas a usarem metade (10/dia) = ~3 euros por dia

A assinatura são 9,89 € por ano por pessoa. Dá para pagar isto com folga, mas
**só se o travão estiver ligado**. Sem travão, uma pessoa sozinha pode gastar
num dia o que mil pagam num ano.

## O que eu faria antes de abrir isto

Deixe correr um mês sem IA — nem a grátis. As regras que estão escritas hoje já lançam,
calculam, corrigem e lêem talões, sem custar um cêntimo e sem mandar nada para
fora. Se aparecerem frases que elas não percebem, mande-mas — muitas resolvem-se
com uma linha, e uma linha não tem factura ao fim do mês.

A IA vale a pena quando as frases forem demasiado variadas para regras. Nessa
altura este ficheiro já está aqui à espera.
