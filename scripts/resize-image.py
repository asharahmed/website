#!/usr/bin/env python3
"""Resize an image using Pillow."""
import sys
from PIL import Image

if len(sys.argv) != 4:
    sys.exit(1)

path = sys.argv[1]
width = int(sys.argv[2])
height = int(sys.argv[3])

img = Image.open(path)
img = img.resize((width, height), Image.LANCZOS)
img.save(path)
