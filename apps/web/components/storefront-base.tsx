'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Style } from '@lilac/schema';
import { assetPath, fontStack, gradientCss, patternCss } from '@lilac/renderer';

/** Pattern and gradient share one background-image so they can stack on a colour. */
export function backgroundLayers(s: Style, accent?: string): CSSProperties {
  const layers: string[] = [];
  const sizes: string[] = [];
  const pattern = patternCss(s.pattern, s.patternColor || (accent ? accent + '33' : '#00000014'));
  if (pattern) {
    layers.push(pattern.image);
    sizes.push(pattern.size);
  }
  const gradient = gradientCss(s.gradient);
  if (gradient) {
    layers.push(gradient);
    sizes.push('auto');
  }
  return layers.length
    ? { backgroundImage: layers.join(', '), backgroundSize: sizes.join(', ') }
    : {};
}
/** Corner treatment for images that a seller has shaped. */
export function shapeCss(s: Style): CSSProperties {
  switch (s.shape) {
    case 'arch':
      return { borderRadius: '999px 999px 0 0' };
    case 'pill':
      return { borderRadius: 999 };
    case 'circle':
      return { borderRadius: '50%', aspectRatio: '1 / 1', height: 'auto' };
    default:
      return {};
  }
}
export function styleToCss(s: Style, accent?: string): CSSProperties {
  return {
    fontFamily: fontStack(s.fontFamily),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textAlign: s.textAlign,
    color: s.textColor,
    backgroundColor: s.backgroundColor,
    ...backgroundLayers(s, accent),
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
