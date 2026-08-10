---
name: video-generator
description: Production-Skill für DJ Jesse Jay / BLUE DIMENSION. Plant, promptet, routet und prüft Text-to-Video- und Image-to-Video-Shots mit Character-Lock, 125-BPM-Timecodes, Kamera-/Pose-Control, LTX-2/HunyuanCustom-Adaptern, 120-fps-Interpolation und 60-fps-Mastering. Trigger: "video erstellen", "text zu video", "image to video", "blue dimension video", "character lock", "shot prompt", "120 fps", "video master".
argument-hint: <brief | shot-id | prompt | reference-image>
allowed-tools: Read, Edit, Grep, Bash(ffmpeg:*), Bash(ffprobe:*), Bash(python:*), Bash(git:*)
effort: high
---

# Video Generator Skill

**Aufgabe:** $ARGUMENTS

## Ziel

Erzeuge reproduzierbare, identity-preserving Video-Produktionspakete für `video/`. Der Skill darf keine nicht vorhandene Modellfähigkeit erfinden: native FPS, Auflösung, Audio, I2V, Pose- oder Camera-Control müssen am tatsächlich installierten Backend geprüft werden.

## Fähigkeiten

1. Brief → 16:9 Storyboard und Shot-Liste.
2. Character-Lock aus `video/character/CHARACTER_LOCK.md` durchsetzen.
3. Text-to-Video vs. Image-to-Video sinnvoll routen; für Jesse-Jay-Hero-Shots I2V bevorzugen.
4. Prompts mit Subjekt, Aktion, Kamera, Licht, Material, Umgebung und zeitlicher Reihenfolge kompilieren.
5. Negative Prompt aus `video/prompts/negative-prompt.txt` anhängen.
6. 125-BPM-Timecodes und Beat-Cues aus `video/timing/blue-dimension-125bpm.json` verwenden.
7. Kamera-Moves: static, macro, dolly-in/out, orbit, jib/crane, low-angle tracking.
8. Bewegungssteuerung: pose, motion-track, DJ-Handgriffe und kontrollierte TechDancer-Moves.
9. Backend-Routing: `ltx2` für allgemeine T2V/I2V- und Kamera-Pipelines; `hunyuan-custom` für identity-kritische Subject-Consistency-Shots, sofern installiert.
10. Post: native Modellframes zuerst; 120 fps nur nativ behaupten, wenn belegt, sonst interpolieren; 60-fps-Webmaster ausgeben.
11. QC: Dauer, FPS, 16:9, Auflösung, Identität, Anatomie, Gear-Konsistenz, Flicker, Text-/Logo-Artefakte und Audio-Sync prüfen.
12. Provenienz: Prompt, Seed, Backend, Modellversion, Referenzhash und Outputhash dokumentieren.

## Canonical Character Gate

Vor jedem Hero-Shot lesen:

```text
video/character/CHARACTER_LOCK.md
video/prompts/negative-prompt.txt
video/timing/blue-dimension-125bpm.json
```

Nicht verändern: Gesicht/Headshape, schwarze rechteckige Brille, dunkles kurzes/spiky Haar, cyanfarbene Kopfhörer, Tattoos, schwarzes Techwear/Streetwear-Outfit, Proportionen und Zubehörkontinuität. Keine Duplikate oder Morphs.

## Shot Workflow

```text
BRIEF
  ↓
CHARACTER LOCK
  ↓
SHOT PROMPT
  ↓
BACKEND CAPABILITY CHECK
  ↓
T2V / I2V ROUTING
  ↓
GENERATION
  ↓
IDENTITY + MOTION QC
  ↓
OPTIONAL 120 FPS INTERPOLATION
  ↓
60 FPS MASTER
  ↓
TEXT / EMBLEM COMPOSITING
  ↓
PROVENANCE RECEIPT
```

## Prompt Compiler

Jeder Prompt muss diese Reihenfolge haben:

```text
SUBJECT LOCK → START STATE → ACTION SEQUENCE → CAMERA → ENVIRONMENT → LIGHT → MOTION QUALITY → END STATE
```

Bewegungen zeitlich explizit formulieren, nicht als ungeordnete Adjektivliste. Nur eine Hauptkameraaktion pro kurzer Generation.

## Backend Policy

### LTX-2

Bevorzugt für Environment, Materialization, Camera-Control und kontrollierte I2V/T2V-Sequenzen. Installierte Modellversion und unterstützte Flags zuerst aus lokaler Doku/CLI lesen.

### HunyuanCustom

Bevorzugt für identity-kritische Subject-Consistency, wenn Referenzbild-Conditioning lokal verfügbar ist. Keine angebliche 8-GB-/24-GB-Fähigkeit oder Modelloption aus Erinnerung übernehmen; lokale Version prüfen.

### Fallback

Wenn kein Video-Backend installiert ist: Produktionspaket vollständig erzeugen, aber klar `GENERATION_BACKEND_MISSING` melden. Niemals behaupten, ein Video sei gerendert worden.

## Frame-Rate Policy

- Working intent: 120 fps für schnelle Hand-, Vinyl- und Dance-Motion.
- Native Modell-FPS zuerst behalten.
- Falls native 120 fps nicht belegt: `video/scripts/interpolate-120fps.sh` verwenden.
- Delivery: `video/scripts/master-60fps.sh`.
- 120 → 60 = 50 % Zeitbasis bei echtem 120-fps-Material; Interpolation ist kein echtes High-Speed-Capture.

## Beat Policy

125 BPM:

```text
1 beat = 0.480 s
8 beats = 3.840 s
```

Schnittpunkte bevorzugt an 8-Beat-Grenzen. Frame-Ereignisse auf die nächste reale Timeline-Frameposition quantisieren.

## Text / Logo Gate

`DJ JESSE JAY`, `BLUE DIMENSION`, `97.5 MHz`, `SINCE 1997` und das gelbe `j · gespiegeltes-j`-Emblem nicht durch das Video-Modell zeichnen lassen. Als separate Compositing-Layer einsetzen.

## QC Gate

Vor `READY` prüfen:

```text
[ ] gleiche Person / gleiche Figur in allen Frames
[ ] zwei Arme, zwei Hände, plausible Finger
[ ] keine verschmolzenen Hände oder Gear-Intersections
[ ] keine Gear-Duplikate oder mutierenden Decks
[ ] keine zufälligen Logos / Texte / Watermarks
[ ] keine Kamera-Jitter- oder Zoom-Sprünge
[ ] kein Exposure-Pumping / massives Flicker
[ ] Seitenverhältnis 16:9
[ ] Master 1920x1080 / 60 fps oder explizit dokumentierte Abweichung
[ ] Prompt + Seed + Backend + Modellversion dokumentiert
```

Status nur als `READY` markieren, wenn alle harten Gates bestanden sind; sonst `REGENERATE`, `POST_FIX` oder `BACKEND_MISSING`.
