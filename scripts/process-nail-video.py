"""
Processa o vídeo da unha (media-src/unha-3d.mp4) para o site:

1. modela o fundo de cada quadro (gradiente suave);
2. encontra as 3 camadas (top coat, gel rosa, dedo com unha natural);
3. remove os textos em inglês, as linhas indicadoras e os pontos;
4. recorta cada camada com transparência (matting pela diferença do fundo);
5. salva um atlas WebP por quadro + um JSON com posições e o vetor de junção.

Uso (precisa de opencv-python-headless e numpy):
    python3 scripts/process-nail-video.py [--debug 1,80,140]
Saída: public/media/unha3d/  (frames f000.webp ... e meta.json)
"""
import json
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

SRC = 'media-src/unha-3d.mp4'
OUT = 'public/media/unha3d'
STEP = 2  # usa 1 de cada 2 quadros
# Entre os quadros ~45 e ~83 os rótulos em inglês passam POR CIMA das camadas e não
# saem sem borrões (até ~97 ainda sobram pontos). Usamos o trecho contínuo e limpo do giro.
FIRST, LAST = 99, 190
DEBUG = []
if '--debug' in sys.argv:
    DEBUG = [int(x) for x in sys.argv[sys.argv.index('--debug') + 1].split(',')]

H, W = 720, 1280
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
X = xx / W - 0.5
Y = yy / H - 0.5
BASIS = np.stack([np.ones_like(X), X, Y, X * X, Y * Y, X * Y, X ** 3, Y ** 3, X * X * Y, X * Y * Y], -1).reshape(-1, 10)
ELL = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))


def fit_background(f):
    """Ajuste polinomial robusto do fundo (ignora objetos, textos e partículas)."""
    sat = f.max(2) - f.min(2)
    sel = sat < 30
    bg = np.zeros_like(f)
    for _ in range(3):
        idx = np.flatnonzero(sel.ravel()[::7]) * 7
        A = BASIS[idx]
        for c in range(3):
            coef, *_ = np.linalg.lstsq(A, f.reshape(-1, 3)[idx, c], rcond=None)
            bg[..., c] = (BASIS @ coef).reshape(H, W)
        d = np.abs(f - bg).max(2)
        sel = (d < 8) & (sat < 30)
    return bg


def fill_holes(m):
    m = m.astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    cv2.drawContours(out, cnts, -1, 1, -1)
    return out


