import json
import os
from typing import List, Optional

import numpy as np
import torch
from PIL import Image, ImageOps
from comfy.utils import common_upscale
from comfy_execution.graph_utils import GraphBuilder

import folder_paths


def _empty_image_batch(width: int, height: int, channels: int = 3) -> torch.Tensor:
    return torch.zeros((0, height, width, channels), dtype=torch.float32)


def _resize_image_batch(image: torch.Tensor, width: int, height: int, resize_mode: str) -> torch.Tensor:
    if image is None:
        return None
    if image.shape[0] == 0:
        channels = image.shape[-1] if image.ndim == 4 else 3
        return torch.zeros((0, height, width, channels), dtype=image.dtype, device=image.device)
    if image.shape[1] == height and image.shape[2] == width:
        return image

    crop = "center" if resize_mode == "crop" else "disabled"
    resized = common_upscale(image.movedim(-1, 1), width, height, "lanczos", crop)
    return resized.movedim(1, -1)


def _resize_mask_batch(mask: torch.Tensor, width: int, height: int) -> torch.Tensor:
    if mask is None:
        return None
    if mask.ndim == 2:
        mask = mask.unsqueeze(0)
    if mask.shape[0] == 0:
        return torch.zeros((0, height, width), dtype=mask.dtype, device=mask.device)
    if mask.shape[1] == height and mask.shape[2] == width:
        return mask

    return common_upscale(mask.unsqueeze(1), width, height, "nearest-exact", "disabled").squeeze(1)


def _pad_or_trim_mask(mask: torch.Tensor, num_frames: int) -> torch.Tensor:
    if mask is None:
        return None
    if mask.shape[0] == 0:
        return torch.ones((num_frames, mask.shape[1], mask.shape[2]), dtype=mask.dtype, device=mask.device)
    if mask.shape[0] == num_frames:
        return mask
    if mask.shape[0] > num_frames:
        return mask[:num_frames]

    pad_count = num_frames - mask.shape[0]
    pad = mask[-1:].repeat((pad_count, 1, 1))
    return torch.cat([mask, pad], dim=0)


def _concat_image_batches(image_batches: List[torch.Tensor], width: int, height: int) -> torch.Tensor:
    valid_batches = [batch for batch in image_batches if batch is not None and batch.shape[0] > 0]
    if not valid_batches:
        return _empty_image_batch(width, height)
    return torch.cat(valid_batches, dim=0)


def _expand_clip(image: torch.Tensor, hold_frames: int) -> torch.Tensor:
    if image is None:
        return None
    if hold_frames <= 1:
        return image[:1]
    if image.shape[0] >= hold_frames:
        return image[:hold_frames]

    pad_count = hold_frames - image.shape[0]
    pad = image[-1:].repeat((pad_count, 1, 1, 1))
    return torch.cat([image, pad], dim=0)


def _resolve_index(index: int, total_frames: int) -> int:
    if total_frames < 1:
        return 0
    if index < 0:
        index = total_frames + index
    return max(0, min(index, total_frames - 1))


def _parse_user_frame_index(token: str, total_frames: int) -> int:
    if total_frames <= 0:
        return 0

    cleaned = token.strip().upper()
    if cleaned in {"L", "LAST", "END"}:
        return total_frames - 1

    value = int(cleaned)
    if value < 0:
        return _resolve_index(value, total_frames)
    if value == 0:
        return 0
    return max(0, min(value - 1, total_frames - 1))


def _parse_frame_positions(position_text: str, total_frames: int) -> List[int]:
    if not position_text or not position_text.strip():
        return []

    positions = []
    for token in position_text.replace(",", " ").split():
        try:
            positions.append(_parse_user_frame_index(token, total_frames))
        except ValueError:
            continue
    return positions


def _parse_keep_frames_spec(spec: str, total_frames: int) -> List[int]:
    if total_frames <= 0:
        return []
    if not spec or not spec.strip():
        return list(range(total_frames))

    indices: List[int] = []
    for token in spec.replace(",", " ").split():
        cleaned = token.strip()
        if not cleaned:
            continue

        separator = None
        for candidate in ("..", ":", "-"):
            if candidate in cleaned and cleaned != "-":
                separator = candidate
                break

        if separator is None:
            try:
                indices.append(_parse_user_frame_index(cleaned, total_frames))
            except ValueError:
                continue
            continue

        start_text, end_text = cleaned.split(separator, 1)
        try:
            start_index = _parse_user_frame_index(start_text, total_frames)
            end_index = _parse_user_frame_index(end_text, total_frames)
        except ValueError:
            continue

        step = 1 if end_index >= start_index else -1
        indices.extend(list(range(start_index, end_index + step, step)))

    if not indices:
        return list(range(total_frames))

    deduped: List[int] = []
    seen = set()
    for index in indices:
        if index not in seen:
            deduped.append(index)
            seen.add(index)
    return deduped


