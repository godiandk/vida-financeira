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
- `ferramentas.html` — as nove calculadoras, também acessíveis dentro da app
- `conta.html` — entrar / criar conta (Firebase Authentication, opcional)
- `metodo.html` · `sobre.html` · `premium.html` — conteúdo e explicações
- `admin.html` — painel de administração (chaves, facturação, acessos)

### O que faz o trabalho
- `app-financas.js` — o motor: movimentos, meses, reserva, prestações,
  contas fixas, primeiro arranque, exportação
- `interpretar.js` — lê o que a pessoa escreve ("gastei 30 no continente") e
  faz as contas do chat ("12x de 45,90 ou 480 a pronto?")
- `assistente.js` — o chat: lança, calcula e responde
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

## A IA — escrita, e desligada

Em `servidor/` está o que falta para haver uma IA a sério: um Worker da
Cloudflare que guarda a chave da Anthropic, confirma que quem pergunta tem
conta (assinatura do Firebase verificada com as chaves públicas da Google),
trava quem pergunta de mais, e não guarda conversa nenhuma.

**Não está a correr.** O `ia.js` tem o endereço do servidor vazio, e enquanto
estiver vazio a aplicação nem tenta — funciona exactamente como hoje. Para
existir são precisas duas contas do dono do projecto: Anthropic (com cartão) e
Cloudflare (grátis). Os passos e os custos estão em `servidor/README.md`.

E a IA entra em último lugar, sempre. Primeiro as regras — corrigir, lançar,
calcular, responder — que são grátis, instantâneas, funcionam sem internet e
não contam a ninguém o que se perguntou. A IA só é chamada quando as regras
dizem "não percebi".

## Uma página, e não nove ecrãs

A aplicação tinha nove ecrãs. Para ver quanto foi o mês mudava-se de
separador; para lançar um gasto, outro; para abrir uma calculadora, outro.
Cada coisa estava no seu sítio e o conjunto não estava em sítio nenhum —
ninguém tem na cabeça o mapa de nove ecrãs de uma aplicação de contas.

Hoje há um sítio só. Lançar, o mês, as contas fixas, a dívida, os apoios e as
ferramentas são **gavetas** dentro do Início. O conteúdo não é copiado: é o
próprio, mudado de sítio por um script, com os mesmos `id` — todo o resto do
código continua a encontrar o que procura sem se lhe ter mexido numa linha.

A barra de baixo deixou de trocar de ecrã e passou a abrir a gaveta certa e a
levar até ela. Continua a servir de mapa, e agora o mapa é de uma página só.

O chat fica de fora, e de propósito: é uma conversa de altura inteira, com a
caixa de escrita colada ao fundo. Metido numa gaveta de uma página que rola,
deixava de se poder usar.

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

**O que ainda está só em português** são as respostas longas — os textos de
ajuda sobre reservas, dívidas e apoios — e as páginas do site fora da
aplicação. O trabalho do dia-a-dia está nas quatro; explicar em quatro é o
passo seguinte.

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
- O botão **Exportar para Excel (CSV)** existe porque limpar os dados do
  navegador apaga os movimentos guardados localmente — convém ter cópia.
- O "aplicativo" é apenas um PWA, instalável direto do navegador.
