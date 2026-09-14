#!/usr/bin/env python3
"""
人物イラスト「たまんねーっ」(public/img/illust-main.png) を
ベクター化して components/illustMainPaths.ts を作り直すスクリプト。

眉毛だけ動かしたいのに 1枚のPNGでは動かせなかったので、色ごとのレイヤーに
分けてトレースし、眉毛だけ別データに切り出している。眉が上にずれても
下から肌色レイヤーが出るので、抜けた跡は残らない。

使い方（potrace と Pillow/numpy/scipy が要る）:
    brew install potrace
    python3 -m venv venv && venv/bin/pip install pillow numpy scipy
    venv/bin/python scripts/illust-trace.py
    # 出力された illustMainPaths.ts を components/ にコピーする

イラストを描き直した時だけ実行すればよい。
"""
import re, subprocess, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "img", "illust-main.png")
a = np.array(Image.open(SRC).convert("RGBA")).astype(np.int16)
rgb, al = a[..., :3], a[..., 3]
H, W = al.shape
opaque = al > 128

PAL = {"black": (0,0,0), "dark": (35,34,34), "gray": (205,204,204),
       "skin": (252,228,211), "cheek": (252,208,189), "white": (255,255,255)}
names = list(PAL)
cols = np.array([PAL[n] for n in names])
idx = np.linalg.norm(rgb[:,:,None,:] - cols[None,None,:,:], axis=3).argmin(axis=2)
M = {n: (idx == i) & opaque for i, n in enumerate(names)}

S8 = np.ones((3,3), bool)
fill = ndi.binary_fill_holes
dil  = lambda m, n=1: ndi.binary_dilation(m, S8, iterations=n)

def despeckle(m, minpx):
    """AA fringes get mis-classified into neighbouring colours; drop the crumbs."""
    lab, n = ndi.label(m, structure=S8)
    if n == 0: return m
    keep = np.flatnonzero(ndi.sum(m, lab, range(1, n + 1)) >= minpx) + 1
    return np.isin(lab, keep)

# --- eyebrows: isolated components of the ink layer -------------------------
ink = M["black"] | M["dark"]
lab, _ = ndi.label(ink, structure=S8)
BROW_IDS = []
for i, sl in enumerate(ndi.find_objects(lab), 1):
    ys, xs = sl
    # forehead band, small, wide-and-flat  → eyebrow
    if 190 <= ys.start <= 240 and 190 <= xs.start <= 400 and (lab[sl] == i).sum() < 1200 \
       and (xs.stop - xs.start) > 1.2 * (ys.stop - ys.start):
        BROW_IDS.append(i)
assert len(BROW_IDS) == 2, BROW_IDS
BROW_IDS.sort(key=lambda i: ndi.find_objects(lab)[i-1][1].start)   # 左→右
brow_left, brow_right = (lab == BROW_IDS[0]), (lab == BROW_IDS[1])
brows = brow_left | brow_right
print("brow components L/R:", BROW_IDS, "px:", brow_left.sum(), brow_right.sum())

# eye whites = white blobs that are not the outer sticker halo
wl, _ = ndi.label(M["white"], structure=S8)
sizes = ndi.sum(M["white"], wl, range(1, wl.max() + 1))
halo = int(np.argmax(sizes)) + 1
eyewhite = (wl > 0) & (wl != halo)

# --- layer stack, bottom → top ---------------------------------------------
LAYERS = [
    ("halo",  fill(opaque),                                  "#FFFFFF", 40),
    ("gray",  dil(fill(despeckle(M["gray"],  400))),         "#CDCCCC", 40),
    ("skin",  dil(fill(despeckle(M["skin"],  400))),         "#FCE4D3", 40),
    ("eyes",  dil(despeckle(eyewhite, 100)),                 "#FFFFFF", 20),
    ("cheek", dil(fill(despeckle(M["cheek"], 250))),         "#FCD0BD", 40),
    ("hair",  despeckle(M["dark"]  & ~brows, 40),            "#232222",  8),
    ("line",  despeckle(M["black"] & ~brows, 40),            "#000000",  8),
]
BROW_LAYERS = [("browL", brow_left, "#232222", 4), ("browR", brow_right, "#232222", 4)]
BROW_FILL = "#232222"

