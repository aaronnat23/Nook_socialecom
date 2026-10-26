'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Layers,
  Paintbrush,
  GripVertical,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  History,
  Check,
  Cloud,
  WifiOff,
  X,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  UserRound,
  Megaphone,
  MousePointer2,
  Minus,
  Columns2,
  Link2,
  Package,
  GalleryHorizontal,
  Settings2,
  Upload,
  Loader2,
  Search,
} from 'lucide-react';
import {
  aspects,
  blockTypes,
  fonts,
  gradients,
  makeBlock,
  patterns,
  shapes,
  themes,
  variantOptions,
  personalizeTemplate,
  validateDocument,
  type Block,
  type BlockType,
  type Document,
  type Font,
  type Style,
} from '@lilac/schema';
import type { Product, Draft } from '@lilac/api-client';
import { blocksOf, contrastRatio } from '@lilac/renderer';
import { api } from '@/lib/api';
import { useModal } from '@/lib/use-modal';
import { useEditor } from '@/lib/use-editor';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
import { AssetImage, Storefront } from './storefront';
import { TemplateArtwork } from './templates';
const labels: Record<BlockType, string> = {
  hero: 'Hero banner',
  profileHeader: 'Profile header',
  text: 'Story & text',
  image: 'Image',
  gallery: 'Photo gallery',
  productGrid: 'Product grid',
  featuredProduct: 'Featured product',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Space',
  columns: 'Columns',
  socialLinks: 'Social links',
  announcement: 'Announcement',
};
const icons: Record<BlockType, typeof Type> = {
  hero: GalleryHorizontal,
  profileHeader: UserRound,
  text: Type,
  image: ImageIcon,
  gallery: LayoutGrid,
  productGrid: Package,
  featuredProduct: Package,
  button: MousePointer2,
  divider: Minus,
  spacer: Minus,
  columns: Columns2,
  socialLinks: Link2,
  announcement: Megaphone,
};
function flatten(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => [b, ...flatten(b.children || [])]);
}
function editTree(blocks: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return blocks.map((b) =>
    b.id === id ? fn(b) : b.children ? { ...b, children: editTree(b.children, id, fn) } : b,
  );
}
function removeTree(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.children ? { ...b, children: removeTree(b.children, id) } : b));
}
function cloneBlock(b: Block): Block {
  return {
    ...structuredClone(b),
    id: `b_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`,
    ...(b.children ? { children: b.children.map(cloneBlock) } : {}),
  };
}
export function EditorPage() {
  return (
    <AuthGate>
      <Editor />
    </AuthGate>
  );
}
function Editor() {
  const { me, toast } = useApp();
  const router = useRouter();
  const editor = useEditor(me!.shop.id);
  const { document: doc, commit } = editor;
  const [selected, setSelected] = useState<string>('hero');
  const [leftTab, setLeftTab] = useState('Layers');
  const [inspectorTab, setInspectorTab] = useState('Content');
  const [mode, setMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [preview, setPreview] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [catalog, setCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [versionModal, setVersionModal] = useState(false);
  const [versions, setVersions] = useState<
    { id: string; versionNo: number; note: string; created_at: string }[]
  >([]);
  const [template, setTemplate] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('template');
    if (themes.some((t) => t.id === requested)) setTemplate(requested);
  }, []);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileLeft, setMobileLeft] = useState(false);
  const [mobileRight, setMobileRight] = useState(false);
  const [touchId, setTouchId] = useState('');
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    api<{ items: { id: string; title: string }[] }>(`/shops/${me!.shop.id}/collections`)
      .then((r) => setCollections(r.items))
      .catch(() => {});
    api<{ items: Product[] }>(`/shops/${me!.shop.id}/products`)
      .then((r) => setProducts(r.items))
      .catch((e) => toast(e.message));
    if (window.innerWidth < 700) setMode('mobile');
  }, [me, toast]);
  const all = doc ? flatten(blocksOf(doc)) : [];
  const block = all.find((b) => b.id === selected);
  const errors = doc ? validateDocument(doc) : { valid: false, errors: [] };
  const updateBlock = (fn: (b: Block) => Block, group = '') => {
    if (!doc || !block) return;
    const next = structuredClone(doc);
    for (const s of next.sections) s.children = editTree(s.children, block.id, fn);
    commit(next, group);
  };
  const updateProps = (key: string, value: unknown) =>
    updateBlock((b) => ({ ...b, props: { ...b.props, [key]: value } }), `props.${key}`);
  const updateStyle = (key: keyof Style, value: unknown, responsive = false) =>
    updateBlock(
      (b) =>
        responsive && mode !== 'desktop'
          ? {
              ...b,
              responsive: {
                ...b.responsive,
                [mode]: { style: { ...b.responsive?.[mode]?.style, [key]: value } },
              },
            }
          : { ...b, style: { ...b.style, [key]: value } },
      `${responsive ? mode : 'base'}.${key}`,
    );
  const remove = (id = selected) => {
    if (!doc) return;
    const next = structuredClone(doc);
    for (const s of next.sections) s.children = removeTree(s.children, id);
    commit(next);
    setSelected('');
  };
  const duplicate = () => {
    if (!doc || !block) return;
    const next = structuredClone(doc);
    const walk = (items: Block[]): boolean => {
      const i = items.findIndex((b) => b.id === block.id);
      if (i >= 0) {
        const copy = cloneBlock(block);
        items.splice(i + 1, 0, copy);
        setSelected(copy.id);
        return true;
      }
      return items.some((b) => b.children && walk(b.children));
    };
    for (const s of next.sections) if (walk(s.children)) break;
    if (flatten(blocksOf(next)).length > 80) {
      toast('This page supports up to 80 blocks.');
      return;
    }
    commit(next);
  };
  const move = (id: string, delta: number) => {
    if (!doc) return;
    const next = structuredClone(doc);
    const walk = (items: Block[]): boolean => {
      const i = items.findIndex((b) => b.id === id);
      if (i >= 0) {
        const j = i + delta;
        if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]];
        return true;
      }
      return items.some((b) => b.children && walk(b.children));
    };
    for (const s of next.sections) if (walk(s.children)) break;
    commit(next);
  };
  const add = (type: BlockType, target?: string, beforeId?: string) => {
    if (!doc) return;
    const next = structuredClone(doc);
    const b = makeBlock(type);
    if (type === 'featuredProduct') b.props.productId = products[0]?.id || '';
    if (target) {
      let added = false;
      for (const s of next.sections)
        s.children = editTree(s.children, target, (parent) => {
          if (parent.type !== 'columns' || (parent.children?.length || 0) >= 3) {
            toast('Columns can contain up to three blocks.');
            return parent;
          }
          added = true;
          return { ...parent, children: [...(parent.children || []), b] };
        });
      if (!added) return;
    } else {
      if (!next.sections.length) next.sections.push({ id: 'main', type: 'section', children: [] });
      if (beforeId) {
        let inserted = false;
        const before = (items: Block[]): boolean => {
          const at = items.findIndex((x) => x.id === beforeId);
          if (at >= 0) {
            items.splice(at, 0, b);
            inserted = true;
            return true;
          }
          return items.some((x) => x.children && before(x.children));
        };
        for (const section of next.sections) if (before(section.children)) break;
        if (!inserted) next.sections[0].children.push(b);
      } else next.sections[0].children.push(b);
    }
    const result = validateDocument(next);
    if (!result.valid) {
      toast(result.errors[0]);
      return;
    }
    commit(next);
    setSelected(b.id);
    setInspectorTab('Content');
    setCatalog(false);
    setMobileRight(true);
  };
  const drop = (dragId: string, targetId: string) => {
    if (dragId.startsWith('new:')) {
      const type = dragId.slice(4) as BlockType;
      if (blockTypes.includes(type)) add(type, undefined, targetId);
      return;
    }
    if (!doc || dragId === targetId) return;
    const next = structuredClone(doc);
    let moved = false;
    const walk = (items: Block[]): boolean => {
      const i = items.findIndex((b) => b.id === dragId);
      const j = items.findIndex((b) => b.id === targetId);
      if (i >= 0 && j >= 0) {
        const [b] = items.splice(i, 1);
        items.splice(j, 0, b);
        moved = true;
        return true;
      }
      return items.some((b) => b.children && walk(b.children));
    };
    for (const s of next.sections) if (walk(s.children)) break;
    if (!moved) {
      toast('Move blocks within the same section. Use Add inside a column to nest.');
      return;
    }
    commit(next);
  };
  const publish = async () => {
    if (!doc) return;
    setPublishing(true);
    try {
      const rev = await editor.flush();
      const v = await api<{ versionNo: number }>(`/shops/${me!.shop.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          expectedRevision: rev,
          note: 'Published from the storefront editor',
        }),
      });
      toast(`Your space is live. Version ${v.versionNo} published.`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };
  const openVersions = async () => {
    try {
      const r = await api<{ items: typeof versions }>(`/shops/${me!.shop.id}/versions`);
      setVersions(r.items);
      setVersionModal(true);
    } catch (e) {
      toast((e as Error).message);
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'Escape') {
        setSelected('');
        setMobileRight(false);
        setCatalog(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? editor.redo() : editor.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        remove();
      }
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        move(selected, -1);
      }
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        move(selected, 1);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });
  if (!doc)
    return (
      <div className="empty-state">
        <Loader2 className="spin" />
        <h3>{editor.error || 'Opening your creative corner…'}</h3>
        {editor.error && (
          <button className="button primary" onClick={() => void editor.reload()}>
            Try again
          </button>
        )}
      </div>
    );
  const statusText = {
    loading: 'Opening draft…',
    saved: 'All changes saved',
    saving: 'Saving your draft…',
    unsaved: 'Unsaved changes',
    offline: 'Offline · kept on this device',
    conflict: 'This space changed elsewhere',
    error: 'Draft could not be saved',
  }[editor.state];
  const style = block?.style || {};
  const styleValue = (k: keyof Style) => style[k];
  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button
            className="icon-button"
            aria-label="Back to My Space"
            onClick={() => router.push('/me')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>
              {me!.shop.name}
              <span className="muted"> / Your design</span>
            </h1>
            <span className="save-state">
              {editor.state === 'offline' ? (
                <WifiOff size={10} />
              ) : editor.state === 'saved' ? (
                <Check size={10} />
              ) : (
                <Cloud size={10} />
              )}
              <span role="status">{statusText}</span>
            </span>
          </div>
        </div>
        <div className="editor-preview-tabs" aria-label="Preview size">
          {(
            [
              { key: 'mobile', label: 'Phone', Icon: Smartphone },
              { key: 'tablet', label: 'Tablet', Icon: Tablet },
              { key: 'desktop', label: 'Desktop', Icon: Monitor },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setMode(key)} className={mode === key ? 'active' : ''}>
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="editor-actions">
          <button
            className="icon-button"
            disabled={!editor.canUndo}
            onClick={editor.undo}
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            disabled={!editor.canRedo}
            onClick={editor.redo}
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button
            className="icon-button history-button"
            onClick={() => void openVersions()}
            aria-label="Version history"
          >
            <History size={16} />
          </button>
          <button className="button outline preview-button" onClick={() => setPreview(!preview)}>
            <Eye size={14} />
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            className="icon-button mobile-panel-toggle"
            onClick={() => setMobileRight(!mobileRight)}
            aria-label="Block properties"
          >
            <Settings2 size={17} />
          </button>
          <button
            className="button primary"
            onClick={() => void publish()}
            disabled={
              publishing ||
              uploading ||
              !errors.valid ||
              editor.state === 'conflict' ||
              editor.state === 'offline'
            }
          >
            {publishing ? <Loader2 className="spin" size={13} /> : <Upload size={13} />}Publish
          </button>
        </div>
      </div>
      {editor.state === 'conflict' && (
        <div className="editor-issue">
          This shop changed on another device. Your edits are kept here.{' '}
          <button className="text-button" onClick={editor.downloadCopy}>
            Save local as copy
          </button>{' '}
          ·{' '}
          <button className="text-button" onClick={() => void editor.reload()}>
            Reload latest
          </button>
        </div>
      )}
      {editor.state === 'error' && (
        <div className="editor-issue">
          {editor.error}
          <button className="text-button" onClick={() => void editor.save().catch(() => {})}>
            Retry saving
          </button>
        </div>
      )}
      {!errors.valid && <div className="editor-issue">{errors.errors[0]}</div>}
      <div className="editor-layout">
        <aside className={`editor-panel left ${mobileLeft ? 'open' : ''}`}>
          <div className="panel-tabs">
            {['Layers', 'Themes'].map((t) => (
              <button
                className={leftTab === t ? 'active' : ''}
                key={t}
                onClick={() => setLeftTab(t)}
              >
                {t === 'Layers' ? <Layers size={11} /> : <Paintbrush size={11} />} {t}
              </button>
            ))}
          </div>
          {leftTab === 'Layers' ? (
            <>
              <div className="editor-panel-title">
                <span className="eyebrow">YOUR PAGE</span>
                <span className="muted" style={{ fontSize: 8 }}>
                  {all.length} blocks
                </span>
              </div>
              {all.map((b) => {
                const Icon = icons[b.type];
                return (
                  <div
                    key={b.id}
                    className={`layer-item ${selected === b.id ? 'selected' : ''} ${touchId === b.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(e.dataTransfer.getData('text/plain'), b.id);
                    }}
                    onTouchStart={() => {
                      touchTimer.current = setTimeout(() => setTouchId(b.id), 450);
                    }}
                    onTouchEnd={() => {
                      if (touchTimer.current) clearTimeout(touchTimer.current);
                      if (touchId && touchId !== b.id) {
                        drop(touchId, b.id);
                        setTouchId('');
                      }
                    }}
                  >
                    <GripVertical className="layer-drag" size={12} />
                    <button
                      onClick={() => {
                        if (touchId && touchId !== b.id) {
                          drop(touchId, b.id);
                          setTouchId('');
                        } else {
                          setSelected(b.id);
                          setMobileRight(true);
                          setMobileLeft(false);
                        }
                      }}
                    >
                      <Icon size={13} />
                      <span>{b.props.headline || labels[b.type]}</span>
                    </button>
                    <div className="layer-mini">
                      <button
                        aria-label={`Move ${labels[b.type]} up`}
                        onClick={() => move(b.id, -1)}
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        aria-label={`Move ${labels[b.type]} down`}
                        onClick={() => move(b.id, 1)}
                      >
                        <ArrowDown size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button className="add-section-button" onClick={() => setCatalog(true)}>
                <Plus size={13} />
                Add a block
              </button>
              <div className="inspector-divider" />
              <span className="eyebrow">A LITTLE CREATIVE FREEDOM</span>
              <p style={{ marginTop: 10, lineHeight: 1.8 }}>
                Drag to reorder, or use the arrows. On a phone, hold a layer then tap its new
                neighbor.
              </p>
              <button
                className="text-button"
                style={{ fontSize: 9, marginTop: 10 }}
                onClick={() => void openVersions()}
              >
                <History size={12} />
                Version history
              </button>
            </>
          ) : (
            <div className="theme-cards">
              {themes.map((t) => (
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setTemplate(t.id);
                    }
                  }}
                  aria-label={`Choose ${t.name}`}
                  key={t.id}
                  className={`theme-card ${doc.theme.colors.accent === t.document.theme.colors.accent ? 'active' : ''}`}
                  onClick={() => setTemplate(t.id)}
                >
                  <TemplateArtwork theme={t} shop={me!.shop} products={products} />
                  <strong>{t.name}</strong>
                  <p>{t.description}</p>
                  <div className="theme-swatches">
                    {Object.values(t.document.theme.colors)
                      .slice(0, 4)
                      .map((c, i) => (
                        <span style={{ background: c }} key={i} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
        <div className="editor-canvas-area">
          <div className="canvas-label">
            <span>
              {preview ? 'BUYER PREVIEW' : 'YOUR CREATIVE CANVAS'} ·{' '}
              {mode === 'mobile' ? '390' : mode === 'tablet' ? '768' : '1280'} PX
            </span>
            <span>{preview ? 'Read only' : 'Click a block to make it yours'}</span>
          </div>
          <div className={`editor-canvas ${mode === 'mobile' ? 'phone' : mode}`}>
            <Storefront
              document={doc}
              products={products.filter((p) => p.status === 'published')}
              shop={me!.shop}
              width={mode === 'mobile' ? 390 : mode === 'tablet' ? 768 : 1280}
              editing={!preview}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setMobileRight(true);
                setMobileLeft(false);
              }}
              onDropBlock={drop}
            />
          </div>
          <button
            className="add-section-button"
            style={{ maxWidth: 320, background: '#ffffff88' }}
            onClick={() => setCatalog(true)}
          >
            <Plus size={14} />
            Add a little something
          </button>
        </div>
        <aside className={`editor-panel right inspector ${mobileRight ? 'open' : ''}`}>
          <div className="editor-panel-title">
            <h2>{block ? labels[block.type] : 'Your space style'}</h2>
            <div className="button-row">
              {block && (
                <>
                  <button
                    className="icon-button"
                    style={{ width: 24, height: 24 }}
                    onClick={duplicate}
                    aria-label="Duplicate block"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="icon-button"
                    style={{ width: 24, height: 24 }}
                    onClick={() => remove()}
                    aria-label="Delete block"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              <button
                className="icon-button mobile-panel-toggle"
                style={{ width: 24, height: 24 }}
                onClick={() => setMobileRight(false)}
                aria-label="Close inspector"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="panel-tabs">
            {['Content', 'Style', 'Layout', 'Responsive'].map((t) => (
              <button
                key={t}
                className={inspectorTab === t ? 'active' : ''}
                onClick={() => setInspectorTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {block ? (
            inspectorTab === 'Content' ? (
              <>
                <ContentInspector
                  block={block}
                  products={products}
                  collections={collections}
                  setCollection={(id) =>
                    updateBlock((b) => ({
                      ...b,
                      props: {
                        ...b.props,
                        source: id ? 'collection' : 'all',
                        ...(id ? { collectionId: id } : {}),
                      },
                    }))
                  }
                  update={updateProps}
                  upload={async (file) => {
                    setUploading(true);
                    try {
                      const form = new FormData();
                      form.set('file', file);
                      form.set('shop_id', me!.shop.id);
                      form.set(
                        'alt',
                        block.props.alt || block.props.headline || 'Shop collection photo',
                      );
                      const r = await api<{ id: string; alt: string }>('/uploads', {
                        method: 'POST',
                        body: form,
                      });
                      if (block.type === 'gallery')
                        updateProps('images', [
                          ...(block.props.images || []),
                          { imageAssetId: r.id, alt: r.alt },
                        ]);
                      else
                        updateBlock((b) => ({
                          ...b,
                          props: { ...b.props, imageAssetId: r.id, alt: r.alt },
                        }));
                      toast('Image uploaded. Your draft is private until you publish.');
                    } catch (e) {
                      toast((e as Error).message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                  uploading={uploading}
                />
                {block.type === 'columns' && (
                  <>
                    <p>Each column holds a block. Columns stack on phones.</p>
                    <div className="button-row" style={{ marginTop: 10 }}>
                      {(['text', 'image', 'productGrid'] as BlockType[]).map((t) => (
                        <button key={t} className="button outline" onClick={() => add(t, block.id)}>
                          + {labels[t]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {block.type === 'button' && (
                  <p className="fineprint">
                    Use https:// links, a shop/product path, or a #section anchor.
                  </p>
                )}
              </>
            ) : inspectorTab === 'Style' ? (
              <>
                {contrastRatio(
                  style.textColor || doc.theme.colors.text,
                  style.backgroundColor || doc.theme.colors.background,
                ) < 4.5 && (
                  <p className="warning">
                    This color pairing may be hard to read. Use a darker text color or a lighter
                    background.
                  </p>
                )}
                <h3>
                  Make it feel like you{' '}
                  <button
                    className="text-button"
                    style={{ fontSize: 8 }}
                    onClick={() =>
                      updateBlock((b) => ({ ...b, style: { paddingTop: 20, paddingBottom: 20 } }))
                    }
                  >
                    Reset
                  </button>
                </h3>
                <label>
                  Font family
                  <select
                    value={String(styleValue('fontFamily') || doc.theme.fontHeading)}
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                  >
                    {fonts.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <NumberField
                  label="Text size"
                  value={Number(style.fontSize || 32)}
                  min={10}
                  max={160}
                  onChange={(v) => updateStyle('fontSize', v)}
                />
                <label>
                  Weight
                  <select
                    value={style.fontWeight || 500}
                    onChange={(e) => updateStyle('fontWeight', Number(e.target.value))}
                  >
                    {[400, 500, 600, 700, 800].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Alignment
                  <select
                    value={style.textAlign || 'left'}
                    onChange={(e) => updateStyle('textAlign', e.target.value)}
                  >
                    {['left', 'center', 'right'].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <ColorField
                    label="Text"
                    value={style.textColor || doc.theme.colors.text}
                    onChange={(v) => updateStyle('textColor', v)}
                  />
                  <ColorField
                    label="Background"
                    value={style.backgroundColor || doc.theme.colors.background}
                    onChange={(v) => updateStyle('backgroundColor', v)}
                  />
                </div>
                <label>
                  Background gradient
                  <select
                    value={style.gradient || 'none'}
                    onChange={(e) => updateStyle('gradient', e.target.value)}
                  >
                    {gradients.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Background pattern
                  <select
                    value={style.pattern || 'none'}
                    onChange={(e) => updateStyle('pattern', e.target.value)}
                  >
                    {patterns.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                {style.pattern && style.pattern !== 'none' && (
                  <ColorField
                    label="Pattern colour"
                    value={style.patternColor || doc.theme.colors.accent}
                    onChange={(v) => updateStyle('patternColor', v)}
                  />
                )}
                <label>
                  Image shape
                  <select
                    value={style.shape || 'rect'}
                    onChange={(e) => updateStyle('shape', e.target.value)}
                  >
                    {shapes.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <NumberField
                  label="Rounded corners"
                  value={style.borderRadius ?? doc.theme.radius}
                  min={0}
                  max={64}
                  onChange={(v) => updateStyle('borderRadius', v)}
                />
                <label>
                  Image fit
                  <select
                    value={style.imageFit || 'cover'}
                    onChange={(e) => updateStyle('imageFit', e.target.value)}
                  >
                    <option>cover</option>
                    <option>contain</option>
                  </select>
                </label>
                <label>
                  Image aspect ratio
                  <select
                    value={style.aspectRatio || 'auto'}
                    onChange={(e) => updateStyle('aspectRatio', e.target.value)}
                  >
                    {aspects.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <NumberField
                  label="Crop · horizontal focal point"
                  value={style.focalX ?? 50}
                  min={0}
                  max={100}
                  onChange={(v) => updateStyle('focalX', v)}
                />
                <NumberField
                  label="Crop · vertical focal point"
                  value={style.focalY ?? 50}
                  min={0}
                  max={100}
                  onChange={(v) => updateStyle('focalY', v)}
                />
                <label
                  className="checkbox-label"
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <input
                    type="checkbox"
                    checked={advanced}
                    onChange={(e) => setAdvanced(e.target.checked)}
                  />
                  Advanced details
                </label>
                {advanced && (
                  <>
                    <NumberField
                      label="Line height"
                      value={style.lineHeight || 1.4}
                      min={1}
                      max={2.2}
                      step={0.1}
                      onChange={(v) => updateStyle('lineHeight', v)}
                    />
                    <NumberField
                      label="Letter spacing"
                      value={style.letterSpacing || 0}
                      min={-2}
                      max={10}
                      step={0.1}
                      onChange={(v) => updateStyle('letterSpacing', v)}
                    />
                    <NumberField
                      label="Border width"
                      value={style.borderWidth || 0}
                      min={0}
                      max={8}
                      onChange={(v) => updateStyle('borderWidth', v)}
                    />
                    <ColorField
                      label="Border color"
                      value={style.borderColor || doc.theme.colors.accent}
                      onChange={(v) => updateStyle('borderColor', v)}
                    />
                    <label>
                      Shadow
                      <select
                        value={style.shadow || 'none'}
                        onChange={(e) => updateStyle('shadow', e.target.value)}
                      >
                        {['none', 'soft', 'lifted'].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-label" style={{ flexDirection: 'row' }}>
                      <input
                        type="checkbox"
                        checked={style.uppercase || false}
                        onChange={(e) => updateStyle('uppercase', e.target.checked)}
                      />
                      Uppercase lettering
                    </label>
                  </>
                )}
              </>
            ) : inspectorTab === 'Layout' ? (
              <>
                <h3>A little breathing room</h3>
                <div className="form-grid">
                  {(
                    [
                      'paddingTop',
                      'paddingBottom',
                      'paddingLeft',
                      'paddingRight',
                      'marginTop',
                      'marginBottom',
                      'gap',
                    ] as const
                  ).map((k) => (
                    <label key={k}>
                      {k.replace(/([A-Z])/g, ' $1')}
                      <input
                        type="number"
                        min={0}
                        max={160}
                        value={style[k] ?? 0}
                        onChange={(e) =>
                          updateStyle(k, Math.max(0, Math.min(160, Number(e.target.value))))
                        }
                      />
                    </label>
                  ))}
                </div>
                <NumberField
                  label="Minimum height"
                  value={style.minHeight || 0}
                  min={0}
                  max={800}
                  onChange={(v) => updateStyle('minHeight', v)}
                />
                <NumberField
                  label="Maximum content width"
                  value={style.maxWidth || 1100}
                  min={280}
                  max={1440}
                  onChange={(v) => updateStyle('maxWidth', v)}
                />
                <label>
                  Section width
                  <select
                    value={style.width || 'contained'}
                    onChange={(e) => updateStyle('width', e.target.value)}
                  >
                    <option>contained</option>
                    <option>full</option>
                  </select>
                </label>
                {['productGrid', 'gallery', 'columns'].includes(block.type) && (
                  <NumberField
                    label="Desktop columns"
                    value={style.columns || 3}
                    min={1}
                    max={block.type === 'columns' ? 3 : 4}
                    onChange={(v) => updateStyle('columns', v)}
                  />
                )}
                <div className="inspector-divider" />
                <div className="button-row">
                  <button className="button outline" onClick={() => move(selected, -1)}>
                    <ArrowUp size={12} />
                    Move up
                  </button>
                  <button className="button outline" onClick={() => move(selected, 1)}>
                    <ArrowDown size={12} />
                    Move down
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Looks good, everywhere.</h3>
                <label>
                  Preview & edit breakpoint
                  <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                    <option value="mobile">Phone · 390px</option>
                    <option value="tablet">Tablet · 768px</option>
                    <option value="desktop">Desktop · 1280px</option>
                  </select>
                </label>
                <p>These settings override the base design only at the selected breakpoint.</p>
                <div className="inspector-divider" />
                {mode !== 'desktop' ? (
                  <>
                    <NumberField
                      label="Text size"
                      value={block.responsive?.[mode]?.style?.fontSize || style.fontSize || 32}
                      min={10}
                      max={96}
                      onChange={(v) => updateStyle('fontSize', v, true)}
                    />
                    <NumberField
                      label="Top spacing"
                      value={block.responsive?.[mode]?.style?.paddingTop ?? style.paddingTop ?? 20}
                      min={0}
                      max={160}
                      onChange={(v) => updateStyle('paddingTop', v, true)}
                    />
                    <NumberField
                      label="Block order"
                      value={block.responsive?.[mode]?.style?.order ?? all.indexOf(block)}
                      min={0}
                      max={80}
                      onChange={(v) => updateStyle('order', v, true)}
                    />
                    {['productGrid', 'gallery', 'columns'].includes(block.type) && (
                      <NumberField
                        label="Grid columns"
                        value={block.responsive?.[mode]?.style?.columns || 2}
                        min={1}
                        max={mode === 'mobile' ? 2 : 3}
                        onChange={(v) => updateStyle('columns', v, true)}
                      />
                    )}
                    <label>
                      Visibility
                      <select
                        value={block.responsive?.[mode]?.style?.visibility || 'visible'}
                        onChange={(e) => updateStyle('visibility', e.target.value, true)}
                      >
                        <option>visible</option>
                        <option>hidden</option>
                      </select>
                    </label>
                    <button
                      className="text-button"
                      onClick={() =>
                        updateBlock((b) => ({
                          ...b,
                          responsive: { ...b.responsive, [mode]: { style: {} } },
                        }))
                      }
                    >
                      Reset breakpoint overrides
                    </button>
                  </>
                ) : (
                  <p>Use Style and Layout to change desktop defaults.</p>
                )}
              </>
            )
          ) : (
            <div className="no-selection">
              <MousePointer2 size={25} />
              <h3>Pick a little detail.</h3>
              <p>Choose a block on your canvas, or style the whole space below.</p>
            </div>
          )}
          <div className="inspector-divider" />
          <h3>Whole-space palette</h3>
          <div className="form-grid">
            {Object.entries(doc.theme.colors).map(([key, value]) => (
              <ColorField
                key={key}
                label={key}
                value={value}
                onChange={(v) =>
                  commit(
                    { ...doc, theme: { ...doc.theme, colors: { ...doc.theme.colors, [key]: v } } },
                    `theme.${key}`,
                  )
                }
              />
            ))}
          </div>
          <label>
            Heading font
            <select
              value={doc.theme.fontHeading}
              onChange={(e) =>
                commit(
                  { ...doc, theme: { ...doc.theme, fontHeading: e.target.value as Font } },
                  'theme.heading',
                )
              }
            >
              {fonts.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Body font
            <select
              value={doc.theme.fontBody}
              onChange={(e) =>
                commit(
                  { ...doc, theme: { ...doc.theme, fontBody: e.target.value as Font } },
                  'theme.body',
                )
              }
            >
              {fonts.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setLeftTab('Themes');
              setMobileLeft(true);
              setMobileRight(false);
            }}
          >
            <Paintbrush size={12} />
            Browse {themes.length} starter templates
          </button>
        </aside>
      </div>
      <div className="editor-mobile-tools">
        <button onClick={() => setCatalog(true)}>
          <Plus />
          Add
        </button>
        <button
          onClick={() => {
            setMobileLeft(!mobileLeft);
            setMobileRight(false);
          }}
        >
          <Layers />
          Layers
        </button>
        <button
          onClick={() => {
            setLeftTab('Themes');
            setMobileLeft(!mobileLeft);
            setMobileRight(false);
          }}
        >
          <Paintbrush />
          Themes
        </button>
        <button disabled={!editor.canUndo} onClick={editor.undo}>
          <Undo2 />
          Undo
        </button>
        <button disabled={!editor.canRedo} onClick={editor.redo}>
          <Redo2 />
          Redo
        </button>
        <button
          onClick={() => {
            setPreview(!preview);
            setMobileRight(false);
            setMobileLeft(false);
          }}
        >
          <Eye />
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {catalog && (
        <Modal title="Add a little something." close={() => setCatalog(false)}>
          <p className="muted" style={{ fontSize: 12, margin: '12px 0 20px' }}>
            A story, a collection, a favorite photo. Start with a block.
          </p>
          <label>
            Find a block
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search blocks…"
            />
          </label>
          <div className="block-library">
            {blockTypes
              .filter((t) => labels[t].toLowerCase().includes(catalogSearch.toLowerCase()))
              .map((t) => {
                const Icon = icons[t];
                return (
                  <button
                    key={t}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', `new:${t}`);
                      setCatalog(false);
                    }}
                    onClick={() => add(t)}
                  >
                    <Icon />
                    {labels[t]}
                  </button>
                );
              })}
          </div>
        </Modal>
      )}
      {template && (
        <Modal title="A fresh look for your space." close={() => setTemplate(null)}>
          <div className="template-apply-art">
            <TemplateArtwork
              theme={themes.find((t) => t.id === template)!}
              shop={me!.shop}
              products={products}
            />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
            Choose how to apply {themes.find((t) => t.id === template)?.name}. Your products stay in
            your catalog.
          </p>
          <div className="template-choice">
            <button
              className="button soft"
              onClick={() => {
                const t = themes.find((t) => t.id === template)!;
                commit({ ...doc, theme: structuredClone(t.document.theme) });
                setTemplate(null);
                toast('Colors and fonts applied. Your layout is yours.');
              }}
            >
              Colors & fonts only
            </button>
            <button
              className="button primary"
              onClick={async () => {
                try {
                  const revision = await editor.flush();
                  await api(`/shops/${me!.shop.id}/snapshots`, {
                    method: 'POST',
                    body: JSON.stringify({
                      expectedRevision: revision,
                      note: 'Before applying a new template',
                    }),
                  });
                  const t = themes.find((t) => t.id === template)!;
                  const next = personalizeTemplate(
                    t.document,
                    me!.shop,
                    products.filter((p) => p.status === 'published').map((p) => p.id),
                  );
                  commit(next);
                  setTemplate(null);
                  setSelected(
                    flatten(blocksOf(next)).find((b) => b.type === 'hero')?.id ||
                      blocksOf(next)[0]?.id ||
                      '',
                  );
                  toast('New layout applied. Undo brings your previous draft back.');
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              Replace layout
              <br />
              (replaces current blocks)
            </button>
          </div>
          <p className="fineprint">
            Replacing the layout saves the current draft first and can be undone during this
            session.
          </p>
        </Modal>
      )}
      {versionModal && (
        <Modal title="Every version of you." close={() => setVersionModal(false)}>
          <p className="muted" style={{ fontSize: 12, margin: '12px 0' }}>
            Restoring copies a published version into your draft. Your live space stays unchanged
            until you publish.
          </p>
          {versions.length === 0 ? (
            <p className="fineprint">Your first publication will appear here.</p>
          ) : (
            versions.map((v) => (
              <div className="version-item" key={v.id}>
                <div>
                  <strong>Version {v.versionNo}</strong>
                  <p>
                    {new Date(v.created_at).toLocaleString('en-MY')}
                    <br />
                    {v.note}
                  </p>
                </div>
                <button
                  className="button soft"
                  onClick={async () => {
                    try {
                      const rev = await editor.flush();
                      await api<Draft>(`/shops/${me!.shop.id}/restore`, {
                        method: 'POST',
                        body: JSON.stringify({ versionId: v.id, expectedRevision: rev }),
                      });
                      await editor.reload();
                      setVersionModal(false);
                      toast(`Version ${v.versionNo} restored as a new draft.`);
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </Modal>
      )}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  useModal(close);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button close" aria-label="Close dialog" onClick={close}>
          <X size={18} />
        </button>
        <h2 style={{ fontSize: 25, letterSpacing: -1 }}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <span className="color-input">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          aria-label={`${label} hex value`}
          maxLength={7}
          onChange={(e) => {
            if (/^#[a-f\d]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
        />
      </span>
    </label>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} slider`}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          style={{ width: 60, flexShrink: 0 }}
          aria-label={label}
        />
      </div>
    </label>
  );
}
function ContentInspector({
  block: b,
  products,
  collections,
  setCollection,
  update,
  upload,
  uploading,
}: {
  block: Block;
  products: Product[];
  collections: { id: string; title: string }[];
  setCollection: (id: string) => void;
  update: (k: string, v: unknown) => void;
  upload: (f: File) => Promise<void>;
  uploading: boolean;
}) {
  const p = b.props;
  const variants = variantOptions[b.type];
  return (
    <>
      {variants && (
        <label>
          Layout style
          <select
            value={p.variant || variants[0].value}
            onChange={(e) =>
              update('variant', e.target.value === variants[0].value ? undefined : e.target.value)
            }
          >
            {variants.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} — {v.hint}
              </option>
            ))}
          </select>
        </label>
      )}
      {[
        'hero',
        'profileHeader',
        'text',
        'gallery',
        'productGrid',
        'featuredProduct',
        'columns',
      ].includes(b.type) && (
        <label>
          Heading
          <input
            value={p.headline || ''}
            maxLength={200}
            onChange={(e) => update('headline', e.target.value)}
          />
        </label>
      )}
      {['hero', 'profileHeader'].includes(b.type) && (
        <label>
          Short introduction
          <textarea
            value={p.subtitle || ''}
            maxLength={600}
            onChange={(e) => update('subtitle', e.target.value)}
          />
        </label>
      )}
      {['text', 'announcement'].includes(b.type) && (
        <label>
          Your words
          <textarea
            value={p.text || ''}
            maxLength={b.type === 'text' ? 6000 : 600}
            onChange={(e) => update('text', e.target.value)}
          />
        </label>
      )}
      {['hero', 'profileHeader', 'image', 'gallery'].includes(b.type) && (
        <>
          <h3>Your imagery</h3>
          {p.imageAssetId && (
            <div className="upload-preview" style={{ marginBottom: 12 }}>
              <AssetImage id={p.imageAssetId} alt={p.alt || ''} privateImage />
            </div>
          )}
          <label className="upload-field">
            {uploading
              ? 'Preparing your image…'
              : b.type === 'gallery'
                ? 'Add a photo'
                : 'Upload or replace image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = '';
              }}
            />
          </label>
          {b.type !== 'gallery' && (
            <label>
              Alternative text
              <input
                value={p.alt || ''}
                maxLength={300}
                onChange={(e) => update('alt', e.target.value)}
                placeholder="Describe what’s in the image"
              />
            </label>
          )}
          {b.type === 'image' && (
            <label>
              Caption
              <input
                value={p.caption || ''}
                maxLength={300}
                onChange={(e) => update('caption', e.target.value)}
              />
            </label>
          )}
          {p.images?.map((im, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  overflow: 'hidden',
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                <AssetImage id={im.imageAssetId} alt={im.alt} privateImage />
              </div>
              <input
                aria-label={`Photo ${i + 1} description`}
                value={im.alt}
                onChange={(e) =>
                  update(
                    'images',
                    p.images!.map((x, j) => (i === j ? { ...x, alt: e.target.value } : x)),
                  )
                }
              />
              <button
                onClick={() =>
                  update(
                    'images',
                    p.images!.filter((_, j) => i !== j),
                  )
                }
                aria-label={`Remove photo ${i + 1}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </>
      )}
      {b.type === 'text' && (
        <>
          <h3>Rich text details</h3>
          {p.nodes?.map((node, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                border: '1px solid var(--line)',
                borderRadius: 7,
                marginBottom: 12,
              }}
            >
              <label>
                {node.type}
                <textarea
                  value={node.text}
                  maxLength={5000}
                  onChange={(e) =>
                    update(
                      'nodes',
                      p.nodes!.map((x, j) => (i === j ? { ...x, text: e.target.value } : x)),
                    )
                  }
                />
              </label>
              {node.type === 'link' && (
                <label>
                  Secure link
                  <input
                    value={node.url || ''}
                    onChange={(e) =>
                      update(
                        'nodes',
                        p.nodes!.map((x, j) => (i === j ? { ...x, url: e.target.value } : x)),
                      )
                    }
                  />
                </label>
              )}
              <button
                className="text-button"
                onClick={() =>
                  update(
                    'nodes',
                    p.nodes!.filter((_, j) => i !== j),
                  )
                }
              >
                Remove detail
              </button>
            </div>
          ))}
          <div className="button-row">
            {(['paragraph', 'h2', 'h3', 'bold', 'italic', 'listItem', 'link'] as const).map(
              (type) => (
                <button
                  key={type}
                  className="button outline"
                  onClick={() =>
                    update('nodes', [
                      ...(p.nodes || []),
                      {
                        type,
                        text: 'Your words here',
                        ...(type === 'link' ? { url: 'https://example.com' } : {}),
                      },
                    ])
                  }
                >
                  + {type}
                </button>
              ),
            )}
          </div>
        </>
      )}
      {b.type === 'hero' && (
        <>
          <h3>Your call to action</h3>
          <label>
            Button label
            <input
              maxLength={80}
              value={p.cta?.label || ''}
              onChange={(e) =>
                update('cta', { label: e.target.value, url: p.cta?.url || '#products' })
              }
            />
          </label>
          <label>
            Button link
            <input
              value={p.cta?.url || '#products'}
              onChange={(e) =>
                update('cta', { label: p.cta?.label || 'Explore', url: e.target.value })
              }
            />
          </label>
        </>
      )}
      {b.type === 'productGrid' && (
        <>
          <label>
            Collection
            <select
              value={p.source === 'collection' ? p.collectionId || '' : ''}
              onChange={(e) => setCollection(e.target.value)}
            >
              <option value="">All products</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Number of products
            <input
              type="number"
              min={1}
              max={24}
              value={p.limit || 12}
              onChange={(e) => update('limit', Math.max(1, Math.min(24, Number(e.target.value))))}
            />
          </label>
          <label>
            Product order
            <select value={p.sort || 'newest'} onChange={(e) => update('sort', e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </>
      )}
      {b.type === 'featuredProduct' && (
        <label>
          Featured product
          <select value={p.productId || ''} onChange={(e) => update('productId', e.target.value)}>
            <option value="">Choose your product</option>
            {products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {b.type === 'button' && (
        <>
          <label>
            Button text
            <input
              value={p.label || ''}
              maxLength={80}
              onChange={(e) => update('label', e.target.value)}
            />
          </label>
          <label>
            Link
            <input
              value={p.url || ''}
              onChange={(e) => update('url', e.target.value)}
              placeholder="https://…"
            />
          </label>
        </>
      )}
      {b.type === 'socialLinks' && (
        <>
          <p style={{ marginBottom: 15 }}>
            A few places to find you. Only secure https:// links are accepted.
          </p>
          {p.links?.map((l, i) => (
            <div key={i}>
              <label>
                Link label
                <input
                  value={l.label}
                  onChange={(e) =>
                    update(
                      'links',
                      p.links!.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)),
                    )
                  }
                />
              </label>
              <label>
                URL
                <input
                  value={l.url}
                  onChange={(e) =>
                    update(
                      'links',
                      p.links!.map((x, j) => (i === j ? { ...x, url: e.target.value } : x)),
                    )
                  }
                />
              </label>
              <button
                className="text-button"
                onClick={() =>
                  update(
                    'links',
                    p.links!.filter((_, j) => j !== i),
                  )
                }
              >
                Remove link
              </button>
            </div>
          ))}
          <button
            className="button outline wide"
            onClick={() =>
              update('links', [
                ...(p.links || []),
                { label: 'Our social', url: 'https://instagram.com' },
              ])
            }
          >
            + Add link
          </button>
        </>
      )}
      {['divider', 'spacer'].includes(b.type) && (
        <p>Use Style and Layout to adjust this {labels[b.type].toLowerCase()}.</p>
      )}
    </>
  );
}
