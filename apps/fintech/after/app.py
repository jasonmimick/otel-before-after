from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, Response
import json
import uuid
import os
from datetime import datetime
from typing import List, Optional
import asyncio
import random

from lib.logger import logger
from lib.metrics import (
    accounts_list, account_created, transactions_list, 
    transfer_initiated, transfer_completed, transfer_failed,
    loan_requested, loan_approved, loan_declined, request_latency,
    OTEL_INSTRUMENT_NAMES
)
from lib.traffic_gen import start_traffic_generator
from lib.events import get_events
from lib.store import (
    get_accounts, create_account, get_account,
    get_transactions, record_transaction,
    initiate_transfer, complete_transfer, fail_transfer,
    request_loan, approve_loan, decline_loan,
    get_transfers, get_loans, get_metrics_formatted
)
from otel_init import init_otel

app = FastAPI(title="hello-otel-fintech", description="Fintech API with structured logging")
init_otel(app)

# Start traffic generator on startup
@app.on_event("startup")
async def startup_event():
    print("[startup] Starting fintech app")
    if os.getenv("ENABLE_TRAFFIC_GEN", "").lower() == "true":
        asyncio.create_task(start_traffic_generator())

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}

# Accounts endpoints
@app.get("/api/accounts")
async def list_accounts():
    import time
    start = time.time()
    accounts = get_accounts()
    accounts_list.add(1)
    logger.info("accounts.list", {"count": len(accounts)})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return {"accounts": accounts, "count": len(accounts)}

@app.post("/api/accounts")
async def create_new_account(name: str, account_type: str):
    import time
    start = time.time()
    account = create_account(name, account_type)
    account_created.add(1, {"type": account_type})
    logger.info("account.created", {"account_id": account["id"], "type": account_type})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return account

# Transactions endpoints
@app.get("/api/transactions")
async def list_transactions(account_id: Optional[str] = None):
    import time
    start = time.time()
    transactions = get_transactions(account_id)
    transactions_list.add(1)
    logger.info("transactions.list", {"account_id": account_id, "count": len(transactions)})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return {"transactions": transactions, "count": len(transactions)}

# Transfers endpoints
@app.get("/api/transfers")
async def list_transfers(account_id: Optional[str] = None):
    import time
    start = time.time()
    transfers = get_transfers(account_id)
    logger.info("transfers.list", {"account_id": account_id, "count": len(transfers)})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return {"transfers": transfers, "count": len(transfers)}

@app.post("/api/transfers")
async def create_transfer(from_account: str, to_account: str, amount: float):
    import time
    start = time.time()
    
    transfer_initiated.add(1)
    logger.info("transfer.initiated", {"from_account": from_account, "to_account": to_account, "amount": amount})
    
    await asyncio.sleep(0.1)
    
    # Simulate success/failure
    if random.random() < 0.05:
        fail_transfer(from_account, to_account, amount)
        transfer_failed.add(1)
        logger.warn("transfer.failed", {"from_account": from_account, "to_account": to_account, "amount": amount, "reason": "insufficient_funds"})
        latency = (time.time() - start) * 1000
        request_latency.record(latency)
        return {"status": "failed", "reason": "insufficient_funds"}
    
    transfer = complete_transfer(from_account, to_account, amount)
    transfer_completed.add(1)
    logger.info("transfer.completed", {"from_account": from_account, "to_account": to_account, "amount": amount, "transfer_id": transfer["id"]})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return transfer

# Loans endpoints
@app.get("/api/loans")
async def list_loans(account_id: Optional[str] = None):
    import time
    start = time.time()
    loans = get_loans(account_id)
    logger.info("loans.list", {"account_id": account_id, "count": len(loans)})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return {"loans": loans, "count": len(loans)}

