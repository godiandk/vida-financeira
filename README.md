# Vida Financeira

Aplicação web para controlo de contas pessoais: lançar entradas e saídas, ver
o saldo de cada mês e perceber para onde está a ir o dinheiro.

Funciona sem internet, instala-se como app a partir do próprio navegador (PWA,
sem App Store, sem Play Store, sem APK) e **não pede dados do banco**.

## Estrutura

### Páginas
- `index.html` — página de entrada (o que é, o que faz, como começar)
- `app/` — a aplicação, em ecrãs: Escrever, Início, Lançar, Mês, Ferramentas
- `app.html` — reencaminha para `app/` (endereços antigos continuam a abrir)
- `ferramentas.html` — as dez calculadoras, também acessíveis dentro da app
- `conta.html` — entrar / criar conta (Firebase Authentication, opcional)
- `metodo.html` · `sobre.html` · `premium.html` — conteúdo e explicações
- `admin.html` — painel de administração (chaves, facturação, acessos)

### O que faz o trabalho
- `app-financas.js` — o motor: movimentos, meses, reserva, prestações,
  contas fixas, primeiro arranque, exportação
- `interpretar.js` — lê o que a pessoa escreve ("gastei 30 no continente") e
  faz as contas do chat ("12x de 45,90 ou 480 a pronto?")
- `assistente.js` — o chat: lança, calcula e responde
- `respostas.js` — as respostas longas do chat nas quatro línguas (a reserva,
  a dívida, os apoios, por onde começar); só é carregado pela aplicação
- `divida.js` — o que uma dívida custa, com as taxas de referência por país
- `excel.js` — gera um ficheiro .xlsx à mão, sem bibliotecas
- `partilha.js` — desenha o cartão que se manda para o grupo
- `banner.js` — o banner rotativo que conta o que a aplicação faz e o mês
  grátis de quem cria conta; cala-se para quem já tem chave
- `talao.js` — lê a fotografia do talão (total, loja e data) com o motor de
  OCR a correr dentro do próprio telemóvel
- `vendor/ocr/` — o Tesseract compilado para WebAssembly e o dicionário do
  português, guardados aqui em vez de virem de um CDN. Cerca de 4,3 MB, e
  **não** são descarregados ao abrir o site: só quando alguém manda ler um
  talão, depois de lhe ser dito o tamanho. Ficam numa cache própria do
  service worker, que sobrevive às versões do site — publicar uma correcção
  não pode custar quatro megabytes a quem tem dados contados.
- `investir.js` — onde é que o dinheiro está garantido em Portugal e no
  Brasil, com a fonte e a data de cada taxa, e a calculadora do juro composto
  com o imposto já descontado. Nomeia-se o instrumento e nunca a marca; nenhum
  banco, corretora, fundo ou cripto entra aqui, e há um teste que falha se
  algum entrar
- `ferramentas.js` — as calculadoras, a ajuda e o acesso de assinatura
- `site.js` — menu, moeda por país, sessão e registo do service worker
- `firebase-config.js` — ligação ao Firebase (**opcional**, ver abaixo)
- `firestore.rules` — regras de segurança da base de dados
- `manifest.json` + `sw.js` + `icon-*.png` — tornam o site instalável como app

## Dois números que não são a mesma coisa

**"Livre até ao fim do mês"** é uma diferença: o que entrou menos o que saiu,
neste mês. Num mês em que já se gastou e ainda não entrou o ordenado, é
negativo — e está certo que seja. **Não é uma dívida.**

**"Na conta"** é dinheiro: o que a pessoa tem agora para gastar. Só aparece
depois de ela o dizer ("tenho 1000 no banco"), porque a aplicação não viu o
mês em que ela começou e não tem como o adivinhar. Dito uma vez, mantém-se
certo sozinho — cada saída desconta, cada entrada soma.

Ter só o primeiro número era o defeito mais caro que esta aplicação teve: quem
dizia quanto tinha no banco via-o arrumado na reserva e o número grande do
ecrã continuar a mostrar outra coisa. Duas coisas verdadeiras, lidas como uma
contradição — e a conclusão de quem lê é sempre a mesma: isto não percebe nada.

