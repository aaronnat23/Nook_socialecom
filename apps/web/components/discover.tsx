'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Flower2,
  SlidersHorizontal,
  Shirt,
  Armchair,
  Paintbrush,
  Diamond,
  Leaf,
  Shapes,
  Check,
  Search,
  X,
} from 'lucide-react';
import type { Product, Shop } from '@lilac/api-client';
import { api } from '@/lib/api';
import { ProductCard, ShopCard } from './cards';
import { useApp } from './provider';
interface Feed {
  shops: Shop[];
  products: Product[];
  categories: string[];
}
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
  const icons = [Shapes, Shirt, Armchair, Paintbrush, Diamond, Leaf, Flower2];
  return (
    <div className="page-wrap discover-page" id="page-content">
      <form action="/search" className="mobile-search">
        <Search size={17} />
        <input
          aria-label="Search products and shops"
          name="q"
          defaultValue={searchQuery || ''}
          placeholder="Find your kind of thing…"
        />
        <button aria-label="Search" type="submit">
          <ArrowRight size={17} />
        </button>
      </form>
      {searchQuery === undefined ? (
        <>
          <div className="page-intro">
            <div>
              <span className="tiny-sparkle">✳</span> A home for independent spirits.
            </div>
            <span className="intro-note">Good things come from little shops.</span>
          </div>
          <section className="discover-hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="little-line" /> SMALL SHOPS. BIG PERSONALITY.
              </span>
              <h1>
                Good finds.
                <br />
                Your kind of <em>people.</em>
              </h1>
              <p>
                A world of independent shops and thoughtfully made things.
                <br className="desktop-only" /> Find a little something that feels a lot like you.
              </p>
              <a className="button primary" href="#finds">
                Find your next favorite <ArrowUpRight size={18} />
              </a>
              <div className="hero-footnote">
                <span className="mini-avatars">
                  <img src="/images/seed_hero_0.jpg" alt="" />
                  <img src="/images/seed_hero_3.jpg" alt="" />
                  <img src="/images/seed_hero_6.jpg" alt="" />
                </span>
                <span>Made by real people. Discovered by you.</span>
              </div>
            </div>
            <div className="hero-collage" aria-label="A collection of independent finds">
              <div className="collage-orbit" />
              <div className="collage-card collage-one">
                <img src="/images/seed_product_0.jpg" alt="Handcrafted ceramic collection" />
                <div>
                  <span>A slower kind of beautiful</span>
                  <Flower2 size={16} />
                </div>
              </div>
              <div className="collage-card collage-two">
                <img src="/images/seed_product_9.jpg" alt="Thoughtful everyday jewelry" />
                <div>
                  <span>Little everyday treasures</span>
                  <HeartIcon />
                </div>
              </div>
              <span className="collage-sticker">
                <Flower2 size={29} />
                <span>
                  INDEPENDENT
                  <br />
                  LOOKS GOOD ON YOU
                </span>
              </span>
              <span className="collage-sparkle one">✧</span>
              <span className="collage-sparkle two">✳</span>
              <span className="handwritten">find your people ↗</span>
            </div>
          </section>
          <div className="value-strip">
            <span>
              <Flower2 size={16} /> A little less ordinary
            </span>
            <span>
              <Shapes size={16} /> Independent by nature
            </span>
            <span>
              <Leaf size={16} /> Thoughtfully chosen
            </span>
            <span>
              <Sparkles size={16} /> Your space to be you
            </span>
          </div>
        </>
      ) : (
        <div className="search-heading">
          <span className="eyebrow">A LITTLE DISCOVERY</span>
          <h1>{searchQuery ? <>Finds for “{searchQuery}”</> : 'Explore all the little things.'}</h1>
          <p className="muted">Find your kind of thing, from independent Malaysian shops.</p>
        </div>
      )}
      {searchQuery !== undefined && searchShops.length > 0 && (
        <section className="shops-section">
          <div className="section-heading">
            <h2>
              Spaces to <em>discover.</em>
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
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE PEOPLE BEHIND THE FINDS</span>
              <h2>
                Small shops. <em>Big heart.</em>
              </h2>
            </div>
            <button className="text-button" onClick={() => setAllShops(!allShops)}>
              {allShops ? 'Show less' : 'Meet the shops'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="shop-grid">
            {initial.shops.slice(0, allShops ? 8 : 4).map((s, i) => (
              <ShopCard key={s.id} shop={s} index={i} />
            ))}
          </div>
        </section>
      )}
      <section id="finds" className="finds-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURATED WITH A LITTLE CURIOSITY</span>
            <h2>
              Find your next <em>favorite.</em>
            </h2>
          </div>
          <div className="feed-tabs">
            {['For you', 'Following', 'New arrivals'].map((t) => (
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => {
                  setTab(t);
                  if (t === 'New arrivals') setSort('newest');
                }}
              >
                {t === 'For you' && <Sparkles size={13} />} {t}
              </button>
            ))}
          </div>
        </div>
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
        <div className={`product-grid ${busy ? 'is-loading' : ''}`}>
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {visible.length === 0 && !busy && (
          <div className="empty-state">
            <Search size={30} />
            <h3>
              {tab === 'Following'
                ? 'Your kind of people are out there.'
                : 'No little finds here just yet.'}
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
        <div className="end-note">
          <Flower2 size={18} />
          <span>Every find has a person behind it. Thanks for shopping small.</span>
        </div>
      </section>
      <section className="create-banner">
        <div>
          <span className="eyebrow">A SPACE THAT’S UNIQUELY YOURS</span>
          <h2>
            Your story deserves
            <br />a little corner of its own.
          </h2>
          <p>Make it personal. Make it a shop. Make it you.</p>
        </div>
        <Link href="/me" className="button primary">
          Create your space <ArrowUpRight size={18} />
        </Link>
        <Flower2 className="banner-flower" size={200} strokeWidth={0.6} />
      </section>
    </div>
  );
}
function HeartIcon() {
  return <span aria-hidden="true">♡</span>;
}
