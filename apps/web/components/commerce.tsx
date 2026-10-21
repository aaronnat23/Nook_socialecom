'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Package,
  Loader2,
  Share2,
  ArrowUpRight,
} from 'lucide-react';
import type { Product, Order, Shop, Variant } from '@lilac/api-client';
import { money, assetPath } from '@lilac/renderer';
import { api } from '@/lib/api';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
import { FavoriteButton } from './cards';
import { ProductStage } from './stage';
export function ProductDetail({ product: p }: { product: Product }) {
  const { requireAuth, toast } = useApp();
  const [variant, setVariant] = useState(p.variants[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<'Description' | 'Details' | 'Shipping & returns'>('Description');
  const v = p.variants.find((x) => x.id === variant);
  const label = (x: Variant) => Object.values(x.options).join(' / ') || x.sku;
  const unit = v?.price_minor ?? p.price_minor;
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied. Pass it on.');
      }
    } catch {
      /* the share sheet was dismissed */
    }
  };
  return (
    <div className="page-wrap pd" id="page-content">
      <div className="breadcrumbs">
        <Link href="/">Discover</Link>
        <span>/</span>
        <Link href={`/shop/${p.shop_slug}`}>{p.shop_name}</Link>
        <span>/</span>
        <span>{p.title}</span>
      </div>
      <div className="pd-grid">
        <div className="pd-media">
          <Gallery product={p}>
            <Link
              className="round-button pd-back"
              href={`/shop/${p.shop_slug}`}
              aria-label={`Back to ${p.shop_name}`}
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="pd-actions">
              <button
                type="button"
                className="round-button"
                aria-label="Share this find"
                onClick={share}
              >
                <Share2 size={18} />
              </button>
              <FavoriteButton product={p} />
            </div>
          </Gallery>
        </div>
        <div className="pd-info">
          <div className="pd-top">
            <Link href={`/shop/${p.shop_slug}`} className="pd-shop">
              <span className="shop-dot" aria-hidden="true">
                {p.shop_name.slice(0, 1)}
              </span>
              {p.shop_name}
              <ArrowUpRight size={13} />
            </Link>
            <span className="pd-cat">{p.category}</span>
          </div>
          <div className="pd-title">
            <h1>{p.title}</h1>
            {v && <span className="pd-variant">{label(v)}</span>}
          </div>
          <p className="pd-sub">A small-batch find from {p.shop_name}.</p>
          <div className="pd-tabs" role="tablist" aria-label="About this find">
            {(['Description', 'Details', 'Shipping & returns'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="pd-panel" key={tab} role="tabpanel">
            {tab === 'Description' && <p>{p.description}</p>}
            {tab === 'Details' && (
              <dl>
                <div>
                  <dt>Shop</dt>
                  <dd>{p.shop_name}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{p.category}</dd>
                </div>
                <div>
                  <dt>Option</dt>
                  <dd>{v ? label(v) : 'Original'}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{v && v.stock > 0 ? `${v.stock} in stock` : 'Sold out'}</dd>
                </div>
              </dl>
            )}
            {tab === 'Shipping & returns' && (
              <ul className="pd-policies">
                <li>
                  <Truck size={18} />
                  <span>
                    <strong>Sent with care, from Malaysia</strong>
                    {`Domestic flat-rate shipping${p.shipping_minor !== undefined ? ' · ' + money(p.shipping_minor) : ''}. Final quote shown at checkout.`}
                  </span>
                </li>
                <li>
                  <ShieldCheck size={18} />
                  <span>
                    <strong>A little peace of mind</strong>
                    {p.return_policy || 'See this shop’s return policy at checkout.'}
                  </span>
                </li>
              </ul>
            )}
          </div>
          <div className="pd-choose">
            <span className="pd-label" id="finish-label">
              Choose your finish
            </span>
            <div className="chip-row" role="radiogroup" aria-labelledby="finish-label">
              {p.variants.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={x.id === variant}
                  disabled={x.stock === 0}
                  className={`chip ${x.id === variant ? 'active' : ''}`}
                  onClick={() => {
                    setVariant(x.id);
                    setQty(1);
                    setAdded(false);
                  }}
                >
                  {label(x)}
                  {x.stock === 0 ? ' · Sold out' : ''}
                </button>
              ))}
            </div>
            <div className="pd-qty-row">
              <div className="quantity-control">
                <button aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus size={13} />
                </button>
                <span>{qty}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={qty >= (v?.stock || 0)}
                  onClick={() => setQty(qty + 1)}
                >
                  <Plus size={13} />
                </button>
              </div>
              <p className="stock-note">
                {v && v.stock > 0
                  ? v.stock <= 4
                    ? `Only ${v.stock} left`
                    : `${v.stock} available`
                  : 'This little find is sold out.'}
              </p>
            </div>
          </div>
          <div className="sandbox-note">
            <ShieldCheck size={16} />
            <span>Sample catalog · Sandbox checkout. This preview does not charge real money.</span>
          </div>
          <div className="buy-bar">
            <div className="buy-price">
              <span>Price</span>
              <strong>{money(unit * qty)}</strong>
            </div>
            <button
              className="buy-cta"
              disabled={busy || !v || v.stock === 0}
              onClick={async () => {
                if (!requireAuth()) return;
                setBusy(true);
                try {
                  await api(`/cart/items/${variant}`, {
                    method: 'PUT',
                    body: JSON.stringify({ quantity: qty }),
                  });
                  setAdded(true);
                  toast('A good find, added to your bag.');
                } catch (e) {
                  toast((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {added ? 'Added to your bag' : 'Add to bag'}
              <span className="cta-disc">
                {busy ? (
                  <Loader2 size={16} className="spin" />
                ) : added ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <ShoppingBag size={16} />
                )}
              </span>
            </button>
          </div>
          {added && (
            <Link href="/cart" className="text-button pd-bag-link">
              Take a look at your bag <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** The product's hero: the staged view first, then the plain photo, as a swipeable pager. */
function Gallery({ product: p, children }: { product: Product; children?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const staged = !!p.stage?.cutout;
  const slides = staged ? 2 : 1;
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="pd-hero">
      <div
        className="pd-track"
        role="region"
        aria-label="Product photos"
        tabIndex={0}
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        <div className="pd-slide">
          <ProductStage stage={p.stage} image={p.image} alt={p.title} className="is-hero" eager />
        </div>
        {staged && (
          <div className="pd-slide">
            <ProductStage
              stage={null}
              image={p.image}
              alt={`${p.title}, the original photo`}
              eager
            />
          </div>
        )}
      </div>
      {children}
      {slides > 1 && (
        <div className="pager" role="group" aria-label="Photo views">
          {Array.from({ length: slides }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={i === 0 ? 'Show the styled view' : 'Show the original photo'}
              aria-current={index === i}
              className={index === i ? 'active' : ''}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
interface CartRow {
  variant: Pick<Variant, 'id' | 'price_minor' | 'stock' | 'options'>;
  product: Product;
  quantity: number;
}
interface CartGroup {
  shop: Shop;
  items: CartRow[];
}
export function CartPage() {
  return (
    <AuthGate>
      <Cart />
    </AuthGate>
  );
}
function Cart() {
  const { me, toast } = useApp();
  const [groups, setGroups] = useState<CartGroup[] | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    api<{ groups: CartGroup[] }>('/cart')
      .then((r) => {
        setGroups(r.groups);
        setError('');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [me]);
  const change = async (row: CartRow, qty: number) => {
    try {
      await api(`/cart/items/${row.variant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: qty }),
      });
      await load();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <div className="page-wrap commerce-shell" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">GOOD THINGS, KEPT CLOSE</span>
          <h1>Your little bag.</h1>
          <p>Thoughtful finds from people with a point of view.</p>
        </div>
        <Link href="/" className="text-button">
          <ArrowLeft size={14} />
          Keep discovering
        </Link>
      </div>
      {error && (
        <div className="error">
          {error}
          <button className="text-button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {groups === null && !error ? (
        <div className="empty-state">
          <Loader2 className="spin" />
          Opening your bag…
        </div>
      ) : groups?.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={34} />
          <h3>A little room for something lovely.</h3>
          <p>Your bag is empty. Your next favorite might be just around the corner.</p>
          <Link href="/" className="button primary">
            Discover little things <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        groups?.map((g) => {
          const total = g.items.reduce((s, i) => s + i.variant.price_minor * i.quantity, 0);
          return (
            <div className="cart-layout" key={g.shop.id}>
              <div className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">FROM THE WORLD OF</span>
                    <h2>{g.shop.name}</h2>
                  </div>
                  <Link className="text-button" href={`/shop/${g.shop.slug}`}>
                    Visit the shop ↗
                  </Link>
                </div>
                {g.items.map((row) => (
                  <div className="cart-item" key={row.variant.id}>
                    <Link href={`/product/${row.product.slug}`}>
                      <img src={assetPath(row.product.image)} alt={row.product.title} />
                    </Link>
                    <div className="item-info">
                      <Link href={`/product/${row.product.slug}`}>
                        <h3>{row.product.title}</h3>
                      </Link>
                      <p>{Object.values(row.variant.options).join(' / ')}</p>
                      <div className="quantity-control">
                        <button
                          aria-label={`Remove one ${row.product.title}`}
                          onClick={() => void change(row, row.quantity - 1)}
                        >
                          <Minus size={11} />
                        </button>
                        {row.quantity}
                        <button
                          aria-label={`Add one ${row.product.title}`}
                          onClick={() => void change(row, row.quantity + 1)}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-price">
                      <span>{money(row.variant.price_minor * row.quantity)}</span>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${row.product.title}`}
                        onClick={() => void change(row, 0)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="panel" style={{ height: 'fit-content' }}>
                <h2>A little overview.</h2>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>{money(total)}</span>
                </div>
                <p className="fineprint">Shipping calculated by the shop at checkout.</p>
                <div className="sandbox-note">
                  <ShieldCheck size={17} />
                  <span>One shop per checkout. Each maker sends your finds with care.</span>
                </div>
                <Link className="button primary wide" href={`/checkout/${g.shop.id}`}>
                  Sandbox checkout <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
interface Quote {
  shop_id: string;
  items: Order['items'];
  subtotal_minor: number;
  shipping_minor: number;
  total_minor: number;
  currency: string;
  return_policy: string;
  sandbox: boolean;
}
export function CheckoutPage({ shopId }: { shopId: string }) {
  return (
    <AuthGate>
      <Checkout shopId={shopId} />
    </AuthGate>
  );
}
function Checkout({ shopId }: { shopId: string }) {
  const router = useRouter();
  const { me, toast } = useApp();
  const [group, setGroup] = useState<CartGroup | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    api<{ groups: CartGroup[] }>('/cart')
      .then(async (r) => {
        const g = r.groups.find((x) => x.shop.id === shopId);
        if (!g) throw new Error('There are no items from this shop in your bag.');
        setGroup(g);
        setQuote(
          await api<Quote>('/checkout/quote', {
            method: 'POST',
            body: JSON.stringify({
              items: g.items.map((i) => ({ variant_id: i.variant.id, quantity: i.quantity })),
            }),
          }),
        );
      })
      .catch((e) => setError(e.message));
  }, [shopId, me]);
  return (
    <div className="page-wrap" id="page-content">
      <div className="breadcrumbs">
        <Link href="/cart">Your bag</Link>
        <span>/</span>
        <span>Sandbox checkout</span>
      </div>
      <div className="page-title">
        <div>
          <span className="eyebrow">THE LAST LITTLE STEP</span>
          <h1>Almost yours.</h1>
          <p>Your finds from {group?.shop.name || 'an independent shop'}.</p>
        </div>
        <span className="status-pill">SANDBOX · NO REAL CHARGE</span>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {quote && group ? (
        <form
          className="cart-layout"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              const order = await api<Order>('/checkout/session', {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotencyKey },
                body: JSON.stringify({
                  items: group.items.map((i) => ({
                    variant_id: i.variant.id,
                    quantity: i.quantity,
                  })),
                  address: {
                    name: f.get('name'),
                    line1: f.get('line1'),
                    city: f.get('city'),
                    postcode: f.get('postcode'),
                    country: 'MY',
                  },
                }),
              });
              await api(`/orders/${order.id}/sandbox-pay`, { method: 'POST' });
              router.push(`/orders/${order.id}`);
            } catch (e) {
              setError((e as Error).message);
              toast(
                'Checkout needs your attention. Your order will not be duplicated when you retry.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <section className="panel">
            <h2>Where should your finds go?</h2>
            <p>Domestic Malaysia delivery. Use sample details for this sandbox test.</p>
            <div className="form-grid">
              <label className="full">
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={me?.display_name}
                />
              </label>
              <label className="full">
                Street address
                <input
                  name="line1"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="123, Jalan…"
                />
              </label>
              <label>
                City
                <input name="city" required minLength={2} maxLength={100} />
              </label>
              <label>
                Postcode
                <input name="postcode" required pattern="\d{5}" inputMode="numeric" maxLength={5} />
              </label>
              <label className="full">
                Country
                <input value="Malaysia" readOnly />
              </label>
            </div>
            <div className="sandbox-note">
              <ShieldCheck size={17} />
              <span>
                This is a test transaction. No card details are collected and no real money changes
                hands.
              </span>
            </div>
            <label className="onboarding-terms">
              <input type="checkbox" required />
              I’ve read this shop’s shipping and return policy and understand this is sandbox
              checkout.
            </label>
          </section>
          <section className="panel" style={{ height: 'fit-content' }}>
            <h2>Your little collection.</h2>
            {quote.items.map((i) => (
              <div className="summary-line" key={i.variant_id}>
                <span>
                  {i.title} × {i.quantity}
                </span>
                <span>{money(i.unit_price_minor * i.quantity)}</span>
              </div>
            ))}
            <div className="summary-line">
              <span>Domestic shipping</span>
              <span>{money(quote.shipping_minor)}</span>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <span>{money(quote.total_minor)}</span>
            </div>
            <p className="fineprint">{quote.return_policy}</p>
            <p className="fineprint">
              Prices and stock are checked again by the shop service before the order is placed.
            </p>
            <button className="button primary wide" disabled={busy} style={{ marginTop: 20 }}>
              {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}Place
              sandbox order <ArrowRight size={15} />
            </button>
          </section>
        </form>
      ) : (
        !error && (
          <div className="empty-state">
            <Loader2 className="spin" />
            Checking your little collection…
          </div>
        )
      )}
    </div>
  );
}
export function OrdersPage({ seller = false }: { seller?: boolean }) {
  return (
    <AuthGate>
      <Orders seller={seller} />
    </AuthGate>
  );
}
function Orders({ seller }: { seller: boolean }) {
  const { me, toast } = useApp();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const load = () =>
    api<{ items: Order[] }>(seller ? `/shops/${me!.shop.id}/orders` : '/orders')
      .then((r) => setOrders(r.items))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [me, seller]);
  return (
    <div className="page-wrap commerce-shell" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {seller ? 'YOUR SELLER STUDIO' : 'GOOD FINDS, ON THEIR WAY'}
          </span>
          <h1>{seller ? 'Orders for your little shop.' : 'Your little orders.'}</h1>
          <p>
            {seller
              ? 'Pack it with care. Send it with a little love.'
              : 'A history of things that felt like you.'}
          </p>
        </div>
        <Link className="button outline" href="/me">
          <ArrowLeft size={14} />
          My Space
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {orders?.length === 0 ? (
        <div className="empty-state">
          <Package size={35} />
          <h3>
            {seller
              ? 'The first little order is a lovely thing.'
              : 'Your next favorite is out there.'}
          </h3>
          <p>
            {seller
              ? 'Your sandbox orders will appear here as soon as someone checks out.'
              : 'Find something you love, then try the sandbox checkout.'}
          </p>
          <Link href="/" className="button soft">
            Explore Discover
          </Link>
        </div>
      ) : (
        orders?.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="order-card-head">
              <div>
                <Link href={`/orders/${o.id}`}>
                  <h3>
                    {o.shop_name} <ArrowRight size={12} />
                  </h3>
                </Link>
                <p>
                  {new Date(o.created_at).toLocaleDateString('en-MY')} · #{o.id.slice(0, 8)} ·
                  Sandbox
                </p>
              </div>
              <span className={`status-pill ${o.state}`}>{o.state.replaceAll('_', ' ')}</span>
            </div>
            {o.items.map((i) => (
              <div className="order-line" key={i.variant_id}>
                <span>
                  {i.title} × {i.quantity}
                </span>
                <span>{money(i.unit_price_minor * i.quantity)}</span>
              </div>
            ))}
            <div className="order-total">
              <span>Total, including shipping</span>
              <strong>{money(o.total_minor)}</strong>
            </div>
            {seller && o.state === 'paid' && (
              <form
                className="button-row"
                style={{ marginTop: 20 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api(`/shops/${me!.shop.id}/orders/${o.id}/ship`, {
                      method: 'POST',
                      body: JSON.stringify({ tracking: tracking[o.id] }),
                    });
                    await load();
                    toast('Marked as shipped. Your buyer can see the tracking.');
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                <input
                  aria-label="Tracking reference"
                  placeholder="Tracking reference or carrier / number"
                  minLength={3}
                  maxLength={160}
                  required
                  value={tracking[o.id] || ''}
                  onChange={(e) => setTracking({ ...tracking, [o.id]: e.target.value })}
                  style={{ maxWidth: 300 }}
                />
                <button className="button primary">
                  <Truck size={14} />
                  Mark shipped
                </button>
              </form>
            )}
            {o.tracking && <p>Tracking: {o.tracking}</p>}
          </div>
        ))
      )}
      {orders === null && !error && (
        <div className="empty-state">
          <Loader2 className="spin" />
          Finding your orders…
        </div>
      )}
    </div>
  );
}
export function OrderPage({ id }: { id: string }) {
  return (
    <AuthGate>
      <OrderDetail id={id} />
    </AuthGate>
  );
}
function OrderDetail({ id }: { id: string }) {
  const { toast } = useApp();
  const [o, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <div className="page-wrap" id="page-content">
      <div className="breadcrumbs">
        <Link href="/orders">Your orders</Link>
        <span>/</span>
        <span>#{id.slice(0, 8)}</span>
      </div>
      {error && <div className="error">{error}</div>}
      {o ? (
        <div className="order-detail">
          <div className="order-status-hero">
            <CheckCircle2 size={38} />
            <h1>
              {o.state === 'paid'
                ? 'A good find. A lovely choice.'
                : o.state === 'shipped'
                  ? 'Your little finds are on their way.'
                  : o.state === 'refunded'
                    ? 'Your sandbox order is refunded.'
                    : 'Your order, all in one place.'}
            </h1>
            <p>
              #{o.id.slice(0, 8)} · {o.shop_name} ·{' '}
              <span className={`status-pill ${o.state}`}>{o.state.replaceAll('_', ' ')}</span>
            </p>
          </div>
          <div className="panel">
            <h2>Your collection.</h2>
            {o.items.map((i) => (
              <div className="summary-line" key={i.variant_id}>
                <span>
                  {i.title} × {i.quantity}
                </span>
                <span>{money(i.unit_price_minor * i.quantity)}</span>
              </div>
            ))}
            <div className="summary-line">
              <span>Shipping</span>
              <span>{money(o.shipping_minor)}</span>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <span>{money(o.total_minor)}</span>
            </div>
            {o.tracking && <p>Tracking: {o.tracking}</p>}
            <div className="sandbox-note">
              <ShieldCheck size={17} />
              <span>Sandbox order. No real payment was collected.</span>
            </div>
            <div className="button-row">
              <Link href="/" className="button primary">
                Keep discovering <ArrowRight size={14} />
              </Link>
              {['pending_payment', 'paid'].includes(o.state) && (
                <button
                  className="button outline"
                  onClick={async () => {
                    try {
                      setOrder(
                        await api<Order>(`/orders/${o.id}/cancel-request`, { method: 'POST' }),
                      );
                      toast('Sandbox order closed and inventory returned.');
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  {o.state === 'paid' ? 'Request sandbox refund' : 'Cancel order'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        !error && (
          <div className="empty-state">
            <Loader2 className="spin" />
            Opening your order…
          </div>
        )
      )}
    </div>
  );
}
