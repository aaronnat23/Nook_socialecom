'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Sparkles, X } from 'lucide-react';
import { themes, templateDetails } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { useModal } from '@/lib/use-modal';
import { Storefront } from './storefront';

type Theme = (typeof themes)[number];
export function TemplateArtwork({ theme }: { theme: Theme }) {
  const { colors, fontHeading } = theme.document.theme;
  const hero = theme.document.sections.flatMap((s) => s.children).find((b) => b.type === 'hero')!;
  return (
    <div
      className={`template-art template-art-${theme.id}`}
      style={{ background: colors.background, color: colors.text }}
      aria-hidden="true"
    >
      <div className="template-mini-nav">
        <b>{theme.name.toLowerCase()}.</b>
        <span style={{ background: colors.accent }} />
      </div>
      <div
        className="template-mini-hero"
        style={{
          background: hero.style?.backgroundColor || colors.surface,
          borderRadius: Math.min(theme.document.theme.radius, 18),
        }}
      >
        <strong style={{ fontFamily: fontHeading === 'Inter' ? 'var(--font)' : fontHeading }}>
          {hero.props.headline}
        </strong>
        <img
          src={`/images/${templateDetails[theme.id].cover}.jpg`}
          alt=""
          style={{ borderRadius: Math.min(theme.document.theme.radius, 12) }}
        />
        <span style={{ background: colors.accent }} />
      </div>
      <div className="template-mini-grid">
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            style={{
              background: `${colors.accent}16`,
              borderColor: `${colors.accent}40`,
              borderRadius: Math.min(theme.document.theme.radius, 7),
            }}
          />
        ))}
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
          <span className="eyebrow">
            <Sparkles size={12} /> A LITTLE INSPIRATION
          </span>
          <h2>
            Find your kind of <em>space.</em>
          </h2>
          <p>Beautiful starting points. Make every detail yours.</p>
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
          <button
            className="template-design-card"
            key={t.id}
            aria-label={`Preview ${t.name} template`}
            onClick={() => {
              setSelected(t.id);
              setOpen(true);
            }}
          >
            <TemplateArtwork theme={t} />
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
          </button>
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
                  document={theme.document}
                  shop={shop}
                  products={products.filter((p) => p.status === 'published')}
                />
              </div>
            </>
          ) : (
            <div className="template-browser-grid">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className="template-design-card"
                  aria-label={`Preview ${t.name} template`}
                  onClick={() => select(t.id)}
                >
                  <TemplateArtwork theme={t} />
                  <div className="template-design-caption">
                    <h3>{t.name}</h3>
                    <p>{t.description}</p>
                  </div>
                </button>
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