## A IA — ligada, e sem factura

Está a correr em `https://vf-ia.wly-vianna.workers.dev`, um Worker da
Cloudflare com o código de `servidor/worker-gratis.js`. Confirma que quem
pergunta tem conta (assinatura do Firebase verificada com as chaves públicas
da Google), trava em 20 perguntas por pessoa e por dia, e não guarda conversa
nenhuma.

**O que sai do telemóvel** são contas e nunca o extracto: quanto entra, quanto
leva o essencial, quantos meses de reserva, se há dívida, e as três categorias
onde o dinheiro se está a ir. Nunca a lista de movimentos, nem o nome de uma
loja, nem uma data, nem uma fotografia. "Gasta 38% em mercado" responde à
pergunta; "comprou 23,40 no Continente a 12 de Março" só serve a quem quer
saber por onde a pessoa anda.

**O que o modelo escreve é lido antes de sair.** Promessas de retorno, marcas
de banco ou de cripto a serem recomendadas, culpa atirada a quem não chega ao
fim do mês, pedidos de senha, e o modelo a fazer-se passar pelo fundador — tudo
isso é recusado. Recusado uma vez, pede-se outra; à segunda, cala-se e o chat
responde pela resposta escrita à mão. A revisão erra de propósito para o lado
de recusar: o custo de recusar de mais é uma resposta melhor escrita.

E o modelo **não se apresenta como pessoa nenhuma.** O chat tem o nome e a
história do fundador porque as respostas escritas são dele; pôr as mesmas
palavras na boca de um modelo, e sobre o dinheiro de quem pergunta, seria outra
coisa.

O modelo corre dentro da própria Cloudflare, nos 10.000 neurónios por dia que
ela dá de graça. Não há chave da Anthropic e **não há cartão na conta** — é
isso, e não o número, que faz isto não poder gerar factura: acabada a quota do
dia, a Cloudflare recusa em vez de cobrar, o worker devolve 429 e o chat
responde pelas regras como respondia antes de haver IA.

Para conferir o que está ligado, um GET ao endereço responde com uma linha de
estado. Há também o `servidor/worker.js`, que faz o mesmo pela Anthropic e é
melhor a escrever — esse tem cartão, e por isso não responde sem travão
ligado. Os passos dos dois estão em `servidor/README.md`.

E a IA entra em último lugar, sempre. Primeiro as regras — corrigir, lançar,
calcular, responder — que são grátis, instantâneas, funcionam sem internet e
não contam a ninguém o que se perguntou. A IA só é chamada quando as regras
dizem "não percebi".

## Cinco sítios, e cada um com um trabalho

A aplicação teve nove ecrãs, e depois teve um só — tudo em gavetas dentro do
Início. As duas versões estavam erradas pela mesma razão, e a segunda pior do
que a primeira: nove ecrãs não se guardam na cabeça, e uma página onde cabe
tudo não é uma página arrumada, é uma gaveta de cozinha.

O Início chegou a ter **cinco ecrãs e meio de altura e 169 coisas em que
tocar**, e o número que a pessoa abriu a aplicação para ver — o que sobra até
ao fim do mês — só aparecia depois de um anúncio, de uma saudação e de duas
perguntas.

Hoje são cinco, e a barra de baixo diz quais:

| | serve para |
|---|---|
| **Início** | o mês desta pessoa: o que sobra, o que guardou, o que há a pagar |
| **Lançar** | pôr um gasto ou uma entrada |
| **Mês** | tudo o que entrou e saiu, para onde foi, e as contas que se repetem |
| **Ferramentas** | as calculadoras, a dívida, os apoios e o "onde pôr a render" |
| **Escrever** | o chat |

O Início é o primeiro porque é o início. Esteve em segundo, com o chat à
frente — a casa da aplicação atrás de uma das coisas que lá se fazem.

Debaixo dos números há um menu de cinco linhas, todas com o mesmo aspecto,
cada uma a dizer o que é e para que serve. Iguais de propósito: quando cada
destino tem a sua cor e o seu tamanho, deixa-se de comparar destinos e passa-se
a comparar botões.

