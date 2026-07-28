#!/usr/bin/env python3
"""
public/illustrations/ の絵を、新しいブランドパレットへ塗り替える。

新しいテイスト（フラットベクター・太い黒線・コーラルピンク地）へ差し替えるまでの
つなぎとして、既存の絵の「色だけ」を新パレットに寄せるための一度きりのスクリプト。
絵そのものを描き直したら、このスクリプトは不要になる。

    pip install Pillow
    python3 scripts/recolor_illustrations.py

対応:
  マスタード  #E9AC2F → コーラル #F69B96
  テラコッタ  #D8704C → ローズ   #DD5967
  紙のクリーム #E6D5C1 → 砂       #EFDFC5
  墨          #111111 → 墨       #1A1A1A
  表紙の地色（四隅からつながる面）→ コーラル #F69B96

アンチエイリアス部分は「一番近い元の色」との差分を新しい色に足し直すので、
輪郭のなめらかさが保たれる。
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ILLUST_DIR = ROOT / "public" / "illustrations"

# 元の色 → 新しい色
MAPPING: list[tuple[tuple[int, int, int], tuple[int, int, int]]] = [
    ((0x11, 0x11, 0x11), (0x1A, 0x1A, 0x1A)),  # 墨
    ((0xE9, 0xAC, 0x2F), (0xF6, 0x9B, 0x96)),  # マスタード → コーラル
    ((0xD8, 0x70, 0x4C), (0xDD, 0x59, 0x67)),  # テラコッタ → ローズ
    ((0xE6, 0xD5, 0xC1), (0xEF, 0xDF, 0xC5)),  # 紙のクリーム → 砂
    ((0xFF, 0xFF, 0xFF), (0xFF, 0xFF, 0xFF)),  # 透明部の白は触らない
]

CORAL = (0xF6, 0x9B, 0x96)
CREAM = (0xF5, 0xEA, 0xD6)

# 表紙だけは地色をコーラルで塗る（他はすべて背景が透明）。
# 地がコーラルになる以上、その上のマスタードはコーラルにできない（同化して消える）ので、
# 表紙にかぎってマスタードはクリームへ送る。参照イラストと同じ「コーラル地＋クリーム＋ローズ＋黒」になる。
COVER = "cover-default.png"
COVER_MAPPING = [((0xE9, 0xAC, 0x2F), CREAM) if src == (0xE9, 0xAC, 0x2F) else (src, dst) for src, dst in MAPPING]
# 表紙の地色を塗り分ける許容差（四隅からの塗りつぶし）
FLOOD_TOLERANCE = 26


def clamp(v: int) -> int:
    return 0 if v < 0 else 255 if v > 255 else v


def remap(px: tuple[int, int, int], mapping=MAPPING) -> tuple[int, int, int]:
    """一番近い元の色を見つけ、その差分を新しい色に足し直す。"""
    r, g, b = px
    src, dst = min(mapping, key=lambda m: (r - m[0][0]) ** 2 + (g - m[0][1]) ** 2 + (b - m[0][2]) ** 2)
    return (clamp(dst[0] + r - src[0]), clamp(dst[1] + g - src[1]), clamp(dst[2] + b - src[2]))


def close(a: tuple[int, int, int], b: tuple[int, int, int], tol: int) -> bool:
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


def flood_background(im: Image.Image, fill: tuple[int, int, int]) -> None:
    """四隅からつながっている面だけを塗る（絵の中のクリームは残す）。"""
    w, h = im.size
    px = im.load()
    seed = px[0, 0][:3]
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for start in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        q.append(start)
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        if not close(px[x, y][:3], seed, FLOOD_TOLERANCE):
            continue
        seen[y * w + x] = 1
        px[x, y] = (*fill, px[x, y][3])
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))


def recolor(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    mapping = COVER_MAPPING if path.name == COVER else MAPPING
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            px[x, y] = (*remap((r, g, b), mapping), a)
    if path.name == COVER:
        # 表紙は地をコーラルにして、絵の中のクリームは残す
        # （remap 後の地色はクリームなので、そこからの塗りつぶしになる）
        flood_background(im, CORAL)
        # 塗り残した地の縁（アンチエイリアス）が白く浮かないように、
        # 絵の中のクリームは砂ではなくクリームへ戻す
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a and close((r, g, b), (0xEF, 0xDF, 0xC5), 6):
                    px[x, y] = (*CREAM, a)
    im.save(path)
    print(f"recolored {path.relative_to(ROOT)}")


def main() -> int:
    files = sorted(ILLUST_DIR.glob("*.png"))
    if not files:
        print(f"no illustrations under {ILLUST_DIR}", file=sys.stderr)
        return 1
    for f in files:
        recolor(f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
