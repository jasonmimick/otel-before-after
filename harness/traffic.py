#!/usr/bin/env python3
"""Synthetic traffic driver for otel-before-after.

Drives the same realistic business flows against BOTH versions of every app
(before/ and after/) over real HTTP, so the verifier can prove the after/
version emits signals and the before/ version doesn't.

Stdlib only. Usage:
    python3 traffic.py --iterations 10   # N rounds then exit (CI)
    python3 traffic.py --forever         # continuous (~2 req/sec)
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))

STATS = {"ok": 0, "fail": 0}


def call(method, url, body=None, params=None):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            STATS["ok"] += 1
            return resp.status
    except (urllib.error.URLError, OSError) as e:
        STATS["fail"] += 1
        print(f"  [fail] {method} {url}: {e}", file=sys.stderr)
        return None


def fintech_flow(base):
    # FastAPI endpoints take query params, not JSON bodies
    call("POST", f"{base}/api/accounts", params={
        "name": f"user-{random.randint(1, 100)}",
        "account_type": random.choice(["checking", "savings"]),
    })
    call("POST", f"{base}/api/transfers", params={
        "from_account": f"acc-{random.randint(1, 50)}",
        "to_account": f"acc-{random.randint(51, 100)}",
        "amount": round(random.uniform(10, 2500), 2),
    })
    call("POST", f"{base}/api/loans", params={
        "account_id": f"acc-{random.randint(1, 50)}",
        "amount": random.choice([5000, 10000, 25000]),
        "term_months": random.choice([12, 36, 60]),
    })
    call("GET", f"{base}/api/transactions")


FLOWS = {"fintech": fintech_flow}


def load_targets():
    """[(app, version, base_url), ...] from signals.json + env overrides."""
    with open(os.path.join(HERE, "signals.json")) as f:
        contract = json.load(f)["apps"]
    targets = []
    for app, spec in contract.items():
        targets.append((app, "before",
                        os.getenv(spec["before_url_env"], spec["default_before_url"])))
        targets.append((app, "after",
                        os.getenv(spec["after_url_env"], spec["default_after_url"])))
    return targets


def wait_healthy(targets, timeout=120):
    with open(os.path.join(HERE, "signals.json")) as f:
        contract = json.load(f)["apps"]
    deadline = time.time() + timeout
    for app, version, base in targets:
        url = base + contract[app].get("health_path", "/health")
        while True:
            try:
                with urllib.request.urlopen(url, timeout=5) as resp:
                    if resp.status == 200:
                        print(f"[health] {app}-{version} up")
                        break
            except (urllib.error.URLError, OSError):
                pass
            if time.time() > deadline:
                print(f"[health] {app}-{version} NOT healthy after {timeout}s", file=sys.stderr)
                sys.exit(1)
            time.sleep(2)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--iterations", type=int, default=10)
    p.add_argument("--forever", action="store_true")
    args = p.parse_args()

    targets = load_targets()
    wait_healthy(targets)

    rnd = 0
    while args.forever or rnd < args.iterations:
        rnd += 1
        for app, version, base in targets:
            FLOWS[app](base)
        print(f"[traffic] round {rnd}: ok={STATS['ok']} fail={STATS['fail']}")
        time.sleep(1)

    print(json.dumps({"rounds": rnd, **STATS}))
    sys.exit(1 if STATS["ok"] == 0 else 0)


if __name__ == "__main__":
    main()