def object_layers(d, f):
    """Máscaras sólidas das 3 camadas, de cima para baixo."""
    cand = (d > 12).astype(np.uint8)
    core = cv2.morphologyEx(cand, cv2.MORPH_OPEN, ELL(5))  # some com textos e linhas finas
    core = cv2.morphologyEx(core, cv2.MORPH_CLOSE, ELL(11))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(core)
    comps = [
        i for i in range(1, n)
        if stats[i, cv2.CC_STAT_AREA] > 1500
        and stats[i, cv2.CC_STAT_TOP] > 2
        and stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] < H - 3
    ]
    # descarta blocos longe do eixo das camadas (restos de texto)
    big = sorted(comps, key=lambda i: -stats[i, cv2.CC_STAT_AREA])[:3]
    mx = np.median([cent[i][0] for i in big])
    comps = [i for i in comps if abs(cent[i][0] - mx) < 200 or stats[i, cv2.CC_STAT_AREA] > 15000]
    # top coat: faixa superior (a câmera orbita sempre na mesma altura).
    # É vidro: usa o contorno convexo e deixa o matting decidir a transparência.
    top_ids = [i for i in comps if cent[i][1] < 245]
    low_ids = [i for i in comps if cent[i][1] >= 245]
    # só pedaços colados ao bloco principal do vidro (textos ficam mais longe)
    if top_ids:
        main = max(top_ids, key=lambda i: stats[i, cv2.CC_STAT_AREA])
        near = cv2.dilate((lab == main).astype(np.uint8), ELL(21))
        top_ids = [i for i in top_ids if i == main or near[lab == i].any()]
    top_raw = np.isin(lab, top_ids).astype(np.uint8)
    top = np.zeros_like(top_raw)
    pts = cv2.findNonZero(top_raw)
    if pts is not None:
        cv2.fillPoly(top, [cv2.convexHull(pts)], 1)
    low = fill_holes(cv2.morphologyEx(np.isin(lab, low_ids).astype(np.uint8), cv2.MORPH_CLOSE, ELL(9)))
    # gel x dedo: watershed na própria imagem (a fronteira real é uma borda forte).
    # Sementes: topo da faixa = gel; base da faixa e pele saturada = dedo.
    bch, gch = f[..., 0], f[..., 1]
    skin = (((bch - gch) < -14) & ((f.max(2) - f.min(2)) > 45)).astype(np.uint8)
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, ELL(7))
    er = cv2.erode(low, ELL(9)) > 0
    rows = np.arange(H)[:, None]
    markers = np.zeros((H, W), np.int32)
    markers[er & (rows < 330)] = 1
    markers[(er & (rows > 470)) | ((skin > 0) & er & (rows > 360))] = 2
    markers[cv2.dilate(low, ELL(5)) == 0] = 3
    cv2.watershed(cv2.GaussianBlur(f.astype(np.uint8), (3, 3), 0), markers)
    gel_ws = (markers == 1).astype(np.uint8) & low
    fin_ws = (markers == 2).astype(np.uint8) & low
    moved = gel_ws & skin  # pele nunca pertence ao gel
    gel_ws = gel_ws & (1 - moved)
    fin_ws = np.clip(fin_ws + moved, 0, 1).astype(np.uint8)

    def clean(m):
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, ELL(11))  # corta pontes finas
        n, lb, st, _ = cv2.connectedComponentsWithStats(m)
        if n > 1:
            m = (lb == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
        return cv2.dilate(fill_holes(m), ELL(3)) & low

    gel = clean(gel_ws)
    finger = clean(fill_holes(cv2.morphologyEx(fin_ws, cv2.MORPH_CLOSE, ELL(9))))
    tight = np.clip(low + fill_holes(cv2.morphologyEx(top_raw, cv2.MORPH_CLOSE, ELL(41))), 0, 1)
    masks = [m for m in (top, gel, finger) if m.sum() > 1500]
    if len(masks) != 3:
        raise RuntimeError(f'esperava 3 camadas, achei {len(masks)}')
    return masks, cand, tight


def leader_lines(cand, objs_dil, lum):
    """Linhas indicadoras: detectadas fora dos objetos e seguidas até o ponto final dentro deles."""
    thin = cand & (1 - cv2.morphologyEx(cand, cv2.MORPH_OPEN, ELL(5)))
    outside = (thin & (1 - objs_dil)).astype(np.uint8) * 255
    lines = cv2.HoughLinesP(outside, 1, np.pi / 360, threshold=28, minLineLength=34, maxLineGap=4)
    mask = np.zeros((H, W), np.uint8)
    if lines is None:
        return mask, outside
    local = cv2.medianBlur(lum.astype(np.uint8), 21).astype(np.float32)
    dark = local - lum
    obj = objs_dil > 0
    for x1, y1, x2, y2 in lines.reshape(-1, 4):
        ang = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        ang = min(ang, 180 - ang)
        if ang > 22:
            continue
        cv2.line(mask, (x1, y1), (x2, y2), 1, 3)
        # caminha a partir da ponta mais próxima de um objeto
        for (ax, ay), (bx, by) in (((x1, y1), (x2, y2)), ((x2, y2), (x1, y1))):
            v = np.array([ax - bx, ay - by], np.float32)
            v /= np.linalg.norm(v) + 1e-6
            p = np.array([ax, ay], np.float32)
            last = p.copy()
            gap = 0
            entered = False
            for _ in range(170):
                p += v
                ix, iy = int(round(p[0])), int(round(p[1]))
                if not (0 <= ix < W and 0 <= iy < H):
                    break
                if obj[iy, ix]:
                    entered = True
                win = dark[max(0, iy - 1):iy + 2, max(0, ix - 1):ix + 2]
                if win.max() > 9:
                    last = p.copy()
                    gap = 0
                else:
                    gap += 1
                    if gap > 6:
                        break
            if entered:
                cv2.line(mask, (int(ax), int(ay)), (int(last[0]), int(last[1])), 1, 3)
                cv2.circle(mask, (int(last[0]), int(last[1])), 6, 1, -1)
    return mask, outside


def letters(m, gray, maxdim=34, min_group=30):
    """Mantém só estruturas com cara de texto: letras pequenas alinhadas em linha, ou traços horizontais cinza."""
    n, lb, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    strokes = np.zeros_like(m)
    for k in range(1, n):
        w, h, a = st[k, 2], st[k, 3], st[k, 4]
        if w >= 14 and h <= 10 and w >= 2.5 * h:
            ys, xs = np.nonzero(lb == k)
            straight = w >= 20 and np.std(ys - np.polyval(np.polyfit(xs, ys, 1), xs)) < 1.6
            if straight or gray[lb == k].mean() < 0.75:
                strokes[lb == k] = 1  # linha indicadora com o ponto (cinza, não é borda natural)
        elif 4 <= w <= 11 and 4 <= h <= 11 and a >= 12 and gray[lb == k].mean() < 0.6:
            strokes[lb == k] = 1  # ponto final da linha
        elif max(w, h) <= maxdim and a >= 5:
            keep[lb == k] = 1
    grp = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5)))
    n, lb, st, _ = cv2.connectedComponentsWithStats(grp)
    out = strokes.copy()
    for k in range(1, n):
        if st[k, 2] >= min_group and st[k, 2] > 1.6 * st[k, 3]:
            out[(lb == k) & (keep > 0)] = 1
    return out


