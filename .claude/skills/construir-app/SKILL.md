---
name: construir-app
description: >
  Método para construir e fazer crescer a aplicação Vida Financeira sem a
  matar — desde a decisão do que entra numa versão até publicar e verificar.
  Use esta skill sempre que for construir uma funcionalidade nova na aplicação,
  planear o que fazer a seguir, decidir se uma ideia vale o trabalho, avaliar
  porque é que as pessoas abandonam a app, ou preparar o lançamento de uma
  versão. Também se aplica a pedidos gerais como "quero fazer a melhor app de
  educação financeira" ou "o que construímos a seguir", que parecem estratégia
  mas resolvem-se com decisões concretas de produto e de faseamento.
---

# Construir esta aplicação

Regras de quem já viu aplicações boas morrerem. Não são teoria: cada uma
existe porque a ausência dela custou caro a alguém.

## O que decide o sucesso, por ordem

Contra a intuição, a lista é esta:

1. **A pessoa volta no dia seguinte?**
2. **Continua lá ao fim de um mês?**
3. Faz o que a app queria que ela fizesse?
4. Quantas funcionalidades tem?

A quarta quase não conta, e é onde vai quase todo o esforço na maioria dos
projetos. Uma aplicação de contas pessoais com três coisas, usada todos os
dias, vale mais do que uma com trinta, aberta duas vezes.

Antes de construir seja o que for, responda à primeira pergunta. Se a resposta
for "não muda nada no dia seguinte", tem uma ideia interessante e não uma
funcionalidade.

## Os primeiros sessenta segundos

É onde se perde a maioria das pessoas, e onde quase ninguém trabalha.

- **Nada de registo à entrada.** Pedir conta antes de mostrar valor é o filtro
  mais caro que existe. Esta app abre e funciona
- **Nada de assistente de arranque.** Quem chega quer fazer uma coisa, não
  responder a sete perguntas sobre si
- **O ecrã vazio é uma funcionalidade.** É o primeiro que toda a gente vê e o
  último que alguém desenha. Deve dizer o que fazer a seguir, numa acção só
- **Valor antes de esforço.** A primeira coisa que a pessoa faz tem de
  devolver alguma coisa imediatamente — um número que muda, uma soma que
  aparece

## Fricção

Cada campo obrigatório derruba parte das pessoas. Cada toque a mais reduz a
probabilidade de haver um dia seguinte.

Mas atenção à armadilha: **nem toda a fricção é má**. Nesta aplicação, o acto
de escrever a despesa é o que muda o comportamento — quem regista gasta menos,
mesmo que nunca veja um relatório. Automatizar o registo por completo tornava
a app mais cómoda e inútil.

A regra é: elimine a fricção que não ensina nada, preserve a que ensina. Um
campo que se pode preencher sozinho com um valor razoável, preencha-se. A
decisão que faz a pessoa pensar no dinheiro, essa fica.

## Como fatiar uma funcionalidade grande

Fatias que se publicam sozinhas e que já valem por si. Se a fatia 1 só faz
sentido quando a 2 existir, a divisão está errada — refaça-a.

Ordem por omissão:
1. A versão mais pequena que já ajuda alguém
2. Publicar e ver se é usada
3. Só depois, o que ficou de fora — se ainda fizer falta

O passo 3 cancela-se com frequência, e é aí que está o ganho: descobrir que a
funcionalidade completa não era precisa, sem a ter construído.

## O que nunca se estraga

- **Dados de quem já usa a app.** Campos novos assumem valores por omissão;
  dados antigos abrem sem migração; nada se apaga por não se perceber. Este
  erro é o único irrecuperável — a pessoa não volta nem recomenda
- **Funcionar sem rede.** O que precisa de internet é acessório
- **Funcionar sem conta.** A conta é uma comodidade, não um portão
- **A promessa de privacidade.** Sem rastreadores, sem venda de dados, sem
  ligação a bancos. É metade do argumento de existir

## Publicar

Antes de dar por feito, abra mesmo no navegador — a 1280px e a 390px de
largura. Ler o código não apanha o que uma página aberta apanha.

A lista mínima:
- O caso de zero movimentos, que é o que toda a gente vê primeiro
- Lançar, recarregar, confirmar que ficou lá
- Dados no formato antigo continuam a abrir
- Sem erros de JavaScript do próprio site na consola
- Sem deslize lateral: `document.documentElement.scrollWidth <= window.innerWidth`
- Alvos de toque com 40px ou mais; campos de formulário a 16px, senão o iOS
  dá zoom e desalinha tudo

Ao mexer em CSS ou JS, suba o `?v=` em todas as páginas — sem isso o navegador
serve a versão antiga e a correcção parece não ter funcionado. Ao acrescentar
uma página, ponha-a na lista `FICHEIROS` do `sw.js` e no menu de todas as
páginas.

## Cobrar dinheiro

Se a discussão for sobre funcionalidades pagas, leia isto antes de desenhar
seja o que for.

**Num site estático não há bloqueio possível.** Todo o código que chega ao
navegador é legível e alterável por quem o receber. Uma verificação de chave
em JavaScript é contornável em segundos. Não é uma falha a corrigir — é a
natureza da coisa.

As três saídas honestas:

1. **O valor pago vive no servidor.** O que se paga é uma coisa que o
   dispositivo não consegue fazer sozinho. Precisa de uma função alojada e de
   um processador de pagamentos
2. **Paga-se por confiança, não por bloqueio.** Tudo aberto, com um pedido de
   apoio honesto. Funciona melhor do que se espera quando o produto é amado, e
   não obriga a servidor nenhum
3. **Não cobrar por agora.** Adiar a decisão até haver gente suficiente para
   valer a pena

Qualquer plano que assuma que se consegue trancar funcionalidades locais está
a construir sobre areia. Diga-o a quem pedir, em vez de construir o bloqueio e
deixar que descubram sozinhos.

E há uma pergunta anterior a todas: **o que é que nunca pode ficar atrás de
pagamento?** Numa aplicação que existe para ajudar quem tem pouco, trancar o
essencial contradiz a razão de ser do produto — e é o género de contradição
que os utilizadores sentem antes de conseguirem nomear.
