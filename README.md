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
