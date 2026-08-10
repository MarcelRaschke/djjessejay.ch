# BLUE DIMENSION Video Pipeline

Produktionsordner für **DJ Jesse Jay — BLUE DIMENSION // SIGNAL 97.5**.

## Master

- 16:9
- 1920 × 1080 Delivery
- 60 fps Final
- 120 fps Working/Interpolation für schnelle Bewegungen
- 48 kHz Audio
- 125 BPM Progressive House
- 6 Kernshots × 8 Beats = 23.04 s

## Pipeline

```text
reference → character lock → shot prompt → backend → QC → optional 120 fps → 60 fps master → typography/emblem → archive
```

Für Character-Hero-Shots **Image-to-Video** bevorzugen. Reines Text-to-Video ist für Identitätskonsistenz nur Fallback oder Environment-Generation.

## Verzeichnis

- `character/` — kanonischer Character-Lock und Referenzen
- `prompts/` — sechs Shot-Prompts + Negative Prompt
- `workflows/ltx2/` — LTX-2 Adapterhinweise
- `workflows/hunyuancustom/` — HunyuanCustom Adapterhinweise
- `timing/` — BPM-/Timecode-Quelle
- `scripts/` — Generation-Dispatch, Interpolation, Mastering
- `output/` — lokale Renderziele; große Renderdateien nicht ungeprüft committen

## Schnellstart

```bash
chmod +x video/scripts/*.sh
video/scripts/generate-shot.sh 01 ltx2
video/scripts/interpolate-120fps.sh input.mp4 output-120.mp4
video/scripts/master-60fps.sh output-120.mp4 blue-dimension-master.mp4
```

`generate-shot.sh` kompiliert zunächst einen reproduzierbaren Job. Ein tatsächlicher Render wird nur gestartet, wenn ein expliziter Backend-Adapter vorhanden und ausführbar ist.

## Wichtige Regel

Model-generierte Schrift und Logos gelten nicht als Master. Titel und das Jesse-Jay-Emblem werden separat composited.
