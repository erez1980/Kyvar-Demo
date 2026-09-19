#!/usr/bin/env python3
"""Stage the estate the marketing screenshots are taken of.

The shots on this site used to be taken against a live KYVAR console, and
the estate in them was already fictional — Acme, web-prod-1, prod-postgres.
What was NOT fictional was KYVAR's own build: four of the fourteen shots
named the model it buys and the agent framework it embeds, which is the one
thing in a screenshot a competitor can actually use.

So the shots are staged now, against a throwaway local control plane whose
every self-reported fact is set here. Nothing about the product is altered:
the console renders exactly what a runtime tells it, and this script is the
runtime.

    KYVAR_BASE_URL       default http://127.0.0.1:18777
    KYVAR_ADMIN_EMAIL / KYVAR_ADMIN_PASSWORD

Run it against a FRESH database — it creates, it does not reconcile.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("KYVAR_BASE_URL", "http://127.0.0.1:18777").rstrip("/")
API = f"{BASE}/api/v2"
EMAIL = os.environ.get("KYVAR_ADMIN_EMAIL", "admin@acme.io")
PASSWORD = os.environ.get("KYVAR_ADMIN_PASSWORD", "local-Qk7pN2wR4tZ")

# The demo tenant's own model, named the way the rest of the estate is named.
# KYVAR does not call a model: a runtime does, with a provider the customer
# configures. Showing Acme's own provider is both the honest reading of that
# and the one that gives nothing away.
PROVIDER_NAME = "Acme Foundry"
PROVIDER_MODEL = "acme-1"

# What the runtime reports about itself. `executor` is a free string the
# console renders verbatim when it does not recognise it, and `agent_kind`
# is deliberately ABSENT — the console then names the runtime that answered
# and not the agent vendor inside it, which is the whole point of staging.
RUNTIME_NAME = "kyvar-runtime-prod-eu"
RUNTIME_EXECUTOR = "KYVAR agent"

_token = ""
_bridge = ""


def call(method, path, body=None, token=None, ok=(200, 201, 204)):
    req = urllib.request.Request(f"{API}{path}", method=method)
    req.add_header("Content-Type", "application/json")
    tok = token if token is not None else _token
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=30) as resp:
            raw = resp.read()
            if resp.status not in ok:
                raise RuntimeError(f"{method} {path} -> {resp.status}")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{method} {path} -> {exc.code} {exc.read()[:400]!r}") from exc


def say(msg):
    print(f"  {msg}", flush=True)


def keepalive(instance_id: str, bridge: str) -> int:
    """Beat for the duration of a shoot.

    Readiness is a silence timer, so a runtime that was staged and then left
    alone goes offline and the Overview leads with a blocker — whose wording
    names the agent, which is the one thing these shots must not do. The
    shoot therefore runs with this in the background.
    """
    global _bridge
    _bridge = bridge
    import time
    while True:
        try:
            heartbeat(instance_id)
        except Exception as exc:  # a shoot must not die because one beat did
            print(f"  heartbeat failed: {exc}", flush=True)
        time.sleep(5)


def main() -> int:
    global _token, _bridge

    if len(sys.argv) > 3 and sys.argv[1] == "keepalive":
        return keepalive(sys.argv[2], sys.argv[3])

    _token = call("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})["access_token"]
    say("signed in")

    # --- the model the demo tenant brought -------------------------------
    call("POST", "/llm-providers", {
        "name": PROVIDER_NAME,
        "kind": "azure_foundry",
        "endpoint": "https://foundry.acme.io/api/projects/ops",
        "deployment": PROVIDER_MODEL,
        "model_id": PROVIDER_MODEL,
        "api_key_ref": "ACME_FOUNDRY_API_KEY",
        "enabled": True,
        "make_default": True,
    })
    say(f"model provider: {PROVIDER_NAME} / {PROVIDER_MODEL}")

    # --- the runtime ------------------------------------------------------
    tok = call("POST", "/instances/enrollment-tokens", {"expires_in_minutes": 120})["token"]
    enrolled = call("POST", "/instances/enroll", {
        "token": tok, "name": RUNTIME_NAME, "environment": "production",
        "region": "eu-west-1", "version": "2026.9.19", "capabilities": [],
    })
    instance_id, _bridge = enrolled["instance_id"], enrolled["bridge_token"]
    say(f"runtime enrolled: {RUNTIME_NAME}")

    heartbeat(instance_id)
    say(f"heartbeat: executor={RUNTIME_EXECUTOR!r}, no agent vendor reported")

    # --- connectors -------------------------------------------------------
    catalog = {c["key"]: c["id"] for c in call("GET", "/connectors/catalog")}
    bindings = {}
    for key, name, cfg in (
        ("aws", "AWS — Production", {"region": "eu-west-1", "account_id": "*"}),
        ("azure", "Azure — Production", {}),
        ("github", "GitHub — platform", {"organization": "acme"}),
    ):
        if key not in catalog:
            say(f"connector skipped (no catalog row): {key}")
            continue
        b = call("POST", "/connectors/bindings", {
            "connector_key": key, "name": name, "instance_id": instance_id,
            "environment": "production", "scope": {}, "config": cfg,
            "credentials": {}, "secret_ref": f"secret://{key}/acme",
        })
        bindings[key] = b["id"]
        say(f"connector: {name}")

    stage_estate(instance_id, bindings)

    print(json.dumps({"instance_id": instance_id, "bridge_token": _bridge,
                      "token": _token, "bindings": bindings}))
    return 0


def heartbeat(instance_id: str, active_run_ids=()):
    call("POST", f"/instances/{instance_id}/heartbeat", {
        "status": "online",
        "version": "2026.9.19",
        "metrics": {"active_runs": len(active_run_ids), "active_run_ids": list(active_run_ids)},
        "runtime": {
            "executor": RUNTIME_EXECUTOR,
            "model": PROVIDER_MODEL,
            "max_concurrent_runs": 2,
            "cloud_clis": ["aws", "az", "oci", "gh", "kubectl"],
            "terraform": "1.9.8",
        },
    }, token=_bridge)



# ---------------------------------------------------------------------------
# The estate the shots are of. Every string here is Acme's, not KYVAR's.
# ---------------------------------------------------------------------------

# The thread on the homepage. The answer carries the narration protocol the
# product already parses (KYVAR_TITLE / KYVAR_STEP / KYVAR_CHANGED), so the
# subject, the step checklist and the "what changed" card are produced by the
# product from the runtime's reply rather than drawn by hand.
ASK = "Patch the OpenSSH vulnerability on web-prod-1 now, one instance at a time"
ANSWER = """`web-prod-1` is patched and back behind `prod-web-alb` with **zero downtime**; the CNAPP finding clears on its next scan.

