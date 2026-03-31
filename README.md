# ComfyUI Wan 2.1 Toolkit

This pack is now rebuilt around a cleaner Wan VACE flow:

- `Wan Positioned Ref Gallery`
- `Wan VACE Multi-Ref To Video`
- `Wan 2.2 VACE Multi-Ref To Video`

Old nodes from earlier versions of this pack were removed from the node list.

## Main Workflow

### 1. Wan Positioned Ref Gallery

This is the new visual multi-ref node.

It is designed for the exact "throw many refs in, preview them, and assign frames" workflow:

- drag and drop multiple images
- live preview inside the node
- reorder refs with left/right buttons
- remove refs
- set each frame position directly in the card
- output one `IMAGE` batch and one `STRING` positions value

### 2. Wan VACE Multi-Ref To Video

This is the new main node.

It is designed as a cleaner replacement for the built-in `WanVaceToVideo`, but adds:

- start frame pinning
- end frame pinning
- positioned middle frames
- multi-reference image batches
- control video frame filtering

Important:

- Multi Ref frames are applied through the pinned timeline path.
- The internal `reference_image` path now uses only one primary reference frame for compatibility with Wan VACE runtime.
- If you want many reference frames, put them in `positioned_frames` with positions, not all into a global reference slot.

It keeps the same output shape:

- `positive`
- `negative`
- `latent`
- `trim_latent`

So you can connect it to your sampler the same way as before.

### 2b. Wan 2.2 VACE Multi-Ref To Video

This is the Wan 2.2 path.

It keeps the same multi-ref timeline workflow, but is now easier to drop into a normal Wan image-to-video graph.

Internally it does two things:

- creates the normal `positive`, `negative`, and `latent` outputs through the built-in `WanImageToVideo` path
- creates `vace_embeds` through the Wan 2.2 `WanVideoVACEEncode` path

Use it when your workflow is based on Wan 2.2 video nodes.

It outputs:

- `positive`
- `negative`
- `latent`
- `vace_embeds`

Recommended wiring for Wan 2.2:

1. Connect `wan_vae` from your Wan 2.2 VAE loader. If your build exposes a plain `vae`, that also works.
2. Connect `control_video`, `start_image`, `positioned_frames`, `end_image`, and `extra_reference_images` the same way as the 2.1 node.
3. Connect `positive`, `negative`, and `latent` to your sampler like a normal Wan graph.
4. Use `vace_embeds` only if your downstream Wan 2.2 workflow has a node that consumes VACE embeddings.

### 3. Wan Multi Ref Stack

This older batch stacker is still available if you want a simple manual image combiner.

### 4. Wan Video Freeze Frames

Optional post-process node for freezing the first few frames to reduce Wan startup flicker.

## Recommended Wiring

1. Connect `positive`, `negative`, and `vae`.
2. Connect `control_video` if needed.
3. Connect `start_image`.
4. Connect `end_image`.
5. Use `Wan Positioned Ref Gallery` for the middle frames.
6. Connect:

- `Wan Positioned Ref Gallery.images` -> `Wan VACE Multi-Ref To Video.positioned_frames`
- `Wan Positioned Ref Gallery.positions` -> `Wan VACE Multi-Ref To Video.positions_of_positioned_frames`

7. Typical positions output:

```text
20 30 50 90
```

8. If you also have extra reference images, use `Wan Multi Ref Stack` and connect it to `extra_reference_images`.
9. Send `positive`, `negative`, and `latent` outputs to your sampler path like a normal Wan VACE workflow.

## Useful Inputs

- `frames_to_keep_in_control_video`
Examples:

```text
1 20 30
```

```text
1:16
```

- `positions_of_positioned_frames`
Examples:

```text
1 20 30 L
```

## Install

Put this folder in:

```text
ComfyUI/custom_nodes/ComfyUI-Tessiiiz-WanVideoToolkit
```

Then restart ComfyUI.
