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
/**
 * Faces a seller can pick. The first five are system fonts; the rest are bundled on web and in the
 * native app (all SIL Open Font License).
 */
export const fonts = [
  'Inter',
  'Georgia',
  'Arial',
  'Courier New',
  'Trebuchet MS',
  'Caprasimo',
  'Caveat',
  'DM Serif Display',
  'Archivo Black',
  'Space Mono',
] as const;
export type Font = (typeof fonts)[number];
export const gradients = [
  'none',
  'lilac',
  'sunset',
  'forest',
  'peach',
  'candy',
  'ocean',
  'night',
  'sage',
  'butter',
] as const;
export type Gradient = (typeof gradients)[number];
/** The two colours of each gradient, blended at 125 degrees. */
export const gradientStops: Record<Exclude<Gradient, 'none'>, [string, string]> = {
  lilac: ['#efe5f9', '#ded0f2'],
  sunset: ['#f9e8d7', '#ebccdc'],
  forest: ['#edf2e4', '#cddbc9'],
  peach: ['#ffe4d1', '#ffc4b0'],
  candy: ['#ffd9ec', '#d9d0ff'],
  ocean: ['#d8f0f7', '#9fc8ee'],
  night: ['#2a2342', '#13101f'],
  sage: ['#e4ecd9', '#b9cca8'],
  butter: ['#fff3c7', '#ffd778'],
};
export const aspects = ['1:1', '4:3', '3:4', '4:5', '3:2', '16:9', '21:9', 'auto'] as const;
export type Aspect = (typeof aspects)[number];
export const patterns = ['none', 'dots', 'grid', 'stripes', 'checker'] as const;
export type Pattern = (typeof patterns)[number];
export const shapes = ['rect', 'arch', 'pill', 'circle'] as const;
export type Shape = (typeof shapes)[number];
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
  aspectRatio?: Aspect;
  focalX?: number;
  focalY?: number;
  visibility?: 'visible' | 'hidden';
  shadow?: 'none' | 'soft' | 'lifted';
  gradient?: Gradient;
  /** A repeating texture drawn over the background, in `patternColor`. */
  pattern?: Pattern;
  patternColor?: string;
  /** Crops images into an arch, a pill or a circle. */
  shape?: Shape;
  uppercase?: boolean;
  width?: 'full' | 'contained';
  order?: number;
}
export interface BlockProps {
  /** How the block is laid out; each block type has its own list in `variantOptions`. */
  variant?: string;
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
/** How a product is presented: its cut-out, the backdrop behind it and how the two sit together. */
export type BackdropKind =
  | 'color'
  | 'gradient'
  | 'stripes'
  | 'dots'
  | 'sunburst'
  | 'arch'
  | 'ribbon'
  | 'photo';
export interface Backdrop {
  kind: BackdropKind;
  a: string;
  b: string;
  text: string;
  asset_id: string | null;
}
export interface Stage {
  v: 1;
  cutout: string | null;
  backdrop: Backdrop;
  scale: number;
  x: number;
  y: number;
  outline: boolean;
  shadow: boolean;
}
export const themes = themeFixtures as {
  id: string;
  name: string;
  description: string;
  document: Document;
}[];
/** Bind a reusable layout to the seller without changing the template or catalog. */
export function personalizeTemplate(
  source: Document,
  shop: { id: string; name: string; bio: string },
  productIds: string[],
): Document {
  const next = JSON.parse(JSON.stringify(source)) as Document;
  next.shopId = shop.id;
  const visit = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'profileHeader')
        block.props = { ...block.props, headline: shop.name, subtitle: shop.bio };
      if (block.type === 'featuredProduct' && !block.props.productId)
        block.props.productId = productIds[0] || '';
      if (block.children) visit(block.children);
    }
  };
  for (const section of next.sections) visit(section.children);
  return next;
}
export const templateDetails: Record<
  string,
  { mood: string; audience: string; features: string[]; cover: string }
> = {
  'minimal-studio': {
    mood: 'Soft & considered',
    audience: 'Ceramics, homeware & everyday rituals',
    features: ['Split hero', 'Open product grid', 'A letter from the studio'],
    cover: 'seed_hero_0',
  },
  'vintage-film': {
    mood: 'Typewriter & found objects',
    audience: 'Vintage finds, books & pre-loved pieces',
    features: ['Film-strip photos', 'Numbered contact sheet', 'Marquee ticker'],
    cover: 'seed_hero_1',
  },
  'y2k-diary': {
    mood: 'Pink & playful',
    audience: 'Accessories, jewellery & personal collections',
    features: ['Graph-paper page', 'Polaroid scrapbook', 'Sticky notes'],
    cover: 'seed_product_10',
  },
  'dark-editorial': {
    mood: 'After hours',
    audience: 'Design objects, jewellery & statement pieces',
    features: ['Full-bleed cover', 'Pull quote', 'Lookbook spreads'],
    cover: 'seed_hero_3',
  },
  'handmade-market': {
    mood: 'Made with feeling',
    audience: 'Handmade goods, textiles & craft',
    features: ['Arched portrait', "Maker's letter", 'Swipeable stall'],
    cover: 'seed_hero_0',
  },
  'streetwear-drop': {
    mood: 'Loud & limited',
    audience: 'Fashion, streetwear & limited drops',
    features: ['Poster type', 'Ticker tape', 'Mosaic drop'],
    cover: 'seed_hero_5',
  },
  botanical: {
    mood: 'Naturally quiet',
    audience: 'Botanicals, beauty & slow living',
    features: ['Arched cover', 'Spotlight product', 'Masonry of greenery'],
    cover: 'seed_hero_6',
  },
  'art-gallery': {
    mood: 'White cube',
    audience: 'Art, prints & independent studios',
    features: ['Museum labels', 'Framed works', 'Numbered catalogue'],
    cover: 'seed_hero_7',
  },
  'candy-counter': {
    mood: 'Sweet & bubbly',
    audience: 'Gifts, treats, stationery & pretty things',
    features: ['Polka-dot wall', 'Pill-shaped photos', 'Pick & mix mosaic'],
    cover: 'seed_product_20',
  },
  'photocopy-zine': {
    mood: 'Cut, paste & copy',
    audience: 'Small-run clothing, zines & prints',
    features: ['Monospaced type', 'Hazard tape', 'Taped-up notes'],
    cover: 'seed_product_15',
  },
  atelier: {
    mood: 'Tailored & calm',
    audience: 'Fashion, tailoring & wardrobe staples',
    features: ['Letterspaced wordmark', 'Tall lookbook spreads', 'Wide-left stories'],
    cover: 'seed_product_16',
  },
  'night-market': {
    mood: 'Lantern light',
    audience: 'Candles, snacks, small stalls & late-night finds',
    features: ['Night cover', 'Swipeable stalls', 'Round medallions'],
    cover: 'seed_hero_4',
  },
  'seaside-studio': {
    mood: 'Salt air & open windows',
    audience: 'Homeware, linens & holiday goods',
    features: ['Ocean-gradient cover', 'Arched windows', 'Gentle wave'],
    cover: 'seed_product_12',
  },
  'terrazzo-studio': {
    mood: 'Colour blocks',
    audience: 'Prints, paper goods & bright objects',
    features: ['Arch, circle & pill', 'Cut-paper blocks', 'Confetti checker'],
    cover: 'seed_product_23',
  },
};
export const variantOptions: Partial<
  Record<BlockType, { value: string; label: string; hint: string }[]>
