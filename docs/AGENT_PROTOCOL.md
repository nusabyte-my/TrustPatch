# TrustPatch Agent-to-Agent Handshake Protocol (TAP-1)

**Version:** 1.0.0  
**Status:** Implemented  
**Subnet:** `10.42.0.0/24` (Virtual Mesh)  
**Security Standard:** Zero-Escalation, Cryptographic Scope Authorization  

---

## 1. Abstract

The TrustPatch Agent-to-Agent Protocol (TAP-1) specifies peer-to-peer communication, capability discovery, task delegation, and adversarial challenge mechanisms for autonomous multi-agent systems repairing web infrastructure. 

Unlike single-prompt monolithic agents or unconstrained conversational swarms, TAP-1 enforces:
1. **Explicit Node Topography** (Each agent runs in an isolated compute tier).
2. **State-Machine Handshakes** (`SYN` -> `ACK` -> `PROPOSAL` -> `CHALLENGE` -> `CONSENSUS`).
3. **Monotonic Permission Attenuation** (Subagents cannot grant permissions greater than their received scope).

---

## 2. Node Architecture & Topology

Each participating agent is assigned a virtual node with dedicated compute parameters:

| Node ID | Role | Virtual Hostname | Compute Model | Primary Responsibility |
|---|---|---|---|---|
| `node-mend-01` | `mend` | `mend-master.internal` | `micro-vm` (512 MB) | Coordinator, mission scheduling, user consensus gate |
| `node-inspector-02` | `inspector` | `sec-probe.internal` | `container-sandbox` (256 MB) | Headless web crawler, HTTP response header scanner |
| `node-recon-03` | `recon` | `ast-engine.internal` | `ast-engine` (384 MB) | Source code AST mapper, reactive browser tracer |
| `node-repair-04` | `repair` | `sandbox-worker.internal` | `container-sandbox` (1024 MB) | Isolated Git worktree builder, patch synthesizer |
| `node-verifier-05` | `verifier` | `qa-runner.internal` | `qa-isolated` (768 MB) | Clean preview runner, browser verification assertions |

---

## 3. Protocol Frame Specification

Every packet transmitted across the agent message bus conforms to the typed schema:

```json
{
  "sender": "inspector",
  "recipient": "@mend",
  "protocol": "PROPOSAL",
  "node": {
    "id": "node-inspector-02",
    "hostname": "sec-probe.internal",
    "ip": "10.42.0.2",
    "vmType": "container-sandbox",
    "status": "ready",
    "memoryMb": 256
  },
  "message": "Surface audit finished. 3 confirmed defects identified.",
  "timestamp": "2026-10-30T00:35:00.000Z"
}
```

### Protocol Types:
- **`SYN` (Synchronize):** Initiates capability probe or requests sub-task allocation.
- **`ACK` (Acknowledge):** Confirms task receipt and readiness in isolated environment.
- **`DISPATCH`:** Transmits approved work parameters and mounted paths.
- **`PROPOSAL`:** Submits candidate findings, source AST mappings, or staged diffs for review.
- **`CHALLENGE`:** Rejects a proposal due to failed browser assertions, out-of-scope files, or regressions.
- **`CONSENSUS`:** All nodes affirm that criteria are met and cryptographic proof receipt is signed.
- **`INFO`:** Telemetry and lifecycle events.

---

## 4. Finite State Machine (FSM)

```
[INIT]
  │
  ▼  SYN / ACK
[INVESTIGATING] ◄─── (Recon / Inspector Parallel Scan)
  │
  ▼  PROPOSAL
[AWAITING_APPROVAL] ◄─── (Human Commander Scope Gate)
  │
  ▼  DISPATCH (Scope Digest Signed)
[REPAIRING] ◄─── (Isolated Worktree Staging)
  │
  ├─── PROPOSAL ───► [VERIFYING]
  │                     │
  │                     ├── CHALLENGE (Assertion Failed, budget > 0)
  │                     ▼
  ◄─────────────────────┘
  │
  ▼  CONSENSUS (All Assertions Pass)
[VALIDATED]
```

---

## 5. Security & Threat Invariants (OWASP AST10 Aligned)

1. **No Out-of-Band Execution:** Code execution is strictly prohibited during `INVESTIGATING` and `AWAITING_APPROVAL` states.
2. **Deterministic Pre-conditions:** A repair attempt cannot be initiated without an active `approvalDigest` matching authorized file paths.
3. **Anti-Loop Guardrail:** Max challenge loops are bounded by `maxPatchAttempts` (default: 3). If `attempts >= maxPatchAttempts`, status locks to `BLOCKED`.
