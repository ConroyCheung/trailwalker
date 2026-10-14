"""Generate maskable trail-blaze PNGs without extra deps."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def png(width: int, height: int, rgba_rows: list[bytes]) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + row for row in rgba_rows)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def color(hex_color: str) -> tuple[int, int, int, int]:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r, g, b, 255


def in_tri(px: float, py: float, a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> bool:
    def sign(p1, p2, p3) -> float:
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    d1, d2, d3 = sign((px, py), a, b), sign((px, py), b, c), sign((px, py), c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)


def render(size: int) -> bytes:
    bg = color("0c1612")
    moss = color("234833")
    mist = color("d7e4db")
    sand = color("c9a66b")
    blaze = color("e07a3d")
    rows = []
    s = float(size)
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            pix = bg
            if in_tri(px, py, (0.08 * s, 0.74 * s), (0.34 * s, 0.36 * s), (0.92 * s, 0.74 * s)):
                pix = moss
            if in_tri(px, py, (0.34 * s, 0.36 * s), (0.50 * s, 0.56 * s), (0.70 * s, 0.28 * s)):
                pix = mist
            if (px - 0.76 * s) ** 2 + (py - 0.24 * s) ** 2 <= (0.08 * s) ** 2:
                pix = sand
            if abs(px - 0.50 * s) <= 0.045 * s and 0.58 * s <= py <= 0.86 * s:
                pix = blaze
            row.extend(pix)
        rows.append(bytes(row))
    return png(size, size, rows)


def main() -> None:
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        target = OUT / name if size != 180 else ROOT / "public" / name
        target.write_bytes(render(size))
        print("wrote", target)


if __name__ == "__main__":
    main()
