'use client';
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Block, Document } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import {
  resolveStyle,
  resolveHeadingFont,
  resolveColumns,
  contrastRatio,
  fontStack,
} from '@lilac/renderer';
import { api } from '@/lib/api';
import { ProductCard, FollowButton } from './cards';
import { Divider, Marquee, ProductIndex, Spotlight } from './storefront-parts';
import { AssetImage, backgroundLayers, shapeCss, styleToCss } from './storefront-base';
export { AssetImage, styleToCss };
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
          fontFamily: doc.theme.fontBody === 'Inter' ? 'var(--shop-sans)' : doc.theme.fontBody,
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
            ...styleToCss(section.style || {}, doc.theme.colors.accent),
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
  const headingFont = fontStack(headingFace);
  const headingStyle: CSSProperties = {
    fontFamily: headingFont,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textAlign: s.textAlign,
  };
  const p = b.props;
  const accent = doc.theme.colors.accent;
  const onAccent = contrastRatio('#FFFFFF', accent) >= 4.5 ? '#FFFFFF' : '#24182F';
  const [idOver, setIdOver] = useState(false);
  const imgStyle: CSSProperties = {
    objectFit: s.imageFit || 'cover',
    objectPosition: `${s.focalX ?? 50}% ${s.focalY ?? 50}%`,
    aspectRatio: s.aspectRatio === 'auto' ? undefined : s.aspectRatio?.replace(':', '/'),
    borderRadius: s.borderRadius,
    height: s.aspectRatio && s.aspectRatio !== 'auto' ? 'auto' : undefined,
    maxHeight: s.aspectRatio && s.aspectRatio !== 'auto' ? 'none' : undefined,
    ...shapeCss(s),
  };
  let content: React.ReactNode = null;
  const cta = (label: string, url: string) => (
    <Link
      href={url}
      className="button primary"
      style={{ background: accent, borderRadius: doc.theme.radius, color: onAccent }}
      target={url.startsWith('https:') ? '_blank' : undefined}
      rel="noopener noreferrer"
    >
      {label} ↗
    </Link>
  );
  const title = p.headline ? (
    <h2 className="sf-title" style={headingStyle}>
      {p.headline}
    </h2>
  ) : null;
  const textNodes = p.nodes?.map((n, i) =>
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
  );
  const photo = (id: string | undefined, alt: string, style: CSSProperties = imgStyle) => (
    <AssetImage id={id} alt={alt} privateImage={editing} style={style} />
  );
  switch (b.type) {
    case 'profileHeader': {
      const v = p.variant || (s.textAlign === 'center' ? 'centered' : 'row');
      content = (
        <div
          className={`sf-profile sfv-profile-${v} ${v === 'centered' ? 'sf-profile-centered' : ''}`}
          style={
            v === 'banner'
              ? ({ background: accent, color: onAccent, '--on-accent': onAccent } as CSSProperties)
              : undefined
          }
        >
          {v !== 'minimal' && (
            <span className="shop-logo" style={{ background: accent + '22', color: accent }}>
              {p.imageAssetId ? (
                <AssetImage
                  id={p.imageAssetId}
                  alt={p.alt || shop.name}
                  privateImage={editing}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              ) : (
                shop.name.slice(0, 1)
              )}
            </span>
          )}
          <div>
            <h2 style={headingStyle}>{p.headline || shop.name}</h2>
            {v !== 'minimal' && <p>{p.subtitle || shop.bio}</p>}
          </div>
          <FollowButton shop={shop} />
        </div>
      );
      break;
    }
    case 'hero': {
      const v = p.variant || 'split';
      content = (
        <div
          className={`sf-hero sfv-hero-${v}`}
          data-shape={s.shape}
          data-align={s.textAlign}
          style={
            {
              minHeight: s.minHeight,
              '--ov-color': s.textColor || '#FFFFFF',
            } as CSSProperties
          }
        >
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
            {v === 'poster' ? (
              <div className="sfv-hero-poster-aside">
                {p.subtitle && <p>{p.subtitle}</p>}
                {p.cta && cta(p.cta.label, p.cta.url)}
              </div>
            ) : (
              <>
                {p.subtitle && <p>{p.subtitle}</p>}
                {p.cta && cta(p.cta.label, p.cta.url)}
              </>
            )}
          </div>
          {p.imageAssetId && photo(p.imageAssetId, p.alt || '')}
        </div>
      );
      break;
    }
    case 'text': {
      const v = p.variant || 'plain';
      if (v === 'quote') {
        content = (
          <figure className="sfv-quote">
            <span
              className="sfv-quote-mark"
              aria-hidden="true"
              style={{ fontFamily: headingFont, color: accent }}
            >
              “
            </span>
            <blockquote style={{ ...headingStyle, fontSize: s.fontSize }}>{p.headline}</blockquote>
            {p.text && <figcaption>{p.text}</figcaption>}
          </figure>
        );
      } else if (v === 'note') {
        content = (
          <div
            className="sfv-note"
            style={
              {
                backgroundColor: s.backgroundColor || doc.theme.colors.surface,
                ...backgroundLayers(s, accent),
                '--tape': accent,
              } as CSSProperties
            }
          >
            {title}
            {p.text && <p>{p.text}</p>}
            {textNodes}
          </div>
        );
      } else if (v === 'letter') {
        content = (
          <div className="sfv-letter">
            {p.headline && (
              <h2 className="sf-title" style={{ ...headingStyle, fontStyle: 'italic' }}>
                {p.headline}
              </h2>
            )}
            {p.text && (
              <p
                className="sfv-letter-body"
                style={{ '--drop': accent, '--drop-font': headingFont } as CSSProperties}
              >
                {p.text}
              </p>
            )}
            {textNodes}
            <p className="sfv-sign" style={{ fontFamily: headingFont }}>
              — {shop.name}
            </p>
          </div>
        );
      } else {
        content = (
          <div className="sf-text">
            {title}
            {p.text && <p>{p.text}</p>}
            {textNodes}
          </div>
        );
      }
      break;
    }
    case 'announcement': {
      const v = p.variant || 'bar';
      content =
        v === 'marquee' ? (
          <Marquee text={p.text || ''} fontSize={s.fontSize || 12} />
        ) : v === 'pill' ? (
          <p className="sfv-pill" style={{ fontSize: s.fontSize || 12 }}>
            {p.text}
          </p>
        ) : (
          <p style={{ fontSize: s.fontSize || 12 }}>{p.text}</p>
        );
      break;
    }
    case 'image': {
      const v = p.variant || 'plain';
      const caption = p.caption && (
        <figcaption className="sf-image-caption">{p.caption}</figcaption>
      );
      content =
        v === 'framed' ? (
          <figure
            className="sfv-framed"
            style={{
              borderColor: s.borderColor || s.textColor || doc.theme.colors.text,
              ...(s.shape && s.shape !== 'rect' ? shapeCss(s) : { borderRadius: s.borderRadius }),
            }}
          >
            <AssetImage
              id={p.imageAssetId}
              alt={p.alt || ''}
              privateImage={editing}
              className="sf-image"
              style={{ ...imgStyle, borderRadius: 0 }}
            />
            {caption}
          </figure>
        ) : v === 'polaroid' ? (
          <figure className="sfv-polaroid">
            <AssetImage
              id={p.imageAssetId}
              alt={p.alt || ''}
              privateImage={editing}
              className="sf-image"
              style={{ ...imgStyle, borderRadius: 0, aspectRatio: imgStyle.aspectRatio || '4 / 5' }}
            />
            <figcaption>{p.caption || p.alt}</figcaption>
          </figure>
        ) : (
          <figure style={{ margin: 0 }}>
            <AssetImage
              id={p.imageAssetId}
              alt={p.alt || ''}
              privateImage={editing}
              className="sf-image"
              style={imgStyle}
            />
            {caption}
          </figure>
        );
      break;
    }
    case 'gallery': {
      const v = p.variant || 'grid';
      const images = p.images || [];
      const grid = (
        <div className="sf-gallery">
          {images.map((im, i) => (
            <Fragment key={i}>{photo(im.imageAssetId, im.alt)}</Fragment>
          ))}
        </div>
      );
      content = (
        <>
          {title}
          {v === 'filmstrip' ? (
            <div
              className="sfv-film"
              style={{ '--hole': doc.theme.colors.background } as CSSProperties}
            >
              <div className="sfv-film-track" role="region" aria-label="Photos" tabIndex={0}>
                {images.map((im, i) => (
                  <div className="sfv-film-frame" key={i}>
                    {photo(im.imageAssetId, im.alt, {
                      ...imgStyle,
                      borderRadius: 2,
                      aspectRatio: imgStyle.aspectRatio || '3 / 2',
                      height: 'auto',
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : v === 'polaroid' ? (
            <div className="sfv-polaroids">
              {images.map((im, i) => (
                <figure className="sfv-polaroid" key={i}>
                  {photo(im.imageAssetId, im.alt, {
                    ...imgStyle,
                    borderRadius: 0,
                    aspectRatio: imgStyle.aspectRatio || '4 / 5',
                    height: 'auto',
                  })}
                  <figcaption>{im.alt}</figcaption>
                </figure>
              ))}
            </div>
          ) : v === 'masonry' ? (
            <div className="sfv-masonry">
              {images.map((im, i) => (
                <div className="sfv-masonry-tile" key={i}>
                  {photo(im.imageAssetId, im.alt, {
                    ...imgStyle,
                    aspectRatio: undefined,
                    height: '100%',
                  })}
                </div>
              ))}
            </div>
          ) : (
            grid
          )}
        </>
      );
      break;
    }
    case 'productGrid': {
      const v = p.variant || 'grid';
      const collection = p.source === 'collection' ? collections[p.collectionId || ''] : undefined;
      const filtered = collection
        ? products
            .filter((product) => collection.includes(product.id))
            .sort((a, c) => collection.indexOf(a.id) - collection.indexOf(c.id))
        : p.source === 'collection'
          ? []
          : products;
      const sorted = [...filtered].sort(
        p.sort === 'price_asc'
          ? (a, c) => a.price_minor - c.price_minor
          : p.sort === 'price_desc'
            ? (a, c) => c.price_minor - a.price_minor
            : () => 0,
      );
      const shown = sorted.slice(0, p.limit || 12);
      content = (
        <>
          {title}
          {v === 'list' ? (
            <ProductIndex products={shown} headingFont={headingFont} />
          ) : (
            <div
              className={`sf-products sfv-products-${v}`}
              {...(v === 'carousel'
                ? { role: 'region', 'aria-label': 'Products', tabIndex: 0 }
                : {})}
            >
              {shown.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} plain />
              ))}
            </div>
          )}
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
      const v = p.variant || 'card';
      content =
        v === 'spotlight' && product ? (
          <Spotlight
            product={product}
            eyebrow={p.headline}
            headingStyle={headingStyle}
            accent={accent}
            onAccent={onAccent}
            radius={doc.theme.radius}
          />
        ) : (
          <>
            {title}
            {product ? (
              <div style={{ maxWidth: 350 }}>
                <ProductCard product={product} plain />
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
    case 'button': {
      const v = p.variant || 'solid';
      const label = p.label || 'Explore';
      const url = p.url || '#products';
      content =
        v === 'outline' ? (
          <Link
            href={url}
            className="button"
            style={{
              background: 'transparent',
              border: `2px solid ${accent}`,
              color: accent,
              borderRadius: doc.theme.radius,
            }}
            target={url.startsWith('https:') ? '_blank' : undefined}
            rel="noopener noreferrer"
          >
            {label} ↗
          </Link>
        ) : v === 'link' ? (
          <Link
            href={url}
            className="sfv-textlink"
            style={{ color: accent }}
            target={url.startsWith('https:') ? '_blank' : undefined}
            rel="noopener noreferrer"
          >
            {label} ↗
          </Link>
        ) : (
          cta(label, url)
        );
      break;
    }
    case 'divider': {
      const v = p.variant || 'line';
      content =
        v === 'line' ? (
          <hr
            style={{
              border: 0,
              borderTop: `${s.borderWidth || 1}px solid ${s.borderColor || accent + '33'}`,
              width: '100%',
            }}
          />
        ) : (
          <Divider variant={v} color={s.borderColor || accent} />
        );
      break;
    }
    case 'spacer':
      content = <div style={{ height: s.minHeight || 40 }} />;
      break;
    case 'socialLinks':
      content = (
        <div
          className={`sf-social ${p.variant === 'chips' ? 'sfv-chips' : ''}`}
          style={{
            justifyContent:
              s.textAlign === 'center'
                ? 'center'
                : s.textAlign === 'right'
                  ? 'flex-end'
                  : undefined,
          }}
        >
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
    case 'columns': {
      const n = resolveColumns(b, doc.theme, width);
      const v = p.variant || 'even';
      const weights = Array.from({ length: n }, (_, i) =>
        v === 'wideLeft' ? (i === 0 ? 2 : 1) : v === 'wideRight' ? (i === n - 1 ? 2 : 1) : 1,
      );
      content = (
        <div
          className="sf-columns"
          style={{
            gridTemplateColumns: weights.map((w) => `minmax(0,${w}fr)`).join(' '),
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
    }
    default:
      content = <p className="muted">This section needs a newer renderer.</p>;
  }
  const inner = (
    <div
      id={omitIds ? undefined : b.id}
      className={`sf-block sf-inner ${b.type === 'productGrid' ? 'sf-catalog' : ''}`}
      data-block-type={b.type}
      data-variant={p.variant}
      style={styleToCss(
        b.type === 'text' && p.variant === 'note'
          ? { ...s, backgroundColor: undefined, gradient: undefined, pattern: undefined }
          : s,
        accent,
      )}
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
