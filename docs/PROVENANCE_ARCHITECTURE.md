# DJ Jesse Jay Provenance Architecture

```mermaid
flowchart TD
    P0[P0 Independent archive receipts] --> C[Canonical profile]
    P1[P1 Versioned repository evidence] --> C
    P2[P2 First-party external publication] --> C
    P3[P3 Credible third-party evidence] --> C
    P4[P4 Unverified claims] -. quarantine .-> Q[Needs verification]

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

`P0 > P1 > P2 > P3 > P4 > generated content`

The graph is directional: generated website/AI copy may consume canonical evidence but may not promote itself back into the evidence layer.