def dots_and_tails(bh, region):
    """Pontos finais das linhas indicadoras (bolinhas escuras) e o trecho de linha que sai deles."""
    strong = ((bh > 45) & (region > 0)).astype(np.uint8)
    blobs = cv2.morphologyEx(strong, cv2.MORPH_OPEN, ELL(5))
    n, lb, st, _ = cv2.connectedComponentsWithStats(blobs)
    out = np.zeros_like(strong)
    for k in range(1, n):
        x, y, w, h, a = st[k]
        if not (12 <= a <= 140 and w <= 13 and h <= 13 and 0.6 <= w / max(h, 1) <= 1.7):
            continue
        cx, cy = x + w / 2, y + h / 2
        cv2.circle(out, (int(cx), int(cy)), 7, 1, -1)
        best = None
        for ang in np.radians(np.arange(-18, 19, 2)):
            for sgn in (-1, 1):
                v = np.array([np.cos(ang) * sgn, np.sin(ang)])
                pnt = np.array([cx, cy]) + v * 6
                run, gap = 0, 0
                for step in range(200):
                    pnt = pnt + v
                    ix, iy = int(round(pnt[0])), int(round(pnt[1]))
                    if not (0 <= ix < W and 0 <= iy < H):
                        break
                    if bh[max(0, iy - 1):iy + 2, ix].max() > 12:
                        run, gap = step, 0
                    else:
                        gap += 1
                        if gap > 3:
                            break
                if best is None or run > best[0]:
                    best = (run, v)
        if best and best[0] > 10:
            end = np.array([cx, cy]) + best[1] * (best[0] + 8)
            cv2.line(out, (int(cx), int(cy)), (int(end[0]), int(end[1])), 1, 3)
    return out


def overlay_mask(f, cand, layers, tight, lum):
    """Máscara dos textos, linhas e pontos que ficam sobre (ou colados) nas camadas."""
    # "fora" = longe de qualquer parte das camadas (inclui as bordas finas do vidro)
    objs_dil = cv2.dilate(np.clip(sum(layers), 0, 1).astype(np.uint8), ELL(13))
    lines, outside_thin = leader_lines(cand, objs_dil, lum)
    # região de influência dos rótulos (texto fora dos objetos + vizinhança)
    text_zone = cv2.dilate((outside_thin > 0).astype(np.uint8), ELL(41))

    sat = f.max(2) - f.min(2)
    gray_dark = ((sat < 30) & (lum < 150)).astype(np.uint8)
    colored = np.clip(layers[1] + layers[2], 0, 1)
    over_colored = gray_dark & colored & text_zone          # texto cinza sobre pele e gel
    thin = cand & (1 - cv2.morphologyEx(cand, cv2.MORPH_OPEN, ELL(5)))
    over_glass = thin & text_zone & cv2.dilate(layers[0], ELL(3))  # texto sobre o vidro
    # texto dentro do contorno convexo do vidro, longe das bordas reais
    outside = thin & layers[0] & (1 - cv2.dilate(tight, ELL(9)))

    # rótulos desenhados por cima das camadas (quadros em que o texto cruza a unha)
    bh = cv2.morphologyEx(lum.astype(np.uint8), cv2.MORPH_BLACKHAT, ELL(11)).astype(np.float32)
    locsat = cv2.blur(sat, (21, 21)) + 1
    gray = sat / locsat
    on_colored = letters(((bh > 32) & (cv2.erode(colored, ELL(5)) > 0)).astype(np.uint8), gray)
    on_glass = letters(((bh > 18) & (cv2.erode(layers[0], ELL(7)) > 0)).astype(np.uint8), np.zeros_like(gray), 24, 40)

    # longe da borda do vidro (a borda grossa não pode ser confundida com um ponto)
    tails = dots_and_tails(bh, np.clip(cv2.erode(colored, ELL(5)) + cv2.erode(layers[0], ELL(17)), 0, 1))
    m = np.clip(lines + over_colored + over_glass + outside + on_colored + on_glass + tails, 0, 1).astype(np.uint8)
    return cv2.dilate(m, ELL(5))


