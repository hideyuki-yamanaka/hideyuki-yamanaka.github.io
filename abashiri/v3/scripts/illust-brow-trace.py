#!/usr/bin/env python3
"""
人物イラスト（public/img/illust-main.png）から眉毛だけを切り出して
components/illustMainPaths.ts を作り直すスクリプト。

なぜ眉だけか:
  絵は1枚のPNGなので、そのままでは眉を動かせない。眉の形だけベクターにして
  「元の眉を肌色で塗りつぶす → その上に動く眉を重ねる」形にすると、
  絵の質感を落とさずに眉だけ持ち上げられる。

前提:
  potrace だけ（brew install potrace）。
  Pillow / numpy / scipy は使わない（この環境の Python が 3.8 で入らないため、
  PNG のデコードも連結成分も標準ライブラリだけで書いてある）。

使い方:
  python3 scripts/illust-brow-trace.py
  → components/illustMainPaths.ts を上書きする

イラストを描き直した時だけ実行すればよい。
うまく眉を拾えなかった時は、候補の一覧を出力するのでそれを見て
FACE_BAND / DARK_LUMA を調整すること。
"""
import os, re, struct, subprocess, sys, zlib
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "public", "img", "illust-main.png")
OUT = os.path.join(HERE, "..", "components", "illustMainPaths.ts")

# 線画とみなす明るさの上限（0-255）
DARK_LUMA = 110
# 元の眉を隠すパッチをどれだけ太らせるか（ヒデさん調整値 2026-08-19）
PATCH_SPREAD = 120
# 顔があるあたり（この外の黒い塊＝髪や輪郭は眉の候補から外す）
FACE_BAND = dict(x0=0.20, x1=0.75, y0=0.12, y1=0.38)   # 画像サイズに対する割合