@app.post("/api/loans")
async def apply_for_loan(account_id: str, amount: float, term_months: int):
    import time
    start = time.time()
    
    loan = request_loan(account_id, amount, term_months)
    loan_requested.add(1)
    logger.info("loan.requested", {"account_id": account_id, "amount": amount, "term_months": term_months})
    
    await asyncio.sleep(0.15)
    
    # Simulate approval/decline
    if random.random() < 0.15:
        decline_loan(loan["id"])
        loan_declined.add(1)
        logger.info("loan.declined", {"account_id": account_id, "amount": amount, "loan_id": loan["id"], "reason": "credit_score_insufficient"})
        latency = (time.time() - start) * 1000
        request_latency.record(latency)
        return {"status": "declined", "reason": "credit_score_insufficient"}
    
    approved_loan = approve_loan(loan["id"])
    loan_approved.add(1)
    logger.info("loan.approved", {"account_id": account_id, "amount": amount, "loan_id": loan["id"]})
    latency = (time.time() - start) * 1000
    request_latency.record(latency)
    return approved_loan

# Metrics endpoint
@app.get("/api/metrics")
async def get_metrics():
    metrics = get_metrics_formatted()
    return metrics

# Recent business events (ring buffer fed by the structured logger)
@app.get("/api/events")
async def list_events(limit: int = 50):
    return {"events": get_events(min(max(limit, 1), 100))}

@app.get("/api/agent")
async def agent_manifest():
    return {
        "service": "hello-otel-fintech",
        "version": "0.1.0",
        "domain": "fintech",
        "description": "FastAPI fintech demo service: accounts, transactions, transfers, and loans. Instrumented with OpenTelemetry traces, metrics, and logs over OTLP/gRPC.",
        "endpoints": [
            {"method": "GET", "path": "/", "description": "Live dashboard"},
            {"method": "GET", "path": "/health", "description": "Health check"},
            {"method": "GET", "path": "/api/accounts", "description": "List accounts"},
            {"method": "POST", "path": "/api/accounts", "description": "Create account (name, account_type query params)"},
            {"method": "GET", "path": "/api/transactions", "description": "List transactions"},
            {"method": "GET", "path": "/api/transfers", "description": "List transfers"},
            {"method": "POST", "path": "/api/transfers", "description": "Create transfer (from_account, to_account, amount query params)"},
            {"method": "GET", "path": "/api/loans", "description": "List loans"},
            {"method": "POST", "path": "/api/loans", "description": "Request loan (account_id, amount, term_months query params)"},
            {"method": "GET", "path": "/api/metrics", "description": "JSON snapshot of business metrics"},
            {"method": "GET", "path": "/api/events", "description": "Recent business events"},
            {"method": "GET", "path": "/api/agent", "description": "This manifest"},
            {"method": "GET", "path": "/llms.txt", "description": "Plain-text service description for LLM agents"},
        ],
        "otel": {
            "traces": True,
            "metrics": OTEL_INSTRUMENT_NAMES,
            "logs": True,
            "protocol": "otlp/grpc",
        },
        "health": "/health",
    }

@app.get("/llms.txt")
async def llms_txt():
    body = """# hello-otel-fintech

hello-otel-fintech is a FastAPI fintech demo service in the hello-otel suite. It models accounts, transactions, transfers, and loans with an in-memory store, and is fully instrumented with OpenTelemetry: traces, metrics, and logs are all exported over OTLP/gRPC. Business events are emitted as structured JSON to stdout, as trace-correlated OTel log records, and into a ring buffer at /api/events.

## Endpoints
- GET  /health
- GET  /api/accounts
- POST /api/accounts?name=...&account_type=...
- GET  /api/transactions
- GET  /api/transfers
- POST /api/transfers?from_account=...&to_account=...&amount=...
- GET  /api/loans
- POST /api/loans?account_id=...&amount=...&term_months=...
- GET  /api/metrics
- GET  /api/events
- GET  /api/agent

## OTel signals
- Traces: FastAPI server spans and background synthetic business spans
- Metrics: transfer.initiated, transfer.completed, loan.requested, and related counters/histograms
- Logs: business events with trace correlation
"""
    return Response(content=body, media_type="text/plain; charset=utf-8")