`web-prod-2` runs the same build — want me to do it next?

KYVAR_TITLE: OpenSSH patch on web-prod-1
KYVAR_STEP: 1/4 Drained web-prod-1 from prod-web-alb and waited for connections to finish.
KYVAR_STEP: 2/4 Upgraded openssh-server to 9.8p2 with apt, held the package version.
KYVAR_STEP: 3/4 Verified the daemon version and that sshd restarted cleanly.
KYVAR_STEP: 4/4 Re-registered the instance; target group reports 2/2 healthy.
KYVAR_CHANGED: Upgraded openssh-server on web-prod-1 (9.6p1 -> 9.8p2) and cycled it through the load balancer; nothing else was touched."""

COMMANDS = [
    "aws elbv2 deregister-targets --target-group-arn <prod-web-alb>",
    "ssh web-prod-1 'sudo apt-get update'",
    "ssh web-prod-1 'sudo apt-get install --only-upgrade openssh-server'",
    "ssh web-prod-1 'sudo apt-mark hold openssh-server'",
    "ssh web-prod-1 'sshd -V && systemctl is-active sshd'",
    "aws elbv2 register-targets --target-group-arn <prod-web-alb>",
]

# The follow-up that the default policy pack parks: "create" is a
# provisioning word, so this one stops at the approval gate on its own.
FOLLOW_UP = "Yes — and also create a new t3.micro staging instance for the new website"


def stage_estate(instance_id: str, bindings: dict) -> None:
    """Monitors that are down, the incidents they opened, one answered turn
    and one turn parked on the gate."""

    # Two probe monitors reported down. A probe transition opens the incident
    # itself, so the Overview's "2 incidents open" and "2 monitors unhealthy"
    # come from the same two facts rather than being staged twice.
    for name, target, detail in (
        ("Checkout API — eu-west-1", "https://api.acme.io/healthz",
         "connection refused after 3 retries (api.acme.io:443)"),
        ("Database disk headroom — prod-postgres", "https://db.acme.io:5432",
         "data volume at 87% (threshold 85%); growth 1.8 GB/day — 6 days of headroom."),
    ):
        m = call("POST", "/monitors", {
            "name": name, "description": detail, "kind": "probe",
            "probe_type": "http", "probe_target": target,
            "probe_interval_seconds": 30, "probe_timeout_seconds": 10,
            "probe_instance_id": instance_id, "enabled": True,
        })
        call("POST", f"/bridge/instances/{instance_id}/probes/{m['id']}/result",
             {"ok": False, "latency_ms": 0, "detail": detail}, token=_bridge)
        say(f"monitor down: {name}")

    # The answered turn.
    session = call("POST", "/chat/sessions", {"title": ""})
    call("POST", f"/chat/sessions/{session['id']}/messages", {
        "content": ASK,
        "context": {"connector_binding_id": bindings.get("aws")},
    })
    run = _claim_next(instance_id)
    if run:
        _answer(run, instance_id)
        say("governed run answered")

    # The follow-up, parked by policy.
    call("POST", f"/chat/sessions/{session['id']}/messages", {
        "content": FOLLOW_UP,
        "context": {"connector_binding_id": bindings.get("aws")},
    })
    say("follow-up dispatched (the gate decides)")
    heartbeat(instance_id)

    # Leave no failed run behind. Nothing here executes for real, so a
    # monitor firing leaves a run nobody answered — and the Overview's
    # attention row would lead a marketing shot with "N runs failed",
    # which is a fact about the staging rig and not about the product.
    for run in call("GET", "/runs?limit=200") or []:
        if run.get("status") in ("failed", "denied", "cancelled"):
            try:
                call("DELETE", f"/runs/{run['id']}")
            except RuntimeError:
                pass
    say("failed staging runs purged")


def _claim_next(instance_id: str):
    envelope = call("GET", f"/bridge/instances/{instance_id}/dispatch", token=_bridge)
    dispatch = envelope.get("dispatch")
    if not dispatch:
        return None
    run_id = dispatch["run_id"]
    call("POST", f"/bridge/dispatch/{run_id}/claim",
         {"instance_id": instance_id}, token=_bridge)
    return run_id


def _event(run_id, event_type, payload):
    call("POST", f"/bridge/runs/{run_id}/events",
         {"event_type": event_type, "payload": payload}, token=_bridge)


def _answer(run_id: str, instance_id: str) -> None:
    _event(run_id, "run.started", {"channel": "kyvar", "message": "The runtime started working"})
    _event(run_id, "run.activity", {"channel": "kyvar",
                                    "message": "Connector credentials delivered to this run"})
    for cmd in COMMANDS:
        # `channel: tool` is what the console counts as a command run, and it
        # deliberately carries the command and never its output.
        _event(run_id, "run.activity", {"channel": "tool", "message": cmd})
    _event(run_id, "run.output.delta", {"text": ANSWER})
    call("POST", f"/bridge/runs/{run_id}/complete", {
        "status": "completed",
        "summary": ANSWER[:500],
        # The runtime's own token report. Acme's provider, Acme's model.
        "usage": {"provider": PROVIDER_NAME.lower().replace(" ", "-"),
                  "model": PROVIDER_MODEL, "input": 18420, "output": 2140, "total": 20560},
    }, token=_bridge)


if __name__ == "__main__":
    sys.exit(main())
