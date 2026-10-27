'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Shirt,
  Armchair,
  Paintbrush,
  Diamond,
  Leaf,
  Shapes,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import type { Product, Shop } from '@lilac/api-client';
import { assetPath } from '@lilac/renderer';
import { api } from '@/lib/api';
import { ProductCard, ShopCard, initials } from './cards';
import { useApp } from './provider';
import { Arrow, Burst, NookMark, Squiggle } from './brand';
import { CountUp, Reveal, Words, useParallax } from './motion';

interface Feed {
  shops: Shop[];
  products: Product[];
  categories: string[];
}

const ticker = [
  'Small shops',
  'Big personality',
  'Made by real people',
  'Decorate it your way',
  'Your corner of the internet',
  'Come on in',
];

export function Discover({ initial, searchQuery }: { initial: Feed; searchQuery?: string }) {
  const { me, openAuth } = useApp();
  const [category, setCategory] = useState('All finds');
  const [tab, setTab] = useState('For you');
  const [products, setProducts] = useState(initial.products);
  const [searchShops, setSearchShops] = useState<Shop[]>([]);
  const [sort, setSort] = useState('newest');
  const [allShops, setAllShops] = useState(false);
  const [filters, setFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (
      searchQuery === undefined &&
      category === 'All finds' &&
      sort === 'newest' &&
      !maxPrice &&
      !inStock
    ) {
      setProducts(initial.products);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    const p = new URLSearchParams({
      q: searchQuery || '',
      category,
      sort,
      ...(maxPrice ? { priceMax: String(Number(maxPrice) * 100) } : {}),
      inStock: String(inStock),
    });
    api<{ items: Product[]; shops: Shop[] }>(`/search?${p}`, { signal: controller.signal })
      .then((r) => {
        setProducts(r.items);
        setSearchShops(r.shops);
        setError('');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [category, sort, maxPrice, inStock, searchQuery, initial.products]);
  const visible =
    tab === 'Following' ? products.filter((p) => me?.following.includes(p.shop_id)) : products;
  const icons = [Shapes, Shirt, Armchair, Paintbrush, Diamond, Leaf, Sparkles];
  const swap = `${category}-${sort}-${maxPrice}-${inStock}-${tab}-${searchQuery ?? ''}`;
  return (
    <div className="page-wrap discover-page" id="page-content">
      <form action="/search" className="mobile-search">
        <Search size={17} />
        <input
          aria-label="Search products and shops"
          name="q"
          defaultValue={searchQuery || ''}
          placeholder="Poke around for something…"
        />
        <button aria-label="Search" type="submit">
          <ArrowRight size={17} />
        </button>
      </form>
      {searchQuery === undefined ? (
        <>
          <Hero shops={initial.shops} products={initial.products} />
          <Ticker />
        </>
      ) : (
        <div className="search-heading">
          <span className="eyebrow">POKING AROUND</span>
          <h1>{searchQuery ? <>Finds for “{searchQuery}”</> : 'Explore all the little things.'}</h1>
          <p className="muted">
            Small shops, thoughtfully made things, all within a doorway of each other.
          </p>
        </div>
      )}
      {searchQuery !== undefined && searchShops.length > 0 && (
        <section className="shops-section">
          <div className="section-heading">
            <h2>
              Nooks to <span className="hl">peek into</span>
            </h2>
          </div>
          <div className="shop-grid">
            {searchShops.map((s, i) => (
              <ShopCard shop={s} index={i} key={s.id} />
            ))}
          </div>
        </section>
      )}
      {searchQuery === undefined && (
        <section className="shops-section">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">MEET THE NEIGHBOURS</span>
              <h2>
                Every nook has <span className="hl">someone</span> in it.
              </h2>
              <p className="section-sub">
                Peek through the doorway. Each shop decorates its own corner, so no two look alike.
              </p>
            </div>
            <button className="text-button" onClick={() => setAllShops(!allShops)}>
              {allShops ? 'Show fewer' : 'See every nook'}
              <ArrowRight size={16} />
            </button>
          </Reveal>
          <div className="shop-grid">
            {initial.shops.slice(0, allShops ? 8 : 4).map((s, i) => (
              <ShopCard key={s.id} shop={s} index={i} />
            ))}
          </div>
        </section>
      )}
      {searchQuery === undefined && <HowItWorks />}
      <section
        id="finds"
        className={`finds-section ${searchQuery !== undefined ? 'is-search' : ''}`}
      >
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">
              {searchQuery !== undefined ? 'WHAT TURNED UP' : 'FRESH ON THE SHELVES'}
            </span>
            <h2>
              {searchQuery !== undefined ? (
                <>
                  {visible.length} little{' '}
                  <span className="hl">{visible.length === 1 ? 'find' : 'finds'}</span>.
                </>
              ) : (
                <>
                  Little things worth <span className="hl">keeping</span>.
                </>
              )}
            </h2>
          </div>
          <div className="feed-tabs" role="tablist" aria-label="Feed">
            {['For you', 'Following', 'New arrivals'].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? 'active' : ''}
                onClick={() => {
                  setTab(t);
                  if (t === 'New arrivals') setSort('newest');
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </Reveal>
        <div className="filter-row">
          <div className="category-chips">
            {initial.categories.map((c, i) => {
              const Icon = icons[i] || Shapes;
              return (
                <button
                  key={c}
                  className={`category-chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  <Icon size={15} />
                  {c}
                </button>
              );
            })}
          </div>
          <button
            className={`filter-button ${filters ? 'active' : ''}`}
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>
        {filters && (
          <div className="filter-panel">
            <label>
              Sort by
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
            <label>
              Maximum price (RM)
              <input
                type="number"
                min="0"
                max="1000000"
                value={maxPrice}
                placeholder="Any price"
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              In stock only
            </label>
            <button
              className="text-button"
              onClick={() => {
                setCategory('All finds');
                setSort('newest');
                setMaxPrice('');
                setInStock(false);
              }}
            >
              Reset <X size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div key={swap} className={`product-grid ${busy ? 'is-loading' : ''}`}>
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {visible.length === 0 && !busy && (
          <div className="empty-state">
            <NookMark size={54} />
            <h3>
              {tab === 'Following'
                ? 'Your neighbours are out there.'
                : 'Nothing on this shelf just yet.'}
            </h3>
            <p>
              {tab === 'Following'
                ? 'Follow a shop to see its products here.'
                : 'Try a different category or a broader search.'}
            </p>
            {tab === 'Following' && !me && (
              <button className="button primary" onClick={openAuth}>
                Sign in to follow shops
              </button>
            )}
          </div>
        )}
        <Reveal className="end-note">
          <Squiggle className="end-squiggle" />
          <span>Every find has a person behind it. Thanks for shopping small.</span>
        </Reveal>
      </section>
      <Finale />
    </div>
  );
}

function Hero({ shops, products }: { shops: Shop[]; products: Product[] }) {
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage);
  const [a, b, c] = shops;
  const doors = [
    { shop: a, cls: 'door-a' },
    { shop: b, cls: 'door-b' },
    { shop: c, cls: 'door-c' },
  ].filter((d) => d.shop);
  return (
    <section className="nk-hero" ref={stage}>
      <div className="hero-copy">
        <h1>
          <Words text="Every shop" />
          <br />
          <Words text="deserves a" start={160} />{' '}
          <span className="word hero-nook">
            <span style={{ ['--i' as string]: '420ms' }}>nook.</span>
          </span>
        </h1>
        <p>
          Nook is a cosy corner of the internet where independent sellers move in, decorate it their
          way, and show you who they really are. Come on in and have a poke around.
        </p>
        <div className="hero-actions">
          <a className="button primary big" href="#finds">
            Take a look around <ArrowUpRight size={18} />
          </a>
          <Link className="button outline big" href="/me">
            Open your own nook
          </Link>
        </div>
        <div className="hero-footnote">
          <span className="mini-avatars">
            {shops.slice(0, 4).map((s) => (
              <span key={s.id} title={s.name}>
                {initials(s.name).slice(0, 1)}
              </span>
            ))}
          </span>
          <span>
            <strong>
              <CountUp value={products.length} /> little finds
            </strong>
            , all from people who care how they’re made.
          </span>
        </div>
      </div>
      <div className="hero-stage" aria-label="Three shops, each in its own nook">
        <span className="stage-glow" aria-hidden="true" />
        {doors.map(({ shop, cls }, i) => (
          <Link
            key={shop.id}
            href={`/shop/${shop.slug}`}
            className={`door ${cls}`}
            style={{ ['--d' as string]: `${300 + i * 140}ms` }}
          >
            <span className="door-frame">
              <img src={assetPath(shop.cover)} alt="" />
            </span>
            <span className="door-plate">{shop.name}</span>
          </Link>
        ))}
        <span className="open-sign" aria-hidden="true">
          <i />
          <span>
            OPEN
            <small>come on in</small>
          </span>
        </span>
        <span className="stamp" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <defs>
              <path id="stamp-circle" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" />
            </defs>
            <text>
              <textPath href="#stamp-circle" textLength="276" lengthAdjust="spacing">
                MOVE IN · DECORATE · OPEN UP ·
              </textPath>
            </text>
          </svg>
          <NookMark size={40} />
        </span>
        <span className="note" aria-hidden="true">
          peek inside!
          <Arrow />
        </span>
        <Burst className="spark spark-a" size={34} />
        <Burst className="spark spark-b" size={20} />
        <Burst className="spark spark-c" size={26} />
      </div>
    </section>
  );
}

function Ticker() {
  const row = [...ticker, ...ticker];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((n) => (
          <div className="ticker-set" key={n}>
            {row.map((t, i) => (
              <span key={i}>
                {t}
                <Burst size={18} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Move in',
      text: 'Claim your corner. Add your name, your story and the things you make. It takes a couple of minutes.',
      art: (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <path d="M24 96V44C24 22 40 8 60 8s36 14 36 36v52z" fill="#211a2e" />
          <path d="M36 96V46c0-13 10-23 24-23s24 10 24 23v50z" fill="#ffd15c" />
          <circle cx="60" cy="82" r="10" fill="#ff5a36" />
          <g className="key">
            <circle cx="100" cy="30" r="9" fill="none" stroke="#211a2e" strokeWidth="4" />
            <path
              d="M100 39v22m0-6h7m-7 10h5"
              stroke="#211a2e"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ),
    },
    {
      n: '02',
      title: 'Decorate it',
      text: 'Pick a look, swap the colours, change the type, move things around. Make it feel unmistakably yours.',
      art: (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <rect
            x="14"
            y="16"
            width="64"
            height="70"
            rx="10"
            fill="#fffbf3"
            stroke="#211a2e"
            strokeWidth="4"
          />
          <rect x="24" y="28" width="44" height="20" rx="5" fill="#cdb8ff" />
          <rect x="24" y="56" width="20" height="20" rx="5" fill="#ffb5cc" />
          <rect x="48" y="56" width="20" height="20" rx="5" fill="#b7e4c7" />
          <g className="brush">
            <path d="M104 14L74 58" stroke="#211a2e" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M74 58c-6 2-9 8-8 14 6-1 12-3 14-9z"
              fill="#ff5a36"
              stroke="#211a2e"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
    },
    {
      n: '03',
      title: 'Open the door',
      text: 'Publish when you’re ready. Shoppers drop in, browse, follow and buy, and you’re open for business.',
      art: (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <path d="M60 4v14" stroke="#211a2e" strokeWidth="4" strokeLinecap="round" />
          <g className="sign">
            <rect
              x="22"
              y="18"
              width="76"
              height="52"
              rx="12"
              fill="#ff5a36"
              stroke="#211a2e"
              strokeWidth="4"
            />
            <text
              x="60"
              y="52"
              textAnchor="middle"
              fontSize="26"
              fontFamily="Caprasimo, serif"
              fill="#211a2e"
            >
              open
            </text>
          </g>
          <path d="M20 94h80" stroke="#211a2e" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ),
    },
  ];
  return (
    <section className="how-section">
      <Reveal className="section-heading centered">
        <div>
          <span className="eyebrow">NEW HERE?</span>
          <h2>
            Three steps to your <span className="hl">very own</span> nook.
          </h2>
        </div>
      </Reveal>
      <ol className="how-grid">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.n} className={`how-card how-${i}`} delay={i * 110} variant="tilt">
            <span className="how-art">{s.art}</span>
            <span className="how-num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function Finale() {
  return (
    <Reveal as="section" className="create-banner" variant="pop">
      <div className="finale-copy">
        <span className="eyebrow">GOT A CORNER TO FILL?</span>
        <h2>
          Your story deserves a <span className="hl">place of its own.</span>
        </h2>
        <p>
          Start with a name and a few things you love. Make it a shop, make it a scrapbook, make it
          you.
        </p>
        <Link href="/me" className="button primary big">
          Move in to Nook <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="finale-art" aria-hidden="true">
        <span className="arch-big">
          <NookMark size={170} className="on-dark" />
        </span>
        <span className="finale-note">your name here →</span>
      </div>
    </Reveal>
  );
}