def matte(f, bg, solid, soft):
    """Alpha: sólido para o dedo; pela diferença do fundo para gel e vidro."""
    d = np.abs(f - bg).max(2)
    if soft:
        a = np.clip((d - 3) / soft, 0, 1)
        a = np.maximum(a, 0.06) * solid
    else:
        a = solid.astype(np.float32)
    edge = cv2.GaussianBlur(cv2.erode(solid, ELL(3)).astype(np.float32), (5, 5), 1.2)
    a = a * edge
    safe = np.maximum(a, 0.03)[..., None]
    color = bg + (f - bg) / safe
    color = np.clip(color, 0, 255)
    return color, a


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-q:v', '1', f'{tmp}/f%03d.png'], check=True)
    names = sorted(os.listdir(tmp))[::STEP]
    frames = []
    for k, name in enumerate(names):
        idx = int(name[1:4])
        if not FIRST <= idx <= LAST:
            continue
        if DEBUG and idx not in DEBUG:
            continue
        img = cv2.imread(f'{tmp}/{name}')
        f = img.astype(np.float32)
        bg = fit_background(f)
        d = np.abs(f - bg).max(2)
        layers, cand, tight = object_layers(d, f)
        lum = f.mean(2)
        om = overlay_mask(f, cand, layers, tight, lum)
        clean = cv2.inpaint(img, om * 255, 5, cv2.INPAINT_TELEA)
        cf = clean.astype(np.float32)

        # vetor de junção: deslocamento que leva o top coat sobre o gel
        a0 = layers[0].astype(np.float32)
        a1 = layers[1].astype(np.float32)
        c0 = np.array(np.nonzero(a0))[::-1].mean(1)
        c1 = np.array(np.nonzero(a1))[::-1].mean(1)
        join = (c1 - c0).tolist()

        parts = []
        for li, (solid, soft) in enumerate(zip(layers, (40, 55, 0))):
            col, a = matte(cf, bg, solid, soft)
            ys, xs = np.nonzero(solid)
            x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
            rgba = np.dstack([col[y0:y1, x0:x1], a[y0:y1, x0:x1] * 255]).astype(np.uint8)
            parts.append({'x': int(x0), 'y': int(y0), 'img': rgba})
        frames.append({'idx': idx, 'parts': parts, 'join': join})

        if DEBUG:
            dbg = os.environ.get('NAIL_DEBUG_DIR', tmp)
            cv2.imwrite(f'{dbg}/dbg_clean_{idx:03d}.jpg', clean)
            cv2.imwrite(f'{dbg}/dbg_mask_{idx:03d}.png', om * 255)
        print('quadro', idx, 'ok', flush=True)

    # recorte comum a todos os quadros (inclui as posições juntas)
    xs0, ys0, xs1, ys1 = [], [], [], []
    for fr in frames:
        for li, p in enumerate(fr['parts']):
            h, w = p['img'].shape[:2]
            shift = (2 - li) * np.array(fr['join'])
            for s in (np.zeros(2), shift * 0):
                xs0.append(p['x']); ys0.append(p['y']); xs1.append(p['x'] + w); ys1.append(p['y'] + h)
    X0, Y0, X1, Y1 = min(xs0) - 8, min(ys0) - 8, max(xs1) + 8, max(ys1) + 8

    meta = {'width': int(X1 - X0), 'height': int(Y1 - Y0), 'frames': []}
    for n, fr in enumerate(frames):
        # atlas: camadas empilhadas na vertical
        ws = [p['img'].shape[1] for p in fr['parts']]
        hs = [p['img'].shape[0] for p in fr['parts']]
        atlas = np.zeros((sum(hs), max(ws), 4), np.uint8)
        y = 0
        rects = []
        for p, w, h in zip(fr['parts'], ws, hs):
            atlas[y:y + h, :w] = p['img']
            rects.append({'sx': 0, 'sy': y, 'w': w, 'h': h, 'x': p['x'] - X0, 'y': p['y'] - Y0})
            y += h
        name = f'f{n:03d}.webp'
        rgba = cv2.cvtColor(atlas, cv2.COLOR_BGRA2RGBA)
        from PIL import Image
        Image.fromarray(rgba).save(f'{OUT}/{name}', 'WEBP', quality=84, method=6, alpha_quality=90)
        meta['frames'].append({'src': name, 'layers': rects, 'join': [round(v, 1) for v in fr['join']]})
    with open(f'{OUT}/meta.json', 'w') as fh:
        json.dump(meta, fh)
    print('pronto:', len(frames), 'quadros', meta['width'], 'x', meta['height'])


if __name__ == '__main__':
    main()
