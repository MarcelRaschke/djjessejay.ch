# BLUE DIMENSION V2 — Website Refactor

## Objective

Turn the public DJ Jesse Jay website into a coherent **Blue Dimension digital signal system** rather than a generic DJ landing page.

Canonical identity surface:

- **DJ Jesse Jay**
- **Zürich**
- **EST. 1997**
- **Blue Dimension**
- **Signal 97.5 MHz**

The repository remains a versioned website, archive and provenance system. The visual refactor must not alter canonical evidence or invent biographical claims.

## V2 visual language

### Palette

- Deep Navy / near-black as the structural background
- Electric Cyan / Signal Blue for active states and signal graphics
- Metallic Silver for primary typography
- Golden Yellow only as an identity accent

### Interface metaphor

The UI is organized around a radio/signal vocabulary:

- Signal
- Transmission
- Frequency
- Archive
- Mixes
- Visuals
- Booking

### Hero

The hero is treated as a signal chamber with:

- 97.5 MHz frequency marker
- Blue Dimension identity
- Zürich / EST. 1997 context
- circular RF geometry
- restrained glow rather than generic cyberpunk gradients
- existing lightweight animation preserved

### Cards

Content cards use a common dark glass/panel treatment with:

- thin cyan signal borders
- deep navy surfaces
- restrained elevation
- consistent radius
- keyboard-visible focus states

### Motion

Motion remains subordinate to the content. `prefers-reduced-motion: reduce` disables decorative animation and smooth scrolling.

## Implementation

The first production-safe V2 layer is implemented in `css/hero-animation.css`. This file is already loaded by `index.html` after the generated Tailwind stylesheet, allowing the visual system to override presentation without replacing the existing content, archive, forms or provenance logic.

This deliberately avoids modifying canonical content during the visual migration.

## Next refactor stages

1. Split the monolithic `index.html` presentation layer into semantic components while preserving existing IDs and integrations.
2. Replace generic navigation labels with the Signal / Mixes / Music / Events / Visuals / Bio information architecture.
3. Introduce the sticky Blue Dimension player / transmission bar.
4. Normalize event, mix and media cards around the V2 component tokens.
5. Move inline CSS/JS into versioned assets.
6. Validate accessibility, mobile crop, CSP, SEO and provenance metadata.
7. Run the existing repository security and agent-boundary checks before merging to `main`.