def _select_image_frames(image: torch.Tensor, frame_indices: List[int]) -> torch.Tensor:
    if image is None:
        return None
    if image.shape[0] == 0:
        return image
    if not frame_indices:
        return image[:0]

    index_tensor = torch.tensor(frame_indices, dtype=torch.long, device=image.device)
    return image.index_select(0, index_tensor)


def _single_frame(image: torch.Tensor) -> torch.Tensor:
    if image is None or image.shape[0] == 0:
        return image
    return image[:1]


def _prefer_primary_reference(current_ref: torch.Tensor, candidate: torch.Tensor) -> torch.Tensor:
    if current_ref is not None and current_ref.shape[0] > 0:
        return current_ref
    if candidate is None or candidate.shape[0] == 0:
        return current_ref
    return _single_frame(candidate)


def _place_clip(out_batch: torch.Tensor, masks: torch.Tensor, clip: torch.Tensor, start_index: int, mask_value: float) -> None:
    if clip is None or clip.shape[0] == 0:
        return

    total_frames = out_batch.shape[0]
    start_index = _resolve_index(start_index, total_frames)
    end_index = min(start_index + clip.shape[0], total_frames)
    frame_count = end_index - start_index
    if frame_count <= 0:
        return

    out_batch[start_index:end_index] = clip[:frame_count]
    masks[start_index:end_index] = mask_value


def _place_end_clip(out_batch: torch.Tensor, masks: torch.Tensor, clip: torch.Tensor, end_index: int, mask_value: float) -> None:
    if clip is None or clip.shape[0] == 0:
        return

    total_frames = out_batch.shape[0]
    resolved_end = _resolve_index(end_index, total_frames)
    start_index = resolved_end - clip.shape[0] + 1

    if start_index < 0:
        clip = clip[-start_index:]
        start_index = 0

    if clip.shape[0] == 0:
        return

    _place_clip(out_batch, masks, clip, start_index, mask_value)


def _uploaded_file_base_dir(upload_type: str) -> str:
    upload_type = (upload_type or "input").lower()
    if upload_type == "output":
        return folder_paths.get_output_directory()
    if upload_type == "temp":
        return folder_paths.get_temp_directory()
    return folder_paths.get_input_directory()


def _resolve_uploaded_image_path(item: dict) -> Optional[str]:
    filename = os.path.basename(str(item.get("name") or item.get("filename") or "")).strip()
    if not filename:
        return None

    base_dir = os.path.abspath(_uploaded_file_base_dir(str(item.get("type") or "input")))
    subfolder = str(item.get("subfolder") or "").replace("\\", "/").strip("/")
    safe_parts = [part for part in subfolder.split("/") if part and part not in {".", ".."}]
    full_path = os.path.abspath(os.path.join(base_dir, *safe_parts, filename))

    if os.path.commonpath([base_dir, full_path]) != base_dir:
        return None
    return full_path


def _load_rgb_image_tensor(path: str) -> torch.Tensor:
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        rgb_image = image.convert("RGB")
        image_array = np.array(rgb_image).astype(np.float32) / 255.0
    return torch.from_numpy(image_array).unsqueeze(0)


def _parse_gallery_state(gallery_state: str) -> List[dict]:
    if not gallery_state or not gallery_state.strip():
        return []

    try:
        parsed = json.loads(gallery_state)
    except json.JSONDecodeError:
        return []

    if not isinstance(parsed, list):
        return []

    items: List[dict] = []
    for raw_item in parsed:
        if not isinstance(raw_item, dict):
            continue
        frame = str(raw_item.get("frame") or "").strip()
        if not frame:
            continue
        items.append(
            {
                "name": raw_item.get("name") or raw_item.get("filename") or "",
                "subfolder": raw_item.get("subfolder") or "",
                "type": raw_item.get("type") or "input",
                "frame": frame,
            }
        )
    return items


