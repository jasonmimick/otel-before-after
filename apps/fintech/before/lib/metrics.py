import json
from datetime import datetime

# In-memory metrics store
metrics_store = {}

def record_counter(metric, labels=None):
    if labels is None:
        labels = {}
    label_key = json.dumps(labels, sort_keys=True)
    
    if metric not in metrics_store:
        metrics_store[metric] = {}
    if label_key not in metrics_store[metric]:
        metrics_store[metric][label_key] = {"count": 0, "values": []}
    
    metrics_store[metric][label_key]["count"] += 1
    metrics_store[metric][label_key]["values"].append({
        "value": 1,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

def record_histogram(metric, value, labels=None):
    if labels is None:
        labels = {}
    label_key = json.dumps(labels, sort_keys=True)
    
    if metric not in metrics_store:
        metrics_store[metric] = {}
    if label_key not in metrics_store[metric]:
        metrics_store[metric][label_key] = {"count": 0, "sum": 0, "values": []}
    
    metrics_store[metric][label_key]["count"] += 1
    metrics_store[metric][label_key]["sum"] = metrics_store[metric][label_key].get("sum", 0) + value
    metrics_store[metric][label_key]["values"].append({
        "value": value,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

class Counter:
    def __init__(self, name):
        self.name = name
    
    def add(self, value=1, labels=None):
        record_counter(self.name, labels)

class Histogram:
    def __init__(self, name):
        self.name = name
    
    def record(self, value, labels=None):
        record_histogram(self.name, value, labels)

# Fintech metrics
accounts_list = Counter("accounts.list")
account_created = Counter("account.created")
transactions_list = Counter("transactions.list")
transfer_initiated = Counter("transfer.initiated")
transfer_completed = Counter("transfer.completed")
transfer_failed = Counter("transfer.failed")
loan_requested = Counter("loan.requested")
loan_approved = Counter("loan.approved")
loan_declined = Counter("loan.declined")
request_latency = Histogram("http.route.latency_ms")

def get_metrics_formatted():
    result = {}
    for metric, labeled_values in metrics_store.items():
        result[metric] = {}
        for label_key, entry in labeled_values.items():
            labels = json.loads(label_key)
            label_str = ",".join(f"{k}={v}" for k, v in labels.items()) if labels else "total"
            
            if "sum" in entry:
                # Histogram
                result[metric][label_str] = {
                    "count": entry["count"],
                    "sum": entry["sum"],
                    "avg": round(entry["sum"] / entry["count"], 2) if entry["count"] > 0 else 0
                }
            else:
                # Counter
                result[metric][label_str] = entry["count"]
    
    return result
