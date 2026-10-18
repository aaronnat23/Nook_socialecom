import type { Block, Document, Style } from '@lilac/schema';
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
