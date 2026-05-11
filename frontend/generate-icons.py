#!/usr/bin/env python3
"""
Generate PWA icons for Company Log.
Run once from the frontend/ directory:
    python generate-icons.py

No pip packages required — pure Python stdlib only.
Produces:
    public/icons/icon-192.png  (192x192)
    public/icons/icon-512.png  (512x512)

Design: Company Log green (#22c55e) background with a white
        rounded-rectangle foreground (document/chat-window motif).
"""
import os
import struct
import zlib


def in_rounded_rect(x: int, y: int, rx: int, ry: int, rw: int, rh: int, r: int) -> bool:
    """Return True if pixel (x, y) is inside a rounded rectangle."""
    lx, ly = x - rx, y - ry
    if lx < 0 or ly < 0 or lx >= rw or ly >= rh:
        return False
    in_l = lx < r
    in_r = lx >= rw - r
    in_t = ly < r
    in_b = ly >= rh - r
    if in_l and in_t:
        return (lx - r) ** 2 + (ly - r) ** 2 <= r * r
    if in_r and in_t:
        return (lx - (rw - r)) ** 2 + (ly - r) ** 2 <= r * r
    if in_l and in_b:
        return (lx - r) ** 2 + (ly - (rh - r)) ** 2 <= r * r
    if in_r and in_b:
        return (lx - (rw - r)) ** 2 + (ly - (rh - r)) ** 2 <= r * r
    return True


def make_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)


def generate_png(size: int) -> bytes:
    """
    Render a size×size RGB PNG.
    Background : #22c55e  (34, 197,  94)  — Company Log green
    Foreground : #ffffff  (255, 255, 255) — white rounded rect
    """
    BG = (34, 197, 94)
    FG = (255, 255, 255)

    pad = int(size * 0.18)
    rw = rh = size - 2 * pad
    r   = int(size * 0.14)

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # PNG filter byte: None
        for x in range(size):
            color = FG if in_rounded_rect(x, y, pad, pad, rw, rh, r) else BG
            rows.extend(color)

    compressed = zlib.compress(bytes(rows), 9)

    PNG_SIG = b'\x89PNG\r\n\x1a\n'
    # IHDR: width(4) height(4) bit-depth(1) color-type=2-RGB(1) compress(1) filter(1) interlace(1)
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    idat = make_chunk(b'IDAT', compressed)
    iend = make_chunk(b'IEND', b'')
    return PNG_SIG + ihdr + idat + iend


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(script_dir, 'public', 'icons')
    os.makedirs(out_dir, exist_ok=True)

    for size in (192, 512):
        data = generate_png(size)
        path = os.path.join(out_dir, f'icon-{size}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  icon-{size}.png  ({len(data):,} bytes)')

    print('\nDone — icons written to public/icons/')
    print('Next: npm run build  (icons are included automatically)')