E o banner promocional passou para **debaixo** dos cartões do mês. Mesmo sendo
de uma coisa grátis, mesmo sendo nosso, não se põe um anúncio à frente do
dinheiro de quem chega.

O conteúdo não é copiado: é o próprio, mudado de sítio por um script, com os
mesmos `id` — todo o resto do código continua a encontrar o que procura sem se
lhe ter mexido numa linha.

## As ferramentas arrumadas pela pergunta, e não pelo preço

Eram nove formulários abertos, uns debaixo dos outros, agrupados em
"Gratuitas" e "Assinatura". Cinco mil pixéis de campos por preencher — e numa
parede não se procura, desiste-se.

E "gratuitas" e "assinatura" é a nossa maneira de as arrumar, não a de quem as
usa. Ninguém acorda a pensar "hoje quero uma ferramenta gratuita". Acorda a
dever dinheiro, ou sem conseguir guardar nada, ou com a renda a pesar de mais.

Passaram a ser cinco grupos, com a pergunta escrita como as pessoas a fazem —
**"Estou a dever dinheiro"**, **"Quero guardar dinheiro"**, **"Quero gastar
menos"**, **"Dinheiro que talvez já seja seu"**, **"Planear os próximos
anos"** — e cada ferramenta fechada, com o nome, um emoji e uma linha a dizer
para que serve. A página deixou de ser uma parede e passou a ser um índice: de
8.800 pixéis para 3.600, e o mesmo conteúdo lá todo.

## A folha que não somava

O CSV punha aspas à volta de tudo, incluindo os números. Um `"74,3"` chega ao
Excel como **texto** — e a pessoa fica com uma folha onde a coluna do dinheiro
não soma. Somar uma coluna é a primeira coisa que se faz a uma folha de
contas; era a única que não dava.

E havia uma coisa pior, e mais silenciosa: **nenhuma das duas exportações
dizia de que conta tinha saído o dinheiro.** A aplicação separa três carteiras
o ano inteiro — a dele, a dela, a de emergência — e depois entregava uma folha
onde ninguém sabia de quem era o dinheiro que acabou. Que é exactamente a
pergunta que se faz quando o mês fecha.

O que sai hoje:

**CSV** — números sem aspas, com vírgula decimal e sempre dois decimais
(`74,30`, e não `74,3`, que num extracto parece um valor cortado). Datas sem
aspas, para se poder ordenar e filtrar por mês. Saídas com sinal negativo, para
a coluna somar sozinha e dar o saldo. Coluna `conta` quando há mais do que uma.

