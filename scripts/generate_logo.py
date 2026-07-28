#!/usr/bin/env python3
"""
つばめみち のロゴ一式を生成する。

デザインの考え方:
  燕（つばめ）を家紋のように左右対称へ整理し、その下に一本の道を引く。
  燕の尾の V 字は「経路の分岐」、下の線は「一本につながった道」を指す。
  色はアプリと同じ クリーム #F5EAD6 / 墨 #1A1A1A / ローズレッド #DD5967 の3色だけ。

出力:
  public/illustrations/logo-mark.png       マークのみ（透過）
  public/illustrations/logo-wordmark.png   マーク＋「つばめみち」（透過）

アプリアイコン等は scripts/generate_app_icon.py（スーツケースのイラスト）が出力する。
"""
from PIL import Image, ImageDraw, ImageFont
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
KINARI = (245, 234, 214, 255)
INK = (26, 26, 26, 255)
ACCENT = (221, 89, 103, 255)

SS = 4  # スーパーサンプリング倍率（縮小してアンチエイリアスを得る）


def cubic(p0, p1, p2, p3, n=90):
    """3次ベジェを点列に変換する。"""
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
        y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        pts.append((x, y))
    return pts


def swallow_outline():
    """
    1000x1000 の設計枠に描く燕の輪郭（左右対称）。右半分だけ定義し x=500 で折り返す。

    燕らしさは3点で決まる:
      - 肩が細いこと（太いと烏賊の胴に見える）
      - 翼が後ろへ強く反り、先へ向かって薄くなること
      - 尾が細く深く割れていること（この V が経路の分岐を指す）
    """
    right = []
    right += cubic((500, 132), (524, 142), (552, 196), (568, 262))      # 頭 → 肩（細く絞る）
    right += cubic((568, 262), (716, 318), (870, 448), (962, 586))[1:]  # 翼の前縁 → 翼端
    right += cubic((962, 586), (830, 540), (690, 470), (560, 438))[1:]  # 翼端 → 後縁（脇を深くえぐる）
    right += cubic((560, 438), (566, 560), (590, 720), (626, 884))[1:]  # 細い胴 → 尾の先
    right += cubic((626, 884), (588, 800), (548, 716), (500, 650))[1:]  # 尾の先 → 中央の切れ込み
    left = [(1000 - x, y) for (x, y) in reversed(right)][1:]
    return right + left


def draw_mark(size, ink=INK, accent=ACCENT, road=True, pad=0.0):
    """マーク（燕＋道）を透過画像で返す。pad は周囲の余白比率。"""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    inner = 1.0 - pad * 2
    def sx(v):
        return (pad + v / 1000 * inner) * s

    d.polygon([(sx(x), sx(y)) for (x, y) in swallow_outline()], fill=ink)

    if road:
        # 道：わずかに右上がりの一本線。多分割で描くと継ぎ目が出るので、
        # 直線1本＋両端の丸で「途切れず続く道」を作る。
        a, b, w = (268, 964), (732, 936), 34
        r = (sx(w) - sx(0)) / 2
        d.line([(sx(a[0]), sx(a[1])), (sx(b[0]), sx(b[1]))], fill=accent, width=int(r * 2))
        for e in (a, b):
            d.ellipse([sx(e[0]) - r, sx(e[1]) - r, sx(e[0]) + r, sx(e[1]) + r], fill=accent)

    return img.resize((size, size), Image.LANCZOS)


def trimmed_mark(ink=INK, accent=ACCENT, road=True, size=2048):
    """マークを描いて、余白を切り落とした画像を返す（中央合わせを正確にするため）。"""
    img = draw_mark(size, ink=ink, accent=accent, road=road)
    box = img.getbbox()
    return img.crop(box)


def centered(mark, canvas_px, content_ratio, bg=None):
    """マークを正方形カンバスの中央に、指定の占有率で配置する。"""
    w, h = mark.size
    scale = (canvas_px * content_ratio) / max(w, h)
    m = mark.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (canvas_px, canvas_px), bg if bg else (0, 0, 0, 0))
    out.alpha_composite(m, ((canvas_px - m.size[0]) // 2, (canvas_px - m.size[1]) // 2))
    return out


def mincho(px):
    path = ROOT / "node_modules/@expo-google-fonts/zen-old-mincho/700Bold/ZenOldMincho_700Bold.ttf"
    return ImageFont.truetype(str(path), px)


def gothic(px):
    path = ROOT / "node_modules/@expo-google-fonts/noto-sans-jp/500Medium/NotoSansJP_500Medium.ttf"
    return ImageFont.truetype(str(path), px)


def save(img, rel):
    out = ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"  {rel}  {img.size[0]}x{img.size[1]}")


def main():
    print("つばめみち ロゴを生成:")
    mark = trimmed_mark()

    save(centered(mark, 1024, 0.92), "public/illustrations/logo-mark.png")

    # ワードマーク：マーク／「つばめみち」／TSUBAMEMICHI を縦に積む
    W = 1400
    m = mark.copy()
    m.thumbnail((760, 760), Image.LANCZOS)
    top = 40
    gap = 96
    f1, f2 = mincho(190), gothic(50)
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    b1 = probe.textbbox((0, 0), "つばめみち", font=f1)
    b2 = probe.textbbox((0, 0), "T S U B A M E M I C H I", font=f2)
    y1 = top + m.size[1] + gap
    y2 = y1 + (b1[3] - b1[1]) + 56
    H = y2 + (b2[3] - b2[1]) + 40

    word = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    word.alpha_composite(m, ((W - m.size[0]) // 2, top))
    d = ImageDraw.Draw(word)
    d.text(((W - (b1[2] - b1[0])) / 2 - b1[0], y1 - b1[1]), "つばめみち", font=f1, fill=INK)
    d.text(((W - (b2[2] - b2[0])) / 2 - b2[0], y2 - b2[1]), "T S U B A M E M I C H I", font=f2, fill=(110, 103, 92, 255))
    save(word, "public/illustrations/logo-wordmark.png")

    # アプリアイコン・ファビコン・スプラッシュ等は scripts/generate_app_icon.py が
    # ブランドイラストのスーツケースから生成する（ここでは上書きしない）


if __name__ == "__main__":
    main()
