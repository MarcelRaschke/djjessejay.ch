# HunyuanCustom Adapter

Use for subject-consistency / identity-critical I2V when HunyuanCustom is actually installed and its reference-image pipeline is available.

## Gate

Record exact repository commit, checkpoint, image-conditioning mode, frame count, resolution, seed and GPU mode. Never infer installed capabilities from remote documentation alone.

## Recommended routing

Shots 02 and 03 are primary candidates because face, accessories and body identity must remain stable during awakening and portal exit.

`video/scripts/generate-shot.sh` calls `video/workflows/hunyuancustom/generate.sh` only when an executable adapter has been installed explicitly.
