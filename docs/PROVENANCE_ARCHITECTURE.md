# DJ Jesse Jay Provenance Architecture

```mermaid
flowchart TD
    P0[P0 Independent archive receipts] --> C[Canonical profile]
    P6[P6 Versioned repository evidence] --> C
    P5[P5 First-party external publication] --> C
    P3[P3 Credible third-party evidence] --> C
    P8[P8 Unverified claims] -. quarantine .-> Q[Needs verification]

    C --> J[artist-profile.json]
    C --> V[website/provenance.json]
    C --> S[Schema.org JSON-LD]
    J --> W[index.html metadata]
    S --> W
    V --> W
    C --> PK[Presskit / Pressekit]
    C --> AI[AI system prompt]
    V --> AI
    AI --> JJ[JJ-AI knowledge context]
    C --> M[Public archive manifest]
    V --> M
    M --> R[GitHub provenance release]

    G[AI-generated content] -. never evidence .-> Q
```

## Trust rule

P0–P8 source classes follow `archive/schema.yml` and `website/provenance.json`. Source classification does not by itself verify a claim. Generated content is never evidence.

The graph is directional: generated website/AI copy may consume canonical evidence but may not promote itself back into the evidence layer.
