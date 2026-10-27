"""Download openly served Unsplash demo imagery. See assets attribution notes."""

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request

root = Path(__file__).resolve().parents[1] / "apps/web/public/images"
# One distinct photo per sample product, grouped three to a shop (see apps/api/app/catalog.py), and each shop's
# cover is its first product's photo. All are on Unsplash's free licence; none shows a recognisable brand.
photos = [
    # Studio Hening: home & living
    "1610701596007-11502861dcfa",  # speckled stoneware cups
    "1513506003901-1e6a229e2d15",  # white pendant lamp on teal
    "1494438639946-1ebd1d20bf85",  # black floor lamp on a sage wall
    # Sunday Archive: pre-loved fashion
    "1544816155-12df9643f363",  # kraft tote
    "1553062407-98eeb64c6a62",  # navy backpack
    "1598033129183-c4f50c736f10",  # white dress shirt and tie
    # Peach Club: playful everyday things
    "1781150363981-546c399139df",  # wavy pink and white cup and saucer
    "1633533452206-8ab246b00e30",  # doodle sticker sheet on yellow
    "1490312278390-ab64016e0aa9",  # blossom in white bud vases
    # Mira & Muse: jewellery
    "1535632066927-ab7c9ab60908",  # earrings on a leaf
    "1611652022419-a9419f74343d",  # pendant necklace
    "1602173574767-37ac01994b2a",  # gold chain bracelet
    # Clay Collective: pottery
    "1610128361323-6e941c97f023",  # glazed bowls and slim vases
    "1577576223085-3eb295cd414f",  # small glaze dishes on pink
    "1578749556568-bc2c40e68b61",  # blue plates and bowls
    # Offhours Studio: streetwear
    "1521572163474-6864f9cf17ab",  # white tee
    "1521369909029-2afed882baee",  # washed charcoal cap
    "1578854955076-970394ef2512",  # orange windbreaker
    # Fern & Form: botanical beauty
    "1608571423902-eed4a5ad8108",  # amber dropper bottle
    "1603006905003-be475563bc59",  # candle among fairy lights
    "1674053524062-30b8ad746d4b",  # grapefruit and stacked soap bars
    # Paper & Pause: art and prints
    "1579783902614-a3fb3927b6a5",  # still life with tulips
    "1578301978693-85fa9c0320b9",  # pastoral landscape
    "1780536891273-79cdaee78211",  # vintage postcards
]


def download(args):
    name, photo = args
    p = root / f"{name}.jpg"
    if p.exists():
        return f"{name}: cached"
    try:
        req = urllib.request.Request(
            f"https://images.unsplash.com/photo-{photo}?auto=format&fit=crop&w=1000&q=85",
            headers={"User-Agent": "LilacDevelopment/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            p.write_bytes(r.read())
        return f"{name}: ready"
    except Exception as e:
        return f"{name}: {e}"


items = [(f"seed_product_{i}", p) for i, p in enumerate(photos)]
items += [(f"seed_hero_{i}", photos[i * 3]) for i in range(8)]
with ThreadPoolExecutor(max_workers=6) as executor:
    for status in executor.map(download, items):
        print(status)
