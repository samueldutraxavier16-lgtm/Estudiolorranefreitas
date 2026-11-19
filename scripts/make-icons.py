"""Gera os ícones redondos (aba do navegador, celular) e a imagem de compartilhamento
a partir da medalha da marca (media-src/logo-medalha.jpg)."""
from PIL import Image, ImageDraw, ImageFilter

CX, CY, R = 349, 268, 236  # círculo da medalha na foto
src = Image.open('media-src/logo-medalha.jpg').convert('RGB')
box = (CX - R, CY - R, CX + R, CY + R)
medal = src.crop(box)
S = medal.size[0]

def round_icon(size):
    big = medal.resize((size * 4, size * 4), Image.LANCZOS)
    mask = Image.new('L', big.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big.size[0] - 1, big.size[1] - 1), fill=255)
    out = Image.new('RGBA', big.size, (0, 0, 0, 0))
    out.paste(big, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)

round_icon(64).save('public/favicon.png')
round_icon(192).save('public/icon-192.png')
round_icon(512).save('public/icon-512.png')
# iPhone não aceita transparência: fundo da cor do site, a medalha redonda no meio
apple = Image.new('RGB', (180, 180), (244, 238, 231))
apple.paste(round_icon(164), (8, 8), round_icon(164))
apple.save('public/apple-touch-icon.png')
# prévia de link (WhatsApp, Instagram): quadrada, medalha redonda sobre o fundo do site
og = Image.new('RGB', (600, 600), (244, 238, 231))
shadow = Image.new('L', (600, 600), 0)
ImageDraw.Draw(shadow).ellipse((70, 86, 530, 546), fill=90)
og.paste((150, 110, 95), (0, 0), shadow.filter(ImageFilter.GaussianBlur(18)))
icon = round_icon(460)
og.paste(icon, (70, 70), icon)
og.save('public/og-logo.jpg', quality=90)
print('ok')
