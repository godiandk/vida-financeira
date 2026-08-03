/* ============================================================
   Vida Financeira — as respostas longas, nas quatro línguas

   O chat já lançava, corrigia e calculava em português, espanhol e inglês. O
   que **explicava** só sabia dizer em português: a reserva, a dívida, os
   apoios, por onde começar. Quem escrevesse "I have no money left at the end
   of the month" via o gasto lançado em inglês e depois três parágrafos numa
   língua que não é a sua, sobre a coisa que mais precisava de perceber.

   É a pior maneira possível de dividir uma aplicação: fala-se a língua de
   quem chega para as tarefas pequenas, e volta-se à nossa quando o assunto
   fica sério.

   ---- Porque é que isto não está no `idiomas.js` ----

   Está no mesmo sistema — estas frases entram no mesmo `TEXTOS` e saem pela
   mesma função `T()`. O que não está é no mesmo ficheiro, e por uma razão de
   peso: o `idiomas.js` é carregado pela página de entrada e pelas
   ferramentas, que não têm chat nenhum. Estes ensaios são só do chat, e são
   dezenas de milhares de letras. Quem abre a página inicial num telemóvel com
   dados contados não tem de as descarregar para ler o que a aplicação faz.

   ---- Como se traduziu ----

   Não à letra. Uma frase que em português diz "não é a sua disciplina" tem de
   dizer, em cada língua, o que ali diria alguém que fala essa língua. E há
   coisas que **mudam de conteúdo** e não só de palavras: onde há ajuda
   gratuita para dívidas não é a mesma entidade em Portugal, no Brasil ou em
   Espanha. Traduzir o nome de uma lei portuguesa para espanhol seria dar a
   alguém uma morada que não existe.

   O `br` está escrito por inteiro, ao contrário do resto da aplicação, onde
   só tem o que muda. Em textos longos muda quase tudo: "está a fazer" e "está
   fazendo", "renda" e "aluguel", "telemóvel" e "celular". Um texto de três
   parágrafos meio numa variante e meio noutra lê-se como uma tradução
   automática — e a confiança de quem está a ler sobre dinheiro é a única
   coisa que esta aplicação tem.
   ============================================================ */

