# Blue Dimension — Complete Production Pipeline
Underground electronic radio show visual system

**Signal 97.50 MHz | LoRa Zurich | DJ Jesse Jay**

Est. 1997 | Music Beyond Time

## Overview

Blue Dimension is a production-ready implementation pipeline for the audio-reactive cymatic visualization system featured on the Blue Dimension radio show broadcast. This repository contains:

### Live Visual Engine (TouchDesigner + WebGPU)
- Real-time Chladni plate cymatic pattern generator
- OSC synchronization with Rekordbox/CDJ deck controllers
- Audio-reactive parameter mapping (BPM, EQ bands, cue points)
- NDI network broadcasting for live streaming/projection

### Print Export Pipeline (Python + PIL)
- CMYK/Pantone color space conversion
- Multi-DPI output (72 dpi web, 300 dpi print, 600 dpi merchandise)
- Color separation plates for screen printing
- Production-ready file generation

### Standalone Architecture
- No Max for Live dependency
- Native OSC listener (UDP 7000)
- Modular TouchDesigner design
- Cross-platform (Windows, macOS, Linux)

## File Structure

```
blue_dimension/
├── README.md                              [This file]
├── 01_blue_dimension_spec.md              [Brand identity & specifications]
├── 02_touchdesigner_osc_schema.py         [OSC listener + Rekordbox integration]
├── 03_cymatic_webgpu_shader.wgsl          [Real-time cymatic shader]
├── 04_print_export_pipeline.py            [CMYK conversion & DPI scaling]
├── 05_touchdesigner_architecture.tox.md   [Complete TOE file blueprint]
├── 06_deployment_guide.md                 [Integration & troubleshooting]
├── blue_dimension_cymatic.toe             [Complete TouchDesigner project]
└── examples/
    ├── color_palette.png                  [Neon palette reference]
    ├── osc_test_messages.json             [Sample Rekordbox OSC messages]
    └── print_output_examples/
        ├── blue_dimension_web.png         [72 DPI web export]
        ├── blue_dimension_300dpi.tiff     [300 DPI print export]
        └── blue_dimension_600dpi.tiff     [600 DPI merchandise export]
```

## Quick Start

### 1. Install Dependencies

```bash
# Python
pip install pillow numpy

# TouchDesigner (download from derivative.ca)
# Version: 2024.20000 or later (WebGPU support required)

# Rekordbox
# Version: 6.5+ (with OSC network mode)
```

### 2. Configure Rekordbox

```
Rekordbox → Settings → Network
├── Enable: CDJ Network Mode
├── OSC Broadcast Address: 255.255.255.255
├── OSC Broadcast Port: 7000
└── Send Frequency: 60 Hz
```

### 3. Run Print Export Pipeline

```bash
python 04_print_export_pipeline.py

# Outputs:
# - blue_dimension_exports/blue_dimension_web.png (1920×1080, RGB)
# - blue_dimension_exports/blue_dimension_300dpi.tiff (CMYK, print-ready)
# - blue_dimension_exports/blue_dimension_600dpi.tiff (CMYK, merchandise)
```

### 4. Open TouchDesigner Project

```
TouchDesigner → File → Open
→ blue_dimension_cymatic.toe

# Verify:
# ✓ OSC Listener (UDP 7000) is receiving messages
# ✓ GLSL shader compiles without errors
# ✓ Cymatic pattern animates at 60 FPS
# ✓ NDI output is discoverable on network
```

### 5. Stream to Live Performance

**Option A: OBS (Local Streaming)**
```
OBS → Sources → Add NDI Source
→ Select "Blue Dimension — Cymatic Engine"
→ Stream to Twitch/YouTube
```

**Option B: DJ Software (Resolume, vMix)**
```
Media Server → Add NDI Input
→ Select "Blue Dimension — Cymatic Engine"
→ Map to projection screen / video wall
```

## Technical Specifications

### Audio-Reactive Parameters

