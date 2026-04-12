#!/usr/bin/env bash
# ============================================================
# NotSoFast Landlord — Demo Setup Script
# Philly Codefest 2026 | Advanced Track
#
# Run this on each demo laptop. It will:
#   1. Verify prerequisites (Python, Node, .env, ports)
#   2. Rebuild the legal corpus (ChromaDB)
#   3. Start the backend (port 8765)
#   4. Start the Vite frontend (port 5173)
#   5. Run health checks and open the right URLs
#
# Usage:
#   chmod +x scripts/demo_setup.sh
#   ./scripts/demo_setup.sh [ROLE]
#
# ROLE (optional):
#   app       — Laptop 1: main app (default)
#   glassbox  — Laptop 2: Glass Box audit dashboard
#   traces    — Laptop 3: terminal + live agent traces
#   all       — Start everything, open all URLs
# ============================================================

set -euo pipefail

# ---------- config ----------
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
VITE_DIR="$ROOT/notsofastlandlord"
ENV_FILE="$ROOT/.env"
BACKEND_PORT=8765
VITE_PORT=5173
ROLE="${1:-app}"

# ---------- colors ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[  OK]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }
header(){ echo -e "\n${BOLD}━━━ $* ━━━${NC}"; }

# ---------- banner ----------
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     ⚡ NOT SO FAST, LANDLORD ⚡              ║${NC}"
echo -e "${BOLD}║     Philly Codefest 2026 — Demo Setup        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
info "Role: ${BOLD}$ROLE${NC}"
info "Root: $ROOT"
echo ""

# ---------- 1. prerequisites ----------
header "1/5  Checking prerequisites"

ERRORS=0

# Python
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>&1)
    ok "Python: $PY_VER"
else
    fail "python3 not found"; ERRORS=$((ERRORS+1))
fi

# Node
if command -v node &>/dev/null; then
    NODE_VER=$(node --version 2>&1)
    ok "Node: $NODE_VER"
else
    fail "node not found"; ERRORS=$((ERRORS+1))
fi

# .env
if [ -f "$ENV_FILE" ]; then
    ok ".env exists"
    # Check critical keys
    if grep -q 'OPENAI_API_KEY=sk-' "$ENV_FILE" 2>/dev/null; then
        ok "OPENAI_API_KEY is set"
    else
        warn "OPENAI_API_KEY looks empty — LLM calls will fail"
    fi
    if grep -q 'INHIBITOR_API_KEY=GEN_' "$ENV_FILE" 2>/dev/null; then
        ok "INHIBITOR_API_KEY is set"
    else
        warn "INHIBITOR_API_KEY looks empty — Inhibitor challenge won't score"
    fi
else
    fail ".env missing — copy .env.example and fill in keys"
    echo "    cp $ROOT/.env.example $ENV_FILE"
    ERRORS=$((ERRORS+1))
fi

