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

Faz quatro coisas:

1. confirma que quem pergunta tem conta na aplicação — verifica a assinatura
   do Firebase a sério, com as chaves públicas da Google;
2. trava quem pergunta de mais (20 por dia por pessoa);
3. passa a pergunta ao modelo, com as últimas trocas da conversa;
4. **lê o que o modelo escreveu antes de o deixar sair.**

Não faz:

- **não guarda conversas.** Nem em log, nem em base de dados;
- **não recebe movimentos.** A aplicação manda contas — quanto entra, quanto
  leva o essencial, meses de reserva, se há dívida, e as três categorias onde
  o dinheiro se está a ir — e **nunca a lista do que a pessoa comprou**, nem o
  nome de uma loja, nem uma data, nem uma fotografia;
- **não substitui as regras.** O `interpretar.js` continua a lançar, a
  calcular e a corrigir de graça, sem internet e sem contar a ninguém. A IA só
  entra quando as regras dizem "não percebi".

### A revisão do que sai

Um modelo instruído a não fazer uma coisa faz-la à mesma, de vez em quando. E
as coisas que este não pode fazer não são de bom gosto: prometer retorno,
mandar comprar uma marca, dizer a alguém aflito que a culpa é dele, pedir uma
senha, fazer-se passar pelo fundador.

Por isso o que ele escreve é lido antes de sair. Apanhado, pede-se outra vez,
dizendo o que esteve mal. À segunda, **cala-se**: devolve 422 e o chat responde
pela resposta escrita à mão, que para esses casos é melhor.

A revisão erra de propósito para o lado de recusar. O custo de recusar de mais
é uma resposta melhor escrita; o de recusar de menos é alguém a comprar cripto
por causa de uma aplicação que promete não vender nada.

### Dois modelos, um atrás do outro

Pergunta-se primeiro ao **Llama 3.3 70B**. Se ele falhar — quota do dia,
avaria — tenta-se o **8B** antes de desistir, e só depois é que o chat cai nas
regras escritas. Uma resposta mais seca é muito melhor do que nenhuma.

| | por resposta | por dia, nos 10.000 grátis |
|---|---|---|
| Llama 3.3 70B | ~70 neurónios | ~140 respostas |
| Llama 3.1 8B (a reserva) | ~12 neurónios | ~800 respostas |

140 respostas por dia é muito mais procura do que esta aplicação tem. No dia em
que tiver, o pequeno entra sozinho — e ninguém fica sem resposta.

## Há dois caminhos, e um deles não tem factura

| | `worker-gratis.js` | `worker.js` |
|---|---|---|
| onde corre o modelo | dentro da Cloudflare | na Anthropic |
| contas a criar | **uma** (Cloudflare) | duas (Cloudflare + Anthropic) |
| cartão | **nenhum** | sim, na Anthropic |
| quanto dá por dia | ~140 com o 70B, ~800 com o 8B | o que se pagar |
| quando acaba | responde "não dá" e o chat segue pelas regras | continua, e a factura sobe |
| qualidade | boa para conversa de contas | melhor |

**Comece pelo grátis.** É a mesma aplicação, com as mesmas regras escritas, e a
única diferença que a pessoa nota é a resposta ser mais seca. Se um dia isso
incomodar, troca-se o ficheiro do worker por o outro e põe-se o cartão — o
`ia.js` e a aplicação não mudam uma linha.

## A via grátis (sem cartão)

1. **dash.cloudflare.com** → criar conta → Workers & Pages → Create → Worker.
   Dê-lhe o nome `vf-ia` e publique-o como está (o exemplo que a Cloudflare põe
   lá serve para haver worker; o código verdadeiro entra no passo seguinte).
2. **Edit code** → apague tudo o que lá está → cole o **`worker-gratis.js`**
   deste directório → **Deploy**.
3. Settings → **Bindings** → Add → **Workers AI** → nome da variável: `IA`
   (é assim que o worker chega ao modelo; sem esta ligação ele não sabe onde
   perguntar).
4. Settings → **Variables and Secrets** → Add, duas vezes:

   | nome | o que é |
   |---|---|
   | `FIREBASE_PROJECTO` | `vida-financeira-faf77` |
   | `ORIGENS` | `https://godiandk.github.io` |

5. **O travão** (ver a secção a seguir, que explica porquê assim):
   - menu da esquerda → **Storage & Databases** → **KV** → **Create**
   - nome: `vf-ia-travao`
   - volte ao worker → Settings → **Bindings** → Add → **KV namespace**
   - nome da variável: `TRAVAO`, e escolha o `vf-ia-travao` da lista
