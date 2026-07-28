#!/usr/bin/env python3
"""
生成したイラスト（コーラル地・正方形または2:3）をアプリ用に加工して配置する。

    pip install Pillow
    python3 scripts/prepare_illustrations.py <入力ディレクトリ>

入力ディレクトリに「配置先と同じ名前」の画像を置いておく
（拡張子は .png / .jpg / .jpeg / .webp のどれでもよい）:

    cover-default.(png|jpg)    → 1024x1536・コーラル地のまま
    empty-suitcase.(png|jpg)   → 512x512・背景を透明に
    loading-map.(png|jpg)      → 512x512・背景を透明に
    packed-done.(png|jpg)      → 512x512・背景を透明に
    avatar-01.(png|jpg)        → 512x512・背景を透明に
    avatar-02.(png|jpg)        → 512x512・背景を透明に
    spot-bench-01.(png|jpg)    → 512x512・背景を透明に
    spot-bench-02.(png|jpg)    → 512x512・背景を透明に
    icon-home.(png|jpg)        → 512x512・背景を透明に
    icon-bed.(png|jpg)         → 512x512・背景を透明に

やること:
  1. 地色の正規化 … 四隅の色を背景色とみなし、ブランドのコーラル #F69B96 に snap
  2. 背景の透明化 … 表紙以外は、四隅からつながる背景だけをアルファ0にする
     （絵の中の似た色は塗りつぶし対象にならないので欠けない）
  3. リサイズ … 正方形は512、表紙は1024x1536
  4. public/illustrations/ に同名で上書き

見つかったファイルだけを処理する（全部そろっていなくてもよい）。
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "illustrations"

CORAL = (0xF6, 0x9B, 0x96)

SQUARE_NAMES = [
    "empty-suitcase",
    "loading-map",
    "packed-done",
    "avatar-01",
    "avatar-02",
    "spot-bench-01",
    "spot-bench-02",
    "icon-home",
    "icon-bed",
]
COVER_NAME = "cover-default"
EXTS = [".png", ".jpg", ".jpeg", ".webp"]

# 四隅からの塗りつぶしで「背景」とみなす色差。生成画像は地色が微妙に揺れるので広め。
FLOOD_TOLERANCE = 40


def close(a: tuple[int, int, int], b: tuple[int, int, int], tol: int) -> bool:
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


def corner_color(im: Image.Image) -> tuple[int, int, int]:
    """四隅の平均色（=地色）。"""
    w, h = im.size
    px = im.load()
    cs = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]
    return tuple(sum(c[i] for c in cs) // 4 for i in range(3))  # type: ignore[return-value]


def flood_mask(im: Image.Image, seed: tuple[int, int, int]) -> bytearray:
    """四隅からつながる地色領域のマスク（1=背景）。"""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        if not close(px[x, y][:3], seed, FLOOD_TOLERANCE):
            continue
        seen[y * w + x] = 1
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return seen


def prepare_square(src: Path, name: str) -> None:
    im = Image.open(src).convert("RGBA")
    bg = corner_color(im)
    mask = flood_mask(im, bg)
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            if mask[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
    # 正方形に整えて512へ（多少ずれていたら中央でクロップ）
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    im = im.resize((512, 512), Image.LANCZOS)
    out = OUT_DIR / f"{name}.png"
    im.save(out)
    print(f"ok  {src.name} -> {out.relative_to(ROOT)} (背景透明・512px)")


def prepare_cover(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    # 地色をブランドのコーラルへ snap（背景としてつながっている面だけ）
    bg = corner_color(im)
    mask = flood_mask(im, bg)
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            if mask[y * w + x]:
                px[x, y] = (*CORAL, 255)
    # 2:3 に整えて 1024x1536 へ
    target = 2 / 3
    if w / h > target:  # 横が広い → 左右を落とす
        nw = int(h * target)
        im = im.crop(((w - nw) // 2, 0, (w + nw) // 2, h))
    else:  # 縦が長い → 上を優先して残す（人物は下1/3にいる）
        nh = int(w / target)
        im = im.crop((0, h - nh, w, h))
    im = im.resize((1024, 1536), Image.LANCZOS)
    out = OUT_DIR / f"{COVER_NAME}.png"
    im.save(out)
    print(f"ok  {src.name} -> {out.relative_to(ROOT)} (コーラル地・1024x1536)")


def find(src_dir: Path, name: str) -> Path | None:
    for ext in EXTS:
        p = src_dir / f"{name}{ext}"
        if p.exists():
            return p
    return None


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    src_dir = Path(sys.argv[1])
    if not src_dir.is_dir():
        print(f"入力ディレクトリが見つからない: {src_dir}", file=sys.stderr)
        return 1

    handled = 0
    cover = find(src_dir, COVER_NAME)
    if cover:
        prepare_cover(cover)
        handled += 1
    for name in SQUARE_NAMES:
        p = find(src_dir, name)
        if p:
            prepare_square(p, name)
            handled += 1

    missing = [n for n in [COVER_NAME, *SQUARE_NAMES] if not find(src_dir, n)]
    if missing:
        print("\n未処理（入力に無い）: " + ", ".join(missing))
    print(f"\n{handled} 件を配置した。npm run web で表示を確認する。")
    return 0 if handled else 1


if __name__ == "__main__":
    raise SystemExit(main())
