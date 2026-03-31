# Wan 2.2 VACE Multi-Ref To Video

Wan 2.2 multi-reference VACE bridge node.

## What It Does

- builds a pinned timeline from control video and positioned reference frames
- creates matching masks for the pinned timeline
- forwards a real multi-reference batch into the Wan 2.2 `ref_images` path
- calls the Wan 2.2 `WanVideoVACEEncode` node internally
- also generates normal `positive`, `negative`, and `latent` outputs through `WanImageToVideo`

## Inputs

- `positive`
- `negative`
- `wan_vae` or `vae`
- `clip_vision_output`
- `control_video`
- `start_image`
- `positioned_frames`
- `end_image`
- `extra_reference_images`
- `positions_of_positioned_frames`

## Output

- `positive`
- `negative`
- `latent`
- `vace_embeds`

## Notes

- This node is for Wan 2.2-style workflows, but it is shaped to feel more like a drop-in image-to-video prep node.
- Multi-ref images are used in two ways:
  - positioned refs are pinned into the timeline
  - all valid refs are also packed into the Wan 2.2 `ref_images` batch