6. **Confirme antes de ligar seja o que for.** Abra o endereço do worker no
   navegador (`https://vf-ia.SEUNOME.workers.dev`). Ele responde com uma linha
   de estado, e ela tem de dizer isto:

   ```json
   {"ia":true,"projecto":true,"origens":1,"travao":"kv","porDia":20}
   ```

   Se algum estiver `false`, ou o travão disser `"nenhum"`, falta a ligação
   desse passo — e é melhor descobri-lo aqui do que com alguém à espera de
   resposta no telemóvel.
7. Ponha esse mesmo endereço no `ia.js`, na linha do `IA_ENDERECO`.

## Porque é que o travão é um KV e não o travão de fábrica

A Cloudflare tem um travão próprio para Workers, e as instruções deste ficheiro
mandaram durante uns tempos usá-lo: *"Rate Limiting → 20 pedidos por 86400
segundos"*. **Isso não existe, e não é feitio nenhum.** Duas coisas o impedem:

- a janela desse travão só pode ser de **10 ou de 60 segundos** — um dia não é
  uma opção;
- e ele **não se configura pelo painel**: só existe no ficheiro de configuração
  de quem publica com o `wrangler` a partir do computador.

Quem seguisse aquele passo ficava à procura de um botão que não está lá, e — se
desistisse dele — com um endereço público sem travão nenhum.

Um KV resolve-o: guarda-se um número por pessoa e por dia, apaga-se sozinho ao
fim de dois dias, cria-se no painel em dois cliques, e o plano grátis chega
para o que isto escreve. Duas honestidades sobre ele:

- o KV demora uns segundos a espalhar-se pelo mundo, por isso alguém com pressa
  e dois telemóveis passa dos 20 por umas quantas. Sem cartão na conta, o pior
  que isso faz é acabar o dia mais cedo, e um dia acabado não custa dinheiro;
- se o KV falhar, o worker grátis **deixa passar** e o worker pago **pára**.
  São contas diferentes: num o tecto são neurónios, no outro é uma factura.

Quem publicar com o `wrangler` e preferir o travão de fábrica pode ligá-lo — o
worker usa-o em vez do KV se o encontrar, sem se lhe mexer numa linha.

## Antes de publicar, os testes

```
node servidor/teste-worker.mjs
```

Os dois workers correm aqui, com um Firebase de mentira e uma IA de mentira: as
chaves são geradas na hora, os tokens são assinados a sério, e a verificação da
assinatura é a mesma linha que vai correr lá. Testa-se o que interessa saber
antes de haver gente do outro lado — que um token de outro projecto não entra,
que um token assinado por outra chave não entra, que a vigésima primeira
pergunta do dia leva com o travão, que uma mensagem vazia não chega a custar
uma chamada ao modelo, e que um erro da Anthropic não sai daqui a dizer o
estado da conta de quem paga.

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

No painel do Worker, em **Settings → Variables and Secrets**:

| nome | o que é | onde vai |
|---|---|---|
| `ANTHROPIC_KEY` | a chave da Anthropic | **Secret** (encriptado) |
| `FIREBASE_PROJECTO` | `vida-financeira-faf77` | Variable |
| `ORIGENS` | `https://godiandk.github.io` | Variable |

O `ANTHROPIC_KEY` tem de ir como **Secret** e não como Variable — a diferença
é que um Secret não volta a ser mostrado a ninguém, nem a si.

### 4. O travão

Igual ao da via grátis: **Storage & Databases → KV → Create** (nome
`vf-ia-travao`), e depois Settings → **Bindings** → Add → **KV namespace**, com
o nome de variável `TRAVAO`.

Aqui não é opcional: **sem travão este worker não responde a ninguém.** Devolve
`sem-travao` e o chat segue pelas regras. Não é rigidez — é que o endereço é
público, qualquer pessoa cria conta na aplicação em meio minuto, e do outro
lado está um cartão. Uma conta sem travão é uma conta que pode ser esvaziada
por alguém com tempo livre.

### 5. Ligar a aplicação

Depois de o Worker estar publicado, o painel dá-lhe um endereço parecido com
`https://vf-ia.SEUNOME.workers.dev`. Abra-o primeiro no navegador e veja a
linha de estado — tem de dizer `"chave":true`, `"projecto":true` e
`"travao":"kv"`. A chave nunca é mostrada, nem um pedaço dela: só se existe.

Depois ponha esse endereço no `ia.js`, na linha que diz:

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