class WanPositionedRefGallery:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "gallery_state": ("STRING", {"default": "[]", "multiline": True}),
                "resize_mode": (["match_first", "crop_to_first"], {"default": "match_first"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("images", "positions")
    FUNCTION = "build"
    CATEGORY = "Wan 2.1 Toolkit"
    DESCRIPTION = (
        "Builds a positioned IMAGE batch from a drag-and-drop gallery of reference frames and "
        "outputs the matching positions string for Wan VACE."
    )

    def build(self, gallery_state, resize_mode):
        items = _parse_gallery_state(gallery_state)
        loaded_images: List[torch.Tensor] = []
        positions: List[str] = []

        for item in items:
            image_path = _resolve_uploaded_image_path(item)
            if image_path is None or not os.path.isfile(image_path):
                continue

            try:
                loaded_images.append(_load_rgb_image_tensor(image_path).float())
            except Exception:
                continue

            positions.append(str(item["frame"]).strip())

        if not loaded_images:
            return (_empty_image_batch(64, 64).cpu(), "")

        target_height = loaded_images[0].shape[1]
        target_width = loaded_images[0].shape[2]
        resize_policy = "crop" if resize_mode == "crop_to_first" else "stretch"
        resized_images = [
            _resize_image_batch(image, target_width, target_height, resize_policy) for image in loaded_images
        ]

        positions_text = " ".join(positions)
        return (torch.cat(resized_images, dim=0).cpu(), positions_text)


class WanMultiRefStack:
    STACK_SLOTS = 12

    @classmethod
    def INPUT_TYPES(cls):
        optional = {}
        for slot in range(1, cls.STACK_SLOTS + 1):
            optional[f"image_{slot}"] = ("IMAGE",)

        return {
            "required": {
                "resize_mode": (["match_first", "crop_to_first"], {"default": "match_first"}),
            },
            "optional": optional,
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "process"
    CATEGORY = "Wan 2.1 Toolkit"
    DESCRIPTION = "Stacks many still images into one IMAGE batch for Multi Ref workflows."

    def process(self, resize_mode, **kwargs):
        images = []
        for slot in range(1, self.STACK_SLOTS + 1):
            image = kwargs.get(f"image_{slot}")
            if image is not None and image.shape[0] > 0:
                images.append(image.float())

        if not images:
            return (_empty_image_batch(64, 64).cpu(),)

        target_height = images[0].shape[1]
        target_width = images[0].shape[2]
        resize_policy = "crop" if resize_mode == "crop_to_first" else "stretch"
        resized_images = [_resize_image_batch(image, target_width, target_height, resize_policy) for image in images]
        return (torch.cat(resized_images, dim=0).cpu(),)


class WanVaceMultiRefToVideo:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "vae": ("VAE",),
                "width": ("INT", {"default": 832, "min": 16, "max": 8192, "step": 16}),
                "height": ("INT", {"default": 480, "min": 16, "max": 8192, "step": 16}),
                "length": ("INT", {"default": 81, "min": 1, "max": 4096, "step": 4}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 4096}),
                "strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1000.0, "step": 0.01}),
                "control_start_frame": ("INT", {"default": 1, "min": 1, "max": 4096, "step": 1}),
                "frames_to_keep_in_control_video": ("STRING", {"default": ""}),
                "positions_of_positioned_frames": ("STRING", {"default": "20 30 50 90", "forceInput": True}),
                "start_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "positioned_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "end_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "empty_frame_level": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "control_mask_value": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "resize_mode": (["stretch", "crop"], {"default": "stretch"}),
            },
            "optional": {
                "control_video": ("IMAGE",),
                "start_image": ("IMAGE",),
                "positioned_frames": ("IMAGE",),
                "end_image": ("IMAGE",),
                "extra_reference_images": ("IMAGE",),
                "inpaint_mask": ("MASK",),
            },
        }

    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "LATENT", "INT")
    RETURN_NAMES = ("positive", "negative", "latent", "trim_latent")
    FUNCTION = "encode"
    CATEGORY = "Wan 2.1 Toolkit"
    DESCRIPTION = (
        "A cleaner WanVaceToVideo replacement with pinned timeline frames, control-video filtering, "
        "and true Multi Ref image support."
    )

    def encode(
        self,
        positive,
        negative,
        vae,
        width,
        height,
        length,
        batch_size,
        strength,
        control_start_frame,
        frames_to_keep_in_control_video,
        positions_of_positioned_frames,
        start_frame_hold,
        positioned_frame_hold,
        end_frame_hold,
        empty_frame_level,
        control_mask_value,
        resize_mode,
        control_video=None,
        start_image=None,
        positioned_frames=None,
        end_image=None,
        extra_reference_images=None,
        inpaint_mask=None,
    ):
        timeline_frames = torch.full((length, height, width, 3), empty_frame_level, dtype=torch.float32)
        timeline_masks = torch.ones((length, height, width), dtype=torch.float32)
        primary_reference = None

        if control_video is not None and control_video.shape[0] > 0:
            control_video = _resize_image_batch(control_video.float(), width, height, resize_mode)
            kept_frames = _parse_keep_frames_spec(frames_to_keep_in_control_video, control_video.shape[0])
            control_video = _select_image_frames(control_video, kept_frames)
            control_start_index = _parse_user_frame_index(str(control_start_frame), length)
            usable_length = min(control_video.shape[0], max(0, length - control_start_index))
            if usable_length > 0:
                timeline_frames[control_start_index : control_start_index + usable_length] = control_video[:usable_length]
                timeline_masks[control_start_index : control_start_index + usable_length] = control_mask_value

        if start_image is not None and start_image.shape[0] > 0:
            start_image = _single_frame(_resize_image_batch(start_image.float(), width, height, resize_mode))
            start_clip = _expand_clip(start_image, start_frame_hold)
            _place_clip(timeline_frames, timeline_masks, start_clip, 0, 0.0)
            primary_reference = _prefer_primary_reference(primary_reference, start_image)

        if positioned_frames is not None and positioned_frames.shape[0] > 0:
            positioned_frames = _resize_image_batch(positioned_frames.float(), width, height, resize_mode)
            positions = _parse_frame_positions(positions_of_positioned_frames, length)
            usable_count = min(positioned_frames.shape[0], len(positions))
            for index in range(usable_count):
                positioned_clip = _expand_clip(positioned_frames[index : index + 1], positioned_frame_hold)
                _place_clip(timeline_frames, timeline_masks, positioned_clip, positions[index], 0.0)
            if usable_count > 0:
                primary_reference = _prefer_primary_reference(primary_reference, positioned_frames[:1])

        if end_image is not None and end_image.shape[0] > 0:
            end_image = _single_frame(_resize_image_batch(end_image.float(), width, height, resize_mode))
            end_clip = _expand_clip(end_image, end_frame_hold)
            _place_end_clip(timeline_frames, timeline_masks, end_clip, -1, 0.0)
            primary_reference = _prefer_primary_reference(primary_reference, end_image)

        if extra_reference_images is not None and extra_reference_images.shape[0] > 0:
            extra_reference_images = _resize_image_batch(extra_reference_images.float(), width, height, resize_mode)
            primary_reference = _prefer_primary_reference(primary_reference, extra_reference_images[:1])

        if inpaint_mask is not None:
            inpaint_mask = _resize_mask_batch(inpaint_mask.float(), width, height)
            inpaint_mask = _pad_or_trim_mask(inpaint_mask, length)
            timeline_masks = inpaint_mask * timeline_masks

        graph = GraphBuilder()
        node_inputs = {
            "positive": positive,
            "negative": negative,
            "vae": vae,
            "width": width,
            "height": height,
            "length": length,
            "batch_size": batch_size,
            "strength": strength,
            "control_video": timeline_frames.cpu(),
            "control_masks": timeline_masks.cpu(),
        }
        if primary_reference is not None and primary_reference.shape[0] > 0:
            node_inputs["reference_image"] = primary_reference.cpu()

        wan_vace = graph.node("WanVaceToVideo", **node_inputs)
        return {
            "result": (
                wan_vace.out(0),
                wan_vace.out(1),
                wan_vace.out(2),
                wan_vace.out(3),
            ),
            "expand": graph.finalize(),
        }