# venv
if [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    ok "Python venv exists"
else
    fail "Backend venv missing — run: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    ERRORS=$((ERRORS+1))
fi

# node_modules
if [ -d "$VITE_DIR/node_modules" ]; then
    ok "Vite node_modules exist"
else
    warn "node_modules missing in $VITE_DIR — will run npm install"
fi

if [ "$ERRORS" -gt 0 ]; then
    fail "$ERRORS critical issue(s) found. Fix them and re-run."
    exit 1
fi

# ---------- 2. port check ----------
header "2/5  Checking ports"

check_port() {
    local port=$1 name=$2
    if lsof -iTCP:"$port" -sTCP:LISTEN &>/dev/null; then
        local proc
        proc=$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
        warn "Port $port ($name) already in use by PID $proc"
        echo -en "    Kill it? [y/N] "
        read -r yn
        if [[ "$yn" =~ ^[Yy]$ ]]; then
            kill "$proc" 2>/dev/null && sleep 1
            ok "Killed PID $proc"
        else
            fail "Port $port blocked — backend won't start"
            exit 1
        fi
    else
        ok "Port $port ($name) is free"
    fi
}

check_port $BACKEND_PORT "backend"
check_port $VITE_PORT "vite"

# ---------- 3. rebuild chroma ----------
header "3/5  Rebuilding legal corpus (ChromaDB)"

cd "$BACKEND_DIR"
source .venv/bin/activate

if python "$ROOT/scripts/ingest_laws.py" 2>&1; then
    ok "ChromaDB rebuilt"
else
    warn "Ingest script had issues — RAG may use stale data (non-fatal)"
fi

# ---------- 4. start services ----------
header "4/5  Starting services"

# Backend
info "Starting backend on port $BACKEND_PORT..."
cd "$BACKEND_DIR"
BACKEND_PORT=$BACKEND_PORT nohup python run.py > /tmp/nsfl-backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > /tmp/nsfl-backend.pid
info "Backend PID: $BACKEND_PID (log: /tmp/nsfl-backend.log)"

# Wait for backend to be ready
info "Waiting for backend health check..."
for i in $(seq 1 30); do
    if curl -sf "http://localhost:$BACKEND_PORT/health" &>/dev/null; then
        ok "Backend is healthy"
        break
    fi
    if [ "$i" -eq 30 ]; then
        fail "Backend didn't start in 30s. Check /tmp/nsfl-backend.log"
        tail -20 /tmp/nsfl-backend.log
        exit 1
    fi
    sleep 1
done

# Vite frontend
info "Starting Vite frontend on port $VITE_PORT..."
cd "$VITE_DIR"
if [ ! -d "node_modules" ]; then
    info "Installing npm dependencies first..."
    npm install --silent
fi
VITE_BACKEND_URL="http://localhost:$BACKEND_PORT" nohup npx vite --host --port $VITE_PORT > /tmp/nsfl-vite.log 2>&1 &
VITE_PID=$!
echo "$VITE_PID" > /tmp/nsfl-vite.pid
info "Vite PID: $VITE_PID (log: /tmp/nsfl-vite.log)"

# Wait for Vite
sleep 3
if curl -sf "http://localhost:$VITE_PORT" &>/dev/null; then
    ok "Vite frontend is up"
else
    warn "Vite may still be starting — check /tmp/nsfl-vite.log"
fi

# ---------- 5. role-specific actions ----------
header "5/5  Opening demo for role: $ROLE"

OPEN_CMD="open"  # macOS
command -v xdg-open &>/dev/null && OPEN_CMD="xdg-open"

case "$ROLE" in
    app)
        info "LAPTOP 1 — Main App Demo"
        echo ""
        echo -e "  ${BOLD}Demo flow:${NC}"
        echo "    1. Splash page plays lightning animation (~3s)"
        echo "    2. Landing page — scroll to show features"
        echo "    3. Click 'Analyze Your Case' → Upload page"
        echo "    4. Select case type (e.g., 'Illegal Eviction')"
        echo "    5. Use the demo letter (click 'Load Demo') — it has intentional legal problems"
        echo "    6. Click 'Analyze' → wait for 5-agent pipeline"
        echo "    7. Walk through Results tabs: Claims → Actions → Timeline → Inhibitor → Letter"
        echo ""
        $OPEN_CMD "http://localhost:$VITE_PORT" 2>/dev/null || true
        ;;
    glassbox)
        info "LAPTOP 2 — Glass Box Audit Dashboard"
        echo ""
        echo -e "  ${BOLD}Demo flow:${NC}"
        echo "    1. Opens directly to /glass-box"
        echo "    2. Show Pipeline Overview — highlight the 5-agent architecture"
        echo "    3. Switch to Event Stream — point out real Inhibitor interventions"
        echo "    4. Switch to NotSoFast Logs — show our own tracing"
        echo "    5. Key talking point: set_a has 17,314 events, set_b has 2,651"
        echo ""
        $OPEN_CMD "http://localhost:$VITE_PORT/glass-box" 2>/dev/null || true
        ;;
    traces)
        info "LAPTOP 3 — Terminal + Live Traces"
        echo ""
        echo -e "  ${BOLD}Demo flow:${NC}"
        echo "    1. Keep terminal visible with this output"
        echo "    2. Open traces endpoint in browser (side by side)"
        echo "    3. When Laptop 1 runs an analysis, traces appear in real-time"
        echo "    4. Point out: Intake → Retrieval → Drafting → Critic → Finalizer"
        echo "    5. Show Inhibitor check happening between Drafting and Critic"
        echo ""
        echo -e "  ${BOLD}Live tail (backend logs):${NC}"
        echo "    tail -f /tmp/nsfl-backend.log"
        echo ""
        echo -e "  ${BOLD}Traces URL:${NC}"
        echo "    http://localhost:$BACKEND_PORT/traces"
        echo ""
        $OPEN_CMD "http://localhost:$BACKEND_PORT/traces" 2>/dev/null || true
        ;;
    all)
        info "Opening all demo surfaces..."
        $OPEN_CMD "http://localhost:$VITE_PORT" 2>/dev/null || true
        sleep 1
        $OPEN_CMD "http://localhost:$VITE_PORT/glass-box" 2>/dev/null || true
        sleep 1
        $OPEN_CMD "http://localhost:$BACKEND_PORT/traces" 2>/dev/null || true
        ;;
    *)
        warn "Unknown role '$ROLE'. Use: app | glassbox | traces | all"
        ;;
esac

# ---------- summary ----------
echo ""
echo -e "${BOLD}━━━ READY ━━━${NC}"
echo ""
echo -e "  Backend:    http://localhost:$BACKEND_PORT/health"
echo -e "  Main app:   http://localhost:$VITE_PORT"
echo -e "  Glass Box:  http://localhost:$VITE_PORT/glass-box"
echo -e "  Traces:     http://localhost:$BACKEND_PORT/traces"
echo ""
echo -e "  Logs:       /tmp/nsfl-backend.log"
echo -e "              /tmp/nsfl-vite.log"
echo ""
echo -e "  ${BOLD}To stop everything:${NC}"
echo "    kill \$(cat /tmp/nsfl-backend.pid) \$(cat /tmp/nsfl-vite.pid) 2>/dev/null"
echo ""
echo -e "${GREEN}${BOLD}  Go get that W. 🏆${NC}"
echo ""