> = {
  hero: [
    { value: 'split', label: 'Split', hint: 'Words on one side, photo on the other' },
    { value: 'flip', label: 'Flipped split', hint: 'Photo first, words after' },
    { value: 'centered', label: 'Centered', hint: 'Centered words over a wide photo' },
    { value: 'overlay', label: 'Full-bleed', hint: 'Words laid over the photo' },
    { value: 'poster', label: 'Poster', hint: 'Giant type with a small photo' },
    { value: 'stack', label: 'Cover story', hint: 'Tall photo with the words beneath' },
  ],
  profileHeader: [
    { value: 'row', label: 'Row', hint: 'Logo, name and follow in a line' },
    { value: 'centered', label: 'Centered', hint: 'Stacked and centered' },
    { value: 'banner', label: 'Banner', hint: 'A bold band in your accent colour' },
    { value: 'minimal', label: 'Minimal', hint: 'Just a name and a follow button' },
  ],
  text: [
    { value: 'plain', label: 'Plain', hint: 'A heading and paragraph' },
    { value: 'quote', label: 'Pull quote', hint: 'Oversized quotation' },
    { value: 'note', label: 'Paper note', hint: 'A note on a card' },
    { value: 'letter', label: 'Letter', hint: 'A drop cap and a roomy measure' },
  ],
  image: [
    { value: 'plain', label: 'Plain', hint: 'Just the photo' },
    { value: 'framed', label: 'Framed', hint: 'A thick frame with an inner keyline' },
    { value: 'polaroid', label: 'Polaroid', hint: 'White border with a caption strip' },
  ],
  gallery: [
    { value: 'grid', label: 'Grid', hint: 'Even tiles' },
    { value: 'filmstrip', label: 'Film strip', hint: 'A strip of frames on dark film' },
    { value: 'polaroid', label: 'Polaroids', hint: 'Instant photos with captions' },
    { value: 'masonry', label: 'Masonry', hint: 'Tall and short tiles interlocked' },
  ],
  productGrid: [
    { value: 'grid', label: 'Grid', hint: 'Even product cards' },
    { value: 'list', label: 'Index list', hint: 'A numbered catalogue' },
    { value: 'carousel', label: 'Carousel', hint: 'A swipeable row' },
    { value: 'mosaic', label: 'Mosaic', hint: 'One big feature and smaller tiles' },
    { value: 'lookbook', label: 'Lookbook', hint: 'Large alternating spreads' },
  ],
  featuredProduct: [
    { value: 'card', label: 'Card', hint: 'A standard product card' },
    { value: 'spotlight', label: 'Spotlight', hint: 'A big stage with the details beside it' },
  ],
  announcement: [
    { value: 'bar', label: 'Bar', hint: 'A full-width strip' },
    { value: 'marquee', label: 'Marquee', hint: 'Words drifting across' },
    { value: 'pill', label: 'Pill', hint: 'A small centered chip' },
  ],
  divider: [
    { value: 'line', label: 'Line', hint: 'A simple rule' },
    { value: 'dots', label: 'Dots', hint: 'Three dots' },
    { value: 'wave', label: 'Wave', hint: 'A wavy line' },
    { value: 'stars', label: 'Stars', hint: 'A row of sparkles' },
    { value: 'ornament', label: 'Ornament', hint: 'A classic flourish' },
  ],
  button: [
    { value: 'solid', label: 'Solid', hint: 'Filled with your accent' },
    { value: 'outline', label: 'Outline', hint: 'A line around the label' },
    { value: 'link', label: 'Link', hint: 'An underlined link' },
  ],
  socialLinks: [
    { value: 'links', label: 'Links', hint: 'Underlined text links' },
    { value: 'chips', label: 'Chips', hint: 'Rounded chips' },
  ],
  columns: [
    { value: 'even', label: 'Even', hint: 'Equal columns' },
    { value: 'wideLeft', label: 'Wide left', hint: 'The first column is twice as wide' },
    { value: 'wideRight', label: 'Wide right', hint: 'The last column is twice as wide' },
  ],
};
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