class Wan22VaceMultiRefEncode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "width": ("INT", {"default": 832, "min": 16, "max": 8192, "step": 16}),
                "height": ("INT", {"default": 480, "min": 16, "max": 8192, "step": 16}),
                "num_frames": ("INT", {"default": 81, "min": 1, "max": 4096, "step": 4}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 4096}),
                "strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1000.0, "step": 0.01}),
                "vace_start_percent": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "vace_end_percent": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "control_start_frame": ("INT", {"default": 1, "min": 1, "max": 4096, "step": 1}),
                "frames_to_keep_in_control_video": ("STRING", {"default": ""}),
                "positions_of_positioned_frames": ("STRING", {"default": "20 30 50 90", "forceInput": True}),
                "start_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "positioned_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "end_frame_hold": ("INT", {"default": 1, "min": 1, "max": 240, "step": 1}),
                "empty_frame_level": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "control_mask_value": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "round": 0.01}),
                "resize_mode": (["stretch", "crop"], {"default": "stretch"}),
            },
            "optional": {
                "wan_vae": ("WANVAE",),
                "vae": ("VAE",),
                "clip_vision_output": ("CLIP_VISION_OUTPUT",),
                "control_video": ("IMAGE",),
                "start_image": ("IMAGE",),
                "positioned_frames": ("IMAGE",),
                "end_image": ("IMAGE",),
                "extra_reference_images": ("IMAGE",),
                "inpaint_mask": ("MASK",),
                "prev_vace_embeds": ("WANVIDIMAGE_EMBEDS",),
            },
        }

    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "LATENT", "WANVIDIMAGE_EMBEDS")
    RETURN_NAMES = ("positive", "negative", "latent", "vace_embeds")
    FUNCTION = "encode"
    CATEGORY = "Wan 2.1 Toolkit"
    DESCRIPTION = (
        "Wan 2.2 multi-ref bridge. Behaves like a Wan image-to-video prep node for positive/negative/latent, "
        "and also builds VACE embeds from pinned timeline refs."
    )

    def encode(
        self,
        positive,
        negative,
        width,
        height,
        num_frames,
        batch_size,
        strength,
        vace_start_percent,
        vace_end_percent,
        control_start_frame,
        frames_to_keep_in_control_video,
        positions_of_positioned_frames,
        start_frame_hold,
        positioned_frame_hold,
        end_frame_hold,
        empty_frame_level,
        control_mask_value,
        resize_mode,
        wan_vae=None,
        vae=None,
        clip_vision_output=None,
        control_video=None,
        start_image=None,
        positioned_frames=None,
        end_image=None,
        extra_reference_images=None,
        inpaint_mask=None,
        prev_vace_embeds=None,
    ):
        conditioning_vae = vae if vae is not None else wan_vae
        if conditioning_vae is None:
            raise ValueError("Wan 2.2 multi-ref node needs a VAE. Connect either vae or wan_vae.")

        selected_wan_vae = wan_vae if wan_vae is not None else vae

        timeline_frames = torch.full((num_frames, height, width, 3), empty_frame_level, dtype=torch.float32)
        timeline_masks = torch.ones((num_frames, height, width), dtype=torch.float32)
        reference_batches: List[torch.Tensor] = []

        if control_video is not None and control_video.shape[0] > 0:
            control_video = _resize_image_batch(control_video.float(), width, height, resize_mode)
            kept_frames = _parse_keep_frames_spec(frames_to_keep_in_control_video, control_video.shape[0])
            control_video = _select_image_frames(control_video, kept_frames)
            control_start_index = _parse_user_frame_index(str(control_start_frame), num_frames)
            usable_length = min(control_video.shape[0], max(0, num_frames - control_start_index))
            if usable_length > 0:
                timeline_frames[control_start_index : control_start_index + usable_length] = control_video[:usable_length]
                timeline_masks[control_start_index : control_start_index + usable_length] = control_mask_value

        if start_image is not None and start_image.shape[0] > 0:
            start_image = _single_frame(_resize_image_batch(start_image.float(), width, height, resize_mode))
            start_clip = _expand_clip(start_image, start_frame_hold)
            _place_clip(timeline_frames, timeline_masks, start_clip, 0, 0.0)
            reference_batches.append(start_image)

        if positioned_frames is not None and positioned_frames.shape[0] > 0:
            positioned_frames = _resize_image_batch(positioned_frames.float(), width, height, resize_mode)
            positions = _parse_frame_positions(positions_of_positioned_frames, num_frames)
            usable_count = min(positioned_frames.shape[0], len(positions))
            for index in range(usable_count):
                positioned_clip = _expand_clip(positioned_frames[index : index + 1], positioned_frame_hold)
                _place_clip(timeline_frames, timeline_masks, positioned_clip, positions[index], 0.0)
            if usable_count > 0:
                reference_batches.append(positioned_frames[:usable_count])

        if end_image is not None and end_image.shape[0] > 0:
            end_image = _single_frame(_resize_image_batch(end_image.float(), width, height, resize_mode))
            end_clip = _expand_clip(end_image, end_frame_hold)
            _place_end_clip(timeline_frames, timeline_masks, end_clip, -1, 0.0)
            reference_batches.append(end_image)

        if extra_reference_images is not None and extra_reference_images.shape[0] > 0:
            extra_reference_images = _resize_image_batch(extra_reference_images.float(), width, height, resize_mode)
            reference_batches.append(extra_reference_images)

        if inpaint_mask is not None:
            inpaint_mask = _resize_mask_batch(inpaint_mask.float(), width, height)
            inpaint_mask = _pad_or_trim_mask(inpaint_mask, num_frames)
            timeline_masks = inpaint_mask * timeline_masks

        ref_images = _concat_image_batches(reference_batches, width, height)

        graph = GraphBuilder()
        i2v_inputs = {
            "positive": positive,
            "negative": negative,
            "vae": conditioning_vae,
            "width": width,
            "height": height,
            "length": num_frames,
            "batch_size": batch_size,
        }
        if clip_vision_output is not None:
            i2v_inputs["clip_vision_output"] = clip_vision_output
        if start_image is not None and start_image.shape[0] > 0:
            i2v_inputs["start_image"] = start_image

        wan_i2v = graph.node("WanImageToVideo", **i2v_inputs)

        vace_inputs = {
            "vae": selected_wan_vae,
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "strength": strength,
            "vace_start_percent": vace_start_percent,
            "vace_end_percent": vace_end_percent,
            "input_frames": timeline_frames.cpu(),
            "input_masks": timeline_masks.cpu(),
        }
        if ref_images.shape[0] > 0:
            vace_inputs["ref_images"] = ref_images.cpu()
        if prev_vace_embeds is not None:
            vace_inputs["prev_vace_embeds"] = prev_vace_embeds

        wan22_vace = graph.node("WanVideoVACEEncode", **vace_inputs)
        return {
            "result": (
                wan_i2v.out(0),
                wan_i2v.out(1),
                wan_i2v.out(2),
                wan22_vace.out(0),
            ),
            "expand": graph.finalize(),
        }


