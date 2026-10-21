'use client';
import { useState } from 'react';
import { Eraser, ImagePlus, Loader2, Sparkles, Undo2 } from 'lucide-react';
import type { Stage } from '@lilac/api-client';
import {
  backdropOptions,
  defaultStage,
  stagePalettes,
  stageLimits,
  withBackdropKind,
} from '@lilac/renderer';
import { api } from '@/lib/api';
import { ProductStage } from './stage';

const isUpload = (id: string) => !id.startsWith('seed_');

/**
 * Where a seller sets a product's scene: upload a photo, lift the product off its background and
 * choose what sits behind it. The preview is the same component shoppers see.
 */
export function StageStudio({
  shopId,
  title,
  image,
  stage,
  onImage,
  onStage,
  onError,
}: {
  shopId: string;
  title: string;
  image: string;
  stage: Stage | null;
  onImage: (id: string) => void;
  onStage: (stage: Stage | null) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [alreadyCut, setAlreadyCut] = useState(false);

  const upload = async (file: File, keepAlpha = false) => {
    const body = new FormData();
    body.set('file', file);
    body.set('shop_id', shopId);
    body.set('alt', title || 'Product photo');
    body.set('keep_alpha', String(keepAlpha));
    return api<{ id: string }>('/uploads', { method: 'POST', body });
  };

  const patch = (next: Partial<Stage>) => stage && onStage({ ...stage, ...next });
  const colours = (a: string, b: string) =>
    stage && onStage({ ...stage, backdrop: { ...stage.backdrop, a, b } });
  const kind = stage?.backdrop.kind;
  const two = backdropOptions.find((o) => o.kind === kind)?.twoColours;

  return (
    <section className="studio" aria-label="Product photo and stage">
      <div className="studio-preview">
        <ProductStage stage={stage} image={image} alt={title || 'Product preview'} priv />
        {!stage && (
          <p className="studio-note">
            {isUpload(image)
              ? 'Cut the product out to unlock backdrops.'
              : 'Upload your own photo to start styling.'}
          </p>
        )}
      </div>
      <div className="studio-controls">
        <div className="studio-step">
          <span className="studio-num">1</span>
          <div>
            <h3>Your photo</h3>
            <label className="file-pill">
              {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
              {isUpload(image) ? 'Replace photo' : 'Upload a photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setUploading(true);
                  try {
                    const r = await upload(f, alreadyCut);
                    onImage(r.id);
                    // a transparent upload is already a cut-out, so it goes straight onto a stage
                    onStage(alreadyCut ? defaultStage(r.id) : null);
                  } catch (err) {
                    onError((err as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={alreadyCut}
                onChange={(e) => setAlreadyCut(e.target.checked)}
              />
              My next photo is already a transparent cut-out
            </label>
          </div>
        </div>

        <div className="studio-step">
          <span className="studio-num">2</span>
          <div>
            <h3>Cut it out</h3>
            <p className="studio-hint">
              We lift the product off its background so you can place it on any scene.
            </p>
            <button
              type="button"
              className="button primary small-button"
              disabled={cutting || uploading || !isUpload(image)}
              onClick={async () => {
                setCutting(true);
                try {
                  const r = await api<{ id: string }>(`/shops/${shopId}/cutouts`, {
                    method: 'POST',
                    body: JSON.stringify({ asset_id: image }),
                  });
                  onStage(defaultStage(r.id));
                } catch (err) {
                  onError((err as Error).message);
                } finally {
                  setCutting(false);
                }
              }}
            >
              {cutting ? <Loader2 size={15} className="spin" /> : <Eraser size={15} />}
              {cutting ? 'Cutting it out…' : stage ? 'Cut out again' : 'Remove background'}
            </button>
          </div>
        </div>

        {stage && (
          <div className="studio-step">
            <span className="studio-num">3</span>
            <div className="studio-scene">
              <h3>Set the scene</h3>
              <div className="chip-row" role="radiogroup" aria-label="Backdrop">
                {backdropOptions.map((o) => (
                  <button
                    key={o.kind}
                    type="button"
                    role="radio"
                    aria-checked={kind === o.kind}
                    title={o.hint}
                    className={`chip small ${kind === o.kind ? 'active' : ''}`}
                    onClick={() => onStage(withBackdropKind(stage, o.kind))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {kind !== 'photo' && (
                <div className="swatches" role="group" aria-label="Colours">
                  {stagePalettes.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      title={p.name}
                      aria-label={`${p.name} colours`}
                      aria-pressed={stage.backdrop.a === p.a && stage.backdrop.b === p.b}
                      className="swatch"
                      style={{ background: `linear-gradient(135deg, ${p.a} 50%, ${p.b} 50%)` }}
                      onClick={() => colours(p.a, p.b)}
                    />
                  ))}
                </div>
              )}
              {kind !== 'photo' && (
                <div className="colour-pair">
                  <label>
                    Main colour
                    <input
                      type="color"
                      value={stage.backdrop.a}
                      onChange={(e) => colours(e.target.value.toUpperCase(), stage.backdrop.b)}
                    />
                  </label>
                  {two && (
                    <label>
                      Accent
                      <input
                        type="color"
                        value={stage.backdrop.b}
                        onChange={(e) => colours(stage.backdrop.a, e.target.value.toUpperCase())}
                      />
                    </label>
                  )}
                </div>
              )}
              {kind === 'ribbon' && (
                <label>
                  Ribbon words
                  <input
                    maxLength={40}
                    value={stage.backdrop.text}
                    placeholder="SMALL SHOPS"
                    onChange={(e) =>
                      onStage({ ...stage, backdrop: { ...stage.backdrop, text: e.target.value } })
                    }
                  />
                </label>
              )}
              {kind === 'photo' && (
                <label className="file-pill">
                  <ImagePlus size={16} />
                  {stage.backdrop.asset_id ? 'Change scene photo' : 'Upload a scene photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      try {
                        const r = await upload(f);
                        onStage({ ...stage, backdrop: { ...stage.backdrop, asset_id: r.id } });
                      } catch (err) {
                        onError((err as Error).message);
                      }
                    }}
                  />
                </label>
              )}
              <div className="sliders">
                <label>
                  Size
                  <input
                    type="range"
                    min={stageLimits.scale[0]}
                    max={stageLimits.scale[1]}
                    step={0.01}
                    value={stage.scale}
                    onChange={(e) => patch({ scale: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Left / right
                  <input
                    type="range"
                    min={stageLimits.x[0]}
                    max={stageLimits.x[1]}
                    step={0.01}
                    value={stage.x}
                    onChange={(e) => patch({ x: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Up / down
                  <input
                    type="range"
                    min={stageLimits.y[0]}
                    max={stageLimits.y[1]}
                    step={0.01}
                    value={stage.y}
                    onChange={(e) => patch({ y: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="toggles">
                <label className="studio-check">
                  <input
                    type="checkbox"
                    checked={stage.outline}
                    onChange={(e) => patch({ outline: e.target.checked })}
                  />
                  <Sparkles size={14} /> Die-cut sticker edge
                </label>
                <label className="studio-check">
                  <input
                    type="checkbox"
                    checked={stage.shadow}
                    onChange={(e) => patch({ shadow: e.target.checked })}
                  />
                  Soft shadow
                </label>
              </div>
              <button type="button" className="text-button" onClick={() => onStage(null)}>
                <Undo2 size={14} /> Use the plain photo instead
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
