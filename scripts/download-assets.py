"""Download openly served Unsplash demo imagery. See assets attribution notes."""

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request

root = Path(__file__).resolve().parents[1] / "apps/web/public/images"
photos = [
    "1610701596007-11502861dcfa",
    "1578749556568-bc2c40e68b61",
    "1494438639946-1ebd1d20bf85",
    "1544816155-12df9643f363",
    "1553062407-98eeb64c6a62",
    "1598033129183-c4f50c736f10",
    "1544816155-12df9643f363",
    "1553062407-98eeb64c6a62",
    "1490312278390-ab64016e0aa9",
    "1535632066927-ab7c9ab60908",
    "1611652022419-a9419f74343d",
    "1602173574767-37ac01994b2a",
    "1513506003901-1e6a229e2d15",
    "1610701596007-11502861dcfa",
    "1578749556568-bc2c40e68b61",
    "1521572163474-6864f9cf17ab",
    "1598033129183-c4f50c736f10",
    "1544816155-12df9643f363",
    "1608571423902-eed4a5ad8108",
    "1603006905003-be475563bc59",
    "1541643600914-78b084683601",
    "1579783902614-a3fb3927b6a5",
    "1578301978693-85fa9c0320b9",
    "1513364776144-60967b0f800f",
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
