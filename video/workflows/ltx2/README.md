# LTX-2 Adapter

Use for general T2V/I2V, environment construction, multi-keyframe work and camera/motion-control when supported by the installed LTX-2 version.

## Gate

Before rendering, inspect the local LTX-2 CLI/docs and record:

- repository commit or release
- checkpoint filename/version
- supported input mode for this shot
- native output FPS and resolution
- seed
- control/LoRA names actually loaded

Do not copy stale CLI flags from memory. `video/scripts/generate-shot.sh` will call `video/workflows/ltx2/generate.sh` only if an executable adapter is deliberately installed here.

## Recommended routing

Shots 01, 04 and 06 are natural LTX-2 candidates. Shot 05 should use pose/motion control if locally available. Hero identity shots should keep the approved reference image in conditioning.
