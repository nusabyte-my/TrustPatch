# Agent Skills Security Knowledge Base & Guardrail Catalog

Curated defense guidelines derived from [LLMSecurity/awesome-agent-skills-security](https://github.com/LLMSecurity/awesome-agent-skills-security) and mapped to the **OWASP Agentic Skills Top 10 (AST10)** and **MITRE ATLAS™**.

---

## 1. Threat Landscape Overview

Modern AI agents rely on modular skills, rule files (`AGENTS.md`, `.cursorrules`), and external tool interfaces (MCP). While these enable autonomy, they introduce critical attack surfaces:

| Threat ID | Threat Class | Primary Vector in Agent Systems | TrustPatch Defense Implementation |
|---|---|---|---|
| **AST01** | Malicious / Poisoned Skills | Skill markdown files executing arbitrary code or prompting backdoors | Strict SHA-256 hash validation in `skills-lock.json`; isolated execution |
| **AST02** | Supply-Chain Compromise | Hallucinated or typosquatted external packages in setup instructions | Frozen dependency locks (`pnpm-lock.yaml`) and sandboxed worktrees |
| **AST03** | Indirect Prompt Injection | Web content or crawled pages containing instruction overrides | Control/data separation; raw untrusted payloads tagged as opaque data |
| **AST04** | Excessive Agency & Privilege Creep | Agents mutating unreviewed files or escalating permissions | Two-phase cryptographic approval: scope digest signed by human user |
| **AST05** | Memory & Trajectory Poisoning | Malicious feedback persisted across sessions to subvert decisions | Stateless, task-conditioned worktrees; memory pruned after each mission |
| **AST06** | Telephone / Delegation Loops | Cyclic task handoffs between collaborating subagents (WebMASLab) | Finite bounded attempt budgets (`maxPatchAttempts = 3`) and consensus timeouts |
| **AST07** | Tool Metadata Concealment | Hidden Unicode TAG-blocks in MCP tool descriptions concealing payloads | Static input sanitization stripping non-printable and invisible control chars |
| **AST08** | Silent Failures | Code patches passing unit tests while retaining security debt | Multimodal evaluation: HTTP header checks, AST linting, and browser assertions |

---

## 2. Hardened Skill Invariants

Every agent operating within TrustPatch must adhere to these five operational invariants:

1. **Pre-Execution Sandboxing (Zero Direct Host Access):**
   - No agent may directly modify the primary workspace repository.
   - All mutations occur exclusively in ephemeral Git worktrees (`.trustpatch-worktrees/<runId>`).

2. **Formal Handshake Required:**
   - Inter-agent delegation requires structured protocol frames (`SYN`, `ACK`, `DISPATCH`, `CHALLENGE`, `PROPOSAL`, `CONSENSUS`).
   - Implicit or unstructured delegation is rejected.

3. **Human-in-the-Loop Authority Boundary:**
   - The planner proposes; deterministic tools inspect; only the human commander authorizes code changes.
   - Revisions outside the approved `scopeDigest` are aborted immediately.

4. **Transparent Audit Trail:**
   - Every observation, tool call, and inter-agent message is stored with content-addressed SHA-256 hashes in SQLite.

---

## 3. Reference Frameworks
- **OWASP Agentic AI Threats & Mitigations:** [genai.owasp.org](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/)
- **OWASP Agentic Skills Top 10 (AST10):** [owasp.org/www-project-agentic-skills-top-10](https://owasp.org/www-project-agentic-skills-top-10/)
- **MITRE ATLAS™:** [atlas.mitre.org](https://atlas.mitre.org/)
- **IETF draft-niyikiza-oauth-attenuating-agent-tokens:** Attenuating Authorization Tokens for Agentic Delegation Chains
