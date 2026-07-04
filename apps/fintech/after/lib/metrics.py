import json
from datetime import datetime

from opentelemetry import metrics as otel_metrics

# OTel meter. lib/metrics is imported before init_otel() runs, so this is a
# proxy meter — instruments transparently bind to the real MeterProvider once
# otel_init.init_otel() calls set_meter_provider().
_meter = otel_metrics.get_meter("hello-otel-fintech")

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
    """Increments the in-memory store (feeds /api/metrics) AND an OTel
    Counter with the same name (exported over OTLP gRPC)."""

    def __init__(self, name, description=""):
        self.name = name
        self._otel = _meter.create_counter(
            name, unit="1", description=description or f"Business counter {name}"
        )

    def add(self, value=1, labels=None):
        record_counter(self.name, labels)
        self._otel.add(value, attributes=labels or {})

class Histogram:
    """Records into the in-memory store AND an OTel Histogram of the same
    name (exported over OTLP gRPC)."""

    def __init__(self, name, unit="1", description=""):
        self.name = name
        self._otel = _meter.create_histogram(
            name, unit=unit, description=description or f"Business histogram {name}"
        )

    def record(self, value, labels=None):
        record_histogram(self.name, value, labels)
        self._otel.record(value, attributes=labels or {})

# Fintech metrics — names match the /api/metrics JSON keys exactly.
accounts_list = Counter("accounts.list", "Account list operations")
account_created = Counter("account.created", "Accounts created")
transactions_list = Counter("transactions.list", "Transaction list operations")
transfer_initiated = Counter("transfer.initiated", "Transfers initiated")
transfer_completed = Counter("transfer.completed", "Transfers completed")
transfer_failed = Counter("transfer.failed", "Transfers failed")
loan_requested = Counter("loan.requested", "Loans requested")
loan_approved = Counter("loan.approved", "Loans approved")
loan_declined = Counter("loan.declined", "Loans declined")
request_latency = Histogram("http.route.latency_ms", unit="ms", description="Route handler latency")

# Instrument names exported over OTLP (also surfaced by /api/agent).
OTEL_INSTRUMENT_NAMES = [
    "accounts.list",
    "account.created",
    "transactions.list",
    "transfer.initiated",
    "transfer.completed",
    "transfer.failed",
    "loan.requested",
    "loan.approved",
    "loan.declined",
    "http.route.latency_ms",
]

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
