'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  Paintbrush,
  Package,
  Users,
  ShoppingBag,
  Heart,
  Flower2,
  ExternalLink,
} from 'lucide-react';
import type { Order, Product, Shop } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import { money } from '@lilac/renderer';
import { api } from '@/lib/api';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
import { Storefront } from './storefront';
import { ProductCard, ShopCard } from './cards';
import { TemplateGallery } from './templates';
export function SpacePage() {
  return (
    <AuthGate>
      <Space />
    </AuthGate>
  );
}
function Space() {
  const { me, refresh, toast } = useApp();
  const search = useSearchParams();
  const [tab, setTab] = useState(search.has('saved') ? 'Saved finds' : 'Overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pub, setPub] = useState<Document | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);
  useEffect(() => {
    if (!me) return;
    Promise.all([
      api<{ items: Product[] }>(`/shops/${me.shop.id}/products`),
      api<{ items: Order[] }>(`/shops/${me.shop.id}/orders`),
      api<{ document: Document }>(`/shops/${me.shop.id}/published`).catch(() => null),
      api<{ products: Product[]; shops: Shop[] }>('/discover'),
    ])
      .then(([p, o, v, d]) => {
        setProducts(p.items);
        setOrders(o.items);
        setPub(v?.document || null);
        setAllProducts(d.products);
        setShops(d.shops);
      })
      .catch((e) => setError(e.message));
  }, [me]);
  if (!me) return null;
  const sales = orders
    .filter((o) => ['paid', 'shipped', 'delivered'].includes(o.state))
    .reduce((sum, o) => sum + o.total_minor, 0);
  return (
    <div className="page-wrap" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1>Make yourself at home, {me.display_name.split(' ')[0]}.</h1>
          <p>A space to tell your story, share your finds, and make something yours.</p>
        </div>
        <Link className="button primary" href="/me/edit">
          <Paintbrush size={15} />
          Customize your space
        </Link>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="space-banner">
        <span className="shop-logo">
          {me.shop.name
            .split(' ')
            .map((x) => x[0])
            .slice(0, 2)}
        </span>
        <div>
          <h2>{me.shop.name}</h2>
          <p>
            @{me.handle} · {me.shop.location}
          </p>
        </div>
        <div className="button-row">
          {pub && (
            <Link className="button outline" href={`/shop/${me.shop.slug}`}>
              <ExternalLink size={14} />
              View public space
            </Link>
          )}
          <Link className="button soft" href="/me/edit">
            Edit storefront <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <nav className="subnav" aria-label="Your space sections">
        {['Overview', 'Saved finds', 'Following'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <Link href="/me/products">Products</Link>
        <Link href="/me/orders">Shop orders</Link>
        <Link href="/orders">Your purchases</Link>
      </nav>
      {tab === 'Overview' ? (
        <>
          <div className="stats-grid">
            <Stat
              icon={<Package size={14} />}
              label="Your products"
              value={String(products.filter((p) => p.status === 'published').length)}
              note="Published in your collection"
            />
            <Stat
              icon={<Users size={14} />}
              label="Your community"
              value={String(me.shop.followers)}
              note="People following your space"
            />
            <Stat
              icon={<ShoppingBag size={14} />}
              label="Shop orders"
              value={String(orders.length)}
              note="Sandbox orders only"
            />
            <Stat
              icon={<Heart size={14} />}
              label="Sandbox sales"
              value={money(sales)}
              note="No real money collected"
            />
          </div>
          <TemplateGallery shop={me.shop} products={products} />
          {!me.seller_enabled && (
            <div className="panel" style={{ marginBottom: 25 }}>
              <h2>Your space could be a shop.</h2>
              <p>
                Start with a few things you love. Sandbox selling lets you try every step before a
                real launch.
              </p>
              <label className="onboarding-terms">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                I understand this enables test selling only. I’ll review seller terms, payment
                approval and Malaysian launch requirements before taking live orders.
              </label>
              <button
                disabled={!terms}
                className="button primary"
                onClick={async () => {
                  try {
                    await api('/me/seller-onboarding', {
                      method: 'POST',
                      body: JSON.stringify({ accepted_terms: true }),
                    });
                    await refresh();
                    toast('Your sandbox shop is ready. Add your first product.');
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Start selling in sandbox <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          <div className="section-heading">
            <div>
              <span className="eyebrow">AS THE WORLD SEES IT</span>
              <h2>
                Your published <em>space.</em>
              </h2>
            </div>
            <Link href="/me/edit" className="text-button">
              Make it yours <Paintbrush size={15} />
            </Link>
          </div>
          {pub ? (
            <div className="storefront-container" style={{ marginBottom: 45 }}>
              <Storefront
                document={pub}
                products={products.filter((p) => p.status === 'published')}
                shop={me.shop}
              />
            </div>
          ) : (
            <div className="empty-state">
              <Flower2 size={30} />
              <h3>Your story is ready to begin.</h3>
              <p>Choose a theme, add a little personality, and publish your first space.</p>
              <Link className="button primary" href="/me/edit">
                Open the editor
              </Link>
            </div>
          )}
        </>
      ) : tab === 'Saved finds' ? (
        <>
          <div className="product-grid">
            {allProducts
              .filter((p) => me.favorites.includes(p.id))
              .map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          </div>
          {me.favorites.length === 0 && (
            <div className="empty-state">
              <Heart size={30} />
              <h3>Keep the good things close.</h3>
              <p>Tap a heart on any product to save it here.</p>
              <Link className="button soft" href="/">
                Discover little things
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="shop-grid">
            {shops
              .filter((s) => me.following.includes(s.id))
              .map((s, i) => (
                <ShopCard key={s.id} shop={s} index={i} />
              ))}
          </div>
          {me.following.length === 0 && (
            <div className="empty-state">
              <Users size={30} />
              <h3>Find your kind of people.</h3>
              <p>Follow the shops that feel like you. They’ll be waiting here.</p>
              <Link className="button soft" href="/">
                Meet the makers
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat-card">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
