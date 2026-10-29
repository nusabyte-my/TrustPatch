---
name: secure-handshake
description: "Governs inter-agent peer-to-peer dialogues, enforcing TAP-1 protocol handshakes, cryptographic scope verification, and preventing delegation telephone loops."
---

# Secure Handshake — Inter-Agent Peer Comms Guardian

## Handshake Flow
1. **Initiation (`SYN`)**: Sender declares mission objective and source node identity.
2. **Acknowledgment (`ACK`)**: Recipient confirms clean container sandbox environment readiness.
3. **Proposal (`PROPOSAL`)**: Submits structured evidence or diff proposal.
4. **Adversarial Verification (`CHALLENGE`)**: Peer node verifies proposal against deterministic assertions.
5. **Consensus (`CONSENSUS`)**: Signed cryptographic consensus before requesting human approval or opening PR.

## Delegation Loop Blocker
- Max recursion depth: 3 attempts.
- Cycles between same 2 agents without state progress are flagged as AST06 (Telephone Loop) and aborted immediately.
