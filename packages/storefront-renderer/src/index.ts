import { gradientStops, type Block, type Document, type Font, type Style } from '@lilac/schema';
export const breakpoints = { mobile: 768, tablet: 1024 };
export function resolveStyle(block: Block, theme: Document['theme'], width: number): Style {
  const base: Style = {
    fontFamily: theme.fontBody,
    textColor: theme.colors.text,
    borderRadius: theme.radius,
    gap: 16,
    ...(['hero', 'profileHeader'].includes(block.type) ? { fontFamily: theme.fontHeading } : {}),
    ...(block.type === 'productGrid' ? { columns: width < 360 ? 1 : width < 768 ? 2 : 3 } : {}),
    ...block.style,
  };
  return {
    ...base,
    ...(width < 1024 ? block.responsive?.tablet?.style : {}),
    ...(width < 768 ? block.responsive?.mobile?.style : {}),
  };
}
/** Headings inherit the theme heading face unless the block or breakpoint overrides it. */
export function resolveHeadingFont(block: Block, theme: Document['theme'], width: number) {
  return resolveStyle(
    { ...block, style: { fontFamily: theme.fontHeading, ...block.style } },
    theme,
    width,
  ).fontFamily!;
}
/** Column groups stack on phones unless the seller explicitly chooses a mobile grid. */
export function resolveColumns(block: Block, theme: Document['theme'], width: number) {
  return width < 768
    ? block.responsive?.mobile?.style?.columns || 1
    : resolveStyle(block, theme, width).columns || 2;
}
/** A block's layout variant, falling back to the first (default) option for its type. */
export function variantOf(block: Block, fallback: string): string {
  return block.props.variant || fallback;
}
/** CSS font stack for a face a seller picked. */
export function fontStack(font?: Font): string | undefined {
  switch (font) {
    case undefined:
      return undefined;
    case 'Inter':
      return 'var(--shop-sans)';
    case 'Georgia':
      return "Georgia, 'Times New Roman', serif";
    case 'Courier New':
      return "'Courier New', Courier, monospace";
    case 'Arial':
      return 'Arial, Helvetica, sans-serif';
    case 'Trebuchet MS':
      return "'Trebuchet MS', Verdana, sans-serif";
    case 'Caprasimo':
      return "'Caprasimo', Georgia, serif";
    case 'Caveat':
      return "'Caveat', 'Comic Sans MS', cursive";
    case 'DM Serif Display':
      return "'DM Serif Display', Georgia, serif";
    case 'Archivo Black':
      return "'Archivo Black', Impact, 'Arial Black', sans-serif";
    case 'Space Mono':
      return "'Space Mono', 'Courier New', monospace";
  }
}
/** CSS layers for a background pattern: image(s) and the matching size(s). */
export function patternCss(
  pattern: Style['pattern'],
  color: string,
): { image: string; size: string } | undefined {
  switch (pattern) {
    case 'dots':
      return {
        image: `radial-gradient(circle, ${color} 2px, transparent 2.5px)`,
        size: '24px 24px',
      };
    case 'grid':
      return {
        image: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        size: '28px 28px, 28px 28px',
      };
    case 'stripes':
      return {
        image: `repeating-linear-gradient(45deg, ${color} 0 8px, transparent 8px 20px)`,
        size: 'auto',
      };
    case 'checker':
      return {
        image: `conic-gradient(${color} 25%, transparent 0 50%, ${color} 0 75%, transparent 0)`,
        size: '64px 64px',
      };
    default:
      return undefined;
  }
}
/** The linear gradient for a named gradient. */
export function gradientCss(name?: Style['gradient']): string | undefined {
  if (!name || name === 'none') return undefined;
  const [a, b] = gradientStops[name];
  return `linear-gradient(125deg,${a},${b})`;
}
export function blocksOf(doc: Document): Block[] {
  return doc.sections.flatMap((s) => s.children);
}
export function moveBlock(doc: Document, id: string, delta: number): Document {
  const next = structuredClone(doc);
  for (const s of next.sections) {
    const i = s.children.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i >= 0 && j >= 0 && j < s.children.length)
      [s.children[i], s.children[j]] = [s.children[j], s.children[i]];
  }
  return next;
}
export function assetPath(id?: string): string {
  if (!id) return '';
  if (id.startsWith('seed_cutout_')) return `/images/${id}.webp`;
  return id.startsWith('seed_') ? `/images/${id}.jpg` : `/media/${id}.webp`;
}
export function money(minor: number, currency = 'MYR') {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export * from './stage';
