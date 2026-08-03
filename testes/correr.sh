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
for f in "$RAIZ"/testes/*.js "$RAIZ"/testes/*.mjs; do
  nome=$(basename "$f")
  case "$nome" in
    fazer-*) continue ;;   # geram talões de mentira, não testam nada
  esac
  [ -n "$FILTRO" ] && case "$nome" in *"$FILTRO"*) ;; *) continue ;; esac

  echo ""
  echo "########## $nome"
  if ! node "$f" 2>&1 | tail -20; then FALHOU=1; fi
done

echo ""
[ "$FALHOU" = 0 ] && echo "=== fim ===" || echo "=== houve testes a rebentar ==="
exit $FALHOU
