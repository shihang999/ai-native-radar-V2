#!/usr/bin/env python3
"""生成 public/images/book-placeholder.png：768x1024 浅灰蓝底 + 灰色打开书本图标"""
import zlib
import struct
import os

W, H = 768, 1024
BG = (0xF1, 0xF5, 0xF9)      # #F1F5F9
FG = (0xCB, 0xD5, 0xE1)      # #CBD5E1

# 书本图标几何参数（居中，宽约 360，高约 260）
cx, cy = W // 2, H // 2 - 40
half_w, book_h, spine_w = 180, 260, 14
top_y, bot_y = cy - book_h // 2, cy + book_h // 2
arc = 36  # 书页上缘弧度抬升

def in_book(x, y):
    """判断像素是否在书本轮廓内（左右两页 + 中缝）"""
    if y < top_y or y > bot_y:
        return False
    dx = abs(x - cx)
    if dx > half_w:
        return False
    # 上边缘：从书脊向外侧下倾的弧线（打开书本形态）
    t = dx / half_w
    edge_top = top_y + arc * t
    if y < edge_top:
        return False
    # 中缝留白（书脊处一条竖线不填色）
    if dx < spine_w // 2:
        return False
    return True

rows = []
for y in range(H):
    row = bytearray()
    row.append(0)  # filter: None
    for x in range(W):
        row += bytes(FG if in_book(x, y) else BG)
    rows.append(bytes(row))

raw = b"".join(rows)

def chunk(tag, data):
    c = struct.pack(">I", len(data)) + tag + data
    c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return c

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(raw, 9))
png += chunk(b"IEND", b"")

out = os.path.join(os.path.dirname(__file__), "..", "public", "images", "book-placeholder.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "wb") as f:
    f.write(png)
print("written:", os.path.abspath(out), len(png), "bytes")
