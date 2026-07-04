#!/usr/bin/env python3
"""Provision the repo's Grafana dashboards into any Grafana instance.

Idempotent (overwrite=true, stable uids). Stdlib only.

    python3 harness/provision_dashboards.py                          # localhost:3000
    GRAFANA_URL=https://otel-ba-lgtm.fly.dev python3 harness/provision_dashboards.py
"""
import glob
import json
import os
import sys
import urllib.request

GRAFANA = os.getenv("GRAFANA_URL", "http://localhost:3000").rstrip("/")
HERE = os.path.dirname(os.path.abspath(__file__))
DASH_DIR = os.path.join(HERE, "..", "observability", "lgtm", "dashboards")


def main():
    files = sorted(glob.glob(os.path.join(DASH_DIR, "*.json")))
    if not files:
        print(f"no dashboards found in {DASH_DIR}", file=sys.stderr)
        sys.exit(1)
    failures = 0
    for path in files:
        with open(path) as f:
            dashboard = json.load(f)
        dashboard.pop("id", None)
        body = json.dumps(
            {"dashboard": dashboard, "overwrite": True, "message": "provisioned by harness"}
        ).encode()
        req = urllib.request.Request(
            f"{GRAFANA}/api/dashboards/db", data=body, method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                out = json.load(resp)
                print(f"[ok] {os.path.basename(path)} -> {GRAFANA}{out.get('url', '')}")
        except Exception as e:
            failures += 1
            print(f"[fail] {os.path.basename(path)}: {e}", file=sys.stderr)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