class WanVideoFreezeFrames:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "frames": ("IMAGE",),
                "hold_frames": ("INT", {"default": 8, "min": 0, "max": 240, "step": 1}),
                "source_frame_index": ("INT", {"default": 0, "min": -4096, "max": 4096, "step": 1}),
                "mode": (
                    ["replace_existing", "prepend_and_trim", "prepend_and_extend"],
                    {"default": "replace_existing"},
                ),
            }
        }

    RETURN_TYPES = ("IMAGE", "INT")
    RETURN_NAMES = ("frames", "frame_count")
    FUNCTION = "process"
    CATEGORY = "Wan 2.1 Toolkit"
    DESCRIPTION = "Freezes the opening frames of a generated clip to hide Wan startup flicker."

    def process(self, frames, hold_frames, source_frame_index, mode):
        if frames is None or frames.shape[0] == 0 or hold_frames <= 0:
            return (frames, int(frames.shape[0]) if frames is not None else 0)

        frame_count = frames.shape[0]
        source_index = _resolve_index(source_frame_index, frame_count)
        source_frame = frames[source_index : source_index + 1]
        frozen_clip = source_frame.repeat((hold_frames, 1, 1, 1))

        if mode == "prepend_and_extend":
            out_frames = torch.cat([frozen_clip, frames], dim=0)
        elif mode == "prepend_and_trim":
            out_frames = torch.cat([frozen_clip, frames], dim=0)[:frame_count]
        else:
            out_frames = frames.clone()
            usable_length = min(hold_frames, frame_count)
            out_frames[:usable_length] = frozen_clip[:usable_length]

        return (out_frames.cpu(), int(out_frames.shape[0]))


NODE_CLASS_MAPPINGS = {
    "WanPositionedRefGallery": WanPositionedRefGallery,
    "WanMultiRefStack": WanMultiRefStack,
    "WanVaceMultiRefToVideo": WanVaceMultiRefToVideo,
    "Wan22VaceMultiRefEncode": Wan22VaceMultiRefEncode,
    "WanVideoFreezeFrames": WanVideoFreezeFrames,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WanPositionedRefGallery": "Wan Positioned Ref Gallery",
    "WanMultiRefStack": "Wan Multi Ref Stack",
    "WanVaceMultiRefToVideo": "Wan VACE Multi-Ref To Video",
    "Wan22VaceMultiRefEncode": "Wan 2.2 VACE Multi-Ref To Video",
    "WanVideoFreezeFrames": "Wan Video Freeze Frames",
}
