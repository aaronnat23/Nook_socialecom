# Bundled models

`u2netp.onnx` is the small (4.6 MB) U²-Net "portable" salient-object model, used by `app/cutout.py` to remove the background from product photos on the CPU with onnxruntime.

- Source: https://github.com/xuebinqin/U-2-Net (Apache-2.0), ONNX export as distributed with https://github.com/danielgatis/rembg
- SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`

Any U²-Net-family ONNX model (320×320 input, ImageNet normalisation, single saliency output), such as `silueta` or `u2net`, can be dropped in by setting `CUTOUT_MODEL_PATH`. Larger models cut hair and fine detail more cleanly but are slower.