# ── PNG デコード（8/16bit RGBA・非インタレースのみ） ───────────────
def load_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "PNGではない"
    w, h, bd, ct, _, _, interlace = struct.unpack(">IIBBBBB", d[16:29])
    assert ct == 6 and interlace == 0 and bd in (8, 16), f"未対応のPNG(bd={bd} ct={ct})"
    raw, i = b"", 8
    while i < len(d):
        ln = struct.unpack(">I", d[i:i + 4])[0]
        typ = d[i + 4:i + 8]
        if typ == b"IDAT":
            raw += d[i + 8:i + 8 + ln]
        i += 12 + ln
    data = zlib.decompress(raw)
    nch, bpc = 4, bd // 8
    bpp = nch * bpc                 # 1画素のバイト数
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        f = data[pos]; pos += 1
        line = bytearray(data[pos:pos + stride]); pos += stride
        if f == 1:
            for k in range(bpp, stride): line[k] = (line[k] + line[k - bpp]) & 255
        elif f == 2:
            for k in range(stride): line[k] = (line[k] + prev[k]) & 255
        elif f == 3:
            for k in range(stride):
                a = line[k - bpp] if k >= bpp else 0
                line[k] = (line[k] + ((a + prev[k]) >> 1)) & 255
        elif f == 4:
            for k in range(stride):
                a = line[k - bpp] if k >= bpp else 0
                b = prev[k]
                c = prev[k - bpp] if k >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[k] = (line[k] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    # 16bit は上位バイトだけ使って 8bit 相当にする
    step = bpc
    px = bytearray(w * h * 4)
    for i2 in range(w * h):
        s = i2 * bpp
        px[i2 * 4 + 0] = out[s]
        px[i2 * 4 + 1] = out[s + step]
        px[i2 * 4 + 2] = out[s + step * 2]
        px[i2 * 4 + 3] = out[s + step * 3]
    return w, h, px


# ── 連結成分（4近傍） ────────────────────────────────────────────
def components(dark, w, h):
    lab = [0] * (w * h)
    blobs = []
    n = 0
    for start in range(w * h):
        if not dark[start] or lab[start]:
            continue
        n += 1
        stack = [start]
        lab[start] = n
        minx = maxx = start % w
        miny = maxy = start // w
        area = 0
        while stack:
            q = stack.pop()
            qx, qy = q % w, q // w
            area += 1
            if qx < minx: minx = qx
            if qx > maxx: maxx = qx
            if qy < miny: miny = qy
            if qy > maxy: maxy = qy
            for nb, ok in ((q - 1, qx > 0), (q + 1, qx < w - 1), (q - w, qy > 0), (q + w, qy < h - 1)):
                if ok and dark[nb] and not lab[nb]:
                    lab[nb] = n
                    stack.append(nb)
        blobs.append(dict(id=n, area=area, x0=minx, x1=maxx, y0=miny, y1=maxy))
    return lab, blobs


def trace(mask_ids, lab, w, h, name, turd=4):
    """全画面サイズの PBM(P4) を作って potrace に流す"""
    rowbytes = (w + 7) // 8
    buf = bytearray(rowbytes * h)
    for i, v in enumerate(lab):
        if v in mask_ids:
            y, x = divmod(i, w)
            buf[y * rowbytes + (x >> 3)] |= 0x80 >> (x & 7)
    pbm = os.path.join(HERE, f"_brow_{name}.pbm")
    with open(pbm, "wb") as f:
        f.write(b"P4\n%d %d\n" % (w, h))
        f.write(bytes(buf))
    svg = subprocess.run(
        ["potrace", "-b", "svg", "-t", str(turd), "-a", "1.0", "-O", "0.35",
         "-u", "10", "-o", "-", pbm],
        capture_output=True, check=True).stdout.decode()
    os.remove(pbm)
    return [" ".join(m.split()) for m in re.findall(r'<path d="([^"]+)"', svg)]


def main():
    w, h, px = load_png(SRC)
    print(f"画像: {w}x{h}")

    dark = bytearray(w * h)
    for i in range(w * h):
        p = i * 4
        if px[p + 3] < 128:
            continue
        lum = (299 * px[p] + 587 * px[p + 1] + 114 * px[p + 2]) // 1000
        if lum < DARK_LUMA:
            dark[i] = 1

    lab, blobs = components(dark, w, h)
    bx0, bx1 = FACE_BAND["x0"] * w, FACE_BAND["x1"] * w
    by0, by1 = FACE_BAND["y0"] * h, FACE_BAND["y1"] * h
    cand = [b for b in blobs
            if 40 <= b["area"] <= 6000
            and bx0 <= b["x0"] and b["x1"] <= bx1
            and by0 <= b["y0"] and b["y1"] <= by1]
    print("顔まわりの候補:")
    for b in sorted(cand, key=lambda b: b["y0"]):
        print(f"  id={b['id']:3d} area={b['area']:5d} box=({b['x0']},{b['y0']}) "
              f"{b['x1']-b['x0']+1}x{b['y1']-b['y0']+1}")

    mid = (bx0 + bx1) / 2
    def topmost(side):
        pool = [b for b in cand if ((b["x0"] + b["x1"]) / 2 < mid) == side]
        if not pool:
            sys.exit("眉の候補が見つからない。FACE_BAND / DARK_LUMA を見直すこと")
        return min(pool, key=lambda b: b["y0"])
    left, right = topmost(True), topmost(False)
    print(f"眉と判定: 左 id={left['id']} box=({left['x0']},{left['y0']}) / "
          f"右 id={right['id']} box=({right['x0']},{right['y0']})")

    # 眉の色（実際の平均）と、眉のすぐ上の肌の色
    def avg(ids):
        r = g = b = k = 0
        for i, v in enumerate(lab):
            if v in ids:
                p = i * 4; r += px[p]; g += px[p+1]; b += px[p+2]; k += 1
        return "#%02X%02X%02X" % (r // k, g // k, b // k)
    brow_fill = avg({left["id"], right["id"]})

    skin = Counter()
    for b in (left, right):
        for y in range(max(0, b["y0"] - 14), b["y0"] - 4):
            for x in range(b["x0"], b["x1"] + 1):
                p = (y * w + x) * 4
                if px[p + 3] > 200:
                    skin[(px[p], px[p+1], px[p+2])] += 1
    skin_fill = "#%02X%02X%02X" % skin.most_common(1)[0][0]
    print(f"眉の色 {brow_fill} / 眉の上の肌色 {skin_fill}")

    dl = trace({left["id"]}, lab, w, h, "l")
    dr = trace({right["id"]}, lab, w, h, "r")
    print(f"パス数 左={len(dl)} 右={len(dr)}")

    fmt = lambda ds: ",\n    ".join('"%s"' % d for d in ds)
    ts = f'''/*
 * 人物イラストの眉毛のベクターデータ。
 *
 * イラスト本体は public/img/illust-main.png をそのまま使う（元絵の質感を落とさないため）。
 * 動かしたいのは眉毛だけなので、眉の形だけ potrace でトレースして切り出してある。
 * 生成スクリプトは scripts/illust-brow-trace.py。手で書き換えないこと。
 *
 * 座標系: 元PNGと同じ {w}x{h}。FLIP を掛けた内側で使う（potrace のY反転ぶん）。
 *
 * 重ね方（下 → 上）:
 *   illust-main.png → 元の眉を隠す肌色パッチ（動かない） → 動く眉
 * パッチは眉と同じ形を少し太らせたもの。眉が上がった時に、元の眉の跡が残らない。
 */

/** potrace 出力（10倍・Y反転）を元PNGの座標系に戻す変換 */
export const ILLUST_FLIP = "translate(0,{h}) scale(0.1,-0.1)";

export const ILLUST_VIEWBOX = {{ w: {w}, h: {h} }} as const;

/** 眉の色（元絵の眉の平均色） */
export const BROW_FILL = "{brow_fill}";

/** 元の眉を隠すパッチの色（眉のすぐ上の額の色） */
export const SKIN_FILL = "{skin_fill}";

/**
 * パッチをどれだけ太らせるか。ILLUST_FLIP の中の単位なので、
 * 画面上では ×0.1 ×(表示幅/{w}) になる。
 * {PATCH_SPREAD} ＝ 元画像で約{PATCH_SPREAD/10:.0f}px、本番表示(162px幅)で約{PATCH_SPREAD/10*162/w:.1f}px ぶん。
 */
export const PATCH_SPREAD = {PATCH_SPREAD};

export const BROW_D = {{
  left: [
    {fmt(dl)},
  ],
  right: [
    {fmt(dr)},
  ],
}} as const;

/** 左右まとめた眉のパス */
export const BROW_ALL: readonly string[] = [...BROW_D.left, ...BROW_D.right];
'''
    open(OUT, "w").write(ts)
    print("書き出し:", os.path.relpath(OUT, os.path.join(HERE, "..")))


main()
