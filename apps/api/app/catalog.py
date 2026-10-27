"""The fictional sample catalogue: three products for each of the eight sample shops.

Product N uses the photo `seed_product_N` (see scripts/download-assets.py), so the title, description and options
here describe what the photo actually shows. Prices are in sen (RM 118.00 is 11800).
"""

import re
from typing import NamedTuple


class Sample(NamedTuple):
    title: str
    price_minor: int
    description: str
    tags: tuple[str, ...]
    option: str
    values: tuple[tuple[str, int, int], tuple[str, int, int]]  # (value, extra price in sen, stock)


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


PRODUCTS: tuple[Sample, ...] = (
    # Studio Hening: home & living
    Sample(
        "Speckled stoneware cups, set of four",
        11800,
        "Four small stoneware cups with a speckled cream glaze and a toasted-clay base. Sized for a short espresso or a "
        "slow cup of tea. Each one is thrown by hand, so no two are quite alike. Dishwasher safe.",
        ("ceramics", "handmade", "kitchen"),
        "Glaze",
        (("Cream and honey", 0, 14), ("Oat and white", 0, 6)),
    ),
    Sample(
        "Studio pendant lamp",
        18900,
        "A powder-coated steel pendant with a wide, soft shade that pools light over a table or counter. Comes with a "
        "1.5 m braided cord and a ceiling canopy, and takes any E27 bulb.",
        ("lighting", "minimal", "home"),
        "Shade",
        (("Warm grey", 0, 9), ("Chalk white", 0, 4)),
    ),
    Sample(
        "Reading floor lamp",
        24900,
        "A slim matte-black floor lamp with an adjustable head, made for the corner beside your favourite chair. "
        "140 cm tall, with an inline dimmer and a weighted base that stays put.",
        ("lighting", "minimal", "home"),
        "Finish",
        (("Matte black", 0, 7), ("Matte black, brass switch", 2500, 3)),
    ),
    # Sunday Archive: pre-loved fashion
    Sample(
        "Natural kraft tote",
        4800,
        "A sturdy kraft-paper tote with woven handles, sewn to hold a laptop or a week's groceries. Wipes clean and "
        "softens with use.",
        ("bags", "everyday", "pre-loved"),
        "Size",
        (("Medium", 0, 18), ("Large", 800, 10)),
    ),
    Sample(
        "Pre-loved navy backpack, 18 L",
        13900,
        "Pre-loved and checked over by hand: a water-resistant navy backpack with a padded laptop sleeve and a zip "
        "pocket on the front. Light wear on the base, shown in the photos.",
        ("bags", "pre-loved", "commute"),
        "Condition",
        (("Excellent", 0, 2), ("Good, small marks", -1500, 3)),
    ),
    Sample(
        "Crisp white dress shirt",
        7900,
        "A pre-loved cotton shirt with a clean collar and a good drape, pressed before it ships. Fits true to size; "
        "listed measurements are on the size card in the photos.",
        ("shirts", "pre-loved", "workwear"),
        "Size",
        (("M (15.5 in collar)", 0, 2), ("L (16.5 in collar)", 0, 1)),
    ),
    # Peach Club: playful everyday things
    Sample(
        "Wavy glaze cup and saucer",
        6800,
        "A hand-glazed cup and saucer in strawberry-milk pink, with a wavy line of glaze that no two pieces share. "
        "Holds 180 ml. Hand wash, and keep it away from the microwave.",
        ("ceramics", "gift", "cute"),
        "Glaze",
        (("Strawberry milk", 0, 11), ("Mint cream", 0, 5)),
    ),
    Sample(
        "Space doodle sticker sheet",
        1200,
        "Ten tiny doodles, from a rocket to a ringed planet, on one waterproof vinyl sheet. Cut them out and stick "
        "them on laptops, bottles and notebooks.",
        ("stickers", "stationery", "under RM20"),
        "Pack",
        (("One sheet", 0, 60), ("Set of three", 1800, 24)),
    ),
    Sample(
        "Spring bud vase pair",
        7900,
        "Two slim white bud vases on a bamboo tray, sized for a stem or two of blossom. Glazed inside so they hold "
        "water, and the tray is included.",
        ("vases", "flowers", "home"),
        "Set",
        (("Pair with tray", 0, 12), ("Pair only", -1500, 8)),
    ),
    # Mira & Muse: jewellery
    Sample(
        "Sapphire drop earrings",
        12900,
        "Statement drops set with deep-blue stones and a halo of clear crystals, on hypoallergenic posts. Light "
        "enough to wear all day, and they arrive in a small linen pouch.",
        ("earrings", "statement", "gift"),
        "Metal",
        (("Silver tone", 0, 8), ("Gold tone", 1000, 5)),
    ),
    Sample(
        "Fine chain pendant necklace",
        9900,
        "A fine chain with a tiny drop pendant that sits at the collarbone. Wear it alone or layer it with a longer "
        "chain. Tarnish-resistant plating.",
        ("necklaces", "everyday", "layering"),
        "Length",
        (("16 in", 0, 10), ("18 in", 0, 12)),
    ),
    Sample(
        "Chunky chain bracelet",
        15900,
        "A heavy gold-tone curb chain with a toggle clasp you can fasten one-handed. 19 cm, with a 3 cm extender "
        "link for a looser fit.",
        ("bracelets", "statement", "gold tone"),
        "Finish",
        (("Gold tone", 0, 6), ("Silver tone", 0, 4)),
    ),
    # Clay Collective: pottery
    Sample(
        "Blue-glaze bowl and vase set",
        16800,
        "Two nesting bowls and a slim bud vase with a deep blue glaze inside, thrown and fired in the same batch so "
        "they match. Food safe and dishwasher safe.",
        ("ceramics", "handmade", "tableware"),
        "Set",
        (("Two bowls and a vase", 0, 5), ("Two bowls only", -4800, 7)),
    ),
    Sample(
        "Glaze-test trinket dishes, set of three",
        5800,
        "Small dishes for rings, soap or a used tea bag, taken from our glaze-test batches. You will get a mix of "
        "colours; no two sets are the same.",
        ("ceramics", "gift", "small things"),
        "Set",
        (("Three dishes", 0, 16), ("Six dishes", 5200, 8)),
    ),
    Sample(
        "Sky-blue stoneware plates, set of four",
        14800,
        "Four stoneware plates in a washed sky-blue glaze with a charcoal rim, each a little different where the "
        "glaze pooled. Oven, microwave and dishwasher safe.",
        ("ceramics", "tableware", "handmade"),
        "Size",
        (("Side plates, 20 cm", 0, 6), ("Dinner plates, 26 cm", 3000, 4)),
    ),
    # Offhours Studio: streetwear
    Sample(
        "Off-duty heavyweight tee",
        8900,
        "A 240 gsm cotton tee with a boxy cut and a rib collar that keeps its shape wash after wash. Cut to sit just "
        "below the hip.",
        ("tees", "basics", "unisex"),
        "Size",
        (("M", 0, 20), ("L", 0, 15)),
    ),
    Sample(
        "Washed dad cap, charcoal",
        6900,
        "A soft, garment-washed cotton cap with a curved brim and an adjustable strap. It looks lived-in from the "
        "first day.",
        ("caps", "accessories", "unisex"),
        "Strap",
        (("Adjustable, one size", 0, 25), ("Adjustable, with brass buckle", 800, 10)),
    ),
    Sample(
        "Coastal windbreaker",
        18900,
        "A packable nylon windbreaker in signal orange with a storm collar and a hood that hides in the neck. Light "
        "enough to live in a bag.",
        ("outerwear", "unisex", "packable"),
        "Size",
        (("M", 0, 8), ("L", 0, 6)),
    ),
    # Fern & Form: botanical beauty
    Sample(
        "Botanical face oil, 30 ml",
        8800,
        "A light blend of jojoba, rosehip and squalane in an amber glass dropper bottle. Two drops after cleansing, "
        "morning or night. No added fragrance.",
        ("skincare", "face oil", "fragrance free"),
        "Size",
        (("30 ml", 0, 15), ("50 ml", 4200, 8)),
    ),
    Sample(
        "Slow morning candle",
        5800,
        "A hand-poured soy candle in a glass tumbler, with notes of cedar, fig leaf and black tea. Burns for about "
        "40 hours; trim the wick before each light.",
        ("candles", "home fragrance", "soy"),
        "Scent",
        (("Cedar and fig leaf", 0, 22), ("Black tea", 0, 13)),
    ),
    Sample(
        "Grapefruit and clay soap bars",
        3600,
        "Cold-process soap bars made with pink grapefruit and kaolin clay, cured for six weeks. Gentle enough for "
        "face and body.",
        ("soap", "bath", "plant based"),
        "Pack",
        (("One bar", 0, 30), ("Set of three", 6400, 12)),
    ),
    # Paper & Pause: art and prints
    Sample(
        "Still life with tulips, A3 print",
        4500,
        "A giclée print of a painted tulip still life on 200 gsm matte cotton paper. Unframed, and it fits a "
        "standard A3 frame.",
        ("prints", "still life", "wall art"),
        "Size",
        (("A3, 29.7 x 42 cm", 0, 25), ("A2, 42 x 59.4 cm", 2500, 10)),
    ),
    Sample(
        "Pastoral landscape, A3 print",
        6500,
        "A quiet country scene with grazing sheep, printed on 200 gsm paper with a soft, even finish. Unframed and "
        "ready for a standard frame.",
        ("prints", "landscape", "wall art"),
        "Size",
        (("A3, 29.7 x 42 cm", 0, 18), ("A2, 42 x 59.4 cm", 2500, 7)),
    ),
    Sample(
        "Vintage-style postcard set",
        2800,
        "Ten postcards of old seaside and countryside views, with room to write on the back. Printed on thick, "
        "uncoated card.",
        ("postcards", "stationery", "gift"),
        "Set",
        (("Set of 10", 0, 40), ("Set of 20", 2000, 20)),
    ),
)

assert len(PRODUCTS) == 24
