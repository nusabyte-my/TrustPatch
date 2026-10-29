# Meta Model API & Autonomous Inference Guide

This guide details how to configure and run **TrustPatch** with Meta's frontier models using the **$150 Meta Model API credits** or the inference partners (**Baseten**, **Fireworks**, **Modal**) provided for the **Meta Global AI Developer Hackathon**.

---

## 1. Claiming Your Hackathon Credits

### Step A: Meta Model API ($150 Direct Credits)
1. **Apply for credits**: Complete the [Meta Model API Credit Form](https://docs.google.com/forms/d/e/1FAIpQLScam78z7tHsNYibiFyJQVFzEgr0coyBTiY568SxxNbsPa3jiw/viewform) before **Nov 4 at 9:00 PM ET**.
2. **Setup Account & Billing**:
   - Log into [dev.meta.ai](https://dev.meta.ai/).
   - Add a credit card to your account (a temporary pre-authorization charge is released in a few business days).
   - Verify that your $150 credit batch is reflected on the **Billing** page.
   - **Spend Limit Guardrail**: Set a spend limit on the Billing page so you never exceed the $150 allocation.
3. **Generate API Key**:
   - Go to your Developer Dashboard on [dev.meta.ai](https://dev.meta.ai/).
   - Create a new API Key with `Model API` access.
   - Copy your secret key (`meta_...`).

### Step B: Inference Partner Credits ($100 each)
- **Baseten ($100 + 2M TPM rate limit)**: [Request Baseten Form](https://docs.google.com/forms/d/e/1FAIpQLSfM7gcK8yMZEmAGq6DbTyiuv2c71IH7CKCy0fXGIfUED1qxVQ/viewform) (Use model: `meta-models/muse-spark-open-1026`).
- **Fireworks ($100 credits)**: [Request Fireworks Form](https://docs.google.com/forms/d/e/1FAIpQLSdPQTTES8_nhavzZkOrebVNYbM1FumWLdpeZx8ZSNe4QLXKPA/viewform).
- **Modal ($100 credits)**: [Request Modal Form](https://docs.google.com/forms/d/e/1FAIpQLSe_GDPtLZsdA57xPhFcOCi_yLjPf8HRxMIQJ5V7ystoKSqWCQ/viewform).

---

## 2. Supported Meta Models & Roles in TrustPatch

TrustPatch is pre-wired to orchestrate specific Meta models across its multi-agent pipeline:

| Model ID | Provider | Ideal Role in TrustPatch | Protocol |
|---|---|---|---|
| **`muse-spark-1.3`** *(Recommended)* | Meta Model API | **Repair Node**: Fast, deterministic AST tool-calling and unified diff generation | `/v1/responses` |
| **`muse-wonder`** | Meta Model API | **Mend Coordinator**: High-reasoning multimodal analysis & consensus gating | `/v1/responses` |
| **`muse-glimmer`** | Meta Open-Weights | Lightweight edge evaluation & initial HTTP header classification | `/v1/chat/completions` |
| **`meta-models/muse-spark-open-1026`** | Baseten / Fireworks | High-throughput open model running via OpenAI-compatible endpoints | `chat_completions` |
| **`llama-3.3-70b-instruct`** | Meta / Partners | Deep technical SEO reasoning and security threat modeling | `chat_completions` |

---

## 3. Configuring TrustPatch on the VPS

To switch TrustPatch from the deterministic fixture planner to live autonomous Meta AI inference:

### Option 1: Official Meta Model API (`/v1/responses`)

SSH into the production server or edit your local `.env`:

```bash
# On VPS: /srv/trustpatch/app/.env
AGENT_MODE=meta
MODEL_API_URL=https://api.meta.ai/v1
MODEL_API_KEY=your_meta_model_api_key_here
MODEL_ID=muse-spark-1.3
MODEL_API_PROTOCOL=responses
```

Restart the background services:
```bash
systemctl restart trustpatch-web trustpatch-worker
```

### Option 2: Baseten Inference Partner (OpenAI Compatible)

```bash
AGENT_MODE=llm
MODEL_API_URL=https://bridge.baseten.co/v1
MODEL_API_KEY=your_baseten_api_key_here
MODEL_ID=meta-models/muse-spark-open-1026
MODEL_API_PROTOCOL=chat_completions
```

### Option 3: Fireworks Inference Partner

```bash
AGENT_MODE=llm
MODEL_API_URL=https://api.fireworks.ai/inference/v1
MODEL_API_KEY=your_fireworks_api_key_here
MODEL_ID=accounts/fireworks/models/llama-v3p3-70b-instruct
MODEL_API_PROTOCOL=chat_completions
```

---

## 4. How the Autonomous Loop Operates with Meta AI

```
[Mend Coordinator]
       │
       ▼ (Passes verified defect list + AST code snippets)
[Meta Model API (muse-spark-1.3)]
  │
  ├─ Calls strict function schema: propose_repairs(summary, edits)
  ├─ Enforces OWASP AST10: Prompt injection protection (code is DATA, not instructions)
  └─ Returns exact line-by-line replacement candidates
       │
       ▼ (Unified Diff Payload)
[Ephemeral Git Worktree Sandbox (.trustpatch-worktrees/<runId>)]
       │
       ▼ (Headless Chromium Assertion)
[Verifier Node (TAP-1 Assertion)]
  ├─ Check 1: X-Content-Type-Options: nosniff
  ├─ Check 2: Indexing directive: index, follow
  └─ Check 3: Canonical target match
       │
       ├── If any check fails ──► Emits [CHALLENGE -> @repair] ──► Meta Muse recalculates
       └── If all pass ─────────► Signs Cryptographic Proof Receipt ──► Human Authorization Gate
```

---

## 5. Live Production URL & Verification

TrustPatch is live in production with full SSL at:
**[https://trustpatch.nusabyte.cloud/](https://trustpatch.nusabyte.cloud/)**
