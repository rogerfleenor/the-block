#!/usr/bin/env bash
set -eu
set -o pipefail

# the-block API smoke test
# Boots the built server on a free port, curls every critical endpoint,
# asserts on the response shape, then kills the process.
#
# Returns non-zero on the first failure.

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
API_ROOT="$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )"
DIST="$API_ROOT/dist/server.js"

if [ ! -f "$DIST" ]; then
  echo "→ building API (no dist found)"
  (cd "$API_ROOT" && npm run build --silent)
fi

# Find a free port in a portable way.
find_free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('', 0))
print(s.getsockname()[1])
s.close()
PY
}

PORT=$(find_free_port)
BASE="http://127.0.0.1:${PORT}"

echo "→ booting API on :${PORT}"
LOG_FILE=$(mktemp)
API_PORT="$PORT" LOG_LEVEL=warn NODE_ENV=test node "$DIST" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  echo "--- server log (last 20 lines) ---"
  tail -n 20 "$LOG_FILE" || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

# Wait for /api/health to come up (max ~8s).
ok=0
for i in $(seq 1 40); do
  if curl -sf "$BASE/api/health" > /dev/null; then
    ok=1
    break
  fi
  sleep 0.2
done
if [ "$ok" -ne 1 ]; then
  echo "FAIL: API did not become ready"
  exit 1
fi

fail() {
  echo "FAIL: $1"
  exit 1
}

echo "→ GET /api/health"
HEALTH=$(curl -sf "$BASE/api/health")
echo "  $HEALTH"
echo "$HEALTH" | grep -q '"ok":true' || fail "/api/health missing ok:true"

echo "→ GET /api/vehicles?limit=2"
LIST=$(curl -sf "$BASE/api/vehicles?limit=2")
COUNT=$(echo "$LIST" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["items"]))')
[ "$COUNT" = "2" ] || fail "/api/vehicles?limit=2 returned $COUNT items (expected 2)"
echo "  ok (2 items)"

# Pick the first id + vin for downstream calls.
FIRST_ID=$(echo "$LIST" | python3 -c 'import sys,json; print(json.load(sys.stdin)["items"][0]["id"])')
FIRST_VIN=$(echo "$LIST" | python3 -c 'import sys,json; print(json.load(sys.stdin)["items"][0]["vin"])')

echo "→ GET /api/vehicles/$FIRST_ID"
DETAIL=$(curl -sf "$BASE/api/vehicles/$FIRST_ID")
RETURNED_VIN=$(echo "$DETAIL" | python3 -c 'import sys,json; print(json.load(sys.stdin)["vin"])')
[ "$RETURNED_VIN" = "$FIRST_VIN" ] || fail "Returned VIN $RETURNED_VIN ≠ expected $FIRST_VIN"
echo "  ok (vin=$RETURNED_VIN)"

CURRENT_BID=$(echo "$DETAIL" | python3 -c 'import sys,json; v=json.load(sys.stdin); print(max(v["starting_bid"], v["current_bid"]))')
NEXT_BID=$((CURRENT_BID + 500))

echo "→ POST /api/vehicles/$FIRST_ID/bids (amount=$NEXT_BID)"
BID_RES=$(curl -sf -X POST "$BASE/api/vehicles/$FIRST_ID/bids" \
  -H 'content-type: application/json' \
  -d "{\"amount\": $NEXT_BID}")
NEW_BID=$(echo "$BID_RES" | python3 -c 'import sys,json; print(json.load(sys.stdin)["currentBid"])')
[ "$NEW_BID" = "$NEXT_BID" ] || fail "Bid amount mismatch: got $NEW_BID, expected $NEXT_BID"
echo "  ok (currentBid=$NEW_BID)"

echo "→ POST /api/agent/invoke (bid suggestion)"
AGENT_BID_AMOUNT=$((NEXT_BID + 1000))
AGENT_RES=$(curl -sf -X POST "$BASE/api/agent/invoke" \
  -H 'content-type: application/json' \
  -d "{\"utterance\":\"bid $AGENT_BID_AMOUNT\",\"context\":{\"vehicleId\":\"$FIRST_ID\"}}")
HAS_SUGGESTION=$(echo "$AGENT_RES" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["suggestions"]))')
[ "$HAS_SUGGESTION" = "1" ] || fail "/api/agent/invoke did not return a suggestion (got $HAS_SUGGESTION)"
SUGGESTED=$(echo "$AGENT_RES" | python3 -c 'import sys,json; print(json.load(sys.stdin)["suggestions"][0]["amount"])')
[ "$SUGGESTED" = "$AGENT_BID_AMOUNT" ] || fail "Suggestion amount $SUGGESTED ≠ $AGENT_BID_AMOUNT"
echo "  ok (suggestion=$SUGGESTED)"

echo "→ GET /api/providers"
PROVIDERS=$(curl -sf "$BASE/api/providers")
PROVIDER_COUNT=$(echo "$PROVIDERS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["providers"]))')
[ "$PROVIDER_COUNT" -ge 30 ] || fail "/api/providers reported $PROVIDER_COUNT (expected ≥ 30)"
echo "  ok ($PROVIDER_COUNT providers)"

echo ""
echo "✓ smoke passed (PORT=$PORT)"
