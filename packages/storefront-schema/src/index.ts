import Ajv from 'ajv';
import schema from '../storefront.v1.json';
import themeFixtures from '../fixtures/themes.json';
export type BlockType =
  | 'hero'
  | 'profileHeader'
  | 'text'
  | 'image'
  | 'gallery'
  | 'productGrid'
  | 'featuredProduct'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'socialLinks'
  | 'announcement';
export type Font = 'Inter' | 'Georgia' | 'Arial' | 'Courier New' | 'Trebuchet MS';
export interface Style {
  fontFamily?: Font;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;
  gap?: number;
  columns?: number;
  maxWidth?: number;
  minHeight?: number;
  imageFit?: 'cover' | 'contain';
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | 'auto';
  focalX?: number;
  focalY?: number;
  visibility?: 'visible' | 'hidden';
  shadow?: 'none' | 'soft' | 'lifted';
  gradient?: 'none' | 'lilac' | 'sunset' | 'forest';
  uppercase?: boolean;
  width?: 'full' | 'contained';
  order?: number;
}
export interface BlockProps {
  headline?: string;
  subtitle?: string;
  text?: string;
  imageAssetId?: string;
  alt?: string;
  caption?: string;
  cta?: { label: string; url: string };
  label?: string;
  url?: string;
  source?: 'all' | 'collection';
  collectionId?: string;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  productId?: string;
  images?: { imageAssetId: string; alt: string }[];
  links?: { label: string; url: string }[];
  nodes?: {
    type: 'paragraph' | 'h2' | 'h3' | 'bold' | 'italic' | 'link' | 'listItem';
    text: string;
    url?: string;
  }[];
}
export interface Block {
  id: string;
  type: BlockType;
  props: BlockProps;
  style?: Style;
  responsive?: { mobile?: { style?: Style }; tablet?: { style?: Style } };
  children?: Block[];
}
export interface Document {
  schemaVersion: 1;
  shopId: string;
  pageId: string;
  theme: {
    fontHeading: Font;
    fontBody: Font;
    colors: { background: string; surface: string; text: string; accent: string; muted: string };
    contentWidth: number;
    radius: number;
  };
  sections: { id: string; type: 'section'; style?: Style; children: Block[] }[];
}
export const themes = themeFixtures as {
  id: string;
  name: string;
  description: string;
  document: Document;
}[];
export const blockTypes: BlockType[] = [
  'hero',
  'profileHeader',
  'text',
  'image',
  'gallery',
  'productGrid',
  'featuredProduct',
  'button',
  'divider',
  'spacer',
  'columns',
  'socialLinks',
  'announcement',
];
const ajv = new Ajv({ allErrors: true, strict: false });
const check = ajv.compile<Document>(schema);
export function validateDocument(value: unknown): { valid: boolean; errors: string[] } {
  const valid = check(value);
  const errors = (check.errors || []).map((e) => `${e.instancePath} ${e.message}`);
  if (!valid) return { valid: false, errors };
  const doc = value as Document;
  const ids = new Set<string>();
  let count = 0;
  const walk = (blocks: Block[], depth: number) => {
    if (depth > 3) errors.push('Maximum nesting depth is 3');
    for (const b of blocks) {
      count++;
      if (ids.has(b.id)) errors.push('Block IDs must be unique');
      ids.add(b.id);
      for (const v of Object.values(b.props)) {
        if (typeof v === 'string' && /<\/?[a-z]|javascript:|data:text\/html/i.test(v))
          errors.push('Unsafe content is not allowed');
      }
      if (b.children) walk(b.children, depth + 1);
    }
  };
  for (const section of doc.sections) walk(section.children, 1);
  if (count > 80) errors.push('Maximum 80 blocks');
  if (JSON.stringify(doc).length > 250000) errors.push('Document is too large');
  return { valid: errors.length === 0, errors };
}
export function makeBlock(type: BlockType): Block {
  const id = `b_${Math.random().toString(36).slice(2, 12)}`;
  const props: Record<BlockType, BlockProps> = {
    hero: { headline: 'Something wonderfully you.', subtitle: 'Tell your story here.' },
    profileHeader: { headline: 'Your space', subtitle: 'A little introduction goes here.' },
    text: { headline: 'A little about us', text: 'Made with intention. Shared with love.' },
    image: { imageAssetId: 'seed_hero_0', alt: 'Studio collection' },
    gallery: {
      headline: 'A few favorite moments',
      images: [{ imageAssetId: 'seed_hero_0', alt: 'Studio collection' }],
    },
    productGrid: { headline: 'Shop the collection', source: 'all', limit: 12 },
    featuredProduct: { productId: '', headline: 'In the spotlight' },
    button: { label: 'Explore the collection', url: '#products' },
    divider: {},
    spacer: {},
    columns: { headline: 'Side by side' },
    socialLinks: { links: [{ label: 'Instagram', url: 'https://instagram.com' }] },
    announcement: { text: 'A little something new is here.' },
  };
  return {
    id,
    type,
    props: props[type],
    style: { paddingTop: type === 'spacer' ? 40 : 20, paddingBottom: 20 },
    ...(type === 'columns'
      ? {
          children: [
            { id: `${id}_text`, type: 'text' as const, props: { text: 'Your story goes here.' } },
          ],
        }
      : {}),
  };
}
export { schema };