# Root dashboard — "control plane 2050"
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>hello-otel-fintech — control plane</title>
<style>
  :root {
    --bg: #05070f;
    --panel: #0b1020;
    --line: rgba(148,163,184,0.14);
    --line-soft: rgba(148,163,184,0.07);
    --text: #e2e8f0;
    --muted: #64748b;
    --dim: #94a3b8;
    --accent: #34d399;
    --accent-soft: rgba(52,211,153,0.14);
    --warn: #fbbf24;
    --err: #f87171;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
  }
  /* thin grid lines over the whole page */
  body::before {
    content: "";
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      linear-gradient(var(--line-soft) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 85%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 85%);
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* ---- header ---- */
  header {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 14px;
    padding: 14px 24px;
    background: rgba(5,7,15,0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
  }
  .svc-name { font-family: var(--mono); font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
  .svc-name .dot-sep { color: var(--muted); }
  .badge {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em;
    color: var(--accent); background: var(--accent-soft);
    border: 1px solid rgba(52,211,153,0.35);
    border-radius: 4px; padding: 3px 8px;
  }
  .head-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
  .clock { font-family: var(--mono); font-size: 12px; color: var(--dim); }
  .status { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; color: var(--muted); }
  .status-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: #475569; transition: background 0.3s, box-shadow 0.3s;
  }
  .status-dot.ok { background: var(--accent); box-shadow: 0 0 8px rgba(52,211,153,0.9), 0 0 20px rgba(52,211,153,0.4); animation: pulse 2.4s ease-in-out infinite; }
  .status-dot.bad { background: var(--err); box-shadow: 0 0 8px rgba(248,113,113,0.9); }
  @keyframes pulse { 50% { box-shadow: 0 0 4px rgba(52,211,153,0.6), 0 0 10px rgba(52,211,153,0.2); } }

  /* ---- layout ---- */
  main { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 24px; }
  .signal-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
  .signal {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
    color: var(--dim); background: var(--panel);
    border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px;
    display: flex; align-items: center; gap: 8px;
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  }
  .signal b { color: var(--accent); font-weight: 600; }
  .section-label {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em;
    color: var(--muted); margin: 0 0 10px 2px;
  }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 18px; align-items: start; }
  @media (max-width: 980px) { .layout { grid-template-columns: 1fr; } }

  /* ---- metric tiles ---- */
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .tile {
    background: linear-gradient(180deg, rgba(148,163,184,0.04), transparent 40%), var(--panel);
    border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 14px 12px;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    min-height: 118px; display: flex; flex-direction: column;
  }
  .tile-name { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile-value {
    font-family: var(--mono); font-size: 26px; font-weight: 600; line-height: 1;
    color: var(--accent);
    text-shadow: 0 0 14px rgba(52,211,153,0.45);
    font-variant-numeric: tabular-nums;
  }
  .tile-value .unit { font-size: 12px; color: var(--muted); text-shadow: none; margin-left: 3px; }
  .spark { display: flex; align-items: flex-end; gap: 2px; height: 26px; margin-top: auto; padding-top: 10px; }
  .spark span {
    flex: 1; min-height: 2px; border-radius: 1px;
    background: rgba(52,211,153,0.28); transition: height 0.4s ease;
  }
  .spark span:last-child { background: var(--accent); box-shadow: 0 0 6px rgba(52,211,153,0.55); }

  /* ---- event stream ---- */
  .events-panel {
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
  }
  .events-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 14px; border-bottom: 1px solid var(--line);
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; color: var(--muted);
  }
  .events-head .live { color: var(--accent); }
  #events { max-height: 560px; overflow-y: auto; font-family: var(--mono); font-size: 11px; }
  .ev { display: flex; gap: 9px; padding: 7px 14px; border-bottom: 1px solid var(--line-soft); align-items: baseline; }
  .ev.new { animation: flash 1.2s ease-out; }
  @keyframes flash { from { background: var(--accent-soft); } to { background: transparent; } }
  .ev-time { color: var(--muted); flex: none; }
  .ev-name { color: var(--text); flex: none; }
  .ev-fields { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ev-lvl { flex: none; width: 8px; text-align: center; }
  .ev-lvl.info { color: var(--accent); }
  .ev-lvl.warn { color: var(--warn); }
  .ev-lvl.error, .ev-lvl.debug { color: var(--err); }
  .ev-lvl.debug { color: var(--muted); }
  .empty { padding: 18px 14px; color: var(--muted); font-family: var(--mono); font-size: 11px; }

  /* ---- footer ---- */
  footer {
    position: relative; z-index: 1;
    max-width: 1280px; margin: 8px auto 0; padding: 18px 24px 28px;
    border-top: 1px solid var(--line);
    display: flex; flex-wrap: wrap; gap: 18px; align-items: center;
    font-family: var(--mono); font-size: 11.5px; color: var(--muted);
  }
  footer .spacer { margin-left: auto; }
</style>
</head>
<body>
<header>
  <span class="svc-name">hello-otel-fintech <span class="dot-sep">//</span> <span style="color:var(--muted)">control plane</span></span>
  <span class="badge">HELLO-OTEL SUITE</span>
  <div class="head-right">
    <span class="clock" id="clock">--:--:--Z</span>
    <span class="status"><span class="status-dot" id="statusDot"></span><span id="statusText">CONNECTING</span></span>
  </div>
</header>

<main>
  <div class="signal-strip">
    <span class="signal"><b>TRACES</b> OTLP/gRPC</span>
    <span class="signal"><b>METRICS</b> OTLP/gRPC · 10s</span>
    <span class="signal"><b>LOGS</b> OTLP/gRPC · trace-correlated</span>
    <span class="signal">DOMAIN <b>FINTECH</b> — accounts · transactions · transfers · loans</span>
  </div>

  <div class="layout">
    <section>
      <p class="section-label">LIVE BUSINESS METRICS · /api/metrics · 2.5s POLL</p>
      <div class="tiles" id="tiles"></div>
    </section>
    <section>
      <p class="section-label">EVENT STREAM · /api/events</p>
      <div class="events-panel">
        <div class="events-head"><span>RECENT BUSINESS EVENTS</span><span class="live" id="evCount">—</span></div>
        <div id="events"><div class="empty">awaiting events…</div></div>
      </div>
    </section>
  </div>
</main>

<footer>
  <a href="/api/metrics">/api/metrics</a>
  <a href="/api/agent">/api/agent</a>
  <a href="/llms.txt">/llms.txt</a>
  <a href="/health">/health</a>
  <span class="spacer">otel: traces · metrics · logs → OTLP gRPC</span>
</footer>

<script>
(function () {
  var POLL_MS = 2500;
  var SPARK_LEN = 24;
  var PREFERRED = [
    'transfer.completed', 'transfer.initiated', 'transfer.failed',
    'loan.approved', 'loan.requested', 'loan.declined',
    'account.created', 'transactions.list', 'accounts.list',
    'http.route.latency_ms'
  ];
  var tiles = {};   // name -> {el, valEl, sparkEl, shown, prevRaw, hist[]}
  var lastSeq = 0;

  // ---- clock ----
  function tickClock() {
    document.getElementById('clock').textContent =
      new Date().toISOString().slice(11, 19) + 'Z';
  }
  setInterval(tickClock, 1000); tickClock();

  // ---- health / status dot ----
  function pollHealth() {
    fetch('/health').then(function (r) {
      var ok = r.ok;
      var dot = document.getElementById('statusDot');
      dot.className = 'status-dot ' + (ok ? 'ok' : 'bad');
      document.getElementById('statusText').textContent = ok ? 'OPERATIONAL' : 'DEGRADED';
    }).catch(function () {
      document.getElementById('statusDot').className = 'status-dot bad';
      document.getElementById('statusText').textContent = 'UNREACHABLE';
    });
  }
  setInterval(pollHealth, 3000); pollHealth();

  // ---- metric tiles ----
  function flatten(metrics) {
    var out = {};
    Object.keys(metrics).forEach(function (name) {
      var labels = metrics[name];
      var sum = 0, hist = null;
      Object.keys(labels).forEach(function (k) {
        var v = labels[k];
        if (v && typeof v === 'object') { hist = v; }
        else { sum += v; }
      });
      out[name] = hist
        ? { kind: 'hist', value: hist.avg || 0, count: hist.count || 0 }
        : { kind: 'count', value: sum };
    });
    return out;
  }

  function orderNames(flat) {
    var names = Object.keys(flat);
    names.sort(function (a, b) {
      var ia = PREFERRED.indexOf(a), ib = PREFERRED.indexOf(b);
      if (ia === -1) ia = 999; if (ib === -1) ib = 999;
      return ia - ib || a.localeCompare(b);
    });
    return names;
  }

  function makeTile(name) {
    var el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = '<div class="tile-name"></div>' +
      '<div class="tile-value"><span class="num">0</span><span class="unit"></span></div>' +
      '<div class="spark"></div>';
    el.querySelector('.tile-name').textContent = name;
    var spark = el.querySelector('.spark');
    for (var i = 0; i < SPARK_LEN; i++) spark.appendChild(document.createElement('span'));
    document.getElementById('tiles').appendChild(el);
    return {
      el: el,
      valEl: el.querySelector('.num'),
      unitEl: el.querySelector('.unit'),
      sparkEl: spark,
      shown: 0, prevRaw: null, hist: []
    };
  }

  function countUp(t, target, decimals) {
    var from = t.shown, dur = 450, t0 = performance.now();
    if (from === target) { t.valEl.textContent = target.toFixed(decimals); return; }
    function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      t.valEl.textContent = (from + (target - from) * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    t.shown = target;
  }

  function drawSpark(t) {
    var max = Math.max.apply(null, t.hist.concat([1]));
    var bars = t.sparkEl.children;
    var pad = SPARK_LEN - t.hist.length;
    for (var i = 0; i < SPARK_LEN; i++) {
      var v = i < pad ? 0 : t.hist[i - pad];
      bars[i].style.height = Math.max(7, Math.round(v / max * 100)) + '%';
      bars[i].style.opacity = v === 0 ? 0.25 : 1;
    }
  }

  function pollMetrics() {
    fetch('/api/metrics').then(function (r) { return r.json(); }).then(function (raw) {
      var flat = flatten(raw);
      orderNames(flat).forEach(function (name) {
        var m = flat[name];
        var t = tiles[name] || (tiles[name] = makeTile(name));
        var isHist = m.kind === 'hist';
        t.unitEl.textContent = isHist ? 'ms avg' : '';
        // spark: activity delta for counters, avg trend for histograms
        var sparkVal;
        if (isHist) { sparkVal = m.value; }
        else {
          sparkVal = t.prevRaw === null ? 0 : Math.max(0, m.value - t.prevRaw);
        }
        t.prevRaw = m.value;
        t.hist.push(sparkVal);
        if (t.hist.length > SPARK_LEN) t.hist.shift();
        drawSpark(t);
        countUp(t, m.value, isHist ? 1 : 0);
      });
    }).catch(function () { /* keep last values */ });
  }
  setInterval(pollMetrics, POLL_MS); pollMetrics();

  // ---- event stream ----
  var LVL = { info: '▸', warn: '▲', error: '✕', debug: '·' };
  function fieldsToStr(fields) {
    return Object.keys(fields || {}).map(function (k) {
      return k + '=' + fields[k];
    }).join(' ');
  }
  function pollEvents() {
    fetch('/api/events?limit=40').then(function (r) { return r.json(); }).then(function (data) {
      var evs = data.events || [];
      var box = document.getElementById('events');
      if (!evs.length) return;
      var maxSeq = lastSeq;
      var html = evs.map(function (e) {
        if (e.seq > maxSeq) maxSeq = e.seq;
        var cls = 'ev' + (e.seq > lastSeq && lastSeq !== 0 ? ' new' : '');
        var time = (e.timestamp || '').slice(11, 19);
        return '<div class="' + cls + '">' +
          '<span class="ev-lvl ' + e.level + '">' + (LVL[e.level] || '▸') + '</span>' +
          '<span class="ev-time">' + time + '</span>' +
          '<span class="ev-name">' + escapeHtml(e.event) + '</span>' +
          '<span class="ev-fields">' + escapeHtml(fieldsToStr(e.fields)) + '</span>' +
          '</div>';
      }).join('');
      box.innerHTML = html;
      lastSeq = maxSeq;
      document.getElementById('evCount').textContent = 'LIVE · seq ' + maxSeq;
    }).catch(function () { /* retry next poll */ });
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  setInterval(pollEvents, POLL_MS); pollEvents();
})();
</script>
</body>
</html>"""
