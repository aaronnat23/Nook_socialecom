'use client';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Heart,
  Package,
  Paintbrush,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { Order, Product, Shop } from '@lilac/api-client';
import { themes, type Document } from '@lilac/schema';
import { assetPath, money } from '@lilac/renderer';
import { api } from '@/lib/api';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
import { Storefront } from './storefront';
import { ProductCard, ShopCard, initials } from './cards';
import { TemplateGallery } from './templates';
import { NookWindow } from './frame';
import { NookMark, Squiggle, Arrow } from './brand';
import { CountUp, Reveal } from './motion';

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
  const [tab, setTab] = useState(search.has('saved') ? 'Saved finds' : 'My nook');
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
  const published = products.filter((p) => p.status === 'published');
  const sales = orders
    .filter((o) => ['paid', 'shipped', 'delivered'].includes(o.state))
    .reduce((sum, o) => sum + o.total_minor, 0);
  const firstName = me.display_name.split(' ')[0];
  return (
    <div className="page-wrap my-space" id="page-content">
      {error && <div className="error">{error}</div>}
      <Room
        shop={me.shop}
        handle={me.handle}
        firstName={firstName}
        doc={pub}
        livePublished={!!pub}
      />
      <Reveal className="sticker-row">
        <Stat
          tone="lilac"
          icon={<Package size={16} />}
          label="On your shelves"
          value={published.length}
          note="products published"
        />
        <Stat
          tone="butter"
          icon={<Users size={16} />}
          label="Neighbours"
          value={me.shop.followers}
          note="people following you"
        />
        <Stat
          tone="pink"
          icon={<ShoppingBag size={16} />}
          label="Shop orders"
          value={orders.length}
          note="sandbox orders only"
        />
        <Stat
          tone="mint"
          icon={<Heart size={16} />}
          label="Sandbox sales"
          text={money(sales)}
          note="no real money collected"
        />
      </Reveal>
      <nav className="subnav" aria-label="Your space sections">
        {['My nook', 'Saved finds', 'Following'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <Link href="/me/products">Products</Link>
        <Link href="/me/orders">Shop orders</Link>
        <Link href="/orders">Your purchases</Link>
      </nav>
      {tab === 'My nook' ? (
        <>
          {me.seller_enabled ? (
            <Furnish
              steps={[
                { title: 'Move in', hint: 'You’re here, so that’s done.', done: true, href: '/me' },
                {
                  title: 'Stock the shelves',
                  hint: 'Add your first product with a photo and a price.',
                  done: published.length > 0,
                  href: '/me/products',
                },
                {
                  title: 'Open the door',
                  hint: 'Publish your space so visitors can find it.',
                  done: !!pub,
                  href: '/me/edit',
                },
                {
                  title: 'Meet a neighbour',
                  hint: 'Your first follower is a good sign.',
                  done: me.shop.followers > 0,
                  href: `/shop/${me.shop.slug}`,
                },
                {
                  title: 'Make a first sale',
                  hint: 'Sandbox orders count while you practise.',
                  done: orders.length > 0,
                  href: `/shop/${me.shop.slug}`,
                },
              ]}
            />
          ) : (
            <Reveal className="panel move-in-panel">
              <NookMark size={64} />
              <div>
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
            </Reveal>
          )}
          <TemplateGallery shop={me.shop} products={products} />
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">AS THE WORLD SEES IT</span>
              <h2>
                Your published <span className="hl">nook.</span>
              </h2>
            </div>
            <Link href="/me/edit" className="text-button">
              Make it yours <Paintbrush size={15} />
            </Link>
          </Reveal>
          {pub ? (
            <Reveal className="window-wrap">
              <NookWindow address={`/ ${me.shop.slug}`} tag="Live preview">
                <Storefront document={pub} products={published} shop={me.shop} />
              </NookWindow>
            </Reveal>
          ) : (
            <div className="empty-state">
              <NookMark size={56} />
              <h3>Your story is ready to begin.</h3>
              <p>Choose a look, add a little personality, and publish your first space.</p>
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
              <Heart size={34} />
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
              <Users size={34} />
              <h3>Find your neighbours.</h3>
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

/**
 * The top of My Space is the shop's own room. It borrows the colours of the look
 * the seller has published, so the page you land on already feels like yours.
 */
function Room({
  shop,
  handle,
  firstName,
  doc,
  livePublished,
}: {
  shop: Shop;
  handle: string;
  firstName: string;
  doc: Document | null;
  livePublished: boolean;
}) {
  const template = themes.find((t) => t.id === shop.theme);
  const colors = (doc || template?.document)?.theme.colors;
  const style = colors
    ? ({
        ['--room-bg' as string]: `color-mix(in srgb, ${colors.accent} 26%, ${colors.background})`,
        ['--room-text' as string]: colors.text,
        ['--room-accent' as string]: colors.accent,
      } as CSSProperties)
    : undefined;
  return (
    <section className="nook-room" style={style}>
      <div className="room-main">
        <p className="welcome-note">
          welcome home, {firstName}
          <Squiggle className="welcome-squiggle" />
        </p>
        <div className="room-id">
          <span className="room-avatar">{initials(shop.name)}</span>
          <div>
            <h1>{shop.name}</h1>
            <p className="room-handle">
              @{handle} · {shop.location}
            </p>
          </div>
        </div>
        <p className="room-bio">{shop.bio}</p>
        <div className="vibe-chips" aria-label="Your nook's vibe">
          <span>{shop.category}</span>
          {template && <span>{template.name} look</span>}
          <span>{shop.location}</span>
        </div>
        <div className="room-actions">
          <Link className="button primary big" href="/me/edit">
            <Paintbrush size={17} />
            Customize your space
          </Link>
          {livePublished && (
            <Link className="button outline big" href={`/shop/${shop.slug}`}>
              <ExternalLink size={16} />
              View public space
            </Link>
          )}
        </div>
      </div>
      <div className="room-art" aria-hidden="true">
        <span className="room-arch">
          <img src={assetPath(shop.cover)} alt="" />
        </span>
        <span className="room-sticker">
          <NookMark size={46} />
        </span>
        <span className="room-note">
          that’s you!
          <Arrow />
        </span>
      </div>
    </section>
  );
}

function Furnish({
  steps,
}: {
  steps: { title: string; hint: string; done: boolean; href: string }[];
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const next = steps.findIndex((s) => !s.done);
  return (
    <Reveal className="furnish" variant="pop">
      <div className="furnish-ring" style={{ ['--p' as string]: pct } as CSSProperties}>
        <div>
          <strong>
            <CountUp value={pct} />%
          </strong>
          <span>furnished</span>
        </div>
      </div>
      <div className="furnish-body">
        <span className="eyebrow">FURNISH YOUR NOOK</span>
        <h2>
          {next === -1 ? (
            <>
              Fully <span className="hl">furnished.</span>
            </>
          ) : (
            <>
              {steps.length - doneCount} little {steps.length - doneCount === 1 ? 'step' : 'steps'}{' '}
              to <span className="hl">go.</span>
            </>
          )}
        </h2>
        <ol className="furnish-steps">
          {steps.map((s, i) => (
            <li key={s.title} className={`${s.done ? 'done' : ''} ${i === next ? 'next' : ''}`}>
              <span className="step-check" aria-hidden="true">
                {s.done && <Check size={14} strokeWidth={3.4} />}
              </span>
              <span className="step-text">
                <strong>{s.title}</strong>
                <small>{s.hint}</small>
              </span>
              {i === next && (
                <Link className="button small-button primary" href={s.href}>
                  Do this next <ArrowUpRight size={14} />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}

function Stat({
  icon,
  label,
  value,
  text,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  text?: string;
  note: string;
  tone: 'lilac' | 'butter' | 'pink' | 'mint';
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span>
        {icon}
        {label}
      </span>
      <strong>{text ?? <CountUp value={value ?? 0} />}</strong>
      <p>{note}</p>
    </div>
  );
}
