"""
Process the official M11NTX source images (assets/images/novas) into the
production assets used by the site:

  - hero-background.webp / .jpg   <- fabric texture
  - logo-horizontal.png           <- wordmark, black keyed to transparent
  - escudo.png                    <- leather crest, checkerboard keyed out
  - symbol.png                    <- bare M11 mark (for footer)
  - assets/icons/*                <- favicon pack from the ringed symbol
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets", "images", "Novas")
IMAGES = os.path.join(ROOT, "assets", "images")
ICONS = os.path.join(ROOT, "assets", "icons")
os.makedirs(ICONS, exist_ok=True)

FABRIC = os.path.join(SRC, "ChatGPT Image 1 de jul. de 2026, 13_22_43.png")
SHIELD = os.path.join(SRC, "ChatGPT Image 1 de jul. de 2026, 13_22_58.png")
RING = os.path.join(SRC, "Logo Github.png")
WORDMARK = os.path.join(SRC, "LogoPagina.png")


def autotrim(img, bg_alpha=0):
    """Trim fully transparent margins."""
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def key_light_bg(img, lo=205, hi=236, sat_max=24):
    """Make a light, low-saturation (checkerboard / white) background
    transparent, with a soft alpha ramp for edges/shadows."""
    img = img.convert("RGB")
    w, h = img.size
    out = img.convert("RGBA")
    px = img.load()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mx = max(r, g, b); mn = min(r, g, b)
            sat = mx - mn
            lum = (r + g + b) / 3
            if sat < sat_max and lum >= hi:
                a = 0
            elif sat < sat_max and lum > lo:
                a = int(255 * (hi - lum) / (hi - lo))
            else:
                a = 255
            op[x, y] = (r, g, b, a)
    return out


def key_dark_bg(img, lo=14, hi=48):
    """Make a near-black background transparent (for the wordmark)."""
    img = img.convert("RGB")
    w, h = img.size
    out = img.convert("RGBA")
    px = img.load()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = max(r, g, b)
            if lum <= lo:
                a = 0
            elif lum < hi:
                a = int(255 * (lum - lo) / (hi - lo))
            else:
                a = 255
            op[x, y] = (r, g, b, a)
    return out


def rounded_mask(size, radius_ratio, ss=4):
    S = size * ss
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        [0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def build_hero():
    im = Image.open(FABRIC).convert("RGB")
    im.save(os.path.join(IMAGES, "hero-background.webp"), quality=86, method=6)
    im.save(os.path.join(IMAGES, "hero-background.jpg"), quality=88)


def build_wordmark():
    im = key_dark_bg(Image.open(WORDMARK))
    im = autotrim(im)
    im.save(os.path.join(IMAGES, "logo-horizontal.png"))


def build_shield():
    im = key_light_bg(Image.open(SHIELD))
    im = autotrim(im)
    # cap width for the web
    if im.width > 900:
        r = 900 / im.width
        im = im.resize((900, int(im.height * r)), Image.LANCZOS)
    im.save(os.path.join(IMAGES, "escudo.png"))


def build_bare_mark():
    """Isolate the M11 glyph from the ringed logo (dropping the outer ring),
    key black to transparent -> transparent gold mark for the footer."""
    im = key_dark_bg(Image.open(RING))
    w, h = im.size
    # radial mask: keep only the central glyph, discard the ring annulus
    keep_r = 0.40 * w
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([w / 2 - keep_r, h / 2 - keep_r,
                w / 2 + keep_r, h / 2 + keep_r], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    im.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    im = autotrim(im)
    im.save(os.path.join(IMAGES, "symbol.png"))


def build_icons():
    ring = Image.open(RING).convert("RGBA")
    # square-crop centered
    w, h = ring.size
    s = min(w, h)
    ring = ring.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s,
                      (h - s) // 2 + s))

    def tile(size, radius_ratio, pad_ratio):
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        plate = Image.new("RGBA", (size, size), (5, 5, 5, 255))
        plate.putalpha(rounded_mask(size, radius_ratio))
        img.alpha_composite(plate)
        inner = int(size * (1 - pad_ratio * 2))
        logo = ring.resize((inner, inner), Image.LANCZOS)
        off = (size - inner) // 2
        img.alpha_composite(logo, (off, off))
        return img

    specs = {
        "favicon-16x16.png": (16, 0.16, 0.06),
        "favicon-32x32.png": (32, 0.20, 0.06),
        "favicon-48x48.png": (48, 0.22, 0.07),
        "apple-touch-icon.png": (180, 0.22, 0.10),
        "android-chrome-192x192.png": (192, 0.22, 0.10),
        "android-chrome-512x512.png": (512, 0.22, 0.10),
    }
    for name, (sz, rr, pr) in specs.items():
        tile(sz, rr, pr).save(os.path.join(ICONS, name))

    ico = [tile(s, 0.18, 0.06) for s in (16, 32, 48)]
    ico[0].save(os.path.join(ICONS, "favicon.ico"), format="ICO",
                sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[1:])

    tile(48, 0.20, 0.07).save(os.path.join(IMAGES, "favicon.png"))

    # remove stale hand-drawn vectors that don't match the real glyph
    for p in (os.path.join(ICONS, "favicon.svg"),
              os.path.join(IMAGES, "symbol.svg")):
        if os.path.exists(p):
            os.remove(p)


def main():
    build_hero()
    build_wordmark()
    build_shield()
    build_bare_mark()
    build_icons()
    print("assets processed")


if __name__ == "__main__":
    main()
