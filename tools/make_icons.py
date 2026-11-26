"""產生網頁圖示的 PNG 版本（設計與 favicon.svg 相同），不需要額外套件。
用法：python tools/make_icons.py
"""
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

BG, RIM, YEL, RED, INK, HI = map(hexrgb, ['#2f3421', '#4a5135', '#e9b824', '#d6372e', '#1d1b14', '#ff9a8f'])

def rrect(x, y, x0, y0, x1, y1, r):
    """點是否在圓角矩形內（座標為 64 格的 SVG 座標）"""
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

LINES = [(32, 6, 32, 19), (32, 45, 32, 58), (6, 32, 19, 32), (45, 32, 58, 32)]

def color_at(x, y):
    """依 SVG 的圖層順序，回傳該點顏色（None 表示透明）"""
    c = None
    if rrect(x, y, 0, 0, 64, 64, 14):
        c = BG
        inner = rrect(x, y, 4, 4, 60, 60, 10)
        if rrect(x, y, 2, 2, 62, 62, 12) and not inner:
            c = RIM
    else:
        return None
    d = math.hypot(x - 32, y - 32)
    if abs(d - 17) <= 2.5:
        c = YEL
    if any(seg_dist(x, y, *l) <= 2.5 for l in LINES):
        c = YEL
    if d <= 8.5:
        c = INK
    if d <= 7.5:
        c = RED
    if math.hypot(x - 29.5, y - 29.5) <= 2:
        c = HI
    return c

def render(size, ss=4):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + .5) / ss) * 64 / size
                    y = (py + (sy + .5) / ss) * 64 / size
                    c = color_at(x, y)
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += 1
            n = ss * ss
            if a:
                row += bytes([r // a, g // a, b // a, 255 * a // n])
            else:
                row += bytes([0, 0, 0, 0])
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

if __name__ == '__main__':
    for name, size in [('favicon-32.png', 32), ('apple-touch-icon.png', 180)]:
        (ROOT / name).write_bytes(render(size))
        print('wrote', name, size)
