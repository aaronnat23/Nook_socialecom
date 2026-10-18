'use client';
import Link from 'next/link';
import { Heart, ArrowUpRight, MapPin, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product, Shop } from '@lilac/api-client';
import { assetPath, money } from '@lilac/renderer';
import { useApp } from './provider';
import { api } from '@/lib/api';
export function FavoriteButton({ product }: { product: Product }) {
  const { me, loading, requireAuth, refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);
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
          await refresh();
        } catch (e) {
          toast((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
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
      {followed ? <Check size={15} /> : <Plus size={15} />}{' '}
      {!compact && (followed ? 'Following' : 'Follow space')}
    </button>
  );
}
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <article className="product-card">
      <div className={`product-image tone-${index % 4}`}>
        <Link href={`/product/${product.slug}`}>
          <img src={assetPath(product.image)} alt={product.title} loading="lazy" />
        </Link>
        <FavoriteButton product={product} />
        {index === 0 && <span className="product-label">A LITTLE FAVORITE</span>}
      </div>
      <Link href={`/shop/${product.shop_slug}`} className="product-shop">
        {product.shop_name}
        <ArrowUpRight size={11} />
      </Link>
      <div className="product-title-row">
        <Link href={`/product/${product.slug}`}>
          <h3>{product.title}</h3>
        </Link>
        <span>{money(product.price_minor)}</span>
      </div>
      <p className="product-meta">{product.category} · Independent find</p>
    </article>
  );
}
export function ShopCard({ shop, index = 0 }: { shop: Shop; index?: number }) {
  return (
    <article className={`shop-card shop-tone-${index % 4}`}>
      <Link href={`/shop/${shop.slug}`} className="shop-card-cover">
        <img src={assetPath(shop.cover)} alt={`The ${shop.name} collection`} loading="lazy" />
        <span className="shop-category">{shop.category}</span>
        <span className="shop-card-arrow">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="shop-card-info">
        <Link href={`/shop/${shop.slug}`} className="shop-card-identity">
          <span className={`shop-logo logo-${index % 4}`}>
            {shop.name
              .split(' ')
              .map((x) => x[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div>
            <h3>{shop.name}</h3>
            <span>
              <MapPin size={10} />
              {shop.location}
            </span>
          </div>
        </Link>
        <FollowButton shop={shop} compact />
      </div>
      <p>{shop.bio}</p>
    </article>
  );
}
