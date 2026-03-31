# Wan VACE Multi-Ref To Video

Drop-in replacement for `WanVaceToVideo` with a cleaner multi-reference workflow.

## What It Adds

- start frame pinning
- end frame pinning
- positioned middle reference frames
- extra reference image batch support
- control video frame filtering
- built-in control mask creation

## Compatibility Note

For stability with Wan VACE, the node uses only one primary image in the internal `reference_image` path.

If you want multiple reference frames, use `positioned_frames` with explicit positions. That is the intended Multi Ref workflow.

## Suggested Workflow

1. Encode prompts as usual.
2. Connect `positive`, `negative`, and `vae`.
3. Connect `control_video` if you have one.
4. Connect `start_image` and `end_image`.
5. Use `Wan Positioned Ref Gallery` for your middle reference frames.
6. Connect `Wan Positioned Ref Gallery.images` to `positioned_frames`.
7. Connect `Wan Positioned Ref Gallery.positions` to `positions_of_positioned_frames`.
8. Optionally connect `Wan Multi Ref Stack` to `extra_reference_images` for people / objects / style refs.

## Notes

- `positions_of_positioned_frames` uses `1` for first frame and `L` for last frame.
- `frames_to_keep_in_control_video` accepts values like `1 20 30` or `1:16`.
- `trim_latent` still works like the built-in `WanVaceToVideo`, but now counts all encoded reference images.