**Excel** — quatro folhas em vez de três: *Movimentos*, *Mês a mês*, *Por
categoria* e, num casal, *Por pessoa* (quanto entrou, saiu e guardou cada um).
Cada folha fecha com uma linha de **TOTAL**, e o total é uma fórmula `SUM` de
verdade — quem apagar uma linha vê o total mudar, que é para isso que se abre
uma folha de cálculo. Filtro no cabeçalho dos movimentos ("mostra-me só o
mercado", "só o que saiu da conta dela"), primeira linha congelada, e a coluna
das percentagens deixou de sair formatada como dinheiro — 46,1% aparecia como
`46,10 €` numa linha em que se tinham gasto 648.

## O cartão que se manda para o grupo

Num casal dizia **"a minha reserva"** e **"descobri que gasto"** sobre dinheiro
que é de duas pessoas. Não é só impreciso: é a aplicação a dar razão a um
contra o outro, num assunto em que as casas discutem. Passa a dizer "a nossa
reserva" e "descobrimos que gastamos" quando há duas pessoas na casa.

E dizia **"comecei do zero"** a quem tinha cem euros guardados — uma frase
sobre um passado que a aplicação não conhece. Passa a dizer o que ela sabe:
"é por aqui que se começa".

## O `num` que valia zero

Dois ficheiros da mesma página tinham uma função global chamada `num`. O
`app-financas.js` formatava um número com uma casa decimal; o `ferramentas.js`,
carregado depois, lia um campo pelo `id`. O segundo apagava o primeiro em
silêncio.

Resultado: o cartão da Reserva pedia para formatar `0,39` e recebia uma busca
por um campo com esse nome, que não existe. Devolvia zero. **Quem tinha 240 €
de lado via "0 meses"** — e, no plano, "0 de uma semana de despesas
essenciais". O cartão da partilha dizia o mesmo. Nenhum erro na consola, nada
partido à vista: só a aplicação a dizer a alguém que o que ele juntou não
conta.

O `teste-app.mjs` abre a aplicação num Chromium do tamanho de um telemóvel e
falha se isso voltar a acontecer.

## Quatro línguas

O chat entende português de Portugal, português do Brasil, espanhol e inglês —
e frases meio numa língua meio noutra, que é como muita gente emigrada escreve
mesmo. Não há um modo de língua a escolher em lado nenhum: escreve-se como sai.

| | |
|---|---|
| "gastei 30 no continente" | pt |
| "gasté 30 en el mercadona" | es |
| "I spent 30 at lidl" | en |
| "my wife spent 40 at the market" | sai da conta dela |
| "the last one was 50, not 500" | corrige o último para 50 |

Os números seguem a convenção de cada sítio: `1.500,00` e `1,500.00` querem
dizer o mesmo e são lidos como o mesmo.

E **responde** nas quatro. A língua é a da mensagem, não a da aplicação: quem
tem o telemóvel em português mas escreve em espanhol recebe espanhol de volta.
A interface segue a língua do aparelho, e muda-se à mão nas Ferramentas.

São quatro saídas e não três porque o português de Portugal e o do Brasil são
a mesma língua e não são o mesmo texto — "telemóvel" e "celular", "ecrã" e
"tela". Escrever "telemóvel" a um brasileiro não o impede de perceber; marca-o
como estrangeiro na sua própria aplicação de contas. O `br` só escreve o que é
mesmo diferente e o resto cai no `pt`.

E **explica** nas quatro. As respostas longas — a reserva, a dívida, os
apoios, por onde começar, e a própria apresentação do chat — estão nas quatro
línguas, no `respostas.js`. Não é tradução à letra: onde há ajuda gratuita
para dívidas não é a mesma entidade em Portugal, no Brasil ou em Espanha, e
traduzir o nome de uma lei portuguesa seria dar a alguém uma morada que não
existe. Também o dinheiro muda de pontuação — `1.500,00 €` e `€1,500.00` são o
mesmo número e nenhum deles se lê bem a quem não cresceu com ele.

Isto vive em ficheiro próprio e não no `idiomas.js` porque o `idiomas.js` é
carregado pela página de entrada e pelas ferramentas, que não têm chat. Quem
abre a página inicial com dados contados não tem de descarregar ensaios que
não vai ler.

**O que ainda está só em português** são as páginas do site fora da aplicação
— `index.html`, `metodo.html`, `sobre.html`. O trabalho do dia-a-dia e as
explicações estão nas quatro.

Os testes deste projecto:

```
node teste-idiomas.mjs     # as quatro línguas têm as mesmas frases e os mesmos buracos
node teste-chat.mjs        # o chat vai buscar a frase certa, na língua de quem escreveu
node servidor/teste-worker.mjs   # os dois workers da IA, com um Firebase de mentira
node teste-app.mjs         # a aplicação aberta num telemóvel a sério (precisa de servidor)
```

O último precisa de duas coisas antes de correr: `python3 -m http.server 8899`
noutra consola, e `npm i playwright` uma vez. Abre a aplicação num Chromium de
390 pixéis de largura, com movimentos lançados, e carrega nas coisas como uma
pessoa carrega — porque mover conteúdo com um script é a maneira mais fácil de
partir um botão sem dar por isso: não dá erro nenhum, só deixa de haver ali
nada.

O primeiro apanha a chave que só existe em português; o segundo apanha a chave
mal escrita no código, que o primeiro não vê. Nenhuma das duas falhas dá erro
no navegador — aparecem no telemóvel de alguém como um texto na língua errada
ou uma palavra crua a meio de uma conversa sobre a renda.

## As carteiras

Uma pessoa sozinha tem uma conta. Um casal tem três: a dele, a dela, e o
dinheiro de emergência que é dos dois. Quando alguém pergunta "de onde saiu
isso?", a resposta importa — e sem separar, o mês fecha e ninguém sabe de quem
era o dinheiro que acabou.

O chat percebe de que bolso se está a falar:

| o que se escreve | de onde sai |
|---|---|
| "gastei 30 no continente" | da minha conta |
| "a minha mulher gastou 40 no lidl" | da conta dela |
| "ela recebeu 900 de salário" | entra na conta dela |
| "tirei 200 da poupança" | da conta de emergência |

Três e não mais: mais do que isto era um plano de contas, e um plano de contas
não se pede a quem está a tentar chegar ao fim do mês. A conta de emergência é
a mesma coisa que a app já chamava reserva — mudou o nome para o que as pessoas
dizem, o número é o mesmo, e quem já usava a aplicação não tem de escrever nada
outra vez.

## A fotografia do talão

Fotografa-se o talão e a aplicação lê o total, a loja e o dia. A leitura é
feita **dentro do aparelho**: não há servidor nem serviço pelo meio, e a
fotografia — que mostra onde a pessoa anda, a que horas e com que cartão paga
— não sai do telemóvel. Também não sobe para a nuvem com os movimentos.

O que for lido é sempre **mostrado antes de ser gravado**, com um sim e um
não. O OCR erra, e um número errado metido às escondidas nas contas de alguém
faz mais estrago do que número nenhum: com talões amarrotados, desbotados ou
mal fotografados, a aplicação prefere dizer que não conseguiu.

## Onde ficam os dados

Por omissão, os movimentos ficam **só no navegador do dispositivo**
(`localStorage`). Não passam por servidor nenhum e continuam a funcionar sem
internet.

Se a pessoa criar conta e iniciar sessão, os mesmos movimentos passam também a
ser gravados no Firestore, em `utilizadores/{uid}`, para poderem ser vistos
noutro dispositivo. As regras em `firestore.rules` garantem que **cada conta só
lê os seus próprios movimentos**.

Existe um painel de administração, e convém ser exacto sobre o que ele vê. O
administrador chega a duas colecções: `perfis` (nome, email e data da última
visita) e `vendas` (as chaves de assinatura emitidas). **Nunca chega a
`utilizadores`**, que é onde vivem os movimentos — as regras do Firestore
recusam-lhe essa leitura, e não é uma questão de o código não a pedir. As
fotografias de talões ficam só no dispositivo e não sobem para lado nenhum.

## Firebase (opcional)

Sem configurar nada, o site e a aplicação funcionam por completo — incluindo
lançar, o chat, as contas fixas e a exportação. Só `conta.html` mostra um aviso
a dizer que a conta está indisponível, e sem conta não há mês de experiência
nem sincronização entre dispositivos.

Para activar a sincronização entre dispositivos, siga o `INSTRUÇÕES.md`. Em
resumo:

1. Criar um projeto grátis em https://console.firebase.google.com/
2. Activar **Authentication → Email/Palavra-passe**
3. Criar o **Firestore Database** (modo produção)
4. Registar uma app Web e copiar o `firebaseConfig`
5. Colar esses valores em `firebase-config.js`
6. Publicar as regras de `firestore.rules`

## Publicar

São ficheiros estáticos — serve qualquer hospedagem gratuita (GitHub Pages,
Netlify, Vercel). Envie a pasta toda junta: os ficheiros dependem uns dos
outros. O `INSTRUÇÕES.md` tem o passo a passo do GitHub Pages.

## Notas

- O lançamento dos movimentos é manual, de propósito: não há leitura de
  extractos nem ligação a bancos.
- O botão **Exportar** existe porque limpar os dados do navegador apaga os
  movimentos guardados localmente — convém ter cópia. Ver abaixo o que sai.
- O "aplicativo" é apenas um PWA, instalável direto do navegador.
