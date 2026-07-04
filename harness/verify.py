#!/usr/bin/env python3
"""Signal verifier for otel-before-after.

Scores every app pair in signals.json against the LGTM backend:

  traces  -> Tempo search API      (/api/search?tags=service.name=<svc>)
  logs    -> Loki query API        (/loki/api/v1/query_range)
  metrics -> Prometheus HTTP API   (/api/v1/label/__name__/values)

The after/ version must produce all three signals. The before/ version must
be healthy but produce NONE (its service name must not appear anywhere).

Run traffic.py first so there is something to find. Stdlib only.

    python3 verify.py                 # human scorecard + exit code
    python3 verify.py --json out.json # also write machine-readable result
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

TEMPO = os.getenv("TEMPO_URL", "http://localhost:3200")
LOKI = os.getenv("LOKI_URL", "http://localhost:3100")
PROM = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

HERE = os.path.dirname(os.path.abspath(__file__))


def get_json(url, quiet=False):
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.load(resp)
    except Exception as e:
        if not quiet:
            print(f"  [warn] GET {url}: {e}", file=sys.stderr)
        return None


def tempo_trace_count(service):
    q = urllib.parse.urlencode({"tags": f"service.name={service}", "limit": 20})
    data = get_json(f"{TEMPO}/api/search?{q}")
    if not data:
        return 0
    return len(data.get("traces") or [])


def loki_log_count(service):
    query = f'{{service_name="{service}"}}'
    end = time.time_ns()
    start = end - 3600 * 10**9  # last hour
    q = urllib.parse.urlencode(
        {"query": query, "start": start, "end": end, "limit": 100}
    )
    data = get_json(f"{LOKI}/loki/api/v1/query_range?{q}")
    if not data or data.get("status") != "success":
        return 0
    return sum(len(s.get("values", [])) for s in data["data"].get("result", []))


def prom_metric_names(service=None):
    q = ""
    if service:
        q = "?" + urllib.parse.urlencode({"match[]": f'{{service_name="{service}"}}'})
    data = get_json(f"{PROM}/api/v1/label/__name__/values{q}")
    if not data or data.get("status") != "success":
        return []
    return data.get("data", [])


def normalize(name):
    return name.replace(".", "_").replace("-", "_").lower()


def check_expected_metrics(expected, available):
    """expected: instrument names from signals.json (dot form). Prometheus
    names are underscore form; counters may get _total appended."""
    normalized_available = {normalize(m) for m in available}
    missing = []
    for want in expected:
        base = normalize(want)
        candidates = {base, base + "_total", base + "_ratio"}
        if not (candidates & normalized_available) and not any(
            base in m for m in normalized_available
        ):
            missing.append(want)
    if missing:
        return False, f"missing: {', '.join(missing)}"
    return True, f"all {len(expected)} present"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--json", help="write machine-readable results to this path")
    args = p.parse_args()

    with open(os.path.join(HERE, "signals.json")) as f:
        contract = json.load(f)["apps"]

    results = {}
    total, passed = 0, 0
    print(f"\n{'app':<20} {'check':<22} {'status':<6} detail")
    print("-" * 78)

    def record(app, check, ok, detail):
        nonlocal total, passed
        results.setdefault(app, {})[check] = {"pass": ok, "detail": detail}
        total += 1
        passed += ok
        print(f"{app:<20} {check:<22} {'PASS' if ok else 'FAIL':<6} {detail}")

    for app, spec in contract.items():
        svc, before_svc = spec["service_name"], spec["before_service_name"]

        # -- after/ must emit everything --------------------------------
        traces = tempo_trace_count(svc)
        record(app, "after: traces", traces > 0, f"{traces} traces in Tempo")

        logs = loki_log_count(svc)
        record(app, "after: logs", logs > 0, f"{logs} log lines in Loki")

        ok, detail = check_expected_metrics(
            spec.get("metrics", []), prom_metric_names(svc)
        )
        record(app, "after: metrics", ok, detail)

        # -- before/ must be silent --------------------------------------
        b_traces = tempo_trace_count(before_svc)
        b_logs = loki_log_count(before_svc)
        b_metrics = prom_metric_names(before_svc)
        silent = (b_traces + b_logs + len(b_metrics)) == 0
        record(
            app, "before: no signals", silent,
            f"traces={b_traces} logs={b_logs} metric_names={len(b_metrics)}",
        )

    print("-" * 78)
    print(f"score: {passed}/{total}\n")

    if args.json:
        with open(args.json, "w") as f:
            json.dump({"score": f"{passed}/{total}", "results": results}, f, indent=2)
        print(f"wrote {args.json}")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
