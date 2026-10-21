'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Stage } from '@lilac/api-client';
import { assetPath, ribbonLine } from '@lilac/renderer';

/**
 * Resolves an asset id to something an <img> can load. Public and sample images use their normal
 * address; a seller's private draft images are fetched with their session.
 */
export function useAssetSrc(id: string | null | undefined, priv = false) {
  const [src, setSrc] = useState(() =>
    id && (!priv || id.startsWith('seed_')) ? assetPath(id) : '',
  );
  useEffect(() => {
    if (!id) {
      setSrc('');
      return;
    }
    if (!priv || id.startsWith('seed_')) {
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
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => active && setSrc(''));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, priv]);
  return src;
}

/**
 * A product on a stage: a seller-chosen backdrop with the cut-out placed on it. Without a stage it
 * simply shows the photo, so every product renders the same way in lists, cards and storefronts.
 */
export function ProductStage({
  stage,
  image,
  alt,
  priv = false,
  ratio = '4 / 5',
  className = '',
  children,
  eager = false,
}: {
  stage?: Stage | null;
  /** the original photo, shown when there is no cut-out */
  image: string;
  alt: string;
  /** the images are the seller's unpublished uploads */
  priv?: boolean;
  ratio?: string;
  className?: string;
  children?: ReactNode;
  eager?: boolean;
}) {
  const staged = !!stage?.cutout;
  const cutout = useAssetSrc(staged ? stage!.cutout : null, priv);
  const photo = useAssetSrc(staged ? null : image, priv);
  const scene = useAssetSrc(
    stage?.backdrop.kind === 'photo' ? stage.backdrop.asset_id : null,
    priv,
  );
  const b = stage?.backdrop;
  const style = {
    aspectRatio: ratio,
    ['--stage-a' as string]: b?.a,
    ['--stage-b' as string]: b?.b,
    ['--object-scale' as string]: stage?.scale ?? 0.78,
    ['--object-x' as string]: stage?.x ?? 0,
    ['--object-y' as string]: stage?.y ?? 0,
  } as CSSProperties;
  return (
    <div
      className={`stage ${staged ? 'is-staged' : 'is-plain'} ${className}`.trim()}
      data-kind={staged ? b?.kind : 'plain'}
      style={style}
    >
      {staged && b && (
        <>
          <div className="stage-backdrop" aria-hidden="true">
            {b.kind === 'ribbon' && (
              <div className="stage-ribbons">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="stage-ribbon" style={{ ['--row' as string]: i }}>
                    <span>{ribbonLine(b.text, 9)}</span>
                  </div>
                ))}
              </div>
            )}
            {b.kind === 'photo' && scene && <img src={scene} alt="" className="stage-scene" />}
          </div>
          <div className="stage-object">
            {cutout && (
              <img
                src={cutout}
                alt={alt}
                loading={eager ? 'eager' : 'lazy'}
                draggable={false}
                className={`${stage?.outline ? 'die-cut' : ''} ${stage?.shadow ? 'has-shadow' : ''}`.trim()}
              />
            )}
          </div>
        </>
      )}
      {!staged && photo && (
        <img src={photo} alt={alt} loading={eager ? 'eager' : 'lazy'} className="stage-photo" />
      )}
      {children}
    </div>
  );
}
