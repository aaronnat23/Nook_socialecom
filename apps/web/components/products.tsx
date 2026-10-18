'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Package,
  X,
  ImagePlus,
  Loader2,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import type { Product } from '@lilac/api-client';
import { assetPath, money } from '@lilac/renderer';
import { api } from '@/lib/api';
import { useModal } from '@/lib/use-modal';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
interface VariantForm {
  sku: string;
  options: Record<string, string>;
  price_minor: number;
  stock: number;
}
interface ProductForm {
  title: string;
  description: string;
  price_minor: number;
  image: string;
  category: string;
  status: string;
  variants: VariantForm[];
}
export function ProductsPage() {
  return (
    <AuthGate>
      <Products />
    </AuthGate>
  );
}
function Products() {
  const { me, toast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [collections, setCollections] = useState<
    { id: string; title: string; product_ids: string[] }[]
  >([]);
  const [collectionModal, setCollectionModal] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  useModal(() => setCollectionModal(false), collectionModal);
  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api<{ items: Product[] }>(`/shops/${me!.shop.id}/products`),
        api<{ items: typeof collections }>(`/shops/${me!.shop.id}/collections`),
      ]);
      setProducts(p.items);
      setCollections(c.items);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [me]);
  return (
    <div className="page-wrap commerce-shell" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR SELLER STUDIO</span>
          <h1>Your little collection.</h1>
          <p>Thoughtfully listed. Ready to find their people.</p>
        </div>
        <div className="button-row">
          <Link href="/me" className="button outline">
            <ArrowLeft size={14} />
            My Space
          </Link>
          <button
            className="button primary"
            disabled={!me!.seller_enabled}
            onClick={() => setEditing(null)}
          >
            <Plus size={15} />
            Add a product
          </button>
        </div>
      </div>
      {!me!.seller_enabled && (
        <p className="warning">Enable sandbox selling in My Space to add products.</p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="list-table">
        <div className="table-row table-head">
          <span>Product</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Status</span>
          <span>Manage</span>
        </div>
        {products.map((p) => (
          <div className="table-row" key={p.id}>
            <button
              className="table-product"
              style={{ textAlign: 'left', padding: 0 }}
              onClick={() => setEditing(p)}
            >
              <img src={assetPath(p.image)} alt={p.title} />
              <div>
                <h3>{p.title}</h3>
                <p>
                  {p.variants.length} variants · {p.category}
                </p>
              </div>
            </button>
            <span>{money(p.price_minor)}</span>
            <span>{p.variants.reduce((s, v) => s + v.stock, 0)} available</span>
            <span className={`status-pill ${p.status}`}>{p.status}</span>
            <button className="text-button" onClick={() => setEditing(p)}>
              Edit ↗
            </button>
          </div>
        ))}
      </div>
      {products.length === 0 && (
        <div className="empty-state">
          {loading ? <Loader2 className="spin" /> : <Package size={30} />}
          <h3>
            {loading ? 'Opening your collection…' : 'A lovely collection starts with one thing.'}
          </h3>
          {!loading && <p>Add your first product to start your sandbox shop.</p>}
        </div>
      )}
      <div className="section-heading" style={{ marginTop: 35 }}>
        <div>
          <span className="eyebrow">GOOD THINGS, TOGETHER</span>
          <h2>
            Your <em>collections.</em>
          </h2>
        </div>
        <button
          className="text-button"
          onClick={() => {
            setChosen([]);
            setCollectionId(null);
            setCollectionTitle('');
            setCollectionModal(true);
          }}
        >
          <Plus size={14} />
          New collection
        </button>
      </div>
      <div className="shop-grid">
        {collections.map((c) => (
          <div className="panel" key={c.id}>
            <Layers size={21} color="#a08ab2" />
            <h3 style={{ marginTop: 14 }}>{c.title}</h3>
            <p style={{ margin: '8px 0 0', fontSize: 11 }}>
              {c.product_ids.length} products, thoughtfully grouped
            </p>
            <div style={{ display: 'flex', gap: 5, marginTop: 15 }}>
              {c.product_ids.slice(0, 3).map((id) => {
                const p = products.find((p) => p.id === id);
                return p ? (
                  <img
                    key={id}
                    style={{ width: 45, height: 50, borderRadius: 5 }}
                    src={assetPath(p.image)}
                    alt={p.title}
                  />
                ) : null;
              })}
            </div>
            <button
              className="button outline"
              style={{ marginTop: 16 }}
              onClick={() => {
                setCollectionId(c.id);
                setCollectionTitle(c.title);
                setChosen([...c.product_ids]);
                setCollectionModal(true);
              }}
            >
              Edit collection
            </button>
          </div>
        ))}
      </div>
      {editing !== undefined && (
        <ProductModal
          product={editing}
          shopId={me!.shop.id}
          close={() => setEditing(undefined)}
          done={async () => {
            setEditing(undefined);
            await load();
            toast('Your product is saved. A good little addition.');
          }}
        />
      )}
      {collectionModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={collectionId ? 'Edit collection' : 'Create collection'}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api(
                  `/shops/${me!.shop.id}/collections${collectionId ? `/${collectionId}` : ''}`,
                  {
                    method: collectionId ? 'PATCH' : 'POST',
                    body: JSON.stringify({ title: f.get('title'), product_ids: chosen }),
                  },
                );
                setCollectionModal(false);
                await load();
                toast('Your collection is ready.');
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          >
            <button
              type="button"
              className="icon-button close"
              onClick={() => setCollectionModal(false)}
              aria-label="Close collection"
            >
              <X size={18} />
            </button>
            <h2 style={{ marginBottom: 22 }}>Good things, together.</h2>
            <label>
              Collection name
              <input required name="title" maxLength={160} defaultValue={collectionTitle} />
            </label>
            <p className="fineprint" style={{ marginBottom: 15 }}>
              Choose your products. Use the arrows to set their order.
            </p>
            {products.map((p) => (
              <label
                className="checkbox-label"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                key={p.id}
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(p.id)}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked ? [...chosen, p.id] : chosen.filter((x) => x !== p.id),
                    )
                  }
                />
                {p.title}
              </label>
            ))}
            {chosen.length > 0 && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginBottom: 20 }}>
                {chosen.map((id, i) => (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      padding: 5,
                    }}
                  >
                    <span>
                      {i + 1}. {products.find((p) => p.id === id)?.title}
                    </span>
                    <span>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: 28, height: 28 }}
                        disabled={i === 0}
                        aria-label="Move product up"
                        onClick={() => {
                          const n = [...chosen];
                          [n[i], n[i - 1]] = [n[i - 1], n[i]];
                          setChosen(n);
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: 28, height: 28 }}
                        disabled={i === chosen.length - 1}
                        aria-label="Move product down"
                        onClick={() => {
                          const n = [...chosen];
                          [n[i], n[i + 1]] = [n[i + 1], n[i]];
                          setChosen(n);
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button className="button primary wide">Save collection</button>
          </form>
        </div>
      )}
    </div>
  );
}
function ProductModal({
  product,
  shopId,
  close,
  done,
}: {
  product: Product | null;
  shopId: string;
  close: () => void;
  done: () => Promise<void>;
}) {
  useModal(close);
  const [form, setForm] = useState<ProductForm>(
    product
      ? {
          title: product.title,
          description: product.description,
          price_minor: product.price_minor,
          image: product.image,
          category: product.category,
          status: product.status,
          variants: product.variants.map((v) => ({
            sku: v.sku,
            options: v.options,
            price_minor: v.price_minor,
            stock: v.stock,
          })),
        }
      : {
          title: '',
          description: '',
          price_minor: 5000,
          image: 'seed_product_0',
          category: 'Home & living',
          status: 'draft',
          variants: [
            {
              sku: `ITEM-${Date.now().toString().slice(-6)}`,
              options: { Finish: 'Original' },
              price_minor: 5000,
              stock: 10,
            },
          ],
        },
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const change = (key: keyof ProductForm, value: unknown) => setForm({ ...form, [key]: value });
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Edit product' : 'Add product'}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api(product ? `/products/${product.id}` : `/shops/${shopId}/products`, {
              method: product ? 'PATCH' : 'POST',
              body: JSON.stringify(form),
            });
            await done();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <button
          type="button"
          className="icon-button close"
          onClick={close}
          aria-label="Close product"
        >
          <X size={18} />
        </button>
        <span className="eyebrow">A LITTLE ADDITION TO YOUR WORLD</span>
        <h2 style={{ fontSize: 27, margin: '12px 0 23px' }}>
          {product ? 'Give it a little update.' : 'Meet your next little find.'}
        </h2>
        <label>
          Product name
          <input
            required
            maxLength={160}
            value={form.title}
            onChange={(e) => change('title', e.target.value)}
          />
        </label>
        <label>
          Tell its story
          <textarea
            required
            maxLength={6000}
            value={form.description}
            onChange={(e) => change('description', e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Base price (RM)
            <input
              type="number"
              min={0}
              max={1000000}
              step="0.01"
              required
              value={form.price_minor / 100}
              onChange={(e) => {
                const price = Math.round(Number(e.target.value) * 100);
                setForm({
                  ...form,
                  price_minor: price,
                  variants: form.variants.map((v, i) =>
                    i === 0 ? { ...v, price_minor: price } : v,
                  ),
                });
              }}
            />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => change('category', e.target.value)}>
              {['Fashion', 'Home & living', 'Art & prints', 'Jewelry', 'Beauty', 'Lifestyle'].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <label>
          Product photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try {
                const body = new FormData();
                body.set('file', f);
                body.set('shop_id', shopId);
                body.set('alt', form.title || 'Product photo');
                const r = await api<{ id: string }>('/uploads', { method: 'POST', body });
                change('image', r.id);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        <h3 style={{ margin: '20px 0 15px' }}>Variants & inventory</h3>
        {form.variants.map((v, i) => (
          <div
            key={i}
            className="form-grid"
            style={{
              padding: 15,
              border: '1px solid var(--line)',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <label>
              SKU
              <input
                required
                maxLength={80}
                value={v.sku}
                readOnly={!!product}
                onChange={(e) =>
                  change(
                    'variants',
                    form.variants.map((x, j) => (i === j ? { ...x, sku: e.target.value } : x)),
                  )
                }
              />
            </label>
            <label>
              Finish / option
              <input
                required
                value={Object.values(v.options)[0] || ''}
                onChange={(e) =>
                  change(
                    'variants',
                    form.variants.map((x, j) =>
                      i === j ? { ...x, options: { Finish: e.target.value } } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              Price (RM)
              <input
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                required
                value={v.price_minor / 100}
                onChange={(e) =>
                  change(
                    'variants',
                    form.variants.map((x, j) =>
                      i === j ? { ...x, price_minor: Math.round(Number(e.target.value) * 100) } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              Available stock
              <input
                type="number"
                min={0}
                max={1000000}
                required
                value={v.stock}
                onChange={(e) =>
                  change(
                    'variants',
                    form.variants.map((x, j) =>
                      i === j ? { ...x, stock: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="text-button"
          onClick={() =>
            change('variants', [
              ...form.variants,
              {
                sku: `VAR-${Date.now().toString().slice(-6)}`,
                options: { Finish: 'New finish' },
                price_minor: form.price_minor,
                stock: 0,
              },
            ])
          }
        >
          <Plus size={13} />
          Add a variant
        </button>
        <label style={{ marginTop: 18 }}>
          Availability
          <select value={form.status} onChange={(e) => change('status', e.target.value)}>
            <option value="draft">Keep as a draft</option>
            <option value="published">Publish to your shop</option>
            <option value="archived">Archive product</option>
          </select>
        </label>
        {error && <div className="error">{error}</div>}
        <button className="button primary wide" disabled={busy || uploading}>
          {busy || uploading ? <Loader2 className="spin" size={15} /> : <CheckIcon />}Save product
        </button>
        <p className="fineprint">
          Stock and prices are stored by the shop service. All orders remain sandbox only.
        </p>
      </form>
    </div>
  );
}
function CheckIcon() {
  return <Package size={15} />;
}
