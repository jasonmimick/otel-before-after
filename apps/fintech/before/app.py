from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
import json
import uuid
from datetime import datetime
from typing import List, Optional
import asyncio
import random

from lib.logger import logger
from lib.metrics import (
    accounts_list, account_created, transactions_list, 
    transfer_initiated, transfer_completed, transfer_failed,
    loan_requested, loan_approved, loan_declined, request_latency
)
from lib.traffic_gen import start_traffic_generator
from lib.store import (
    get_accounts, create_account, get_account,
    get_transactions, record_transaction,
    initiate_transfer, complete_transfer, fail_transfer,
    request_loan, approve_loan, decline_loan,
    get_transfers, get_loans, get_metrics_formatted
)

app = FastAPI(title="hello-otel-fintech", description="Fintech API with structured logging")

# Start traffic generator on startup
@app.on_event("startup")
async def startup_event():
    print("[startup] Starting fintech app")
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

# Root dashboard
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>hello-otel Fintech</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: monospace; font-size: 14px; background: #f9fafb; color: #111; }
            .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
            header { margin-bottom: 24px; }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #888; }
            .metrics-panel { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 16px; margin-bottom: 24px; }
            .metrics-panel h2 { font-weight: 600; color: #1e3a8a; margin-bottom: 12px; font-size: 14px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
            .metric { background: white; border: 1px solid #dbeafe; border-radius: 4px; padding: 12px; }
            .metric-value { font-weight: 600; color: #374151; margin-bottom: 4px; }
            .metric-label { font-size: 11px; color: #2563eb; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
            .card { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; }
            .card h2 { font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 14px; }
            .card-list { space-y: 8px; }
            .list-item { border-bottom: 1px solid #f3f4f6; padding: 8px 0; font-size: 12px; }
            .list-item:last-child { border-bottom: none; }
            button { background: #f3f4f6; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-family: monospace; }
            button:hover { background: #e5e7eb; }
            .status { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 11px; }
            .status.active { background: #dcfce7; color: #166534; }
            .status.pending { background: #fef3c7; color: #b45309; }
            .status.approved { background: #dbeafe; color: #1e40af; }
            .status.declined { background: #fee2e2; color: #991b1b; }
            .activity { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; }
            .log { height: 300px; overflow-y: auto; font-size: 11px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-family: monospace; }
            .log-entry { margin-bottom: 4px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>hello-otel Fintech</h1>
                <p class="subtitle">Fintech API with structured logging — accounts, transactions, transfers, loans</p>
            </header>
            
            <div class="metrics-panel" id="metricsPanel">
                <h2>📊 Metrics (auto-refreshing every 2s)</h2>
                <div class="metrics-grid" id="metricsGrid">
                    <p>Loading metrics...</p>
                </div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h2>Accounts</h2>
                    <button onclick="fetchAccounts()">Refresh</button>
                    <div class="card-list" id="accountsList">
                        <p>Loading...</p>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Transactions</h2>
                    <button onclick="fetchTransactions()">Refresh</button>
                    <div class="card-list" id="transactionsList">
                        <p>Loading...</p>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Transfers</h2>
                    <button onclick="fetchTransfers()">Refresh</button>
                    <div class="card-list" id="transfersList">
                        <p>Loading...</p>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Loans</h2>
                    <button onclick="fetchLoans()">Refresh</button>
                    <div class="card-list" id="loansList">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
            
            <div class="activity" style="margin-top: 16px;">
                <h2>Activity Log</h2>
                <div class="log" id="activityLog">
                    <p style="color: #999;">Waiting for activity...</p>
                </div>
            </div>
        </div>
        
        <script>
            let log = [];
            
            function addLog(msg) {
                const time = new Date().toISOString().slice(11, 23);
                log.unshift(`[${time}] ${msg}`);
                log = log.slice(0, 30);
                updateLog();
            }
            
            function updateLog() {
                const logDiv = document.getElementById('activityLog');
                logDiv.innerHTML = log.map(e => `<div class="log-entry">${e}</div>`).join('') || '<p style="color: #999;">No activity</p>';
            }
            
            async function fetchMetrics() {
                try {
                    const res = await fetch('/api/metrics');
                    const metrics = await res.json();
                    const grid = document.getElementById('metricsGrid');
                    grid.innerHTML = Object.entries(metrics).slice(0, 8).map(([name, labels]) => {
                        const first = Object.entries(labels)[0];
                        const value = first ? (typeof first[1] === 'object' ? first[1].count : first[1]) : 0;
                        return `<div class="metric"><div class="metric-value">${value}</div><div class="metric-label">${name}</div></div>`;
                    }).join('');
                } catch (e) { console.error('Failed to fetch metrics:', e); }
            }
            
            async function fetchAccounts() {
                try {
                    const res = await fetch('/api/accounts');
                    const data = await res.json();
                    const list = document.getElementById('accountsList');
                    list.innerHTML = data.accounts.map(a => `<div class="list-item"><strong>${a.name}</strong> · ${a.account_type} · Balance: $${a.balance}</div>`).join('') || '<p>No accounts</p>';
                    addLog(`GET /api/accounts → ${data.count} accounts`);
                } catch (e) { console.error('Failed:', e); }
            }
            
            async function fetchTransactions() {
                try {
                    const res = await fetch('/api/transactions');
                    const data = await res.json();
                    const list = document.getElementById('transactionsList');
                    list.innerHTML = data.transactions.slice(0, 5).map(t => `<div class="list-item">$${t.amount} · ${t.type} · ${t.status}</div>`).join('') || '<p>No transactions</p>';
                    addLog(`GET /api/transactions → ${data.count} transactions`);
                } catch (e) { console.error('Failed:', e); }
            }
            
            async function fetchTransfers() {
                try {
                    const res = await fetch('/api/transfers');
                    const data = await res.json();
                    const list = document.getElementById('transfersList');
                    list.innerHTML = data.transfers.slice(0, 5).map(t => `<div class="list-item">$${t.amount} · <span class="status ${t.status}">${t.status}</span></div>`).join('') || '<p>No transfers</p>';
                    addLog(`GET /api/transfers → ${data.count} transfers`);
                } catch (e) { console.error('Failed:', e); }
            }
            
            async function fetchLoans() {
                try {
                    const res = await fetch('/api/loans');
                    const data = await res.json();
                    const list = document.getElementById('loansList');
                    list.innerHTML = data.loans.slice(0, 5).map(l => `<div class="list-item">$${l.amount} · <span class="status ${l.status}">${l.status}</span></div>`).join('') || '<p>No loans</p>';
                    addLog(`GET /api/loans → ${data.count} loans`);
                } catch (e) { console.error('Failed:', e); }
            }
            
            // Initial load
            fetchAccounts();
            fetchTransactions();
            fetchTransfers();
            fetchLoans();
            fetchMetrics();
            
            // Auto-refresh metrics every 2s
            setInterval(fetchMetrics, 2000);
        </script>
    </body>
    </html>
    """
