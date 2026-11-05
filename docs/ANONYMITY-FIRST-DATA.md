# EDEN Anonymity-First Data Architecture

EDEN Source Protection is **not a data-fortress product**.

The primary control is **data minimization**: avoid creating, linking, transmitting or retaining identifying data unless a documented workflow requires it.

## Default

`ANONYMITY_FIRST` is the default profile.

```text
LESS DATA
   ↓
IDENTITY SEPARATION
   ↓
COMPARTMENTS
   ↓
MINIMUM CONTEXT
   ↓
EPHEMERAL LOCAL PROCESSING
   ↓
EXPLICITLY APPROVED PERSISTENCE
```

Encryption protects retained data. It does not justify retaining unnecessary data.

## Local state

DuckDB is primarily a local event/cache engine.

Default sensitive operation:
- temporary or encrypted local DB
- no raw-chat archive
- no complete contact graph
- no analytics upload
- no automatic remote synchronization
- minimum retention

## Embeddings / RAG

Embeddings are generated locally by default.

The retrieval layer may keep:
- random local case ID
- source/content hash
- chunk identifier
- minimum text needed for retrieval
- optional Iceberg snapshot reference

It should not automatically keep:
- real source identity
- personal account identifiers
- unrelated conversation history
- global cross-case linkage

Search across source-sensitive compartments is disabled by default.

## PostgreSQL / Supabase / pgvector

These are **optional infrastructure**, not the center of the anonymity architecture.

Permitted default use:
- public documentation
- software metadata
- synthetic test data
- explicitly approved pseudonymous knowledge

Sensitive source material remains local unless a case workflow explicitly authorizes a minimized export.

## Iceberg

Iceberg is valuable for versioning and provenance, but only for data that is intentionally retained.

It is not a justification to preserve every event forever.

## Gitea

Gitea stores code, schemas, tests and sanitized configuration by default.

Source identities, source documents, private case transcripts and sensitive operational metadata do not enter normal Git repositories.

## LLM cascade

The model hierarchy receives progressively less context:

```text
Planner        -> minimum context needed for goal
Compiler       -> reduced structured task
Small worker   -> narrow allowlisted contract
Policy broker  -> deterministic validation
```

The small worker never needs the complete identity/history of the user or source to perform a narrow task.

## Logging

Monitor **systems, not sources**.

Good:
- service health
- version
- failed test
- integrity state
- policy denial

Bad by default:
- full prompts
- full conversations
- source relationship graphs
- browsing history
- persistent unique behavior profiles

## Persistence decision

Every persistent field must answer:

1. Why is it required?
2. Which compartment owns it?
3. Can it be pseudonymous?
4. Can it expire?
5. Does another system need a copy?
6. What happens if the storage is seized or compromised?

If the answer to (1) is unclear, do not store it.