(function () {
  if (typeof TEXTOS === 'undefined') return;

  /* ---------------------------------------------------------- pt-PT */
  Object.assign(TEXTOS.pt, {
    'resp.semfolga.contas': 'Fiz as contas com o que lançou: entra cerca de {R} por mês e o essencial leva {E}. Não sobra. ',
    'resp.semfolga': `Vou dizer-lhe uma coisa que ninguém diz: **se as contas não fecham, o problema não é a sua disciplina.** Não há método de orçamento que resolva a falta de dinheiro. Eu passei por isto, e o que me tirou de lá não foi apertar mais o cinto — foi mexer em três coisas, por esta ordem de dificuldade:

**1. Apoios a que tem direito e não está a receber.** É espantosamente comum, e é o único que dá dinheiro esta semana sem trabalhar mais uma hora. Toque em **Apoios** aqui em baixo e responda a quatro perguntas.

**2. Custos fixos, sobretudo a habitação.** Uma renda {v80} mais barata vale mais do que dois anos a poupar no supermercado. É duro e é lento, mas é o que muda a conta de vez.

**3. Rendimento.** Horas, formação paga, mudar de entidade, um trabalho ao lado. É o mais lento dos três — e o único que resolve para sempre.

Enquanto não houver folga, o objectivo não é poupar. É **acabar o mês sem dívida nova.** Isso já é ganhar.`,

    'resp.subsidios': `Quem vive de apoios tem um problema que quase nenhum conselho financeiro trata: **o dinheiro chega em datas fixas e não aumenta**. Isso muda tudo — e, ao contrário do que parece, joga a favor.

**Porquê a favor:** quem tem rendimento fixo consegue planear ao cêntimo. Quem trabalha à peça não consegue. A previsibilidade é a única vantagem que tem, e a maioria das pessoas desperdiça-a.

**O que fazer com ela, em concreto:**

**No dia em que entra**, separe primeiro — nem que sejam {v5}. Não no fim do mês, quando já não há. Esta é a diferença entre quem junta e quem não junta, e não tem nada a ver com quanto se ganha.

**Confirme o que lhe falta receber.** Muita gente recebe um apoio e tem direito a três. A tarifa social da energia e da água não é automática — tem de ser pedida, e muita gente que tem direito nunca a pediu. Toque em **Apoios** e veja a lista do seu país.

**Marque as datas.** Se sabe que entra no dia 20, sabe que os dias 15 a 19 são os apertados. Planeie as compras grandes para os dias 20 e 21, quando há dinheiro e não se compra em aflição.

Comece pelos **Apoios** aqui em baixo — é onde há dinheiro que talvez já seja seu.`,

    'resp.comecar.zero': `Do zero, e sem rodeios. O primeiro mês é o único que custa.

**Esta semana, só isto:** lance tudo o que gastar. Tudo. O café, o pão, o passe. Não mude nada nos hábitos ainda — só aponte. Leva vinte segundos de cada vez, no separador **Lançar**.

**Porquê antes de tudo o resto:** quem regista o que gasta passa a gastar menos, mesmo sem tentar. Não é força de vontade — é que passa a haver um número onde antes havia uma vaga sensação. Eu só percebi para onde ia o meu dinheiro quando o vi escrito.

**No fim do mês** já tem uma coisa que hoje não tem: saber quanto precisa mesmo para viver. A partir daí tudo se calcula.

**E o segundo mês**, separa-se um valor no dia em que o dinheiro entra. Pequeno. {v10} chegam para começar — o hábito vale mais do que o valor, e o valor cresce com o tempo.

Nada disto exige que seja uma pessoa diferente da que é. Exige um mês.`,

    'resp.comecar.andamento': `Já lançou {n} movimentos, o que é mais do que a maioria faz. Com esses números, o caminho é este:

**Sobra-lhe cerca de {folga} por mês.** Não guarde tudo — quem tenta guardar a folga inteira desiste no primeiro mês difícil. Guarde **metade**, {metade}, e no dia em que o dinheiro entra.

**O alvo é {alvo}** — três meses do seu essencial. Não é para investir; é para uma avaria não se transformar em crédito a 18%. É esta reserva que separa quem vai subindo de quem volta sempre à casa de partida.

**Ao ritmo de {metade} por mês**, lá chega em cerca de {meses} meses. É muito tempo. É também o tempo que passa de qualquer maneira.`,
    'resp.comecar.alvovago': 'três meses de despesa essencial',

    'resp.reserva.semessencial': `A reserva mede-se em **meses de despesa essencial**, e não em euros. {v1000} são dois meses para quem gasta {v500}, e menos de um para quem gasta {v1100}. Por isso o primeiro passo é saber quanto é o seu essencial — lance um mês inteiro e a aplicação diz-lhe.`,
    'resp.reserva.feita': 'Tem {m} meses. Está feita — a partir daqui o que sobra pode ir para outra coisa.',
    'resp.reserva.um': 'Tem {m} meses. Já não está exposto ao pior: uma avaria já não vira crédito.',
    'resp.reserva.pouco': 'Tem {m} meses. É pouco, mas é infinitamente mais do que zero — a primeira semana de reserva é a que mais muda.',
    'resp.reserva.zero': 'Ainda não tem reserva nenhuma. É por aqui que se começa.',
    'resp.reserva': `O seu essencial é cerca de {E} por mês. {estado}

**Os degraus, por ordem:**
· **Uma semana** — {semana}. Cobre o susto pequeno.
· **Um mês** — {mes}. Cobre a maioria das avarias.
· **Três meses** — {tres}. Cobre ficar sem trabalho por um tempo.

Não salte para os três meses. Persiga o degrau seguinte, sempre. Um alvo que se atinge dá vontade de continuar; um alvo distante dá vontade de desistir — e é isso que separa quem consegue de quem começa dez vezes.`,

    'resp.dividas': `Sobre dívida, três coisas que aprendi a pagar caro.

**Primeira: saiba o número.** Não o "mais ou menos". O número. A maior parte das pessoas endividadas não sabe quanto deve ao certo, e não se resolve o que não se mede. A ferramenta **Por onde começar a pagar dívidas** faz-lhe essa conta.

**Segunda: a ordem importa menos do que continuar.** Pela matemática, começa-se pela taxa mais alta. Na prática, quem começa pela dívida mais pequena desiste menos — e uma estratégia abandonada poupa zero. Se é do tipo que precisa de ver uma vitória, comece pela pequena. Não é irracional; é conhecer-se.

**Terceira, e a mais importante:** em Portugal, se falhar uma prestação, o banco é **obrigado por lei** a integrá-lo no PERSI, e enquanto isso corre não pode executar a dívida. E há apoio gratuito e confidencial para tratar disto — a RACE, com entidades por distrito. Não é um empréstimo nem vende nada. Se está a ler isto porque as contas não fecham, é provavelmente o telefonema mais útil que pode fazer esta semana.{nota}`,
    'resp.dividas.nota': '\n\nVi que tem prestações lançadas. No separador **Início**, o bloco "Já comprometido" mostra-lhe quanto de cada mês já está gasto antes de começar.',

    'resp.rendimento': `Poupar tem um tecto: não se pode cortar abaixo de zero. Ganhar não tem. Se está com o essencial a cobrir tudo, é aqui que está a saída — e é o caminho mais lento e o único definitivo.

**O que aprendi a começar sem dinheiro:**

**Venda o que já sabe fazer, não o que gostaria de saber.** O erro que mais vi custar meses foi ir aprender uma coisa nova quando já havia uma coisa vendável nas mãos. Cozinhar, arranjar, limpar, conduzir, cortar cabelo, escrever, traduzir, cuidar. Qualquer uma delas tem mercado hoje.

**Comece com o primeiro cliente, não com a empresa.** Sem nome, sem logótipo, sem site. Um cliente que paga. A empresa faz-se depois, e faz-se em dias. Vi muita gente gastar as poupanças a preparar um negócio que nunca teve um cliente.

**Cobre desde o primeiro dia.** Trabalho de graça "para ganhar experiência" ensina o cliente a não pagar. Cobre pouco no início, mas cobre.

**Separe o dinheiro do negócio do dinheiro de casa** desde o primeiro euro. Misturados, o negócio parece lucrativo até ao dia em que não há dinheiro para a renda.

**E o mais importante:** um negócio pequeno que dá {v200} por mês, todos os meses, muda mais a sua vida do que um plano grande que nunca começa. {v200} por mês é a renda mais barata, é a reserva feita num ano, é a dívida do cartão paga.`,

    'resp.investir.antes': `Antes de mais: tem {m} meses de reserva. Investir antes de ter três é como pôr o telhado antes das paredes — à primeira avaria vende-se ao pior preço possível, e perde-se mais do que se ganhou.

`,
    'resp.investir': `Não lhe digo onde pôr dinheiro. Não sou entidade autorizada para isso, e quem lhe disser sem conhecer a sua vida está a vender-lhe alguma coisa.

**O que lhe posso dizer é como funciona, e as perguntas que tem de fazer:**

**O custo é a única coisa previsível.** O retorno ninguém sabe; a comissão sabe-se ao cêntimo. Uma diferença de 2% ao ano em comissões, ao longo de vinte anos, come uma fatia enorme do resultado. Pergunte sempre: *quanto é que isto me cobra por ano, ao todo?*

**O prazo decide tudo.** Dinheiro de que pode precisar dentro de três anos não deve estar exposto a oscilações. É por isso que a reserva vem primeiro.

**As perguntas a fazer antes de assinar seja o que for:**
· Quanto custa por ano, tudo incluído?
· Quanto posso perder no pior ano registado?
· Em quanto tempo consigo tirar o dinheiro, e com que penalização?
· Que garantia existe, e até que valor?
· Quem me está a vender isto ganha comissão?

Se quem lhe vende não responder às cinco com clareza, tem a sua resposta.`,

    'resp.app': `Simples, e é de propósito.

**Lançar** — toque no que foi (Mercado, Luz, Renda…), escreva quanto, e pronto. Vinte segundos. O valor escreve-se sempre à mão porque é isso que faz pensar no dinheiro; tocar num rótulo não faz.

**Início** — mostra o que sobra até ao fim do mês, e **por dia**. É esse o número que decide uma ida ao supermercado; o total do mês não decide nada.

**Mês** — todos os movimentos e para onde foi o dinheiro, por categoria.

**Mais** — as ferramentas, o método e o premium.

Não precisa de conta, não precisa de internet, e não se liga ao seu banco. Os dados ficam no seu telemóvel.

Se alguma coisa estiver confusa, diga-me qual e explico.`,

    'resp.premium': `Direto: **tudo o que precisa para gerir o mês e juntar uma reserva é grátis, e vai continuar a ser.** Cobrar isso a quem está a tentar sair de uma situação difícil seria contradizer a razão de existir disto.

O premium é **4,90 €, uma vez** — não é mensalidade. Dá acesso ao plano de 12 meses mês a mês, à comparação de caminhos, à projecção a longo prazo, e à sincronização entre telemóvel e computador.

E digo-lhe uma coisa que estas páginas nunca dizem: **se não puder pagar, escreva e a chave é sua na mesma.** Sem justificação e sem verificação nenhuma. Um projecto que existe para ajudar quem tem pouco não pode ser mais um sítio onde quem tem pouco fica de fora.`,

    'abertura': `Sou o **Wesley Vianna**, fundador da Vida Financeira. Comecei sem nada e construí o que tenho a partir de negócios pequenos — por isso não lhe vou dar conselhos que nunca tive de aplicar a mim próprio.

**Escreva-me como falaria com alguém.** Três coisas que faço aqui:

**Lanço por si.** Escreva como fala, dizendo **o que é o sítio e o nome dele**:

«Gastei 30 euros no **mercado** Continente»
«Paguei 12 na **farmácia** Sá da Bandeira»
«Meti 40 de gasolina na **bomba** BP»

E fica lançado, com o valor, a categoria e a loja. Não tem de preencher nada. Se o sítio não for de nenhum destes tipos, escreva à mesma — eu arrumo no que puder.

**Faço as contas.** Está na loja e diz «12x de 45,90 ou 480 a pronto?» — eu respondo com os números antes de assinar.

**Respondo a perguntas** com os seus números, não com generalidades.

{numeros}

Pergunte à vontade.`,
    'abertura.semnumeros': 'Ainda não lançou nada, mas posso responder na mesma — e depois de lançar um mês, respondo com os seus números.',
    'abertura.comnumeros': 'Já vi os seus números: {quais}. Posso responder com base neles.',
    'abertura.entra': 'entra cerca de {R} por mês',
    'abertura.movimentos': '{n} movimentos lançados',

    'resp.generica.zero': 'Ainda não lançou nada, por isso ainda não sei nada sobre a sua situação.',
    'resp.generica.jalancou': 'Já lançou {n} movimentos{comR}.',
    'resp.generica.comR': ', e entra cerca de {R} por mês',
    'resp.generica': `{contexto} Posso ajudar melhor se me perguntar por uma destas coisas:

· **"Não sobra nada ao fim do mês"** — o que fazer quando as contas não fecham
· **"Recebo subsídio"** — como planear com rendimento fixo
· **"Por onde começo?"** — o primeiro mês, passo a passo
· **"Quanto devo guardar?"** — a reserva, em degraus
· **"Tenho dívidas"** — a ordem certa e onde há ajuda gratuita
· **"Como ganho mais?"** — começar a vender sem dinheiro
· **"Onde invisto?"** — o que perguntar antes de assinar seja o que for

Escreva com as suas palavras. Percebo se escrever torto.`
  });

  /* ---------------------------------------------------------- pt-BR */
  Object.assign(TEXTOS.br, {
    'resp.semfolga.contas': 'Fiz as contas com o que você lançou: entra cerca de {R} por mês e o essencial leva {E}. Não sobra. ',
    'resp.semfolga': `Vou te dizer uma coisa que ninguém diz: **se as contas não fecham, o problema não é a sua disciplina.** Não existe método de orçamento que resolva falta de dinheiro. Eu passei por isso, e o que me tirou de lá não foi apertar mais o cinto — foi mexer em três coisas, nesta ordem de dificuldade:

**1. Benefícios a que você tem direito e não está recebendo.** É espantosamente comum, e é o único que põe dinheiro no bolso esta semana sem trabalhar mais uma hora. Toque em **Apoios** aqui embaixo e responda quatro perguntas.

**2. Custos fixos, principalmente moradia.** Um aluguel {v80} mais barato vale mais do que dois anos economizando no mercado. É duro e é lento, mas é o que muda a conta de vez.

**3. Renda.** Horas, um curso que se paga, trocar de emprego, um trabalho por fora. É o mais lento dos três — e o único que resolve para sempre.

Enquanto não sobrar nada, o objetivo não é guardar. É **terminar o mês sem dívida nova.** Isso já é ganhar.`,

    'resp.subsidios': `Quem vive de benefício tem um problema que quase nenhum conselho financeiro trata: **o dinheiro chega em datas fixas e não aumenta**. Isso muda tudo — e, ao contrário do que parece, joga a favor.

**Por que a favor:** quem tem renda fixa consegue planejar no centavo. Quem trabalha por diária não consegue. A previsibilidade é a única vantagem que você tem, e a maioria das pessoas desperdiça.

**O que fazer com ela, na prática:**

**No dia em que cai**, separe primeiro — nem que sejam {v5}. Não no fim do mês, quando já não tem. Essa é a diferença entre quem junta e quem não junta, e não tem nada a ver com quanto se ganha.

**Confira o que falta você receber.** Muita gente recebe um benefício e tem direito a três. A Tarifa Social de Energia Elétrica não é automática para todo mundo — precisa estar com o CadÚnico em dia, e muita gente que tem direito nunca pediu. Toque em **Apoios** e veja a lista do seu país.

**Marque as datas.** Se você sabe que cai no dia 20, sabe que os dias 15 a 19 são os apertados. Deixe as compras grandes para os dias 20 e 21, quando tem dinheiro e não se compra no aperto.

Comece pelos **Apoios** aqui embaixo — é onde tem dinheiro que talvez já seja seu.`,

    'resp.comecar.zero': `Do zero, e sem rodeio. O primeiro mês é o único que custa.

**Esta semana, só isto:** lance tudo o que gastar. Tudo. O café, o pão, a passagem. Não mude nada nos hábitos ainda — só anote. Leva vinte segundos de cada vez, na aba **Lançar**.

**Por que antes de todo o resto:** quem anota o que gasta passa a gastar menos, mesmo sem tentar. Não é força de vontade — é que passa a existir um número onde antes tinha só uma sensação vaga. Eu só entendi para onde ia o meu dinheiro quando vi escrito.

**No fim do mês** você já tem uma coisa que hoje não tem: saber quanto precisa de verdade para viver. Daí para frente tudo se calcula.

**E no segundo mês**, separa-se um valor no dia em que o dinheiro cai. Pequeno. {v10} já servem para começar — o hábito vale mais do que o valor, e o valor cresce com o tempo.

Nada disso exige que você seja uma pessoa diferente da que é. Exige um mês.`,

    'resp.comecar.andamento': `Você já lançou {n} movimentos, o que é mais do que a maioria faz. Com esses números, o caminho é este:

**Sobra cerca de {folga} por mês.** Não guarde tudo — quem tenta guardar a sobra inteira desiste no primeiro mês difícil. Guarde **metade**, {metade}, e no dia em que o dinheiro cai.

**O alvo é {alvo}** — três meses do seu essencial. Não é para investir; é para um imprevisto não virar dívida no cartão. É essa reserva que separa quem vai subindo de quem volta sempre para a estaca zero.

**No ritmo de {metade} por mês**, você chega lá em cerca de {meses} meses. É muito tempo. É também o tempo que passa de qualquer jeito.`,
    'resp.comecar.alvovago': 'três meses de despesa essencial',

    'resp.reserva.semessencial': `A reserva se mede em **meses de despesa essencial**, e não em reais. {v1000} são dois meses para quem gasta {v500}, e menos de um para quem gasta {v1100}. Por isso o primeiro passo é saber quanto é o seu essencial — lance um mês inteiro e o app te diz.`,
    'resp.reserva.feita': 'Você tem {m} meses. Está feita — daqui para frente o que sobrar pode ir para outra coisa.',
    'resp.reserva.um': 'Você tem {m} meses. Já não está exposto ao pior: um imprevisto já não vira dívida.',
    'resp.reserva.pouco': 'Você tem {m} meses. É pouco, mas é infinitamente mais do que zero — a primeira semana de reserva é a que mais muda.',
    'resp.reserva.zero': 'Você ainda não tem reserva nenhuma. É por aqui que se começa.',
    'resp.reserva': `O seu essencial é cerca de {E} por mês. {estado}

**Os degraus, na ordem:**
· **Uma semana** — {semana}. Cobre o susto pequeno.
· **Um mês** — {mes}. Cobre a maioria dos imprevistos.
· **Três meses** — {tres}. Cobre ficar sem trabalho por um tempo.

Não pule direto para os três meses. Persiga sempre o degrau seguinte. Um alvo que se alcança dá vontade de continuar; um alvo distante dá vontade de desistir — e é isso que separa quem consegue de quem começa dez vezes.`,

    'resp.dividas': `Sobre dívida, três coisas que aprendi pagando caro.

**Primeira: saiba o número.** Não o "mais ou menos". O número. A maior parte das pessoas endividadas não sabe quanto deve exatamente, e não se resolve o que não se mede. A ferramenta **Por onde começar a pagar dívidas** faz essa conta para você.

**Segunda: a ordem importa menos do que continuar.** Pela matemática, começa-se pela taxa mais alta — e no Brasil isso quase sempre quer dizer o rotativo do cartão e o cheque especial, que são os juros mais caros que existem por aqui. Na prática, quem começa pela dívida menor desiste menos, e uma estratégia abandonada economiza zero. Se você é do tipo que precisa ver uma vitória, comece pela pequena. Não é irracional; é se conhecer.

**Terceira, e a mais importante:** desde a Lei do Superendividamento (14.181/2021), você tem direito a pedir a renegociação de todas as suas dívidas de uma vez, num acordo que **tem de te deixar dinheiro para viver**. Isso se faz de graça: Procon, Defensoria Pública ou as audiências de conciliação do próprio tribunal. **Não pague a ninguém para "limpar seu nome"** — quem cobra por isso está vendendo o que você consegue sozinho e sem custo.{nota}`,
    'resp.dividas.nota': '\n\nVi que você tem parcelas lançadas. Na aba **Início**, o bloco "Já comprometido" mostra quanto de cada mês já está gasto antes de começar.',

    'resp.rendimento': `Economizar tem teto: não dá para cortar abaixo de zero. Ganhar não tem. Se o essencial está cobrindo tudo, é aqui que está a saída — e é o caminho mais lento e o único definitivo.

**O que aprendi começando sem dinheiro:**

**Venda o que você já sabe fazer, não o que gostaria de saber.** O erro que mais vi custar meses foi ir aprender uma coisa nova tendo já uma coisa vendável nas mãos. Cozinhar, consertar, limpar, dirigir, cortar cabelo, escrever, traduzir, cuidar. Qualquer uma delas tem mercado hoje.

**Comece pelo primeiro cliente, não pela empresa.** Sem nome, sem logo, sem site. Um cliente que paga. O CNPJ vem depois, e sai em dias. Vi muita gente gastar a poupança preparando um negócio que nunca teve um cliente.

**Cobre desde o primeiro dia.** Trabalho de graça "para ganhar experiência" ensina o cliente a não pagar. Cobre pouco no começo, mas cobre.

**Separe o dinheiro do negócio do dinheiro de casa** desde o primeiro real. Misturados, o negócio parece lucrativo até o dia em que não tem dinheiro para o aluguel.

**E o mais importante:** um negócio pequeno que dá {v200} por mês, todo mês, muda mais a sua vida do que um plano grande que nunca começa. {v200} por mês é o aluguel mais barato, é a reserva feita em um ano, é a dívida do cartão paga.`,

    'resp.investir.antes': `Antes de mais nada: você tem {m} meses de reserva. Investir antes de ter três é como pôr o telhado antes das paredes — no primeiro imprevisto você vende no pior preço possível, e perde mais do que ganhou.

`,
    'resp.investir': `Não vou te dizer onde pôr dinheiro. Não sou entidade autorizada para isso, e quem te disser sem conhecer a sua vida está te vendendo alguma coisa.

**O que posso te dizer é como funciona, e as perguntas que você tem de fazer:**

**O custo é a única coisa previsível.** O retorno ninguém sabe; a taxa se sabe no centavo. Uma diferença de 2% ao ano em taxas, ao longo de vinte anos, come uma fatia enorme do resultado. Pergunte sempre: *quanto isso me cobra por ano, tudo somado?*

**O prazo decide tudo.** Dinheiro que você pode precisar dentro de três anos não deve estar exposto a oscilação. É por isso que a reserva vem primeiro.

**As perguntas antes de assinar qualquer coisa:**
· Quanto custa por ano, tudo incluído?
· Quanto posso perder no pior ano já registrado?
· Em quanto tempo consigo tirar o dinheiro, e com qual perda?
· Que garantia existe, e até que valor?
· Quem está me vendendo isso ganha comissão?

Se quem vende não responder às cinco com clareza, você já tem a sua resposta.`,

    'resp.app': `Simples, e é de propósito.

**Lançar** — toque no que foi (Mercado, Luz, Aluguel…), escreva quanto, e pronto. Vinte segundos. O valor se escreve sempre à mão porque é isso que faz pensar no dinheiro; tocar num rótulo não faz.

**Início** — mostra o que sobra até o fim do mês, e **por dia**. É esse o número que decide uma ida ao mercado; o total do mês não decide nada.

**Mês** — todos os movimentos e para onde foi o dinheiro, por categoria.

**Mais** — as ferramentas, o método e o premium.

Não precisa de conta, não precisa de internet, e não se conecta ao seu banco. Os dados ficam no seu celular.

Se alguma coisa estiver confusa, me diga qual e eu explico.`,

    'resp.premium': `Direto: **tudo o que você precisa para administrar o mês e juntar uma reserva é grátis, e vai continuar sendo.** Cobrar isso de quem está tentando sair de uma situação difícil seria contradizer a razão de isto existir.

O premium é **4,90 €, uma vez só** — não é mensalidade. Dá acesso ao plano de 12 meses mês a mês, à comparação de caminhos, à projeção de longo prazo, e à sincronização entre celular e computador.

E vou te dizer uma coisa que essas páginas nunca dizem: **se você não puder pagar, escreva e a chave é sua do mesmo jeito.** Sem justificativa e sem verificação nenhuma. Um projeto que existe para ajudar quem tem pouco não pode ser mais um lugar onde quem tem pouco fica de fora.`,

    'abertura': `Sou o **Wesley Vianna**, fundador da Vida Financeira. Comecei sem nada e construí o que tenho a partir de negócios pequenos — por isso não vou te dar conselho que eu nunca precisei aplicar em mim mesmo.

**Escreva pra mim como você falaria com alguém.** Três coisas que eu faço aqui:

**Lanço pra você.** Escreva do jeito que fala, dizendo **o que é o lugar e o nome dele**:

«Gastei 30 reais no **mercado** Extra»
«Paguei 12 na **farmácia** Drogasil»
«Botei 40 de gasolina no **posto** Shell»

E fica lançado, com o valor, a categoria e a loja. Você não precisa preencher nada. Se o lugar não for de nenhum desses tipos, escreva do mesmo jeito — eu encaixo no que der.

**Faço as contas.** Você está na loja e diz «12x de 45,90 ou 480 à vista?» — eu respondo com os números antes de você assinar.

**Respondo perguntas** com os seus números, não com generalidade.

{numeros}

Pergunte à vontade.`,
    'abertura.semnumeros': 'Você ainda não lançou nada, mas posso responder do mesmo jeito — e depois de lançar um mês, respondo com os seus números.',
    'abertura.comnumeros': 'Já vi os seus números: {quais}. Posso responder em cima deles.',
    'abertura.entra': 'entra cerca de {R} por mês',
    'abertura.movimentos': '{n} movimentos lançados',

    'resp.generica.zero': 'Você ainda não lançou nada, então ainda não sei nada sobre a sua situação.',
    'resp.generica.jalancou': 'Você já lançou {n} movimentos{comR}.',
    'resp.generica.comR': ', e entra cerca de {R} por mês',
    'resp.generica': `{contexto} Posso ajudar melhor se você me perguntar por uma destas coisas:

· **"Não sobra nada no fim do mês"** — o que fazer quando as contas não fecham
· **"Recebo benefício"** — como planejar com renda fixa
· **"Por onde eu começo?"** — o primeiro mês, passo a passo
· **"Quanto devo guardar?"** — a reserva, em degraus
· **"Tenho dívidas"** — a ordem certa e onde tem ajuda de graça
· **"Como ganho mais?"** — começar a vender sem dinheiro
· **"Onde invisto?"** — o que perguntar antes de assinar qualquer coisa

Escreva com as suas palavras. Eu entendo mesmo se escrever torto.`
  });

  /* ---------------------------------------------------------- español */
  Object.assign(TEXTOS.es, {
    'resp.semfolga.contas': 'Hice las cuentas con lo que ha apuntado: entran unos {R} al mes y lo esencial se lleva {E}. No sobra nada. ',
    'resp.semfolga': `Le voy a decir una cosa que nadie dice: **si las cuentas no salen, el problema no es su disciplina.** No hay método de presupuesto que arregle la falta de dinero. Yo pasé por esto, y lo que me sacó de ahí no fue apretarme más el cinturón — fue mover tres cosas, en este orden de dificultad:

**1. Ayudas a las que tiene derecho y no está cobrando.** Es asombrosamente común, y es lo único que da dinero esta semana sin trabajar una hora más. Toque **Ayudas** aquí abajo y conteste cuatro preguntas.

**2. Gastos fijos, sobre todo la vivienda.** Un alquiler {v80} más barato vale más que dos años ahorrando en el supermercado. Es duro y es lento, pero es lo que cambia la cuenta de verdad.

**3. Ingresos.** Horas, formación pagada, cambiar de empresa, un trabajo aparte. Es el más lento de los tres — y el único que lo resuelve para siempre.

Mientras no sobre nada, el objetivo no es ahorrar. Es **terminar el mes sin deuda nueva.** Eso ya es ganar.`,

    'resp.subsidios': `Quien vive de ayudas tiene un problema que casi ningún consejo financiero trata: **el dinero llega en fechas fijas y no aumenta**. Eso lo cambia todo — y, al contrario de lo que parece, juega a favor.

**Por qué a favor:** quien tiene ingreso fijo puede planificar al céntimo. Quien trabaja a destajo no puede. La previsibilidad es la única ventaja que tiene, y la mayoría de la gente la desperdicia.

**Qué hacer con ella, en concreto:**

**El día que entra**, separe primero — aunque sean {v5}. No a fin de mes, cuando ya no queda. Esa es la diferencia entre quien junta y quien no junta, y no tiene nada que ver con cuánto se gana.

**Compruebe lo que le falta cobrar.** Mucha gente cobra una ayuda y tiene derecho a tres. El bono social de la luz no es automático — hay que pedirlo, y mucha gente que tiene derecho nunca lo ha pedido. Toque **Ayudas** y mire la lista de su país.

**Apunte las fechas.** Si sabe que entra el día 20, sabe que del 15 al 19 son los días apretados. Deje las compras grandes para el 20 y el 21, cuando hay dinero y no se compra con agobio.

Empiece por **Ayudas** aquí abajo — es donde hay dinero que quizá ya sea suyo.`,

    'resp.comecar.zero': `Desde cero, y sin rodeos. El primer mes es el único que cuesta.

**Esta semana, solo esto:** apunte todo lo que gaste. Todo. El café, el pan, el bono del bus. No cambie nada de sus hábitos todavía — solo apunte. Son veinte segundos cada vez, en la pestaña **Registrar**.

**Por qué antes que todo lo demás:** quien apunta lo que gasta pasa a gastar menos, incluso sin proponérselo. No es fuerza de voluntad — es que pasa a haber un número donde antes había una sensación vaga. Yo solo entendí adónde iba mi dinero cuando lo vi escrito.

**A fin de mes** ya tiene algo que hoy no tiene: saber cuánto necesita de verdad para vivir. A partir de ahí todo se calcula.

**Y el segundo mes**, se aparta una cantidad el día que entra el dinero. Pequeña. Con {v10} basta para empezar — el hábito vale más que la cantidad, y la cantidad crece con el tiempo.

Nada de esto exige que sea una persona distinta de la que es. Exige un mes.`,

    'resp.comecar.andamento': `Ya ha apuntado {n} movimientos, que es más de lo que hace la mayoría. Con esos números, el camino es este:

**Le sobran unos {folga} al mes.** No guarde todo — quien intenta guardar lo que sobra entero abandona el primer mes difícil. Guarde **la mitad**, {metade}, y el día que entra el dinero.

**El objetivo son {alvo}** — tres meses de su gasto esencial. No es para invertir; es para que una avería no se convierta en un crédito al 18%. Es este colchón el que separa a quien va subiendo de quien vuelve siempre a la casilla de salida.

**Al ritmo de {metade} al mes**, llega en unos {meses} meses. Es mucho tiempo. Es también el tiempo que pasa igualmente.`,
    'resp.comecar.alvovago': 'tres meses de gasto esencial',

    'resp.reserva.semessencial': `El colchón se mide en **meses de gasto esencial**, no en euros. {v1000} son dos meses para quien gasta {v500}, y menos de uno para quien gasta {v1100}. Por eso el primer paso es saber cuánto es su esencial — apunte un mes entero y la aplicación se lo dice.`,
    'resp.reserva.feita': 'Tiene {m} meses. Está hecho — a partir de aquí lo que sobre puede ir a otra cosa.',
    'resp.reserva.um': 'Tiene {m} meses. Ya no está expuesto a lo peor: una avería ya no se convierte en crédito.',
    'resp.reserva.pouco': 'Tiene {m} meses. Es poco, pero es infinitamente más que cero — la primera semana de colchón es la que más cambia.',
    'resp.reserva.zero': 'Todavía no tiene ningún colchón. Es por aquí por donde se empieza.',
    'resp.reserva': `Su esencial son unos {E} al mes. {estado}

**Los escalones, por orden:**
· **Una semana** — {semana}. Cubre el susto pequeño.
· **Un mes** — {mes}. Cubre la mayoría de las averías.
· **Tres meses** — {tres}. Cubre quedarse sin trabajo una temporada.

No salte a los tres meses. Persiga siempre el escalón siguiente. Un objetivo que se alcanza da ganas de seguir; un objetivo lejano da ganas de dejarlo — y eso es lo que separa a quien lo consigue de quien empieza diez veces.`,

    'resp.dividas': `Sobre deudas, tres cosas que aprendí pagando caro.

**Primera: sepa el número.** No el "más o menos". El número. La mayoría de la gente endeudada no sabe cuánto debe exactamente, y no se arregla lo que no se mide. La herramienta **Por dónde empezar a pagar deudas** le hace esa cuenta.

**Segunda: el orden importa menos que seguir.** Por matemática, se empieza por el interés más alto. En la práctica, quien empieza por la deuda más pequeña abandona menos — y una estrategia abandonada ahorra cero. Si es de los que necesita ver una victoria, empiece por la pequeña. No es irracional; es conocerse.

**Tercera, y la más importante:** hay ayuda gratuita, y casi nadie la usa. Las oficinas municipales de información al consumidor (OMIC) atienden gratis, y en España existe además la **Ley de Segunda Oportunidad**, que permite a una persona física cancelar deudas que no puede pagar. Es un proceso judicial y lleva tiempo, pero existe. **No pague a una empresa por "cancelar" o "unificar" sus deudas** antes de haber ido a una oficina pública: lo que cobran por gestionar es, muchas veces, lo que usted puede pedir sin pagar nada.{nota}`,
    'resp.dividas.nota': '\n\nHe visto que tiene cuotas apuntadas. En la pestaña **Inicio**, el bloque "Ya comprometido" le muestra cuánto de cada mes ya está gastado antes de empezar.',

    'resp.rendimento': `Ahorrar tiene techo: no se puede recortar por debajo de cero. Ganar no lo tiene. Si lo esencial se le lleva todo, la salida está aquí — y es el camino más lento y el único definitivo.

**Lo que aprendí empezando sin dinero:**

**Venda lo que ya sabe hacer, no lo que le gustaría saber.** El error que más veces he visto costar meses fue ponerse a aprender algo nuevo teniendo ya algo vendible en las manos. Cocinar, arreglar, limpiar, conducir, cortar el pelo, escribir, traducir, cuidar. Cualquiera de ellas tiene mercado hoy.

**Empiece por el primer cliente, no por la empresa.** Sin nombre, sin logotipo, sin web. Un cliente que paga. Darse de alta se hace después, y se hace en días. He visto a mucha gente gastarse los ahorros preparando un negocio que nunca tuvo un cliente.

**Cobre desde el primer día.** El trabajo gratis "para ganar experiencia" le enseña al cliente a no pagar. Cobre poco al principio, pero cobre.

**Separe el dinero del negocio del dinero de casa** desde el primer euro. Mezclados, el negocio parece rentable hasta el día en que no hay para el alquiler.

**Y lo más importante:** un negocio pequeño que da {v200} al mes, todos los meses, le cambia más la vida que un plan grande que nunca empieza. {v200} al mes son el alquiler más barato, son el colchón hecho en un año, son la deuda de la tarjeta pagada.`,

    'resp.investir.antes': `Antes de nada: tiene {m} meses de colchón. Invertir antes de tener tres es como poner el tejado antes que las paredes — a la primera avería se vende al peor precio posible, y se pierde más de lo que se ganó.

`,
    'resp.investir': `No le digo dónde poner su dinero. No soy una entidad autorizada para eso, y quien se lo diga sin conocer su vida le está vendiendo algo.

**Lo que sí puedo decirle es cómo funciona, y las preguntas que tiene que hacer:**

**El coste es lo único previsible.** La rentabilidad no la sabe nadie; la comisión se sabe al céntimo. Una diferencia del 2% al año en comisiones, a lo largo de veinte años, se come una parte enorme del resultado. Pregunte siempre: *¿cuánto me cobra esto al año, todo incluido?*

**El plazo lo decide todo.** El dinero que puede necesitar dentro de tres años no debe estar expuesto a oscilaciones. Por eso el colchón va primero.

**Las preguntas antes de firmar nada:**
· ¿Cuánto cuesta al año, todo incluido?
· ¿Cuánto puedo perder en el peor año registrado?
· ¿En cuánto tiempo puedo sacar el dinero, y con qué penalización?
· ¿Qué garantía existe, y hasta qué importe?
· ¿Quien me está vendiendo esto cobra comisión?

Si quien le vende no responde a las cinco con claridad, ya tiene su respuesta.`,

    'resp.app': `Sencilla, y es a propósito.

**Registrar** — toque en lo que fue (Mercado, Luz, Alquiler…), escriba cuánto, y ya está. Veinte segundos. El importe se escribe siempre a mano porque es eso lo que hace pensar en el dinero; tocar una etiqueta no.

**Inicio** — muestra lo que queda hasta fin de mes, y **por día**. Ese es el número que decide una ida al supermercado; el total del mes no decide nada.

**Mes** — todos los movimientos y adónde fue el dinero, por categoría.

**Más** — las herramientas, el método y el premium.

No necesita cuenta, no necesita internet, y no se conecta a su banco. Los datos se quedan en su móvil.

Si algo le resulta confuso, dígame qué y se lo explico.`,

    'resp.premium': `Directo: **todo lo que necesita para llevar el mes y juntar un colchón es gratis, y va a seguir siéndolo.** Cobrar eso a quien está intentando salir de una situación difícil sería contradecir la razón de existir de esto.

El premium son **4,90 €, una sola vez** — no es una cuota mensual. Da acceso al plan de 12 meses mes a mes, a la comparación de caminos, a la proyección a largo plazo, y a la sincronización entre el móvil y el ordenador.

Y le digo una cosa que estas páginas nunca dicen: **si no puede pagarlo, escriba y la clave es suya igualmente.** Sin justificación y sin ninguna comprobación. Un proyecto que existe para ayudar a quien tiene poco no puede ser un sitio más donde quien tiene poco se queda fuera.`,

    'abertura': `Soy **Wesley Vianna**, fundador de Vida Financeira. Empecé sin nada y construí lo que tengo a partir de negocios pequeños — así que no le voy a dar consejos que nunca tuve que aplicarme a mí mismo.

**Escríbame como le hablaría a una persona.** Tres cosas que hago aquí:

**Apunto por usted.** Escriba como habla, diciendo **qué es el sitio y cómo se llama**:

«Gasté 30 euros en el **supermercado** Mercadona»
«Pagué 12 en la **farmacia** del barrio»
«Eché 40 de gasolina en la **gasolinera** BP»

Y queda apuntado, con el importe, la categoría y la tienda. No tiene que rellenar nada. Si el sitio no es de ninguno de esos tipos, escríbalo igual — yo lo coloco donde pueda.

**Hago las cuentas.** Está en la tienda y dice «¿12 plazos de 45,90 o 480 al contado?» — le respondo con los números antes de que firme.

**Contesto preguntas** con sus números, no con generalidades.

{numeros}

Pregunte sin problema.`,
    'abertura.semnumeros': 'Todavía no ha apuntado nada, pero puedo responderle igual — y en cuanto apunte un mes, le respondo con sus números.',
    'abertura.comnumeros': 'Ya he visto sus números: {quais}. Puedo responderle a partir de ellos.',
    'abertura.entra': 'entran unos {R} al mes',
    'abertura.movimentos': '{n} movimientos apuntados',

    'resp.generica.zero': 'Todavía no ha apuntado nada, así que aún no sé nada de su situación.',
    'resp.generica.jalancou': 'Ya ha apuntado {n} movimientos{comR}.',
    'resp.generica.comR': ', y entran unos {R} al mes',
    'resp.generica': `{contexto} Puedo ayudarle mejor si me pregunta por una de estas cosas:

· **"No me sobra nada a fin de mes"** — qué hacer cuando las cuentas no salen
· **"Cobro una ayuda"** — cómo planificar con ingreso fijo
· **"¿Por dónde empiezo?"** — el primer mes, paso a paso
· **"¿Cuánto debo guardar?"** — el colchón, por escalones
· **"Tengo deudas"** — el orden correcto y dónde hay ayuda gratuita
· **"¿Cómo gano más?"** — empezar a vender sin dinero
· **"¿Dónde invierto?"** — qué preguntar antes de firmar nada

Escriba con sus palabras. Le entiendo aunque escriba torcido.`
  });

  /* ---------------------------------------------------------- english */
  Object.assign(TEXTOS.en, {
    'resp.semfolga.contas': 'I did the sums with what you have entered: about {R} comes in each month and the essentials take {E}. Nothing is left. ',
    'resp.semfolga': `Here is something nobody says: **if the month does not balance, the problem is not your discipline.** No budgeting method fixes not having enough money. I have been there, and what got me out was not tightening the belt further — it was moving three things, in this order of difficulty:

**1. Benefits you are entitled to and are not claiming.** It is startlingly common, and it is the only one that puts money in your hand this week without working another hour. Tap **Benefits** below and answer four questions.

**2. Fixed costs, housing above all.** Rent that is {v80} cheaper is worth more than two years of being careful at the supermarket. It is hard and it is slow, but it is what changes the arithmetic for good.

**3. Income.** Hours, training that pays for itself, changing employer, work on the side. The slowest of the three — and the only one that settles it permanently.

Until there is something left over, the goal is not to save. It is to **finish the month without new debt.** That already counts as winning.`,

    'resp.subsidios': `Living on benefits comes with a problem almost no financial advice deals with: **the money arrives on fixed dates and it does not grow**. That changes everything — and, unlike it seems, it works in your favour.

**Why in your favour:** a fixed income can be planned to the penny. Piece work cannot. Predictability is the one advantage you have, and most people waste it.

**What to do with it, concretely:**

**On the day it lands**, set money aside first — even if it is {v5}. Not at the end of the month, when there is none. That is the difference between people who build something up and people who do not, and it has nothing to do with how much they earn.

**Check what you are not claiming.** Plenty of people receive one benefit and qualify for three. Social tariffs on electricity and water are usually not automatic — they have to be applied for, and many people who qualify never have. Tap **Benefits** and look at the list for your country.

**Mark the dates.** If you know it lands on the 20th, you know the 15th to the 19th are the tight days. Plan the big shop for the 20th or the 21st, when there is money and you are not buying in a panic.

Start with **Benefits** below — that is where there may be money that is already yours.`,

    'resp.comecar.zero': `From zero, and no waffle. The first month is the only hard one.

**This week, only this:** enter everything you spend. Everything. The coffee, the bread, the bus pass. Do not change any habits yet — just record. It takes twenty seconds each time, on the **Add** tab.

**Why this before anything else:** people who record what they spend start spending less, even without trying. It is not willpower — it is that there is now a number where there used to be a vague feeling. I only understood where my money was going once I saw it written down.

**By the end of the month** you have something you do not have today: knowing what you actually need to live on. Everything else can be worked out from there.

**And in the second month**, you set an amount aside on the day the money comes in. A small one. {v10} is enough to start — the habit is worth more than the amount, and the amount grows with time.

None of this requires you to be a different person. It requires one month.`,

    'resp.comecar.andamento': `You have entered {n} items, which is more than most people manage. With those numbers, this is the way:

**You have about {folga} left over each month.** Do not save all of it — people who try to save the whole surplus give up in the first hard month. Save **half**, {metade}, on the day the money comes in.

**The target is {alvo}** — three months of your essentials. Not to invest; so that a breakdown does not turn into credit at 18%. This is the buffer that separates people who climb from people who keep going back to the start.

**At {metade} a month**, you get there in about {meses} months. That is a long time. It is also time that passes anyway.`,
    'resp.comecar.alvovago': 'three months of essential spending',

    'resp.reserva.semessencial': `A buffer is measured in **months of essential spending**, not in a currency. {v1000} is two months for someone who spends {v500}, and less than one for someone who spends {v1100}. So the first step is knowing what your essentials cost — enter a full month and the app will tell you.`,
    'resp.reserva.feita': 'You have {m} months. It is done — from here on, what is left over can go somewhere else.',
    'resp.reserva.um': 'You have {m} months. You are no longer exposed to the worst of it: a breakdown no longer becomes credit.',
    'resp.reserva.pouco': 'You have {m} months. It is little, but it is infinitely more than zero — the first week of buffer is the one that changes the most.',
    'resp.reserva.zero': 'You have no buffer yet. This is where it starts.',
    'resp.reserva': `Your essentials come to about {E} a month. {estado}

**The steps, in order:**
· **One week** — {semana}. Covers the small fright.
· **One month** — {mes}. Covers most breakdowns.
· **Three months** — {tres}. Covers being out of work for a while.

Do not jump to three months. Chase the next step, always. A target you reach makes you want to carry on; a distant target makes you want to stop — and that is what separates people who get there from people who start ten times.`,

    'resp.dividas': `On debt, three things I learned the expensive way.

**First: know the number.** Not "roughly". The number. Most people in debt do not know exactly what they owe, and you cannot fix what you do not measure. The **Where to start paying off debt** tool does that sum for you.

**Second: the order matters less than keeping going.** The maths says start with the highest interest rate. In practice, people who start with the smallest debt quit less often — and an abandoned plan saves nothing. If you are the sort who needs to see a win, start small. That is not irrational; that is knowing yourself.

**Third, and the most important:** free debt advice exists almost everywhere, and hardly anyone uses it. In Portugal, if you miss a payment the bank is **required by law** to put you into PERSI, and while that runs it cannot enforce the debt; free, confidential help comes from RACE. In Brazil, the superindebtedness law (14.181/2021) gives you the right to renegotiate everything at once, through Procon or the public defender, at no cost. Wherever you are, the rule holds: **never pay a company to sort out your debts** before you have been to a free service. What they charge to do is usually what you can ask for yourself for nothing.{nota}`,
    'resp.dividas.nota': '\n\nI can see you have instalments entered. On the **Home** tab, the "Already committed" block shows how much of each month is spent before the month starts.',

    'resp.rendimento': `Saving has a ceiling: you cannot cut below zero. Earning does not. If the essentials are taking everything, this is where the way out is — the slowest road and the only permanent one.

**What I learned starting with no money:**

**Sell what you already know how to do, not what you would like to know.** The mistake I have seen cost people months is going off to learn something new while holding something sellable in their hands. Cooking, fixing, cleaning, driving, cutting hair, writing, translating, caring. Every one of those has a market today.

**Start with the first customer, not the business.** No name, no logo, no website. One customer who pays. Registering comes afterwards, and takes days. I have watched people spend their savings preparing a business that never had a single customer.

**Charge from day one.** Free work "for the experience" teaches the customer not to pay. Charge little at first, but charge.

**Keep the business money separate from the household money** from the very first coin. Mixed together, the business looks profitable right up to the day there is nothing for the rent.

**And most important:** a small business bringing in {v200} a month, every month, changes your life more than a big plan that never starts. {v200} a month is cheaper rent, is a buffer built in a year, is the card debt paid off.`,

    'resp.investir.antes': `First things first: you have {m} months of buffer. Investing before you have three is like roofing a house before the walls are up — at the first breakdown you sell at the worst possible price, and lose more than you made.

`,
    'resp.investir': `I will not tell you where to put your money. I am not authorised to do that, and anyone who tells you without knowing your life is selling you something.

**What I can tell you is how it works, and the questions you have to ask:**

**Cost is the only predictable part.** Nobody knows the return; the fee is known to the penny. A 2% a year difference in fees, over twenty years, eats an enormous slice of the result. Always ask: *what does this charge me per year, all in?*

**The time frame decides everything.** Money you might need within three years should not be exposed to swings. That is why the buffer comes first.

**The questions to ask before signing anything:**
· What does it cost per year, everything included?
· How much could I lose in the worst year on record?
· How quickly can I get the money out, and with what penalty?
· What protection is there, and up to what amount?
· Does the person selling this to me earn commission?

If whoever is selling cannot answer all five clearly, you have your answer.`,

    'resp.app': `Simple, and that is deliberate.

**Add** — tap what it was (Groceries, Electricity, Rent…), type the amount, done. Twenty seconds. The amount is always typed by hand because that is what makes you think about the money; tapping a label does not.

**Home** — shows what is left until the end of the month, and **per day**. That is the number that decides a trip to the supermarket; the monthly total decides nothing.

**Month** — every entry and where the money went, by category.

**More** — the tools, the method and premium.

You do not need an account, you do not need internet, and it does not connect to your bank. The data stays on your phone.

If something is confusing, tell me which part and I will explain it.`,

    'resp.premium': `Straight up: **everything you need to run the month and build a buffer is free, and will stay free.** Charging for that, to people trying to get out of a hard situation, would contradict the reason this exists.

Premium is **€4.90, once** — not a subscription. It gives you the 12-month plan month by month, the comparison of routes, the long-term projection, and syncing between phone and computer.

And here is something these pages never say: **if you cannot pay, write to me and the key is yours anyway.** No explanation asked for and nothing checked. A project that exists to help people with little cannot be one more place where people with little are shut out.`,

    'abertura': `I am **Wesley Vianna**, founder of Vida Financeira. I started with nothing and built what I have out of small businesses — so I will not give you advice I never had to follow myself.

**Write to me the way you would talk to someone.** Three things I do here:

**I enter it for you.** Write it as you say it, telling me **what kind of place it is and its name**:

«I spent 30 at the **supermarket** Lidl»
«I paid 12 at the **pharmacy** Boots»
«I put 40 of petrol in at the **petrol station** BP»

And it is entered, with the amount, the category and the shop. You do not have to fill in anything. If the place is not one of those kinds, write it anyway — I will file it as best I can.

**I do the sums.** You are in the shop and you type «12 payments of 45.90 or 480 up front?» — I answer with the numbers before you sign.

**I answer questions** using your numbers, not generalities.

{numeros}

Ask away.`,
    'abertura.semnumeros': 'You have not entered anything yet, but I can still answer — and once you have entered a full month, I answer with your numbers.',
    'abertura.comnumeros': 'I have seen your numbers: {quais}. I can answer based on them.',
    'abertura.entra': 'about {R} comes in each month',
    'abertura.movimentos': '{n} items entered',

    'resp.generica.zero': 'You have not entered anything yet, so I do not know anything about your situation.',
    'resp.generica.jalancou': 'You have entered {n} items{comR}.',
    'resp.generica.comR': ', and about {R} comes in each month',
    'resp.generica': `{contexto} I can help better if you ask me about one of these:

· **"There is nothing left at the end of the month"** — what to do when the month does not balance
· **"I am on benefits"** — planning with a fixed income
· **"Where do I start?"** — the first month, step by step
· **"How much should I put aside?"** — the buffer, in steps
· **"I have debts"** — the right order and where the free help is
· **"How do I earn more?"** — starting to sell with no money
· **"Where should I invest?"** — what to ask before signing anything

Write it in your own words. I understand you even when the typing goes sideways.`
  });
})();
