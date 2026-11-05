# EDEN Goal Mesh + Model Gateway

## NEC Goal Core

The center of EDEN is the **NEC Goal Core**. NEC's real-world-agent pattern is used as the orchestration law: the central orchestrator holds the global goal, decomposes it into subgoals, assigns those subgoals to specialist agents, receives feasibility feedback, and replans when a proposed path is not feasible.

Around that center sits the **BMAD role ring**: Analyst, Product Manager, Product Owner, Architect, Developer and UX Designer. BMAD provides role ownership, artifacts and lifecycle discipline; it is not the central scheduler.

Each BMAD-owned arm runs its own bounded **Ralph Loop** for its local goal. The arm returns structured feasibility evidence to NEC rather than declaring the whole project complete by itself.

The center exposes an A2A-compatible communication plane for independent agents. Inside the single-process EDEN runtime, messages use the smaller **Ponytails** envelope and can be mapped to A2A tasks/messages at agent boundaries.

A2A is communication, NEC is orchestration, BMAD is role/workflow structure, Ralph is iteration, Superpowers are reusable skills, and the Node Policy Broker remains the execution authority.

```text
                         GLOBAL GOAL
                              |
                        NEC GOAL CORE
                  /-----------+-----------\
                 /       A2A / Ponytails   \
                v                           v
        BMAD Analyst Arm            BMAD Architect Arm
          Ralph Loop                    Ralph Loop
        + Superpowers                 + Superpowers
                \                           /
                 \---- feasibility --------/
                              |
                         NEC REPLAN
                              |
               compiler -> worker -> verify
                              |
                    NODE POLICY BROKER
                              |
                    ALLOWLISTED EXECUTION
```

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

- OpenAI API
- OpenRouter
- Hugging Face Inference Providers
- NVIDIA NIM hosted endpoint
- NVIDIA NIM on loopback
- OpenLLM on loopback (default `http://127.0.0.1:3000/v1`)

Remote provider use is **off until the user explicitly connects it for the current session**.

Credentials:
- are accepted only by the local Node process,
- are kept in memory by default,
- are never returned by status APIs,
- are never written to normal EDEN logs,
- are cleared when the runtime exits.

Environment variables are also supported for controlled deployments:
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `HF_TOKEN`, `NVIDIA_API_KEY`, optional `OPENLLM_API_KEY`.

## Anonymity-first rule

Using a remote model reveals at least a network connection to that service and sends the selected request content to its infrastructure. For source-sensitive work the default remains local embedded models.

Provider connectivity is therefore a capability, not a default route.

## Framework mapping

- NEC: central orchestrator that plans, delegates, validates feasibility feedback and replans.
- BMAD: role-specific agents, artifacts and lifecycle workflows around the NEC core.
- Ralph Loop: bounded repeat-until-verified loop inside each arm.
- Superpowers: composable skill discipline and verification-oriented development workflow.
- A2A: interoperable agent boundary.
- Ponytails: EDEN-internal minimized message envelope.
