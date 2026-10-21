'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Sparkles, X } from 'lucide-react';
import { themes, templateDetails, personalizeTemplate } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { useModal } from '@/lib/use-modal';
import { Storefront } from './storefront';

type Theme = (typeof themes)[number];
export function TemplateArtwork({
  theme,
  shop,
  products,
}: {
  theme: Theme;
  shop: Shop;
  products: Product[];
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const published = products.filter((p) => p.status === 'published');
  const document = personalizeTemplate(
    theme.document,
    shop,
    published.map((p) => p.id),
  );
  return (
    <div
      ref={frame}
      className="template-art template-real-art"
      style={{ background: theme.document.theme.colors.background }}
      aria-hidden="true"
      inert
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1000,
          transform: `scale(${width / 1000})`,
          transformOrigin: 'left top',
        }}
      >
        <Storefront document={document} shop={shop} products={published} width={1000} thumbnail />
      </div>
    </div>
  );
}

export function TemplateGallery({ shop, products }: { shop: Shop; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const featured = ['minimal-studio', 'dark-editorial', 'botanical', 'y2k-diary'].map(
    (id) => themes.find((t) => t.id === id)!,
  );
  return (
    <section className="template-section" aria-label="Storefront templates">
      <div className="section-heading">
        <div>
          <span className="eyebrow">REDECORATE</span>
          <h2>
            Try on a new <span className="hl">look.</span>
          </h2>
          <p>Eight layouts, each one built differently. Every block is yours to change.</p>
        </div>
        <button
          className="button outline"
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
        >
          Browse all 8 <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="template-featured">
        {featured.map((t) => (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(t.id);
                setOpen(true);
              }
            }}
            className="template-design-card"
            key={t.id}
            aria-label={`Preview ${t.name} template`}
            onClick={() => {
              setSelected(t.id);
              setOpen(true);
            }}
          >
            <TemplateArtwork theme={t} shop={shop} products={products} />
            <div className="template-design-caption">
              <span className="eyebrow">{templateDetails[t.id].mood}</span>
              <div>
                <h3>{t.name}</h3>
                <span className="template-open">
                  <ArrowUpRight size={17} />
                </span>
              </div>
              <p>{t.description}</p>
              <div className="template-card-bottom">
                <span className="theme-swatches">
                  {Object.values(t.document.theme.colors)
                    .slice(0, 4)
                    .map((c, i) => (
                      <span key={i} style={{ background: c }} />
                    ))}
                </span>
                <span>Preview design</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <TemplateDialog
          shop={shop}
          products={products}
          selected={selected}
          select={setSelected}
          close={() => setOpen(false)}
        />
      )}
    </section>
  );
}
function TemplateDialog({
  shop,
  products,
  selected,
  select,
  close,
}: {
  shop: Shop;
  products: Product[];
  selected: string | null;
  select: (id: string | null) => void;
  close: () => void;
}) {
  useModal(close);
  const theme = themes.find((t) => t.id === selected);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-dialog-title"
        className={`modal template-dialog ${theme ? 'showing-preview' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="template-dialog-header">
          <div>
            <span className="eyebrow">
              <Sparkles size={12} /> {theme ? 'TEMPLATE PREVIEW' : 'THE TEMPLATE COLLECTION'}
            </span>
            <h2 id="template-dialog-title">{theme ? theme.name : 'A space for every story.'}</h2>
            <p>
              {theme
                ? templateDetails[theme.id].audience
                : 'Eight distinct looks. Your products, your personality.'}
            </p>
          </div>
          <button className="icon-button" aria-label="Close template preview" onClick={close}>
            <X size={19} />
          </button>
        </header>
        <div className="template-dialog-scroll" key={selected || 'all'}>
          {theme ? (
            <>
              <div className="template-preview-meta">
                <button className="text-button" onClick={() => select(null)}>
                  <ArrowLeft size={15} /> All templates
                </button>
                <div>
                  {templateDetails[theme.id].features.map((f) => (
                    <span key={f}>
                      <Check size={12} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="template-live-preview" inert aria-hidden="true">
                <Storefront
                  document={personalizeTemplate(
                    theme.document,
                    shop,
                    products.filter((p) => p.status === 'published').map((p) => p.id),
                  )}
                  shop={shop}
                  products={products.filter((p) => p.status === 'published')}
                />
              </div>
            </>
          ) : (
            <div className="template-browser-grid">
              {themes.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(t.id);
                    }
                  }}
                  className="template-design-card"
                  aria-label={`Preview ${t.name} template`}
                  onClick={() => select(t.id)}
                >
                  <TemplateArtwork theme={t} shop={shop} products={products} />
                  <div className="template-design-caption">
                    <h3>{t.name}</h3>
                    <p>{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {theme && (
          <footer className="template-dialog-footer">
            <p>Your space stays yours. Choose how to apply this look in the editor.</p>
            <Link className="button primary" href={`/me/edit?template=${theme.id}`}>
              Customize {theme.name} <ArrowUpRight size={16} />
            </Link>
          </footer>
        )}
      </section>
    </div>
  );
}
