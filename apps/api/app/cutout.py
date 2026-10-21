"""Background removal for product photos.

Runs a small U²-Net model on the CPU through onnxruntime. The model ships with the repository so the
feature works offline; set CUTOUT_MODEL_PATH to use a larger U²-Net-family model instead.
"""

from __future__ import annotations

import os
import threading
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from .config import ROOT, settings

MODEL_PATH = Path(settings.cutout_model_path) if settings.cutout_model_path else ROOT / "apps/api/models/u2netp.onnx"
MAX_SIDE = 1600
_session: object | None = None
_load_lock = threading.Lock()
# Inference is CPU heavy; never run more than two cut-outs at once.
slots = threading.BoundedSemaphore(2)


class CutoutUnavailable(RuntimeError):
    """The model or runtime is not installed on this server."""


class CutoutFailed(ValueError):
    """The photo could not be separated from its background."""


def _load() -> object:
    global _session
    with _load_lock:
        if _session is None:
            try:
                import onnxruntime as ort
            except ImportError as exc:  # pragma: no cover - depends on the install
                raise CutoutUnavailable("onnxruntime is not installed") from exc
            if not MODEL_PATH.exists():
                raise CutoutUnavailable(f"model not found at {MODEL_PATH}")
            options = ort.SessionOptions()
            options.intra_op_num_threads = max(1, min(4, os.cpu_count() or 1))
            _session = ort.InferenceSession(str(MODEL_PATH), options, providers=["CPUExecutionProvider"])
    return _session


def _saliency(im: Image.Image) -> Image.Image:
    session = _load()
    meta = session.get_inputs()[0]  # type: ignore[attr-defined]
    side = meta.shape[2] if isinstance(meta.shape[2], int) else 320
    arr = np.asarray(im.convert("RGB").resize((side, side), Image.Resampling.LANCZOS), dtype=np.float32)
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    normalised: np.ndarray = ((arr / max(float(arr.max()), 1e-6)) - mean) / std
    batch = normalised.transpose(2, 0, 1)[None].astype(np.float32)
    out = session.run(None, {meta.name: batch})[0][0, 0]  # type: ignore[attr-defined]
    out = (out - out.min()) / max(float(out.max() - out.min()), 1e-6)
    mask = Image.fromarray((out * 255).astype(np.uint8), "L")
    return mask.resize(im.size, Image.Resampling.LANCZOS)


def _keep_main_objects(mask: Image.Image) -> Image.Image:
    """Drops stray specks: keeps components that are at least 4% of the biggest one."""
    small = mask.copy()
    small.thumbnail((256, 256))
    grid = np.asarray(small) > 90
    h, w = grid.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes: list[int] = [0]
    for y in range(h):
        for x in range(w):
            if not grid[y, x] or labels[y, x]:
                continue
            label = len(sizes)
            labels[y, x] = label
            queue = deque([(y, x)])
            count = 0
            while queue:
                cy, cx = queue.popleft()
                count += 1
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and grid[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = label
                        queue.append((ny, nx))
            sizes.append(count)
    if len(sizes) <= 1:
        return mask
    biggest = max(sizes)
    keep = np.isin(labels, [i for i, s in enumerate(sizes) if i and s >= biggest * 0.04])
    keep_img = Image.fromarray((keep * 255).astype(np.uint8), "L").resize(mask.size, Image.Resampling.BILINEAR)
    keep_img = keep_img.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3))
    return Image.fromarray(np.minimum(np.asarray(mask), np.asarray(keep_img)), "L")


def remove_background(source: Image.Image) -> Image.Image:
    """Returns the product on a transparent background, cropped to its edges."""
    im = source.convert("RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    with slots:
        soft = _saliency(im)
    values = np.asarray(soft, dtype=np.float32) / 255
    # a steeper curve than the raw saliency map gives clean edges without hard stair-steps
    t = np.clip((values - 0.38) / 0.34, 0, 1)
    alpha = Image.fromarray((t * t * (3 - 2 * t) * 255).astype(np.uint8), "L")
    alpha = _keep_main_objects(alpha)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    coverage = float((np.asarray(alpha) > 128).mean())
    if coverage < 0.012:
        raise CutoutFailed("We couldn't find a clear product in this photo. Try a photo with the item in focus.")
    if coverage > 0.97:
        raise CutoutFailed("The product fills the whole photo, so there's no background to remove.")
    out = im.convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 12 else 0).getbbox()
    if not box:
        raise CutoutFailed("We couldn't find a clear product in this photo.")
    pad = int(max(box[2] - box[0], box[3] - box[1]) * 0.03)
    box = (
        max(0, box[0] - pad),
        max(0, box[1] - pad),
        min(out.width, box[2] + pad),
        min(out.height, box[3] + pad),
    )
    return out.crop(box)
