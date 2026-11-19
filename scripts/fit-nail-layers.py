"""
Calcula, para cada quadro da unha, quanto o gel e o top coat precisam descer
para encaixar exatamente na unha (rodar depois de process-nail-video.py).

- gel: menor descida em que o gel fica todo dentro do contorno do dedo
  (ou seja, deitado sobre a unha, no topo do dedo);
- top coat: posição de maior sobreposição com o gel já encaixado
  (as duas camadas têm o mesmo formato).
Grava em public/media/unha3d/meta.json -> frames[i].fit = {gel: [dx, dy], top: [dx, dy]}
"""
import json
import cv2
import numpy as np
from PIL import Image

D = 'public/media/unha3d/'
meta = json.load(open(D + 'meta.json'))
W, H = meta['width'], meta['height']
PAD = 300  # espaço extra embaixo para a busca


def masks(fr):
    atlas = np.array(Image.open(D + fr['src']).convert('RGBA'))
    out = []
    for li, L in enumerate(fr['layers']):
        a = atlas[L['sy']:L['sy'] + L['h'], :L['w'], 3]
        m = np.zeros((H + PAD, W + 60), np.uint8)
        thr = 128 if li == 2 else 20
        sub = (a > thr).astype(np.uint8)
        if li < 2:  # vidro e gel: preenche o interior transparente
            sub = cv2.morphologyEx(sub, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
            cnts, _ = cv2.findContours(sub, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            sub = np.zeros_like(sub)
            cv2.drawContours(sub, cnts, -1, 1, -1)
        m[L['y']:L['y'] + L['h'], 30 + L['x']:30 + L['x'] + L['w']] = sub
        out.append(m)
    return out


def shift(m, dx, dy):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(m, M, (m.shape[1], m.shape[0]), flags=cv2.INTER_NEAREST)


for fr in meta['frames']:
    top, gel, fin = masks(fr)
    ga = gel.sum()
    fin_d = cv2.erode(fin, np.ones((5, 5), np.uint8))
    # gel: varre descidas, guarda a fração dentro do dedo
    best = []
    for dy in range(0, 300, 2):
        for dx in range(-24, 25, 4):
            frac = (shift(gel, dx, dy) & fin_d).sum() / ga
            best.append((frac, dy, dx))
    fmax = max(b[0] for b in best)
    cand = [b for b in best if b[0] >= fmax - 0.03]
    _, gdy, gdx = min(cand, key=lambda b: (b[1], abs(b[2])))
    # refina 1px
    fine = [((shift(gel, dx, dy) & fin_d).sum() / ga, dy, dx)
            for dy in range(max(0, gdy - 2), gdy + 3) for dx in range(gdx - 3, gdx + 4)]
    fm = max(b[0] for b in fine)
    _, gdy, gdx = min([b for b in fine if b[0] >= fm - 0.01], key=lambda b: (b[1], abs(b[2] - gdx)))
    gel_fit = shift(gel, gdx, gdy)
    # top coat: maior IoU com o gel encaixado
    bestt = (0, 0, 0)
    for dy in range(100, 460, 3):
        for dx in range(-30, 31, 3):
            t = shift(top, dx, dy)
            iou = (t & gel_fit).sum() / max(1, (t | gel_fit).sum())
            if iou > bestt[0]:
                bestt = (iou, dy, dx)
    _, tdy, tdx = bestt
    for dy in range(tdy - 3, tdy + 4):
        for dx in range(tdx - 3, tdx + 4):
            t = shift(top, dx, dy)
            iou = (t & gel_fit).sum() / max(1, (t | gel_fit).sum())
            if iou > bestt[0]:
                bestt = (iou, dy, dx)
    fr['fit'] = {'gel': [gdx, gdy], 'top': [bestt[2], bestt[1]]}
    # recorta o top coat pelo formato do gel (mesma peça): elimina restos de texto ao lado do vidro
    guide = cv2.dilate(shift(gel, gdx - bestt[2], gdy - bestt[1]), np.ones((25, 25), np.uint8))
    L = fr['layers'][0]
    atlas = np.array(Image.open(D + fr['src']).convert('RGBA'))
    g = guide[L['y']:L['y'] + L['h'], 30 + L['x']:30 + L['x'] + L['w']]
    g = cv2.GaussianBlur(g.astype(np.float32), (9, 9), 2)
    a = atlas[L['sy']:L['sy'] + L['h'], :L['w'], 3].astype(np.float32)
    atlas[L['sy']:L['sy'] + L['h'], :L['w'], 3] = (a * g).astype(np.uint8)
    Image.fromarray(atlas).save(D + fr['src'], 'WEBP', quality=84, method=6, alpha_quality=90)
    print(fr['src'], fr['fit'], 'gel dentro %.2f' % fm, 'iou top %.2f' % bestt[0])

# a área de desenho precisa caber as camadas encaixadas
json.dump(meta, open(D + 'meta.json', 'w'))
