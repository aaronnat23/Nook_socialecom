'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Block, Document, Style } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import {
  assetPath,
  resolveStyle,
  resolveHeadingFont,
  resolveColumns,
  contrastRatio,
} from '@lilac/renderer';
import { api } from '@/lib/api';
import { ProductCard, FollowButton } from './cards';
const gradients = {
  none: undefined,
  lilac: 'linear-gradient(125deg,#efe5f9,#ded0f2)',
  sunset: 'linear-gradient(125deg,#f9e8d7,#ebccdc)',
  forest: 'linear-gradient(125deg,#edf2e4,#cddbc9)',
};
export function styleToCss(s: Style): CSSProperties {
  return {
    fontFamily: s.fontFamily === 'Inter' ? 'var(--font)' : s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textAlign: s.textAlign,
    color: s.textColor,
    background: s.gradient && s.gradient !== 'none' ? gradients[s.gradient] : s.backgroundColor,
    borderRadius: s.borderRadius,
    borderColor: s.borderColor,
    borderWidth: s.borderWidth,
    borderStyle: s.borderWidth ? 'solid' : undefined,
    paddingTop: s.paddingTop,
    paddingBottom: s.paddingBottom,
    paddingLeft: s.paddingLeft,
    paddingRight: s.paddingRight,
    marginTop: s.marginTop,
    marginBottom: s.marginBottom,
    maxWidth: s.width === 'full' ? '100%' : s.maxWidth,
    minHeight: s.minHeight,
    display: s.visibility === 'hidden' ? 'none' : undefined,
    textTransform: s.uppercase ? 'uppercase' : undefined,
    boxShadow:
      s.shadow === 'soft'
        ? '0 3px 14px #0000000d'
        : s.shadow === 'lifted'
          ? '0 10px 30px #0000001a'
          : undefined,
    '--columns': s.columns,
    '--gap': `${s.gap ?? 16}px`,
  } as CSSProperties;
}
export function AssetImage({
  id,
  alt,
  privateImage = false,
  className,
  style,
}: {
  id?: string;
  alt: string;
  privateImage?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [src, setSrc] = useState(assetPath(id));
  useEffect(() => {
    if (!id) {
      setSrc('');
      return;
    }
    if (!privateImage || id.startsWith('seed_')) {
      setSrc(assetPath(id));
      return;
    }
    let url = '';
    let active = true;
    fetch(`/api/v1/assets/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('lilac-token') || ''}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((b) => {
        url = URL.createObjectURL(b);
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, privateImage]);
  if (!src)
    return (
      <div className="image-unavailable" role="img" aria-label={alt || 'Add an image'}>
        Add your image
      </div>
    );
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" />;
}
interface Props {
  document: Document;
  products: Product[];
  shop: Shop;
  width?: number;
  editing?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onDropBlock?: (dragId: string, targetId: string) => void;
  thumbnail?: boolean;
}
export function Storefront({
  document: doc,
  products,
  shop,
  width: given,
  editing = false,
  selected,
  onSelect,
  onDropBlock,
  thumbnail = false,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(given || 1280);
  useEffect(() => {
    if (given) {
      setMeasured(given);
      return;
    }
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [given]);
  const [collections, setCollections] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (thumbnail) return;
    api<{ items: { id: string; product_ids: string[] }[] }>(`/shops/${shop.id}/collections`)
      .then((r) => setCollections(Object.fromEntries(r.items.map((c) => [c.id, c.product_ids]))))
      .catch(() => {});
  }, [shop.id, thumbnail]);
  const width = given || measured;
  return (
    <div
      className="storefront"
      ref={container}
      style={
        {
          background: doc.theme.colors.background,
          color: doc.theme.colors.text,
          fontFamily: doc.theme.fontBody === 'Inter' ? 'var(--font)' : doc.theme.fontBody,
          '--shop-muted': doc.theme.colors.muted,
          '--shop-accent': doc.theme.colors.accent,
        } as CSSProperties
      }
    >
      {doc.sections.map((section) => (
        <section
          className="sf-section"
          key={section.id}
          style={{
            ...styleToCss(section.style || {}),
            maxWidth:
              section.style?.width === 'full'
                ? '100%'
                : section.style?.maxWidth || doc.theme.contentWidth,
          }}
        >
          {[...section.children]
            .sort(
              (a, b) =>
                (resolveStyle(a, doc.theme, width).order ?? section.children.indexOf(a)) -
                (resolveStyle(b, doc.theme, width).order ?? section.children.indexOf(b)),
            )
            .map((block) => (
              <BlockView
                key={block.id}
                block={block}
                {...{
                  doc,
                  products,
                  shop,
                  width,
                  editing,
                  selected,
                  onSelect,
                  onDropBlock,
                  collections,
                  omitIds: thumbnail,
                }}
              />
            ))}
        </section>
      ))}
    </div>
  );
}
function BlockView({
  block: b,
  doc,
  products,
  shop,
  width,
  editing,
  selected,
  onSelect,
  onDropBlock,
  collections,
  omitIds = false,
}: {
  block: Block;
  doc: Document;
  products: Product[];
  shop: Shop;
  width: number;
  editing: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onDropBlock?: (id: string, target: string) => void;
  collections: Record<string, string[]>;
  omitIds?: boolean;
}) {
  const s = resolveStyle(b, doc.theme, width);
  const headingFace = resolveHeadingFont(b, doc.theme, width);
  const headingFont = headingFace === 'Inter' ? 'var(--font)' : headingFace;
  const headingStyle: CSSProperties = {
    fontFamily: headingFont,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textAlign: s.textAlign,
  };
  const p = b.props;
  const [idOver, setIdOver] = useState(false);
  const imgStyle: CSSProperties = {
    objectFit: s.imageFit || 'cover',
    objectPosition: `${s.focalX ?? 50}% ${s.focalY ?? 50}%`,
    aspectRatio: s.aspectRatio === 'auto' ? undefined : s.aspectRatio?.replace(':', '/'),
    borderRadius: s.borderRadius,
    height: s.aspectRatio && s.aspectRatio !== 'auto' ? 'auto' : undefined,
  };
  let content: React.ReactNode = null;
  const cta = (label: string, url: string) => (
    <Link
      href={url}
      className="button primary"
      style={{
        background: doc.theme.colors.accent,
        borderRadius: doc.theme.radius,
        color: contrastRatio('#FFFFFF', doc.theme.colors.accent) >= 4.5 ? '#FFFFFF' : '#24182F',
      }}
      target={url.startsWith('https:') ? '_blank' : undefined}
      rel="noopener noreferrer"
    >
      {label} ↗
    </Link>
  );
  switch (b.type) {
    case 'profileHeader':
      content = (
        <div className={`sf-profile ${s.textAlign === 'center' ? 'sf-profile-centered' : ''}`}>
          <span
            className="shop-logo"
            style={{ background: doc.theme.colors.accent + '22', color: doc.theme.colors.accent }}
          >
            {p.imageAssetId ? (
              <AssetImage
                id={p.imageAssetId}
                alt={p.alt || shop.name}
                privateImage={editing}
                style={{ width: 50, height: 50, borderRadius: '50%' }}
              />
            ) : (
              shop.name.slice(0, 1)
            )}
          </span>
          <div>
            <h2 style={headingStyle}>{p.headline || shop.name}</h2>
            <p>{p.subtitle || shop.bio}</p>
          </div>
          <FollowButton shop={shop} />
        </div>
      );
      break;
    case 'hero':
      content = (
        <div className="sf-hero" style={{ minHeight: s.minHeight }}>
          <div className="sf-hero-copy">
            <h1
              style={{
                ...headingStyle,
                fontSize: s.fontSize || 48,
                fontWeight: s.fontWeight || 500,
                textAlign: s.textAlign,
              }}
            >
              {p.headline}
            </h1>
            {p.subtitle && <p>{p.subtitle}</p>}
            {p.cta && cta(p.cta.label, p.cta.url)}
          </div>
          {p.imageAssetId && (
            <AssetImage
              id={p.imageAssetId}
              alt={p.alt || ''}
              privateImage={editing}
              style={imgStyle}
            />
          )}
        </div>
      );
      break;
    case 'text':
      content = (
        <div className="sf-text">
          {p.headline && (
            <h2 className="sf-title" style={headingStyle}>
              {p.headline}
            </h2>
          )}
          {p.text && <p>{p.text}</p>}
          {p.nodes?.map((n, i) =>
            n.type === 'h2' ? (
              <h2 key={i}>{n.text}</h2>
            ) : n.type === 'h3' ? (
              <h3 key={i}>{n.text}</h3>
            ) : n.type === 'bold' ? (
              <p key={i}>
                <strong>{n.text}</strong>
              </p>
            ) : n.type === 'italic' ? (
              <p key={i}>
                <em>{n.text}</em>
              </p>
            ) : n.type === 'link' && n.url ? (
              <p key={i}>
                <a href={n.url} rel="noopener noreferrer">
                  {n.text}
                </a>
              </p>
            ) : n.type === 'listItem' ? (
              <ul key={i}>
                <li>{n.text}</li>
              </ul>
            ) : (
              <p key={i}>{n.text}</p>
            ),
          )}
        </div>
      );
      break;
    case 'announcement':
      content = <p style={{ fontSize: s.fontSize || 12 }}>{p.text}</p>;
      break;
    case 'image':
      content = (
        <figure style={{ margin: 0 }}>
          <AssetImage
            id={p.imageAssetId}
            alt={p.alt || ''}
            privateImage={editing}
            className="sf-image"
            style={imgStyle}
          />
          {p.caption && <figcaption className="sf-image-caption">{p.caption}</figcaption>}
        </figure>
      );
      break;
    case 'gallery':
      content = (
        <>
          {p.headline && (
            <h2 className="sf-title" style={headingStyle}>
              {p.headline}
            </h2>
          )}
          <div className="sf-gallery">
            {p.images?.map((im, i) => (
              <AssetImage
                key={i}
                id={im.imageAssetId}
                alt={im.alt}
                privateImage={editing}
                style={imgStyle}
              />
            ))}
          </div>
        </>
      );
      break;
    case 'productGrid': {
      const collection = p.source === 'collection' ? collections[p.collectionId || ''] : undefined;
      const filtered = collection
        ? products
            .filter((product) => collection.includes(product.id))
            .sort((a, b) => collection.indexOf(a.id) - collection.indexOf(b.id))
        : p.source === 'collection'
          ? []
          : products;
      const sorted = [...filtered].sort(
        p.sort === 'price_asc'
          ? (a, b) => a.price_minor - b.price_minor
          : p.sort === 'price_desc'
            ? (a, b) => b.price_minor - a.price_minor
            : () => 0,
      );
      content = (
        <>
          {p.headline && (
            <h2 className="sf-title" style={headingStyle}>
              {p.headline}
            </h2>
          )}
          <div className="sf-products">
            {sorted.slice(0, p.limit || 12).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
          {products.length === 0 && (
            <div className="empty-state" style={{ minHeight: 150, fontSize: 12 }}>
              Your collection is on its way.
            </div>
          )}
        </>
      );
      break;
    }
    case 'featuredProduct': {
      const product = products.find((x) => x.id === p.productId);
      content = (
        <>
          {p.headline && (
            <h2 className="sf-title" style={headingStyle}>
              {p.headline}
            </h2>
          )}
          {product ? (
            <div style={{ maxWidth: 350 }}>
              <ProductCard product={product} />
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>
              Choose a product in the inspector.
            </p>
          )}
        </>
      );
      break;
    }
    case 'button':
      content = cta(p.label || 'Explore', p.url || '#products');
      break;
    case 'divider':
      content = (
        <hr
          style={{
            border: 0,
            borderTop: `${s.borderWidth || 1}px solid ${s.borderColor || doc.theme.colors.accent + '33'}`,
            width: '100%',
          }}
        />
      );
      break;
    case 'spacer':
      content = <div style={{ height: s.minHeight || 40 }} />;
      break;
    case 'socialLinks':
      content = (
        <div className="sf-social">
          {p.links?.map((l, i) => (
            <a
              href={l.url}
              rel="noopener noreferrer"
              target={l.url.startsWith('#') ? undefined : '_blank'}
              key={i}
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      );
      break;
    case 'columns':
      content = (
        <div
          className="sf-columns"
          style={{
            gridTemplateColumns: `repeat(${resolveColumns(b, doc.theme, width)},minmax(0,1fr))`,
          }}
        >
          {b.children?.map((child) => (
            <BlockView
              key={child.id}
              {...{
                block: child,
                doc,
                products,
                shop,
                width,
                editing,
                selected,
                onSelect,
                onDropBlock,
                collections,
                omitIds,
              }}
            />
          ))}
        </div>
      );
      break;
    default:
      content = <p className="muted">This section needs a newer renderer.</p>;
  }
  const inner = (
    <div
      id={omitIds ? undefined : b.id}
      className={`sf-block sf-inner ${b.type === 'productGrid' ? 'sf-catalog' : ''}`}
      data-block-type={b.type}
      style={styleToCss(s)}
    >
      {content}
    </div>
  );
  if (!editing) return inner;
  return (
    <div
      className={`editable-block editing ${selected === b.id ? 'is-selected' : ''} ${idOver ? 'drag-over' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.(b.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIdOver(true);
      }}
      onDragLeave={() => setIdOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIdOver(false);
        onDropBlock?.(e.dataTransfer.getData('text/plain'), b.id);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${b.type} block`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.(b.id);
        }
      }}
    >
      {selected === b.id && <span className="block-selection-label">{b.type}</span>}
      {inner}
    </div>
  );
}
