import json
from datetime import datetime
import uuid

# In-memory storage
accounts = [
    {"id": "a1", "name": "Alice Johnson", "account_type": "checking", "balance": 5234.50, "created_at": "2026-01-15T10:00:00Z"},
    {"id": "a2", "name": "Bob Smith", "account_type": "savings", "balance": 15000.00, "created_at": "2026-02-20T10:00:00Z"},
    {"id": "a3", "name": "Carol White", "account_type": "checking", "balance": 8900.75, "created_at": "2026-03-10T10:00:00Z"},
]

transactions = [
    {"id": "t1", "account_id": "a1", "type": "deposit", "amount": 500.00, "status": "completed", "created_at": "2026-06-28T10:15:00Z"},
    {"id": "t2", "account_id": "a2", "type": "withdrawal", "amount": 200.00, "status": "completed", "created_at": "2026-06-28T11:30:00Z"},
]

transfers = [
    {"id": "xf1", "from_account": "a1", "to_account": "a2", "amount": 100.00, "status": "completed", "created_at": "2026-06-28T10:20:00Z"},
]

loans = [
    {"id": "ln1", "account_id": "a1", "amount": 10000.00, "term_months": 36, "status": "approved", "created_at": "2026-06-28T10:30:00Z"},
]

def get_accounts():
    return accounts

def create_account(name, account_type):
    account = {
        "id": f"a{int(uuid.uuid4().int % 1000000)}",
        "name": name,
        "account_type": account_type,
        "balance": 5000.00,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    accounts.append(account)
    return account

def get_account(account_id):
    for a in accounts:
        if a["id"] == account_id:
            return a
    return None

def get_transactions(account_id=None):
    if account_id:
        return [t for t in transactions if t["account_id"] == account_id]
    return transactions

def record_transaction(account_id, transaction_type, amount):
    transaction = {
        "id": f"t{int(uuid.uuid4().int % 1000000)}",
        "account_id": account_id,
        "type": transaction_type,
        "amount": amount,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    transactions.append(transaction)
    
    # Update account balance
    account = get_account(account_id)
    if account:
        if transaction_type == "deposit":
            account["balance"] += amount
        else:
            account["balance"] -= amount
    
    return transaction

def get_transfers(account_id=None):
    if account_id:
        return [t for t in transfers if t["from_account"] == account_id or t["to_account"] == account_id]
    return transfers

def initiate_transfer(from_account, to_account, amount):
    transfer = {
        "id": f"xf{int(uuid.uuid4().int % 1000000)}",
        "from_account": from_account,
        "to_account": to_account,
        "amount": amount,
        "status": "initiated",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    transfers.append(transfer)
    return transfer

def complete_transfer(from_account, to_account, amount):
    transfer = {
        "id": f"xf{int(uuid.uuid4().int % 1000000)}",
        "from_account": from_account,
        "to_account": to_account,
        "amount": amount,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    transfers.append(transfer)
    
    # Update balances
    from_acc = get_account(from_account)
    to_acc = get_account(to_account)
    if from_acc:
        from_acc["balance"] -= amount
    if to_acc:
        to_acc["balance"] += amount
    
    return transfer

def fail_transfer(from_account, to_account, amount):
    transfer = {
        "id": f"xf{int(uuid.uuid4().int % 1000000)}",
        "from_account": from_account,
        "to_account": to_account,
        "amount": amount,
        "status": "failed",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    transfers.append(transfer)
    return transfer

def get_loans(account_id=None):
    if account_id:
        return [l for l in loans if l["account_id"] == account_id]
    return loans

def request_loan(account_id, amount, term_months):
    loan = {
        "id": f"ln{int(uuid.uuid4().int % 1000000)}",
        "account_id": account_id,
        "amount": amount,
        "term_months": term_months,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    loans.append(loan)
    return loan

def approve_loan(loan_id):
    for l in loans:
        if l["id"] == loan_id:
            l["status"] = "approved"
            return l
    return None

def decline_loan(loan_id):
    for l in loans:
        if l["id"] == loan_id:
            l["status"] = "declined"
            return l
    return None

def get_metrics_formatted():
    from lib.metrics import metrics_store
    result = {}
    for metric, labeled_values in metrics_store.items():
        result[metric] = {}
        for label_key, entry in labeled_values.items():
            labels = json.loads(label_key)
            label_str = ",".join(f"{k}={v}" for k, v in labels.items()) if labels else "total"
            
            if "sum" in entry:
                result[metric][label_str] = {
                    "count": entry["count"],
                    "sum": entry["sum"],
                    "avg": round(entry["sum"] / entry["count"], 2) if entry["count"] > 0 else 0
                }
            else:
                result[metric][label_str] = entry["count"]
    
    return result
