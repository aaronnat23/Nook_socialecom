'use client';
import Link from 'next/link';
import { Heart, ArrowUpRight, MapPin, Plus, Check } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import type { Product, Shop } from '@lilac/api-client';
import { assetPath, money } from '@lilac/renderer';
import { useApp } from './provider';
import { Reveal } from './motion';
import { ProductStage } from './stage';
import { api } from '@/lib/api';

const tilts = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7];

export function FavoriteButton({ product }: { product: Product }) {
  const { me, loading, requireAuth, refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(0);
  const saved = !!me?.favorites.includes(product.id);
  return (
    <button
      className={`favorite-button ${saved ? 'selected' : ''}`}
      disabled={busy || loading}
      aria-label={saved ? `Unsave ${product.title}` : `Save ${product.title}`}
      aria-pressed={saved}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!requireAuth()) return;
        setBusy(true);
        try {
          await api(`/products/${product.id}/favorite`, { method: saved ? 'DELETE' : 'POST' });
          if (!saved) setPop((n) => n + 1);
          await refresh();
        } catch (e) {
          toast((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      {pop > 0 && saved && (
        <span className="heart-burst" key={pop} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}

export function FollowButton({ shop, compact = false }: { shop: Shop; compact?: boolean }) {
  const { me, loading, requireAuth, refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const followed = !!me?.following.includes(shop.id);
  return (
    <button
      className={`button ${compact ? 'follow-button' : 'soft'} ${followed ? 'following' : ''}`}
      disabled={busy || loading}
      aria-label={`${followed ? 'Unfollow' : 'Follow'} ${shop.name}`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!requireAuth()) return;
        setBusy(true);
        try {
          await api(`/shops/${shop.id}/follow`, { method: followed ? 'DELETE' : 'POST' });
          await refresh();
        } catch (e) {
          toast((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="follow-icon" key={String(followed)}>
        {followed ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
      </span>{' '}
      {!compact && (followed ? 'Following' : 'Follow space')}
    </button>
  );
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
}

function stockNote(product: Product) {
  if (!product.variants?.length) return null;
  const left = product.variants.reduce((sum, v) => sum + v.stock, 0);
  if (left === 0) return 'Sold out';
  if (left <= 4) return `Only ${left} left`;
  return null;
}

export function ProductCard({
  product,
  index = 0,
  plain = false,
}: {
  product: Product;
  index?: number;
  /** Plain cards sit inside a seller's own storefront, so they carry no Nook styling or motion. */
  plain?: boolean;
}) {
  const note = stockNote(product);
  const body = (
    <>
      <div className={`product-image tone-${index % 6}`}>
        <Link href={`/product/${product.slug}`} aria-label={product.title} tabIndex={-1}>
          <ProductStage stage={product.stage} image={product.image} alt={product.title} />
        </Link>
        <FavoriteButton product={product} />
        {!plain && index === 0 ? (
          <span className="product-label">Nook pick</span>
        ) : note ? (
          <span className="product-label alert">{note}</span>
        ) : null}
      </div>
      <div className="product-title-row">
        <Link href={`/product/${product.slug}`}>
          <h3>{product.title}</h3>
        </Link>
        <span className="price-tag">{money(product.price_minor)}</span>
      </div>
      <Link href={`/shop/${product.shop_slug}`} className="product-shop">
        <span className="shop-dot" aria-hidden="true">
          {product.shop_name.slice(0, 1)}
        </span>
        {product.shop_name}
        <ArrowUpRight size={12} />
      </Link>
      <p className="product-meta">{product.category}</p>
    </>
  );
  if (plain) return <article className="product-card plain">{body}</article>;
  return (
    <Reveal
      as="article"
      className="product-card"
      delay={(index % 4) * 70}
      style={{ ['--tilt' as string]: `${tilts[index % tilts.length]}deg` } as CSSProperties}
    >
      {body}
    </Reveal>
  );
}

const walls = ['butter', 'lilac', 'pink', 'mint', 'sky', 'peach'];

/** A shop is a nook: an arched window onto the place with a little name plate under it. */
export function ShopCard({ shop, index = 0 }: { shop: Shop; index?: number }) {
  return (
    <Reveal
      as="article"
      className={`shop-card wall-${walls[index % walls.length]}`}
      delay={(index % 4) * 80}
      variant="pop"
    >
      <Link
        href={`/shop/${shop.slug}`}
        className="shop-card-cover"
        aria-label={`Visit ${shop.name}`}
        tabIndex={-1}
      >
        <span className="arch">
          <img src={assetPath(shop.cover)} alt={`The ${shop.name} collection`} loading="lazy" />
        </span>
        <span className="shop-category">{shop.category}</span>
        <span className="shop-card-arrow">
          <ArrowUpRight size={18} strokeWidth={2.4} />
        </span>
      </Link>
      <div className="shop-plate">
        <Link href={`/shop/${shop.slug}`} className="shop-card-identity">
          <span className={`shop-logo logo-${index % 4}`}>{initials(shop.name)}</span>
          <div>
            <h3>{shop.name}</h3>
            <span>
              <MapPin size={11} />
              {shop.location}
            </span>
          </div>
        </Link>
        <FollowButton shop={shop} compact />
      </div>
      <p>{shop.bio}</p>
    </Reveal>
  );
}
