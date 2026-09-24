"""Generate depth maps for the villa images with Depth Anything V2 (small, ONNX).

Usage:
  pip install onnxruntime pillow numpy
  curl -L -o depth_anything_v2_vits.onnx \
    https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx
  python3 tools/make_depth.py depth_anything_v2_vits.onnx arrival terrace living kitchen suite

Reads assets/villa/<name>.webp and writes assets/villa/<name>-depth.png
(8-bit, white = near). The site rebuilds each photo as 3D geometry from these.
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def main(model, names):
    sess = ort.InferenceSession(model)
    inp = sess.get_inputs()[0].name
    for name in names:
        img = Image.open(f"assets/villa/{name}.webp").convert("RGB")
        w, h = img.size
        x = np.asarray(img.resize((518, 518), Image.BICUBIC), np.float32) / 255.0
        x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
        d = sess.run(None, {inp: x})[0][0]
        d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        out = Image.fromarray((d * 255).astype(np.uint8)).resize((1024, int(1024 * h / w)), Image.BICUBIC)
        out.filter(ImageFilter.GaussianBlur(1.2)).save(f"assets/villa/{name}-depth.png", optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
