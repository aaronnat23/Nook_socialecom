'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Product } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { ProductStage } from './stage';

/** One line of words drifting past, repeated so it loops without a seam. */
export function Marquee({ text, fontSize }: { text: string; fontSize: number }) {
  const line = `${Array.from({ length: 6 }, () => text).join('  ✦  ')}  ✦  `;
  return (
    <div className="sfv-marquee" style={{ fontSize }}>
      <div className="sfv-marquee-track">
        <span>{line}</span>
        <span aria-hidden="true">{line}</span>
      </div>
    </div>
  );
}

const glyphs: Record<string, string> = {
  dots: '•   •   •',
  wave: '∿∿∿∿∿∿∿∿∿∿∿∿',
  stars: '✦   ✧   ✦   ✧   ✦',
  ornament: '❦',
};

export function Divider({ variant, color }: { variant: string; color: string }) {
  return (
    <div
      role="separator"
      className={`sfv-divider sfv-divider-${variant}`}
      style={{ color } as CSSProperties}
    >
      <span aria-hidden="true">{glyphs[variant] || glyphs.dots}</span>
    </div>
  );
}

/** A numbered catalogue: number, thumbnail, name and price on a ruled row. */
export function ProductIndex({
  products,
  headingFont,
}: {
  products: Product[];
  headingFont?: string;
}) {
  return (
    <ol className="sfv-index">
      {products.map((p, i) => (
        <li key={p.id}>
          <Link href={`/product/${p.slug}`} className="sfv-index-row">
            <span className="sfv-index-n" style={{ fontFamily: headingFont }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="sfv-index-thumb">
              <ProductStage stage={p.stage} image={p.image} alt="" ratio="1 / 1" />
            </span>
            <span className="sfv-index-text">
              <strong style={{ fontFamily: headingFont }}>{p.title}</strong>
              <small>{p.category}</small>
            </span>
            <span className="sfv-index-price">{money(p.price_minor)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** One product on a big stage with its story beside it. */
export function Spotlight({
  product,
  eyebrow,
  headingStyle,
  accent,
  onAccent,
  radius,
}: {
  product: Product;
  eyebrow?: string;
  headingStyle: CSSProperties;
  accent: string;
  onAccent: string;
  radius: number;
}) {
  return (
    <div className="sfv-spotlight">
      <div className="sfv-spotlight-stage">
        <ProductStage
          stage={product.stage}
          image={product.image}
          alt={product.title}
          ratio="1 / 1"
        />
      </div>
      <div className="sfv-spotlight-copy">
        {eyebrow && <span className="sfv-eyebrow">{eyebrow}</span>}
        <h2 style={{ ...headingStyle, fontSize: undefined }}>{product.title}</h2>
        <p className="sfv-spotlight-price">{money(product.price_minor)}</p>
        <p className="sfv-spotlight-desc">{product.description}</p>
        <Link
          href={`/product/${product.slug}`}
          className="button primary"
          style={{ background: accent, color: onAccent, borderRadius: radius }}
        >
          See it up close ↗
        </Link>
      </div>
    </div>
  );
}
