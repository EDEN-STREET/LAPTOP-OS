# EDEN Goal Mesh + Model Gateway

## Goal Core

EDEN places the current **Goal** in the center. Around it are specialized arms for research, build, QA, security, knowledge and operations. Each arm runs its own bounded RALF-style goal loop and reports structured results back to the center.

The center exposes an A2A-compatible boundary for independent agents. Inside the single-process EDEN runtime, messages use the smaller **Ponytails** envelope and can be mapped to A2A tasks when they cross an agent boundary.

A2A is used for agent-to-agent interoperability; tools remain separate and policy-gated.

## Model cascade

```text
Goal Core
   |
   v
Planner (large local / selected provider)
   |
   v
Compiler
   |
   v
Worker
   |
   +----> Compiler verification
   +----> Planner verification
   +----> Node policy verification
              |
             PASS
              |
              v
        allowlisted skill
```

The smallest worker never receives the entire case history by default.

## Provider gateway

Supported connection adapters:

- OpenRouter
- Hugging Face Inference Providers
- NVIDIA NIM hosted endpoint
- NVIDIA NIM on loopback

Remote provider use is **off until the user explicitly connects it for the current session**.

Credentials:
- are accepted only by the local Node process,
- are kept in memory by default,
- are never returned by status APIs,
- are never written to normal EDEN logs,
- are cleared when the runtime exits.

Environment variables are also supported for controlled deployments:
`OPENROUTER_API_KEY`, `HF_TOKEN`, `NVIDIA_API_KEY`.

## Anonymity-first rule

Using a remote model reveals at least a network connection to that service and sends the selected request content to its infrastructure. For source-sensitive work the default remains local embedded models.

Provider connectivity is therefore a capability, not a default route.

## Framework mapping

- NEC inspiration: orchestrator plans, delegates and consumes feasibility feedback.
- BMAD inspiration: role-specific artifacts/workflows.
- RALF: EDEN repeat-until-verified goal loop.
- Superpowers: composable skill discipline and verification-oriented development workflow.
- A2A: interoperable agent boundary.
- Ponytails: EDEN-internal minimized message envelope.