| Parameter | Source | Range | Effect |
|-----------|--------|-------|--------|
| BPM | Rekordbox Tempo | 60–160 Hz | Cymatic frequency scaling |
| Deck Position | Track playhead | 0.0–1.0 | Mandala rotation (0°–360°) |
| Cue Points | Hot cues (1–8) | 8 points | Visual flash at angle |
| EQ Low | Bass fader | 0–127 MIDI | Circle radius amplitude |
| EQ Mid | Midrange fader | 0–127 MIDI | Ring glow intensity |
| EQ High | Treble fader | 0–127 MIDI | Particle animation speed |

### Color Palette

| Name | RGB | HEX | CMYK | Pantone |
|------|-----|-----|------|---------|
| Cyan Neon | 0, 217, 255 | #00D9FF | 100, 15, 0, 0 | PMS 2995 C |
| Magenta Neon | 212, 0, 255 | #D400FF | 20, 100, 0, 0 | PMS 2667 C |
| Gold | 255, 184, 0 | #FFB800 | 0, 28, 100, 0 | PMS 116 C |
| Black | 0, 0, 0 | #000000 | 75, 68, 67, 90 | PMS Black C |

### OSC Message Schema

```
/cdj/devices/1/tempo              float (BPM, e.g., 120.5)
/cdj/devices/1/pitch              float (1.0 = normal, 0.9 = -10%)
/cdj/devices/1/deck_position      float (0.0–1.0, track progress)
/cdj/devices/1/cue_points         [int ID, float position_ms, ...]
/cdj/devices/1/eq/low             int (0–127, center=64)
/cdj/devices/1/eq/mid             int (0–127, center=64)
/cdj/devices/1/eq/high            int (0–127, center=64)
```

### Export Formats

| Format | DPI | Resolution | Color | Use Case |
|--------|-----|------------|-------|----------|
| Web PNG | 72 | 1920×1080 | RGB | Web, social media |
| Print TIFF | 300 | 8000×4500 | CMYK | Poster, flyer |
| Merch TIFF | 600 | 16000×9000 | CMYK | Screen print, embroidery |
| Color Plates | 600 | 16000×9000 | Grayscale (C/M/Y/K) | Professional printing |

## Architecture Overview

### Data Flow

```
Rekordbox OSC Broadcast (UDP 7000)
    ↓
TouchDesigner OSC Listener (CHOP)
    ↓
Parameter Table (state management)
    ↓
GLSL Shader (WebGPU) + Geometry (SOP)
    ↓
Compositor (blend, glow, color correction)
    ↓
NDI Broadcast + Local Canvas + Recording
```

### Key Components

**OSC Listener (oscinport CHOP)**
- Receives Rekordbox/CDJ network broadcasts
- Extracts BPM, pitch, deck position, EQ bands, cue points
- Updates at 60 FPS

**Cymatic Shader (glslmultifile TOP or wgpucompute TOP)**
- Real-time Chladni plate simulation
- 4–8 harmonic harmonics with frequency-driven standing waves
- Audio-reactive color mapping (HSL → RGB)
- Neon glow + bloom effects

**Waveform Visualization (line SOP)**
- Left/right channel audio visualization
- Frequency-responsive geometry
- Overlay on cymatic mandala

**Compositor (composite TOP)**
- Blends cymatic pattern + waveform + glow
- Color correction (levels, curves, saturation)
- Vignette effect for depth

**NDI Output (ndi TOP)**
- Broadcasts to OBS, Resolume, vMix
- 1920×1080 @ 60 FPS
- Auto-discovery on network (mDNS)

## Usage Scenarios

### Live DJ Performance
```
1. DJ booth (Rekordbox + CDJ)
   ↓ OSC broadcast
2. TouchDesigner (visual engine)
   ↓ NDI stream
3. Projection/Screen (live visuals)
```

