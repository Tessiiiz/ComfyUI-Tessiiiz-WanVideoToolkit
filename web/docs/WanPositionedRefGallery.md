# Wan Positioned Ref Gallery

Visual multi-reference uploader for Wan VACE workflows.

## What It Does

- drag and drop multiple images directly into the node
- preview every uploaded reference image
- assign a frame position to each image
- reorder references with left and right buttons
- remove images one by one
- output:
  - `images` for `positioned_frames`
  - `positions` for `positions_of_positioned_frames`

## Frame Syntax

- `1` = first frame
- `20 30 50` = explicit positions
- `L` = last frame

## Recommended Use

1. Drop all middle reference frames into this node.
2. Set the frame position for each card.
3. Connect `images` to `Wan VACE Multi-Ref To Video.positioned_frames`.
4. Connect `positions` to `Wan VACE Multi-Ref To Video.positions_of_positioned_frames`.

## Notes

- Newly uploaded refs auto-suggest frame values like `20`, `30`, `40` to speed up setup.
- The backend only exports refs that actually have a frame position assigned.
- Images are uploaded to the ComfyUI input area, then rebuilt into one `IMAGE` batch at runtime.
