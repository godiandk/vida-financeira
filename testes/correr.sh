#!/bin/sh
# Corre tudo. Precisa de `node` e de `playwright` instalados, e de um Chromium
# em /opt/pw-browsers/chromium (ou noutro sítio, dito em CHROMIUM=).
#
#   sh testes/correr.sh          — tudo
#   sh testes/correr.sh inv      — só os que têm "inv" no nome
#
# O servidor é levantado aqui e morto no fim: os testes abrem o site a sério,
# na porta 8930, e não ficheiros soltos do disco.

set -e
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
FILTRO="$1"

cd "$RAIZ"
python3 -m http.server 8930 >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null' EXIT INT TERM
sleep 1

FALHOU=0
FALHADOS=""
for f in "$RAIZ"/testes/*.js "$RAIZ"/testes/*.mjs; do
  nome=$(basename "$f")
  case "$nome" in
    fazer-*) continue ;;   # geram talões de mentira, não testam nada
  esac
  [ -n "$FILTRO" ] && case "$nome" in *"$FILTRO"*) ;; *) continue ;; esac

  echo ""
  echo "########## $nome"
  # O `node ... | tail` de antes nunca dava erro: num pipe, o `$?` é o do
  # `tail`, e o `tail` corre sempre bem. A suite dizia "=== fim ===" com
  # testes a rebentar lá dentro, e foi assim que um caminho absoluto para
  # outro projecto sobreviveu no `talaoui.mjs` sem ninguém dar por ele.
  # Guarda-se a saída num ficheiro, lê-se o código do `node`, e só depois se
  # mostram as últimas linhas.
  # O `|| CODIGO=$?` não é enfeite: com o `set -e` lá em cima, um `node` que
  # sai a não-zero matava a suite inteira antes de se chegar a ler o código.
  SAIDA=$(mktemp)
  CODIGO=0
  node "$f" >"$SAIDA" 2>&1 || CODIGO=$?
  tail -20 "$SAIDA"
  rm -f "$SAIDA"
  if [ "$CODIGO" != 0 ]; then
    echo "  ^^^ $nome saiu com o código $CODIGO"
    FALHOU=1
    FALHADOS="$FALHADOS $nome"
  fi
done

echo ""
if [ "$FALHOU" = 0 ]; then
  echo "=== fim ==="
else
  echo "=== rebentaram:$FALHADOS ==="
fi
exit $FALHOU
