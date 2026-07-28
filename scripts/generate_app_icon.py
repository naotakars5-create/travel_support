#!/usr/bin/env python3
"""
アプリアイコン一式を、ブランドイラストのスーツケースから生成する。

元絵は assets/brand/app-icon-source.png（コーラル地・クリームのスーツケース・
ローズの荷札）。ここからアイコンに必要なサイズ・形をすべて作る。
ロゴ（燕）は scripts/generate_logo.py が管理し、あちらはアプリ内表示用の
logo-mark / logo-wordmark だけを出力する。アイコンはこのスクリプトが受け持つ。

    pip install Pillow
    python3 scripts/generate_app_icon.py

出力:
  assets/images/icon.png                   アプリアイコン（コーラル地・1024）
  assets/images/favicon.png                ファビコン（64）
  assets/images/splash-icon.png            スプラッシュ（透過・512）
  assets/images/android-icon-foreground.png  Android前景（透過・セーフゾーン内）
  assets/images/android-icon-background.png  Android背景（コーラル無地）
  assets/images/android-icon-monochrome.png  Androidモノクロ（白シルエット）
  public/apple-touch-icon.png              iOS ホーム画面（コーラル地・180）
"""
from PIL import Image
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "brand" / "app-icon-source.png"

CORAL = (246, 155, 150)

# 地色とみなす色差（元絵の地はJPEG由来の揺れがある）
TOL = 40


def close(a, b, tol=TOL):
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


def load_subject() -> Image.Image:
    """元絵から地色を透明にし、絵の範囲でトリミングした透過画像を返す。"""
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[5, 5][:3]
    for y in range(h):
        for x in range(w):
            if close(px[x, y][:3], bg):
                px[x, y] = (0, 0, 0, 0)
    box = im.getbbox()
    return im.crop(box)


def on_coral(subject: Image.Image, size: int, scale: float) -> Image.Image:
    """コーラル無地の正方形に、絵を中央配置する。scale は絵の長辺／キャンバス比。"""
    canvas = Image.new("RGBA", (size, size), (*CORAL, 255))
    s = int(size * scale)
    ratio = min(s / subject.width, s / subject.height)
    fitted = subject.resize((max(1, int(subject.width * ratio)), max(1, int(subject.height * ratio))), Image.LANCZOS)
    canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2), fitted)
    return canvas


def transparent(subject: Image.Image, size: int, scale: float) -> Image.Image:
    """透明地の正方形に、絵を中央配置する。"""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = int(size * scale)
    ratio = min(s / subject.width, s / subject.height)
    fitted = subject.resize((max(1, int(subject.width * ratio)), max(1, int(subject.height * ratio))), Image.LANCZOS)
    canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2), fitted)
    return canvas


def monochrome(subject: Image.Image, size: int, scale: float) -> Image.Image:
    """アルファから白1色のシルエットを作る（Androidのテーマアイコン用）。"""
    t = transparent(subject, size, scale)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    opx = out.load()
    tpx = t.load()
    for y in range(size):
        for x in range(size):
            a = tpx[x, y][3]
            if a:
                opx[x, y] = (255, 255, 255, a)
    return out


def save(im: Image.Image, rel: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print(f"  {rel}  {im.size[0]}x{im.size[1]}")


def main() -> None:
    subject = load_subject()
    print("アプリアイコンを生成:")
    save(on_coral(subject, 1024, 0.68).convert("RGB"), "assets/images/icon.png")
    save(on_coral(subject, 64, 0.80).convert("RGB"), "assets/images/favicon.png")
    save(transparent(subject, 512, 0.92), "assets/images/splash-icon.png")
    # Android アダプティブアイコンは中央 66% がセーフゾーン。前景は小さめに置く
    save(transparent(subject, 1024, 0.52), "assets/images/android-icon-foreground.png")
    save(Image.new("RGB", (1024, 1024), CORAL), "assets/images/android-icon-background.png")
    save(monochrome(subject, 1024, 0.52), "assets/images/android-icon-monochrome.png")
    save(on_coral(subject, 180, 0.72).convert("RGB"), "public/apple-touch-icon.png")


if __name__ == "__main__":
    main()