### Streaming (Twitch/YouTube)
```
1. Rekordbox (music source)
   ↓ Sync with TouchDesigner
2. TouchDesigner (cymatic engine)
   ↓ NDI output
3. OBS (consume NDI, overlay graphics)
   ↓ RTMP stream
4. Twitch/YouTube (broadcast)
```

### Print/Merchandise
```
1. Blue Dimension graphic (source asset)
   ↓ color conversion
2. Print export pipeline (RGB → CMYK)
   ↓ DPI scaling
3. Print output files (300 DPI for poster, 600 DPI for merchandise)
   ↓ hand-off to printer
4. Physical products (posters, merchandise, vinyl sleeves)
```

## Performance Notes

### Hardware Requirements (60 FPS @ 1920×1080)
- GPU: NVIDIA GTX 1070+, AMD RX 5700 XT+
- CPU: Intel i7-9700K+, AMD Ryzen 5 3600+
- RAM: 16 GB minimum
- Network: 1 Gbps Ethernet (for CDJ network)

### Optimization Tips
- Reduce harmonic count in GLSL (lower CPU overhead)
- Pre-bake texture lookups (noise, gradients)
- Use half-precision floats where acceptable
- Limit SOP vertex count (<50k geometry)
- Cache computations (avoid recalculation per-frame)

## Troubleshooting

### OSC Messages Not Received
1. Verify Rekordbox Settings → Network → CDJ Network Mode = ON
2. Check firewall: `sudo ufw allow 7000/udp`
3. Test with: `nc -u -l 0.0.0.0 7000`
4. Verify network connectivity: `ping [Rekordbox IP]`

### GLSL Shader Compilation Error
1. Validate shader syntax: `wgslangc validate 03_cymatic_webgpu_shader.wgsl`
2. Check TouchDesigner version (2024.20000+ required)
3. Verify uniform bindings match layout
4. Try fallback GLSL 4.50 version if WebGPU unavailable

### Color Not Matching Print
1. Verify ICC color profile applied (sRGB vs. Adobe RGB)
2. Check Pantone swatch against physical reference
3. Request color proof from print shop before full run
4. Provide CMYK values + Pantone ID to printer

### NDI Not Discoverable
1. Verify NDI plugin installed (Help → About → Plugins)
2. Check firewall: `sudo ufw allow 5353/udp`
3. Ensure both systems on same subnet
4. Restart NDI: `op('ndi_broadcast').par.Active = False, then True`

## Contributing

To extend or customize this pipeline:
- Add new OSC parameters: Edit `02_touchdesigner_osc_schema.py`
- Modify shader effects: Edit `03_cymatic_webgpu_shader.wgsl`
- Adjust color palette: Edit `01_blue_dimension_spec.md` and `04_print_export_pipeline.py`
- Extend TouchDesigner logic: Edit `/render/` operators in `blue_dimension_cymatic.toe`

## License

**Blue Dimension Visual System**

© 2026 DJ Jesse Jay | LoRa Zurich

Licensed under CC BY-NC-SA 4.0 (Creative Commons Attribution-NonCommercial-ShareAlike)

**Use:** Educational, non-commercial DJ/radio broadcast
**Restrictions:** No commercial use without written permission

## References

- [Rekordbox OSC Documentation](https://pubs.pioneerdj.com/)
- [TouchDesigner Documentation](https://docs.derivative.ca/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [Chladni Plate Physics](https://en.wikipedia.org/wiki/Chladni_figure)
- [NDI Protocol](https://www.ndi.tv/developers/)

## Contact & Support

- **Show:** Blue Dimension (Thursday 00:00–06:00 UTC)
- **Station:** LoRa Zurich 97.50 MHz
- **Web:** djjessejay.ch | lora.ch
- **Issues:** Report bugs with logs and system specs

---

**Version:** 1.0  
**Release Date:** 2026-09-26  
**Status:** Production Ready  
**Maintained By:** DJ Jesse Jay (cy8er)
