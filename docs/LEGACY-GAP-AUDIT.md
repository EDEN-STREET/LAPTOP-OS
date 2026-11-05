# EDEN Legacy / Project Gap Audit

## Purpose

This document records concepts found in earlier EDEN/DKZ project material and connected repositories and compares them with the current EDEN LAPTOP-OS development branch.

It is deliberately conservative: historical claims are not promoted to current runtime facts.

## Confirmed gaps in the current PR

### 1. Governance artifacts

Earlier work defined or used:
- UBIQUITOUS_LANGUAGE.md
- architecture decision records (ADRs)
- PROGRESS.md / checkpointing
- DESIGN.md
- llms/agent bootstrap synchronization
- task decomposition with specific, context-rich, measurable and isolated sub-tasks

These concepts are useful and were missing from the current NEC/BMAD schema.

### 2. Evidence model

Earlier infrastructure work distinguished:
- E0 goal
- E1 claim
- E2 artifact trace
- E3 runtime evidence
- E4 independently reproduced evidence

EDEN already distinguishes simulation and real evidence in other areas; this five-level evidence model should be reused for agents, services, models and machines.

### 3. Canonical registries

Earlier work required a machine inventory, service/port inventory, model registry and a Git source-of-truth decision before further deployment.

Current PR did not yet contain canonical:
- machine-inventory.json
- service-registry.yaml
- ports.csv
- model-registry.yaml
- GIT_SOURCE_OF_TRUTH.md

These are now mandatory governance outputs, not assumed runtime files.

### 4. Specialist cross-cutting agents

The early EDEN platform plan explicitly separated Discovery, Documentation, Security Analyst, Workflow Planner, Execution, Verification and Audit roles.

BMAD should remain the product/development role ring. These operational roles are cross-cutting services around NEC rather than being forced into BMAD identities.

### 5. Root-cause and graceful-degradation loop

The legacy NanoBot defined a useful RCA loop:
root cause -> pattern -> hypothesis -> minimal fix proposal -> verification.

It also required graceful degradation when a model or service is unavailable.

This belongs in the NEC feedback path and incident arm.

### 6. TestStraße and commit gates

Older code had a dedicated quality pipeline covering unit tests, QA, stress tests and browser E2E before commit.

Current Superpowers workflows cover much of the same philosophy, but EDEN still needs a named aggregate quality contract with:
- unit tests
- negative tests
- browser/E2E
- stress/load checks where relevant
- evidence export
- pre-merge verification

### 7. Event integrity

Earlier architecture used UUID-based agent events and proposed append-only integrity with hash/signature.

This is compatible with ANONYMITY_FIRST only if:
- payloads are minimized,
- raw prompts and source relationships are not logged by default,
- retention is limited per compartment.

### 8. Credential broker

Legacy material proposed short-lived/single-use credentials so agents do not receive durable secrets.

The exact old implementation should not be copied blindly. The principle is retained:
session/one-time capability tokens, TTL, audit metadata without secret values, and separate secret storage.

Historical repositories were also found to contain hard-coded credentials. Those values must be treated as compromised and must not be copied into EDEN.

### 9. Knowledge-plane separation

Earlier architecture separated:
- code graph
- document/knowledge graph
- raw terminal history
- summaries/walkthroughs

This is stronger than one giant RAG database. In source-sensitive compartments, cross-plane and cross-case search stays off by default.

### 10. Copy-only / provenance

Earlier work explicitly required personal originals never to be moved/deleted by automation.

An imported copy should carry provenance reference, SHA-256, timestamp and classification.

A backup is not VERIFIED merely because it exists; restore must be tested.

### 11. Gateway history

NEXUZ/ONTHERUN previously acted as a single gateway concept. EDEN should preserve the architectural rule — one canonical broker/API boundary — without resurrecting conflicting legacy ports or multiple competing gateways.

The current Node Model Gateway is only the model-provider broker. A broader EDEN Control Gateway is still missing.

### 12. Infrastructure separation

Earlier infrastructure reviews recommended distinct planes:
- inference plane
- control/dev plane
- data/operations plane
- isolated runner

This remains useful. It also prevents the old anti-pattern of mixing Git forge, model inference, document storage, browser automation and workflow root privileges on one small VPS.

## Branch drift discovered during this audit

The current PR contains OneFile configuration, agent mesh, anonymity policy and Model Gateway.

It does **not** currently contain:
- long-running supervisor/event runtime
- Testcafe runtime stack
- Media Hub / Immich integration
- Portable Toolbox integration

Portable Toolbox work exists on a separate branch.
The Media Hub branch currently contains no implementation changes.

This is an integration gap and must be resolved deliberately rather than assumed complete.

## Legacy concepts to keep

- workflow-first
- evidence over claims
- NEC feasibility feedback
- BMAD role/artifact discipline
- Ralph local loops
- Superpowers process skills
- TestStraße aggregate QA
- machine/service/model registries
- one canonical gateway boundary
- isolated execution runners
- copy-only provenance
- restore-tested backups
- human-readable portal
- graceful degradation
- root-cause before fix
- context compression/minimum-context workers

## Legacy concepts to retire or redesign

- unrestricted n8n root/cluster-admin control
- Docker socket exposed to agents/workflows
- raw terminal execution from NanoBot
- browser automation as root
- several independent Git sources of truth
- simulated metrics presented as live
- persistent global chat/contact logs
- hard-coded credentials
- direct remote-provider use for source-sensitive data by default

## Target relation

```text
                    HUMAN GOAL
                        |
                 NEC GOAL CORE
                        |
              A2A / Ponytails Bus
                        |
        +---------------+---------------+
        |               |               |
     BMAD Ring      Ops Agents      Knowledge Plane
        |               |               |
    Ralph Loops       RCA Loop       scoped retrieval
        |               |               |
    Superpowers      Registries      Provenance
        +---------------+---------------+
                        |
                 Verification Ledger
                        |
                 Node Policy Broker
                        |
                  Isolated Runner
```

The central rule is unchanged: an LLM can recommend, decompose and verify, but deterministic policy and evidence decide whether a real action is allowed.