PATH_RE = re.compile(r'<path d="([^"]+)"')
def trace(mask, name, turd=8):
    pbm = f"m_{name}.pbm"
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("1").save(pbm)
    out = subprocess.run(["potrace", "-b", "svg", "-t", str(turd), "-a", "1.0",
                          "-O", "0.35", "-u", "10", "-o", "-", pbm],
                         capture_output=True, check=True).stdout.decode()
    # potrace は d 属性を途中で改行する。TSの文字列に入れるので一行に潰す
    return [" ".join(d.split()) for d in PATH_RE.findall(out)]

groups = []
trace_cache = {}
for name, mask, color, turd in LAYERS:
    ds = trace(mask, name, turd)
    trace_cache[name] = ds
    groups.append(f'<g fill="{color}">' + "".join(f'<path d="{d}"/>' for d in ds) + "</g>")
    print(f"{name:6s} paths={len(ds):3d} chars={sum(map(len, ds)):7d}")

bcache = {}
for bn, bm, _, bt in BROW_LAYERS:
    bcache[bn] = trace(bm, bn, bt)
    print(f"{bn:6s} paths={len(bcache[bn]):3d} chars={sum(map(len, bcache[bn])):7d}")
bds = bcache["browL"] + bcache["browR"]
bcolor = BROW_FILL

FLIP = f'transform="translate(0,{H}) scale(0.1,-0.1)"'
svg = (
 f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
 f'width="{W}" height="{H}" shape-rendering="geometricPrecision">'
 f'<g {FLIP} stroke="none">' + "".join(groups) + "</g>"
 f'<g class="brow"><g {FLIP} stroke="none"><g fill="{bcolor}">'
 + "".join(f'<path d="{d}"/>' for d in bds) +
 "</g></g></g></svg>"
)
open("illust-main.svg", "w").write(svg)
print("SVG bytes:", len(svg), " (PNG was", os.path.getsize(SRC), ")")

# ---------------------------------------------------------------------------
# 生成物: components/illustMainPaths.ts（トレース結果のパスデータ）
# ---------------------------------------------------------------------------
def ts_layer(name, color, ds):
    body = ",\n      ".join(f'"{d}"' for d in ds)
    return f'  {{\n    name: "{name}",\n    fill: "{color}",\n    d: [\n      {body},\n    ],\n  }},'

base_ts = "\n".join(ts_layer(n, c, trace_cache[n]) for n, _, c, _ in LAYERS)
ts_d = lambda ds: ",\n  ".join(f'"{d}"' for d in ds)

ts = f'''/*
 * 人物イラスト「たまんねーっ」のベクターデータ。
 * public/img/illust-main.png を色レイヤーごとに potrace でトレースして生成した
 * もの（生成スクリプトは scripts/illust-trace.py）。手で書き換えないこと。
 *
 * 座標系: 元PNGと同じ {W}x{H}。FLIP を掛けた内側で使う（potrace のY反転ぶん）。
 * レイヤーは配列の順に下から重ねる。眉毛だけは BROW_D に分けてあり、
 * 上にずらしても下から肌色レイヤーが出るようになっている。
 */

/** potrace 出力（10倍・Y反転）を元PNGの座標系に戻す変換 */
export const ILLUST_FLIP = "translate(0,{H}) scale(0.1,-0.1)";

export const ILLUST_VIEWBOX = {{ w: {W}, h: {H} }} as const;

export type IllustLayer = {{ name: string; fill: string; d: string[] }};

/** 下 → 上 の順。眉毛はここには含まれない */
export const ILLUST_LAYERS: IllustLayer[] = [
{base_ts}
];

/** 眉毛。これだけ独立して動かす（left = 向かって左） */
export const BROW_FILL = "{bcolor}";
export const BROW_D = {{
  left: [
  {ts_d(bcache["browL"])},
  ],
  right: [
  {ts_d(bcache["browR"])},
  ],
}} as const;
'''
open("illustMainPaths.ts", "w").write(ts)
print("illustMainPaths.ts bytes:", len(ts))
